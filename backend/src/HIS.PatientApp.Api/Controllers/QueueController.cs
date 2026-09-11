using HIS.PatientApp.Api.Common;
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
    /// <summary>Loại phòng "Quầy tiếp đón" trong HIS (xem Room.RoomType).</summary>
    private const int ReceptionCounterRoomType = 7;

    /// <summary>Hàng đợi quầy tiếp đón (xem QueueTicket.QueueType).</summary>
    private const int ReceptionQueueType = 1;

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

    /// <summary>
    /// Nơi lấy số, kèm số người đang chờ.
    ///
    /// <para>Mặc định chỉ trả QUẦY TIẾP ĐÓN (loại phòng 7). Người bệnh lấy số để vào quầy đăng ký
    /// — chọn dịch vụ, đối chiếu BHYT, thu phí — rồi quầy mới xếp họ vào phòng khám.</para>
    ///
    /// <para>Trước đây danh sách này trả về PHÒNG KHÁM và app lấy số thẳng vào hàng đợi khám. Hậu
    /// quả có thật: phòng khám gọi "B001", người bệnh bước vào, nhưng họ chưa hề đăng ký nên không
    /// có hồ sơ khám nào — bác sĩ mở danh sách ra không thấy ai. Truyền <c>roomType</c> để lấy loại
    /// khác khi thật sự cần.</para>
    /// </summary>
    [HttpGet("rooms")]
    public async Task<IActionResult> Rooms(
        [FromQuery] Guid? departmentId, [FromQuery] int? roomType, CancellationToken ct)
    {
        try
        {
            var items = await _his.GetRoomsAsync(departmentId, ct, roomType ?? ReceptionCounterRoomType);

            // Cơ sở chưa khai báo phòng nào là quầy tiếp đón thì danh sách rỗng, và người bệnh mất
            // luôn khả năng lấy số. Thà trả về danh sách chưa lọc còn hơn chặn họ — vé vẫn thuộc
            // hàng đợi TIẾP ĐÓN nên phòng khám không gọi nhầm, và quầy vẫn thấy nó ở mục
            // "Vé chờ tiếp đón". Ghi log để còn biết mà khai lại loại phòng.
            if (items.Count == 0 && roomType == null)
            {
                _logger.LogWarning(
                    "Không có phòng nào thuộc loại Quầy tiếp đón ({RoomType}) — trả về toàn bộ phòng "
                    + "để người bệnh vẫn lấy được số. Cần khai báo lại loại phòng trong HIS.",
                    ReceptionCounterRoomType);

                items = await _his.GetRoomsAsync(departmentId, ct);
            }

            return Ok(ApiResponse<IReadOnlyList<HisRoom>>.Ok(items));
        }
        catch (HisConnectorException ex)
        {
            return HisUnavailable(ex);
        }
    }

    /// <summary>Những số thứ tự người bệnh đã xin trong ngày hôm nay.</summary>
    [HttpGet("tickets")]
    public async Task<IActionResult> MyTickets(CancellationToken ct)
    {
        var accountId = User.GetAccountId();
        var today = VnClock.Today;

        // Chiếu ra DTO thay vì trả thẳng thực thể: thực thể có AccountId, không việc gì phải ra ngoài.
        var tickets = await _db.QueueTickets
            .AsNoTracking()
            .Where(t => t.AccountId == accountId && t.QueueDate == today)
            .OrderBy(t => t.CreatedAt)
            .Select(t => new MyQueueTicketDto
            {
                Id = t.HisTicketId,
                TicketCode = t.TicketCode,
                QueueNumber = t.QueueNumber,
                RoomId = t.RoomId,
                RoomName = t.RoomName,
                QueueType = t.QueueType,
                Priority = t.Priority,
                PriorityVerified = t.PriorityVerified,
                IssuedAt = t.CreatedAt,
            })
            .ToListAsync(ct);

        return Ok(ApiResponse<IReadOnlyList<MyQueueTicketDto>>.Ok(tickets));
    }

    /// <summary>Lấy số thứ tự. Trả về vé kèm mức ưu tiên mà HIS quyết định.</summary>
    [HttpPost("take-number")]
    public async Task<IActionResult> TakeNumber([FromBody] TakeNumberDto dto, CancellationToken ct)
    {
        var accountId = User.GetAccountId();
        var account = await _db.Accounts
            .Where(a => a.Id == accountId)
            .Select(a => new { a.PhoneNumber, a.FullName, a.HisPatientId })
            .FirstOrDefaultAsync(ct);

        if (account is null) return NotFound(ApiResponse.Fail("Không tìm thấy tài khoản."));

        var today = VnClock.Today;

        // Chống trùng phải làm ở đây: tài khoản chưa liên kết hồ sơ thì bên HIS là khách vô danh,
        // HIS không có gì để nhận ra hai lần xin số là cùng một người.
        var existing = await _db.QueueTickets.AsNoTracking().FirstOrDefaultAsync(
            t => t.AccountId == accountId && t.RoomId == dto.RoomId && t.QueueDate == today, ct);

        if (existing is not null)
        {
            return BadRequest(ApiResponse.Fail(
                $"Bạn đã có số thứ tự {existing.TicketCode} tại phòng này hôm nay. "
                + "Vui lòng dùng số đã lấy."));
        }

        HisQueueTicket ticket;
        try
        {
            ticket = await _his.TakeQueueNumberAsync(
                account.PhoneNumber, account.FullName, dto.RoomId,
                dto.QueueType <= 0 ? ReceptionQueueType : dto.QueueType, dto.PriorityReason, ct);
        }
        catch (HisConnectorException ex) when (ex.StatusCode == StatusCodes.Status400BadRequest)
        {
            // HIS chặn khi hồ sơ này đã có vé cùng phòng trong ngày (lấy ở quầy chẳng hạn).
            return BadRequest(ApiResponse.Fail(
                "Hồ sơ của bạn đã có số thứ tự tại phòng này hôm nay. Vui lòng dùng số đã lấy."));
        }
        catch (HisConnectorException ex)
        {
            return HisUnavailable(ex);
        }

        var record = _db.QueueTickets.Add(new AppQueueTicket
        {
            AccountId = accountId,
            HisTicketId = ticket.Id,
            TicketCode = ticket.TicketCode,
            QueueNumber = ticket.QueueNumber,
            RoomId = dto.RoomId,
            RoomName = ticket.RoomName,
            QueueType = ticket.QueueType,
            QueueDate = today,
            Priority = ticket.Priority,
            PriorityVerified = ticket.PriorityVerified,
        });

        // Ghi nhật ký: lấy số là một hành động chạm vào hồ sơ bệnh nhân.
        if (account.HisPatientId.HasValue)
        {
            _db.AccessAuditLogs.Add(new AccessAuditLog
            {
                ActorAccountId = accountId,
                ActorType = "patient",
                TargetPatientId = account.HisPatientId.Value,
                Action = "take_queue_number",
                ResourceRef = $"queue_ticket:{ticket.Id}",
                Ip = HttpContext.GetClientIp(),
                UserAgent = Request.Headers.UserAgent.ToString(),
            });
        }

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex)
        {
            // Hai lần bấm sát nhau: chỉ số duy nhất chặn dòng thứ hai. Vé đã cấp bên HIS rồi nên báo
            // thành công thay vì bắt người bệnh xin lại — nhưng vẫn phải cứu lấy dòng nhật ký.
            _logger.LogInformation(ex, "Vé trùng do bấm hai lần, tài khoản {AccountId}.", accountId);
            record.State = EntityState.Detached;
            await _db.SaveChangesAsync(ct);
        }

        return Ok(ApiResponse<HisQueueTicket>.Ok(ticket, BuildPriorityMessage(ticket)));
    }

    /// <summary>Trạng thái vé: đang gọi số nào, còn bao nhiêu người, ước tính bao nhiêu phút.</summary>
    [HttpGet("tickets/{ticketId:guid}/status")]
    public async Task<IActionResult> TicketStatus(Guid ticketId, CancellationToken ct)
    {
        // Vé của người khác thì trả 404 y như vé không tồn tại: nói "vé này có nhưng không phải của
        // bạn" đã là tiết lộ.
        var owned = await _db.QueueTickets.AsNoTracking().AnyAsync(
            t => t.HisTicketId == ticketId && t.AccountId == User.GetAccountId(), ct);

        if (!owned) return NotFound(ApiResponse.Fail("Không tìm thấy số thứ tự."));

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

/// <summary>Một số thứ tự app đã xin trong ngày. <c>Id</c> là id vé bên HIS — dùng để hỏi trạng thái.</summary>
public class MyQueueTicketDto
{
    public Guid Id { get; set; }
    public string TicketCode { get; set; } = string.Empty;
    public int QueueNumber { get; set; }
    public Guid RoomId { get; set; }
    public string? RoomName { get; set; }
    public int QueueType { get; set; }
    public int Priority { get; set; }
    public bool PriorityVerified { get; set; }
    public DateTime IssuedAt { get; set; }
}

public class TakeNumberDto
{
    public Guid RoomId { get; set; }

    /// <summary>
    /// 1 Tiếp đón · 2 Khám bệnh · 3 Xét nghiệm · 4 CĐHA · 5 Lĩnh thuốc. Mặc định 1 (Tiếp đón).
    ///
    /// <para>Mặc định CỐ Ý là hàng đợi tiếp đón chứ không phải hàng đợi khám: lấy số qua app không
    /// tạo ra lượt khám nào trong HIS, nên một vé khám bệnh sẽ được phòng khám gọi trong khi người
    /// bệnh chưa đăng ký, chưa đối chiếu BHYT, chưa thu phí.</para>
    /// </summary>
    public int QueueType { get; set; } = 1;

    /// <summary>
    /// 1 Người cao tuổi · 2 Trẻ dưới 6 tuổi · 3 Phụ nữ có thai · 4 Người khuyết tật nặng ·
    /// 5 Người có công. Bỏ trống = xin số thường.
    ///
    /// HIS tự đối chiếu tuổi từ hồ sơ nên khai sai tuổi sẽ bị từ chối, còn người đủ tuổi vẫn được
    /// ưu tiên dù không khai.
    /// </summary>
    public int? PriorityReason { get; set; }
}
