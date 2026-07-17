namespace HIS.Core.Entities;

/// <summary>
/// AUTHZ-5 (#371): lịch sử thay đổi phân quyền — ai đổi gì, old→new (JSON), lý do.
/// Ghi khi gán/thu-hồi role, đổi RolePermission, cấp/thu UserPermissionOverride, delegation.
/// Additive — increment-1 chỉ tạo bảng + entity; wire ghi ở increment sau (nơi thay đổi quyền).
/// </summary>
public class PermissionChangeHistory : BaseEntity
{
    /// <summary>Loại đối tượng đổi: "UserRole" | "RolePermission" | "UserPermissionOverride" | "Delegation".</summary>
    public string ChangeType { get; set; } = string.Empty;

    /// <summary>User bị ảnh hưởng (nếu có).</summary>
    public Guid? TargetUserId { get; set; }

    /// <summary>Role liên quan (nếu có).</summary>
    public Guid? TargetRoleId { get; set; }

    /// <summary>Permission code liên quan (nếu có).</summary>
    public string? PermissionCode { get; set; }

    /// <summary>Hành động: "grant" | "revoke" | "modify".</summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>Giá trị cũ (JSON) — null nếu grant mới.</summary>
    public string? OldValueJson { get; set; }

    /// <summary>Giá trị mới (JSON) — null nếu revoke.</summary>
    public string? NewValueJson { get; set; }

    public string? Reason { get; set; }

    /// <summary>Ai thực hiện (username/id — NVARCHAR để né Guid-converter trap).</summary>
    public string? ChangedBy { get; set; }

    public DateTime ChangedAt { get; set; }
}
