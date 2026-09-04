using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Workers;

/// <summary>
/// #371 AUTHZ-5: xóa định kỳ AuditLogs đã quá vòng đời retention (per NĐ 13/2023 + TT 54/2017).
///
/// Dùng CONTEXT_INFO = 0x52455445 ('RETE') để bypass trigger trg_AuditLogs_NoDelete
/// (migration 150_authz5_auditlogs_append_only.sql). Reset CONTEXT_INFO ngay sau DELETE.
///
/// Chính sách retention (theo category):
///   AUTH   (Login/Logout/RefreshToken/PasswordChange/FailedLogin/Lockout): 2 năm (AuthRetentionDays=730).
///   ACCESS (View/Export/Print/Search): 18 tháng hot (AccessRetentionDays=548).
///   DATA / WORKFLOW / ADMIN / SECURITY: giữ vĩnh viễn — không xóa ở phase này.
///   Archive R2 (cold storage ≥10 năm): phase sau khi có CloudflareR2Config.
///
/// Batch delete TOP(5000) để tránh lock escalation trên bảng lớn.
/// Bật/tắt: AuditRetention:Enabled (mặc định TRUE).
/// </summary>
public sealed class AuditRetentionWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AuditRetentionWorker> _logger;
    private readonly bool _enabled;
    private readonly int _authRetentionDays;
    private readonly int _accessRetentionDays;
    private readonly TimeSpan _interval;
    private const int BatchSize = 5000;

    // CONTEXT_INFO bypass — SQL Server tự pad 0 đến 128 bytes; trigger kiểm tra LEFT(4) = 'RETE'.
    private const string CtxInfoSet = "SET CONTEXT_INFO 0x52455445";
    private const string CtxInfoReset = "SET CONTEXT_INFO 0x0";

    public AuditRetentionWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<AuditRetentionWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _enabled = config.GetValue<bool>("AuditRetention:Enabled", true);
        _authRetentionDays = config.GetValue<int>("AuditRetention:AuthRetentionDays", 730);
        _accessRetentionDays = config.GetValue<int>("AuditRetention:AccessRetentionDays", 548);
        _interval = TimeSpan.FromHours(config.GetValue<int>("AuditRetention:IntervalHours", 24));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation("AuditRetentionWorker disabled (AuditRetention:Enabled=false)");
            return;
        }

        _logger.LogInformation(
            "AuditRetentionWorker started — authRetention={Auth}d, accessRetention={Access}d, interval={Hours}h",
            _authRetentionDays, _accessRetentionDays, (int)_interval.TotalHours);

        // Delay lần đầu 10 phút sau startup để tránh contention với ProductionSchemaRepairRunner.
        try { await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await RunRetentionAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AuditRetentionWorker iteration failed — will retry next cycle");
            }

            try { await Task.Delay(_interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task RunRetentionAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HISDbContext>();
        var now = DateTime.UtcNow;
        int totalDeleted = 0;

        // 1. AUTH events — 2 năm.
        var authCutoff = now.AddDays(-_authRetentionDays);
        try
        {
            int deleted;
            do
            {
                deleted = await DeleteBatchAsync(db,
                    $"DELETE TOP({BatchSize}) FROM dbo.AuditLogs "
                    + "WHERE [Timestamp] < {0} "
                    + "AND [Action] IN (N'Login', N'Logout', N'RefreshToken', N'PasswordChange', N'FailedLogin', N'Lockout')",
                    authCutoff, ct);
                totalDeleted += deleted;
            }
            while (deleted == BatchSize && !ct.IsCancellationRequested);
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex) { _logger.LogWarning(ex, "AuditRetention: lỗi khi xóa AUTH events"); }

        // 2. ACCESS events — 18 tháng hot.
        var accessCutoff = now.AddDays(-_accessRetentionDays);
        try
        {
            int deleted;
            do
            {
                deleted = await DeleteBatchAsync(db,
                    $"DELETE TOP({BatchSize}) FROM dbo.AuditLogs "
                    + "WHERE [Timestamp] < {0} "
                    + "AND [Action] IN (N'View', N'Export', N'Print', N'Search')",
                    accessCutoff, ct);
                totalDeleted += deleted;
            }
            while (deleted == BatchSize && !ct.IsCancellationRequested);
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex) { _logger.LogWarning(ex, "AuditRetention: lỗi khi xóa ACCESS events"); }

        if (totalDeleted > 0)
            _logger.LogInformation(
                "AuditRetention: -{Deleted} audit entry "
                + "(auth<{AuthCutoff:yyyy-MM-dd}, access<{AccessCutoff:yyyy-MM-dd})",
                totalDeleted, authCutoff, accessCutoff);
    }

    private async Task<int> DeleteBatchAsync(HISDbContext db, string sql, DateTime cutoff, CancellationToken ct)
    {
        // #218/T3 (2026-09-04): PHẢI mở kết nối tường minh quanh cả cụm.
        //
        // `CONTEXT_INFO` sống theo PHIÊN kết nối. Ngoài transaction, EF mở kết nối cho từng lệnh
        // rồi đóng ngay, và kết nối trả về pool sẽ bị `sp_reset_connection` xoá sạch context. Nên
        // `SET` và `DELETE` gọi rời nhau thì cờ KHÔNG còn lúc DELETE chạy → trigger
        // `trg_AuditLogs_NoDelete` chặn và job dọn nhật ký hỏng lặng lẽ.
        //
        // Đo được: chạy SET và DELETE ở hai kết nối → dòng audit VẪN CÒN (bị chặn); gộp cùng một
        // phiên → xoá được. Trước đây không lộ ra vì trigger chưa bao giờ được tạo (migration 150
        // lỗi cú pháp ở mọi lần khởi động); nay trigger đã sống thì đường này phải đúng.
        await db.Database.OpenConnectionAsync(ct);
        try
        {
            await db.Database.ExecuteSqlRawAsync(CtxInfoSet, cancellationToken: ct);
            try
            {
                return await db.Database.ExecuteSqlRawAsync(sql, new object[] { cutoff }, cancellationToken: ct);
            }
            finally
            {
                // Best-effort reset — không dùng ct (không muốn bỏ sót reset khi cancel).
                try { await db.Database.ExecuteSqlRawAsync(CtxInfoReset, cancellationToken: CancellationToken.None); }
                catch { /* best-effort */ }
            }
        }
        finally
        {
            try { await db.Database.CloseConnectionAsync(); } catch { /* best-effort */ }
        }
    }
}
