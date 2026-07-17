using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using HIS.Application.Services;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// AUTHZ-4 (#370): SoD grant-time check dựa trên bảng SoDConstraints (migration 148).
/// Kill-switch `Auth:SoDEnabled` mặc định FALSE → no-op (0 đổi hành vi tới khi bật + smoke).
/// </summary>
public class SoDService : ISoDService
{
    private readonly HISDbContext _context;
    private readonly IConfiguration _configuration;

    public SoDService(HISDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    private bool Enabled => string.Equals(
        _configuration["Auth:SoDEnabled"], "true", StringComparison.OrdinalIgnoreCase);

    public async Task EnsureNoGrantTimeConflictAsync(IReadOnlyCollection<Guid> roleIds)
    {
        if (!Enabled || roleIds == null || roleIds.Count < 2) return;

        // Ràng buộc role-role, enforce lúc gán (grant), đang bật.
        var constraints = await _context.SoDConstraints.AsNoTracking()
            .Where(c => c.IsActive && !c.IsDeleted
                && c.ConstraintType == "role-role" && c.EnforcedAt == "grant"
                && c.RoleAId != null && c.RoleBId != null)
            .Select(c => new { A = c.RoleAId!.Value, B = c.RoleBId!.Value })
            .ToListAsync();

        var set = new HashSet<Guid>(roleIds);
        foreach (var c in constraints)
        {
            if (set.Contains(c.A) && set.Contains(c.B))
                throw new InvalidOperationException(
                    "Vi phạm phân tách nhiệm vụ (SoD): hai vai trò xung đột không được gán cùng một người dùng.");
        }
    }
}
