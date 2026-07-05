using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.DTOs.SampleReceive;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Sample Receive + Review workflow — N1.16 + N1.17.
/// Tách: Collect (lấy mẫu) → Receive (LIS nhận) → Technician run → Reviewer duyệt.
/// Review bắt buộc ReviewerUserId ≠ TechnicianUserId (4-eyes principle).
/// </summary>
[ApiController]
[Route("api/sample-receive")]
[Authorize]
public class SampleReceiveController : ControllerBase
{
    private readonly ISampleReceiveService _svc;
    public SampleReceiveController(ISampleReceiveService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    /// <summary>Danh sách mẫu chờ nhận tại LIS.</summary>
    [HttpGet("pending")]
    public async Task<IActionResult> Pending([FromQuery] string? keyword)
        => (await _svc.PendingAsync(keyword)).ToActionResult();


    /// <summary>Nhận mẫu — đánh dấu ReceiveStatus=1.</summary>
    [HttpPost("accept")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabReceptionist + "," + RoleNames.LabManager + "," + RoleNames.Technician)]
    public async Task<IActionResult> Accept([FromBody] ReceiveDto dto)
        => (await _svc.AcceptAsync(dto, GetUserId())).ToActionResult();


    /// <summary>Từ chối mẫu (mẫu không đạt).</summary>
    [HttpPost("reject")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabReceptionist + "," + RoleNames.LabManager + "," + RoleNames.Technician)]
    public async Task<IActionResult> Reject([FromBody] RejectDto dto)
        => (await _svc.RejectAsync(dto, GetUserId())).ToActionResult();


    /// <summary>KTV nhập kết quả (chưa duyệt).</summary>
    [HttpPost("technician-run")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Technician + "," + RoleNames.LabManager)]
    public async Task<IActionResult> TechnicianRun([FromBody] RunDto dto)
        => (await _svc.TechnicianRunAsync(dto, GetUserId())).ToActionResult();


    /// <summary>Reviewer duyệt kết quả. Bắt buộc ReviewerUserId ≠ TechnicianUserId.</summary>
    [HttpPost("review")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabReviewer + "," + RoleNames.LabManager + "," + RoleNames.Radiologist)]
    public async Task<IActionResult> Review([FromBody] ReviewDto dto)
        => (await _svc.ReviewAsync(dto, GetUserId())).ToActionResult();


    /// <summary>Hủy nhận mẫu — đảo ReceiveStatus 1→0, clear ReceivedByUserId/At, Status về 0.</summary>
    [HttpPost("cancel-receive")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabReceptionist + "," + RoleNames.LabManager)]
    public async Task<IActionResult> CancelReceive([FromBody] CancelReceiveDto dto)
        => (await _svc.CancelReceiveAsync(dto, GetUserId())).ToActionResult();

    /// <summary>
    /// Danh sách mẫu đã nhận hôm nay (ReceiveStatus=1, trong ngày VN).
    /// Dùng VnTime.DayRangeUtc để tránh lệch bucket UTC trong khung 00h–07h.
    /// </summary>
    [HttpGet("accepted")]
    public async Task<IActionResult> Accepted([FromQuery] string? keyword)
        => (await _svc.AcceptedAsync(keyword)).ToActionResult();

    /// <summary>Trạng thái của 1 detail (cho tracking).</summary>
    [HttpGet("status/{detailId:guid}")]
    public async Task<IActionResult> Status(Guid detailId)
        => (await _svc.StatusAsync(detailId)).ToActionResult();
}
