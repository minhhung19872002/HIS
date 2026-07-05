using HIS.Application.DTOs.RadiologyDispatch;

namespace HIS.Application.Interfaces;

/// <summary>
/// Điều phối CĐHA (RIS dispatch) + phân quyền phòng/máy. Logic tách khỏi
/// RadiologyDispatchController (#202) — controller chỉ điều phối HTTP, service giữ DbContext.
/// Behavior-preserving: giữ nguyên projection/response shape + luồng bridge model 1→4.
/// </summary>
public interface IRadiologyDispatchService
{
    // ── Dispatch ─────────────────────────────────────────────────────────────
    /// <summary>Tạo/cập nhật phiếu điều phối. Trả { success, id, updated }.</summary>
    Task<object> DispatchAsync(CreateDispatchDto dto, Guid userId);

    /// <summary>Hủy phiếu. Trả false nếu đã thực hiện (controller → 400); throw KeyNotFound nếu không tồn tại.</summary>
    Task<bool> CancelAsync(Guid id);

    Task MarkArrivedAsync(Guid id);

    /// <summary>Đánh dấu đã thực hiện + bridge ServiceRequestDetail (model 1) → RadiologyRequest (model 4).</summary>
    Task MarkPerformedAsync(Guid id, Guid userId);

    Task<object> RoomQueueAsync(Guid roomId);

    Task<object> PendingServicesAsync(bool overdueOnly);

    // ── Permissions ──────────────────────────────────────────────────────────
    Task SavePermissionAsync(SavePermissionDto dto, Guid userId);

    /// <summary>Copy quyền từ user này sang user khác. Trả { success, copied }.</summary>
    Task<object> CopyPermissionsAsync(Guid fromUserId, Guid toUserId, Guid userId);

    Task<object> UserPermissionsAsync(Guid userId);

    Task DeletePermissionAsync(Guid id);
}
