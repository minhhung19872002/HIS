using HIS.Application.Common;
using HIS.Application.DTOs.OfficeSupply;

namespace HIS.Application.Interfaces;

/// <summary>
/// Logic VPP / TTB văn phòng — tách khỏi OfficeSupplyController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape/business math giữ nguyên;
/// userId truyền từ controller (thay cho GetUserId() cũ đọc claim).
/// </summary>
public interface IOfficeSupplyService
{
    Task<ServiceOutcome> CatalogAsync(string? keyword, int? supplyType);
    Task<ServiceOutcome> RequestsAsync(int? status, Guid? departmentId);
    Task<ServiceOutcome> CreateRequestAsync(CreateOfficeRequestDto dto, Guid userId);
    Task<ServiceOutcome> RecallAsync(Guid id, string? note, Guid userId);
    Task<ServiceOutcome> ApproveAsync(ApproveOfficeDto dto, Guid userId);
    Task<ServiceOutcome> ReturnsAsync(int? status, Guid? departmentId);
    Task<ServiceOutcome> CreateReturnAsync(CreateReturnDto dto, Guid userId);
    Task<ServiceOutcome> ApproveReturnAsync(ApproveReturnDto dto, Guid userId);
}
