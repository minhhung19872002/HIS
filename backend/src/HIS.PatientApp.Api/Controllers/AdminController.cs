using HIS.PatientApp.Api.Auth;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using HIS.PatientApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Controllers;

/// <summary>
/// Web quản trị app bệnh nhân — HSMT I.3 #1.
///
/// <para>Xác thực bằng <b>token của HIS Core</b> (lược đồ <see cref="StaffAuth.Scheme"/>): nhân viên
/// đã đăng nhập HIS thì dùng luôn danh tính đó. Token của người bệnh <b>không</b> mở được các endpoint
/// này vì hai lược đồ ký bằng hai khoá khác nhau.</para>
///
/// <para>Đây là nơi có những quyền lớn nhất trong hệ thống: khoá tài khoản, đặt lại mật khẩu, gỡ liên
/// kết gia đình, gửi thông báo cho toàn bộ người dùng. Mọi thao tác đổi trạng thái đều ghi nhật ký
/// kèm id nhân viên thực hiện.</para>
/// </summary>
[ApiController]
[Route("api/v1/admin/patient-app")]
[Authorize(Policy = StaffAuth.AdminPolicy)]
[Produces("application/json")]
public class AdminController : ControllerBase
{
    private readonly PatientAppDbContext _db;
    private readonly NotificationService _notifications;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        PatientAppDbContext db, NotificationService notifications, ILogger<AdminController> logger)
    {
        _db = db;
        _notifications = notifications;
        _logger = logger;
    }

    // ============================================================ dashboard

    /// <summary>Thống kê cơ bản của app (HSMT I.3 #1.2).</summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard([FromQuery] int days, CancellationToken ct)
    {
        var window = days is > 0 and <= 365 ? days : 30;
        var since = DateTime.UtcNow.AddDays(-window);

        var accounts = _db.Accounts.AsNoTracking();

        var dashboard = new AdminDashboardDto
        {
            WindowDays = window,
            TotalAccounts = await accounts.CountAsync(ct),
            LinkedAccounts = await accounts.CountAsync(a => a.HisPatientId != null, ct),
            LockedAccounts = await accounts.CountAsync(a => a.Status != AppAccountStatus.Active, ct),
            NewAccounts = await accounts.CountAsync(a => a.CreatedAt >= since, ct),
            ActiveAccounts = await accounts.CountAsync(a => a.LastLoginAt >= since, ct),

            Devices = await _db.Devices.CountAsync(d => d.RevokedAt == null, ct),
            DevicesWithPush = await _db.Devices
                .CountAsync(d => d.RevokedAt == null && d.PushToken != null, ct),

            QueueTicketsTaken = await _db.QueueTickets.CountAsync(t => t.CreatedAt >= since, ct),
            AppointmentsBooked = await _db.AppointmentReminders.CountAsync(a => a.CreatedAt >= since, ct),

            NotificationsSent = await _db.Notifications.CountAsync(n => n.CreatedAt >= since, ct),
            NotificationsRead = await _db.Notifications
                .CountAsync(n => n.CreatedAt >= since && n.IsRead, ct),

            FamilyLinks = await _db.FamilyLinks
                .CountAsync(l => l.Status == AppFamilyLinkStatus.Verified, ct),
            DocumentsStored = await _db.Documents.CountAsync(ct),

            // Đăng ký theo ngày, để web vẽ biểu đồ. Nhóm tại CSDL chứ không kéo hết về rồi đếm.
            RegistrationsByDay = await accounts
                .Where(a => a.CreatedAt >= since)
                .GroupBy(a => a.CreatedAt.Date)
                .Select(g => new DailyCountDto { Date = g.Key, Count = g.Count() })
                .OrderBy(x => x.Date)
                .ToListAsync(ct),
        };

        return Ok(ApiResponse<AdminDashboardDto>.Ok(dashboard));
    }

    // ============================================================= tài khoản

    /// <summary>Danh sách tài khoản app, tìm theo số điện thoại, tên hoặc mã bệnh nhân.</summary>
    [HttpGet("accounts")]
    public async Task<IActionResult> Accounts(
        [FromQuery] string? keyword, [FromQuery] string? status,
        [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct)
    {
        var size = pageSize is > 0 and <= 100 ? pageSize : 20;
        var skip = (page > 0 ? page - 1 : 0) * size;

        var query = _db.Accounts.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var term = keyword.Trim();
            query = query.Where(a =>
                a.PhoneNumber.Contains(term)
                || a.FullName.Contains(term)
                || (a.HisPatientCode != null && a.HisPatientCode.Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(a => a.Status == status);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip(skip).Take(size)
            .Select(a => new AdminAccountDto
            {
                Id = a.Id,
                PhoneNumber = a.PhoneNumber,
                FullName = a.FullName,
                HisPatientId = a.HisPatientId,
                HisPatientCode = a.HisPatientCode,
                Status = a.Status,
                MustChangePassword = a.MustChangePassword,
                HasPin = a.PinHash != null,
                CreatedAt = a.CreatedAt,
                LastLoginAt = a.LastLoginAt,
                DeviceCount = a.Devices.Count(d => d.RevokedAt == null),
            })
            .ToListAsync(ct);

        return Ok(ApiResponse<PagedDto<AdminAccountDto>>.Ok(new PagedDto<AdminAccountDto>
        {
            Items = items,
            Total = total,
            Page = page > 0 ? page : 1,
            PageSize = size,
        }));
    }

    /// <summary>
    /// Khoá hoặc mở khoá tài khoản. Khoá có hiệu lực <b>ngay</b>: mỗi request của app đều đối chiếu
    /// trạng thái tài khoản, không đợi token cũ hết hạn.
    /// </summary>
    [HttpPut("accounts/{accountId:guid}/status")]
    public async Task<IActionResult> SetStatus(
        Guid accountId, [FromBody] SetAccountStatusDto dto, CancellationToken ct)
    {
        if (dto.Status != AppAccountStatus.Active
            && dto.Status != AppAccountStatus.Suspended
            && dto.Status != AppAccountStatus.Locked)
            return BadRequest(ApiResponse.Fail("Trạng thái không hợp lệ."));

        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, ct);
        if (account is null) return NotFound(ApiResponse.Fail("Không tìm thấy tài khoản."));

        account.Status = dto.Status;

        // Xoay con dấu để mọi phiên đang mở chết ngay. Chỉ đổi cột Status là chưa đủ — token cũ vẫn
        // hợp lệ cho tới khi hết hạn nếu không có bước này.
        account.SecurityStamp = Guid.NewGuid().ToString("N");
        account.UpdatedAt = DateTime.UtcNow;

        LogStaffAction(account, dto.Status == AppAccountStatus.Active ? "admin_unlock" : "admin_lock",
            dto.Reason);
        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse.Ok(dto.Status == AppAccountStatus.Active
            ? "Đã mở khoá tài khoản."
            : "Đã khoá tài khoản. Mọi thiết bị đang đăng nhập bị đăng xuất ngay."));
    }

    /// <summary>
    /// Đặt lại mật khẩu. Trả về mật khẩu tạm để nhân viên đọc cho người bệnh, và bật cờ buộc đổi mật
    /// khẩu — mật khẩu này người khác đã biết nên không được phép dùng lâu.
    /// </summary>
    [HttpPost("accounts/{accountId:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid accountId, CancellationToken ct)
    {
        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, ct);
        if (account is null) return NotFound(ApiResponse.Fail("Không tìm thấy tài khoản."));

        var temporary = TemporaryPasswords.Generate();

        account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(temporary);
        account.MustChangePassword = true;
        account.PasswordChangedAt = DateTime.UtcNow;
        account.SecurityStamp = Guid.NewGuid().ToString("N");
        account.FailedLoginCount = 0;
        account.LockoutEndAt = null;
        account.UpdatedAt = DateTime.UtcNow;

        LogStaffAction(account, "admin_reset_password", null);
        await _db.SaveChangesAsync(ct);

        _logger.LogWarning(
            "Nhân viên {StaffId} đặt lại mật khẩu tài khoản {AccountId}.",
            User.GetStaffUserId(), accountId);

        return Ok(ApiResponse<ResetPasswordResultDto>.Ok(
            new ResetPasswordResultDto { TemporaryPassword = temporary },
            "Đã đặt lại mật khẩu. Người bệnh sẽ phải đổi mật khẩu ở lần đăng nhập kế tiếp."));
    }

    // ============================================================= gia đình

    /// <summary>Liên kết gia đình, để quản trị viên soát lại ai đang xem hồ sơ của ai (HSMT I.3 #1.5).</summary>
    [HttpGet("family-links")]
    public async Task<IActionResult> FamilyLinks(
        [FromQuery] string? keyword, [FromQuery] int page, [FromQuery] int pageSize,
        CancellationToken ct)
    {
        var size = pageSize is > 0 and <= 100 ? pageSize : 20;
        var skip = (page > 0 ? page - 1 : 0) * size;

        var query = from link in _db.FamilyLinks.AsNoTracking()
                    join owner in _db.Accounts.AsNoTracking() on link.OwnerAccountId equals owner.Id
                    select new AdminFamilyLinkDto
                    {
                        Id = link.Id,
                        OwnerAccountId = owner.Id,
                        OwnerName = owner.FullName,
                        OwnerPhone = owner.PhoneNumber,
                        MemberName = link.MemberName,
                        MemberPatientCode = link.MemberPatientCode,
                        Relationship = link.Relationship,
                        Status = link.Status,
                        VerificationMethod = link.VerificationMethod,
                        VerifiedAt = link.VerifiedAt,
                        CanViewResults = link.CanViewResults,
                    };

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var term = keyword.Trim();
            query = query.Where(x =>
                x.OwnerName.Contains(term) || x.OwnerPhone.Contains(term)
                || x.MemberName.Contains(term) || x.MemberPatientCode.Contains(term));
        }

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(x => x.VerifiedAt).Skip(skip).Take(size)
            .ToListAsync(ct);

        return Ok(ApiResponse<PagedDto<AdminFamilyLinkDto>>.Ok(new PagedDto<AdminFamilyLinkDto>
        {
            Items = items,
            Total = total,
            Page = page > 0 ? page : 1,
            PageSize = size,
        }));
    }

    /// <summary>Gỡ một liên kết gia đình. Có hiệu lực ngay ở lần gọi API kế tiếp của app.</summary>
    [HttpDelete("family-links/{linkId:guid}")]
    public async Task<IActionResult> RevokeFamilyLink(
        Guid linkId, [FromQuery] string? reason, CancellationToken ct)
    {
        var link = await _db.FamilyLinks.FirstOrDefaultAsync(l => l.Id == linkId, ct);
        if (link is null) return NotFound(ApiResponse.Fail("Không tìm thấy liên kết."));

        link.Status = AppFamilyLinkStatus.Revoked;
        link.RevokedAt = DateTime.UtcNow;

        _db.AccessAuditLogs.Add(new AccessAuditLog
        {
            ActorAccountId = link.OwnerAccountId,
            ActorHisUserId = User.GetStaffUserId(),
            ActorType = "staff",
            TargetPatientId = link.MemberPatientId,
            Action = "admin_revoke_family_link",
            ResourceRef = $"family_link:{linkId}{(reason is null ? "" : $":{reason}")}",
            Ip = HttpContext.GetClientIp(),
            UserAgent = Request.Headers.UserAgent.ToString(),
        });

        await _db.SaveChangesAsync(ct);
        return Ok(ApiResponse.Ok("Đã gỡ liên kết."));
    }

    // ========================================================= nhật ký truy cập

    /// <summary>
    /// "Ai đã xem hồ sơ của ai, lúc nào" (GAP 42). Đây là câu hỏi đầu tiên của mọi cuộc thanh tra.
    /// </summary>
    [HttpGet("audit-logs")]
    public async Task<IActionResult> AuditLogs(
        [FromQuery] Guid? patientId, [FromQuery] Guid? accountId, [FromQuery] string? action,
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct)
    {
        var size = pageSize is > 0 and <= 200 ? pageSize : 50;
        var skip = (page > 0 ? page - 1 : 0) * size;

        var query = _db.AccessAuditLogs.AsNoTracking().AsQueryable();

        if (patientId.HasValue) query = query.Where(l => l.TargetPatientId == patientId);
        if (accountId.HasValue) query = query.Where(l => l.ActorAccountId == accountId);
        if (!string.IsNullOrWhiteSpace(action)) query = query.Where(l => l.Action == action);
        if (fromDate.HasValue) query = query.Where(l => l.CreatedAt >= fromDate);
        if (toDate.HasValue) query = query.Where(l => l.CreatedAt <= toDate);

        var total = await query.CountAsync(ct);

        var items = await (from log in query
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
                           })
            .Skip(skip).Take(size).ToListAsync(ct);

        return Ok(ApiResponse<PagedDto<AdminAuditLogDto>>.Ok(new PagedDto<AdminAuditLogDto>
        {
            Items = items,
            Total = total,
            Page = page > 0 ? page : 1,
            PageSize = size,
        }));
    }

    // ============================================================ thông báo

    [HttpGet("campaigns")]
    public async Task<IActionResult> Campaigns(
        [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct)
    {
        var size = pageSize is > 0 and <= 100 ? pageSize : 20;
        var skip = (page > 0 ? page - 1 : 0) * size;

        var query = _db.NotificationCampaigns.AsNoTracking();
        var total = await query.CountAsync(ct);

        var campaigns = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip(skip).Take(size)
            .ToListAsync(ct);

        var ids = campaigns.Select(c => c.Id).ToList();

        // Số đã đọc đếm một lượt cho cả trang, thay vì một truy vấn cho mỗi chiến dịch.
        var readCounts = await _db.Notifications.AsNoTracking()
            .Where(n => n.CampaignId != null && ids.Contains(n.CampaignId.Value) && n.IsRead)
            .GroupBy(n => n.CampaignId!.Value)
            .Select(g => new { CampaignId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var items = campaigns.Select(c => new AdminCampaignDto
        {
            Id = c.Id,
            Title = c.Title,
            Body = c.Body,
            Category = c.Category,
            DeepLink = c.DeepLink,
            Audience = c.Audience,
            AudienceName = CampaignAudience.Describe(c.Audience),
            ScheduledAt = c.ScheduledAt,
            Status = c.Status,
            RecipientCount = c.RecipientCount,
            ReadCount = readCounts.FirstOrDefault(r => r.CampaignId == c.Id)?.Count ?? 0,
            SentAt = c.SentAt,
            FailureReason = c.FailureReason,
            CreatedByName = c.CreatedByName,
            CreatedAt = c.CreatedAt,
        }).ToList();

        return Ok(ApiResponse<PagedDto<AdminCampaignDto>>.Ok(new PagedDto<AdminCampaignDto>
        {
            Items = items,
            Total = total,
            Page = page > 0 ? page : 1,
            PageSize = size,
        }));
    }

    /// <summary>
    /// Soạn một đợt gửi thông báo. Không hẹn giờ thì gửi ngay; có hẹn giờ thì worker gửi khi tới hạn.
    /// </summary>
    [HttpPost("campaigns")]
    public async Task<IActionResult> CreateCampaign(
        [FromBody] CreateCampaignDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Body))
            return BadRequest(ApiResponse.Fail("Vui lòng nhập tiêu đề và nội dung thông báo."));

        if (!CampaignAudience.IsValid(dto.Audience))
            return BadRequest(ApiResponse.Fail("Đối tượng nhận không hợp lệ."));

        if (dto.Audience == CampaignAudience.Selected && (dto.AccountIds?.Count ?? 0) == 0)
            return BadRequest(ApiResponse.Fail("Vui lòng chọn ít nhất một tài khoản nhận."));

        if (dto.ScheduledAt.HasValue && dto.ScheduledAt.Value <= DateTime.UtcNow)
            return BadRequest(ApiResponse.Fail("Thời điểm hẹn gửi phải ở tương lai."));

        var campaign = new NotificationCampaign
        {
            Title = dto.Title.Trim(),
            Body = dto.Body.Trim(),
            Category = string.IsNullOrWhiteSpace(dto.Category) ? NotificationCategory.Hospital : dto.Category,
            DeepLink = dto.DeepLink,
            Audience = dto.Audience,
            TargetAccountIdsJson = dto.Audience == CampaignAudience.Selected
                ? System.Text.Json.JsonSerializer.Serialize(dto.AccountIds)
                : null,
            ScheduledAt = dto.ScheduledAt,
            Status = dto.ScheduledAt.HasValue ? CampaignStatus.Scheduled : CampaignStatus.Draft,
            CreatedByUserId = User.GetStaffUserId(),
            CreatedByName = User.GetStaffName(),
        };

        _db.NotificationCampaigns.Add(campaign);
        await _db.SaveChangesAsync(ct);

        if (campaign.ScheduledAt.HasValue)
        {
            return Ok(ApiResponse<AdminCampaignDto>.Ok(
                Describe(campaign, 0),
                $"Đã hẹn gửi lúc {campaign.ScheduledAt:HH:mm dd/MM/yyyy} (giờ UTC)."));
        }

        var sent = await CampaignSender.SendAsync(_db, _notifications, campaign, _logger, ct);

        return Ok(ApiResponse<AdminCampaignDto>.Ok(
            Describe(campaign, 0), $"Đã gửi tới {sent} người dùng."));
    }

    /// <summary>Huỷ một chiến dịch đã hẹn giờ nhưng chưa gửi.</summary>
    [HttpDelete("campaigns/{campaignId:guid}")]
    public async Task<IActionResult> CancelCampaign(Guid campaignId, CancellationToken ct)
    {
        var campaign = await _db.NotificationCampaigns
            .FirstOrDefaultAsync(c => c.Id == campaignId, ct);

        if (campaign is null) return NotFound(ApiResponse.Fail("Không tìm thấy chiến dịch."));

        if (campaign.Status == CampaignStatus.Sent)
            return BadRequest(ApiResponse.Fail(
                "Chiến dịch đã gửi, không thu hồi được. Thông báo đã nằm trong hộp thư người dùng."));

        campaign.Status = CampaignStatus.Cancelled;
        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse.Ok("Đã huỷ chiến dịch."));
    }

    // -------------------------------------------------------------- nội bộ

    private static AdminCampaignDto Describe(NotificationCampaign c, int readCount) => new()
    {
        Id = c.Id,
        Title = c.Title,
        Body = c.Body,
        Category = c.Category,
        DeepLink = c.DeepLink,
        Audience = c.Audience,
        AudienceName = CampaignAudience.Describe(c.Audience),
        ScheduledAt = c.ScheduledAt,
        Status = c.Status,
        RecipientCount = c.RecipientCount,
        ReadCount = readCount,
        SentAt = c.SentAt,
        FailureReason = c.FailureReason,
        CreatedByName = c.CreatedByName,
        CreatedAt = c.CreatedAt,
    };

    /// <summary>
    /// Ghi lại thao tác của nhân viên lên tài khoản người bệnh.
    ///
    /// Tài khoản chưa liên kết hồ sơ thì không có <c>TargetPatientId</c> để ghi — bỏ qua chứ không
    /// ném, vì việc khoá tài khoản vẫn phải chạy được.
    /// </summary>
    private void LogStaffAction(AppAccount account, string action, string? reason)
    {
        if (account.HisPatientId is null) return;

        _db.AccessAuditLogs.Add(new AccessAuditLog
        {
            ActorAccountId = account.Id,
            ActorHisUserId = User.GetStaffUserId(),
            ActorType = "staff",
            TargetPatientId = account.HisPatientId.Value,
            Action = action,
            ResourceRef = $"account:{account.Id}{(reason is null ? "" : $":{reason}")}",
            Ip = HttpContext.GetClientIp(),
            UserAgent = Request.Headers.UserAgent.ToString(),
        });
    }
}

/// <summary>Mật khẩu tạm do quầy cấp: dễ đọc qua điện thoại, và bắt buộc đổi ngay lần đăng nhập sau.</summary>
public static class TemporaryPasswords
{
    // Bỏ các ký tự dễ nghe nhầm khi đọc qua điện thoại: 0/O, 1/l/I.
    private const string Letters = "ABCDEFGHJKMNPQRSTUVWXYZ";
    private const string Digits = "23456789";

    public static string Generate()
    {
        var random = System.Security.Cryptography.RandomNumberGenerator.Create();

        string Pick(string alphabet, int count) => string.Concat(
            Enumerable.Range(0, count).Select(_ =>
                alphabet[System.Security.Cryptography.RandomNumberGenerator.GetInt32(alphabet.Length)]));

        random.Dispose();

        // Đủ mạnh cho một mật khẩu sống vài phút, mà vẫn đọc được qua điện thoại.
        return Pick(Letters, 3) + Pick(Digits, 4) + "@";
    }
}

// ------------------------------------------------------------------- DTO

public class PagedDto<T>
{
    public List<T> Items { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class DailyCountDto
{
    public DateTime Date { get; set; }
    public int Count { get; set; }
}

public class AdminDashboardDto
{
    public int WindowDays { get; set; }
    public int TotalAccounts { get; set; }
    public int LinkedAccounts { get; set; }
    public int LockedAccounts { get; set; }
    public int NewAccounts { get; set; }
    public int ActiveAccounts { get; set; }
    public int Devices { get; set; }
    public int DevicesWithPush { get; set; }
    public int QueueTicketsTaken { get; set; }
    public int AppointmentsBooked { get; set; }
    public int NotificationsSent { get; set; }
    public int NotificationsRead { get; set; }
    public int FamilyLinks { get; set; }
    public int DocumentsStored { get; set; }
    public List<DailyCountDto> RegistrationsByDay { get; set; } = new();
}

public class AdminAccountDto
{
    public Guid Id { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public Guid? HisPatientId { get; set; }
    public string? HisPatientCode { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool MustChangePassword { get; set; }
    public bool HasPin { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public int DeviceCount { get; set; }
}

public class SetAccountStatusDto
{
    public string Status { get; set; } = string.Empty;
    public string? Reason { get; set; }
}

public class ResetPasswordResultDto
{
    public string TemporaryPassword { get; set; } = string.Empty;
}

public class AdminFamilyLinkDto
{
    public Guid Id { get; set; }
    public Guid OwnerAccountId { get; set; }
    public string OwnerName { get; set; } = string.Empty;
    public string OwnerPhone { get; set; } = string.Empty;
    public string MemberName { get; set; } = string.Empty;
    public string MemberPatientCode { get; set; } = string.Empty;
    public string Relationship { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? VerificationMethod { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public bool CanViewResults { get; set; }
}

public class AdminAuditLogDto
{
    public long Id { get; set; }

    /// <summary>Tài khoản app đã xem. Rỗng khi hành động do nhân viên thực hiện.</summary>
    public Guid? ActorAccountId { get; set; }

    /// <summary>Id nhân viên HIS, khi người xem là nhân viên.</summary>
    public Guid? ActorHisUserId { get; set; }
    public string ActorName { get; set; } = string.Empty;
    public string ActorPhone { get; set; } = string.Empty;
    public string ActorType { get; set; } = string.Empty;
    public Guid TargetPatientId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? ResourceRef { get; set; }
    public string? Ip { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminCampaignDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? DeepLink { get; set; }
    public string Audience { get; set; } = string.Empty;
    public string AudienceName { get; set; } = string.Empty;
    public DateTime? ScheduledAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public int RecipientCount { get; set; }
    public int ReadCount { get; set; }
    public DateTime? SentAt { get; set; }
    public string? FailureReason { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateCampaignDto
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string? DeepLink { get; set; }
    public string Audience { get; set; } = CampaignAudience.All;
    public List<Guid>? AccountIds { get; set; }

    /// <summary>Thời điểm hẹn gửi, giờ UTC. Bỏ trống = gửi ngay.</summary>
    public DateTime? ScheduledAt { get; set; }
}
