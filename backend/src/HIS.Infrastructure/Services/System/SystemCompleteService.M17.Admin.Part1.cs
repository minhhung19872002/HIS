using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K2 phien 2 (2026-05-30): tach Module 17 (Quan tri He thong, 10 chuc nang chinh +
// 17.12 IT Tickets + 13.19 Chi nhanh BV — tat ca thuoc admin domain) ~1861 dong khoi
// SystemCompleteService.cs. ZERO runtime change — partial class.
// Ctor + DI fields o file goc SystemCompleteService.cs.
public partial class SystemCompleteService
{

    // 17.1 Quan ly nguoi dung
    public async Task<List<SystemUserDto>> GetUsersAsync(
        string keyword = null, Guid? departmentId = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Users.AsNoTracking()
                .Where(u => !u.IsDeleted)
                .Include(u => u.Department)
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(u =>
                    u.FullName.Contains(keyword) ||
                    u.Username.Contains(keyword) ||
                    (u.Email != null && u.Email.Contains(keyword)) ||
                    (u.EmployeeCode != null && u.EmployeeCode.Contains(keyword)));
            if (departmentId.HasValue)
                query = query.Where(u => u.DepartmentId == departmentId.Value);
            if (isActive.HasValue)
                query = query.Where(u => u.IsActive == isActive.Value);

            var items = await query.OrderBy(u => u.FullName).ThenBy(u => u.Username).Take(500).ToListAsync();

            // Batch lookup last login IP from UserSessions
            var userIds = items.Select(u => u.Id).ToList();
            var lastSessions = await _context.UserSessions.AsNoTracking()
                .Where(s => userIds.Contains(s.UserId))
                .GroupBy(s => s.UserId)
                .Select(g => new { UserId = g.Key, LastIP = g.OrderByDescending(s => s.LoginTime).Select(s => s.IPAddress).FirstOrDefault() })
                .ToListAsync();
            var ipLookup = lastSessions.ToDictionary(s => s.UserId, s => s.LastIP);

            return items.Select(u => new SystemUserDto
            {
                Id = u.Id,
                Username = u.Username,
                FullName = u.FullName,
                Email = u.Email,
                Phone = u.PhoneNumber,
                DepartmentId = u.DepartmentId,
                DepartmentName = u.Department?.DepartmentName,
                BranchId = u.BranchId,
                Roles = u.UserRoles?.Select(ur => ur.Role?.RoleName).Where(r => r != null).ToList() ?? new List<string>(),
                Permissions = new List<string>(),
                IsActive = u.IsActive,
                IsTwoFactorEnabled = u.IsTwoFactorEnabled,
                LastLoginDate = u.LastLoginAt,
                LastLoginIP = ipLookup.TryGetValue(u.Id, out var ip) ? ip : null
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetUsersAsync");
            return new List<SystemUserDto>();
        }
    }

    public async Task<SystemUserDto> GetUserAsync(Guid userId)
    {
        try
        {
            var u = await _context.Users.AsNoTracking()
                .Include(x => x.Department)
                .Include(x => x.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(x => x.Id == userId);
            if (u == null) return null;

            // Lookup last login IP from UserSessions
            var lastSession = await _context.UserSessions.AsNoTracking()
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.LoginTime)
                .FirstOrDefaultAsync();

            // Lookup user permissions through roles
            var roleIds = u.UserRoles?.Select(ur => ur.RoleId).ToList() ?? new List<Guid>();
            var permissions = roleIds.Any()
                ? await _context.RolePermissions.AsNoTracking()
                    .Include(rp => rp.Permission)
                    .Where(rp => roleIds.Contains(rp.RoleId))
                    .Select(rp => rp.Permission.PermissionName)
                    .Distinct()
                    .ToListAsync()
                : new List<string>();

            return new SystemUserDto
            {
                Id = u.Id,
                Username = u.Username,
                FullName = u.FullName,
                Email = u.Email,
                Phone = u.PhoneNumber,
                DepartmentId = u.DepartmentId,
                DepartmentName = u.Department?.DepartmentName,
                BranchId = u.BranchId,
                Roles = u.UserRoles?.Select(ur => ur.Role?.RoleName).Where(r => r != null).ToList() ?? new List<string>(),
                Permissions = permissions,
                IsActive = u.IsActive,
                IsTwoFactorEnabled = u.IsTwoFactorEnabled,
                LastLoginDate = u.LastLoginAt,
                LastLoginIP = lastSession?.IPAddress
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetUserAsync");
            return null;
        }
    }

    public async Task<SystemUserDto> CreateUserAsync(CreateUserDto dto)
    {
        try
        {
            // Check for duplicate username
            var existingUser = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Username == dto.Username);
            if (existingUser != null)
            {
                _logger.LogWarning("CreateUserAsync: Username '{Username}' already exists", dto.Username);
                return null;
            }

            var user = new User
            {
                Username = dto.Username ?? string.Empty,
                FullName = dto.FullName ?? string.Empty,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                DepartmentId = dto.DepartmentId,
                BranchId = dto.BranchId, // R3 đa cơ sở
                PasswordHash = HashPassword(dto.InitialPassword ?? "123456"),
                IsActive = true,
                UserType = 5 // Default: Employee
            };
            _context.Users.Add(user);

            // Assign roles
            var roleNames = new List<string>();
            if (dto.RoleIds?.Any() == true)
            {
                // AUTHZ-4 (#370): SoD grant-time check (no-op khi Auth:SoDEnabled=false)
                await _sodService.EnsureNoGrantTimeConflictAsync(dto.RoleIds);

                var roles = await _context.Roles.AsNoTracking()
                    .Where(r => dto.RoleIds.Contains(r.Id))
                    .ToListAsync();
                roleNames = roles.Select(r => r.RoleName).ToList();

                foreach (var roleId in dto.RoleIds)
                {
                    _context.UserRoles.Add(new UserRole
                    {
                        UserId = user.Id,
                        RoleId = roleId
                    });
                }
            }

            await _context.SaveChangesAsync();

            // Load department name for response
            var deptName = user.DepartmentId.HasValue
                ? (await _context.Departments.AsNoTracking().FirstOrDefaultAsync(d => d.Id == user.DepartmentId.Value))?.DepartmentName
                : null;

            return new SystemUserDto
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.PhoneNumber,
                DepartmentId = user.DepartmentId,
                DepartmentName = deptName,
                BranchId = user.BranchId,
                IsActive = user.IsActive,
                Roles = roleNames,
                Permissions = new List<string>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in CreateUserAsync");
            return null;
        }
    }

    public async Task<SystemUserDto> UpdateUserAsync(Guid userId, UpdateUserDto dto)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return null;

            user.FullName = dto.FullName ?? user.FullName;
            user.Email = dto.Email;
            user.PhoneNumber = dto.PhoneNumber;
            user.DepartmentId = dto.DepartmentId;
            user.BranchId = dto.BranchId; // R3 đa cơ sở
            user.IsActive = dto.IsActive;

            // Sync roles if RoleIds provided
            if (dto.RoleIds != null)
            {
                // AUTHZ-4 (#370): SoD grant-time check (no-op khi Auth:SoDEnabled=false)
                await _sodService.EnsureNoGrantTimeConflictAsync(dto.RoleIds);

                // Remove existing role assignments
                var existingRoles = await _context.UserRoles.Where(ur => ur.UserId == userId).ToListAsync();
                var oldRoleIds = existingRoles.Select(r => r.RoleId).ToHashSet();
                var newRoleIds = dto.RoleIds.ToHashSet();
                _context.UserRoles.RemoveRange(existingRoles);

                // Add new role assignments
                foreach (var roleId in dto.RoleIds)
                {
                    _context.UserRoles.Add(new UserRole
                    {
                        UserId = userId,
                        RoleId = roleId
                    });
                }

                // #371 inc-2: record permission change history (who changed which roles)
                await RecordRoleChangeHistoryAsync(userId, oldRoleIds, newRoleIds);
            }

            await _context.SaveChangesAsync();
            return await GetUserAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UpdateUserAsync");
            return null;
        }
    }

    public async Task<bool> DeleteUserAsync(Guid userId)
    {
        return await SoftDeleteEntityAsync<User>(userId);
    }

    public async Task<bool> ResetPasswordAsync(Guid userId)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return false;
            user.PasswordHash = HashPassword("123456"); // Default reset password
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ResetPasswordAsync");
            return false;
        }
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, AdminChangePasswordDto dto)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return false;
            if (dto.NewPassword != dto.ConfirmPassword) return false;
            user.PasswordHash = HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ChangePasswordAsync");
            return false;
        }
    }

    public async Task<bool> LockUserAsync(Guid userId, string reason)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return false;
            user.IsActive = false;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in LockUserAsync");
            return false;
        }
    }

    public async Task<bool> UnlockUserAsync(Guid userId)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return false;
            user.IsActive = true;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UnlockUserAsync");
            return false;
        }
    }

    // 17.2 Quan ly vai tro
    public async Task<List<RoleDto>> GetRolesAsync(bool? isActive = null)
    {
        try
        {
            var query = _context.Roles.AsNoTracking()
                .Where(r => !r.IsDeleted)
                .Include(r => r.UserRoles)
                .Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
                .AsQueryable();

            var items = await query.OrderBy(r => r.RoleCode).ToListAsync();
            return items.Select(r => new RoleDto
            {
                Id = r.Id,
                Code = r.RoleCode,
                Name = r.RoleName,
                Description = r.Description,
                Permissions = r.RolePermissions?.Select(rp => rp.Permission?.PermissionName).Where(p => p != null).ToList() ?? new List<string>(),
                UserCount = r.UserRoles?.Count(ur => !ur.IsDeleted) ?? 0,
                IsActive = !r.IsDeleted
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetRolesAsync");
            return new List<RoleDto>();
        }
    }

    public async Task<RoleDto> GetRoleAsync(Guid roleId)
    {
        try
        {
            var r = await _context.Roles.AsNoTracking()
                .Include(x => x.UserRoles)
                .Include(x => x.RolePermissions).ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(x => x.Id == roleId);
            if (r == null) return null;
            return new RoleDto
            {
                Id = r.Id,
                Code = r.RoleCode,
                Name = r.RoleName,
                Description = r.Description,
                Permissions = r.RolePermissions?.Select(rp => rp.Permission?.PermissionName).Where(p => p != null).ToList() ?? new List<string>(),
                UserCount = r.UserRoles?.Count ?? 0,
                IsActive = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetRoleAsync");
            return null;
        }
    }

    public async Task<RoleDto> SaveRoleAsync(RoleDto dto)
    {
        try
        {
            Role entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Role
                {
                    RoleCode = dto.Code ?? string.Empty,
                    RoleName = dto.Name ?? string.Empty,
                    Description = dto.Description
                };
                _context.Roles.Add(entity);
            }
            else
            {
                entity = await _context.Roles.FirstOrDefaultAsync(r => r.Id == dto.Id);
                if (entity == null) return null;
                entity.RoleCode = dto.Code ?? entity.RoleCode;
                entity.RoleName = dto.Name ?? entity.RoleName;
                entity.Description = dto.Description;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveRoleAsync");
            return null;
        }
    }

    public async Task<bool> DeleteRoleAsync(Guid roleId)
    {
        return await SoftDeleteEntityAsync<Role>(roleId);
    }

    // 17.3 Quan ly quyen
    public async Task<List<PermissionDto>> GetPermissionsAsync(string module = null)
    {
        try
        {
            var query = _context.Permissions.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(module))
                query = query.Where(p => p.Module == module);

            var items = await query.OrderBy(p => p.Module).ThenBy(p => p.PermissionCode).ToListAsync();
            return items.Select(p => new PermissionDto
            {
                Code = p.PermissionCode,
                Name = p.PermissionName,
                Module = p.Module,
                Description = p.Description
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetPermissionsAsync");
            return new List<PermissionDto>();
        }
    }

    public async Task<List<PermissionDto>> GetRolePermissionsAsync(Guid roleId)
    {
        try
        {
            var rolePerms = await _context.RolePermissions.AsNoTracking()
                .Include(rp => rp.Permission)
                .Where(rp => rp.RoleId == roleId)
                .ToListAsync();

            return rolePerms.Select(rp => new PermissionDto
            {
                Code = rp.Permission?.PermissionCode,
                Name = rp.Permission?.PermissionName,
                Module = rp.Permission?.Module,
                Description = rp.Permission?.Description
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetRolePermissionsAsync");
            return new List<PermissionDto>();
        }
    }

    public async Task<bool> UpdateRolePermissionsAsync(Guid roleId, List<Guid> permissionIds)
    {
        try
        {
            var existing = await _context.RolePermissions.Where(rp => rp.RoleId == roleId).ToListAsync();
            _context.RolePermissions.RemoveRange(existing);

            foreach (var permId in permissionIds)
            {
                _context.RolePermissions.Add(new RolePermission
                {
                    RoleId = roleId,
                    PermissionId = permId
                });
            }
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UpdateRolePermissionsAsync");
            return false;
        }
    }

    public async Task<List<PermissionDto>> GetUserPermissionsAsync(Guid userId)
    {
        try
        {
            var userRoles = await _context.UserRoles.AsNoTracking()
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.RoleId)
                .ToListAsync();

            var perms = await _context.RolePermissions.AsNoTracking()
                .Include(rp => rp.Permission)
                .Where(rp => userRoles.Contains(rp.RoleId))
                .ToListAsync();

            return perms
                .Select(rp => rp.Permission)
                .Where(p => p != null)
                .DistinctBy(p => p.Id)
                .Select(p => new PermissionDto
                {
                    Code = p.PermissionCode,
                    Name = p.PermissionName,
                    Module = p.Module,
                    Description = p.Description
                }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetUserPermissionsAsync");
            return new List<PermissionDto>();
        }
    }

    public async Task<bool> UpdateUserPermissionsAsync(Guid userId, List<Guid> permissionIds)
    {
        // User permissions are managed through roles in this system
        _logger.LogWarning("UpdateUserPermissionsAsync: Permissions are managed through roles");
        return false;
    }

}
