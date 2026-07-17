namespace HIS.Core.Constants;

/// <summary>
/// AUTHZ-5 (#371): event catalog audit đủ 6 nhóm (danh mục hằng — additive, chưa wire pipeline).
/// Dùng cho AuditLog.EventType + báo cáo truy vết. Nhóm = tiền tố trước dấu chấm.
/// </summary>
public static class AuditEventCatalog
{
    // 1. AUTH — xác thực
    public const string AuthLogin = "AUTH.Login";
    public const string AuthLogout = "AUTH.Logout";
    public const string AuthLoginFailed = "AUTH.LoginFailed";
    public const string AuthLockout = "AUTH.Lockout";
    public const string AuthRefresh = "AUTH.Refresh";
    public const string AuthPasswordChange = "AUTH.PasswordChange";
    public const string AuthOtpVerify = "AUTH.OtpVerify";
    public const string AuthWebAuthn = "AUTH.WebAuthn";
    public const string AuthTokenRevoke = "AUTH.TokenRevoke";

    // 2. ACCESS — truy cập dữ liệu nhạy cảm
    public const string AccessViewPhi = "ACCESS.ViewPHI";
    public const string AccessPrint = "ACCESS.Print";
    public const string AccessExport = "ACCESS.Export";
    public const string AccessSearchPii = "ACCESS.SearchPII";
    public const string AccessDicomView = "ACCESS.DicomView";
    public const string AccessDownload = "ACCESS.Download";

    // 3. DATA — thay đổi dữ liệu (old→new)
    public const string DataCreate = "DATA.Create";
    public const string DataUpdate = "DATA.Update";
    public const string DataDelete = "DATA.Delete";
    public const string DataBulkCreate = "DATA.BulkCreate";
    public const string DataBulkDelete = "DATA.BulkDelete";

    // 4. WORKFLOW — nghiệp vụ
    public const string WorkflowApprove = "WORKFLOW.Approve";
    public const string WorkflowReject = "WORKFLOW.Reject";
    public const string WorkflowSign = "WORKFLOW.Sign";
    public const string WorkflowLock = "WORKFLOW.Lock";
    public const string WorkflowUnlock = "WORKFLOW.Unlock";
    public const string WorkflowVoid = "WORKFLOW.Void";
    public const string WorkflowDispense = "WORKFLOW.Dispense";
    public const string WorkflowRelease = "WORKFLOW.Release";
    public const string WorkflowPrescribe = "WORKFLOW.Prescribe";
    public const string WorkflowAdmit = "WORKFLOW.Admit";
    public const string WorkflowDischarge = "WORKFLOW.Discharge";
    public const string WorkflowLabOrder = "WORKFLOW.LabOrder";
    public const string WorkflowIssue = "WORKFLOW.Issue";

    // 5. ADMIN — quản trị
    public const string AdminUserChange = "ADMIN.UserChange";
    public const string AdminUserCreate = "ADMIN.UserCreate";
    public const string AdminUserDelete = "ADMIN.UserDelete";
    public const string AdminRoleChange = "ADMIN.RoleChange";
    public const string AdminPermissionChange = "ADMIN.PermissionChange";
    public const string AdminConfigChange = "ADMIN.ConfigChange";
    public const string AdminDelegation = "ADMIN.Delegation";
    public const string AdminScopeChange = "ADMIN.ScopeChange";
    public const string AdminDelegationGrant = "ADMIN.DelegationGrant";
    public const string AdminDelegationRevoke = "ADMIN.DelegationRevoke";

    // 6. SECURITY — bảo mật
    public const string SecurityBreakGlassInvoke = "SECURITY.BreakGlassInvoke";
    public const string SecurityBreakGlassReview = "SECURITY.BreakGlassReview";
    public const string SecurityVendorSession = "SECURITY.VendorSession";
    public const string SecurityApiClientFail = "SECURITY.ApiClientFail";
    public const string SecuritySuspiciousAccess = "SECURITY.SuspiciousAccess";
    public const string SecurityRateLimitExceeded = "SECURITY.RateLimitExceeded";

    /// <summary>Nhóm (tiền tố) của 1 event-type — dùng cho retention/report phân loại.</summary>
    public static string GroupOf(string eventType)
    {
        if (string.IsNullOrEmpty(eventType)) return "OTHER";
        var dot = eventType.IndexOf('.');
        return dot > 0 ? eventType[..dot] : eventType;
    }
}
