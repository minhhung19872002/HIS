using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using HIS.Application.Services;

namespace HIS.API.Authorization;

/// <summary>
/// AUTHZ-1 (#367): handler cho <see cref="PermissionRequirement"/> — đọc permission-set của user từ
/// <see cref="IPermissionService"/> (DB + IMemoryCache 30s), KHÔNG đọc claim permission trong JWT
/// (token gọn + không stale). Thiếu quyền → không Succeed → 403. Admin KHÔNG bypass ngầm —
/// ADMIN có full catalog qua seed matrix (default-deny thật).
/// Fail-closed: DB blip → deny (log warning), KHÔNG 500 — consistent với AUTHZ-2 stamp-check.
/// </summary>
public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly IPermissionService _permissions;
    private readonly ILogger<PermissionAuthorizationHandler>? _logger;

    public PermissionAuthorizationHandler(
        IPermissionService permissions,
        ILogger<PermissionAuthorizationHandler>? logger = null)
    {
        _permissions = permissions;
        _logger = logger;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        try
        {
            var idStr = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(idStr, out var userId)) return;

            if (await _permissions.HasPermissionAsync(userId, requirement.PermissionCode))
                context.Succeed(requirement);
        }
        catch (Exception ex)
        {
            // fail-closed: DB blip → deny, KHÔNG throw → KHÔNG 500
            _logger?.LogWarning(ex, "PermissionAuthorizationHandler: lỗi check {Code} — deny", requirement.PermissionCode);
        }
    }
}
