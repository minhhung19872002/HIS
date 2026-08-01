using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Dtos.Pharmacy;
using HIS.Application.Services;

namespace HIS.API.Controllers;

public partial class PharmacyController
{
    // ==================== 3. Transfers ====================

    [HttpGet("transfers")]
    public async Task<IActionResult> GetTransferRequests([FromQuery] string? status = null)
    {
        try
        {
            return Ok(await _pharmacyService.GetTransferRequestsAsync(status));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error fetching transfers");
            return Ok(Array.Empty<object>());
        }
    }

    [HttpPost("transfers")]
    public async Task<IActionResult> CreateTransfer([FromBody] CreateTransferRequest request)
    {
        try
        {
            if (!Guid.TryParse(request.FromWarehouse, out var fromId) ||
                !Guid.TryParse(request.ToWarehouse, out var toId))
                return BadRequest(new { message = "Kho xuất/nhập không hợp lệ" });

            List<TransferItemInput>? items = null;
            if (request.Items is { Count: > 0 })
            {
                items = new List<TransferItemInput>(request.Items.Count);
                foreach (var line in request.Items)
                {
                    Guid? medicineId = Guid.TryParse(line.MedicineId, out var mid) ? mid : null;
                    if (medicineId == null && string.IsNullOrWhiteSpace(line.MedicationCode))
                        return BadRequest(new { message = "Dòng thuốc thiếu mã thuốc (medicineId hoặc medicationCode)" });
                    items.Add(new TransferItemInput(medicineId, line.MedicationCode, line.Quantity, line.BatchNumber, line.Note));
                }
            }

            var requestedBy = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var (id, transferCode) = await _pharmacyService.CreateTransferAsync(fromId, toId, request.Note, requestedBy, items);

            return Ok(new
            {
                id = id.ToString(),
                transferCode,
                status = "pending",
            });
        }
        catch (InvalidOperationException ex)
        {
            // Lỗi nghiệp vụ từ service (kho trùng / thuốc không tồn / vượt tồn) → 400 kèm message
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating transfer");
            return StatusCode(500, new { message = "Lỗi khi tạo phiếu điều chuyển" });
        }
    }

    [HttpPost("transfers/{transferId}/approve")]
    public async Task<IActionResult> ApproveTransfer(Guid transferId)
    {
        try
        {
            if (!await _pharmacyService.ApproveTransferAsync(transferId))
                return NotFound(new { message = "Không tìm thấy phiếu điều chuyển" });
            return Ok(new { id = transferId.ToString(), status = "approved" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving transfer {Id}", transferId);
            return StatusCode(500, new { message = "Lỗi khi duyệt phiếu" });
        }
    }

    [HttpPost("transfers/{transferId}/reject")]
    public async Task<IActionResult> RejectTransfer(Guid transferId, [FromBody] RejectRequest? request = null)
    {
        try
        {
            if (!await _pharmacyService.RejectTransferAsync(transferId, request?.Reason))
                return NotFound(new { message = "Không tìm thấy phiếu điều chuyển" });
            return Ok(new { id = transferId.ToString(), status = "rejected" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting transfer {Id}", transferId);
            return StatusCode(500, new { message = "Lỗi khi từ chối phiếu" });
        }
    }

    [HttpPost("transfers/{transferId}/receive")]
    public async Task<IActionResult> ReceiveTransfer(Guid transferId)
    {
        try
        {
            if (!await _pharmacyService.ReceiveTransferAsync(transferId))
                return NotFound(new { message = "Không tìm thấy phiếu điều chuyển" });
            return Ok(new { id = transferId.ToString(), status = "received" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error receiving transfer {Id}", transferId);
            return StatusCode(500, new { message = "Lỗi khi xác nhận nhận hàng" });
        }
    }
}
