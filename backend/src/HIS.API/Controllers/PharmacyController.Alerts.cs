using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Dtos.Pharmacy;

namespace HIS.API.Controllers;

public partial class PharmacyController
{
    // ==================== 4. Alerts ====================

    [HttpGet("alerts")]
    public async Task<IActionResult> GetAlerts([FromQuery] bool? acknowledged = null)
    {
        try
        {
            return Ok(await _pharmacyService.GetAlertsAsync(acknowledged));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error fetching alerts");
            return Ok(Array.Empty<object>());
        }
    }

    [HttpPost("alerts/{alertId}/acknowledge")]
    public async Task<IActionResult> AcknowledgeAlert(Guid alertId)
    {
        try
        {
            if (!await _pharmacyService.AcknowledgeAlertAsync(alertId))
                return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy cảnh báo" });
            return Ok(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error acknowledging alert {Id}", alertId);
            return StatusCode(500, new { message = "Lỗi khi xác nhận cảnh báo" });
        }
    }

    [HttpPost("alerts/{alertId}/resolve")]
    public async Task<IActionResult> ResolveAlert(Guid alertId)
    {
        try
        {
            if (!await _pharmacyService.ResolveAlertAsync(alertId))
                return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy cảnh báo" });
            return Ok(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resolving alert {Id}", alertId);
            return StatusCode(500, new { message = "Lỗi khi xử lý cảnh báo" });
        }
    }
}
