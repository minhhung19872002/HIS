namespace HIS.Application.Services;

/// <summary>
/// AUTHZ-4 (#370) increment-2: Separation of Duties — grant-time check.
/// Chặn gán 2 role/permission xung đột (SoDConstraints, EnforcedAt='grant') cho 1 user.
/// Kill-switch `Auth:SoDEnabled` (mặc định FALSE) — OFF thì no-op (0 đổi hành vi).
/// Runtime check (approver≠creator) = increment sau (wire vào approval paths, cần smoke).
/// </summary>
public interface ISoDService
{
    /// <summary>
    /// Đảm bảo tập roleIds gán cho 1 user KHÔNG chứa cặp xung đột SoD (grant-time).
    /// Enforcement OFF / không có ràng buộc → no-op. Xung đột → throw InvalidOperationException
    /// (controller filter map → 409/400).
    /// </summary>
    Task EnsureNoGrantTimeConflictAsync(IReadOnlyCollection<Guid> roleIds);
}
