using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.API.Dtos.Pharmacy;

namespace HIS.API.Controllers;

[Authorize]
[ApiController]
[Route("api/pharmacy")]
public partial class PharmacyController : ControllerBase
{
    private readonly IPharmacyService _pharmacyService;
    private readonly ILogger<PharmacyController> _logger;

    public PharmacyController(IPharmacyService pharmacyService, ILogger<PharmacyController> logger)
    {
        _pharmacyService = pharmacyService;
        _logger = logger;
    }

    private Guid CurrentUserId()
        => Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

    // ==================== 1. Pending Prescriptions ====================

    [HttpGet("pending-prescriptions")]
    public async Task<IActionResult> GetPendingPrescriptions()
    {
        try
        {
            return Ok(await _pharmacyService.GetPendingPrescriptionsAsync());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error fetching pending prescriptions");
            return Ok(Array.Empty<object>());
        }
    }

    // ==================== 5. Additional endpoints for full CRUD ====================

    [HttpPost("prescriptions/{prescriptionId}/accept")]
    public async Task<IActionResult> AcceptPrescription(Guid prescriptionId)
    {
        try
        {
            if (!await _pharmacyService.AcceptPrescriptionAsync(prescriptionId))
                return NotFound(new { message = "Không tìm thấy đơn thuốc" });
            return Ok(new { id = prescriptionId.ToString(), status = "accepted" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error accepting prescription {Id}", prescriptionId);
            return StatusCode(500, new { message = "Lỗi khi tiếp nhận đơn thuốc" });
        }
    }

    [HttpPost("prescriptions/{prescriptionId}/reject")]
    public async Task<IActionResult> RejectPrescription(Guid prescriptionId, [FromBody] RejectRequest? request = null)
    {
        try
        {
            if (!await _pharmacyService.RejectPrescriptionAsync(prescriptionId, request?.Reason))
                return NotFound(new { message = "Không tìm thấy đơn thuốc" });
            return Ok(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting prescription {Id}", prescriptionId);
            return StatusCode(500, new { message = "Lỗi khi từ chối đơn thuốc" });
        }
    }

    [HttpGet("prescriptions/{prescriptionId}/medications")]
    public async Task<IActionResult> GetMedicationItems(Guid prescriptionId)
    {
        try
        {
            return Ok(await _pharmacyService.GetMedicationItemsAsync(prescriptionId));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error fetching medications for prescription {Id}", prescriptionId);
            return Ok(Array.Empty<object>());
        }
    }

    [HttpPost("prescriptions/{prescriptionId}/complete")]
    [HttpPost("prescriptions/{prescriptionId}/dispense")]
    public async Task<IActionResult> CompleteDispensing(Guid prescriptionId)
    {
        try
        {
            var result = await _pharmacyService.CompleteDispensingAsync(prescriptionId, CurrentUserId());
            if (result.NotFound)
                return NotFound(new { message = "Không tìm thấy đơn thuốc" });
            if (result.NoWarehouse)
                return BadRequest(new { message = result.Message });
            return Ok(true);
        }
        catch (InvalidOperationException ex)
        {
            // #12: tồn kho không đủ → lỗi client rõ ràng (không phải 500), người dùng biết để nhập kho.
            _logger.LogWarning(ex, "CompleteDispensing: không đủ tồn kho cho prescription {Id}", prescriptionId);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing dispensing for prescription {Id}", prescriptionId);
            return StatusCode(500, new { message = "Lỗi khi hoàn thành cấp phát" });
        }
    }

    [HttpPut("medications/{itemId}/dispense")]
    public async Task<IActionResult> UpdateDispensedQuantity(Guid itemId, [FromBody] DispenseUpdateRequest request)
    {
        try
        {
            var dispensed = await _pharmacyService.UpdateDispensedQuantityAsync(itemId, request.Quantity, request.BatchNumber);
            if (dispensed == null)
                return NotFound(new { message = "Không tìm thấy chi tiết đơn thuốc" });
            return Ok(new { id = itemId.ToString(), dispensedQuantity = dispensed.Value });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating dispensed quantity for item {Id}", itemId);
            return StatusCode(500, new { message = "Lỗi khi cập nhật số lượng cấp phát" });
        }
    }
}
