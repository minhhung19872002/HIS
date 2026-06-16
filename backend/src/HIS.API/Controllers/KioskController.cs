using HIS.Application.DTOs.Kiosk;
using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Self-service kiosk — cấp số / checkin CCCD-BHYT / quản lý hàng chờ.
///
/// PHÂN QUYỀN (lựa chọn đã cân nhắc):
///   [AllowAnonymous]  → IssueTicket, CheckinByCard, GetQueue, GetTicket
///     • Kiosk đặt nơi công cộng, BN không đăng nhập được.
///     • Giới hạn an toàn: các endpoint này CHỈ tạo/đọc phiếu số;
///       KHÔNG trả PII đầy đủ (CMND/BHYT che bớt), KHÔNG đụng dữ liệu lâm sàng.
///     • Rate-limit chống lạm dụng nên cấu hình ở tầng gateway/nginx (ngoài scope task này).
///   [Authorize]       → CallNext, CompleteTicket, CancelTicket
///     • Thao tác gọi số / hoàn tất do nhân viên lễ tân thực hiện.
/// </summary>
[ApiController]
[Route("api/kiosk")]
public class KioskController : ControllerBase
{
    private readonly IKioskService _service;

    public KioskController(IKioskService service)
    {
        _service = service;
    }

    // ── Kiosk public endpoints (AllowAnonymous) ────────────────────────────────

    /// <summary>
    /// Cấp số thứ tự — BN bấm tay hoặc nhân viên hỗ trợ.
    /// Số reset 0h hằng ngày theo giờ VN, tăng dần theo khoa.
    /// </summary>
    [HttpPost("issue")]
    [AllowAnonymous]
    public async Task<ActionResult<KioskTicketDto>> IssueTicket([FromBody] IssueTicketDto dto)
    {
        try
        {
            var result = await _service.IssueTicketAsync(dto);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = "VALIDATION_FAILED", message = ex.Message });
        }
    }

    /// <summary>
    /// Checkin bằng CCCD hoặc số thẻ BHYT.
    /// Tra cứu BN trong hệ thống, trả về phiếu số + tên che.
    /// </summary>
    [HttpPost("checkin")]
    [AllowAnonymous]
    public async Task<ActionResult<CheckinResultDto>> CheckinByCard([FromBody] CheckinByCardDto dto)
    {
        try
        {
            var result = await _service.CheckinByCardAsync(dto);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = "VALIDATION_FAILED", message = ex.Message });
        }
    }

    /// <summary>
    /// Trạng thái hàng chờ theo khoa/phòng (dùng bởi màn hình QueueDisplay và kiosk).
    /// </summary>
    [HttpGet("queue")]
    [AllowAnonymous]
    public async Task<ActionResult<QueueStatusDto>> GetQueueStatus(
        [FromQuery] Guid? departmentId,
        [FromQuery] Guid? roomId)
    {
        var result = await _service.GetQueueStatusAsync(departmentId, roomId);
        return Ok(result);
    }

    /// <summary>
    /// Chi tiết một phiếu (BN dùng để kiểm tra số thứ tự của mình).
    /// </summary>
    [HttpGet("ticket/{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<KioskTicketDto>> GetTicket(Guid id)
    {
        var t = await _service.GetByIdAsync(id);
        return t == null ? NotFound() : Ok(t);
    }

    // ── Staff endpoints (Authorize) ────────────────────────────────────────────

    /// <summary>
    /// Gọi số tiếp theo trong hàng chờ của khoa/phòng. Chỉ nhân viên.
    /// </summary>
    [HttpPost("call-next")]
    [Authorize]
    public async Task<ActionResult<KioskTicketDto>> CallNext([FromBody] CallNextDto dto)
    {
        var result = await _service.CallNextAsync(dto);
        if (result == null)
            return Ok(new { message = "Hàng chờ rỗng — không còn phiếu nào." });
        return Ok(result);
    }

    /// <summary>
    /// Hoàn tất phiếu (BN đã được phục vụ). Chỉ nhân viên.
    /// </summary>
    [HttpPost("ticket/{id:guid}/complete")]
    [Authorize]
    public async Task<ActionResult<KioskTicketDto>> CompleteTicket(Guid id)
    {
        try
        {
            var result = await _service.CompleteTicketAsync(id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Hủy phiếu (BN rời đi / skip). Chỉ nhân viên.
    /// </summary>
    [HttpPost("ticket/{id:guid}/cancel")]
    [Authorize]
    public async Task<ActionResult<KioskTicketDto>> CancelTicket(Guid id)
    {
        try
        {
            var result = await _service.CancelTicketAsync(id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
