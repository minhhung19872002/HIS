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

    private static string Sha256Hash(string input)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes);
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

        var link = new StudyShareLink
        {
            Id = Guid.NewGuid(),
            Token = GenerateToken(),
            StudyInstanceUID = dto.StudyInstanceUID,
            OrthancStudyId = dto.OrthancStudyId,
            PatientId = dto.PatientId,
            PasswordHash = !string.IsNullOrWhiteSpace(dto.Password) ? Sha256Hash(dto.Password) : null,
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
            if (string.IsNullOrWhiteSpace(dto.Password))
                return ServiceOutcome.Ok(new AccessResultDto("", null, false, null, null, link.ExpiresAt, true));
            if (Sha256Hash(dto.Password) != link.PasswordHash)
                return ServiceOutcome.Unauthorized(new { message = "Sai mật khẩu" });
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
