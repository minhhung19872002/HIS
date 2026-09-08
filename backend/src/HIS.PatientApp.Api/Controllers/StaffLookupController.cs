using HIS.PatientApp.Api.Auth;
using HIS.PatientApp.Api.Connector;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Controllers;

/// <summary>
/// Module tra cứu cho nhân viên chăm sóc khách hàng — HSMT I.3 #2.
///
/// <para>Dùng chung cho <b>cả web quản trị lẫn app trên điện thoại của nhân viên</b>: một bộ API, hai
/// giao diện. Nhân viên chưa được cấp vai trò trong <see cref="StaffAuth.LookupRoles"/> thì không gọi
/// được endpoint nào ở đây, nên màn tra cứu cũng không hiện ra.</para>
///
/// <para><b>Mọi lần tra cứu đều ghi nhật ký.</b> Nhân viên tra hồ sơ người bệnh là việc bình thường
/// hằng ngày, nhưng "bình thường" không có nghĩa là "không cần ghi lại": chính vì nó thường xuyên nên
/// lạm dụng mới dễ chìm đi.</para>
/// </summary>
[ApiController]
[Route("api/v1/staff/lookup")]
[Authorize(Policy = StaffAuth.LookupPolicy)]
[Produces("application/json")]
public class StaffLookupController : ControllerBase
{
    private readonly PatientAppDbContext _db;
    private readonly IHisConnector _his;
    private readonly ILogger<StaffLookupController> _logger;

    public StaffLookupController(
        PatientAppDbContext db, IHisConnector his, ILogger<StaffLookupController> logger)
    {
        _db = db;
        _his = his;
        _logger = logger;
    }

    /// <summary>
    /// Tìm người bệnh theo mã bệnh nhân, số điện thoại hoặc số CCCD.
    ///
    /// Ba đường tra khác nhau vì ba tình huống khác nhau ở quầy: người bệnh đưa thẻ khám (mã), gọi
    /// điện tới (số điện thoại), hoặc chỉ có giấy tờ tuỳ thân (CCCD).
    /// </summary>
    [HttpGet("patients")]
    public async Task<IActionResult> Search([FromQuery] string? keyword, CancellationToken ct)
    {
        var term = keyword?.Trim() ?? "";
        if (term.Length < 3)
            return BadRequest(ApiResponse.Fail("Vui lòng nhập ít nhất 3 ký tự để tra cứu."));

        var found = new List<HisPatient>();

        try
        {
            // Thử lần lượt ba cách. Mã bệnh nhân trước vì đó là cách chính xác nhất và nhanh nhất.
            var byCode = await _his.GetPatientByCodeAsync(term, ct);
            if (byCode is not null) found.Add(byCode);

            if (found.Count == 0)
            {
                var byIdentity = await _his.GetPatientByIdentityAsync(term, ct);
                if (byIdentity is not null) found.Add(byIdentity);
            }

            if (found.Count == 0)
            {
                found.AddRange(await _his.FindPatientsByPhoneAsync(term, ct));
            }
        }
        catch (HisConnectorException ex)
        {
            _logger.LogError(ex, "Không tra cứu được bệnh nhân từ HIS.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiResponse.Fail(
                "Hiện chưa kết nối được tới hệ thống bệnh viện. Vui lòng thử lại sau ít phút.",
                "HIS_UNAVAILABLE"));
        }

        // Gắn thêm trạng thái tài khoản app — câu hỏi hay gặp nhất ở quầy là "sao tôi không đăng
        // nhập được", và câu trả lời thường nằm ở đây.
        var patientIds = found.Select(p => p.Id).ToList();
        var accounts = await _db.Accounts.AsNoTracking()
            .Where(a => a.HisPatientId != null && patientIds.Contains(a.HisPatientId.Value))
            .Select(a => new
            {
                a.Id, a.HisPatientId, a.PhoneNumber, a.Status,
                a.MustChangePassword, a.LastLoginAt,
            })
            .ToListAsync(ct);

        var items = found.Select(p =>
        {
            var account = accounts.FirstOrDefault(a => a.HisPatientId == p.Id);
            return new StaffPatientDto
            {
                PatientId = p.Id,
                PatientCode = p.PatientCode ?? "",
                FullName = p.FullName ?? "",
                DateOfBirth = p.DateOfBirth,
                Gender = p.Gender,
                PhoneNumber = p.PhoneNumber,
                HasAppAccount = account is not null,
                AppAccountId = account?.Id,
                AppAccountStatus = account?.Status,
                AppMustChangePassword = account?.MustChangePassword ?? false,
                AppLastLoginAt = account?.LastLoginAt,
            };
        }).ToList();

        await LogLookupAsync(items.Select(i => i.PatientId), "staff_search_patient", term, ct);

        return Ok(ApiResponse<List<StaffPatientDto>>.Ok(items));
    }

    /// <summary>
    /// Tất cả những gì nhân viên cần để trả lời người bệnh trong một lần gọi: lịch hẹn, kết quả gần
    /// đây, đơn thuốc, và trạng thái tài khoản app.
    ///
    /// Gộp thành một endpoint thay vì bắt giao diện gọi năm lần — nhân viên đang có người bệnh đứng
    /// trước mặt hoặc đang giữ máy, mỗi vòng gọi thừa là một khoảng im lặng khó xử.
    /// </summary>
    [HttpGet("patients/{patientId:guid}/summary")]
    public async Task<IActionResult> Summary(Guid patientId, CancellationToken ct)
    {
        try
        {
            var patient = await _his.GetPatientByIdAsync(patientId, ct);
            if (patient is null) return NotFound(ApiResponse.Fail("Không tìm thấy hồ sơ bệnh nhân."));

            var account = await _db.Accounts.AsNoTracking()
                .FirstOrDefaultAsync(a => a.HisPatientId == patientId, ct);

            var summary = new StaffPatientSummaryDto
            {
                Patient = new StaffPatientDto
                {
                    PatientId = patient.Id,
                    PatientCode = patient.PatientCode ?? "",
                    FullName = patient.FullName ?? "",
                    DateOfBirth = patient.DateOfBirth,
                    Gender = patient.Gender,
                    PhoneNumber = patient.PhoneNumber,
                    HasAppAccount = account is not null,
                    AppAccountId = account?.Id,
                    AppAccountStatus = account?.Status,
                    AppMustChangePassword = account?.MustChangePassword ?? false,
                    AppLastLoginAt = account?.LastLoginAt,
                },
                Appointments = string.IsNullOrWhiteSpace(patient.PhoneNumber)
                    ? new List<HisBookingStatus>()
                    : (await _his.LookupAppointmentsAsync(patient.PhoneNumber, ct)).ToList(),
                LabResults = (await _his.GetLabResultsAsync(patientId, ct: ct)).Take(5).ToList(),
                ImagingResults = (await _his.GetImagingResultsAsync(patientId, ct: ct)).Take(5).ToList(),
                Prescriptions = (await _his.GetPrescriptionsAsync(patientId, false, ct)).Take(5).ToList(),
                Admissions = (await _his.GetAdmissionsAsync(patientId, ct)).Take(5).ToList(),
            };

            if (account is not null)
            {
                summary.QueueTicketsToday = await _db.QueueTickets.AsNoTracking()
                    .Where(t => t.AccountId == account.Id && t.QueueDate == Common.VnClock.Today)
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
            }

            await LogLookupAsync(new[] { patientId }, "staff_view_patient_summary", null, ct);

            return Ok(ApiResponse<StaffPatientSummaryDto>.Ok(summary));
        }
        catch (HisConnectorException ex)
        {
            _logger.LogError(ex, "Không lấy được tóm tắt hồ sơ bệnh nhân.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiResponse.Fail(
                "Hiện chưa kết nối được tới hệ thống bệnh viện. Vui lòng thử lại sau ít phút.",
                "HIS_UNAVAILABLE"));
        }
    }

    /// <summary>
    /// Đặt lại mật khẩu app giúp người bệnh ngay tại quầy (HSMT I.3 #2.2).
    ///
    /// Trả về mật khẩu tạm để nhân viên đọc cho người bệnh, kèm cờ buộc đổi ở lần đăng nhập kế tiếp —
    /// mật khẩu này nhân viên đã biết nên không được phép sống lâu.
    /// </summary>
    [HttpPost("patients/{patientId:guid}/reset-app-password")]
    public async Task<IActionResult> ResetAppPassword(Guid patientId, CancellationToken ct)
    {
        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.HisPatientId == patientId, ct);
        if (account is null)
            return NotFound(ApiResponse.Fail("Người bệnh này chưa có tài khoản app."));

        var temporary = TemporaryPasswords.Generate();

        account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(temporary);
        account.MustChangePassword = true;
        account.PasswordChangedAt = DateTime.UtcNow;
        account.SecurityStamp = Guid.NewGuid().ToString("N");
        account.FailedLoginCount = 0;
        account.LockoutEndAt = null;
        account.UpdatedAt = DateTime.UtcNow;

        _db.AccessAuditLogs.Add(new AccessAuditLog
        {
            ActorAccountId = account.Id,
            ActorHisUserId = User.GetStaffUserId(),
            ActorType = "staff",
            TargetPatientId = patientId,
            Action = "staff_reset_app_password",
            ResourceRef = $"account:{account.Id}",
            Ip = HttpContext.GetClientIp(),
            UserAgent = Request.Headers.UserAgent.ToString(),
        });

        await _db.SaveChangesAsync(ct);

        _logger.LogWarning(
            "Nhân viên {StaffId} đặt lại mật khẩu app cho bệnh nhân {PatientId}.",
            User.GetStaffUserId(), patientId);

        return Ok(ApiResponse<ResetPasswordResultDto>.Ok(
            new ResetPasswordResultDto { TemporaryPassword = temporary },
            "Đã đặt lại mật khẩu. Người bệnh sẽ phải đổi mật khẩu ở lần đăng nhập kế tiếp."));
    }

    /// <summary>Nhật ký truy cập của chính hồ sơ này — để trả lời "ai đã xem hồ sơ của tôi".</summary>
    [HttpGet("patients/{patientId:guid}/access-log")]
    public async Task<IActionResult> AccessLog(Guid patientId, CancellationToken ct)
    {
        var logs = await (from log in _db.AccessAuditLogs.AsNoTracking()
                          where log.TargetPatientId == patientId
                          join account in _db.Accounts.AsNoTracking()
                              on log.ActorAccountId equals account.Id into joined
                          from account in joined.DefaultIfEmpty()
                          orderby log.CreatedAt descending
                          select new AdminAuditLogDto
                          {
                              Id = log.Id,
                              ActorAccountId = log.ActorAccountId,
                              ActorHisUserId = log.ActorHisUserId,
                              ActorName = account == null ? "" : account.FullName,
                              ActorPhone = account == null ? "" : account.PhoneNumber,
                              ActorType = log.ActorType,
                              TargetPatientId = log.TargetPatientId,
                              Action = log.Action,
                              ResourceRef = log.ResourceRef,
                              Ip = log.Ip,
                              CreatedAt = log.CreatedAt,
                          }).Take(100).ToListAsync(ct);

        return Ok(ApiResponse<List<AdminAuditLogDto>>.Ok(logs));
    }

    /// <summary>
    /// Ghi lại việc nhân viên đã tra hồ sơ nào.
    ///
    /// Người thực hiện là nhân viên HIS chứ không phải tài khoản app, nên id nằm ở
    /// <c>ActorHisUserId</c> còn <c>ActorAccountId</c> để trống.
    /// </summary>
    private async Task LogLookupAsync(
        IEnumerable<Guid> patientIds, string action, string? keyword, CancellationToken ct)
    {
        var staffId = User.GetStaffUserId();

        foreach (var patientId in patientIds.Distinct())
        {
            _db.AccessAuditLogs.Add(new AccessAuditLog
            {
                ActorHisUserId = staffId,
                ActorType = "staff",
                TargetPatientId = patientId,
                Action = action,
                ResourceRef = keyword is null ? null : $"keyword:{keyword}",
                Ip = HttpContext.GetClientIp(),
                UserAgent = Request.Headers.UserAgent.ToString(),
            });
        }

        await _db.SaveChangesAsync(ct);
    }
}

public class StaffPatientDto
{
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public string? PhoneNumber { get; set; }

    public bool HasAppAccount { get; set; }
    public Guid? AppAccountId { get; set; }
    public string? AppAccountStatus { get; set; }
    public bool AppMustChangePassword { get; set; }
    public DateTime? AppLastLoginAt { get; set; }
}

public class StaffPatientSummaryDto
{
    public StaffPatientDto Patient { get; set; } = new();
    public List<HisBookingStatus> Appointments { get; set; } = new();
    public List<HisLabResult> LabResults { get; set; } = new();
    public List<HisImagingResult> ImagingResults { get; set; } = new();
    public List<HisPrescription> Prescriptions { get; set; } = new();
    public List<HisAdmission> Admissions { get; set; } = new();
    public List<MyQueueTicketDto> QueueTicketsToday { get; set; } = new();
}
