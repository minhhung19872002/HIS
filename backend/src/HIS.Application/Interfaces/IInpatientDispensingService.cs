using HIS.Application.Common;
using HIS.Application.DTOs.InpatientDispensing;

namespace HIS.Application.Interfaces;

/// <summary>
/// Phát thuốc nội trú theo khoa — tách khỏi InpatientDispensingController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape/business math giữ nguyên;
/// userId truyền từ controller (thay cho GetUserId() cũ đọc claim).
/// </summary>
public interface IInpatientDispensingService
{
    Task<ServiceOutcome> PendingAsync(Guid? departmentId, Guid? warehouseId);
    Task<ServiceOutcome> BatchAsync(BatchDispenseDto dto, Guid userId);
    Task<ServiceOutcome> ReceiptAsync(Guid id);
}
