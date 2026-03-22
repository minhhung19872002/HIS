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
        return Ok(new { success = true });
    }

    /// <summary>
    /// Get all 34 alert rules catalog
    /// </summary>
    [HttpGet("rules")]
    public async Task<IActionResult> GetAlertRules()
    {
        var result = await _alertService.GetAlertRulesAsync();
        return Ok(result);
    }
}
