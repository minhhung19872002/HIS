using HIS.Application.DTOs.Examination;
using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/cds")]
[Authorize]
public class ClinicalDecisionSupportController : ControllerBase
{
    private readonly IClinicalDecisionSupportService _cdsService;

    public ClinicalDecisionSupportController(IClinicalDecisionSupportService cdsService)
    {
        _cdsService = cdsService;
    }

    [HttpPost("suggest-diagnoses")]
    public async Task<IActionResult> SuggestDiagnoses([FromBody] DiagnosisSuggestionRequestDto request)
    {
        var result = await _cdsService.SuggestDiagnosesAsync(request);
        return Ok(result);
    }

    [HttpPost("early-warning-score")]
    public async Task<IActionResult> CalculateEarlyWarningScore([FromBody] EarlyWarningScoreRequestDto request)
    {
        var result = await _cdsService.CalculateEarlyWarningScoreAsync(request);
        return Ok(result);
    }

    [HttpGet("alerts/{patientId}")]
    public async Task<IActionResult> GetClinicalAlerts(Guid patientId, [FromQuery] Guid? examinationId)
    {
        var result = await _cdsService.GetClinicalAlertsAsync(patientId, examinationId);
        return Ok(result);
    }

    [HttpPost("full/{patientId}")]
    public async Task<IActionResult> GetFullCds(Guid patientId, [FromQuery] Guid? examinationId,
        [FromBody] DiagnosisSuggestionRequestDto? request)
    {
        var result = await _cdsService.GetFullCdsAsync(patientId, examinationId, request);
        return Ok(result);
    }

    [HttpGet("frequent-diagnoses")]
    public async Task<IActionResult> GetFrequentDiagnoses([FromQuery] string? departmentId, [FromQuery] int limit = 10)
    {
        var result = await _cdsService.GetFrequentDiagnosesAsync(departmentId, limit);
        return Ok(result);
    }
}
