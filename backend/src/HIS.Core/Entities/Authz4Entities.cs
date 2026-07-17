namespace HIS.Core.Entities;

// AUTHZ-4 (#370): SoD · Delegation · Break-glass · Temporary permission.
// Increment-1 = data model + bảng (additive, CHƯA wire enforcement → 0 đổi hành vi).
// Enforcement (grant-time/runtime SoD check, delegation resolve, break-glass endpoint,
// deny-override trong PermissionService) = increment sau, kill-switch OFF.

/// <summary>
/// Ràng buộc phân tách nhiệm vụ (Separation of Duties). Cặp Role/Permission xung đột
/// không được đồng thời gán/thực hiện. ConstraintType: "role-role" | "perm-perm".
/// EnforcedAt: "grant" (chặn lúc gán) | "runtime" (người duyệt ≠ người tạo).
/// </summary>
public class SoDConstraint : BaseEntity
{
    public Guid? RoleAId { get; set; }
    public string? PermissionA { get; set; }
    public Guid? RoleBId { get; set; }
    public string? PermissionB { get; set; }
    public string ConstraintType { get; set; } = "role-role";
    public string EnforcedAt { get; set; } = "grant";
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Ủy quyền tạm: Grantor ủy Role cho Grantee trong khoảng thời gian. Tập quyền ủy ⊆ quyền
/// grantor tại thời điểm ủy; KHÔNG re-delegation; auto-expire. Status: 0-Active 1-Expired 2-Revoked.
/// </summary>
public class DelegationGrant : BaseEntity
{
    public Guid GrantorId { get; set; }
    public Guid GranteeId { get; set; }
    public Guid RoleId { get; set; }
    public DateTime ValidFrom { get; set; }
    public DateTime ValidTo { get; set; }
    public string? Reason { get; set; }
    public int Status { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokedBy { get; set; }
}

/// <summary>
/// Phiên truy cập khẩn cấp (break-glass): cấp quyền ĐỌC tạm hồ sơ 1 BN, lý do bắt buộc,
/// TTL (mặc định 4h), hậu kiểm trong 72h. IsEmergencyAccess = biến thể tự động (ED_STAFF +
/// encounter cấp cứu, không cần khai lý do). ReviewOutcome: null-chờ | "approved" | "flagged".
/// </summary>
public class BreakGlassSession : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid PatientId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime StartAt { get; set; }
    public DateTime ExpireAt { get; set; }
    public bool IsEmergencyAccess { get; set; }
    public string? IpAddress { get; set; }
    public Guid? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewOutcome { get; set; }
}

/// <summary>
/// Quyền tạm cấp/thu-hồi cho 1 user ngoài role. IsGrant=false → DENY (thắng grant khi trùng).
/// ScopeType/Id (AUTHZ-3). ValidTo bắt buộc cho quyền tạm; job nền dọn hết hạn.
/// </summary>
public class UserPermissionOverride : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid PermissionId { get; set; }
    public bool IsGrant { get; set; } = true;
    public string ScopeType { get; set; } = "ORG";
    public Guid? ScopeId { get; set; }
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    public string? Reason { get; set; }
    public string? ApprovedBy { get; set; }
}
