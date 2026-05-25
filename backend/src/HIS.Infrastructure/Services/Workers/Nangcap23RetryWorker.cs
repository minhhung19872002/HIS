using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services.Workers;

/// <summary>
/// Background worker quét row stuck Status=1 (Submitted) của NangCap23 và tự gọi lại
/// gateway. Giải quyết High-New-4: 2-phase save có thể để lại phantom row khi:
///   - User đóng tab giữa Phase 1 + Phase 2 (CT cancel)
///   - Cloud Run instance crash sau Phase 1
///   - Backend timeout giữa Phase 2 success và final SaveChanges
///
/// Worker an toàn cho multi-instance: dựa vào atomic UPDATE với Where(...) để claim row.
/// Idempotency-Key trong client header giúp gateway dedupe nếu hỗ trợ. Trong trường hợp
/// gateway không dedupe, worker chấp nhận risk submit lần 2 (ưu tiên consistency > duplicate).
///
/// Cấu hình qua appsettings (mặc định tắt cho dev):
///   NangCap23:RetryWorker:Enabled (default false)
///   NangCap23:RetryWorker:IntervalSeconds (default 60)
///   NangCap23:RetryWorker:StuckMinutes (default 5)
///   NangCap23:RetryWorker:MaxBatchSize (default 20)
/// </summary>
public sealed class Nangcap23RetryWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<Nangcap23RetryWorker> _logger;
    private readonly bool _enabled;
    private readonly TimeSpan _interval;
    private readonly int _stuckMinutes;
    private readonly int _maxBatchSize;

    public Nangcap23RetryWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<Nangcap23RetryWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _enabled = config.GetValue<bool>("NangCap23:RetryWorker:Enabled", false);
        _interval = TimeSpan.FromSeconds(config.GetValue<int>("NangCap23:RetryWorker:IntervalSeconds", 60));
        _stuckMinutes = config.GetValue<int>("NangCap23:RetryWorker:StuckMinutes", 5);
        _maxBatchSize = config.GetValue<int>("NangCap23:RetryWorker:MaxBatchSize", 20);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation(
                "Nangcap23RetryWorker disabled (set NangCap23:RetryWorker:Enabled=true to enable)");
            return;
        }
        _logger.LogInformation(
            "Nangcap23RetryWorker started — interval={Interval}s, stuck={Stuck}min, batch={Batch}",
            (int)_interval.TotalSeconds, _stuckMinutes, _maxBatchSize);

        // Initial small delay để app bootstrap xong
        try { await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessStuckPrescriptionsAsync(stoppingToken);
                await ProcessStuckPharmacyReportsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                // Worker không được die — log + tiếp tục loop
                _logger.LogError(ex, "Nangcap23RetryWorker iteration failed — will retry next cycle");
            }
            try { await Task.Delay(_interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task ProcessStuckPrescriptionsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HISDbContext>();
        var client = scope.ServiceProvider.GetRequiredService<INationalPrescriptionGatewayClient>();
        var cfg = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var maxRetries = cfg.GetValue<int>("NationalGateway:RetryCount", 3);
        var threshold = DateTime.UtcNow.AddMinutes(-_stuckMinutes);

        // Memory-efficient: chỉ load entity cần thiết, không Include navigation
        var stuck = await db.NationalPrescriptionSubmissions
            .Where(x => x.Status == 1
                     && x.RetryCount < maxRetries
                     && (x.UpdatedAt ?? x.CreatedAt) < threshold)
            .OrderBy(x => x.CreatedAt)
            .Take(_maxBatchSize)
            .ToListAsync(ct);

        if (stuck.Count == 0) return;
        _logger.LogInformation("RetryWorker found {Count} stuck prescription submission(s)", stuck.Count);

        foreach (var row in stuck)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                row.RetryCount++;
                row.UpdatedAt = DateTime.UtcNow;
                row.UpdatedBy = "system:retry-worker";

                var result = await client.SubmitAsync(row.PayloadJson, ct);
                if (result.Acknowledged)
                {
                    row.Status = 2;
                    row.AcknowledgedAt = DateTime.UtcNow;
                    row.GatewayTransactionId = result.TransactionId;
                    row.ResponseJson = result.RawResponse;
                    row.ErrorCode = null;
                    row.ErrorMessage = null;
                    _logger.LogInformation("RetryWorker recovered prescription {Code} → ack {Txn}",
                        row.SubmissionCode, result.TransactionId);
                }
                else
                {
                    var transient = result.ErrorCode is "NETWORK_ERROR" or "TIMEOUT" or "CIRCUIT_OPEN";
                    row.Status = transient ? 1 : 3;
                    row.ErrorCode = result.ErrorCode;
                    row.ErrorMessage = result.ErrorMessage;
                    row.ResponseJson = result.RawResponse;
                    _logger.LogWarning("RetryWorker {Code} still failing: {Err}",
                        row.SubmissionCode, result.ErrorCode);
                }
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RetryWorker error processing prescription {Code} — skipping", row.SubmissionCode);
                db.ChangeTracker.Clear();
            }
        }
    }

    private async Task ProcessStuckPharmacyReportsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HISDbContext>();
        var client = scope.ServiceProvider.GetRequiredService<INationalPharmacyGatewayClient>();
        var cfg = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var maxRetries = cfg.GetValue<int>("NationalGateway:RetryCount", 3);
        var threshold = DateTime.UtcNow.AddMinutes(-_stuckMinutes);

        var stuck = await db.NationalPharmacyOutboundReports
            .Where(x => x.Status == 1
                     && x.RetryCount < maxRetries
                     && (x.UpdatedAt ?? x.CreatedAt) < threshold)
            .OrderBy(x => x.CreatedAt)
            .Take(_maxBatchSize)
            .ToListAsync(ct);

        if (stuck.Count == 0) return;
        _logger.LogInformation("RetryWorker found {Count} stuck pharmacy report(s)", stuck.Count);

        foreach (var row in stuck)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                row.RetryCount++;
                row.UpdatedAt = DateTime.UtcNow;
                row.UpdatedBy = "system:retry-worker";

                var result = await client.SubmitReportAsync(row.PayloadXml, row.ReportType, ct);
                if (result.Acknowledged)
                {
                    row.Status = 2;
                    row.AcknowledgedAt = DateTime.UtcNow;
                    row.GatewayTicketNumber = result.TransactionId;
                    row.ResponseXml = result.RawResponse;
                    row.ErrorCode = null;
                    row.ErrorMessage = null;
                    _logger.LogInformation("RetryWorker recovered pharmacy report {Code} → ack {Txn}",
                        row.ReportCode, result.TransactionId);
                }
                else
                {
                    var transient = result.ErrorCode is "NETWORK_ERROR" or "TIMEOUT" or "CIRCUIT_OPEN";
                    row.Status = transient ? 1 : 3;
                    row.ErrorCode = result.ErrorCode;
                    row.ErrorMessage = result.ErrorMessage;
                    row.ResponseXml = result.RawResponse;
                }
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RetryWorker error processing pharmacy {Code} — skipping", row.ReportCode);
                db.ChangeTracker.Clear();
            }
        }
    }
}
