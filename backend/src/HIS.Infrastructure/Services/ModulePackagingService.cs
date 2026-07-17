using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// #405: đọc/ghi cờ EnabledModules từ bảng SystemConfigs (key 'EnabledModules', JSON array) —
/// đổi gói không cần redeploy. Migration 147 seed FULL set cho deployment hiện hữu
/// (không đổi hành vi prod đang chạy); deploy mới chưa có row → Gói Phòng khám mặc định.
/// </summary>
public class ModulePackagingService : IModulePackagingService
{
    public const string ConfigKey = "EnabledModules";
    private readonly HISDbContext _context;

    public ModulePackagingService(HISDbContext context) => _context = context;

    public async Task<List<string>> GetEnabledModulesAsync()
    {
        var row = await _context.SystemConfigs.AsNoTracking()
            .FirstOrDefaultAsync(c => c.ConfigKey == ConfigKey && c.IsActive);
        if (row == null || string.IsNullOrWhiteSpace(row.ConfigValue))
            return CommercialModules.DefaultClinicPackage.ToList();

        try
        {
            var list = JsonSerializer.Deserialize<List<string>>(row.ConfigValue) ?? new List<string>();
            return Normalize(list);
        }
        catch (JsonException)
        {
            // Row hỏng → fail-safe về gói mặc định (không throw sập FE)
            return CommercialModules.DefaultClinicPackage.ToList();
        }
    }

    public async Task<List<string>> SetEnabledModulesAsync(List<string> modules, string updatedBy)
    {
        var normalized = Normalize(modules ?? new List<string>());
        var row = await _context.SystemConfigs
            .FirstOrDefaultAsync(c => c.ConfigKey == ConfigKey);
        var json = JsonSerializer.Serialize(normalized);
        var now = DateTime.UtcNow;

        if (row == null)
        {
            _context.SystemConfigs.Add(new SystemConfig
            {
                Id = Guid.NewGuid(),
                ConfigKey = ConfigKey,
                ConfigValue = json,
                ConfigType = "JSON",
                Description = "#405 module packaging — danh sách module thương mại đang bật",
                IsActive = true,
                CreatedAt = now,
                CreatedBy = updatedBy,
            });
        }
        else
        {
            row.ConfigValue = json;
            row.IsActive = true;
            row.UpdatedAt = now;
            row.UpdatedBy = updatedBy;
        }
        await _context.SaveChangesAsync();
        return normalized;
    }

    /// <summary>Loại mã ngoài catalog + union CORE (không tắt được) + chuẩn hoá case/dedup.</summary>
    private static List<string> Normalize(IEnumerable<string> input)
    {
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var m in input)
        {
            var v = (m ?? string.Empty).Trim();
            if (CommercialModules.AllValid.Contains(v))
                set.Add(v.Equals(CommercialModules.Extended, StringComparison.OrdinalIgnoreCase)
                    ? CommercialModules.Extended
                    : v.ToUpperInvariant());
        }
        foreach (var core in CommercialModules.Core) set.Add(core);
        return set.OrderBy(x => x).ToList();
    }
}
