using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Delegation;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <inheritdoc cref="IDelegationService"/>
public class DelegationService : IDelegationService
{
    private readonly HISDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DelegationService> _logger;

    public DelegationService(HISDbContext context, IConfiguration configuration, ILogger<DelegationService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    // Kill-switch AUTHZ-4: OFF (mặc định) → ủy quyền chưa có hiệu lực (resolve rỗng).
    private bool Enabled => string.Equals(
        _configuration["Auth:DelegationEnabled"], "true", StringComparison.OrdinalIgnoreCase);

    public async Task<IReadOnlyList<Guid>> ResolveActiveDelegatedRoleIdsAsync(Guid granteeId)
    {
        if (!Enabled) return Array.Empty<Guid>(); // dormant: chưa bật ủy quyền → không role nào được ủy

        var now = DateTime.UtcNow;
        return await _context.DelegationGrants
            .Where(d => d.GranteeId == granteeId && d.Status == 0 && d.ValidFrom <= now && d.ValidTo >= now)
            .Select(d => d.RoleId)
            .Distinct()
            .ToListAsync();
    }

    public async Task<int> ExpirePastDueAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        try
        {
            return await _context.DelegationGrants
                .Where(d => d.Status == 0 && d.ValidTo < now)
                .ExecuteUpdateAsync(u => u.SetProperty(x => x.Status, 1), ct); // 0-Active → 1-Expired
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "DelegationService: ExpirePastDueAsync lỗi");
            return 0;
        }
    }

    // ── Admin CRUD (inc-3 #370) — additive, kill-switch không ảnh hưởng CRUD ───────

    public async Task<IReadOnlyList<DelegationGrantDto>> GetGrantsAsync()
    {
        var grants = await _context.DelegationGrants
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        // Resolve tên user + role in-memory (tránh EF join phức tạp với navigation chưa config)
        var userIds = grants.SelectMany(g => new[] { g.GrantorId, g.GranteeId }).Distinct().ToList();
        var roleIds = grants.Select(g => g.RoleId).Distinct().ToList();

        var userNames = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, Name = (u.FullName != "" ? u.FullName : null) ?? u.Username })
            .ToDictionaryAsync(u => u.Id, u => u.Name!);

        var roleNames = await _context.Roles
            .Where(r => roleIds.Contains(r.Id))
            .Select(r => new { r.Id, Name = r.RoleName ?? r.RoleCode ?? r.Id.ToString() })
            .ToDictionaryAsync(r => r.Id, r => r.Name);

        return grants.Select(d => new DelegationGrantDto(
            d.Id,
            d.GrantorId,
            userNames.GetValueOrDefault(d.GrantorId, d.GrantorId.ToString()),
            d.GranteeId,
            userNames.GetValueOrDefault(d.GranteeId, d.GranteeId.ToString()),
            d.RoleId,
            roleNames.GetValueOrDefault(d.RoleId, d.RoleId.ToString()),
            d.ValidFrom,
            d.ValidTo,
            d.Reason,
            d.Status,
            d.Status == 0 ? "Đang hoạt động" : d.Status == 1 ? "Đã hết hạn" : "Đã thu hồi",
            d.RevokedAt,
            d.RevokedBy,
            d.CreatedAt
        )).ToList();
    }

    public async Task<DelegationGrantDto> CreateGrantAsync(CreateDelegationGrantDto dto, Guid grantorId)
    {
        if (dto.ValidFrom >= dto.ValidTo)
            throw new ArgumentException("ValidFrom phải trước ValidTo.");

        var grant = new DelegationGrant
        {
            Id = Guid.NewGuid(),
            GrantorId = grantorId,
            GranteeId = dto.GranteeId,
            RoleId = dto.RoleId,
            ValidFrom = dto.ValidFrom,
            ValidTo = dto.ValidTo,
            Reason = dto.Reason,
            Status = 0, // Active
            CreatedAt = DateTime.UtcNow,
        };
        _context.DelegationGrants.Add(grant);
        await _context.SaveChangesAsync();

        var grants = await GetGrantsAsync();
        return grants.First(g => g.Id == grant.Id);
    }

    public async Task<bool> RevokeGrantAsync(Guid grantId, string revokedByUsername)
    {
        var grant = await _context.DelegationGrants.FindAsync(grantId);
        if (grant == null || grant.Status != 0) return false;

        grant.Status = 2; // Revoked
        grant.RevokedAt = DateTime.UtcNow;
        grant.RevokedBy = revokedByUsername;
        await _context.SaveChangesAsync();
        return true;
    }
}
