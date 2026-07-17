namespace HIS.Application.DTOs.Audit;

// AUTHZ-5 (#371) increment-3: DTO cho 2 báo cáo truy vết compliance (read-only).
//  (A) Lịch sử thay đổi phân quyền — đọc PermissionChangeHistory.
//  (B) Tổng hợp hoạt động audit — nhóm-đếm trên AuditLogs theo khoảng thời gian.

/// <summary>1 dòng báo cáo truy vết thay đổi phân quyền (ai gán/thu-hồi role/quyền cho ai, old→new, khi nào).</summary>
public class PermissionChangeHistoryDto
{
    public Guid Id { get; set; }
    public string ChangeType { get; set; } = string.Empty;   // UserRole | RolePermission | UserPermissionOverride | Delegation
    public Guid? TargetUserId { get; set; }
    public string? TargetUserName { get; set; }               // resolve từ Users (audit completeness — kể cả đã xoá mềm)
    public Guid? TargetRoleId { get; set; }
    public string? TargetRoleName { get; set; }               // resolve từ Roles
    public string? PermissionCode { get; set; }
    public string Action { get; set; } = string.Empty;        // grant | revoke | modify
    public string? OldValueJson { get; set; }
    public string? NewValueJson { get; set; }
    public string? Reason { get; set; }
    public string? ChangedBy { get; set; }
    public DateTime ChangedAt { get; set; }
}

/// <summary>Bộ lọc + phân trang cho báo cáo truy vết thay đổi phân quyền.</summary>
public class PermissionChangeSearchDto
{
    public string? TargetUserId { get; set; }
    public string? ChangeType { get; set; }
    public string? Action { get; set; }
    public string? ChangedBy { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 50;
}

/// <summary>Kết quả phân trang báo cáo truy vết thay đổi phân quyền.</summary>
public class PermissionChangePagedResult
{
    public List<PermissionChangeHistoryDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}

/// <summary>1 cặp khóa-số đếm dùng trong báo cáo tổng hợp.</summary>
public class AuditCountItem
{
    public string Key { get; set; } = string.Empty;
    public int Count { get; set; }
}

/// <summary>Báo cáo tổng hợp hoạt động audit trong khoảng thời gian (đếm theo action/module/user).</summary>
public class AuditSummaryDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public int TotalEvents { get; set; }
    public List<AuditCountItem> ByAction { get; set; } = new();
    public List<AuditCountItem> ByModule { get; set; } = new();
    public List<AuditCountItem> TopUsers { get; set; } = new();
}
