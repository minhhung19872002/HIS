using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/signing-workflow")]
[Authorize]
public class SigningWorkflowController : ControllerBase
{
    private readonly ISigningWorkflowService _service;

    public SigningWorkflowController(ISigningWorkflowService service)
    {
        _service = service;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? Guid.Empty.ToString());
    private string GetUserName() => User.FindFirst(ClaimTypes.Name)?.Value ?? User.Identity?.Name ?? "";

    /// <summary>
    /// Danh sach yeu cau cho ky (assigned to current user)
    /// </summary>
    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingRequests([FromQuery] SigningRequestSearchDto? filter)
    {
        var result = await _service.GetPendingRequestsAsync(GetUserId(), filter);
        return Ok(result);
    }

    /// <summary>
    /// Danh sach yeu cau da trinh (submitted by current user)
    /// </summary>
    [HttpGet("submitted")]
    public async Task<IActionResult> GetSubmittedRequests([FromQuery] SigningRequestSearchDto? filter)
    {
        var result = await _service.GetSubmittedRequestsAsync(GetUserId(), filter);
        return Ok(result);
    }

    /// <summary>
    /// Lich su da xu ly (approved/rejected/cancelled)
    /// </summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] SigningRequestSearchDto? filter)
    {
        var result = await _service.GetHistoryAsync(GetUserId(), filter);
        return Ok(result);
    }

    /// <summary>
    /// Gui trinh ky moi
    /// </summary>
    [HttpPost("submit")]
    public async Task<IActionResult> SubmitRequest([FromBody] SubmitSigningRequestDto dto)
    {
        var result = await _service.SubmitRequestAsync(dto, GetUserId(), GetUserName());
        return Ok(result);
    }

    /// <summary>
    /// Phe duyet (ky) yeu cau
    /// </summary>
    [HttpPost("{id}/approve")]
    public async Task<IActionResult> ApproveRequest(Guid id, [FromBody] ApproveSigningRequestDto? dto)
    {
        try
        {
            var result = await _service.ApproveRequestAsync(id, GetUserId(), dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Tu choi yeu cau
    /// </summary>
    [HttpPost("{id}/reject")]
    public async Task<IActionResult> RejectRequest(Guid id, [FromBody] RejectSigningRequestDto dto)
    {
        try
        {
            var result = await _service.RejectRequestAsync(id, GetUserId(), dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Huy yeu cau trinh ky
    /// </summary>
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelRequest(Guid id)
    {
        try
        {
            await _service.CancelRequestAsync(id, GetUserId());
            return Ok(new { message = "Da huy yeu cau trinh ky" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Thong ke trinh ky
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var result = await _service.GetStatsAsync(GetUserId());
        return Ok(result);
    }
}
