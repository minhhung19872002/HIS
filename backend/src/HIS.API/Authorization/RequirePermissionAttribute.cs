using Microsoft.AspNetCore.Authorization;

namespace HIS.API.Authorization;

/// <summary>
/// AUTHZ-1 (#367): gate endpoint theo permission granular — <c>[RequirePermission(PermissionCatalog.Billing.Approve)]</c>.
/// Chuyển thành policy động <c>perm:{code}</c> do <see cref="PermissionPolicyProvider"/> sinh on-demand
/// (không đăng ký nghìn AddPolicy tay). Dùng hằng từ PermissionCatalog — typo = lỗi compile.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class RequirePermissionAttribute : AuthorizeAttribute
{
    public const string PolicyPrefix = "perm:";

    public RequirePermissionAttribute(string permissionCode)
    {
        if (string.IsNullOrWhiteSpace(permissionCode))
            throw new ArgumentException("permissionCode is required", nameof(permissionCode));
        Policy = PolicyPrefix + permissionCode;
    }
}
