using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Application.Services;
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
}
