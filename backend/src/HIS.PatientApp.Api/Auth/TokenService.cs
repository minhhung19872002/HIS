using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace HIS.PatientApp.Api.Auth;

public record IssuedTokens(string AccessToken, string RefreshToken, DateTime AccessExpiresAt);

/// <summary>
/// Phát và làm mới token cho app.
///
/// Refresh token được lưu dưới dạng BĂM SHA-256; chuỗi thật chỉ tồn tại trên thiết bị. Mỗi lần làm
/// mới sẽ thu hồi token cũ và phát token mới (rotation). Nếu một token ĐÃ thu hồi bị dùng lại thì
/// gần như chắc chắn nó đã bị sao chép — khi đó thu hồi toàn bộ phiên của tài khoản, chấp nhận làm
/// phiền người dùng còn hơn để kẻ trộm ở lại.
/// </summary>
public class TokenService
{
    private readonly PatientAppDbContext _db;
    private readonly AppJwtOptions _options;
    private readonly ILogger<TokenService> _logger;

    public TokenService(
        PatientAppDbContext db, IOptions<AppJwtOptions> options, ILogger<TokenService> logger)
    {
        _db = db;
        _options = options.Value;
        _logger = logger;
    }

    /// <summary>Băm token để lưu. Không cần salt vì đầu vào đã là 256 bit ngẫu nhiên.</summary>
    public static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();

    private static string NewRefreshToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    public async Task<IssuedTokens> IssueAsync(
        AppAccount account, AppDevice device, string? ip, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, account.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(AppClaims.AccountId, account.Id.ToString()),
            new(AppClaims.DeviceId, device.Id.ToString()),
            new(AppClaims.SecurityStamp, account.SecurityStamp),
            new(ClaimTypes.Role, AppRoles.Patient),
        };

        if (account.HisPatientId.HasValue)
            claims.Add(new Claim(AppClaims.PatientId, account.HisPatientId.Value.ToString()));

        // Có claim này thì middleware chặn mọi đường trừ đổi mật khẩu và đăng xuất. Ẩn nút trên app
        // là chưa đủ — phải chặn ở server.
        if (account.MustChangePassword)
            claims.Add(new Claim(AppClaims.PasswordChangeRequired, "first_login"));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
        var accessExpires = now.AddMinutes(_options.AccessTokenMinutes);
        var jwt = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now,
            expires: accessExpires,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        var refreshToken = NewRefreshToken();
        _db.RefreshTokens.Add(new AppRefreshToken
        {
            AccountId = account.Id,
            DeviceId = device.Id,
            TokenHash = HashToken(refreshToken),
            ExpiresAt = now.AddDays(_options.RefreshTokenDays),
            CreatedByIp = ip,
        });
        await _db.SaveChangesAsync(ct);

        return new IssuedTokens(
            new JwtSecurityTokenHandler().WriteToken(jwt), refreshToken, accessExpires);
    }

    /// <summary>
    /// Đổi refresh token lấy cặp token mới. Trả null khi token không dùng được (sai, hết hạn, đã thu
    /// hồi, thiết bị đã bị đăng xuất từ xa, hoặc tài khoản bị khoá).
    /// </summary>
    public async Task<IssuedTokens?> RefreshAsync(
        string refreshToken, string? ip, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var hash = HashToken(refreshToken);

        var stored = await _db.RefreshTokens
            .Include(t => t.Account)
            .Include(t => t.Device)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (stored is null) return null;

        // Token đã thu hồi mà vẫn được dùng: hoặc bị đánh cắp, hoặc thiết bị lỡ giữ bản cũ. Cả hai
        // trường hợp đều xử lý như bị lộ — thu hồi mọi phiên và xoay con dấu.
        if (stored.RevokedAt is not null)
        {
            stored.ReuseDetectedAt = now;
            await RevokeAllForAccountAsync(stored.AccountId, now, ct);
            _logger.LogWarning(
                "Refresh token đã thu hồi bị dùng lại cho tài khoản {AccountId} — đã thu hồi toàn bộ phiên.",
                stored.AccountId);
            await _db.SaveChangesAsync(ct);
            return null;
        }

        if (stored.ExpiresAt <= now) return null;

        var account = stored.Account;
        var device = stored.Device;
        if (account is null || device is null) return null;
        if (!device.IsActive) return null;                       // đã đăng xuất từ xa
        if (account.Status != AppAccountStatus.Active) return null;

        stored.RevokedAt = now;

        var issued = await IssueAsync(account, device, ip, ct);
        stored.ReplacedByTokenHash = HashToken(issued.RefreshToken);

        device.LastSeenAt = now;
        device.LastIp = ip;
        await _db.SaveChangesAsync(ct);

        return issued;
    }

    /// <summary>Thu hồi mọi refresh token còn sống của tài khoản và xoay con dấu bảo mật.</summary>
    public async Task RevokeAllForAccountAsync(Guid accountId, DateTime now, CancellationToken ct = default)
    {
        var tokens = await _db.RefreshTokens
            .Where(t => t.AccountId == accountId && t.RevokedAt == null)
            .ToListAsync(ct);
        foreach (var token in tokens) token.RevokedAt = now;

        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, ct);
        if (account is not null) account.SecurityStamp = Guid.NewGuid().ToString("N");
    }

    /// <summary>Thu hồi phiên của MỘT thiết bị — dùng cho đăng xuất từ xa từng máy (HSMT I.2 #9).</summary>
    public async Task RevokeDeviceAsync(Guid accountId, Guid deviceId, DateTime now, CancellationToken ct = default)
    {
        var tokens = await _db.RefreshTokens
            .Where(t => t.AccountId == accountId && t.DeviceId == deviceId && t.RevokedAt == null)
            .ToListAsync(ct);
        foreach (var token in tokens) token.RevokedAt = now;

        var device = await _db.Devices
            .FirstOrDefaultAsync(d => d.Id == deviceId && d.AccountId == accountId, ct);
        if (device is not null) device.RevokedAt = now;

        // Xoay con dấu để access token đang lưu hành của máy đó chết NGAY, không đợi 15 phút.
        // Cái giá: các máy khác cũng phải làm mới token một lần. Đổi lại là thu hồi tức thì, đúng
        // tinh thần "đăng xuất từ xa" mà người dùng mong đợi khi mất máy.
        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, ct);
        if (account is not null) account.SecurityStamp = Guid.NewGuid().ToString("N");
    }
}
