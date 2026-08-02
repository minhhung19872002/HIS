using HIS.Application.DTOs.BusinessAlert;
using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/business-alerts")]
[Authorize]
public class BusinessAlertController : ControllerBase
{
    private readonly IBusinessAlertService _alertService;

    public BusinessAlertController(IBusinessAlertService alertService)
    {
        _alertService = alertService;
    }

    /// <summary>
    /// Check OPD alerts for a patient (Rules 1-10)
    /// </summary>
    [HttpGet("check/opd/{patientId}")]
    public async Task<IActionResult> CheckOpdAlerts(Guid patientId, [FromQuery] Guid? examinationId)
    {
        var result = await _alertService.CheckOpdAlertsAsync(patientId, examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Check Inpatient alerts for a patient (Rules 11-24)
    /// </summary>
    [HttpGet("check/inpatient/{patientId}")]
    public async Task<IActionResult> CheckInpatientAlerts(Guid patientId, [FromQuery] Guid? admissionId)
    {
        var result = await _alertService.CheckInpatientAlertsAsync(patientId, admissionId);
        return Ok(result);
    }

    /// <summary>
    /// Check Radiology alerts for a patient (Rules 25-28)
    /// </summary>
    [HttpGet("check/radiology/{patientId}")]
    public async Task<IActionResult> CheckRadiologyAlerts(Guid patientId, [FromQuery] Guid? requestId)
    {
        var result = await _alertService.CheckRadiologyAlertsAsync(patientId, requestId);
        return Ok(result);
    }

    /// <summary>
    /// Check Lab alerts for a patient (Rules 29-31)
    /// </summary>
    [HttpGet("check/lab/{patientId}")]
    public async Task<IActionResult> CheckLabAlerts(Guid patientId, [FromQuery] Guid? requestId)
    {
        var result = await _alertService.CheckLabAlertsAsync(patientId, requestId);
        return Ok(result);
    }

    /// <summary>
    /// Check Pharmacy alerts (Rule 32 - low stock)
    /// </summary>
    [HttpGet("check/pharmacy")]
    public async Task<IActionResult> CheckPharmacyAlerts()
    {
        var result = await _alertService.CheckPharmacyAlertsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Check Billing alerts for a patient (Rules 33-34)
    /// </summary>
    [HttpGet("check/billing/{patientId}")]
    public async Task<IActionResult> CheckBillingAlerts(Guid patientId)
    {
        var result = await _alertService.CheckBillingAlertsAsync(patientId);
        return Ok(result);
    }

    /// <summary>
    /// Get active alerts with filters and pagination
    /// </summary>
    [HttpGet("active")]
    public async Task<IActionResult> GetActiveAlerts([FromQuery] BusinessAlertSearchDto search)
    {
        var result = await _alertService.GetActiveAlertsAsync(search);
        return Ok(result);
    }

    /// <summary>
    /// Acknowledge an alert
    /// </summary>
    [HttpPut("{id}/acknowledge")]
    public async Task<IActionResult> AcknowledgeAlert(Guid id, [FromBody] BusinessAlertAcknowledgeDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        var result = await _alertService.AcknowledgeAlertAsync(id, userId, dto);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// Resolve an alert
    /// </summary>
    [HttpPut("{id}/resolve")]
    public async Task<IActionResult> ResolveAlert(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        var result = await _alertService.ResolveAlertAsync(id, userId);
        if (!result) return NotFound();
        return Ok();
    }

    /// <summary>
    /// Rule 40: Check clinic overload — daily visit count for a doctor or room exceeds threshold (default 65)
    /// </summary>
    [HttpGet("check/clinic-overload")]
    public async Task<IActionResult> CheckClinicOverload(
        [FromQuery] Guid? doctorId,
        [FromQuery] Guid? roomId,
        [FromQuery] DateTime? date)
    {
        var result = await _alertService.CheckClinicOverloadAsync(doctorId, roomId, date);
        return Ok(result);
    }

    /// <summary>
    /// Get all 40 alert rules catalog
    /// </summary>
    [HttpGet("rules")]
    public async Task<IActionResult> GetAlertRules()
    {
        var result = await _alertService.GetAlertRulesAsync();
        return Ok(result);
    }

    // ===== INLINE SAFETY CHECKS (Rules 35-39) =====

    /// <summary>
    /// Rule 35: Check blood type mismatch before blood request
    /// </summary>
    [HttpGet("check/blood-type/{patientId}")]
    public async Task<IActionResult> CheckBloodTypeMismatch(Guid patientId, [FromQuery] string bloodType, [FromQuery] string? rhFactor)
    {
        var result = await _alertService.CheckBloodTypeMismatchAsync(patientId, bloodType, rhFactor);
        return Ok(result);
    }

    /// <summary>
    /// Rule 36: Check BHYT CLS daily limit before ordering
    /// </summary>
    [HttpGet("check/bhyt-cls-limit/{patientId}")]
    public async Task<IActionResult> CheckBhytClsDailyLimit(Guid patientId, [FromQuery] int newOrderCount = 1)
    {
        var result = await _alertService.CheckBhytClsDailyLimitAsync(patientId, newOrderCount);
        return Ok(result);
    }

    /// <summary>
    /// Rule 37: Check ICD-BHYT protocol compliance before prescribing
    /// </summary>
    [HttpPost("check/bhyt-protocol/{patientId}")]
    public async Task<IActionResult> CheckIcdBhytProtocol(Guid patientId, [FromQuery] string icdCode, [FromBody] List<Guid> medicineIds)
    {
        var result = await _alertService.CheckIcdBhytProtocolAsync(patientId, icdCode, medicineIds);
        return Ok(result);
    }

    /// <summary>
    /// Rule 38: Check unfilled prescriptions at registration
    /// </summary>
    [HttpGet("check/unfilled-rx/{patientId}")]
    public async Task<IActionResult> CheckUnfilledPrescriptions(Guid patientId)
    {
        var result = await _alertService.CheckUnfilledPrescriptionsAsync(patientId);
        return Ok(result);
    }

    /// <summary>
    /// Rule 39: Estimate cost for services (BHYT co-pay breakdown)
    /// </summary>
    [HttpPost("estimate-cost/{patientId}")]
    public async Task<IActionResult> EstimateCost(Guid patientId, [FromBody] List<Guid> serviceIds)
    {
        var result = await _alertService.EstimateCostAsync(patientId, serviceIds);
        return Ok(result);
    }

    /// <summary>
    /// #455: Dự toán viện phí — không cần patientId, dùng trước khi đăng ký.
    /// Body: { serviceIds, patientType (1=BHYT/2=VienPhi/3=DichVu), insuranceCoverageRate (%) }
    /// </summary>
    [HttpPost("estimate-cost-direct")]
    public async Task<IActionResult> EstimateCostDirect([FromBody] CostEstimateDirectRequestDto dto)
    {
        var result = await _alertService.EstimateCostDirectAsync(dto);
        return Ok(result);
    }

    // ===== SPECIAL TEST RULE CRUD (F2.13) =====

    /// <summary>
    /// List special test rules with pagination + keyword filter
    /// </summary>
    [HttpGet("special-test-rules")]
    public async Task<IActionResult> GetSpecialTestRules([FromQuery] SpecialTestRuleSearchDto search)
    {
        var result = await _alertService.GetSpecialTestRulesAsync(search);
        return Ok(result);
    }

    /// <summary>
    /// Get a single special test rule by Id
    /// </summary>
    [HttpGet("special-test-rules/{id}")]
    public async Task<IActionResult> GetSpecialTestRuleById(Guid id)
    {
        var result = await _alertService.GetSpecialTestRuleByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// Create or update a special test rule (id == null or empty → create)
    /// </summary>
    [HttpPost("special-test-rules")]
    public async Task<IActionResult> SaveSpecialTestRule([FromBody] SpecialTestRuleSaveDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        var result = await _alertService.SaveSpecialTestRuleAsync(dto, userId);
        return Ok(result);
    }

    /// <summary>
    /// Soft-delete a special test rule
    /// </summary>
    [HttpDelete("special-test-rules/{id}")]
    public async Task<IActionResult> DeleteSpecialTestRule(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        var ok = await _alertService.DeleteSpecialTestRuleAsync(id, userId);
        if (!ok) return NotFound();
        return Ok();
    }
}
