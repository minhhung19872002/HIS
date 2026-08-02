using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Filters;

namespace HIS.API.Controllers;

/// <summary>
/// One-shot admin controller that fills empty tables with realistic operational
/// data for demo. Unlike DailySeedController this does NOT stamp "SEED" tags
/// onto codes — records look like they were created through normal clinical use.
/// Idempotent: each endpoint no-ops if its target tables already have rows.
/// #365 REFAC-3: thinned — logic moved to <see cref="IPopulateDataService"/>
/// (backend/src/HIS.Infrastructure/Services/DevData/PopulateDataServiceImpl*.cs).
/// </summary>
[ApiController]
[Route("api/admin/populate")]
[AllowAnonymous]
[DevelopmentOnly] // #180: dev-only seed tool — 404 in prod (was anonymously writable on prod)
public partial class PopulateDataController : ControllerBase
{
    private readonly IPopulateDataService _service;

    public PopulateDataController(IPopulateDataService service)
    {
        _service = service;
    }

    // ==========================================================================
    // INFECTION CONTROL
    // ==========================================================================
    [HttpPost("infection-control")]
    public async Task<IActionResult> PopulateInfectionControl() => Ok(await _service.PopulateInfectionControlAsync());

    // ==========================================================================
    // PATIENT PORTAL
    // ==========================================================================
    [HttpPost("patient-portal")]
    public async Task<IActionResult> PopulatePatientPortal() => Ok(await _service.PopulatePatientPortalAsync());

    // ==========================================================================
    // EQUIPMENT: MaintenanceRecord + CalibrationRecord
    // ==========================================================================
    [HttpPost("equipment")]
    public async Task<IActionResult> PopulateEquipment() => Ok(await _service.PopulateEquipmentAsync());

    // ==========================================================================
    // PATHOLOGY
    // ==========================================================================
    [HttpPost("pathology")]
    public async Task<IActionResult> PopulatePathology() => Ok(await _service.PopulatePathologyAsync());

    [HttpPost("functional-diagnostics")]
    public async Task<IActionResult> PopulateFunctionalDiagnostics() => Ok(await _service.PopulateFunctionalDiagnosticsAsync());

    // ==========================================================================
    // QUALITY: Indicators + Values
    // ==========================================================================
    [HttpPost("quality")]
    public async Task<IActionResult> PopulateQuality() => Ok(await _service.PopulateQualityAsync());
}
