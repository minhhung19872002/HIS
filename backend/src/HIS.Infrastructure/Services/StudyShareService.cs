using System.Security.Cryptography;
using System.Text;
using HIS.Application.Common;
using HIS.Application.DTOs.StudyShare;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Logic chia sẻ study (link xem ảnh DICOM public) — tách khỏi StudyShareController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape + message giữ nguyên; userId + các giá trị
/// HttpContext (requestScheme/requestHost/remoteIp) truyền từ controller. throw KeyNotFoundException giữ
/// nguyên (controller propagate). StatusCode(403)/StatusCode(401) giữ đúng qua ServiceOutcome.Forbidden/Unauthorized.
/// </summary>
public class StudyShareService : IStudyShareService
{
    private readonly HISDbContext _db;
    public StudyShareService(HISDbContext db) { _db = db; }

    /// <summary>Wrong passwords allowed before the link locks (anonymous endpoint → brute-force guard).</summary>
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    /// <summary>Legacy format (before r3-security): unsalted SHA-256 hex. Only used to verify old links once.</summary>
    private static string LegacySha256Hash(string input)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes);
    }

    private static bool IsBcryptHash(string hash) => hash.StartsWith("$2", StringComparison.Ordinal);

    /// <summary>Salted BCrypt (same helper as user/portal passwords); legacy SHA-256 compared in constant time.</summary>
    private static bool VerifySharePassword(string password, string storedHash)
    {
        if (IsBcryptHash(storedHash))
        {
            try { return BCrypt.Net.BCrypt.Verify(password, storedHash); }
            catch (Exception) { return false; } // malformed hash → treat as wrong password, never 500
        }
        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(LegacySha256Hash(password)),
            Encoding.ASCII.GetBytes(storedHash.ToUpperInvariant()));
    }

    private static string GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(24);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public async Task<ServiceOutcome> CreateAsync(CreateShareDto dto, string requestScheme, string requestHost, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.StudyInstanceUID))
            return ServiceOutcome.Status(400, "StudyInstanceUID required");
        // A non-positive expiry/limit produced a link that was dead on arrival (or already expired).
        if (dto.ExpiresInMinutes.HasValue && dto.ExpiresInMinutes.Value <= 0)
            return ServiceOutcome.Bad("Thời hạn link phải lớn hơn 0 phút");
        if (dto.MaxViews.HasValue && dto.MaxViews.Value <= 0)
            return ServiceOutcome.Bad("Số lượt xem tối đa phải lớn hơn 0");

        // HideDemographics chưa được hỗ trợ ở mức DICOM tag.
        // Hiện tại chỉ null PatientName/PatientCode trong response metadata — không ẩn PHI trong tag (0010,xxxx).
        // Viewer vẫn đọc được tên BN từ tag nếu kết nối trực tiếp Orthanc.
        // Trả lỗi rõ thay vì tạo link gây hiểu nhầm an toàn dữ liệu.
        // TODO (P1): Implement real PHI anonymization: call Orthanc POST /studies/{id}/anonymize at
        // share creation time, store anonymized orthancStudyId, delete when share is revoked.
        if (dto.HideDemographics)
            return ServiceOutcome.Bad(
                "Tính năng 'Ẩn thông tin bệnh nhân' ở mức DICOM tag chưa được hỗ trợ. " +
                "Nếu cần ẩn thông tin BN mức ảnh, liên hệ quản trị hệ thống.");

        // QA-R11: PatientId came from the client unchecked — a link could put any patient's NAME on the public page
        // (AccessAsync returns Patient.FullName) next to someone else's images. The owner of the study is taken
        // from the RIS record; a study unknown to the RIS gets no patient attached at all.
        var uid = dto.StudyInstanceUID.Trim();
        var studyPatientIds = await _db.DicomStudies.AsNoTracking()
            .Where(s => s.StudyInstanceUID == uid && !s.IsDeleted)
            .Select(s => (Guid?)s.RadiologyExam.RadiologyRequest.PatientId)
            .Distinct()
            .ToListAsync();
        if (studyPatientIds.Count > 1)
            return ServiceOutcome.Bad("Ca chụp này gắn với nhiều bệnh nhân khác nhau trong RIS — kiểm tra lại trước khi chia sẻ.");
        var ownerId = studyPatientIds.FirstOrDefault();
        if (dto.PatientId.HasValue && ownerId.HasValue && dto.PatientId.Value != ownerId.Value)
            return ServiceOutcome.Bad("Bệnh nhân không khớp với ca chụp cần chia sẻ.");

        var link = new StudyShareLink
        {
            Id = Guid.NewGuid(),
            Token = GenerateToken(),
            StudyInstanceUID = uid,
            OrthancStudyId = dto.OrthancStudyId,
            PatientId = ownerId,
            PasswordHash = !string.IsNullOrWhiteSpace(dto.Password) ? BCrypt.Net.BCrypt.HashPassword(dto.Password) : null,
            HideDemographics = false, // luôn false cho đến khi implement Orthanc anonymize at share-time
            ExpiresAt = dto.ExpiresInMinutes.HasValue
                ? DateTime.UtcNow.AddMinutes(dto.ExpiresInMinutes.Value)
                : null,
            MaxViews = dto.MaxViews,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };
        _db.StudyShareLinks.Add(link);
        await _db.SaveChangesAsync();

        var baseUrl = $"{requestScheme}://{requestHost}";
        // Frontend route sẽ là /shared/:token — ở đây trả về URL đầy đủ.
        return ServiceOutcome.Ok(new ShareLinkDto(
            link.Id, link.Token, $"{baseUrl}/shared/{link.Token}",
            link.StudyInstanceUID, link.PasswordHash != null, link.HideDemographics,
            link.ExpiresAt, link.MaxViews, 0, link.CreatedAt, false));
    }

    public async Task<ServiceOutcome> MyLinksAsync(string requestScheme, string requestHost, Guid userId)
    {
        var list = await _db.StudyShareLinks
            .Where(l => l.CreatedByUserId == userId)
            .OrderByDescending(l => l.CreatedAt)
            .Take(100)
            .ToListAsync();
        return ServiceOutcome.Ok(list.Select(l => new ShareLinkDto(
            l.Id, l.Token, $"{requestScheme}://{requestHost}/shared/{l.Token}",
            l.StudyInstanceUID, l.PasswordHash != null, l.HideDemographics,
            l.ExpiresAt, l.MaxViews, l.ViewCount, l.CreatedAt, l.IsRevoked)));
    }

    public async Task<ServiceOutcome> RevokeAsync(Guid id, RevokeDto dto, Guid userId)
    {
        var link = await _db.StudyShareLinks.FirstOrDefaultAsync(l => l.Id == id)
            ?? throw new KeyNotFoundException();
        // Any signed-in user could revoke anyone's share link by id (MyLinks is already scoped to the creator).
        if (link.CreatedByUserId != userId)
            return ServiceOutcome.Forbidden(new { message = "Chỉ người tạo link mới thu hồi được" });
        if (link.IsRevoked)
            return ServiceOutcome.Bad("Link đã được thu hồi trước đó");
        link.IsRevoked = true;
        link.RevokedAt = DateTime.UtcNow;
        link.RevokeReason = dto.Reason;
        link.UpdatedAt = DateTime.UtcNow;
        link.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    /// <summary>
    /// Public access endpoint. Không yêu cầu authentication — chỉ cần token + password.
    /// </summary>
    public async Task<ServiceOutcome> AccessAsync(string token, AccessDto dto, string? remoteIp)
    {
        var link = await _db.StudyShareLinks
            .Include(l => l.Patient)
            .FirstOrDefaultAsync(l => l.Token == token);

        if (link == null) return ServiceOutcome.NotFound("Link không hợp lệ");
        if (link.IsRevoked) return ServiceOutcome.Forbidden(new { message = "Link đã bị thu hồi" });
        if (link.ExpiresAt.HasValue && link.ExpiresAt.Value < DateTime.UtcNow)
            return ServiceOutcome.Forbidden(new { message = "Link đã hết hạn" });
        if (link.MaxViews.HasValue && link.ViewCount >= link.MaxViews.Value)
            return ServiceOutcome.Forbidden(new { message = "Link đã hết lượt xem" });

        if (link.PasswordHash != null)
        {
            var nowUtc = DateTime.UtcNow;
            if (link.LockedUntil.HasValue && link.LockedUntil.Value > nowUtc)
                return ServiceOutcome.Status(429, new { message = LockedMessage(link.LockedUntil.Value) });
            if (string.IsNullOrWhiteSpace(dto.Password))
                return ServiceOutcome.Ok(new AccessResultDto("", null, false, null, null, link.ExpiresAt, true));
            if (!VerifySharePassword(dto.Password, link.PasswordHash))
            {
                link.FailedAttemptCount++;
                if (link.FailedAttemptCount >= MaxFailedAttempts)
                {
                    link.LockedUntil = nowUtc.Add(LockoutDuration);
                    link.FailedAttemptCount = 0;
                    await _db.SaveChangesAsync();
                    return ServiceOutcome.Status(429, new { message = LockedMessage(link.LockedUntil.Value) });
                }
                await _db.SaveChangesAsync();
                return ServiceOutcome.Unauthorized(new
                {
                    message = $"Sai mật khẩu (còn {MaxFailedAttempts - link.FailedAttemptCount} lần thử trước khi link bị tạm khóa)"
                });
            }

            // Correct password: reset the counter and upgrade a legacy unsalted hash in place.
            link.FailedAttemptCount = 0;
            link.LockedUntil = null;
            if (!IsBcryptHash(link.PasswordHash))
                link.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        }

        link.ViewCount++;
        link.LastViewerIp = remoteIp;
        link.LastViewedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ServiceOutcome.Ok(new AccessResultDto(
            link.StudyInstanceUID,
            link.OrthancStudyId,
            link.HideDemographics,
            link.HideDemographics ? null : link.Patient?.FullName,
            link.HideDemographics ? null : link.Patient?.PatientCode,
            link.ExpiresAt,
            false));
    }

    private static string LockedMessage(DateTime lockedUntilUtc)
        => $"Nhập sai mật khẩu quá {MaxFailedAttempts} lần — link tạm khóa đến {lockedUntilUtc.AddHours(7):HH:mm} (giờ VN). " +
           "Người tạo link có thể tạo link mới nếu cần gấp.";

    /// <summary>Peek metadata — không tăng view count, dùng để render UI trước khi hỏi password.</summary>
    public async Task<ServiceOutcome> PeekAsync(string token)
    {
        var link = await _db.StudyShareLinks
            .FirstOrDefaultAsync(l => l.Token == token);
        if (link == null) return ServiceOutcome.NotFound("Link không hợp lệ");
        if (link.IsRevoked) return ServiceOutcome.Forbidden(new { message = "Link đã bị thu hồi" });
        if (link.ExpiresAt.HasValue && link.ExpiresAt.Value < DateTime.UtcNow)
            return ServiceOutcome.Forbidden(new { message = "Link đã hết hạn" });

        return ServiceOutcome.Ok(new
        {
            requiresPassword = link.PasswordHash != null,
            expiresAt = link.ExpiresAt,
            viewCount = link.ViewCount,
            maxViews = link.MaxViews,
        });
    }
}
