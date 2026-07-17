using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

public partial class PopulateDataController
{
    // ==========================================================================
    // MEDINET EXTRAS — Hiv, TbHiv, Mental, Traditional, Trauma, ChronicDisease,
    // Forensic, ClinicalGuidance, InterHospital, Waste, EnvMonitoring, Campaigns,
    // Materials, PracticeLicense, Population, Prenatal, FamilyPlanning, SatisfactionTpl
    // ==========================================================================
    [HttpPost("medinet-extras")]
    public async Task<IActionResult> PopulateMedinetExtras() => Ok(await _service.PopulateMedinetExtrasAsync());
}
