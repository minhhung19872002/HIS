namespace HIS.Application.Services;

/// <summary>
/// AUTHZ-1 (#367): resolve tập permission hiệu lực của user (qua UserRoles→RolePermissions) server-side.
/// Cache IMemoryCache TTL ngắn (mặc định 30s, config Auth:PermissionCacheSeconds) — đổi quyền hiệu lực ≤TTL,
/// đồng nhất pattern SecurityStamp của AUTHZ-2. (PermVersion instant-invalidation → phase sau nếu cần.)
/// </summary>
public interface IPermissionService
{
    /// <summary>Tập PermissionCode hiệu lực của user (rỗng nếu user không tồn tại/khóa).</summary>
    Task<IReadOnlySet<string>> GetPermissionSetAsync(Guid userId);

    /// <summary>User có permission này không (đọc từ cache-set).</summary>
    Task<bool> HasPermissionAsync(Guid userId, string permissionCode);
}
