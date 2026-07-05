using HIS.Application.Common;
using HIS.Application.DTOs.RadiologyOperations;

namespace HIS.Application.Interfaces;

/// <summary>
/// CĐHA: chỉ định thêm + xuất thuốc/vật tư tại phòng — N1.14 + N1.15.
/// Logic tách khỏi RadiologyOperationsController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape giữ nguyên.
/// </summary>
public interface IRadiologyOperationsService
{
    /// <summary>N1.14 — thêm chỉ định CĐHA mới liên kết cùng HSBA/examination.</summary>
    Task<ServiceOutcome> AddOnAsync(AddOnDto dto, Guid userId);

    /// <summary>N1.15 — xuất thuốc/vật tư tiêu hao tại phòng CĐHA cho BN (FEFO).</summary>
    Task<ServiceOutcome> DispenseAsync(RoomDispenseDto dto, Guid userId);
}
