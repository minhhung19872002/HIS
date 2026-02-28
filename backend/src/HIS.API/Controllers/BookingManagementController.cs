using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;

namespace HIS.API.Controllers;

/// <summary>
/// Quản lý đặt lịch phía nhân viên y tế (cần đăng nhập)
/// </summary>
[ApiController]
[Route("api/booking-management")]
[Authorize]
public class BookingManagementController : ControllerBase
{
    private readonly IBookingManagementService _service;

    public BookingManagementController(IBookingManagementService service)
    {
        _service = service;
    }

    // === Doctor Schedule ===

    [HttpGet("schedules")]
    public async Task<IActionResult> GetDoctorSchedules(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] Guid? departmentId,
        [FromQuery] Guid? doctorId)
    {
        var result = await _service.GetDoctorSchedulesAsync(fromDate, toDate, departmentId, doctorId);
        return Ok(result);
    }

    [HttpPost("schedules")]
    public async Task<IActionResult> SaveDoctorSchedule([FromBody] SaveDoctorScheduleDto dto)
    {
        var result = await _service.SaveDoctorScheduleAsync(dto);
        return Ok(result);
    }

    [HttpDelete("schedules/{id}")]
    public async Task<IActionResult> DeleteDoctorSchedule(Guid id)
    {
        await _service.DeleteDoctorScheduleAsync(id);
        return NoContent();
    }

    [HttpPost("schedules/{id}/generate")]
    public async Task<IActionResult> GenerateRecurringSchedules(
        Guid id,
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate)
    {
        await _service.GenerateRecurringSchedulesAsync(id, fromDate, toDate);
        return Ok(new { message = "Đã tạo lịch lặp" });
    }

    // === Booking Management ===

    [HttpGet("bookings")]
    public async Task<IActionResult> GetBookings([FromQuery] BookingSearchDto search)
    {
        var result = await _service.GetBookingsAsync(search);
        return Ok(result);
    }

    [HttpPut("bookings/{code}/confirm")]
    public async Task<IActionResult> ConfirmBooking(string code)
    {
        var result = await _service.ConfirmBookingAsync(code);
        return Ok(result);
    }

    [HttpPut("bookings/{code}/checkin")]
    public async Task<IActionResult> CheckInBooking(string code)
    {
        var result = await _service.CheckInBookingAsync(code);
        return Ok(result);
    }

    [HttpPut("bookings/{code}/no-show")]
    public async Task<IActionResult> MarkNoShow(string code)
    {
        var result = await _service.MarkNoShowAsync(code);
        return Ok(result);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetBookingStats([FromQuery] DateTime? date)
    {
        var result = await _service.GetBookingStatsAsync(date);
        return Ok(result);
    }

    [HttpPost("bookings/{code}/reception-checkin")]
    public async Task<IActionResult> CheckinFromBooking(string code)
    {
        var result = await _service.CheckinFromBookingAsync(code);
        return Ok(result);
    }
}
