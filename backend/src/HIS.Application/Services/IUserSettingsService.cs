using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IUserSettingsService
{
    /// <summary>Lấy tất cả settings của user hiện tại.</summary>
    Task<List<UserSettingDto>> GetAllAsync(Guid userId);

    /// <summary>Lấy một setting theo key. Trả null nếu chưa có.</summary>
    Task<string?> GetValueAsync(Guid userId, string key);

    /// <summary>Lưu (upsert) một setting.</summary>
    Task UpsertAsync(Guid userId, string settingKey, string? value, string actorId);

    /// <summary>Batch upsert nhiều settings cùng lúc.</summary>
    Task UpsertManyAsync(Guid userId, IEnumerable<UpdateUserSettingDto> settings, string actorId);

    /// <summary>Lấy lab default roles (convenience wrapper).</summary>
    Task<LabDefaultRoleDto> GetLabDefaultRolesAsync(Guid userId);

    /// <summary>Lưu lab default roles.</summary>
    Task SaveLabDefaultRolesAsync(Guid userId, LabDefaultRoleDto dto, string actorId);
}
