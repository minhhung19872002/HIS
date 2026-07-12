using Microsoft.AspNetCore.Authorization;

namespace HIS.API.Authorization;

/// <summary>AUTHZ-1 (#367): requirement mang PermissionCode cần có để qua policy <c>perm:{code}</c>.</summary>
public sealed class PermissionRequirement : IAuthorizationRequirement
{
    public string PermissionCode { get; }
    public PermissionRequirement(string permissionCode) => PermissionCode = permissionCode;
}
