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
using HIS.Core.Common;
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
    private readonly IRealtimeNotifier _realtime;

    public AuthService(HISDbContext context, IConfiguration configuration, IMapper mapper,
        IEmailService emailService, ILogger<AuthService> logger, IRefreshTokenService refreshTokens,
        IRealtimeNotifier realtime)
    {
        _context = context;
        _configuration = configuration;
        _mapper = mapper;
        _emailService = emailService;
        _logger = logger;
        _refreshTokens = refreshTokens;
        _realtime = realtime;
    }

    /// <summary>
    /// Users + Department + role/permission graph used to build UserDto/JWT.
    /// QA0915: only role assignments that are currently valid (ValidFrom/ValidTo, same rule as
    /// PermissionService) — an EXPIRED temporary grant used to still land in the JWT role claims and
    /// pass [Authorize(Roles=...)] forever.
    /// </summary>
    private IQueryable<User> UsersWithAuthGraph()
    {
        var now = DateTime.UtcNow;
        return _context.Users
            .Include(u => u.Department)
            .Include(u => u.UserRoles.Where(ur => (ur.ValidFrom == null || ur.ValidFrom <= now)
                                               && (ur.ValidTo == null || ur.ValidTo >= now)))
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission);
    }

    public async Task<LoginResponseDto?> LoginAsync(LoginDto dto)
    {
        var user = await UsersWithAuthGraph()
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

        // Normal login (no 2FA) — #384: last-wins đá phiên cũ
        var stamp = await ApplySingleSessionPolicyAsync(user);
        var userDto = MapUserDto(user);
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
        var user = await UsersWithAuthGraph()
            .FirstOrDefaultAsync(u => u.Id == dto.UserId && u.IsActive && !u.IsDeleted);

        // QA0915: OTP is a SECOND factor — never a login on its own for users without 2FA, nor for locked accounts.
        if (user == null || !user.IsTwoFactorEnabled
            || (user.LockoutEndAt.HasValue && user.LockoutEndAt.Value > DateTime.UtcNow))
            return null;

        // #384: last-wins đá phiên cũ (luồng OTP)
        var stamp = await ApplySingleSessionPolicyAsync(user);
        var userDto = MapUserDto(user);
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

        // QA0915 (P0): this endpoint is anonymous and keyed only by userId. It used to mint an OTP for ANY
        // user (2FA or not) — together with verify-otp that is a password-less login by guessing 6 digits.
        // Resend only continues a login that already passed the password step (a pending, unexpired OTP).
        if (lastOtp == null || lastOtp.IsUsed || lastOtp.ExpiresAt <= DateTime.UtcNow)
            return false;
        // Cap the resend chain (each resend = a fresh OTP with fresh attempts) — otherwise resend-every-30s
        // gives unlimited guesses: at most 5 OTPs per user per 15 minutes.
        var windowStart = DateTime.UtcNow.AddMinutes(-15);
        var issuedRecently = await _context.TwoFactorOtps.IgnoreQueryFilters()
            .CountAsync(o => o.UserId == userId && o.CreatedAt >= windowStart);
        if (issuedRecently >= 5)
            return false;

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive && !u.IsDeleted);
        if (user == null || string.IsNullOrEmpty(user.Email) || !user.IsTwoFactorEnabled)
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

        // #216 TC-PERM-015: trước đây nhận mọi chuỗi làm mật khẩu mới — kể cả "1", kể cả chính mật
        // khẩu cũ. Luật ở PasswordPolicy (thuần, có unit test); câu lỗi tiếng Việt lên thẳng UI qua
        // DomainExceptionFilter (InvalidOperationException → 400).
        if (!string.Equals(dto.NewPassword, dto.ConfirmPassword, StringComparison.Ordinal))
            throw new InvalidOperationException("Mật khẩu xác nhận không khớp.");
        var loi = PasswordPolicy.Validate(dto.NewPassword, dto.CurrentPassword, user.Username);
        if (loi != null) throw new InvalidOperationException(loi);

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.MustChangePassword = false;      // chính chủ đã đổi — hết buộc
        user.PasswordChangedAt = DateTime.UtcNow; // đồng hồ hết hạn chạy lại từ đây
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

        var user = await UsersWithAuthGraph()
            .FirstOrDefaultAsync(u => u.Id == result.UserId && u.IsActive && !u.IsDeleted);

        if (user == null)
        {
            // User bị khóa/xóa giữa chừng → refresh vừa cấp là mồ côi, thu hồi luôn.
            await _refreshTokens.RevokeAllForUserAsync(result.UserId, "user_inactive");
            return null;
        }

        var stamp = await EnsureSecurityStampAsync(user);
        var userDto = MapUserDto(user);
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

    public async Task<bool> LogoutByTokenAsync(string? refreshToken)
    {
        // #437: idle-logout cookie-mode — access token đã hết hạn nên không có userId từ claims;
        // sở hữu refresh token = đủ quyền thu hồi chính nó (service tra userId từ bản ghi token).
        if (!string.IsNullOrWhiteSpace(refreshToken))
            await _refreshTokens.RevokeByTokenAsync(refreshToken, "logout");
        return true;
    }

    public async Task<UserDto?> GetCurrentUserAsync(Guid userId)
    {
        var user = await UsersWithAuthGraph()
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        return user == null ? null : MapUserDto(user);
    }

    // Map RoleCode from DB to English role names expected by [Authorize(Roles=...)]
    private static readonly Dictionary<string, string[]> RoleCodeToEnglishRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        { "ADMIN", new[] { "Admin", "Manager", "Director" } },
        // QA-R6: the RIS / sample-receive / blood-bank gates only list the specialist aliases below, which no
        // role emitted — the v2 pages these roles are allowed to open (Radiology.Read, LabResult.Create/Read)
        // answered 403 on every call. Aliases follow PermissionCatalogSeeder.RoleMatrix: doctors hold
        // Radiology.Report/Approve (per-modality RadiologyPermissions still apply); manager aliases stay admin-only.
        // "Technician" is the RIS technician gate only — sample-receive gates use LabTech (pre-push review B1).
        { "DOCTOR", new[] { "Doctor", "Radiologist" } },
        { "NURSE", new[] { "Nurse" } },
        { "RECEPTIONIST", new[] { "Receptionist" } },
        { "PHARMACIST", new[] { "Pharmacist", "PharmacyManager" } },
        { "LAB_TECH", new[] { "LabTech", "LabReceptionist", "BloodBankStaff" } },
        { "CASHIER", new[] { "Cashier", "Accountant" } },
        { "IMAGING_TECH", new[] { "ImagingTech", "Technician" } },
        { RoleNames.PatientAppServiceCode, new[] { RoleNames.PatientAppService } },
    };

    /// <summary>
    /// #216 TC-PERM-015: mọi UserDto phát ra từ service này (đăng nhập, OTP, refresh, WebAuthn, /me)
    /// đều đi qua đây để mang cờ buộc-đổi-mật-khẩu tính theo cùng một luật. Tính lúc phát token, và
    /// refresh cũng đi qua nên mật khẩu hết hạn giữa phiên sẽ có hiệu lực trong vòng một chu kỳ
    /// access token (≤ Jwt:ExpireMinutes).
    /// </summary>
    private UserDto MapUserDto(User user)
    {
        var dto = _mapper.Map<UserDto>(user);
        var maxAge = int.TryParse(_configuration["Auth:PasswordMaxAgeDays"], out var d) ? d : 0;
        // Tài khoản dịch vụ của BFF app người bệnh không có người ngồi đổi mật khẩu: áp hạn 90 ngày
        // thì tới hạn middleware chặn mọi lời gọi và app người bệnh chết im lặng. Khoá của nó xoay
        // chủ động theo quy trình vận hành (docs/features/patient-app/deploy-runbook.md).
        if (user.UserRoles.Any(ur => string.Equals(ur.Role?.RoleCode, RoleNames.PatientAppServiceCode, StringComparison.OrdinalIgnoreCase)))
            maxAge = 0;
        var reason = PasswordPolicy.MustChange(user.MustChangePassword, user.PasswordChangedAt, maxAge, DateTime.UtcNow);
        dto.MustChangePassword = reason != null;
        dto.MustChangePasswordReason = reason;
        return dto;
    }

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

        // #216 TC-PERM-015: đang bị buộc đổi mật khẩu → claim để middleware chặn không cần chạm DB.
        if (user.MustChangePassword)
            claims.Add(new Claim(JwtClaims.PasswordChangeRequired, user.MustChangePasswordReason ?? PasswordPolicy.ReasonFirstLogin));

        // AUTHZ-3 (#369): claim departmentId (không có = không giới hạn theo khoa)
        if (user.DepartmentId.HasValue)
            claims.Add(new Claim(JwtClaims.DepartmentId, user.DepartmentId.Value.ToString()));

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

        // QA0915 (P0): this used to "trust the browser" and issue a JWT for any {userId, credentialId} —
        // and authenticate-options hands out the credentialId anonymously. Now the assertion signature
        // MUST verify against the stored public key (SPKI from AuthenticatorAttestationResponse.getPublicKey()).
        // Challenge freshness is checked by AuthController before calling here.
        if (!VerifyWebAuthnAssertion(credential.PublicKey, dto.AuthenticatorData, dto.ClientDataJSON, dto.Signature))
        {
            _logger.LogWarning("WebAuthn authentication failed: bad signature for user {UserId}", dto.UserId);
            return null;
        }

        credential.SignCount++;
        credential.LastUsedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Load user with navigation properties for JWT generation
        var user = await UsersWithAuthGraph()
            .FirstOrDefaultAsync(u => u.Id == dto.UserId && u.IsActive && !u.IsDeleted);

        if (user == null) return null;

        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // #384: last-wins đá phiên cũ (luồng WebAuthn)
        var stamp = await ApplySingleSessionPolicyAsync(user);
        var userDto = MapUserDto(user);
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

    /// <summary>
    /// Verifies a WebAuthn assertion: signature over authenticatorData || SHA-256(clientDataJSON) with the
    /// stored SPKI public key (ES256 DER signature or RS256 PKCS#1), clientData.type == "webauthn.get" and
    /// the User-Present flag. Inputs are base64url (standard base64 tolerated). Any parse error → false.
    /// </summary>
    internal static bool VerifyWebAuthnAssertion(string? publicKeySpki, string? authenticatorData, string? clientDataJson, string? signature)
    {
        try
        {
            var keyBytes = FromBase64Url(publicKeySpki);
            var authData = FromBase64Url(authenticatorData);
            var clientData = FromBase64Url(clientDataJson);
            var sig = FromBase64Url(signature);
            if (keyBytes.Length == 0 || authData.Length < 37 || clientData.Length == 0 || sig.Length == 0) return false;
            if ((authData[32] & 0x01) == 0) return false; // UP flag

            using (var doc = System.Text.Json.JsonDocument.Parse(clientData))
            {
                if (!doc.RootElement.TryGetProperty("type", out var type) || type.GetString() != "webauthn.get")
                    return false;
            }

            var signed = new byte[authData.Length + 32];
            Buffer.BlockCopy(authData, 0, signed, 0, authData.Length);
            Buffer.BlockCopy(SHA256.HashData(clientData), 0, signed, authData.Length, 32);

            try
            {
                using var ec = ECDsa.Create();
                ec.ImportSubjectPublicKeyInfo(keyBytes, out _);
                return ec.VerifyData(signed, sig, HashAlgorithmName.SHA256, DSASignatureFormat.Rfc3279DerSequence);
            }
            catch (CryptographicException)
            {
                using var rsa = RSA.Create();
                rsa.ImportSubjectPublicKeyInfo(keyBytes, out _);
                return rsa.VerifyData(signed, sig, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
            }
        }
        catch (Exception)
        {
            return false;
        }
    }

    internal static byte[] FromBase64Url(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return Array.Empty<byte>();
        var s = value.Trim().Replace('-', '+').Replace('_', '/');
        switch (s.Length % 4) { case 2: s += "=="; break; case 3: s += "="; break; }
        return Convert.FromBase64String(s);
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

    /// <summary>
    /// #384: chính sách concurrent-login LAST-WINS — login mới thu hồi TOÀN BỘ refresh token cũ
    /// + xoay SecurityStamp → thiết bị cũ 401 (SESSION_INVALIDATED) trong ≤ TTL cache stamp (30s).
    /// Tắt qua config `Auth:SingleSessionPerUser=false` (mặc định BẬT theo #384).
    /// </summary>
    private async Task<string> ApplySingleSessionPolicyAsync(User user)
    {
        var enabled = !bool.TryParse(_configuration["Auth:SingleSessionPerUser"], out var b) || b;
        if (!enabled) return await EnsureSecurityStampAsync(user);

        await _refreshTokens.RevokeAllForUserAsync(user.Id, "new_login");
        user.SecurityStamp = NewSecurityStamp();
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return user.SecurityStamp;
    }

    // #385 Break-glass emergency access
    public async Task<BreakGlassResponseDto?> BreakGlassAsync(Guid userId, BreakGlassRequestDto dto, string? ipAddress)
    {
        if (dto.Reason.Trim().Length < 20)
            return null;

        var now = DateTime.UtcNow;
        var expireAt = now.AddHours(2);

        var session = new BreakGlassSession
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PatientId = dto.PatientId,
            Reason = dto.Reason.Trim(),
            StartAt = now,
            ExpireAt = expireAt,
            IsEmergencyAccess = false,
            IpAddress = ipAddress,
            CreatedAt = now,
            CreatedBy = userId.ToString(),
            IsDeleted = false,
        };

        _context.BreakGlassSessions.Add(session);
        await _context.SaveChangesAsync();

        var user = await _context.Users.FindAsync(userId);
        try
        {
            await _realtime.NotifyBreakGlassActivatedAsync(userId, user?.Username ?? "", dto.PatientId, expireAt);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Break-glass SignalR notification failed for session {SessionId}", session.Id);
        }

        _logger.LogWarning(
            "BREAK-GLASS activated: userId={UserId} username={Username} patientId={PatientId} ip={Ip}",
            userId, user?.Username, dto.PatientId, ipAddress);

        return new BreakGlassResponseDto { SessionId = session.Id, ExpireAt = expireAt };
    }

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
        // QA0915: this endpoint takes ANY userId from any logged-in user, so it was an unlimited
        // password-guessing oracle that bypassed the login lockout. Apply the same counter/lockout as LoginAsync.
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive && !u.IsDeleted);

        if (user == null) return false;
        if (user.LockoutEndAt.HasValue && user.LockoutEndAt.Value > DateTime.UtcNow)
        {
            _logger.LogWarning("VerifyPassword on locked account user={UserId}", userId);
            return false;
        }

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        {
            user.FailedLoginCount++;
            user.LockoutEndAt = ComputeLockoutEndAt(user.FailedLoginCount);
            await _context.SaveChangesAsync();
            _logger.LogWarning("FailedVerifyPassword user={UserId} count={Count}", userId, user.FailedLoginCount);
            return false;
        }

        if (user.FailedLoginCount != 0)
        {
            user.FailedLoginCount = 0;
            await _context.SaveChangesAsync();
        }
        return true;
    }
}
