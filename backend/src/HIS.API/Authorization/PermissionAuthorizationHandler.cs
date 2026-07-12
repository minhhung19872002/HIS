using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using HIS.Application.Services;

namespace HIS.API.Authorization;

/// <summary>
/// AUTHZ-1 (#367): handler cho <see cref="PermissionRequirement"/> — đọc permission-set của user từ
/// <see cref="IPermissionService"/> (DB + IMemoryCache 30s), KHÔNG đọc claim permission trong JWT
/// (token gọn + không stale). Thiếu quyền → không Succeed → 403. Admin KHÔNG bypass ngầm —
/// ADMIN có full catalog qua seed matrix (default-deny thật).
/// </summary>
public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly IPermissionService _permissions;

    public PermissionAuthorizationHandler(IPermissionService permissions) => _permissions = permissions;

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        var idStr = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(idStr, out var userId)) return;

        if (await _permissions.HasPermissionAsync(userId, requirement.PermissionCode))
            context.Succeed(requirement);
    }
}
