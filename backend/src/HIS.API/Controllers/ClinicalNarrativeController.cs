using HIS.API.Extensions;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using HIS.Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/clinical-narratives")]
[Authorize]
public class ClinicalNarrativeController : ControllerBase
{
    private readonly IClinicalNarrativeService _svc;

    public ClinicalNarrativeController(IClinicalNarrativeService svc) => _svc = svc;

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    // ========== Surgery Narrative Templates ==========

    [HttpGet("surgery")]
    public async Task<IActionResult> GetSurgeryNarratives(
        [FromQuery] Guid? departmentId, [FromQuery] Guid? surgeryServiceId, [FromQuery] string? keyword)
        => (await _svc.GetSurgeryNarrativesAsync(departmentId, surgeryServiceId, keyword)).ToActionResult();

    [HttpGet("surgery/{id:guid}")]
    public async Task<IActionResult> GetSurgeryNarrative(Guid id)
        => (await _svc.GetSurgeryNarrativeAsync(id)).ToActionResult();

    [HttpPost("surgery")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<IActionResult> SaveSurgeryNarrative([FromBody] SurgeryNarrativeTemplate dto)
        => (await _svc.SaveSurgeryNarrativeAsync(dto, GetUserId())).ToActionResult();

    [HttpDelete("surgery/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<IActionResult> DeleteSurgeryNarrative(Guid id)
        => (await _svc.DeleteSurgeryNarrativeAsync(id, GetUserId())).ToActionResult();

    // ========== Outpatient Record Templates ==========

    [HttpGet("outpatient-records")]
    public async Task<IActionResult> GetOutpatientRecords(
        [FromQuery] Guid? departmentId, [FromQuery] string? diagnosisCode, [FromQuery] string? keyword)
        => (await _svc.GetOutpatientRecordsAsync(departmentId, diagnosisCode, keyword)).ToActionResult();

    [HttpGet("outpatient-records/{id:guid}")]
    public async Task<IActionResult> GetOutpatientRecord(Guid id)
        => (await _svc.GetOutpatientRecordAsync(id)).ToActionResult();

    [HttpPost("outpatient-records")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<IActionResult> SaveOutpatientRecord([FromBody] OutpatientRecordTemplate dto)
        => (await _svc.SaveOutpatientRecordAsync(dto, GetUserId())).ToActionResult();

    [HttpDelete("outpatient-records/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<IActionResult> DeleteOutpatientRecord(Guid id)
        => (await _svc.DeleteOutpatientRecordAsync(id, GetUserId())).ToActionResult();
}
