using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// AUTHZ-2 (#368): triển khai refresh token bền + rotation + reuse-detection.
/// Dùng CHUNG HISDbContext scoped với AuthService (cùng request scope) nên các thay đổi tracked nhìn thấy nhau.
/// </summary>
public class RefreshTokenService : IRefreshTokenService
{
    private readonly HISDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IHttpContextAccessor _http;
    private readonly ILogger<RefreshTokenService> _logger;

    public RefreshTokenService(HISDbContext context, IConfiguration configuration,
        IHttpContextAccessor http, ILogger<RefreshTokenService> logger)
    {
        _context = context;
        _configuration = configuration;
        _http = http;
        _logger = logger;
    }

    private int TokenDays => int.Parse(_configuration["Auth:RefreshTokenDays"] ?? "14");

    public async Task<string> IssueAsync(Guid userId)
    {
        var plaintext = GenerateToken();
        var hash = Hash(plaintext);
        var ip = ClientIp();
        var now = DateTime.UtcNow;

        _context.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = hash,
            ExpiresAt = now.AddDays(TokenDays),
            CreatedByIp = ip,
            CreatedAt = now,
        });

        // Mở UserSession (M17 admin đọc bảng này) — SessionToken = hash refresh token để logout đối chiếu.
        _context.UserSessions.Add(new UserSession
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SessionToken = hash,
            LoginTime = now,
            IPAddress = ip,
            UserAgent = UserAgent(),
            Status = 0,
            CreatedAt = now,
        });

        await _context.SaveChangesAsync();
        return plaintext;
    }

    public async Task<RefreshRotationResult> RotateAsync(string plaintext)
    {
        if (string.IsNullOrWhiteSpace(plaintext))
            return new RefreshRotationResult { Ok = false, FailReason = "invalid" };

        var hash = Hash(plaintext);
        var now = DateTime.UtcNow;
        // AsNoTracking: chỉ đọc để kiểm tra; việc revoke làm bằng ExecuteUpdate atomic (dưới) — tránh
        // stale-write của change-tracker và tránh double-spend TOCTOU.
        var token = await _context.RefreshTokens.AsNoTracking()
            .FirstOrDefaultAsync(t => t.TokenHash == hash && !t.IsDeleted);
        if (token == null)
            return new RefreshRotationResult { Ok = false, FailReason = "invalid" };

        // Token đã bị revoke mà vẫn được dùng lại → phân biệt 2 trường hợp (review: chống false-positive):
        // (a) RACE LÀNH TÍNH: token vừa được rotate trong vòng leeway (đa tab / retry SAU khi request kia
        //     đã commit) → fail mềm, KHÔNG revoke family (tab thua race nhận 401, tab thắng vẫn chạy).
        // (b) REUSE THẬT (ngoài leeway / lý do khác) → nghi bị đánh cắp: revoke family + caller bump stamp.
        if (token.RevokedAt != null)
        {
            var leewaySeconds = int.Parse(_configuration["Auth:RefreshReuseLeewaySeconds"] ?? "60");
            var benignRace = token.ReasonRevoked == "rotated"
                && token.RevokedAt > now.AddSeconds(-leewaySeconds);
            if (benignRace)
                return new RefreshRotationResult { Ok = false, UserId = token.UserId, FailReason = "rotated_race" };

            // #384: reuse-detection CHỈ áp cho replay chuỗi rotation ("rotated" ngoài leeway = nghi trộm).
            // Token bị thu hồi bởi CHÍNH SÁCH (new_login last-wins / logout / password_changed / user_inactive /
            // reuse_detected trước đó) mà thiết bị cũ auto-refresh lại → hành vi DỰ KIẾN của client stale,
            // KHÔNG phải bằng chứng trộm → fail mềm, KHÔNG revoke family (tránh ping-pong đá thiết bị MỚI).
            if (token.ReasonRevoked != "rotated")
                return new RefreshRotationResult { Ok = false, UserId = token.UserId, FailReason = "session_ended" };

            _logger.LogWarning("RefreshToken REUSE detected user={UserId} — revoking family", token.UserId);
            await RevokeAllForUserAsync(token.UserId, "reuse_detected");
            return new RefreshRotationResult { Ok = false, ReuseDetected = true, UserId = token.UserId, FailReason = "reuse_detected" };
        }

        if (now >= token.ExpiresAt)
            return new RefreshRotationResult { Ok = false, UserId = token.UserId, FailReason = "expired" };

        // Hợp lệ → xoay vòng. Revoke token cũ bằng UPDATE có ĐIỀU KIỆN (WHERE RevokedAt IS NULL) atomic:
        // 2 request song song cùng đọc RevokedAt==null thì CHỈ 1 lật được (affected=1) → cấp token mới;
        // request thua (affected=0) coi như benign race, KHÔNG cấp token → chống double-spend (2 family sống).
        var newPlain = GenerateToken();
        var newHash = Hash(newPlain);
        var ip = ClientIp();

        var affected = await _context.RefreshTokens
            .Where(t => t.Id == token.Id && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s
                .SetProperty(x => x.RevokedAt, now)
                .SetProperty(x => x.RevokedByIp, ip)
                .SetProperty(x => x.ReplacedByTokenHash, newHash)
                .SetProperty(x => x.ReasonRevoked, "rotated")
                .SetProperty(x => x.UpdatedAt, now));
        if (affected == 0)
            return new RefreshRotationResult { Ok = false, UserId = token.UserId, FailReason = "rotated_race" };

        _context.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = token.UserId,
            TokenHash = newHash,
            ExpiresAt = now.AddDays(TokenDays),
            CreatedByIp = ip,
            CreatedAt = now,
        });

        // Chuyển SessionToken của phiên tương ứng sang hash mới (giữ phiên liên tục).
        var session = await _context.UserSessions
            .FirstOrDefaultAsync(s => s.SessionToken == hash && s.Status == 0 && !s.IsDeleted);
        if (session != null) { session.SessionToken = newHash; session.UpdatedAt = now; }

        await _context.SaveChangesAsync();
        return new RefreshRotationResult { Ok = true, UserId = token.UserId, NewPlaintext = newPlain };
    }

    public async Task RevokeAsync(Guid userId, string plaintext, string reason)
    {
        if (string.IsNullOrWhiteSpace(plaintext)) return;
        var hash = Hash(plaintext);
        var now = DateTime.UtcNow;

        var token = await _context.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash && !t.IsDeleted);
        // Ownership check (review): token của user khác → bỏ qua im lặng (không leak token tồn tại hay không).
        if (token == null || token.UserId != userId) return;

        if (token.RevokedAt == null)
        {
            token.RevokedAt = now;
            token.RevokedByIp = ClientIp();
            token.ReasonRevoked = reason;
            token.UpdatedAt = now;
        }

        var session = await _context.UserSessions
            .FirstOrDefaultAsync(s => s.SessionToken == hash && s.UserId == userId && s.Status == 0 && !s.IsDeleted);
        if (session != null) { session.Status = 2; session.LogoutTime = now; session.UpdatedAt = now; }

        await _context.SaveChangesAsync();
    }

    public async Task RevokeAllForUserAsync(Guid userId, string reason)
    {
        var now = DateTime.UtcNow;
        var ip = ClientIp();

        var tokens = await _context.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null && !t.IsDeleted)
            .ToListAsync();
        foreach (var t in tokens) { t.RevokedAt = now; t.RevokedByIp = ip; t.ReasonRevoked = reason; t.UpdatedAt = now; }

        var sessions = await _context.UserSessions
            .Where(s => s.UserId == userId && s.Status == 0 && !s.IsDeleted)
            .ToListAsync();
        foreach (var s in sessions) { s.Status = 2; s.LogoutTime = now; s.UpdatedAt = now; }

        await _context.SaveChangesAsync();
    }

    // 256-bit token, base64url (an toàn URL, không padding).
    private static string GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    private static string Hash(string plaintext)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(plaintext));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private string? ClientIp()
    {
        var ip = _http.HttpContext?.Connection?.RemoteIpAddress?.ToString();
        return string.IsNullOrEmpty(ip) ? null : (ip.Length > 64 ? ip[..64] : ip);
    }

    private string? UserAgent()
    {
        var ua = _http.HttpContext?.Request?.Headers["User-Agent"].ToString();
        return string.IsNullOrEmpty(ua) ? null : (ua.Length > 400 ? ua[..400] : ua);
    }
}
