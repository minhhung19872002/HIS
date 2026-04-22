using System.Security.Claims;
using HIS.Application.DTOs.Examination;
using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/multi-specialty-exam")]
[Authorize]
public class MultiSpecialtyExamController : ControllerBase
{
    private readonly IMultiSpecialtyExamService _service;

    public MultiSpecialtyExamController(IMultiSpecialtyExamService service)
    {
        _service = service;
    }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    /// <summary>Đăng ký nhiều phòng khám cùng lúc (chỉ thu phí/dịch vụ)</summary>
    [HttpPost("register-multi-rooms")]
    public async Task<ActionResult<MultiRoomRegistrationResultDto>> RegisterMultiRooms(
        [FromBody] MultiRoomRegistrationDto dto)
    {
        var result = await _service.RegisterMultipleRoomsAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>Xử trí "Khám thêm chuyên khoa khác" — tạo phiên khám con</summary>
    [HttpPost("add-follow-up")]
    public async Task<ActionResult<RegisteredExamDto>> AddFollowUp(
        [FromBody] AddFollowUpSpecialtyDto dto)
    {
        var result = await _service.AddFollowUpSpecialtyAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>Chuyển phòng khám khi BN chưa vào phòng</summary>
    [HttpPost("change-room")]
    public async Task<ActionResult<RegisteredExamDto>> ChangeRoom(
        [FromBody] ChangeRoomBeforeExamDto dto)
    {
        var result = await _service.ChangeRoomBeforeExamAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>Kiểm tra trạng thái hoàn tất + có được in bảng kê không</summary>
    [HttpGet("completion-status/{examinationId:guid}")]
    public async Task<ActionResult<ExamCompletionStatusDto>> GetStatus(Guid examinationId)
    {
        var s = await _service.GetCompletionStatusAsync(examinationId);
        return Ok(s);
    }

    /// <summary>In chi phí (bảng kê)</summary>
    [HttpPost("print-bill/{examinationId:guid}")]
    public async Task<ActionResult<ExamCompletionStatusDto>> PrintBill(Guid examinationId)
    {
        var s = await _service.PrintBillAsync(examinationId, GetUserId());
        return Ok(s);
    }

    /// <summary>Hủy in chi phí — để chỉnh sửa phiên khám</summary>
    [HttpPost("cancel-print-bill/{examinationId:guid}")]
    [Authorize(Roles = "Admin,DepartmentHead,Accountant")]
    public async Task<ActionResult<ExamCompletionStatusDto>> CancelPrintBill(Guid examinationId)
    {
        var s = await _service.CancelPrintBillAsync(examinationId, GetUserId());
        return Ok(s);
    }

    /// <summary>Hủy hoàn tất — trả phiên khám về trạng thái đang khám</summary>
    [HttpPost("cancel-completion/{examinationId:guid}")]
    [Authorize(Roles = "Admin,DepartmentHead")]
    public async Task<ActionResult<ExamCompletionStatusDto>> CancelCompletion(Guid examinationId)
    {
        var s = await _service.CancelCompletionAsync(examinationId, GetUserId());
        return Ok(s);
    }

    /// <summary>Xóa đăng ký nhập sai (BN chưa vào phòng)</summary>
    [HttpPost("delete-registration")]
    [Authorize(Roles = "Admin,Receptionist,DepartmentHead")]
    public async Task<IActionResult> DeleteRegistration([FromBody] DeleteRegistrationDto dto)
    {
        var ok = await _service.DeleteRegistrationAsync(dto, GetUserId());
        return Ok(new { success = ok });
    }
}
