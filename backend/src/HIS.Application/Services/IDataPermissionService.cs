using HIS.Application.DTOs.System;

namespace HIS.Application.Services;

/// <summary>
/// NangCap26 — I.15 Quyền dữ liệu phòng/kho · I.16 Phân quyền dữ liệu người dùng.
/// Row-level scope, tách biệt với quyền chức năng (menu/permission) đã có.
/// </summary>
public interface IDataPermissionService
{
    Task<List<DataPermissionGroupDto>> GetGroupsAsync(bool activeOnly = false);
    Task<DataPermissionGroupDto> SaveGroupAsync(SaveDataPermissionGroupDto dto, Guid userId);
    Task DeleteGroupAsync(Guid id, Guid userId);

    Task<List<Guid>> GetUserGroupsAsync(Guid targetUserId);
    Task AssignUserGroupsAsync(AssignDataPermissionDto dto, Guid userId);

    /// <summary>
    /// Phạm vi hiệu lực sau khi gộp các nhóm được gán.
    /// Unrestricted = true khi user chưa gán nhóm nào (fail-open).
    /// </summary>
    Task<EffectiveDataScopeDto> GetEffectiveScopeAsync(Guid targetUserId);
}
