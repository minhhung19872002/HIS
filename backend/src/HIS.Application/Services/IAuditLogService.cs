namespace HIS.Application.Services;

/// <summary>
/// Audit log service for Level 6 security compliance.
/// Tracks all medical record access and modifications.
/// </summary>
public interface IAuditLogService
{
    /// <summary>
    /// Log an audit event (fire-and-forget safe).
    /// </summary>
    Task LogAsync(
        string userId,
        string userName,
        string action,
        string entityType,
        string entityId,
        string? details,
        string? ipAddress,
        string? userAgent,
        string? module,
        string? requestPath = null,
        string? requestMethod = null,
        int? responseStatusCode = null);

    /// <summary>
    /// Search audit logs with filters and pagination.
    /// </summary>
    Task<DTOs.Audit.AuditLogPagedResult> GetLogsAsync(DTOs.Audit.AuditLogSearchDto dto);

    /// <summary>
    /// Get activity logs for a specific user within a date range.
    /// </summary>
    Task<List<DTOs.Audit.AuditLogDto>> GetUserActivityAsync(string userId, DateTime from, DateTime to);
}
