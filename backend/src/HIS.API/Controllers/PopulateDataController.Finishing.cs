using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

public partial class PopulateDataController
{
    // ==========================================================================
    // FINISHING — remaining tables not covered by any module-specific seeder
    // (certificates, lab analyzers, appointments, endpoint security, outbreak flag)
    // ==========================================================================
    [HttpPost("finishing")]
    public async Task<IActionResult> PopulateFinishing() => Ok(await _service.PopulateFinishingAsync());
}
