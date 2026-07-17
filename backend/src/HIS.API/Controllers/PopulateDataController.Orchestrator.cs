using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

public partial class PopulateDataController
{
    // ==========================================================================
    // ALL-IN-ONE
    // ==========================================================================
    [HttpPost("all")]
    public async Task<IActionResult> PopulateAll() => Ok(await _service.PopulateAllAsync());
}
