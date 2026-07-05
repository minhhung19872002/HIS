using HIS.Application.Common;
using HIS.Application.DTOs.PharmacyEnhancement;
using HIS.Core.Entities;

namespace HIS.Application.Interfaces;

/// <summary>
/// Dược nâng cao: cảnh báo hết hạn + pha chế trung tâm.
/// Logic tách khỏi PharmacyEnhancementController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape giữ nguyên.
/// </summary>
public interface IPharmacyEnhancementService
{
    Task<ServiceOutcome> GetExpiryAlertsOnLoginAsync();
    Task<ServiceOutcome> AcknowledgeExpiryAlertAsync(Guid id, Guid userId);
    Task<ServiceOutcome> GetCompoundingOrdersAsync(int? status, Guid? departmentId);
    Task<ServiceOutcome> GetCompoundingOrderAsync(Guid id);
    /// <summary>CompoundingOrder là Core entity — Application có thể reference Core.</summary>
    Task<ServiceOutcome> CreateCompoundingOrderAsync(CompoundingOrder dto, Guid userId);
    Task<ServiceOutcome> StartCompoundingAsync(Guid id, Guid userId);
    Task<ServiceOutcome> CompleteCompoundingAsync(Guid id, Guid userId);
    Task<ServiceOutcome> CancelCompoundingAsync(Guid id, CancelReasonDto dto, Guid userId);
}
