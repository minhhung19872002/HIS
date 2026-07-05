using HIS.Application.Common;
using HIS.Application.DTOs.LabCancelChain;

namespace HIS.Application.Interfaces;

/// <summary>
/// M3.14 — Hủy chuỗi ngược workflow XN. Logic tách khỏi LabCancelChainController (#202
/// thin-controller). Behavior-preserving: giữ nguyên validate/projection/response shape +
/// message; userId truyền từ controller (thay cho GetUserId() cũ đọc claim).
/// </summary>
public interface ILabCancelChainService
{
    /// <summary>Step 1: Hủy duyệt kết quả (đã duyệt → bỏ duyệt, giữ KQ).</summary>
    Task<ServiceOutcome> CancelApprovalAsync(CancelRequest dto, Guid userId);

    /// <summary>Step 2: Hủy kết quả (Có KQ → Đang TH). Phải hủy duyệt trước.</summary>
    Task<ServiceOutcome> CancelResultAsync(CancelRequest dto, Guid userId);

    /// <summary>Step 3: Hủy lấy/nhận mẫu (→ Chờ lấy mẫu). Phải hủy KQ trước.</summary>
    Task<ServiceOutcome> CancelCollectionAsync(CancelRequest dto, Guid userId);
}
