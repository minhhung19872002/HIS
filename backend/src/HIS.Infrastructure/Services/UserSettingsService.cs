using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class UserSettingsService : IUserSettingsService
{
    private readonly HISDbContext _context;

    // Tên key cho lab default roles
    private const string KeyKtvName = "lab.default_ktv_name";
    private const string KeyKtvId = "lab.default_ktv_id";
    private const string KeyApproverName = "lab.default_approver_name";
    private const string KeyApproverId = "lab.default_approver_id";

    public UserSettingsService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<UserSettingDto>> GetAllAsync(Guid userId)
    {
        return await _context.UserSettings
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.SettingKey)
            .Select(s => new UserSettingDto { SettingKey = s.SettingKey, SettingValue = s.SettingValue })
            .ToListAsync();
    }

    public async Task<string?> GetValueAsync(Guid userId, string key)
    {
        var setting = await _context.UserSettings
            .FirstOrDefaultAsync(s => s.UserId == userId && s.SettingKey == key);
        return setting?.SettingValue;
    }

    public async Task UpsertAsync(Guid userId, string settingKey, string? value, string actorId)
    {
        var existing = await _context.UserSettings
            .FirstOrDefaultAsync(s => s.UserId == userId && s.SettingKey == settingKey);

        if (existing == null)
        {
            _context.UserSettings.Add(new UserSetting
            {
                UserId = userId,
                SettingKey = settingKey,
                SettingValue = value,
                CreatedBy = actorId,
            });
        }
        else
        {
            existing.SettingValue = value;
            existing.UpdatedBy = actorId;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    public async Task UpsertManyAsync(Guid userId, IEnumerable<UpdateUserSettingDto> settings, string actorId)
    {
        var keys = settings.Select(s => s.SettingKey).ToList();
        var existing = await _context.UserSettings
            .Where(s => s.UserId == userId && keys.Contains(s.SettingKey))
            .ToListAsync();

        foreach (var dto in settings)
        {
            var rec = existing.FirstOrDefault(e => e.SettingKey == dto.SettingKey);
            if (rec == null)
            {
                _context.UserSettings.Add(new UserSetting
                {
                    UserId = userId,
                    SettingKey = dto.SettingKey,
                    SettingValue = dto.SettingValue,
                    CreatedBy = actorId,
                });
            }
            else
            {
                rec.SettingValue = dto.SettingValue;
                rec.UpdatedBy = actorId;
                rec.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();
    }

    public async Task<LabDefaultRoleDto> GetLabDefaultRolesAsync(Guid userId)
    {
        var keys = new[] { KeyKtvName, KeyKtvId, KeyApproverName, KeyApproverId };
        var settings = await _context.UserSettings
            .Where(s => s.UserId == userId && keys.Contains(s.SettingKey))
            .ToListAsync();

        string? Get(string k) => settings.FirstOrDefault(s => s.SettingKey == k)?.SettingValue;

        return new LabDefaultRoleDto
        {
            DefaultKtvName = Get(KeyKtvName),
            DefaultKtvId = Get(KeyKtvId),
            DefaultApproverName = Get(KeyApproverName),
            DefaultApproverId = Get(KeyApproverId),
        };
    }

    public async Task SaveLabDefaultRolesAsync(Guid userId, LabDefaultRoleDto dto, string actorId)
    {
        var settings = new[]
        {
            new UpdateUserSettingDto { SettingKey = KeyKtvName,      SettingValue = dto.DefaultKtvName },
            new UpdateUserSettingDto { SettingKey = KeyKtvId,        SettingValue = dto.DefaultKtvId },
            new UpdateUserSettingDto { SettingKey = KeyApproverName, SettingValue = dto.DefaultApproverName },
            new UpdateUserSettingDto { SettingKey = KeyApproverId,   SettingValue = dto.DefaultApproverId },
        };

        await UpsertManyAsync(userId, settings, actorId);
    }
}
