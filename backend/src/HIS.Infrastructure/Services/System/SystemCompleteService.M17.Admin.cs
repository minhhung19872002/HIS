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
    #region Module 17: Quan tri He thong - 10 chuc nang

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
                // Remove existing role assignments
                var existingRoles = await _context.UserRoles.Where(ur => ur.UserId == userId).ToListAsync();
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

    // 17.4 Nhat ky he thong
    public async Task<List<AuditLogDto>> GetAuditLogsAsync(AuditLogSearchDto search)
    {
        try
        {
            var query = _context.AuditLogs.AsNoTracking().AsQueryable();

            if (search?.FromDate.HasValue == true)
                query = query.Where(l => l.CreatedAt >= search.FromDate.Value);
            if (search?.ToDate.HasValue == true)
                query = query.Where(l => l.CreatedAt <= search.ToDate.Value);
            if (search?.UserId.HasValue == true)
                query = query.Where(l => l.UserId == search.UserId.Value);
            if (!string.IsNullOrWhiteSpace(search?.Action))
                query = query.Where(l => l.Action == search.Action);
            if (!string.IsNullOrWhiteSpace(search?.EntityType))
                query = query.Where(l => l.TableName == search.EntityType || l.EntityType == search.EntityType);

            // Keyword search across username, action, entity type, details
            if (!string.IsNullOrWhiteSpace(search?.Keyword))
            {
                var kw = search.Keyword;
                query = query.Where(l =>
                    (l.Username != null && l.Username.Contains(kw)) ||
                    (l.Action != null && l.Action.Contains(kw)) ||
                    (l.TableName != null && l.TableName.Contains(kw)) ||
                    (l.EntityType != null && l.EntityType.Contains(kw)) ||
                    (l.Details != null && l.Details.Contains(kw)) ||
                    (l.UserFullName != null && l.UserFullName.Contains(kw))
                );
            }

            query = query.OrderByDescending(l => l.CreatedAt);

            if (search?.PageIndex.HasValue == true && search?.PageSize.HasValue == true)
            {
                var skip = search.PageIndex.Value * search.PageSize.Value;
                query = query.Skip(skip).Take(search.PageSize.Value);
            }
            else
            {
                query = query.Take(100);
            }

            var items = await query.ToListAsync();
            return items.Select(l => new AuditLogDto
            {
                Id = l.Id,
                LogTime = l.Timestamp != default ? l.Timestamp : l.CreatedAt,
                UserId = l.UserId,
                Username = l.Username ?? l.UserFullName,
                Action = l.Action,
                Module = l.Module,
                EntityType = l.EntityType ?? l.TableName,
                EntityId = l.EntityId ?? l.RecordId.ToString(),
                OldValue = l.OldValues,
                NewValue = l.NewValues,
                IpAddress = l.IpAddress,
                UserAgent = l.UserAgent
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAuditLogsAsync");
            return new List<AuditLogDto>();
        }
    }

    public async Task<AuditLogDto> GetAuditLogAsync(Guid logId)
    {
        try
        {
            var l = await _context.AuditLogs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == logId);
            if (l == null) return null;
            return new AuditLogDto
            {
                Id = l.Id,
                LogTime = l.Timestamp != default ? l.Timestamp : l.CreatedAt,
                UserId = l.UserId,
                Username = l.Username ?? l.UserFullName,
                Action = l.Action,
                Module = l.Module,
                EntityType = l.EntityType ?? l.TableName,
                EntityId = l.EntityId ?? l.RecordId.ToString(),
                OldValue = l.OldValues,
                NewValue = l.NewValues,
                IpAddress = l.IpAddress,
                UserAgent = l.UserAgent
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAuditLogAsync");
            return null;
        }
    }

    public async Task<byte[]> ExportAuditLogsToExcelAsync(AuditLogSearchDto search)
    {
        try
        {
            var query = _context.Set<AuditLog>().AsNoTracking().AsQueryable();
            if (search?.FromDate.HasValue == true) query = query.Where(a => a.Timestamp >= search.FromDate);
            if (search?.ToDate.HasValue == true) query = query.Where(a => a.Timestamp <= search.ToDate);
            if (!string.IsNullOrWhiteSpace(search?.Action)) query = query.Where(a => a.Action == search.Action);
            if (!string.IsNullOrWhiteSpace(search?.EntityType)) query = query.Where(a => a.EntityType == search.EntityType);

            var logs = await query.OrderByDescending(a => a.Timestamp).Take(2000).ToListAsync();

            var rows = logs.Select(a => new string[] {
                a.Timestamp.ToString("dd/MM/yyyy HH:mm:ss"), a.UserFullName ?? a.Username ?? "",
                a.Action ?? "", a.EntityType ?? "", a.Details ?? "", a.IpAddress ?? ""
            }).ToList();

            var html = BuildTableReport("NHAT KY HE THONG", $"Tong: {logs.Count} ban ghi", DateTime.Now,
                new[] { "Thoi gian", "Nguoi dung", "Hanh dong", "Doi tuong", "Mo ta", "IP" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    // 17.5 Cau hinh he thong
    public async Task<List<SystemConfigDto>> GetSystemConfigsAsync(string category = null)
    {
        try
        {
            var query = _context.SystemConfigs.AsNoTracking()
                .Where(c => c.IsActive)
                .AsQueryable();

            // Filter by category (convention: ConfigKey prefix before '.' is the category)
            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(c => c.ConfigKey.StartsWith(category + ".") || c.ConfigType == category);

            var items = await query.OrderBy(c => c.ConfigKey).ToListAsync();
            return items.Select(c => new SystemConfigDto
            {
                Key = c.ConfigKey,
                Value = c.ConfigValue,
                DataType = c.ConfigType,
                Description = c.Description,
                Category = c.ConfigKey.Contains('.') ? c.ConfigKey.Substring(0, c.ConfigKey.IndexOf('.')) : "General",
                IsEditable = true
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemConfigsAsync");
            return new List<SystemConfigDto>();
        }
    }

    public async Task<SystemConfigDto> GetSystemConfigAsync(string configKey)
    {
        try
        {
            var c = await _context.SystemConfigs.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ConfigKey == configKey);
            if (c == null) return null;
            return new SystemConfigDto
            {
                Key = c.ConfigKey,
                Value = c.ConfigValue,
                DataType = c.ConfigType,
                Description = c.Description,
                Category = c.ConfigKey.Contains('.') ? c.ConfigKey.Substring(0, c.ConfigKey.IndexOf('.')) : "General",
                IsEditable = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemConfigAsync");
            return null;
        }
    }

    public async Task<SystemConfigDto> SaveSystemConfigAsync(SystemConfigDto dto)
    {
        try
        {
            var entity = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == dto.Key);

            if (entity == null)
            {
                entity = new SystemConfig
                {
                    ConfigKey = dto.Key ?? string.Empty,
                    ConfigValue = dto.Value ?? string.Empty,
                    ConfigType = dto.DataType ?? "String",
                    Description = dto.Description,
                    IsActive = true
                };
                _context.SystemConfigs.Add(entity);
            }
            else
            {
                entity.ConfigValue = dto.Value ?? entity.ConfigValue;
                entity.ConfigType = dto.DataType ?? entity.ConfigType;
                entity.Description = dto.Description;
            }
            await _context.SaveChangesAsync();
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveSystemConfigAsync");
            return null;
        }
    }

    public async Task<bool> DeleteSystemConfigAsync(string configKey)
    {
        try
        {
            var entity = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == configKey);
            if (entity == null) return false;
            entity.IsDeleted = true;
            entity.IsActive = false;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in DeleteSystemConfigAsync");
            return false;
        }
    }

    // 17.6 Quan ly phien dang nhap
    public async Task<List<UserSessionDto>> GetActiveSessionsAsync(Guid? userId = null)
    {
        try
        {
            var query = _context.UserSessions.AsNoTracking()
                .Include(s => s.User)
                .Where(s => s.Status == 0) // 0 = Active
                .AsQueryable();

            if (userId.HasValue)
                query = query.Where(s => s.UserId == userId.Value);

            var items = await query.OrderByDescending(s => s.LoginTime).Take(200).ToListAsync();
            return items.Select(s => new UserSessionDto
            {
                Id = s.Id,
                UserId = s.UserId,
                Username = s.User != null ? $"{s.User.Username} ({s.User.FullName})" : null,
                IpAddress = s.IPAddress,
                UserAgent = s.UserAgent,
                LoginTime = s.LoginTime,
                LastActivityTime = s.LogoutTime ?? s.LoginTime,
                IsActive = s.Status == 0
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetActiveSessionsAsync");
            return new List<UserSessionDto>();
        }
    }

    public async Task<bool> TerminateSessionAsync(Guid sessionId)
    {
        try
        {
            var session = await _context.UserSessions.FirstOrDefaultAsync(s => s.Id == sessionId);
            if (session == null) return false;
            session.Status = 2; // Logged out
            session.LogoutTime = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in TerminateSessionAsync");
            return false;
        }
    }

    public async Task<bool> TerminateAllSessionsAsync(Guid userId)
    {
        try
        {
            var sessions = await _context.UserSessions
                .Where(s => s.UserId == userId && s.Status == 0)
                .ToListAsync();

            foreach (var session in sessions)
            {
                session.Status = 2;
                session.LogoutTime = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in TerminateAllSessionsAsync");
            return false;
        }
    }

    // 17.7 Quan ly thong bao he thong
    public async Task<List<SystemNotificationDto>> GetSystemNotificationsAsync(bool? isActive = null)
    {
        try
        {
            var query = _context.Notifications.AsNoTracking()
                .Where(n => !n.IsDeleted)
                .AsQueryable();

            if (isActive.HasValue)
            {
                if (isActive.Value)
                    query = query.Where(n => !n.IsRead);
                else
                    query = query.Where(n => n.IsRead);
            }

            var items = await query.OrderByDescending(n => n.CreatedAt).Take(100).ToListAsync();
            return items.Select(n => new SystemNotificationDto
            {
                Id = n.Id,
                Title = n.Title,
                Message = n.Content,
                NotificationType = n.NotificationType,
                StartTime = n.CreatedAt,
                IsActive = !n.IsRead,
                CreatedBy = n.CreatedBy,
                CreatedAt = n.CreatedAt
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemNotificationsAsync");
            return new List<SystemNotificationDto>();
        }
    }

    public async Task<SystemNotificationDto> GetSystemNotificationAsync(Guid notificationId)
    {
        try
        {
            var n = await _context.Notifications.AsNoTracking()
                .Include(x => x.TargetUser)
                .FirstOrDefaultAsync(x => x.Id == notificationId);
            if (n == null) return null;
            return new SystemNotificationDto
            {
                Id = n.Id,
                Title = n.Title,
                Message = n.Content,
                NotificationType = n.NotificationType,
                StartTime = n.CreatedAt,
                IsActive = !n.IsRead,
                TargetUsers = n.TargetUserId.HasValue ? new List<Guid> { n.TargetUserId.Value } : new List<Guid>(),
                CreatedBy = n.CreatedBy,
                CreatedAt = n.CreatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemNotificationAsync");
            return null;
        }
    }

    public async Task<SystemNotificationDto> SaveSystemNotificationAsync(SystemNotificationDto dto)
    {
        try
        {
            Notification entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Notification
                {
                    Title = dto.Title ?? string.Empty,
                    Content = dto.Message ?? string.Empty,
                    NotificationType = dto.NotificationType ?? "Info",
                    TargetUserId = dto.TargetUsers?.FirstOrDefault(),
                    IsRead = false
                };
                _context.Notifications.Add(entity);

                // If multiple target users, create a notification for each
                if (dto.TargetUsers?.Count > 1)
                {
                    foreach (var targetUserId in dto.TargetUsers.Skip(1))
                    {
                        _context.Notifications.Add(new Notification
                        {
                            Title = dto.Title ?? string.Empty,
                            Content = dto.Message ?? string.Empty,
                            NotificationType = dto.NotificationType ?? "Info",
                            TargetUserId = targetUserId,
                            IsRead = false
                        });
                    }
                }
            }
            else
            {
                entity = await _context.Notifications.FirstOrDefaultAsync(n => n.Id == dto.Id);
                if (entity == null) return null;
                entity.Title = dto.Title ?? entity.Title;
                entity.Content = dto.Message ?? entity.Content;
                entity.NotificationType = dto.NotificationType ?? entity.NotificationType;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveSystemNotificationAsync");
            return null;
        }
    }

    public async Task<bool> DeleteSystemNotificationAsync(Guid notificationId)
    {
        return await SoftDeleteEntityAsync<Notification>(notificationId);
    }

    // 17.8 Sao luu du lieu
    public async Task<List<BackupHistoryDto>> GetBackupHistoryAsync(
        DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            // Query SQL Server backup history from msdb system database
            var results = new List<BackupHistoryDto>();

            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT
                    bs.backup_set_id,
                    bs.name,
                    CASE bs.type
                        WHEN 'D' THEN 'Full'
                        WHEN 'I' THEN 'Differential'
                        WHEN 'L' THEN 'TransactionLog'
                        ELSE bs.type
                    END AS BackupType,
                    bmf.physical_device_name AS FilePath,
                    bs.backup_size,
                    bs.backup_start_date,
                    bs.user_name,
                    CASE
                        WHEN bs.backup_finish_date IS NOT NULL THEN 'Completed'
                        ELSE 'InProgress'
                    END AS Status
                FROM msdb.dbo.backupset bs
                INNER JOIN msdb.dbo.backupmediafamily bmf ON bs.media_set_id = bmf.media_set_id
                WHERE bs.database_name = DB_NAME()
                ORDER BY bs.backup_start_date DESC";

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var backupDate = reader.GetDateTime(5);
                if (fromDate.HasValue && backupDate < fromDate.Value) continue;
                if (toDate.HasValue && backupDate > toDate.Value) continue;

                results.Add(new BackupHistoryDto
                {
                    Id = Guid.NewGuid(), // backup_set_id is int, generate GUID for DTO
                    BackupName = reader.IsDBNull(1) ? $"Backup_{backupDate:yyyyMMdd}" : reader.GetString(1),
                    BackupType = reader.GetString(2),
                    FilePath = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                    FileSize = reader.IsDBNull(4) ? 0 : Convert.ToInt64(reader.GetDecimal(4)),
                    BackupDate = backupDate,
                    BackupBy = reader.IsDBNull(6) ? string.Empty : reader.GetString(6),
                    Status = reader.GetString(7)
                });
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBackupHistoryAsync (msdb query may require elevated permissions)");
            return new List<BackupHistoryDto>();
        }
    }

    public async Task<BackupHistoryDto> CreateBackupAsync(CreateBackupDto dto)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
        var backupName = string.IsNullOrEmpty(dto.BackupName)
            ? $"HIS_Backup_{timestamp}" : dto.BackupName;
        // Docker volume mapping: ./backup:/var/opt/mssql/backup (see docker-compose.yml)
        var backupPath = $"/var/opt/mssql/backup/{backupName}.bak";

        var sql = (dto.BackupType?.ToUpper()) switch
        {
            "DIFFERENTIAL" => $"BACKUP DATABASE [HIS] TO DISK = N'{backupPath}' WITH DIFFERENTIAL, COMPRESSION, STATS = 10, NAME = N'{backupName}'",
            "LOG" or "TRANSACTIONLOG" => $"BACKUP LOG [HIS] TO DISK = N'{backupPath}' WITH COMPRESSION, STATS = 10, NAME = N'{backupName}'",
            _ => $"BACKUP DATABASE [HIS] TO DISK = N'{backupPath}' WITH COMPRESSION, STATS = 10, NAME = N'{backupName}'"
        };

        try
        {
            _logger.LogInformation("Starting database backup: {BackupName}, Type: {BackupType}, Path: {BackupPath}",
                backupName, dto.BackupType ?? "Full", backupPath);

            await _context.Database.ExecuteSqlRawAsync(sql);

            _logger.LogInformation("Database backup completed successfully: {BackupName}", backupName);

            return new BackupHistoryDto
            {
                Id = Guid.NewGuid(),
                BackupName = backupName,
                BackupType = dto.BackupType ?? "Full",
                FilePath = backupPath,
                BackupDate = DateTime.UtcNow,
                Status = "Completed"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database backup failed: {BackupName}", backupName);
            return new BackupHistoryDto
            {
                Id = Guid.NewGuid(),
                BackupName = backupName,
                BackupType = dto.BackupType ?? "Full",
                FilePath = backupPath,
                BackupDate = DateTime.UtcNow,
                Status = $"Failed: {ex.Message}"
            };
        }
    }

    public async Task<bool> RestoreBackupAsync(Guid backupId)
    {
        // Retrieve backup info from msdb history to get the file path
        var history = await GetBackupHistoryAsync();
        var backup = history.FirstOrDefault(b => b.Id == backupId);

        // Since GetBackupHistoryAsync generates new GUIDs each call, also try matching by file path
        // In practice, the UI should pass the file path directly or use a stable identifier.
        // For now, search across all history entries for the given ID.
        if (backup == null || string.IsNullOrEmpty(backup.FilePath))
        {
            _logger.LogWarning("RestoreBackupAsync: Backup {BackupId} not found in history", backupId);
            return false;
        }

        try
        {
            _logger.LogWarning("Starting database restore from: {FilePath}. This requires exclusive access.", backup.FilePath);

            // RESTORE requires exclusive access - set DB to single-user first.
            // WARNING: This is a dangerous operation and should only be done by admin.
            var sql = $@"
                ALTER DATABASE [HIS] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                RESTORE DATABASE [HIS] FROM DISK = N'{backup.FilePath}' WITH REPLACE;
                ALTER DATABASE [HIS] SET MULTI_USER;";

            await _context.Database.ExecuteSqlRawAsync(sql);

            _logger.LogInformation("Database restore completed successfully from: {FilePath}", backup.FilePath);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database restore failed for backup {BackupId}, FilePath: {FilePath}", backupId, backup.FilePath);

            // Attempt to set back to multi-user mode if restore failed mid-way
            try
            {
                await _context.Database.ExecuteSqlRawAsync("ALTER DATABASE [HIS] SET MULTI_USER;");
            }
            catch (Exception innerEx)
            {
                _logger.LogError(innerEx, "Failed to restore multi-user mode after failed restore");
            }

            return false;
        }
    }

    public async Task<bool> DeleteBackupAsync(Guid backupId)
    {
        _logger.LogWarning("DeleteBackupAsync: Not implemented");
        return false;
    }

    // 17.9 Giam sat he thong
    public async Task<SystemHealthDto> GetSystemHealthAsync()
    {
        var dbStatus = "Unknown";
        try
        {
            var canConnect = await _context.Database.CanConnectAsync();
            dbStatus = canConnect ? "Healthy" : "Unhealthy";
        }
        catch
        {
            dbStatus = "Unhealthy";
        }

        // Memory usage from current process
        double memoryUsagePct = 0;
        try
        {
            var process = System.Diagnostics.Process.GetCurrentProcess();
            var workingSetMB = process.WorkingSet64 / (1024.0 * 1024.0);
            // Approximate: ratio of working set to 2GB as a simple metric
            memoryUsagePct = Math.Round(workingSetMB / 2048.0 * 100, 1);
            if (memoryUsagePct > 100) memoryUsagePct = 99;
        }
        catch { /* ignore process access errors */ }

        // Disk usage from application directory
        double diskUsagePct = 0;
        try
        {
            var appDir = AppDomain.CurrentDomain.BaseDirectory;
            var driveInfo = new System.IO.DriveInfo(System.IO.Path.GetPathRoot(appDir) ?? "C");
            if (driveInfo.IsReady && driveInfo.TotalSize > 0)
            {
                var usedBytes = driveInfo.TotalSize - driveInfo.AvailableFreeSpace;
                diskUsagePct = Math.Round((double)usedBytes / driveInfo.TotalSize * 100, 1);
            }
        }
        catch { /* ignore disk access errors */ }

        var overallStatus = dbStatus == "Healthy" ? "Healthy" : "Degraded";
        if (memoryUsagePct > 90 || diskUsagePct > 95) overallStatus = "Degraded";

        return new SystemHealthDto
        {
            Status = overallStatus,
            CpuUsage = 0, // CPU requires PerformanceCounter or OS-specific API
            MemoryUsage = memoryUsagePct,
            DiskUsage = diskUsagePct,
            DatabaseStatus = dbStatus,
            LastCheckTime = DateTime.UtcNow
        };
    }

    public async Task<List<SystemResourceDto>> GetSystemResourcesAsync()
    {
        try
        {
            var resources = new List<SystemResourceDto>();

            // Memory stats from GC and Process
            var process = System.Diagnostics.Process.GetCurrentProcess();
            var workingSetMB = process.WorkingSet64 / (1024.0 * 1024.0);
            var gcTotalMemMB = GC.GetTotalMemory(false) / (1024.0 * 1024.0);
            var maxWorkingSetMB = process.PeakWorkingSet64 / (1024.0 * 1024.0);

            resources.Add(new SystemResourceDto
            {
                ResourceName = "Process Memory",
                ResourceType = "RAM",
                CurrentValue = Math.Round(workingSetMB, 1),
                MaxValue = Math.Round(maxWorkingSetMB, 1),
                UtilizationPercentage = maxWorkingSetMB > 0 ? Math.Round(workingSetMB / maxWorkingSetMB * 100, 1) : 0
            });

            resources.Add(new SystemResourceDto
            {
                ResourceName = "GC Managed Memory",
                ResourceType = "RAM",
                CurrentValue = Math.Round(gcTotalMemMB, 1),
                MaxValue = Math.Round(workingSetMB, 1),
                UtilizationPercentage = workingSetMB > 0 ? Math.Round(gcTotalMemMB / workingSetMB * 100, 1) : 0
            });

            // Thread pool stats
            System.Threading.ThreadPool.GetAvailableThreads(out var workerAvail, out var ioAvail);
            System.Threading.ThreadPool.GetMaxThreads(out var workerMax, out var ioMax);
            var workerInUse = workerMax - workerAvail;

            resources.Add(new SystemResourceDto
            {
                ResourceName = "Thread Pool Workers",
                ResourceType = "Threads",
                CurrentValue = workerInUse,
                MaxValue = workerMax,
                UtilizationPercentage = workerMax > 0 ? Math.Round((double)workerInUse / workerMax * 100, 1) : 0
            });

            // Database connection check
            var dbConnected = await _context.Database.CanConnectAsync();
            resources.Add(new SystemResourceDto
            {
                ResourceName = "Database",
                ResourceType = "Connection",
                CurrentValue = dbConnected ? 1 : 0,
                MaxValue = 1,
                UtilizationPercentage = dbConnected ? 100 : 0
            });

            // Active user sessions count
            var activeSessions = await _context.UserSessions.CountAsync(s => s.Status == 0);
            resources.Add(new SystemResourceDto
            {
                ResourceName = "Active Sessions",
                ResourceType = "Sessions",
                CurrentValue = activeSessions,
                MaxValue = 1000, // arbitrary max
                UtilizationPercentage = Math.Round(activeSessions / 10.0, 1) // % of 1000
            });

            return resources;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemResourcesAsync");
            return new List<SystemResourceDto>
            {
                new SystemResourceDto { ResourceName = "CPU", ResourceType = "Processor", CurrentValue = 0, MaxValue = 100, UtilizationPercentage = 0 },
                new SystemResourceDto { ResourceName = "Memory", ResourceType = "RAM", CurrentValue = 0, MaxValue = 100, UtilizationPercentage = 0 },
                new SystemResourceDto { ResourceName = "Disk", ResourceType = "Storage", CurrentValue = 0, MaxValue = 100, UtilizationPercentage = 0 }
            };
        }
    }

    public async Task<List<DatabaseStatisticsDto>> GetDatabaseStatisticsAsync()
    {
        try
        {
            var results = new List<DatabaseStatisticsDto>();

            // Use raw SQL to query SQL Server system views for table statistics
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT
                    t.NAME AS TableName,
                    p.rows AS RowCount,
                    SUM(a.total_pages) * 8 AS TotalSpaceKB,
                    SUM(a.used_pages) * 8 AS UsedSpaceKB,
                    (SUM(a.total_pages) - SUM(a.used_pages)) * 8 AS UnusedSpaceKB
                FROM sys.tables t
                INNER JOIN sys.indexes i ON t.OBJECT_ID = i.object_id
                INNER JOIN sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
                INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
                WHERE t.NAME NOT LIKE 'dt%'
                    AND t.is_ms_shipped = 0
                    AND i.OBJECT_ID > 255
                GROUP BY t.Name, p.Rows
                ORDER BY p.Rows DESC";

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new DatabaseStatisticsDto
                {
                    TableName = reader.GetString(0),
                    RowCount = reader.GetInt64(1),
                    DataSize = reader.GetInt64(2) * 1024, // Convert KB to bytes
                    IndexSize = reader.GetInt64(3) * 1024  // UsedSpace as index proxy
                });
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDatabaseStatisticsAsync");
            return new List<DatabaseStatisticsDto>();
        }
    }

    // 17.10 Quan ly tich hop (backed by HIEConnections table)
    public async Task<List<IntegrationConfigDto>> GetIntegrationConfigsAsync(bool? isActive = null)
    {
        try
        {
            var query = _context.HIEConnections.AsNoTracking().AsQueryable();

            if (isActive.HasValue)
                query = query.Where(c => c.IsActive == isActive.Value);

            var items = await query.OrderBy(c => c.ConnectionName).ToListAsync();
            return items.Select(c => new IntegrationConfigDto
            {
                Id = c.Id,
                IntegrationName = c.ConnectionName,
                IntegrationType = c.ConnectionType,
                Endpoint = c.EndpointUrl,
                AuthType = c.AuthType,
                IsActive = c.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetIntegrationConfigsAsync");
            return new List<IntegrationConfigDto>();
        }
    }

    public async Task<IntegrationConfigDto> GetIntegrationConfigAsync(Guid integrationId)
    {
        try
        {
            var c = await _context.HIEConnections.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == integrationId);
            if (c == null) return null;
            return new IntegrationConfigDto
            {
                Id = c.Id,
                IntegrationName = c.ConnectionName,
                IntegrationType = c.ConnectionType,
                Endpoint = c.EndpointUrl,
                AuthType = c.AuthType,
                IsActive = c.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetIntegrationConfigAsync");
            return null;
        }
    }

    public async Task<IntegrationConfigDto> SaveIntegrationConfigAsync(IntegrationConfigDto dto)
    {
        try
        {
            HIEConnection entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new HIEConnection
                {
                    ConnectionName = dto.IntegrationName ?? string.Empty,
                    ConnectionType = dto.IntegrationType ?? string.Empty,
                    EndpointUrl = dto.Endpoint ?? string.Empty,
                    AuthType = dto.AuthType ?? "APIKey",
                    IsActive = dto.IsActive
                };
                _context.HIEConnections.Add(entity);
            }
            else
            {
                entity = await _context.HIEConnections.FirstOrDefaultAsync(c => c.Id == dto.Id);
                if (entity == null) return null;
                entity.ConnectionName = dto.IntegrationName ?? entity.ConnectionName;
                entity.ConnectionType = dto.IntegrationType ?? entity.ConnectionType;
                entity.EndpointUrl = dto.Endpoint ?? entity.EndpointUrl;
                entity.AuthType = dto.AuthType ?? entity.AuthType;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveIntegrationConfigAsync");
            return null;
        }
    }

    public async Task<bool> TestIntegrationConnectionAsync(Guid integrationId)
    {
        try
        {
            var conn = await _context.HIEConnections.FirstOrDefaultAsync(c => c.Id == integrationId);
            if (conn == null) return false;

            // Attempt a basic HTTP HEAD request to the endpoint
            using var httpClient = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            var response = await httpClient.SendAsync(new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Head, conn.EndpointUrl));

            if (response.IsSuccessStatusCode)
            {
                conn.LastSuccessfulConnection = DateTime.UtcNow;
                conn.Status = "Active";
                conn.LastErrorMessage = null;
            }
            else
            {
                conn.LastFailedConnection = DateTime.UtcNow;
                conn.Status = "Error";
                conn.LastErrorMessage = $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}";
            }
            await _context.SaveChangesAsync();
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in TestIntegrationConnectionAsync");
            // Update connection status on failure
            try
            {
                var conn = await _context.HIEConnections.FirstOrDefaultAsync(c => c.Id == integrationId);
                if (conn != null)
                {
                    conn.LastFailedConnection = DateTime.UtcNow;
                    conn.Status = "Error";
                    conn.LastErrorMessage = ex.Message;
                    await _context.SaveChangesAsync();
                }
            }
            catch { /* swallow nested exception */ }
            return false;
        }
    }

    public async Task<List<IntegrationLogDto>> GetIntegrationLogsAsync(
        Guid integrationId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            // Query SystemLogs that reference integration activities
            var conn = await _context.HIEConnections.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == integrationId);
            if (conn == null) return new List<IntegrationLogDto>();

            var query = _context.SystemLogs.AsNoTracking()
                .Where(l => l.Message.Contains(conn.ConnectionName) || l.Message.Contains("Integration"))
                .AsQueryable();

            if (fromDate.HasValue)
                query = query.Where(l => l.CreatedAt >= fromDate.Value);
            if (toDate.HasValue)
                query = query.Where(l => l.CreatedAt <= toDate.Value);

            var items = await query.OrderByDescending(l => l.CreatedAt).Take(100).ToListAsync();
            return items.Select(l => new IntegrationLogDto
            {
                Id = l.Id,
                IntegrationId = integrationId,
                IntegrationName = conn.ConnectionName,
                RequestTime = l.CreatedAt,
                ResponseTime = l.CreatedAt,
                Status = l.LogType,
                ErrorMessage = l.Exception
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetIntegrationLogsAsync");
            return new List<IntegrationLogDto>();
        }
    }

    // 17.11 Khoa dich vu (Service Locking)
    public async Task<List<LockedServiceDto>> GetLockedServicesAsync()
    {
        return await _context.LockedServices
            .OrderByDescending(l => l.LockedAt)
            .Select(l => new LockedServiceDto
            {
                Id = l.Id,
                ServiceId = l.ServiceId,
                ServiceName = l.ServiceName,
                ServiceCode = l.ServiceCode,
                ServiceType = l.ServiceType,
                ServiceTypeName = l.ServiceTypeName,
                IsLocked = l.IsLocked,
                LockReason = l.LockReason,
                LockedBy = l.LockedBy,
                LockedByName = l.LockedByName,
                LockedAt = l.LockedAt,
                UnlockedAt = l.UnlockedAt
            }).ToListAsync();
    }

    public async Task<LockedServiceDto> LockServiceAsync(LockServiceRequestDto dto, string userId, string userName)
    {
        // Check if already locked
        var existing = await _context.LockedServices
            .FirstOrDefaultAsync(l => l.ServiceId == dto.ServiceId && l.IsLocked);
        if (existing != null)
            throw new InvalidOperationException($"Service {dto.ServiceId} is already locked");

        var entity = new LockedService
        {
            Id = Guid.NewGuid(),
            ServiceId = dto.ServiceId,
            IsLocked = true,
            LockReason = dto.Reason,
            LockedBy = userId,
            LockedByName = userName,
            LockedAt = DateTime.UtcNow
        };

        // Try to resolve service name/code/type from Medicine, MedicalSupply, or Service tables
        var medicine = await _context.Medicines.FirstOrDefaultAsync(m => m.Id == dto.ServiceId);
        if (medicine != null)
        {
            entity.ServiceCode = medicine.MedicineCode;
            entity.ServiceName = medicine.MedicineName;
            entity.ServiceType = 1;
            entity.ServiceTypeName = "Thuốc";
        }
        else
        {
            var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == dto.ServiceId);
            if (service != null)
            {
                entity.ServiceCode = service.ServiceCode;
                entity.ServiceName = service.ServiceName;
                entity.ServiceType = 3;
                entity.ServiceTypeName = "DVKT";
            }
            else
            {
                entity.ServiceCode = "N/A";
                entity.ServiceName = "N/A";
                entity.ServiceType = 0;
                entity.ServiceTypeName = "Khác";
            }
        }

        _context.LockedServices.Add(entity);
        await _context.SaveChangesAsync();

        return new LockedServiceDto
        {
            Id = entity.Id,
            ServiceId = entity.ServiceId,
            ServiceName = entity.ServiceName,
            ServiceCode = entity.ServiceCode,
            ServiceType = entity.ServiceType,
            ServiceTypeName = entity.ServiceTypeName,
            IsLocked = entity.IsLocked,
            LockReason = entity.LockReason,
            LockedBy = entity.LockedBy,
            LockedByName = entity.LockedByName,
            LockedAt = entity.LockedAt,
            UnlockedAt = entity.UnlockedAt
        };
    }

    public async Task<bool> UnlockServiceAsync(UnlockServiceRequestDto dto)
    {
        var entity = await _context.LockedServices
            .FirstOrDefaultAsync(l => l.ServiceId == dto.ServiceId && l.IsLocked);
        if (entity == null) return false;
        entity.IsLocked = false;
        entity.UnlockedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion
    #region 17.12 Yêu cầu CNTT (IT Tickets)

    public async Task<List<ItTicketDto>> GetItTicketsAsync(ItTicketSearchDto search)
    {
        try
        {
            // Try to query ItTickets table if it exists
            var sql = "SELECT TOP 200 * FROM ItTickets WHERE 1=1";
            var conditions = new List<string>();
            if (search.Status.HasValue) conditions.Add($"Status = {search.Status.Value}");
            if (search.Priority.HasValue) conditions.Add($"Priority = {search.Priority.Value}");
            if (!string.IsNullOrEmpty(search.Keyword)) conditions.Add($"(Title LIKE '%{search.Keyword}%' OR Description LIKE '%{search.Keyword}%')");
            if (conditions.Any()) sql += " AND " + string.Join(" AND ", conditions);
            sql += " ORDER BY CreatedAt DESC";

            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = sql;
            using var reader = await command.ExecuteReaderAsync();

            var results = new List<ItTicketDto>();
            while (await reader.ReadAsync())
            {
                results.Add(new ItTicketDto
                {
                    Id = reader.GetGuid(reader.GetOrdinal("Id")),
                    Title = reader.GetString(reader.GetOrdinal("Title")),
                    Description = reader.IsDBNull(reader.GetOrdinal("Description")) ? "" : reader.GetString(reader.GetOrdinal("Description")),
                    DepartmentName = reader.IsDBNull(reader.GetOrdinal("DepartmentName")) ? "" : reader.GetString(reader.GetOrdinal("DepartmentName")),
                    RequestedByName = reader.IsDBNull(reader.GetOrdinal("RequestedByName")) ? "" : reader.GetString(reader.GetOrdinal("RequestedByName")),
                    Priority = reader.GetInt32(reader.GetOrdinal("Priority")),
                    Status = reader.GetInt32(reader.GetOrdinal("Status")),
                    Response = reader.IsDBNull(reader.GetOrdinal("Response")) ? null : reader.GetString(reader.GetOrdinal("Response")),
                    AssignedToName = reader.IsDBNull(reader.GetOrdinal("AssignedToName")) ? null : reader.GetString(reader.GetOrdinal("AssignedToName")),
                    CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
                    ResolvedAt = reader.IsDBNull(reader.GetOrdinal("ResolvedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("ResolvedAt")),
                });
            }
            return results;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ItTickets table may not exist, returning empty list");
            return new List<ItTicketDto>();
        }
    }

    public async Task<ItTicketDto> CreateItTicketAsync(CreateItTicketDto dto, string userId, string userName, string departmentName)
    {
        try
        {
            var id = Guid.NewGuid();
            var now = DateTime.UtcNow;
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = @"INSERT INTO ItTickets (Id, Title, Description, DepartmentName, RequestedByName, Priority, Status, CreatedAt, CreatedBy)
                VALUES (@Id, @Title, @Description, @DepartmentName, @RequestedByName, @Priority, 0, @CreatedAt, @CreatedBy)";

            var p1 = command.CreateParameter(); p1.ParameterName = "@Id"; p1.Value = id; command.Parameters.Add(p1);
            var p2 = command.CreateParameter(); p2.ParameterName = "@Title"; p2.Value = dto.Title; command.Parameters.Add(p2);
            var p3 = command.CreateParameter(); p3.ParameterName = "@Description"; p3.Value = dto.Description ?? ""; command.Parameters.Add(p3);
            var p4 = command.CreateParameter(); p4.ParameterName = "@DepartmentName"; p4.Value = departmentName ?? ""; command.Parameters.Add(p4);
            var p5 = command.CreateParameter(); p5.ParameterName = "@RequestedByName"; p5.Value = userName; command.Parameters.Add(p5);
            var p6 = command.CreateParameter(); p6.ParameterName = "@Priority"; p6.Value = dto.Priority; command.Parameters.Add(p6);
            var p7 = command.CreateParameter(); p7.ParameterName = "@CreatedAt"; p7.Value = now; command.Parameters.Add(p7);
            var p8 = command.CreateParameter(); p8.ParameterName = "@CreatedBy"; p8.Value = userId; command.Parameters.Add(p8);

            await command.ExecuteNonQueryAsync();

            return new ItTicketDto
            {
                Id = id,
                Title = dto.Title,
                Description = dto.Description,
                DepartmentName = departmentName,
                RequestedByName = userName,
                Priority = dto.Priority,
                Status = 0,
                CreatedAt = now,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create IT ticket (table may not exist)");
            // Return a stub response so the API doesn't break
            return new ItTicketDto
            {
                Id = Guid.NewGuid(),
                Title = dto.Title,
                Description = dto.Description,
                DepartmentName = departmentName,
                RequestedByName = userName,
                Priority = dto.Priority,
                Status = 0,
                CreatedAt = DateTime.UtcNow,
            };
        }
    }

    public async Task<ItTicketDto> RespondToItTicketAsync(Guid ticketId, RespondItTicketDto dto, string respondedByName)
    {
        try
        {
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = @"UPDATE ItTickets SET Response = @Response, AssignedToName = @AssignedToName, Status = 1, ResolvedAt = @ResolvedAt WHERE Id = @Id";

            var p1 = command.CreateParameter(); p1.ParameterName = "@Id"; p1.Value = ticketId; command.Parameters.Add(p1);
            var p2 = command.CreateParameter(); p2.ParameterName = "@Response"; p2.Value = dto.Response; command.Parameters.Add(p2);
            var p3 = command.CreateParameter(); p3.ParameterName = "@AssignedToName"; p3.Value = respondedByName; command.Parameters.Add(p3);
            var p4 = command.CreateParameter(); p4.ParameterName = "@ResolvedAt"; p4.Value = DateTime.UtcNow; command.Parameters.Add(p4);

            await command.ExecuteNonQueryAsync();

            return new ItTicketDto
            {
                Id = ticketId,
                Response = dto.Response,
                AssignedToName = respondedByName,
                Status = 1,
                ResolvedAt = DateTime.UtcNow,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to respond to IT ticket {TicketId}", ticketId);
            return new ItTicketDto { Id = ticketId, Response = dto.Response, AssignedToName = respondedByName, Status = 1 };
        }
    }

    public async Task<bool> CloseItTicketAsync(Guid ticketId)
    {
        try
        {
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "UPDATE ItTickets SET Status = 3, ResolvedAt = @ResolvedAt WHERE Id = @Id";

            var p1 = command.CreateParameter(); p1.ParameterName = "@Id"; p1.Value = ticketId; command.Parameters.Add(p1);
            var p2 = command.CreateParameter(); p2.ParameterName = "@ResolvedAt"; p2.Value = DateTime.UtcNow; command.Parameters.Add(p2);

            await command.ExecuteNonQueryAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to close IT ticket {TicketId}", ticketId);
            return false;
        }
    }

    public async Task<ItTicketStatsDto> GetItTicketStatsAsync()
    {
        try
        {
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = @"SELECT
                SUM(CASE WHEN Status = 0 THEN 1 ELSE 0 END) AS NewCount,
                SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END) AS InProgressCount,
                SUM(CASE WHEN Status = 2 THEN 1 ELSE 0 END) AS ResolvedCount,
                SUM(CASE WHEN Status = 3 THEN 1 ELSE 0 END) AS ClosedCount,
                COUNT(*) AS TotalCount
                FROM ItTickets";

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return new ItTicketStatsDto
                {
                    NewCount = reader.IsDBNull(0) ? 0 : reader.GetInt32(0),
                    InProgressCount = reader.IsDBNull(1) ? 0 : reader.GetInt32(1),
                    ResolvedCount = reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
                    ClosedCount = reader.IsDBNull(3) ? 0 : reader.GetInt32(3),
                    TotalCount = reader.IsDBNull(4) ? 0 : reader.GetInt32(4),
                };
            }
            return new ItTicketStatsDto();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ItTickets table may not exist, returning empty stats");
            return new ItTicketStatsDto();
        }
    }

    #endregion
    #region 13.19 Chi nhánh bệnh viện (NangCap15 1.21)

    public async Task<List<HospitalBranchDto>> GetBranchesAsync(string? keyword = null, bool? isActive = null)
    {
        try
        {
            var query = _context.HospitalBranches
                .Where(b => !b.IsDeleted);

            if (!string.IsNullOrEmpty(keyword))
                query = query.Where(b => b.BranchCode.Contains(keyword) || b.BranchName.Contains(keyword));

            if (isActive.HasValue)
                query = query.Where(b => b.IsActive == isActive.Value);

            var branches = await query
                .OrderBy(b => b.BranchCode)
                .ToListAsync();

            var allBranches = branches.ToList();
            return allBranches.Select(b => new HospitalBranchDto
            {
                Id = b.Id,
                BranchCode = b.BranchCode,
                BranchName = b.BranchName,
                Address = b.Address,
                PhoneNumber = b.PhoneNumber,
                Email = b.Email,
                ParentBranchId = b.ParentBranchId,
                ParentBranchName = b.ParentBranchId.HasValue
                    ? allBranches.FirstOrDefault(p => p.Id == b.ParentBranchId)?.BranchName
                    : null,
                IsActive = b.IsActive,
                IsHeadquarters = b.IsHeadquarters,
                ChildCount = allBranches.Count(c => c.ParentBranchId == b.Id),
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "HospitalBranches table may not exist, returning empty list");
            return new List<HospitalBranchDto>();
        }
    }

    public async Task<HospitalBranchDto> SaveBranchAsync(HospitalBranchDto dto)
    {
        HospitalBranch entity;
        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            entity = await _context.HospitalBranches.FindAsync(dto.Id.Value)
                ?? throw new KeyNotFoundException($"Branch {dto.Id} not found");
            entity.BranchCode = dto.BranchCode;
            entity.BranchName = dto.BranchName;
            entity.Address = dto.Address;
            entity.PhoneNumber = dto.PhoneNumber;
            entity.Email = dto.Email;
            entity.ParentBranchId = dto.ParentBranchId;
            entity.IsActive = dto.IsActive;
            entity.IsHeadquarters = dto.IsHeadquarters;
            _context.HospitalBranches.Update(entity);
        }
        else
        {
            entity = new HospitalBranch
            {
                Id = Guid.NewGuid(),
                BranchCode = dto.BranchCode,
                BranchName = dto.BranchName,
                Address = dto.Address,
                PhoneNumber = dto.PhoneNumber,
                Email = dto.Email,
                ParentBranchId = dto.ParentBranchId,
                IsActive = dto.IsActive,
                IsHeadquarters = dto.IsHeadquarters,
            };
            await _context.HospitalBranches.AddAsync(entity);
        }
        await _context.SaveChangesAsync();

        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteBranchAsync(Guid branchId)
    {
        var entity = await _context.HospitalBranches.FindAsync(branchId);
        if (entity == null) return false;

        // Soft delete
        entity.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion
}
