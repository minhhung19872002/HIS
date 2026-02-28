using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;

namespace HIS.API.Controllers;

/// <summary>
/// Public appointment booking endpoints - Đặt lịch khám trực tuyến (không cần đăng nhập)
/// </summary>
[ApiController]
[Route("api/booking")]
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
