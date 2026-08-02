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

    // ===== INLINE SAFETY CHECKS (called at point of action, not background) =====

    /// <summary>Rule 35: Blood type mismatch — called when creating blood request</summary>
    Task<AlertCheckResultDto> CheckBloodTypeMismatchAsync(Guid patientId, string requestedBloodType, string? requestedRhFactor);

    /// <summary>Rule 36: BHYT CLS daily limit — called when ordering CLS</summary>
    Task<AlertCheckResultDto> CheckBhytClsDailyLimitAsync(Guid patientId, int newOrderCount);

    /// <summary>Rule 37: ICD-BHYT protocol compliance — called when prescribing BHYT drugs</summary>
    Task<AlertCheckResultDto> CheckIcdBhytProtocolAsync(Guid patientId, string icdCode, List<Guid> medicineIds);

    /// <summary>Rule 38: Previous unfilled prescription — called at registration</summary>
    Task<AlertCheckResultDto> CheckUnfilledPrescriptionsAsync(Guid patientId);

    /// <summary>Rule 40: Clinic overload — doctor or room exceeds daily visit threshold (default 65)</summary>
    Task<AlertCheckResultDto> CheckClinicOverloadAsync(Guid? doctorId, Guid? roomId, DateTime? date);

    /// <summary>Rule 39: Cost estimation at registration — not an alert, returns breakdown</summary>
    Task<CostEstimationResultDto> EstimateCostAsync(Guid patientId, List<Guid> serviceIds);

    /// <summary>#455: Dự toán viện phí không cần patientId — dùng trước khi đăng ký</summary>
    Task<CostEstimationResultDto> EstimateCostDirectAsync(CostEstimateDirectRequestDto dto);


    // ===== SPECIAL TEST RULE CRUD (F2.13) =====

    Task<SpecialTestRulePagedResult> GetSpecialTestRulesAsync(SpecialTestRuleSearchDto search);
    Task<SpecialTestRuleDto?> GetSpecialTestRuleByIdAsync(Guid id);
    Task<SpecialTestRuleDto> SaveSpecialTestRuleAsync(SpecialTestRuleSaveDto dto, string userId);
    Task<bool> DeleteSpecialTestRuleAsync(Guid id, string userId);
}
