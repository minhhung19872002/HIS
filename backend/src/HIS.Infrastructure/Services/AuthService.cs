using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using AutoMapper;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly HISDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IMapper _mapper;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthService> _logger;
    private readonly IRefreshTokenService _refreshTokens;

    public AuthService(HISDbContext context, IConfiguration configuration, IMapper mapper,
        IEmailService emailService, ILogger<AuthService> logger, IRefreshTokenService refreshTokens)
    {
        _context = context;
        _configuration = configuration;
        _mapper = mapper;
        _emailService = emailService;
        _logger = logger;
        _refreshTokens = refreshTokens;
    }

    public async Task<LoginResponseDto?> LoginAsync(LoginDto dto)
    {
        var user = await _context.Users
            .Include(u => u.Department)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Username == dto.Username && u.IsActive && !u.IsDeleted);

        if (user == null)
            return null;

        if (user.LockoutEndAt.HasValue && user.LockoutEndAt.Value > DateTime.UtcNow)
        {
            _logger.LogWarning("Login attempt on locked account username={Username}", dto.Username);
            return null;
        }

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            user.FailedLoginCount++;
            user.LockoutEndAt = ComputeLockoutEndAt(user.FailedLoginCount);
            await _context.SaveChangesAsync();
            _logger.LogWarning("FailedLogin username={Username} count={Count}", dto.Username, user.FailedLoginCount);
            return null;
        }

        // Password correct — reset lockout counters
        user.FailedLoginCount = 0;
        user.LockoutEndAt = null;
        user.LastLoginAt = DateTime.UtcNow;
        _logger.LogInformation("Login success username={Username}", dto.Username);

        // If 2FA enabled, generate OTP and return partial response
        if (user.IsTwoFactorEnabled && !string.IsNullOrEmpty(user.Email))
        {
            await _context.SaveChangesAsync();
            var otpCode = await GenerateAndSendOtp(user);
            var validityMinutes = int.Parse(_configuration["TwoFactor:OtpValidityMinutes"] ?? "5");

            return new LoginResponseDto
            {
                Token = string.Empty,
                RefreshToken = string.Empty,
                RequiresOtp = true,
                OtpUserId = user.Id,
                MaskedEmail = MaskEmail(user.Email),
                OtpExpiresAt = DateTime.UtcNow.AddMinutes(validityMinutes),
            };
        }

        await _context.SaveChangesAsync();

        // Normal login (no 2FA)
        var stamp = await EnsureSecurityStampAsync(user);
        var userDto = _mapper.Map<UserDto>(user);
        var token = GenerateJwtToken(userDto, stamp);
        var expireMinutes = int.Parse(_configuration["Jwt:ExpireMinutes"] ?? "60");

        return new LoginResponseDto
        {
            Token = token,
            RefreshToken = await _refreshTokens.IssueAsync(user.Id),
            ExpiresAt = DateTime.UtcNow.AddMinutes(expireMinutes),
            User = userDto
        };
    }

    public async Task<LoginResponseDto?> VerifyOtpAsync(VerifyOtpDto dto)
    {
        var maxAttempts = int.Parse(_configuration["TwoFactor:MaxOtpAttempts"] ?? "3");

        var otp = await _context.TwoFactorOtps
            .Where(o => o.UserId == dto.UserId && !o.IsUsed && !o.IsDeleted && o.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (otp == null)
            return null;

        if (otp.Attempts >= maxAttempts)
        {
            _logger.LogWarning("OTP max attempts exceeded for user {UserId}", dto.UserId);
            return null;
        }

        // Verify OTP hash
        var inputHash = HashOtp(dto.OtpCode);
        if (otp.OtpCodeHash != inputHash)
        {
            otp.Attempts++;
            await _context.SaveChangesAsync();
            return null;
        }

        // Mark OTP as used
        otp.IsUsed = true;
        await _context.SaveChangesAsync();

        // Load user with all navigation properties for JWT
        var user = await _context.Users
            .Include(u => u.Department)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Id == dto.UserId && u.IsActive && !u.IsDeleted);

        if (user == null)
            return null;

        var stamp = await EnsureSecurityStampAsync(user);
        var userDto = _mapper.Map<UserDto>(user);
        var token = GenerateJwtToken(userDto, stamp);
        var expireMinutes = int.Parse(_configuration["Jwt:ExpireMinutes"] ?? "60");

        return new LoginResponseDto
        {
            Token = token,
            RefreshToken = await _refreshTokens.IssueAsync(user.Id),
            ExpiresAt = DateTime.UtcNow.AddMinutes(expireMinutes),
            User = userDto
        };
    }

    public async Task<bool> ResendOtpAsync(Guid userId)
    {
        var resendDelay = int.Parse(_configuration["TwoFactor:ResendDelaySeconds"] ?? "30");

        // Check cooldown
        var lastOtp = await _context.TwoFactorOtps
            .Where(o => o.UserId == userId && !o.IsDeleted)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (lastOtp != null && (DateTime.UtcNow - lastOtp.CreatedAt).TotalSeconds < resendDelay)
            return false; // Too soon

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive && !u.IsDeleted);
        if (user == null || string.IsNullOrEmpty(user.Email))
            return false;

        await GenerateAndSendOtp(user);
        return true;
    }

    public async Task<bool> EnableTwoFactorAsync(Guid userId, string password)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return false;

        if (string.IsNullOrEmpty(user.Email))
            return false;

        user.IsTwoFactorEnabled = true;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("2FA enabled for user {Username}", user.Username);
        return true;
    }

    public async Task<bool> DisableTwoFactorAsync(Guid userId, string password)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return false;

        user.IsTwoFactorEnabled = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("2FA disabled for user {Username}", user.Username);
        return true;
    }

    public async Task<TwoFactorStatusDto?> GetTwoFactorStatusAsync(Guid userId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        if (user == null) return null;

        return new TwoFactorStatusDto
        {
            IsEnabled = user.IsTwoFactorEnabled,
            MaskedEmail = string.IsNullOrEmpty(user.Email) ? null : MaskEmail(user.Email)
        };
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordDto dto)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            return false;

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        // AUTHZ-2 (#368): đổi mật khẩu → xoay SecurityStamp (đá mọi access token đang sống) +
        // thu hồi mọi refresh token của user (không thiết bị nào refresh tiếp được).
        user.SecurityStamp = NewSecurityStamp();
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await _refreshTokens.RevokeAllForUserAsync(userId, "password_changed");

        _logger.LogInformation("Password changed + sessions revoked for user {UserId}", userId);
        return true;
    }

    public async Task<LoginResponseDto?> RefreshTokenAsync(RefreshTokenRequestDto dto)
    {
        var result = await _refreshTokens.RotateAsync(dto.RefreshToken);
        if (!result.Ok)
        {
            // Reuse-detection: service đã revoke family — bump stamp để đá luôn access token đang sống.
            if (result.ReuseDetected && result.UserId != Guid.Empty)
                await BumpSecurityStampAsync(result.UserId, "reuse_detected");
            return null;
        }

        var user = await _context.Users
            .Include(u => u.Department)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Id == result.UserId && u.IsActive && !u.IsDeleted);

        if (user == null)
        {
            // User bị khóa/xóa giữa chừng → refresh vừa cấp là mồ côi, thu hồi luôn.
            await _refreshTokens.RevokeAllForUserAsync(result.UserId, "user_inactive");
            return null;
        }

        var stamp = await EnsureSecurityStampAsync(user);
        var userDto = _mapper.Map<UserDto>(user);
        var token = GenerateJwtToken(userDto, stamp);
        var expireMinutes = int.Parse(_configuration["Jwt:ExpireMinutes"] ?? "60");

        return new LoginResponseDto
        {
            Token = token,
            RefreshToken = result.NewPlaintext!,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expireMinutes),
            User = userDto
        };
    }

    public async Task<bool> LogoutAsync(Guid userId, string? refreshToken)
    {
        // Thu hồi refresh token của ĐÚNG thiết bị này + đóng session tương ứng. KHÔNG bump SecurityStamp
        // (không đá thiết bị khác cùng user — máy trạm dùng chung). Force-logout mọi thiết bị = đổi mật khẩu / admin.
        if (!string.IsNullOrWhiteSpace(refreshToken))
            await _refreshTokens.RevokeAsync(userId, refreshToken, "logout");
        _logger.LogInformation("Logout user {UserId}", userId);
        return true;
    }

    public async Task<UserDto?> GetCurrentUserAsync(Guid userId)
    {
        var user = await _context.Users
            .Include(u => u.Department)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        return user == null ? null : _mapper.Map<UserDto>(user);
    }

    // Map RoleCode from DB to English role names expected by [Authorize(Roles=...)]
    private static readonly Dictionary<string, string[]> RoleCodeToEnglishRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        { "ADMIN", new[] { "Admin", "Manager", "Director" } },
        { "DOCTOR", new[] { "Doctor" } },
        { "NURSE", new[] { "Nurse" } },
        { "RECEPTIONIST", new[] { "Receptionist" } },
        { "PHARMACIST", new[] { "Pharmacist", "PharmacyManager" } },
        { "LAB_TECH", new[] { "LabTech" } },
        { "CASHIER", new[] { "Cashier", "Accountant" } },
        { "IMAGING_TECH", new[] { "ImagingTech" } },
    };

    public string GenerateJwtToken(UserDto user, string? securityStamp = null)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key not configured")));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(JwtClaims.FullName, user.FullName),
            new(JwtClaims.EmployeeCode, user.EmployeeCode ?? "")
        };

        // AUTHZ-2 (#368): security stamp → OnTokenValidated so khớp để thu hồi token tức thời.
        // Không có stamp = token cũ trước deploy → grace-accept (không revoke được, để hết hạn tự nhiên).
        if (!string.IsNullOrEmpty(securityStamp))
            claims.Add(new Claim(JwtClaims.SecurityStamp, securityStamp));

        // R3 đa cơ sở: user gắn chi nhánh → claim branchId (không có = không giới hạn)
        if (user.BranchId.HasValue)
            claims.Add(new Claim(JwtClaims.BranchId, user.BranchId.Value.ToString()));

        foreach (var role in user.Roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        // Also add English role names mapped from RoleCodes for [Authorize(Roles=...)]
        foreach (var roleCode in user.RoleCodes)
        {
            if (RoleCodeToEnglishRoles.TryGetValue(roleCode, out var englishRoles))
            {
                foreach (var englishRole in englishRoles)
                {
                    if (!claims.Any(c => c.Type == ClaimTypes.Role && c.Value == englishRole))
                        claims.Add(new Claim(ClaimTypes.Role, englishRole));
                }
            }
        }

        // AUTHZ-1 (#367): KHÔNG phát claim permission hàng loạt nữa — token phình + stale khi đổi quyền.
        // Permission resolve server-side qua IPermissionService (DB + cache 30s) tại PermissionAuthorizationHandler.
        // Verified 0 consumer đọc claim này (grep 2026-07-12); FE dùng UserDto.Permissions trong login response (giữ nguyên).
        // RoleCodeToEnglishRoles GIỮ LẠI (deviation khỏi #367): 71 controller còn gate [Authorize(Roles=...)] —
        // bỏ mapping = khóa toàn bộ; sẽ gỡ khi migrate hết sang [RequirePermission] (phase sau).

        var expireMinutes = int.Parse(_configuration["Jwt:ExpireMinutes"] ?? "60");
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expireMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    #region WebAuthn (NangCap12)

    public async Task<List<WebAuthnCredentialDto>> GetWebAuthnCredentialsAsync(Guid userId)
    {
        return await _context.WebAuthnCredentials
            .Where(c => c.UserId == userId && c.IsActive && !c.IsDeleted)
            .OrderByDescending(c => c.LastUsedAt)
            .Select(c => new WebAuthnCredentialDto
            {
                Id = c.Id,
                CredentialId = c.CredentialId,
                DeviceName = c.DeviceName,
                CreatedAt = c.CreatedAt,
                LastUsedAt = c.LastUsedAt,
                IsActive = c.IsActive
            })
            .ToListAsync();
    }

    public async Task<WebAuthnCredentialDto?> RegisterWebAuthnCredentialAsync(Guid userId, WebAuthnRegisterDto dto)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return null;

        // Check for duplicate credential ID
        var existing = await _context.WebAuthnCredentials
            .AnyAsync(c => c.CredentialId == dto.CredentialId && !c.IsDeleted);
        if (existing) return null;

        var credential = new WebAuthnCredential
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CredentialId = dto.CredentialId,
            PublicKey = dto.PublicKey,
            DeviceName = dto.DeviceName,
            CredentialType = "public-key",
            SignCount = 0,
            IsActive = true,
            LastUsedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _context.WebAuthnCredentials.Add(credential);
        await _context.SaveChangesAsync();

        _logger.LogInformation("WebAuthn credential registered for user {Username}, device: {DeviceName}",
            user.Username, dto.DeviceName);

        return new WebAuthnCredentialDto
        {
            Id = credential.Id,
            CredentialId = credential.CredentialId,
            DeviceName = credential.DeviceName,
            CreatedAt = credential.CreatedAt,
            LastUsedAt = credential.LastUsedAt,
            IsActive = credential.IsActive
        };
    }

    public async Task<LoginResponseDto?> AuthenticateWebAuthnAsync(WebAuthnAuthenticateDto dto)
    {
        var credential = await _context.WebAuthnCredentials
            .FirstOrDefaultAsync(c => c.UserId == dto.UserId && c.CredentialId == dto.CredentialId
                && c.IsActive && !c.IsDeleted);

        if (credential == null)
        {
            _logger.LogWarning("WebAuthn authentication failed: credential not found for user {UserId}", dto.UserId);
            return null;
        }

        // In production, verify the signature against the stored public key.
        // For now, trust the browser's WebAuthn API verification and update sign count.
        credential.SignCount++;
        credential.LastUsedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Load user with navigation properties for JWT generation
        var user = await _context.Users
            .Include(u => u.Department)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Id == dto.UserId && u.IsActive && !u.IsDeleted);

        if (user == null) return null;

        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var stamp = await EnsureSecurityStampAsync(user);
        var userDto = _mapper.Map<UserDto>(user);
        var token = GenerateJwtToken(userDto, stamp);
        var expireMinutes = int.Parse(_configuration["Jwt:ExpireMinutes"] ?? "60");

        _logger.LogInformation("WebAuthn authentication successful for user {Username}", user.Username);

        return new LoginResponseDto
        {
            Token = token,
            RefreshToken = await _refreshTokens.IssueAsync(user.Id),
            ExpiresAt = DateTime.UtcNow.AddMinutes(expireMinutes),
            User = userDto
        };
    }

    public async Task<bool> DeleteWebAuthnCredentialAsync(Guid userId, Guid credentialId)
    {
        var credential = await _context.WebAuthnCredentials
            .FirstOrDefaultAsync(c => c.Id == credentialId && c.UserId == userId && !c.IsDeleted);

        if (credential == null) return false;

        credential.IsActive = false;
        credential.IsDeleted = true;
        credential.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("WebAuthn credential {CredentialId} deleted for user {UserId}",
            credentialId, userId);
        return true;
    }

    #endregion

    private static DateTime? ComputeLockoutEndAt(int failedCount) => failedCount switch
    {
        >= 20 => DateTime.UtcNow.AddMinutes(30),
        >= 15 => DateTime.UtcNow.AddMinutes(20),
        >= 10 => DateTime.UtcNow.AddMinutes(10),
        >= 5  => DateTime.UtcNow.AddMinutes(5),
        _     => null
    };

    // AUTHZ-2 (#368): security stamp = 32 hex ngẫu nhiên (không lộ thông tin). Đổi = mọi token cũ hết hiệu lực.
    private static string NewSecurityStamp() => Guid.NewGuid().ToString("N");

    /// <summary>Đảm bảo user có SecurityStamp (user cũ trước migration có thể NULL) — set + lưu nếu thiếu. Trả về stamp.</summary>
    private async Task<string> EnsureSecurityStampAsync(User user)
    {
        if (string.IsNullOrEmpty(user.SecurityStamp))
        {
            user.SecurityStamp = NewSecurityStamp();
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        return user.SecurityStamp;
    }

    /// <summary>Xoay SecurityStamp của user → thu hồi TỨC THỜI mọi access token đang sống (OnTokenValidated sẽ fail).</summary>
    private async Task BumpSecurityStampAsync(Guid userId, string reason)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return;
        user.SecurityStamp = NewSecurityStamp();
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        _logger.LogInformation("SecurityStamp bumped user={UserId} reason={Reason}", userId, reason);
    }

    #region Private Helpers

    private async Task<string> GenerateAndSendOtp(User user)
    {
        var otpLength = int.Parse(_configuration["TwoFactor:OtpLength"] ?? "6");
        var validityMinutes = int.Parse(_configuration["TwoFactor:OtpValidityMinutes"] ?? "5");

        // Generate numeric OTP
        var otpCode = GenerateNumericOtp(otpLength);

        // Invalidate previous unused OTPs for this user
        var previousOtps = await _context.TwoFactorOtps
            .Where(o => o.UserId == user.Id && !o.IsUsed && !o.IsDeleted)
            .ToListAsync();
        foreach (var prev in previousOtps)
        {
            prev.IsDeleted = true;
        }

        // Store hashed OTP
        var otp = new TwoFactorOtp
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            OtpCodeHash = HashOtp(otpCode),
            ExpiresAt = DateTime.UtcNow.AddMinutes(validityMinutes),
            CreatedAt = DateTime.UtcNow
        };

        _context.TwoFactorOtps.Add(otp);
        await _context.SaveChangesAsync();

        // Send email
        await _emailService.SendOtpAsync(user.Email!, otpCode, validityMinutes);

        return otpCode;
    }

    private static string GenerateNumericOtp(int length)
    {
        var bytes = RandomNumberGenerator.GetBytes(4);
        var num = BitConverter.ToUInt32(bytes) % (uint)Math.Pow(10, length);
        return num.ToString().PadLeft(length, '0');
    }

    private static string HashOtp(string otpCode)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(otpCode));
        return Convert.ToHexString(bytes).ToLower();
    }

    private static string MaskEmail(string email)
    {
        var parts = email.Split('@');
        if (parts.Length != 2) return "***@***";
        var local = parts[0];
        var domain = parts[1];
        var masked = local.Length <= 2
            ? local[0] + "***"
            : local[0] + "***" + local[^1];
        return $"{masked}@{domain}";
    }

    #endregion

    // ---------------------------------------------------------------------------
    // VerifyPassword — confirm identity for sensitive actions (e.g., lab result approval)
    // ---------------------------------------------------------------------------

    public async Task<bool> VerifyPasswordAsync(Guid userId, string password)
    {
        var user = await _context.Users
            .Where(u => u.Id == userId && u.IsActive && !u.IsDeleted)
            .Select(u => new { u.PasswordHash })
            .FirstOrDefaultAsync();

        if (user == null) return false;
        return BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
    }
}
