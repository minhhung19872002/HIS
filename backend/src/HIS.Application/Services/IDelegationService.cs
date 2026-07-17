using HIS.Application.DTOs.Delegation;

namespace HIS.Application.Services;

/// <summary>
/// AUTHZ-4 (#370): Ủy quyền tạm (Delegation) — resolve + auto-expire + admin CRUD.
/// Grantor ủy 1 Role cho Grantee trong [ValidFrom, ValidTo]; KHÔNG re-delegation; auto-expire.
/// Kill-switch <c>Auth:DelegationEnabled</c> (mặc định FALSE) — OFF thì resolve trả rỗng (0 đổi hành vi).
/// Wire tập role được ủy vào PermissionService (enforcement) = bước sau, cần smoke.
/// </summary>
public interface IDelegationService
{
    /// <summary>
    /// Tập RoleId đang được ủy hợp lệ cho <paramref name="granteeId"/> tại thời điểm hiện tại
    /// (Status=Active, ValidFrom ≤ now ≤ ValidTo). Kill-switch OFF → rỗng.
    /// </summary>
    Task<IReadOnlyList<Guid>> ResolveActiveDelegatedRoleIdsAsync(Guid granteeId);

    /// <summary>
    /// Data-hygiene: đánh dấu các ủy quyền Active (Status=0) đã quá ValidTo → Expired (Status=1).
    /// Trả số bản ghi đổi. Dùng bởi DelegationExpiryWorker (nền). Thuần dọn dữ liệu — an toàn
    /// gọi kể cả khi feature dormant (không có bản ghi nào để đổi).
    /// </summary>
    Task<int> ExpirePastDueAsync(CancellationToken ct = default);

    // ── Admin CRUD (AUTHZ-4 inc-3 #370) ─────────────────────────────────────────────
    // Tất cả additive/dormant — DelegationEnabled=false → enforce chưa có hiệu lực.

    /// <summary>Liệt kê toàn bộ ủy quyền (mọi Status), dùng cho admin UI.</summary>
    Task<IReadOnlyList<DelegationGrantDto>> GetGrantsAsync();

    /// <summary>Tạo ủy quyền mới. Validate ValidFrom &lt; ValidTo; KHÔNG re-delegation.</summary>
    Task<DelegationGrantDto> CreateGrantAsync(CreateDelegationGrantDto dto, Guid grantorId);

    /// <summary>Thu hồi ủy quyền (Status→2-Revoked). Chỉ áp cho Active grant.</summary>
    Task<bool> RevokeGrantAsync(Guid grantId, string revokedByUsername);
}
