using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

public partial class PopulateDataController
{
    // ==========================================================================
    // PUBLIC HEALTH / MEDINET (Vaccination, Disease, School, Occupational, Checkup)
    // ==========================================================================
    [HttpPost("public-health")]
    public async Task<IActionResult> PopulatePublicHealth() => Ok(await _service.PopulatePublicHealthAsync());

    // ==========================================================================
    // METHADONE
    // ==========================================================================
    [HttpPost("methadone")]
    public async Task<IActionResult> PopulateMethadone() => Ok(await _service.PopulateMethadoneAsync());

    // ==========================================================================
    // MCI (Mass Casualty Incident)
    // ==========================================================================
    [HttpPost("mci")]
    public async Task<IActionResult> PopulateMCI() => Ok(await _service.PopulateMCIAsync());

    // ==========================================================================
    // CME RECORDS
    // ==========================================================================
    [HttpPost("cme")]
    public async Task<IActionResult> PopulateCME() => Ok(await _service.PopulateCMEAsync());
}
