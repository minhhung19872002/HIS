using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
using HIS.Core.Constants;
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
    // QA-R4: admin self-lockout guards. RoleCode ADMIN / RoleName "Admin" | "Quản trị hệ thống" = the admin role.
    private static readonly string[] AdminRoleNames = { RoleNames.Admin, RoleNames.QuanTriHeThong };

    private Guid? CurrentUserId =>
        Guid.TryParse(_httpCtx.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;

    /// <summary>Throws when <paramref name="userId"/> is the only active admin left (delete/lock/deactivate/de-role).</summary>
    private async Task EnsureNotLastActiveAdminAsync(Guid userId, string action)
    {
        var isAdmin = await _context.UserRoles.AnyAsync(ur => ur.UserId == userId && !ur.IsDeleted
            && (ur.Role.RoleCode == "ADMIN" || AdminRoleNames.Contains(ur.Role.RoleName)));
        if (!isAdmin) return;
        var otherAdmins = await _context.UserRoles.CountAsync(ur => ur.UserId != userId && !ur.IsDeleted
            && ur.User.IsActive && !ur.User.IsDeleted
            && (ur.Role.RoleCode == "ADMIN" || AdminRoleNames.Contains(ur.Role.RoleName)));
        if (otherAdmins == 0)
            throw new InvalidOperationException($"Không thể {action} tài khoản quản trị cuối cùng của hệ thống");
    }

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
                UserType = u.UserType,
                UserTypeName = UserTypes.Name(u.UserType),
                Roles = u.UserRoles?.Select(ur => ur.Role?.RoleName).Where(r => r != null).ToList() ?? new List<string>(),
                Permissions = new List<string>(),
                IsActive = u.IsActive,
                IsLocked = !u.IsActive || (u.LockoutEndAt.HasValue && u.LockoutEndAt.Value > DateTime.UtcNow),
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
                UserType = u.UserType,
                UserTypeName = UserTypes.Name(u.UserType),
                Roles = u.UserRoles?.Select(ur => ur.Role?.RoleName).Where(r => r != null).ToList() ?? new List<string>(),
                Permissions = permissions,
                IsActive = u.IsActive,
                IsLocked = !u.IsActive || (u.LockoutEndAt.HasValue && u.LockoutEndAt.Value > DateTime.UtcNow),
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
                // #216 TC-PERM-015: mật khẩu khởi tạo là thứ admin biết → buộc đổi ở lần đăng nhập đầu.
                MustChangePassword = true,
                PasswordChangedAt = DateTime.UtcNow,
                IsActive = true,
                // Trước đây hard-code 5 nên KHÔNG thể tạo bác sĩ qua màn quản trị.
                UserType = dto.UserType ?? UserTypes.Employee
            };
            _context.Users.Add(user);

            // Assign roles — AUTHZ-3: RoleAssignments có scope info; fallback RoleIds với ScopeType='ORG'
            var roleNames = new List<string>();
            var effectiveRoleIds = dto.RoleAssignments?.Select(a => a.RoleId).ToList() ?? dto.RoleIds ?? new();
            if (effectiveRoleIds.Any())
            {
                // AUTHZ-4 (#370): SoD grant-time check (no-op khi Auth:SoDEnabled=false)
                await _sodService.EnsureNoGrantTimeConflictAsync(effectiveRoleIds);

                var roles = await _context.Roles.AsNoTracking()
                    .Where(r => effectiveRoleIds.Contains(r.Id))
                    .ToListAsync();
                roleNames = roles.Select(r => r.RoleName).ToList();

                var grantedBy = _httpCtx.HttpContext?.User?.FindFirst(ClaimTypes.Name)?.Value ?? "system";
                foreach (var assignment in dto.RoleAssignments ?? effectiveRoleIds.Select(id => new RoleAssignmentDto { RoleId = id }))
                {
                    _context.UserRoles.Add(new UserRole
                    {
                        UserId = user.Id,
                        RoleId = assignment.RoleId,
                        ScopeType = assignment.ScopeType,
                        ScopeId = assignment.ScopeId,
                        ValidTo = assignment.ValidTo,
                        GrantedBy = grantedBy,
                        GrantReason = assignment.GrantReason,
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
                UserType = user.UserType,
                UserTypeName = UserTypes.Name(user.UserType),
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
                .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy người dùng");

            // QA-R4: an admin could deactivate their own account / the last admin from the user form.
            if (!dto.IsActive && user.IsActive)
            {
                if (userId == CurrentUserId)
                    throw new InvalidOperationException("Không thể vô hiệu hoá tài khoản đang đăng nhập");
                await EnsureNotLastActiveAdminAsync(userId, "vô hiệu hoá");
            }

            user.FullName = dto.FullName ?? user.FullName;
            user.Email = dto.Email;
            user.PhoneNumber = dto.PhoneNumber;
            user.DepartmentId = dto.DepartmentId;
            user.BranchId = dto.BranchId; // R3 đa cơ sở
            user.IsActive = dto.IsActive;
            // NULL = giữ nguyên: client cũ không gửi trường này thì không đổi loại nhân sự.
            if (dto.UserType.HasValue) user.UserType = dto.UserType.Value;

            // Sync roles — AUTHZ-3: RoleAssignments có scope info; fallback RoleIds với ScopeType='ORG'
            var incomingAssignments = dto.RoleAssignments;
            var incomingRoleIds = incomingAssignments?.Select(a => a.RoleId).ToList() ?? dto.RoleIds;
            if (incomingRoleIds != null)
            {
                // AUTHZ-4 (#370): SoD grant-time check (no-op khi Auth:SoDEnabled=false)
                await _sodService.EnsureNoGrantTimeConflictAsync(incomingRoleIds);

                // Remove existing role assignments
                var existingRoles = await _context.UserRoles.Where(ur => ur.UserId == userId).ToListAsync();
                var oldRoleIds = existingRoles.Select(r => r.RoleId).ToHashSet();
                var newRoleIds = incomingRoleIds.ToHashSet();

                // QA-R4: unknown role ids were a swallowed FK error → 200 {data:null}; removing the admin role from
                // yourself / the last admin locked the whole system out of administration.
                var adminRoleIds = await _context.Roles
                    .Where(r => r.RoleCode == "ADMIN" || AdminRoleNames.Contains(r.RoleName))
                    .Select(r => r.Id).ToListAsync();
                var knownRoleIds = await _context.Roles.Where(r => newRoleIds.Contains(r.Id) && !r.IsDeleted).Select(r => r.Id).ToListAsync();
                if (knownRoleIds.Count != newRoleIds.Count)
                    throw new ArgumentException("Có vai trò không tồn tại trong danh sách gán", nameof(dto.RoleIds));
                if (oldRoleIds.Overlaps(adminRoleIds) && !newRoleIds.Overlaps(adminRoleIds))
                {
                    if (userId == CurrentUserId)
                        throw new InvalidOperationException("Không thể tự gỡ vai trò quản trị của chính mình");
                    await EnsureNotLastActiveAdminAsync(userId, "gỡ vai trò quản trị của");
                }
                _context.UserRoles.RemoveRange(existingRoles);

                // Add new role assignments with scope
                var grantedBy = _httpCtx.HttpContext?.User?.FindFirst(ClaimTypes.Name)?.Value ?? "system";
                foreach (var assignment in incomingAssignments ?? incomingRoleIds.Select(id => new RoleAssignmentDto { RoleId = id }))
                {
                    _context.UserRoles.Add(new UserRole
                    {
                        UserId = userId,
                        RoleId = assignment.RoleId,
                        ScopeType = assignment.ScopeType,
                        ScopeId = assignment.ScopeId,
                        ValidTo = assignment.ValidTo,
                        GrantedBy = grantedBy,
                        GrantReason = assignment.GrantReason,
                    });
                }

                // #371 inc-2: record permission change history (who changed which roles)
                await RecordRoleChangeHistoryAsync(userId, oldRoleIds, newRoleIds);

                // QA0915: role names live in the JWT ([Authorize(Roles=...)] on ~71 controllers), so a
                // REMOVED role kept working until the access token expired (Jwt:ExpireMinutes). Rotate the
                // SecurityStamp only when something was taken away (or a time-bound grant was set) — pure
                // additions don't need to kick the user; they pick the new role up on next refresh/login.
                // Refresh tokens are kept: /auth/refresh re-reads roles from DB.
                var hasTimeBound = incomingAssignments?.Any(a => a.ValidTo.HasValue) == true;
                if (oldRoleIds.Except(newRoleIds).Any() || hasTimeBound)
                {
                    user.SecurityStamp = Guid.NewGuid().ToString("N");
                    user.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
            return await GetUserAsync(userId);
        }
        catch (KeyNotFoundException) { throw; }
        catch (ArgumentException) { throw; }
        catch (InvalidOperationException) { throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UpdateUserAsync");
            return null;
        }
    }

    public async Task<bool> DeleteUserAsync(Guid userId)
    {
        // QA-R4: plain soft-delete — no not-found (200 {data:false}), the admin could delete their own / the
        // last admin account, and the deleted user's tokens kept working until they expired.
        if (userId == CurrentUserId)
            throw new InvalidOperationException("Không thể xoá tài khoản đang đăng nhập");
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy người dùng");
        await EnsureNotLastActiveAdminAsync(userId, "xoá");
        try
        {
            user.IsDeleted = true;
            user.IsActive = false;
            await RevokeAllUserSessionsTrackedAsync(user, "admin_delete");
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in DeleteUserAsync");
            return false;
        }
    }

    public async Task<bool> ResetPasswordAsync(Guid userId)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy người dùng");
            user.PasswordHash = HashPassword("123456"); // Default reset password
            // #216 TC-PERM-015: mật khẩu mặc định ai cũng đoán được → buộc đổi ngay lần đăng nhập tới.
            user.MustChangePassword = true;
            user.PasswordChangedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            // QA0915: reset is the incident-response path for a compromised account — without this the
            // attacker's access token + refresh token kept working (refresh even rotated forever).
            await RevokeAllUserSessionsTrackedAsync(user, "admin_reset_password");
            await _context.SaveChangesAsync();
            return true;
        }
        catch (KeyNotFoundException) { throw; }
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

            // #216 TC-PERM-015 (lỗi tìm ra khi đo): hàm này NHẬN `CurrentPassword` rồi bỏ qua, và
            // endpoint gọi nó được miễn gate quyền với chú thích "đổi mật khẩu của chính mình" —
            // nhưng route nhận {userId} BẤT KỲ. Hệ quả: ai đã đăng nhập cũng đặt được mật khẩu mới
            // cho bất kỳ tài khoản nào mà không cần biết mật khẩu cũ. Nay: phải chứng minh biết mật
            // khẩu hiện tại (không biết → dùng reset-password, endpoint đó gate Admin và đặt cờ
            // buộc đổi). Controller còn chặn thêm caller ≠ userId khi không phải Admin.
            if (string.IsNullOrEmpty(dto.CurrentPassword)
                || !BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
                throw new InvalidOperationException("Mật khẩu hiện tại không đúng.");
            if (!string.Equals(dto.NewPassword, dto.ConfirmPassword, StringComparison.Ordinal))
                throw new InvalidOperationException("Mật khẩu xác nhận không khớp.");
            var loi = HIS.Core.Common.PasswordPolicy.Validate(dto.NewPassword, dto.CurrentPassword, user.Username);
            if (loi != null) throw new InvalidOperationException(loi);

            user.PasswordHash = HashPassword(dto.NewPassword);
            user.MustChangePassword = false;
            user.PasswordChangedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            // QA0915: same revocation as AuthService.ChangePasswordAsync (AUTHZ-2 #368).
            await RevokeAllUserSessionsTrackedAsync(user, "password_changed");
            await _context.SaveChangesAsync();
            return true;
        }
        catch (InvalidOperationException)
        {
            // QA0915: the Vietnamese validation messages above must reach the UI (global
            // DomainGuardExceptionFilter → 400) instead of collapsing into a silent 200 {data:false}.
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ChangePasswordAsync");
            return false;
        }
    }

    public async Task<bool> LockUserAsync(Guid userId, string reason)
    {
        // QA-R4: self-lock / last-admin lock were accepted, unknown user was 200 {data:false}, and the locked
        // user's live tokens kept working until expiry (lock is an incident-response action → kick sessions).
        if (userId == CurrentUserId)
            throw new InvalidOperationException("Không thể khoá tài khoản đang đăng nhập");
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy người dùng");
        await EnsureNotLastActiveAdminAsync(userId, "khoá");
        try
        {
            user.IsActive = false;
            await RevokeAllUserSessionsTrackedAsync(user, "admin_lock");
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
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy người dùng");
        try
        {
            user.IsActive = true;
            // QA0915: "Mở khóa" must also clear the brute-force lockout, otherwise a user locked by
            // failed logins stays locked (login keeps returning 401) after the admin unlocks them.
            user.FailedLoginCount = 0;
            user.LockoutEndAt = null;
            user.UpdatedAt = DateTime.UtcNow;
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
        // QA-R4: blank code/name were stored as a "" role, and a duplicate RoleCode hit the unique index →
        // swallowed → 204, so the v2 role editor showed "Đã lưu vai trò" for a role that was never saved.
        var code = dto.Code?.Trim();
        var name = dto.Name?.Trim();
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Mã vai trò là bắt buộc", nameof(dto.Code));
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên vai trò là bắt buộc", nameof(dto.Name));
        try
        {
            if (await _context.Roles.AnyAsync(r => r.RoleCode == code && r.Id != dto.Id))
                throw new InvalidOperationException($"Mã vai trò '{code}' đã tồn tại");

            Role entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Role
                {
                    RoleCode = code,
                    RoleName = name,
                    Description = dto.Description
                };
                _context.Roles.Add(entity);
            }
            else
            {
                entity = await _context.Roles.FirstOrDefaultAsync(r => r.Id == dto.Id && !r.IsDeleted)
                    ?? throw new KeyNotFoundException("Không tìm thấy vai trò");
                entity.RoleCode = code;
                entity.RoleName = name;
                entity.Description = dto.Description;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            dto.Code = code;
            dto.Name = name;
            return dto;
        }
        catch (KeyNotFoundException) { throw; }
        catch (InvalidOperationException) { throw; }
        catch (DbUpdateException) { throw; } // unique index → 409 DUPLICATE via the global filter
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveRoleAsync");
            return null;
        }
    }

    public async Task<bool> DeleteRoleAsync(Guid roleId)
    {
        // QA-R4: a role still assigned to users (ADMIN included) or backing an active delegation could be
        // soft-deleted; unknown id was 200 {data:false}.
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == roleId && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy vai trò");
        var assigned = await _context.UserRoles.CountAsync(ur => ur.RoleId == roleId && !ur.IsDeleted && !ur.User.IsDeleted);
        if (assigned > 0)
            throw new InvalidOperationException($"Vai trò '{role.RoleName}' đang được gán cho {assigned} người dùng — gỡ khỏi người dùng trước khi xoá");
        if (await _context.DelegationGrants.AnyAsync(d => d.RoleId == roleId && d.Status == 0))
            throw new InvalidOperationException($"Vai trò '{role.RoleName}' đang có ủy quyền hiệu lực — thu hồi ủy quyền trước khi xoá");
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
                Id = p.Id,
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
                Id = rp.PermissionId,
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
        // QA-R4: unknown role → orphan RolePermissions rows; unknown permission id → FK error swallowed as
        // 200 {data:false} after the role's existing permissions had already been dropped in the same unit of work.
        if (!await _context.Roles.AnyAsync(r => r.Id == roleId && !r.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy vai trò");
        permissionIds = (permissionIds ?? new List<Guid>()).Distinct().ToList();
        var known = await _context.Permissions.Where(p => permissionIds.Contains(p.Id)).Select(p => p.Id).ToListAsync();
        if (known.Count != permissionIds.Count)
            throw new ArgumentException("Có quyền không tồn tại trong danh sách", nameof(permissionIds));
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
                    Id = p.Id,
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

    public Task<bool> UpdateUserPermissionsAsync(Guid userId, List<Guid> permissionIds)
    {
        // User permissions are managed through roles in this system.
        // QA-R4: was a silent 200 {data:false}; say so (400 INVALID_STATE) instead of pretending to save.
        throw new InvalidOperationException("Quyền được quản lý qua vai trò — hãy gán vai trò cho người dùng");
    }

    /// <summary>
    /// QA0915: revoke every live refresh token of the user and rotate the SecurityStamp (all access tokens
    /// die within the stamp-cache TTL). Tracked changes only — caller saves. Same effect as
    /// <see cref="TerminateAllSessionsAsync"/> minus the UserSessions bookkeeping.
    /// </summary>
    private async Task RevokeAllUserSessionsTrackedAsync(User user, string reason)
    {
        var now = DateTime.UtcNow;
        var tokens = await _context.RefreshTokens
            .Where(t => t.UserId == user.Id && t.RevokedAt == null && !t.IsDeleted)
            .ToListAsync();
        foreach (var t in tokens) { t.RevokedAt = now; t.ReasonRevoked = reason; t.UpdatedAt = now; }
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.UpdatedAt = now;
    }

}
