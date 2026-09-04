using System.Security.Claims;
using HIS.Application.DTOs.RadiologyDispatch;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/radiology-dispatch")]
[Authorize]
public class RadiologyDispatchController : ControllerBase
{
    private readonly IRadiologyDispatchService _svc;
    public RadiologyDispatchController(IRadiologyDispatchService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    // ==================== Dispatch ====================

    [HttpPost]
    public async Task<IActionResult> Dispatch([FromBody] CreateDispatchDto dto)
        => Ok(await _svc.DispatchAsync(dto, GetUserId()));

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        if (!await _svc.CancelAsync(id))
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Đã thực hiện, không hủy được" });
        return Ok();
    }

    [HttpPost("{id:guid}/mark-arrived")]
    public async Task<IActionResult> MarkArrived(Guid id)
    {
        await _svc.MarkArrivedAsync(id);
        return Ok();
    }

    [HttpPost("{id:guid}/mark-performed")]
    public async Task<IActionResult> MarkPerformed(Guid id)
    {
        await _svc.MarkPerformedAsync(id, GetUserId());
        return Ok();
    }

    [HttpGet("queue/{roomId:guid}")]
    public async Task<IActionResult> RoomQueue(Guid roomId)
        => Ok(await _svc.RoomQueueAsync(roomId));

    [HttpGet("pending")]
    public async Task<IActionResult> PendingServices([FromQuery] bool overdueOnly = false)
        => Ok(await _svc.PendingServicesAsync(overdueOnly));

    // ==================== Permissions ====================

    [HttpPost("permissions")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.DepartmentHead)]
    public async Task<IActionResult> SavePermission([FromBody] SavePermissionDto dto)
    {
        await _svc.SavePermissionAsync(dto, GetUserId());
        return Ok();
    }

    [HttpPost("permissions/copy")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.DepartmentHead)]
    public async Task<IActionResult> CopyPermissions([FromQuery] Guid fromUserId, [FromQuery] Guid toUserId)
        => Ok(await _svc.CopyPermissionsAsync(fromUserId, toUserId, GetUserId()));

    [HttpGet("permissions/user/{userId:guid}")]
    public async Task<IActionResult> UserPermissions(Guid userId)
        => Ok(await _svc.UserPermissionsAsync(userId));

    [HttpDelete("permissions/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.DepartmentHead)]
    public async Task<IActionResult> DeletePermission(Guid id)
    {
        await _svc.DeletePermissionAsync(id);
        return Ok();
    }
}
