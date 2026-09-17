using Microsoft.EntityFrameworkCore;
using HIS.Core.Common;
using HIS.Infrastructure.Data;

namespace HIS.API.Workers;

/// <summary>
/// #422 (follow-up #368): dọn định kỳ RefreshTokens + UserSessions đã hết vòng đời để
/// bảng không phình vô hạn (14 ngày TTL nhưng AUTHZ-2 không xóa row).
///
/// Mỗi chu kỳ (mặc định 24h, neo lúc TokenCleanup:RunAtVnTime = 03:00 giờ VN; chạy ngay sau
/// khởi động chỉ khi TokenCleanup:RunOnStartup=true):
///   1. HARD-DELETE RefreshTokens đã hết hạn HOẶC bị thu hồi quá `RetentionDays` (mặc định 30) —
///      quá hạn/đã revoke lâu = không còn giá trị bảo mật/audit (reuse-detection chỉ cần
///      token còn trong TTL). Giữ lại token gần đây để điều tra sự cố.
///   2. Đánh dấu UserSessions Active (Status=0) "treo" (LoginTime quá RefreshTokenDays+grace,
///      chưa logout) → Status=1 (Expired): phiên mà refresh token chắc chắn đã hết.
///   3. HARD-DELETE UserSessions bất kỳ trạng thái cũ hơn `SessionRetentionDays` (mặc định 90) —
///      màn M17 admin chỉ cần phiên gần đây.
///
/// Idempotent + fail-safe (mỗi bước try/catch riêng, worker không die). Bật/tắt qua
/// `TokenCleanup:Enabled` (mặc định TRUE — bảo trì cần chạy trên prod).
/// </summary>
public sealed class TokenCleanupWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TokenCleanupWorker> _logger;
    private readonly bool _enabled;
    private readonly int _retentionDays;
    private readonly int _sessionRetentionDays;
    private readonly int _refreshTokenDays;
    private readonly TimeSpan _interval;

    public TokenCleanupWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<TokenCleanupWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _enabled = config.GetValue<bool>("TokenCleanup:Enabled", true);
        _retentionDays = config.GetValue<int>("TokenCleanup:RetentionDays", 30);
        _sessionRetentionDays = config.GetValue<int>("TokenCleanup:SessionRetentionDays", 90);
        _refreshTokenDays = config.GetValue<int>("Auth:RefreshTokenDays", 14);
        _interval = TimeSpan.FromHours(config.GetValue<int>("TokenCleanup:IntervalHours", 24));
        // QA-R10: anchored to VN wall-clock instead of "60 s after boot, then every interval".
        _runAtVn = VnSchedule.ParseTimeOfDay(config.GetValue<string>("TokenCleanup:RunAtVnTime"), TimeSpan.FromHours(3));
        _runOnStartup = config.GetValue<bool>("TokenCleanup:RunOnStartup", false);
    }

    private readonly TimeSpan _runAtVn;
    private readonly bool _runOnStartup;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation("TokenCleanupWorker disabled (TokenCleanup:Enabled=false)");
            return;
        }

        _logger.LogInformation(
            "TokenCleanupWorker started — interval={Hours}h, retentionDays={Retention}, runAtVn={RunAt}, runOnStartup={OnStartup}",
            (int)_interval.TotalHours, _retentionDays, _runAtVn, _runOnStartup);

        if (_runOnStartup)
        {
            try { await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken); }
            catch (OperationCanceledException) { return; }
            await RunIterationAsync(stoppingToken);
        }

        DateTime? slot = null;
        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = VnSchedule.DelayUntilNextRun(_runAtVn, _interval, slot, out var nextVn);
            _logger.LogInformation("TokenCleanupWorker: lần chạy kế tiếp {NextVn:yyyy-MM-dd HH:mm} giờ VN (sau {Delay})", nextVn, delay);
            try { await Task.Delay(delay, stoppingToken); }
            catch (OperationCanceledException) { break; }
            slot = nextVn;
            await RunIterationAsync(stoppingToken);
        }
    }

    private async Task RunIterationAsync(CancellationToken stoppingToken)
    {
        try { await CleanupOnceAsync(stoppingToken); }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
        catch (Exception ex)
        {
            _logger.LogError(ex, "TokenCleanupWorker iteration failed — will retry next cycle");
        }
    }

    private async Task CleanupOnceAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HISDbContext>();
        var now = DateTime.UtcNow;

        // 1. RefreshTokens hết hạn / thu hồi quá retention → xóa cứng.
        var tokenCutoff = now.AddDays(-_retentionDays);
        int deletedTokens = 0;
        try
        {
            deletedTokens = await db.Set<HIS.Core.Entities.RefreshToken>()
                .Where(t => t.ExpiresAt < tokenCutoff || (t.RevokedAt != null && t.RevokedAt < tokenCutoff))
                .ExecuteDeleteAsync(ct);
        }
        catch (Exception ex) { _logger.LogWarning(ex, "TokenCleanup: xóa RefreshTokens lỗi"); }

        // 2. UserSessions Active "treo" → Expired.
        var staleSessionCutoff = now.AddDays(-(_refreshTokenDays + 1));
        int expiredSessions = 0;
        try
        {
            expiredSessions = await db.Set<HIS.Core.Entities.UserSession>()
                .Where(s => s.Status == 0 && s.LogoutTime == null && s.LoginTime < staleSessionCutoff)
                .ExecuteUpdateAsync(u => u.SetProperty(x => x.Status, 1), ct);
        }
        catch (Exception ex) { _logger.LogWarning(ex, "TokenCleanup: expire UserSessions lỗi"); }

        // 3. UserSessions cũ hơn retention dài → xóa cứng.
        var sessionCutoff = now.AddDays(-_sessionRetentionDays);
        int deletedSessions = 0;
        try
        {
            deletedSessions = await db.Set<HIS.Core.Entities.UserSession>()
                .Where(s => s.LoginTime < sessionCutoff)
                .ExecuteDeleteAsync(ct);
        }
        catch (Exception ex) { _logger.LogWarning(ex, "TokenCleanup: xóa UserSessions lỗi"); }

        if (deletedTokens > 0 || expiredSessions > 0 || deletedSessions > 0)
            _logger.LogInformation(
                "TokenCleanup: -{Tokens} refresh-token, {Expired} session→expired, -{Sessions} session cũ",
                deletedTokens, expiredSessions, deletedSessions);
    }
}
