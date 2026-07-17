using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

public partial class PopulateDataController
{
    // ==========================================================================
    // BLOOD BANK
    // ==========================================================================
    [HttpPost("blood-bank")]
    public async Task<IActionResult> PopulateBloodBank() => Ok(await _service.PopulateBloodBankAsync());

    // ==========================================================================
    // CULTURE STOCK (Vi sinh lưu chủng)
    // ==========================================================================
    [HttpPost("culture-stock")]
    public async Task<IActionResult> PopulateCultureStock() => Ok(await _service.PopulateCultureStockAsync());

    // ==========================================================================
    // LAB QC (Kiểm soát chất lượng XN)
    // ==========================================================================
    [HttpPost("lab-qc")]
    public async Task<IActionResult> PopulateLabQC() => Ok(await _service.PopulateLabQCAsync());
}
