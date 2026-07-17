using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

public partial class PopulateDataController
{
    // ==========================================================================
    // REHAB SESSIONS
    // ==========================================================================
    [HttpPost("rehab-sessions")]
    public async Task<IActionResult> PopulateRehabSessions() => Ok(await _service.PopulateRehabSessionsAsync());

    // ==========================================================================
    // TELE SESSIONS
    // ==========================================================================
    [HttpPost("tele-sessions")]
    public async Task<IActionResult> PopulateTeleSessions() => Ok(await _service.PopulateTeleSessionsAsync());

    // ==========================================================================
    // DIET ORDERS
    // ==========================================================================
    [HttpPost("diet-orders")]
    public async Task<IActionResult> PopulateDietOrders() => Ok(await _service.PopulateDietOrdersAsync());

    // ==========================================================================
    // PREREQUISITES: DietTypes + RehabTreatmentPlans (needed by diet/rehab modules)
    // ==========================================================================
    [HttpPost("prereqs")]
    public async Task<IActionResult> PopulatePrereqs() => Ok(await _service.PopulatePrereqsAsync());
}
