using HIS.Core.Entities;

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
    /// Ghi 1 bản ghi audit đã dựng sẵn (fire-and-forget safe): Add + SaveChanges, nuốt lỗi.
    /// Dùng cho call-site tự build entity với field đặc thù (TableName/RecordId/EntityType...
    /// khác chuẩn <see cref="LogAsync"/>) — gom plumbing write nhưng KHÔNG đổi nội dung audit. (#350)
    /// </summary>
    Task WriteAsync(AuditLog entry);

    /// <summary>
    /// Ghi NHIỀU bản ghi audit trong 1 lần SaveChanges (giữ batch-save), fire-and-forget safe. (#350)
    /// </summary>
    Task WriteManyAsync(IEnumerable<AuditLog> entries);

    /// <summary>
    /// Search audit logs with filters and pagination.
    /// </summary>
    Task<DTOs.Audit.AuditLogPagedResult> GetLogsAsync(DTOs.Audit.AuditLogSearchDto dto);

    /// <summary>
    /// Get activity logs for a specific user within a date range.
    /// </summary>
    Task<List<DTOs.Audit.AuditLogDto>> GetUserActivityAsync(string userId, DateTime from, DateTime to);

    /// <summary>
    /// AUTHZ-5 (#371): báo cáo truy vết thay đổi phân quyền (đọc PermissionChangeHistory), có lọc + phân trang.
    /// </summary>
    Task<DTOs.Audit.PermissionChangePagedResult> GetPermissionChangeHistoryAsync(DTOs.Audit.PermissionChangeSearchDto dto);

    /// <summary>
    /// AUTHZ-5 (#371): báo cáo tổng hợp hoạt động audit trong khoảng thời gian (đếm theo action/module/top-user).
    /// </summary>
    Task<DTOs.Audit.AuditSummaryDto> GetAuditSummaryAsync(DateTime from, DateTime to);
}
