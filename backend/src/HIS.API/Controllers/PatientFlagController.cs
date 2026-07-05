using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.DTOs.PatientFlag;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/patient-flag")]
[Authorize]
public class PatientFlagController : ControllerBase
{
    private readonly IPatientFlagService _svc;
    public PatientFlagController(IPatientFlagService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    [HttpGet("by-patient/{patientId:guid}")]
    public async Task<IActionResult> ByPatient(Guid patientId)
        => (await _svc.ByPatientAsync(patientId)).ToActionResult();

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SavePatientFlagDto dto)
        => (await _svc.SaveAsync(dto, GetUserId())).ToActionResult();

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
        => (await _svc.DeleteAsync(id, GetUserId())).ToActionResult();
}
