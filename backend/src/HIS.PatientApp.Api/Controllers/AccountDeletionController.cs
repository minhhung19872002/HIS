using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Controllers;

/// <summary>
/// Xoá tài khoản app theo yêu cầu của người dùng.
///
/// <para><b>Bắt buộc để phát hành lên App Store và Google Play.</b> Cả hai kho đều yêu cầu app cho
/// người dùng tự xoá tài khoản ngay trong app; thiếu là bị trả về ngay vòng duyệt.</para>
///
/// <para><b>Ranh giới quan trọng nhất:</b> xoá tài khoản app KHÔNG xoá hồ sơ bệnh án. Hồ sơ bệnh án
/// nằm trong HIS, chịu quy định lưu trữ của ngành y tế, và bệnh viện không được phép xoá theo yêu cầu
/// của cá nhân. Cái bị xoá ở đây là <b>đường vào</b>: tài khoản, thiết bị, phiên, thông báo, ví giấy
/// tờ, liên kết gia đình.</para>
/// </summary>
[ApiController]
[Route("api/v1/patient/account")]
[Authorize]
[Produces("application/json")]
public class AccountDeletionController : ControllerBase
{
    private readonly PatientAppDbContext _db;
    private readonly DocumentVault _vault;
    private readonly ILogger<AccountDeletionController> _logger;

    public AccountDeletionController(
        PatientAppDbContext db, DocumentVault vault, ILogger<AccountDeletionController> logger)
    {
        _db = db;
        _vault = vault;
        _logger = logger;
    }

    /// <summary>Những gì sẽ mất và những gì được giữ lại — hiện trước khi người dùng xác nhận.</summary>
    [HttpGet("deletion-preview")]
    public async Task<IActionResult> Preview(CancellationToken ct)
    {
        var accountId = User.GetAccountId();

        return Ok(ApiResponse<DeletionPreviewDto>.Ok(new DeletionPreviewDto
        {
            Devices = await _db.Devices.CountAsync(d => d.AccountId == accountId && d.RevokedAt == null, ct),
            Documents = await _db.Documents.CountAsync(d => d.AccountId == accountId, ct),
            FamilyLinks = await _db.FamilyLinks.CountAsync(
                l => l.OwnerAccountId == accountId && l.Status != Entities.AppFamilyLinkStatus.Revoked, ct),
            Notifications = await _db.Notifications.CountAsync(n => n.AccountId == accountId, ct),
        }));
    }

    /// <summary>
    /// Xoá tài khoản. Yêu cầu nhập lại mật khẩu — đây là hành động không hoàn tác được, và điện thoại
    /// đang mở khoá trong tay người khác không được phép xoá tài khoản của chủ máy.
    /// </summary>
    [HttpDelete]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public async Task<IActionResult> Delete([FromBody] DeleteAccountDto dto, CancellationToken ct)
    {
        var accountId = User.GetAccountId();

        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, ct);
        if (account is null) return NotFound(ApiResponse.Fail("Không tìm thấy tài khoản."));

        if (string.IsNullOrWhiteSpace(dto.Password)
            || !BCrypt.Net.BCrypt.Verify(dto.Password, account.PasswordHash))
        {
            _logger.LogWarning("Từ chối xoá tài khoản {AccountId}: mật khẩu không đúng.", accountId);
            return BadRequest(ApiResponse.Fail("Mật khẩu không đúng."));
        }

        // Xoá tệp trên đĩa TRƯỚC khi xoá bản ghi: bản ghi mất rồi thì không còn đường nào biết tệp
        // nào cần dọn, và những tệp đó sẽ nằm lại trên đĩa mãi mãi.
        var documents = await _db.Documents
            .Where(d => d.AccountId == accountId)
            .Select(d => d.StoragePath)
            .ToListAsync(ct);

        foreach (var path in documents)
        {
            try
            {
                _vault.Delete(path);
            }
            catch (IOException ex)
            {
                // Một tệp không xoá được không được phép chặn cả việc xoá tài khoản — quyền của người
                // dùng đứng trước sự gọn gàng của đĩa. Ghi log để dọn tay sau.
                _logger.LogError(ex, "Không xoá được tệp giấy tờ {Path}.", path);
            }
        }

        // Liên kết gia đình mà NGƯỜI KHÁC tạo tới hồ sơ này không nằm trong tài khoản này, nên
        // `Cascade` không chạm tới. Phải gỡ tường minh: xoá tài khoản mà vẫn để người khác xem được
        // hồ sơ của mình thì việc xoá chẳng có nghĩa gì.
        if (account.HisPatientId is Guid patientId)
        {
            var inboundLinks = await _db.FamilyLinks
                .Where(l => l.MemberPatientId == patientId
                            && l.Status != Entities.AppFamilyLinkStatus.Revoked)
                .ToListAsync(ct);

            foreach (var link in inboundLinks)
            {
                link.Status = Entities.AppFamilyLinkStatus.Revoked;
                link.RevokedAt = DateTime.UtcNow;
            }
        }

        // Nhật ký truy cập KHÔNG xoá: nó là bảng chỉ-thêm và là bằng chứng cho những lần hồ sơ bệnh
        // án bị mở. Xoá nó là xoá dấu vết của việc người khác đã xem hồ sơ này.
        _db.Accounts.Remove(account);
        await _db.SaveChangesAsync(ct);

        _logger.LogWarning(
            "Đã xoá tài khoản {AccountId} theo yêu cầu của người dùng ({Documents} giấy tờ).",
            accountId, documents.Count);

        return Ok(ApiResponse.Ok(
            "Đã xoá tài khoản. Hồ sơ bệnh án của bạn tại bệnh viện vẫn được giữ theo quy định lưu trữ "
            + "y tế và không bị ảnh hưởng."));
    }
}

public class DeleteAccountDto
{
    public string Password { get; set; } = string.Empty;
}

public class DeletionPreviewDto
{
    public int Devices { get; set; }
    public int Documents { get; set; }
    public int FamilyLinks { get; set; }
    public int Notifications { get; set; }
}
