using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.API.Filters;

namespace HIS.API.Controllers;

/// <summary>
/// AUTHZ-1 (#367): thông tin ủy quyền của CHÍNH user đang đăng nhập.
/// FE gọi GET /api/me/permissions sau login để gate menu/nút (UX-only — an ninh thật ở BE handler).
/// </summary>
[ApiController]
[Route("api/me")]
[TypeFilter(typeof(DomainExceptionFilter))]
public class MeController : ControllerBase
{
    private readonly IPermissionService _permissions;

    public MeController(IPermissionService permissions) => _permissions = permissions;

    [Authorize]
    [HttpGet("permissions")]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetMyPermissions()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var set = await _permissions.GetPermissionSetAsync(userId);
        return Ok(ApiResponse<List<string>>.Ok(set.OrderBy(x => x).ToList()));
    }
}
