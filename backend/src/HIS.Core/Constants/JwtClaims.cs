namespace HIS.Core.Constants;

/// <summary>
/// Custom JWT claim type constants — KHÔNG đổi value (FE decode JWT body vẫn dùng các key này).
/// Chỉ refactor để type-safe: rename / find-usage qua IDE thay vì grep string literal.
/// Standard claims (NameIdentifier/Name/Role) dùng System.Security.Claims.ClaimTypes.
/// </summary>
public static class JwtClaims
{
    /// <summary>Full name của user (User.FullName).</summary>
    public const string FullName = "fullName";

    /// <summary>Mã nhân viên (User.EmployeeCode).</summary>
    public const string EmployeeCode = "employeeCode";

    /// <summary>Permission code (Permission.PermissionCode). Multi-value claim.</summary>
    public const string Permission = "permission";

    /// <summary>Loại inspector cho Cổng thanh tra BHXH (vd "bhxh").</summary>
    public const string InspectorType = "inspectorType";

    /// <summary>R2 portal self-login: PatientId gắn với PortalAccount (token role PortalPatient).</summary>
    public const string PatientId = "patientId";

    /// <summary>R3 đa cơ sở: chi nhánh làm việc của user (User.BranchId). Không có claim = không giới hạn.</summary>
    public const string BranchId = "branchId";

    /// <summary>AUTHZ-2 (#368): security stamp để thu hồi token tức thời. OnTokenValidated so khớp với User.SecurityStamp; lệch = token bị thu hồi.</summary>
    public const string SecurityStamp = "securityStamp";
}
