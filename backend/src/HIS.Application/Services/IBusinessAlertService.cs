using HIS.Application.DTOs.BusinessAlert;

namespace HIS.Application.Services;

public interface IBusinessAlertService
{
    // Check alerts by category
    Task<AlertCheckResultDto> CheckOpdAlertsAsync(Guid patientId, Guid? examinationId);
    Task<AlertCheckResultDto> CheckInpatientAlertsAsync(Guid patientId, Guid? admissionId);
    Task<AlertCheckResultDto> CheckRadiologyAlertsAsync(Guid patientId, Guid? requestId);
    Task<AlertCheckResultDto> CheckLabAlertsAsync(Guid patientId, Guid? requestId);
    Task<AlertCheckResultDto> CheckPharmacyAlertsAsync();
    Task<AlertCheckResultDto> CheckBillingAlertsAsync(Guid patientId);

    // Query alerts
    Task<BusinessAlertPagedResult> GetActiveAlertsAsync(BusinessAlertSearchDto search);

    // Actions
    Task<BusinessAlertDto?> AcknowledgeAlertAsync(Guid alertId, string userId, BusinessAlertAcknowledgeDto dto);
    Task<bool> ResolveAlertAsync(Guid alertId, string userId);

    // Rules catalog
    Task<List<BusinessAlertRuleDto>> GetAlertRulesAsync();
}
