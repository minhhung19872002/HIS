using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using HIS.Application.Services;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// AUTHZ-1 (#367): resolve permission-set của user từ DB (UserRoles→Role→RolePermissions→Permission),
/// cache IMemoryCache TTL 30s theo userId. Query set-based (không materialize entity đồ thị).
/// </summary>
public class PermissionService : IPermissionService
{
    private readonly HISDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _configuration;
    private readonly IDelegationService? _delegation;

    public PermissionService(HISDbContext context, IMemoryCache cache, IConfiguration configuration,
        IDelegationService? delegation = null)
    {
        _context = context;
        _cache = cache;
        _configuration = configuration;
        _delegation = delegation;
    }

    private int CacheSeconds => int.Parse(_configuration["Auth:PermissionCacheSeconds"] ?? "30");

    public async Task<IReadOnlySet<string>> GetPermissionSetAsync(Guid userId)
    {
        var set = await _cache.GetOrCreateAsync($"permset:{userId}", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(CacheSeconds);
            // User khóa/xóa → set rỗng (default-deny). Join set-based, chỉ kéo về cột PermissionCode.
            var isActive = await _context.Users
                .AnyAsync(u => u.Id == userId && u.IsActive && !u.IsDeleted);
            if (!isActive) return new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var now = DateTime.UtcNow;
            var codes = await _context.UserRoles
                .Where(ur => ur.UserId == userId && !ur.IsDeleted
                    && (ur.ValidFrom == null || ur.ValidFrom <= now)
                    && (ur.ValidTo == null || ur.ValidTo >= now))
                .SelectMany(ur => ur.Role.RolePermissions)
                .Where(rp => !rp.IsDeleted && !rp.Permission.IsDeleted)
                .Select(rp => rp.Permission.PermissionCode)
                .Distinct()
                .ToListAsync();

            // QA-R3 (AUTHZ-4 #370): active delegation grants (ủy quyền tạm) were stored and listed but never applied —
            // the resolver had no caller. Add the delegated roles' permissions. The resolver itself honours the
            // Auth:DelegationEnabled kill-switch (OFF → empty → behaviour unchanged).
            if (_delegation != null)
            {
                var delegatedRoleIds = await _delegation.ResolveActiveDelegatedRoleIdsAsync(userId);
                if (delegatedRoleIds.Count > 0)
                {
                    var delegatedCodes = await _context.RolePermissions
                        .Where(rp => delegatedRoleIds.Contains(rp.RoleId) && !rp.IsDeleted && !rp.Permission.IsDeleted)
                        .Select(rp => rp.Permission.PermissionCode)
                        .Distinct()
                        .ToListAsync();
                    codes.AddRange(delegatedCodes);
                }
            }

            return new HashSet<string>(codes, StringComparer.OrdinalIgnoreCase);
        });
        return set ?? new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    }

    public async Task<bool> HasPermissionAsync(Guid userId, string permissionCode)
    {
        var set = await GetPermissionSetAsync(userId);
        return set.Contains(permissionCode);
    }
}
