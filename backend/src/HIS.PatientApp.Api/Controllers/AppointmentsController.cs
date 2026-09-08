using HIS.PatientApp.Api.Connector;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using HIS.PatientApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Controllers;

/// <summary>
/// Đặt khám online — HSMT I.2 #4.
///
/// Số điện thoại dùng để đặt/huỷ/đổi lịch luôn lấy từ tài khoản đang đăng nhập, KHÔNG nhận từ body.
/// HIS xác thực chủ lịch hẹn bằng chính số đó, nên nhận từ body là mở đường huỷ lịch của người khác.
/// </summary>
[ApiController]
[Route("api/v1/patient/appointments")]
[Authorize]
[Produces("application/json")]
public class AppointmentsController : ControllerBase
{
    private readonly IHisConnector _his;
    private readonly PatientAppDbContext _db;
    private readonly NotificationService _notifications;
    private readonly ILogger<AppointmentsController> _logger;

    public AppointmentsController(
        IHisConnector his,
        PatientAppDbContext db,
        NotificationService notifications,
        ILogger<AppointmentsController> logger)
    {
        _his = his;
        _db = db;
        _notifications = notifications;
        _logger = logger;
    }

    [HttpGet("departments")]
    public async Task<IActionResult> Departments(CancellationToken ct)
        => await Guarded(async () =>
            Ok(ApiResponse<IReadOnlyList<HisDepartment>>.Ok(await _his.GetDepartmentsAsync(ct))));

    [HttpGet("doctors")]
    public async Task<IActionResult> Doctors([FromQuery] Guid? departmentId, CancellationToken ct)
        => await Guarded(async () =>
            Ok(ApiResponse<IReadOnlyList<HisDoctor>>.Ok(await _his.GetDoctorsAsync(departmentId, ct))));

    /// <summary>
    /// Khung giờ còn trống. Đọc từ lịch trực thật của bác sĩ, nên ngày bác sĩ không trực sẽ không có
    /// khung nào — người bệnh không đặt nhầm rồi đến nơi mới biết.
    /// </summary>
    [HttpGet("slots")]
    public async Task<IActionResult> Slots(
        [FromQuery] DateTime date, [FromQuery] Guid? departmentId, [FromQuery] Guid? doctorId,
        CancellationToken ct)
    {
        if (date.Date < DateTime.Today)
            return BadRequest(ApiResponse.Fail("Không xem được lịch của ngày đã qua."));

        return await Guarded(async () =>
            Ok(ApiResponse<HisSlotResult>.Ok(await _his.GetSlotsAsync(date, departmentId, doctorId, ct))));
    }

    [HttpGet]
    public async Task<IActionResult> MyAppointments(CancellationToken ct)
    {
        var account = await CurrentAccountAsync(ct);
        if (account is null) return NotFound(ApiResponse.Fail("Không tìm thấy tài khoản."));

        return await Guarded(async () =>
            Ok(ApiResponse<IReadOnlyList<HisBookingStatus>>.Ok(
                await _his.LookupAppointmentsAsync(account.PhoneNumber, ct))));
    }

    [HttpPost]
    public async Task<IActionResult> Book([FromBody] BookAppointmentDto dto, CancellationToken ct)
    {
        var account = await CurrentAccountAsync(ct);
        if (account is null) return NotFound(ApiResponse.Fail("Không tìm thấy tài khoản."));

        if (dto.AppointmentDate.Date < DateTime.Today)
            return BadRequest(ApiResponse.Fail("Ngày khám không hợp lệ."));

        return await Guarded(async () =>
        {
            var result = await _his.BookAppointmentAsync(new
            {
                patientName = account.FullName,
                phoneNumber = account.PhoneNumber,
                appointmentDate = dto.AppointmentDate,
                appointmentTime = dto.AppointmentTime,
                departmentId = dto.DepartmentId,
                doctorId = dto.DoctorId,
                appointmentType = dto.AppointmentType <= 0 ? 2 : dto.AppointmentType,
                reason = dto.Reason,
            }, ct);

            if (!result.Success)
                return BadRequest(ApiResponse.Fail(result.Message ?? "Không đặt được lịch khám."));

            await NotifyAsync(account.Id, "Đã đặt lịch khám",
                BuildAppointmentSummary(result.AppointmentDate, result.AppointmentTime,
                    result.DepartmentName, result.DoctorName, result.RoomName),
                result.AppointmentCode, ct);

            return Ok(ApiResponse<HisBookingResult>.Ok(result, result.Message));
        });
    }

    [HttpPut("{appointmentCode}/cancel")]
    public async Task<IActionResult> Cancel(
        string appointmentCode, [FromBody] CancelAppointmentDto dto, CancellationToken ct)
    {
        var account = await CurrentAccountAsync(ct);
        if (account is null) return NotFound(ApiResponse.Fail("Không tìm thấy tài khoản."));

        return await Guarded(async () =>
        {
            var result = await _his.CancelAppointmentAsync(
                appointmentCode, account.PhoneNumber, dto.Reason, ct);

            await NotifyAsync(account.Id, "Đã huỷ lịch khám",
                $"Lịch hẹn {appointmentCode} ngày {result.AppointmentDate:dd/MM/yyyy} đã được huỷ.",
                appointmentCode, ct);

            return Ok(ApiResponse<HisBookingStatus>.Ok(result, "Đã huỷ lịch khám."));
        });
    }

    [HttpPut("{appointmentCode}/reschedule")]
    public async Task<IActionResult> Reschedule(
        string appointmentCode, [FromBody] RescheduleAppointmentDto dto, CancellationToken ct)
    {
        var account = await CurrentAccountAsync(ct);
        if (account is null) return NotFound(ApiResponse.Fail("Không tìm thấy tài khoản."));

        if (dto.NewAppointmentDate.Date < DateTime.Today)
            return BadRequest(ApiResponse.Fail("Ngày khám mới không hợp lệ."));

        return await Guarded(async () =>
        {
            var result = await _his.RescheduleAppointmentAsync(
                appointmentCode, account.PhoneNumber, dto.NewAppointmentDate,
                dto.NewAppointmentTime, dto.NewDoctorId, dto.Reason, ct);

            await NotifyAsync(account.Id, "Đã đổi lịch khám",
                BuildAppointmentSummary(result.AppointmentDate, result.AppointmentTime,
                    result.DepartmentName, result.DoctorName, result.RoomName),
                appointmentCode, ct);

            return Ok(ApiResponse<HisBookingStatus>.Ok(result, "Đã đổi lịch khám."));
        });
    }

    private static string BuildAppointmentSummary(
        DateTime date, TimeSpan? time, string? department, string? doctor, string? room)
    {
        var parts = new List<string> { $"Ngày {date:dd/MM/yyyy}" };
        if (time.HasValue) parts.Add($"lúc {time:hh\\:mm}");
        if (!string.IsNullOrWhiteSpace(department)) parts.Add(department!);
        if (!string.IsNullOrWhiteSpace(doctor)) parts.Add($"BS {doctor}");
        if (!string.IsNullOrWhiteSpace(room)) parts.Add($"phòng {room}");
        return string.Join(" · ", parts);
    }

    private async Task NotifyAsync(
        Guid accountId, string title, string body, string? code, CancellationToken ct)
    {
        try
        {
            await _notifications.CreateAsync(accountId, title, body,
                NotificationCategory.Appointment,
                deepLink: "/appointments",
                data: code is null ? null : new { appointmentCode = code },
                ct: ct);
        }
        catch (Exception ex)
        {
            // Đặt lịch đã thành công rồi; không để lỗi ghi thông báo làm hỏng phản hồi.
            _logger.LogError(ex, "Không ghi được thông báo lịch hẹn cho tài khoản {AccountId}.", accountId);
        }
    }

    private Task<AccountSnapshot?> CurrentAccountAsync(CancellationToken ct) =>
        _db.Accounts
            .Where(a => a.Id == User.GetAccountId())
            .Select(a => new AccountSnapshot(a.Id, a.PhoneNumber, a.FullName, a.HisPatientId))
            .FirstOrDefaultAsync(ct);

    /// <summary>Bọc lỗi connector thành 503 có thông điệp đọc được, thay vì để 500 trần.</summary>
    private async Task<IActionResult> Guarded(Func<Task<IActionResult>> action)
    {
        try
        {
            return await action();
        }
        catch (HisConnectorException ex)
        {
            _logger.LogError(ex, "Lỗi khi gọi HIS cho nghiệp vụ đặt khám.");

            if (ex.StatusCode == StatusCodes.Status404NotFound)
                return NotFound(ApiResponse.Fail("Không tìm thấy lịch hẹn."));
            if (ex.StatusCode == StatusCodes.Status400BadRequest)
                return BadRequest(ApiResponse.Fail(
                    "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại ngày giờ và thử lại."));

            return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiResponse.Fail(
                "Hiện chưa kết nối được tới hệ thống bệnh viện. Vui lòng thử lại sau ít phút.",
                "HIS_UNAVAILABLE"));
        }
    }

    private record AccountSnapshot(Guid Id, string PhoneNumber, string FullName, Guid? HisPatientId);
}

public class BookAppointmentDto
{
    public DateTime AppointmentDate { get; set; }
    public TimeSpan? AppointmentTime { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? DoctorId { get; set; }

    /// <summary>1 Tái khám · 2 Khám mới · 3 Khám sức khoẻ. Mặc định 2.</summary>
    public int AppointmentType { get; set; } = 2;

    public string? Reason { get; set; }
}

public class CancelAppointmentDto
{
    public string? Reason { get; set; }
}

public class RescheduleAppointmentDto
{
    public DateTime NewAppointmentDate { get; set; }
    public TimeSpan? NewAppointmentTime { get; set; }
    public Guid? NewDoctorId { get; set; }
    public string? Reason { get; set; }
}
