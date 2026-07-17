using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Authorization;
using HIS.Application.Common;
using HIS.Application.DTOs.Delegation;
using HIS.Application.Services;
using HIS.Core.Constants;

namespace HIS.API.Controllers;

/// <summary>
/// AUTHZ-4 (#370) — Admin CRUD cho DelegationGrant. Additive, kill-switch OFF (DelegationEnabled=false).
/// Tạo/liệt kê/thu-hồi ủy quyền tạm; chưa có hiệu lực với PermissionService cho đến khi bật kill-switch.
/// </summary>
[ApiController]
[Route("api/delegation")]
[RequirePermission(PermissionCatalog.System.Configure)]
public class DelegationController : ControllerBase
{
    private readonly IDelegationService _delegation;
    private readonly ICurrentUserAccessor _currentUser;

    public DelegationController(IDelegationService delegation, ICurrentUserAccessor currentUser)
    {
        _delegation = delegation;
        _currentUser = currentUser;
    }

    /// <summary>Liệt kê toàn bộ ủy quyền (mọi trạng thái) cho admin quản lý.</summary>
    [HttpGet("grants")]
    public async Task<IActionResult> GetGrants()
    {
        var grants = await _delegation.GetGrantsAsync();
        return Ok(grants);
    }

    /// <summary>Tạo ủy quyền mới. Grantor = người dùng đang đăng nhập.</summary>
    [HttpPost("grants")]
    public async Task<IActionResult> CreateGrant([FromBody] CreateDelegationGrantDto dto)
    {
        var grantorId = _currentUser.UserGuid;
        if (!grantorId.HasValue) return Unauthorized();

        try
        {
            var result = await _delegation.CreateGrantAsync(dto, grantorId.Value);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Thu hồi ủy quyền (Status → 2-Revoked). Chỉ áp cho Active (Status=0).</summary>
    [HttpPost("grants/{id:guid}/revoke")]
    public async Task<IActionResult> RevokeGrant(Guid id)
    {
        var username = _currentUser.UserName ?? _currentUser.UserId ?? "unknown";
        var ok = await _delegation.RevokeGrantAsync(id, username);
        if (!ok) return NotFound(new { message = "Không tìm thấy ủy quyền hoặc đã thu hồi." });
        return Ok(new { revoked = true });
    }
}
