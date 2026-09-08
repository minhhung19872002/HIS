using HIS.PatientApp.Api.Connector;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Controllers;

/// <summary>
/// Lấy số thứ tự ngoại trú — HSMT I.2 #3.
///
/// Số điện thoại gửi sang HIS luôn lấy từ tài khoản đang đăng nhập, KHÔNG nhận từ body: nếu nhận
/// thì ai cũng lấy số hộ người khác được.
/// </summary>
[ApiController]
[Route("api/v1/patient/queue")]
[Authorize]
[Produces("application/json")]
public class QueueController : ControllerBase
{
    private readonly IHisConnector _his;
    private readonly PatientAppDbContext _db;
    private readonly ILogger<QueueController> _logger;

    public QueueController(IHisConnector his, PatientAppDbContext db, ILogger<QueueController> logger)
    {
        _his = his;
        _db = db;
        _logger = logger;
    }

    /// <summary>Khoa khám để người bệnh chọn.</summary>
    [HttpGet("departments")]
    public async Task<IActionResult> Departments(CancellationToken ct)
    {
        try
        {
            var items = await _his.GetDepartmentsAsync(ct);
            return Ok(ApiResponse<IReadOnlyList<HisDepartment>>.Ok(items));
        }
        catch (HisConnectorException ex)
        {
            return HisUnavailable(ex);
        }
    }

    /// <summary>Phòng khám đang mở, kèm số người đang chờ.</summary>
    [HttpGet("rooms")]
    public async Task<IActionResult> Rooms([FromQuery] Guid? departmentId, CancellationToken ct)
    {
        try
        {
            var items = await _his.GetRoomsAsync(departmentId, ct);
            return Ok(ApiResponse<IReadOnlyList<HisRoom>>.Ok(items));
        }
        catch (HisConnectorException ex)
        {
            return HisUnavailable(ex);
        }
    }

    /// <summary>Lấy số thứ tự. Trả về vé kèm mức ưu tiên mà HIS quyết định.</summary>
    [HttpPost("take-number")]
    public async Task<IActionResult> TakeNumber([FromBody] TakeNumberDto dto, CancellationToken ct)
    {
        var account = await _db.Accounts
            .Where(a => a.Id == User.GetAccountId())
            .Select(a => new { a.PhoneNumber, a.FullName, a.HisPatientId })
            .FirstOrDefaultAsync(ct);

        if (account is null) return NotFound(ApiResponse.Fail("Không tìm thấy tài khoản."));

        try
        {
            var ticket = await _his.TakeQueueNumberAsync(
                account.PhoneNumber, account.FullName, dto.RoomId,
                dto.QueueType <= 0 ? 2 : dto.QueueType, dto.PriorityReason, ct);

            // Ghi nhật ký: lấy số là một hành động chạm vào hồ sơ bệnh nhân.
            if (account.HisPatientId.HasValue)
            {
                _db.AccessAuditLogs.Add(new AccessAuditLog
                {
                    ActorAccountId = User.GetAccountId(),
                    ActorType = "patient",
                    TargetPatientId = account.HisPatientId.Value,
                    Action = "take_queue_number",
                    ResourceRef = $"queue_ticket:{ticket.Id}",
                    Ip = HttpContext.GetClientIp(),
                    UserAgent = Request.Headers.UserAgent.ToString(),
                });
                await _db.SaveChangesAsync(ct);
            }

            return Ok(ApiResponse<HisQueueTicket>.Ok(ticket, BuildPriorityMessage(ticket)));
        }
        catch (HisConnectorException ex) when (ex.StatusCode == StatusCodes.Status400BadRequest)
        {
            // HIS chặn khi đã có vé cùng phòng trong ngày — nói lại cho người bệnh hiểu.
            return BadRequest(ApiResponse.Fail(
                "Bạn đã có số thứ tự tại phòng này hôm nay. Vui lòng dùng số đã lấy."));
        }
        catch (HisConnectorException ex)
        {
            return HisUnavailable(ex);
        }
    }

    /// <summary>Trạng thái vé: đang gọi số nào, còn bao nhiêu người, ước tính bao nhiêu phút.</summary>
    [HttpGet("tickets/{ticketId:guid}/status")]
    public async Task<IActionResult> TicketStatus(Guid ticketId, CancellationToken ct)
    {
        try
        {
            var status = await _his.GetQueueTicketStatusAsync(ticketId, ct);
            return status is null
                ? NotFound(ApiResponse.Fail("Không tìm thấy số thứ tự."))
                : Ok(ApiResponse<HisQueueTicketStatus>.Ok(status));
        }
        catch (HisConnectorException ex)
        {
            return HisUnavailable(ex);
        }
    }

    /// <summary>Nói rõ vé có được ưu tiên không và vì sao — tránh để người bệnh tự đoán.</summary>
    private static string BuildPriorityMessage(HisQueueTicket ticket)
    {
        if (ticket.Priority <= 0)
            return $"Đã lấy số {ticket.TicketCode}.";

        return ticket.PriorityVerified
            ? $"Đã lấy số ưu tiên {ticket.TicketCode} ({ticket.PriorityReasonName})."
            : $"Đã lấy số ưu tiên {ticket.TicketCode}. Vui lòng xuất trình giấy tờ chứng minh diện "
              + "ưu tiên tại quầy khi được gọi.";
    }

    private IActionResult HisUnavailable(HisConnectorException ex)
    {
        _logger.LogError(ex, "Không lấy được dữ liệu hàng đợi từ HIS.");
        return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiResponse.Fail(
            "Hiện chưa kết nối được tới hệ thống bệnh viện. Vui lòng thử lại sau ít phút.",
            "HIS_UNAVAILABLE"));
    }
}

public class TakeNumberDto
{
    public Guid RoomId { get; set; }

    /// <summary>1 Tiếp đón · 2 Khám bệnh · 3 Xét nghiệm · 4 CĐHA · 5 Lĩnh thuốc. Mặc định 2.</summary>
    public int QueueType { get; set; } = 2;

    /// <summary>
    /// 1 Người cao tuổi · 2 Trẻ dưới 6 tuổi · 3 Phụ nữ có thai · 4 Người khuyết tật nặng ·
    /// 5 Người có công. Bỏ trống = xin số thường.
    ///
    /// HIS tự đối chiếu tuổi từ hồ sơ nên khai sai tuổi sẽ bị từ chối, còn người đủ tuổi vẫn được
    /// ưu tiên dù không khai.
    /// </summary>
    public int? PriorityReason { get; set; }
}
