namespace HIS.Application.DTOs.Audit;

/// <summary>
/// Audit log entry DTO - Level 6 security compliance
/// </summary>
public class AuditLogDto
{
    public Guid Id { get; set; }
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public string? UserFullName { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime Timestamp { get; set; }
    public string? Module { get; set; }
    public string? RequestPath { get; set; }
    public string? RequestMethod { get; set; }
    public int? ResponseStatusCode { get; set; }
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
}

/// <summary>
/// Search/filter DTO for audit logs
/// </summary>
public class AuditLogSearchDto
{
    public string? UserId { get; set; }
    public string? Action { get; set; }
    public string? EntityType { get; set; }
    public string? Module { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 50;
    public string? Keyword { get; set; }
}

/// <summary>
/// Paged result wrapper for audit logs
/// </summary>
public class AuditLogPagedResult
{
    public List<AuditLogDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}
