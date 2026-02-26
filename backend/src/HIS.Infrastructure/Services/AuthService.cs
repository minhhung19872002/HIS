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

    public AuthService(HISDbContext context, IConfiguration configuration, IMapper mapper,
        IEmailService emailService, ILogger<AuthService> logger)
    {
        _context = context;
        _configuration = configuration;
        _mapper = mapper;
        _emailService = emailService;
        _logger = logger;
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

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return null;

        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // If 2FA enabled, generate OTP and return partial response
        if (user.IsTwoFactorEnabled && !string.IsNullOrEmpty(user.Email))
        {
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

        // Normal login (no 2FA)
        var userDto = _mapper.Map<UserDto>(user);
        var token = GenerateJwtToken(userDto);
        var expireMinutes = int.Parse(_configuration["Jwt:ExpireMinutes"] ?? "60");

        return new LoginResponseDto
        {
            Token = token,
            RefreshToken = Guid.NewGuid().ToString(),
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

        var userDto = _mapper.Map<UserDto>(user);
        var token = GenerateJwtToken(userDto);
        var expireMinutes = int.Parse(_configuration["Jwt:ExpireMinutes"] ?? "60");

        return new LoginResponseDto
        {
            Token = token,
            RefreshToken = Guid.NewGuid().ToString(),
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
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

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

    public string GenerateJwtToken(UserDto user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new("fullName", user.FullName),
            new("employeeCode", user.EmployeeCode ?? "")
        };

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

        foreach (var permission in user.Permissions)
        {
            claims.Add(new Claim("permission", permission));
        }

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
}
