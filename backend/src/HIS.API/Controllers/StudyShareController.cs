using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/study-share")]
public class StudyShareController : ControllerBase
{
    private readonly HISDbContext _db;

    public StudyShareController(HISDbContext db) { _db = db; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

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

    public record CreateShareDto(
        string StudyInstanceUID,
        string? OrthancStudyId,
        Guid? PatientId,
        string? Password,
        bool HideDemographics,
        int? ExpiresInMinutes,
        int? MaxViews);

    public record ShareLinkDto(
        Guid Id,
        string Token,
        string Url,
        string StudyInstanceUID,
        bool HasPassword,
        bool HideDemographics,
        DateTime? ExpiresAt,
        int? MaxViews,
        int ViewCount,
        DateTime CreatedAt,
        bool IsRevoked);

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ShareLinkDto>> Create([FromBody] CreateShareDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.StudyInstanceUID))
            return BadRequest("StudyInstanceUID required");

        var link = new StudyShareLink
        {
            Id = Guid.NewGuid(),
            Token = GenerateToken(),
            StudyInstanceUID = dto.StudyInstanceUID,
            OrthancStudyId = dto.OrthancStudyId,
            PatientId = dto.PatientId,
            PasswordHash = !string.IsNullOrWhiteSpace(dto.Password) ? Sha256Hash(dto.Password) : null,
            HideDemographics = dto.HideDemographics,
            ExpiresAt = dto.ExpiresInMinutes.HasValue
                ? DateTime.UtcNow.AddMinutes(dto.ExpiresInMinutes.Value)
                : null,
            MaxViews = dto.MaxViews,
            CreatedByUserId = GetUserId(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = GetUserId().ToString()
        };
        _db.StudyShareLinks.Add(link);
        await _db.SaveChangesAsync();

        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        // Frontend route sẽ là /shared/:token — ở đây trả về URL đầy đủ.
        return Ok(new ShareLinkDto(
            link.Id, link.Token, $"{baseUrl}/shared/{link.Token}",
            link.StudyInstanceUID, link.PasswordHash != null, link.HideDemographics,
            link.ExpiresAt, link.MaxViews, 0, link.CreatedAt, false));
    }

    [HttpGet("my")]
    [Authorize]
    public async Task<ActionResult<List<ShareLinkDto>>> MyLinks()
    {
        var userId = GetUserId();
        var list = await _db.StudyShareLinks
            .Where(l => l.CreatedByUserId == userId)
            .OrderByDescending(l => l.CreatedAt)
            .Take(100)
            .ToListAsync();
        return Ok(list.Select(l => new ShareLinkDto(
            l.Id, l.Token, $"{Request.Scheme}://{Request.Host}/shared/{l.Token}",
            l.StudyInstanceUID, l.PasswordHash != null, l.HideDemographics,
            l.ExpiresAt, l.MaxViews, l.ViewCount, l.CreatedAt, l.IsRevoked)));
    }

    [HttpPost("{id:guid}/revoke")]
    [Authorize]
    public async Task<IActionResult> Revoke(Guid id, [FromBody] RevokeDto dto)
    {
        var link = await _db.StudyShareLinks.FirstOrDefaultAsync(l => l.Id == id)
            ?? throw new KeyNotFoundException();
        link.IsRevoked = true;
        link.RevokedAt = DateTime.UtcNow;
        link.RevokeReason = dto.Reason;
        link.UpdatedAt = DateTime.UtcNow;
        link.UpdatedBy = GetUserId().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    public record RevokeDto(string? Reason);

    public record AccessDto(string? Password);
    public record AccessResultDto(
        string StudyInstanceUID,
        string? OrthancStudyId,
        bool HideDemographics,
        string? PatientName,
        string? PatientCode,
        DateTime? ExpiresAt,
        bool RequiresPassword);

    /// <summary>
    /// Public access endpoint. Không yêu cầu authentication — chỉ cần token + password.
    /// </summary>
    [HttpPost("access/{token}")]
    [AllowAnonymous]
    public async Task<ActionResult<AccessResultDto>> Access(string token, [FromBody] AccessDto dto)
    {
        var link = await _db.StudyShareLinks
            .Include(l => l.Patient)
            .FirstOrDefaultAsync(l => l.Token == token);

        if (link == null) return NotFound(new { message = "Link không hợp lệ" });
        if (link.IsRevoked) return StatusCode(403, new { message = "Link đã bị thu hồi" });
        if (link.ExpiresAt.HasValue && link.ExpiresAt.Value < DateTime.UtcNow)
            return StatusCode(403, new { message = "Link đã hết hạn" });
        if (link.MaxViews.HasValue && link.ViewCount >= link.MaxViews.Value)
            return StatusCode(403, new { message = "Link đã hết lượt xem" });

        if (link.PasswordHash != null)
        {
            if (string.IsNullOrWhiteSpace(dto.Password))
                return Ok(new AccessResultDto("", null, false, null, null, link.ExpiresAt, true));
            if (Sha256Hash(dto.Password) != link.PasswordHash)
                return StatusCode(401, new { message = "Sai mật khẩu" });
        }

        link.ViewCount++;
        link.LastViewerIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        link.LastViewedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new AccessResultDto(
            link.StudyInstanceUID,
            link.OrthancStudyId,
            link.HideDemographics,
            link.HideDemographics ? null : link.Patient?.FullName,
            link.HideDemographics ? null : link.Patient?.PatientCode,
            link.ExpiresAt,
            false));
    }

    /// <summary>Peek metadata — không tăng view count, dùng để render UI trước khi hỏi password.</summary>
    [HttpGet("peek/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> Peek(string token)
    {
        var link = await _db.StudyShareLinks
            .FirstOrDefaultAsync(l => l.Token == token);
        if (link == null) return NotFound(new { message = "Link không hợp lệ" });
        if (link.IsRevoked) return StatusCode(403, new { message = "Link đã bị thu hồi" });
        if (link.ExpiresAt.HasValue && link.ExpiresAt.Value < DateTime.UtcNow)
            return StatusCode(403, new { message = "Link đã hết hạn" });

        return Ok(new
        {
            requiresPassword = link.PasswordHash != null,
            expiresAt = link.ExpiresAt,
            viewCount = link.ViewCount,
            maxViews = link.MaxViews,
        });
    }
}
