using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.DTOs.SampleCollection;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Lấy mẫu bệnh phẩm với STT tuần tự theo ngày + thêm XN cùng mẫu.
/// Bổ sung LISCompleteController với các tính năng MQ Solutions yêu cầu.
/// </summary>
[ApiController]
[Route("api/sample-collection")]
[Authorize]
public class SampleCollectionController : ControllerBase
{
    private readonly ISampleCollectionService _svc;

    public SampleCollectionController(ISampleCollectionService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;


    /// <summary>
    /// Cấp STT tuần tự theo ngày cho mẫu bệnh phẩm.
    /// Format: {Prefix}-{yyMMdd}-{NNNN} (VD: XN-250102-0042)
    /// </summary>
    [HttpPost("assign-sequence")]
    public async Task<IActionResult> AssignSequence([FromBody] AssignSequenceDto dto)
        => (await _svc.AssignSequenceAsync(dto, GetUserId())).ToActionResult();


    /// <summary>
    /// Thêm XN bổ sung trên cùng 1 mẫu bệnh phẩm đã lấy — MQ Solutions "Thêm XN cùng mẫu".
    /// Các XN mới dùng lại cùng SampleBarcode → không cần lấy mẫu mới.
    /// </summary>
    [HttpPost("add-tests")]
    public async Task<IActionResult> AddTests([FromBody] AddTestsToSampleDto dto)
        => (await _svc.AddTestsAsync(dto, GetUserId())).ToActionResult();


    /// <summary>
    /// Sửa STT mẫu — đổi số thứ tự trong ngày (MQ Solutions "Sửa STT").
    /// </summary>
    [HttpPost("update-sequence")]
    public async Task<IActionResult> UpdateSequence([FromBody] UpdateSequenceDto dto)
        => (await _svc.UpdateSequenceAsync(dto)).ToActionResult();

    // ─── Hẹn lấy mẫu / tái XN định kỳ ───────────────────────────────────────


    /// <summary>Tạo hẹn lấy mẫu / tái XN định kỳ.</summary>
    [HttpPost("appointments")]
    public async Task<IActionResult> CreateAppointment([FromBody] CreateAppointmentDto dto)
        => (await _svc.CreateAppointmentAsync(dto, GetUserId())).ToActionResult();

    /// <summary>Danh sách hẹn của BN (hoặc toàn hệ thống nếu không truyền patientId).</summary>
    [HttpGet("appointments")]
    public async Task<IActionResult> GetAppointments(
        [FromQuery] Guid? patientId,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
        => (await _svc.GetAppointmentsAsync(patientId, status, fromDate, toDate)).ToActionResult();

    /// <summary>
    /// Cập nhật trạng thái hẹn (Complete / Cancel).
    /// Recurrence: khi hẹn định kỳ chuyển sang Completed → tự sinh hẹn KẾ TIẾP
    /// (AppointmentAt + chu kỳ); RecurrenceCount đếm lùi, hết lượt thì hẹn cuối thành None
    /// (0 = không giới hạn → sinh mãi). Hủy hẹn = dừng chuỗi (không sinh tiếp).
    /// </summary>
    [HttpPatch("appointments/{id:guid}")]
    public async Task<IActionResult> UpdateAppointment(Guid id, [FromBody] UpdateAppointmentDto dto)
        => (await _svc.UpdateAppointmentAsync(id, dto, GetUserId())).ToActionResult();


    /// <summary>Lịch sử lấy mẫu của BN, group theo ngày/đợt</summary>
    [HttpGet("history/{patientId:guid}")]
    public async Task<IActionResult> History(Guid patientId)
        => (await _svc.HistoryAsync(patientId)).ToActionResult();
}
