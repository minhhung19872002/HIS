using HIS.PatientApp.Api.Auth;
using HIS.PatientApp.Api.Connector;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using HIS.PatientApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Controllers;

/// <summary>
/// Quản lý gia đình — HSMT I.2 #7: kết nối tối đa 20 thành viên và xem được kết quả của họ.
///
/// <para><b>Đây là tính năng dễ biến thành lỗ hổng nhất của cả app.</b> "Xem kết quả của người thân"
/// và "đọc trộm bệnh án người lạ" chỉ khác nhau ở một bước xác minh. Nên có đúng hai đường được chấp
/// thuận, và không có đường thứ ba:</para>
/// <list type="number">
/// <item><b>Người thân có tài khoản app</b> → gửi OTP tới <b>số của chính người đó</b>, họ đọc mã và
///       đưa cho người xin liên kết. Người tự quyết được thì phải là người đồng ý.</item>
/// <item><b>Người thân chưa có tài khoản</b> (trẻ nhỏ, người già) → phải khai đúng một thông tin định
///       danh trên hồ sơ HIS: số CCCD hoặc ngày sinh. Không hoàn hảo, nhưng đây đúng là thông tin mà
///       người nhà biết còn người lạ thì không.</item>
/// </list>
/// </summary>
[ApiController]
[Route("api/v1/patient/family")]
[Authorize]
[Produces("application/json")]
public class FamilyController : ControllerBase
{
    /// <summary>Trần theo HSMT. Đếm cả bản ghi chờ xác minh để không lách bằng cách tạo hàng loạt.</summary>
    private const int MaxMembers = 20;

    /// <summary>Mục đích của mã OTP dùng riêng cho việc kết nối gia đình.</summary>
    private const string OtpPurpose = "family_link";

    private readonly PatientAppDbContext _db;
    private readonly IHisConnector _his;
    private readonly OtpService _otp;
    private readonly ILogger<FamilyController> _logger;

    public FamilyController(
        PatientAppDbContext db, IHisConnector his, OtpService otp, ILogger<FamilyController> logger)
    {
        _db = db;
        _his = his;
        _otp = otp;
        _logger = logger;
    }

    [HttpGet("members")]
    public async Task<IActionResult> Members(CancellationToken ct)
    {
        var accountId = User.GetAccountId();

        var members = await _db.FamilyLinks.AsNoTracking()
            .Where(l => l.OwnerAccountId == accountId && l.Status != AppFamilyLinkStatus.Revoked)
            .OrderBy(l => l.CreatedAt)
            .Select(l => new FamilyMemberDto
            {
                Id = l.Id,
                PatientCode = l.MemberPatientCode,
                Name = l.MemberName,
                Relationship = l.Relationship,
                Status = l.Status,
                CanViewResults = l.CanViewResults,
                CanBookAppointments = l.CanBookAppointments,
                CanTakeQueueNumber = l.CanTakeQueueNumber,
                VerifiedAt = l.VerifiedAt,
            })
            .ToListAsync(ct);

        return Ok(ApiResponse<FamilyListDto>.Ok(new FamilyListDto
        {
            Items = members,
            MaxMembers = MaxMembers,
        }));
    }

    /// <summary>
    /// Bước 1: khai người thân. Trả về cách xác minh sẽ dùng, chưa cho xem gì cả.
    /// </summary>
    [HttpPost("members")]
    [EnableRateLimiting(RateLimitPolicies.Otp)]
    public async Task<IActionResult> Add([FromBody] AddFamilyMemberDto dto, CancellationToken ct)
    {
        var accountId = User.GetAccountId();

        if (string.IsNullOrWhiteSpace(dto.PatientCode))
            return BadRequest(ApiResponse.Fail("Vui lòng nhập mã bệnh nhân của người thân."));

        var count = await _db.FamilyLinks.CountAsync(
            l => l.OwnerAccountId == accountId && l.Status != AppFamilyLinkStatus.Revoked, ct);

        if (count >= MaxMembers)
            return BadRequest(ApiResponse.Fail(
                $"Bạn đã kết nối tối đa {MaxMembers} thành viên. Vui lòng gỡ bớt trước khi thêm mới.",
                "FAMILY_LIMIT_REACHED"));

        HisPatient? patient;
        try
        {
            patient = await _his.GetPatientByCodeAsync(dto.PatientCode.Trim(), ct);
        }
        catch (HisConnectorException ex)
        {
            _logger.LogError(ex, "Không tra được hồ sơ khi thêm thành viên gia đình.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiResponse.Fail(
                "Hiện chưa kết nối được tới hệ thống bệnh viện. Vui lòng thử lại sau ít phút.",
                "HIS_UNAVAILABLE"));
        }

        if (patient is null)
            return NotFound(ApiResponse.Fail("Không tìm thấy hồ sơ với mã bệnh nhân này."));

        var owner = await _db.Accounts.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == accountId, ct);

        if (owner?.HisPatientId == patient.Id)
            return BadRequest(ApiResponse.Fail("Đây là hồ sơ của chính bạn."));

        var existing = await _db.FamilyLinks.FirstOrDefaultAsync(
            l => l.OwnerAccountId == accountId && l.MemberPatientId == patient.Id, ct);

        if (existing is { Status: AppFamilyLinkStatus.Verified })
            return BadRequest(ApiResponse.Fail("Người thân này đã được kết nối."));

        var link = existing ?? new AppFamilyLink { OwnerAccountId = accountId, MemberPatientId = patient.Id };
        link.MemberPatientCode = patient.PatientCode ?? dto.PatientCode.Trim();
        link.MemberName = patient.FullName ?? "";
        link.Relationship = dto.Relationship?.Trim() ?? "";
        link.Status = AppFamilyLinkStatus.Pending;
        link.RevokedAt = null;
        link.VerifiedAt = null;

        if (existing is null) _db.FamilyLinks.Add(link);

        // Người thân có tài khoản app thì họ tự quyết được: gửi OTP tới số của chính họ.
        var memberPhone = PhoneNumbers.Normalize(patient.PhoneNumber);
        var memberHasAccount = !string.IsNullOrEmpty(memberPhone)
            && await _db.Accounts.AnyAsync(a => a.PhoneNumber == memberPhone, ct);

        if (memberHasAccount)
        {
            await _db.SaveChangesAsync(ct);

            // Dùng lại OtpService: nó đã có sẵn ba lớp chống lạm dụng (trần số lần xin, trần số lần
            // nhập sai, mã sống ngắn dùng một lần). Tự viết lại ở đây là tự bỏ cả ba.
            if (!await _otp.IssueAsync(memberPhone, OtpPurpose, HttpContext.GetClientIp(), ct))
                return StatusCode(StatusCodes.Status429TooManyRequests, ApiResponse.Fail(
                    "Đã gửi quá nhiều mã tới số này. Vui lòng thử lại sau ít phút."));

            return Ok(ApiResponse<AddFamilyMemberResultDto>.Ok(
                new AddFamilyMemberResultDto
                {
                    LinkId = link.Id,
                    MemberName = link.MemberName,
                    VerificationMethod = FamilyVerificationMethods.MemberOtp,
                    MaskedPhone = PhoneNumbers.Mask(memberPhone),
                },
                $"Đã gửi mã xác nhận tới số điện thoại của {link.MemberName}. "
                + "Vui lòng hỏi người thân để lấy mã."));
        }

        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse<AddFamilyMemberResultDto>.Ok(
            new AddFamilyMemberResultDto
            {
                LinkId = link.Id,
                MemberName = link.MemberName,
                VerificationMethod = FamilyVerificationMethods.IdentityData,
            },
            "Người thân này chưa có tài khoản. Vui lòng nhập số CCCD/CMND hoặc ngày sinh "
            + "ghi trên hồ sơ để xác nhận."));
    }

    /// <summary>Bước 2: xác minh. Chỉ sau bước này liên kết mới có hiệu lực.</summary>
    [HttpPost("members/{linkId:guid}/verify")]
    [EnableRateLimiting(RateLimitPolicies.Otp)]
    public async Task<IActionResult> Verify(
        Guid linkId, [FromBody] VerifyFamilyMemberDto dto, CancellationToken ct)
    {
        var accountId = User.GetAccountId();

        var link = await _db.FamilyLinks.FirstOrDefaultAsync(
            l => l.Id == linkId && l.OwnerAccountId == accountId, ct);

        if (link is null) return NotFound(ApiResponse.Fail("Không tìm thấy yêu cầu kết nối."));
        if (link.Status == AppFamilyLinkStatus.Verified)
            return Ok(ApiResponse.Ok("Người thân này đã được kết nối."));

        HisPatient? patient;
        try
        {
            patient = await _his.GetPatientByIdAsync(link.MemberPatientId, ct);
        }
        catch (HisConnectorException ex)
        {
            _logger.LogError(ex, "Không tra được hồ sơ khi xác minh liên kết gia đình.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiResponse.Fail(
                "Hiện chưa kết nối được tới hệ thống bệnh viện. Vui lòng thử lại sau ít phút.",
                "HIS_UNAVAILABLE"));
        }

        if (patient is null) return NotFound(ApiResponse.Fail("Không tìm thấy hồ sơ của người thân."));

        var memberPhone = PhoneNumbers.Normalize(patient.PhoneNumber);
        var memberHasAccount = !string.IsNullOrEmpty(memberPhone)
            && await _db.Accounts.AnyAsync(a => a.PhoneNumber == memberPhone, ct);

        var method = memberHasAccount
            ? FamilyVerificationMethods.MemberOtp
            : FamilyVerificationMethods.IdentityData;

        var accepted = method == FamilyVerificationMethods.MemberOtp
            ? !string.IsNullOrWhiteSpace(dto.OtpCode)
              && (await _otp.VerifyAsync(memberPhone, OtpPurpose, dto.OtpCode!.Trim(), ct)).Success
            : MatchesIdentity(patient, dto.IdentityData);

        if (!accepted)
        {
            _logger.LogWarning(
                "Từ chối xác minh liên kết gia đình {LinkId} bằng {Method}.", linkId, method);

            return BadRequest(ApiResponse.Fail(
                method == FamilyVerificationMethods.MemberOtp
                    ? "Mã xác nhận không đúng hoặc đã hết hạn."
                    : "Thông tin xác minh không khớp với hồ sơ của người thân."));
        }

        link.Status = AppFamilyLinkStatus.Verified;
        link.VerificationMethod = method;
        link.VerifiedAt = DateTime.UtcNow;

        // Ghi nhật ký ngay lúc liên kết chứ không chỉ lúc xem: câu hỏi "vì sao tài khoản này xem được
        // hồ sơ kia" phải trả lời được kể cả khi họ chưa mở lần nào.
        _db.AccessAuditLogs.Add(new AccessAuditLog
        {
            ActorAccountId = accountId,
            ActorType = "patient",
            TargetPatientId = link.MemberPatientId,
            Action = "family_link_verified",
            ResourceRef = $"family_link:{link.Id}:{method}",
            Ip = HttpContext.GetClientIp(),
            UserAgent = Request.Headers.UserAgent.ToString(),
        });

        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse.Ok($"Đã kết nối với {link.MemberName}."));
    }

    /// <summary>Đổi quyền của một thành viên đã kết nối.</summary>
    [HttpPut("members/{linkId:guid}/permissions")]
    public async Task<IActionResult> UpdatePermissions(
        Guid linkId, [FromBody] FamilyPermissionsDto dto, CancellationToken ct)
    {
        var link = await _db.FamilyLinks.FirstOrDefaultAsync(
            l => l.Id == linkId && l.OwnerAccountId == User.GetAccountId()
                 && l.Status == AppFamilyLinkStatus.Verified, ct);

        if (link is null) return NotFound(ApiResponse.Fail("Không tìm thấy thành viên."));

        link.CanViewResults = dto.CanViewResults;
        link.CanBookAppointments = dto.CanBookAppointments;
        link.CanTakeQueueNumber = dto.CanTakeQueueNumber;
        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse.Ok("Đã cập nhật quyền."));
    }

    /// <summary>
    /// Gỡ kết nối. Quyền xem mất ngay lập tức vì mọi lời gọi đều kiểm lại trạng thái liên kết ở
    /// thời điểm gọi, không dựa vào bất cứ thứ gì đã cấp trước đó.
    /// </summary>
    [HttpDelete("members/{linkId:guid}")]
    public async Task<IActionResult> Remove(Guid linkId, CancellationToken ct)
    {
        var accountId = User.GetAccountId();

        var link = await _db.FamilyLinks.FirstOrDefaultAsync(
            l => l.Id == linkId && l.OwnerAccountId == accountId, ct);

        if (link is null) return NotFound(ApiResponse.Fail("Không tìm thấy thành viên."));

        // Đánh dấu đã gỡ thay vì xoá: nhật ký truy cập cũ vẫn phải giải thích được.
        link.Status = AppFamilyLinkStatus.Revoked;
        link.RevokedAt = DateTime.UtcNow;

        _db.AccessAuditLogs.Add(new AccessAuditLog
        {
            ActorAccountId = accountId,
            ActorType = "patient",
            TargetPatientId = link.MemberPatientId,
            Action = "family_link_revoked",
            ResourceRef = $"family_link:{link.Id}",
            Ip = HttpContext.GetClientIp(),
            UserAgent = Request.Headers.UserAgent.ToString(),
        });

        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse.Ok($"Đã gỡ kết nối với {link.MemberName}."));
    }

    /// <summary>
    /// Đối chiếu thông tin định danh với hồ sơ HIS: số CCCD/CMND hoặc ngày sinh (yyyy-MM-dd).
    ///
    /// Cố ý KHÔNG nhận số điện thoại: số điện thoại là thứ dễ biết nhất trong ba thứ, và với người
    /// thân chưa có tài khoản thì số trên hồ sơ rất thường là số của chính người đi đăng ký.
    /// </summary>
    private static bool MatchesIdentity(HisPatient patient, string? provided)
    {
        var value = provided?.Trim();
        if (string.IsNullOrEmpty(value)) return false;

        if (!string.IsNullOrWhiteSpace(patient.IdentityNumber)
            && string.Equals(patient.IdentityNumber.Trim(), value, StringComparison.Ordinal))
            return true;

        return patient.DateOfBirth.HasValue
               && patient.DateOfBirth.Value.ToString("yyyy-MM-dd") == value;
    }
}

public static class FamilyVerificationMethods
{
    /// <summary>Người thân tự đọc mã OTP gửi tới số của họ.</summary>
    public const string MemberOtp = "member_otp";

    /// <summary>Khai đúng CCCD hoặc ngày sinh trên hồ sơ — dùng khi người thân chưa có tài khoản.</summary>
    public const string IdentityData = "identity_data";
}

public class AddFamilyMemberDto
{
    public string PatientCode { get; set; } = string.Empty;
    public string? Relationship { get; set; }
}

public class AddFamilyMemberResultDto
{
    public Guid LinkId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string VerificationMethod { get; set; } = string.Empty;

    /// <summary>Số điện thoại đã che, chỉ để người dùng biết mã gửi đi đâu.</summary>
    public string? MaskedPhone { get; set; }
}

public class VerifyFamilyMemberDto
{
    public string? OtpCode { get; set; }

    /// <summary>Số CCCD/CMND hoặc ngày sinh dạng yyyy-MM-dd.</summary>
    public string? IdentityData { get; set; }
}

public class FamilyPermissionsDto
{
    public bool CanViewResults { get; set; } = true;
    public bool CanBookAppointments { get; set; } = true;
    public bool CanTakeQueueNumber { get; set; } = true;
}

public class FamilyMemberDto
{
    public Guid Id { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Relationship { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool CanViewResults { get; set; }
    public bool CanBookAppointments { get; set; }
    public bool CanTakeQueueNumber { get; set; }
    public DateTime? VerifiedAt { get; set; }
}

public class FamilyListDto
{
    public List<FamilyMemberDto> Items { get; set; } = new();
    public int MaxMembers { get; set; }
}
