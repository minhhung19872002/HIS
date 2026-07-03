using System;
using System.Threading;

namespace HIS.Application.Common;

/// <summary>
/// Process-wide counters for audit-log write reliability (Issue #198).
/// Audit writes across the codebase (<c>AuditLogMiddleware</c>, <c>AuditLogService</c>,
/// <c>AuditFieldDiffInterceptor</c>) are fire-and-forget by design — they must never block or
/// fail the main request. That historically meant a failed write only showed up as a
/// <c>LogWarning</c> line buried in logs (silent data loss under load). This static counter
/// makes failures observable via <c>GET /health/audit-metrics</c> instead of being swallowed.
/// </summary>
public static class AuditWriteMetrics
{
    private static long _successCount;
    private static long _failureCount;
    private static string? _lastFailureMessage;
    private static DateTime? _lastFailureAt;

    /// <summary>Record one (or more, for batch writes) successful audit-log write(s).</summary>
    public static void RecordSuccess(int count = 1)
    {
        if (count <= 0) return;
        Interlocked.Add(ref _successCount, count);
    }

    /// <summary>Record a failed audit-log write attempt (never throws).</summary>
    public static void RecordFailure(Exception ex)
    {
        Interlocked.Increment(ref _failureCount);
        _lastFailureMessage = ex.Message?.Length > 500 ? ex.Message[..500] : ex.Message;
        _lastFailureAt = DateTime.UtcNow;
    }

    /// <summary>Snapshot for the health endpoint (anonymous object, JSON-serializable).</summary>
    public static object GetSnapshot() => new
    {
        successCount = Interlocked.Read(ref _successCount),
        failureCount = Interlocked.Read(ref _failureCount),
        lastFailureAt = _lastFailureAt,
        lastFailureMessage = _lastFailureMessage
    };
}
