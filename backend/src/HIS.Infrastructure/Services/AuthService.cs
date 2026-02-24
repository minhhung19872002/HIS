using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using AutoMapper;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly HISDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IMapper _mapper;

    public AuthService(HISDbContext context, IConfiguration configuration, IMapper mapper)
    {
        _context = context;
        _configuration = configuration;
        _mapper = mapper;
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
}
