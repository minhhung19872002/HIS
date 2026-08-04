using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
using HIS.Core.Constants;

namespace HIS.API.Controllers;

/// <summary>
/// NangCap26 — I.15 Quyền dữ liệu phòng/kho · I.16 Phân quyền dữ liệu người dùng.
/// Row-level scope (khoa/phòng · kho · loại điều trị · đối tượng BN), khác quyền chức năng.
/// </summary>
[ApiController]
[Route("api/data-permission")]
[Authorize(Roles = RoleNames.Admin)]
[TypeFilter(typeof(Filters.DomainExceptionFilter))]
public class DataPermissionController : ControllerBase
{
    private readonly IDataPermissionService _service;
    public DataPermissionController(IDataPermissionService service) => _service = service;

    private Guid GetUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : Guid.Empty;
    }

    /// <summary>Danh sách nhóm quyền dữ liệu kèm phạm vi + số user đang gán.</summary>
    [HttpGet("groups")]
    public async Task<ActionResult<List<DataPermissionGroupDto>>> GetGroups([FromQuery] bool activeOnly = false)
        => Ok(await _service.GetGroupsAsync(activeOnly));

    /// <summary>Tạo/sửa nhóm quyền dữ liệu (ghi đè toàn bộ danh sách phạm vi).</summary>
    [HttpPost("groups")]
    public async Task<ActionResult<DataPermissionGroupDto>> SaveGroup([FromBody] SaveDataPermissionGroupDto dto)
        => Ok(await _service.SaveGroupAsync(dto, GetUserId()));

    /// <summary>Xóa nhóm (chặn nếu đang gán cho người dùng).</summary>
    [HttpDelete("groups/{id}")]
    public async Task<IActionResult> DeleteGroup(Guid id)
    {
        await _service.DeleteGroupAsync(id, GetUserId());
        return NoContent();
    }

    /// <summary>Các nhóm quyền dữ liệu đang gán cho 1 người dùng.</summary>
    [HttpGet("users/{userId}/groups")]
    public async Task<ActionResult<List<Guid>>> GetUserGroups(Guid userId)
        => Ok(await _service.GetUserGroupsAsync(userId));

    /// <summary>Gán lại toàn bộ nhóm quyền dữ liệu cho 1 người dùng.</summary>
    [HttpPost("users/assign")]
    public async Task<IActionResult> AssignUserGroups([FromBody] AssignDataPermissionDto dto)
    {
        await _service.AssignUserGroupsAsync(dto, GetUserId());
        return NoContent();
    }

    /// <summary>
    /// Phạm vi dữ liệu hiệu lực của 1 người dùng (đã gộp nhóm).
    /// Unrestricted = true nghĩa là chưa gán nhóm nào → không giới hạn.
    /// </summary>
    [HttpGet("users/{userId}/effective-scope")]
    public async Task<ActionResult<EffectiveDataScopeDto>> GetEffectiveScope(Guid userId)
        => Ok(await _service.GetEffectiveScopeAsync(userId));

    /// <summary>Phạm vi dữ liệu hiệu lực của chính người đang đăng nhập (FE dùng để lọc UI).</summary>
    [HttpGet("me/effective-scope")]
    [Authorize]
    public async Task<ActionResult<EffectiveDataScopeDto>> GetMyEffectiveScope()
        => Ok(await _service.GetEffectiveScopeAsync(GetUserId()));
}
