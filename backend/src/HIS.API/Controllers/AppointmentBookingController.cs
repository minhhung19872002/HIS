using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;

namespace HIS.API.Controllers;

/// <summary>
/// Public appointment booking endpoints - Đặt lịch khám trực tuyến (không cần đăng nhập)
/// </summary>
[ApiController]
[Route("api/booking")]
[TypeFilter(typeof(Filters.DomainExceptionFilter))] // #219/T4: guard nghiep vu ra 400/404 kem ly do, khong phai 500 tran
[AllowAnonymous]
public class AppointmentBookingController : ControllerBase
{
    private readonly IAppointmentBookingService _bookingService;

    public AppointmentBookingController(IAppointmentBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    /// <summary>
    /// Lấy danh sách khoa khám bệnh
    /// </summary>
    [HttpGet("departments")]
    public async Task<ActionResult<List<BookingDepartmentDto>>> GetDepartments()
    {
        var result = await _bookingService.GetBookingDepartmentsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách bác sĩ theo khoa
    /// </summary>
    [HttpGet("doctors")]
    public async Task<ActionResult<List<BookingDoctorDto>>> GetDoctors([FromQuery] Guid? departmentId)
    {
        var result = await _bookingService.GetBookingDoctorsAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách khung giờ trống của bác sĩ/khoa trong ngày
    /// </summary>
    [HttpGet("slots")]
    public async Task<ActionResult<BookingSlotResult>> GetAvailableSlots(
        [FromQuery] DateTime date,
        [FromQuery] Guid? departmentId,
        [FromQuery] Guid? doctorId)
    {
        var result = await _bookingService.GetAvailableSlotsAsync(date, departmentId, doctorId);
        return Ok(result);
    }

    /// <summary>
    /// Đặt lịch khám trực tuyến
    /// </summary>
    [HttpPost("book")]
    public async Task<ActionResult<BookingResultDto>> BookAppointment([FromBody] OnlineBookingDto dto)
    {
        // Lấy IP server-side — KHÔNG tin bất kỳ header nào từ client body
        // X-Forwarded-For không dùng vì có thể bị spoofed; dùng RemoteIpAddress của TCP connection
        dto.ClientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _bookingService.BookAppointmentAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Tra cứu lịch hẹn theo mã hoặc SĐT
    /// </summary>
    [HttpGet("lookup")]
    public async Task<ActionResult<List<BookingStatusDto>>> LookupAppointment(
        [FromQuery] string? code,
        [FromQuery] string? phone)
    {
        var result = await _bookingService.LookupAppointmentsAsync(code, phone);
        return Ok(result);
    }

    /// <summary>
    /// Hủy lịch hẹn
    /// </summary>
    /// <summary>
    /// Người bệnh tự đổi ngày/giờ lịch hẹn (HSMT app mobile I.2 #4).
    ///
    /// Trước đây chỉ có huỷ rồi đặt lại, mà đặt lại đụng bộ đếm chống lạm dụng nên đổi lịch hai lần
    /// trong ngày là bị chặn. Xác thực bằng số điện thoại giống luồng huỷ.
    /// </summary>
    [HttpPut("{appointmentCode}/reschedule")]
    public async Task<ActionResult<BookingStatusDto>> Reschedule(
        string appointmentCode, [FromBody] RescheduleBookingDto dto)
    {
        try
        {
            return Ok(await _bookingService.RescheduleAppointmentAsync(appointmentCode, dto));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{appointmentCode}/cancel")]
    public async Task<ActionResult<BookingStatusDto>> CancelAppointment(
        string appointmentCode,
        [FromBody] CancelBookingDto dto)
    {
        var result = await _bookingService.CancelAppointmentAsync(appointmentCode, dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách dịch vụ khám
    /// </summary>
    [HttpGet("services")]
    public async Task<ActionResult<List<BookingServiceDto>>> GetServices([FromQuery] Guid? departmentId)
    {
        var result = await _bookingService.GetBookingServicesAsync(departmentId);
        return Ok(result);
    }
}
