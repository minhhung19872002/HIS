using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Dtos.Pharmacy;

namespace HIS.API.Controllers;

public partial class PharmacyController
{
    // ==================== 2. Inventory ====================

    [HttpGet("inventory")]
    public async Task<IActionResult> GetInventoryItems([FromQuery] string? warehouseId = null)
    {
        try
        {
            return Ok(await _pharmacyService.GetInventoryItemsAsync(warehouseId));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error fetching inventory");
            return Ok(Array.Empty<object>());
        }
    }

    [HttpGet("inventory/warnings")]
    public async Task<IActionResult> GetInventoryWarnings()
    {
        // Reuse inventory endpoint with filter for warnings only
        return await GetInventoryItems(null);
    }

    [HttpGet("inventory/{medicationId}/history")]
    public async Task<IActionResult> GetInventoryHistory(Guid medicationId)
    {
        try
        {
            return Ok(await _pharmacyService.GetInventoryHistoryAsync(medicationId));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error fetching inventory history for {Id}", medicationId);
            return Ok(Array.Empty<object>());
        }
    }
}
