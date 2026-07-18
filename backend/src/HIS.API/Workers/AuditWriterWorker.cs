using System.Text.Json;
using System.Threading.Channels;
using HIS.Application.Common;
using HIS.Application.Services;
using HIS.Core.Entities;

namespace HIS.API.Workers;

/// <summary>
/// #371 AUTHZ-5 inc-2: Channel-based audit writer — thay Task.Run fire-and-forget trong AuditLogMiddleware.
/// inc-6: fallback file-log khi DB lỗi (NDJSON tại %TEMP%/his-audit-fallback/) + alert qua AuditWriteMetrics.
/// Singleton BackgroundService đọc AuditLog từ ChannelReader, batch-write vào DB qua IAuditLogService.WriteManyAsync.
/// Lợi ích vs Task.Run:
///   1. Backpressure — BoundedChannel(2000) DropOldest giữ bộ nhớ ổn định dưới load cao.
///   2. Batch write — gom tối đa 20 entry / lần SaveChanges thay vì N lần riêng lẻ.
///   3. Graceful shutdown — drain toàn bộ khi CancellationToken được kích hoạt.
///   4. Fallback file — khi DB fail, entries không bị mất hoàn toàn (NDJSON, observable qua /health/audit-metrics).
/// </summary>
public sealed class AuditWriterWorker : BackgroundService
{
    private readonly ChannelReader<AuditLog> _reader;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AuditWriterWorker> _logger;
    private readonly string _fallbackDir;
    private const int MaxBatch = 20;

    public AuditWriterWorker(
        ChannelReader<AuditLog> reader,
        IServiceScopeFactory scopeFactory,
        ILogger<AuditWriterWorker> logger,
        IConfiguration configuration)
    {
        _reader = reader;
        _scopeFactory = scopeFactory;
        _logger = logger;
        _fallbackDir = configuration["AuditFallback:Directory"]
            ?? Path.Combine(Path.GetTempPath(), "his-audit-fallback");
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AuditWriterWorker started — batching up to {Batch} entries per write", MaxBatch);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Block until at least 1 entry available (or cancellation)
                await _reader.WaitToReadAsync(stoppingToken);

                // Drain up to MaxBatch without blocking
                var batch = new List<AuditLog>(MaxBatch);
                while (batch.Count < MaxBatch && _reader.TryRead(out var entry))
                    batch.Add(entry);

                if (batch.Count > 0)
                    await WriteBatchAsync(batch);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "AuditWriterWorker: loi iteration — tiep tuc sau 500ms");
                try { await Task.Delay(500, stoppingToken); } catch (OperationCanceledException) { break; }
            }
        }

        // Drain remaining entries on graceful shutdown
        await DrainRemainingAsync();
        _logger.LogInformation("AuditWriterWorker stopped");
    }

    private async Task WriteBatchAsync(List<AuditLog> batch)
    {
        // Snapshot failure count before write — delta check below detects DB failure
        // (WriteManyAsync swallows exceptions internally; delta is the only signal)
        var failsBefore = AuditWriteMetrics.FailureCount;
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var auditService = scope.ServiceProvider.GetRequiredService<IAuditLogService>();
            await auditService.WriteManyAsync(batch);
        }
        catch (Exception ex)
        {
            // Should rarely reach here (WriteManyAsync swallows), but guard anyway
            AuditWriteMetrics.RecordFailure(ex);
            _logger.LogWarning(ex, "AuditWriterWorker: unexpected exception writing {Count} entries", batch.Count);
        }
        finally
        {
            // Write fallback file if DB failed (failure counter increased)
            if (AuditWriteMetrics.FailureCount > failsBefore)
                await WriteFallbackAsync(batch);
        }
    }

    private async Task WriteFallbackAsync(IReadOnlyList<AuditLog> batch)
    {
        try
        {
            Directory.CreateDirectory(_fallbackDir);
            var path = Path.Combine(_fallbackDir, $"audit-{DateTime.UtcNow:yyyyMMdd-HH}.ndjson");
            var lines = batch.Select(e => JsonSerializer.Serialize(new
            {
                e.Id, e.Timestamp, e.UserId, e.Action, e.Module, e.EntityType, e.EntityId, fallback = true
            }));
            await File.AppendAllLinesAsync(path, lines);
            AuditWriteMetrics.RecordFallback(batch.Count);
            _logger.LogInformation(
                "AuditWriterWorker: {Count} entries written to fallback file {Path} (DB unavailable)",
                batch.Count, path);
        }
        catch (Exception ex2)
        {
            _logger.LogError(ex2,
                "AuditWriterWorker: fallback file write ALSO failed — {Count} entries PERMANENTLY LOST", batch.Count);
        }
    }

    private async Task DrainRemainingAsync()
    {
        var remaining = new List<AuditLog>(MaxBatch);
        while (_reader.TryRead(out var entry))
        {
            remaining.Add(entry);
            if (remaining.Count >= MaxBatch)
            {
                await WriteBatchAsync(remaining);
                remaining.Clear();
            }
        }
        if (remaining.Count > 0)
            await WriteBatchAsync(remaining);
    }
}
