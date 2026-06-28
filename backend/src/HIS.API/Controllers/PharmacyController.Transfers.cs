using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Data;
using HIS.API.Dtos.Pharmacy;

namespace HIS.API.Controllers;

public partial class PharmacyController
{
    // ==================== 3. Transfers ====================

    [HttpGet("transfers")]
    public async Task<IActionResult> GetTransferRequests([FromQuery] string? status = null)
    {
        try
        {
            var query = _context.WarehouseTransfers
                .AsNoTracking()
                .Include(t => t.FromWarehouse)
                .Include(t => t.ToWarehouse)
                .Include(t => t.Items)
                .Where(t => !t.IsDeleted);

            if (!string.IsNullOrEmpty(status))
            {
                int? statusInt = status switch
                {
                    "pending" => 0,
                    "approved" => 1,
                    "rejected" => 4,
                    "received" => 3,
                    _ => null,
                };
                if (statusInt.HasValue)
                    query = query.Where(t => t.Status == statusInt.Value);
            }

            var transfers = await query
                .OrderByDescending(t => t.TransferDate)
                .Take(100)
                .ToListAsync();

            if (!transfers.Any())
                return Ok(Array.Empty<object>());

            // Resolve RequestedBy user names
            var userIds = transfers
                .Where(t => Guid.TryParse(t.RequestedBy, out _))
                .Select(t => Guid.Parse(t.RequestedBy!))
                .Distinct()
                .ToList();

            var users = userIds.Any()
                ? await _context.Users.AsNoTracking()
                    .Where(u => userIds.Contains(u.Id))
                    .ToDictionaryAsync(u => u.Id, u => u.FullName)
                : new Dictionary<Guid, string>();

            var result = transfers.Select(t =>
            {
                string statusStr = t.Status switch
                {
                    0 => "pending",
                    1 => "approved",
                    2 => "approved",
                    3 => "received",
                    4 => "rejected",
                    _ => "pending",
                };

                string requestedBy = t.RequestedBy ?? "";
                if (Guid.TryParse(requestedBy, out var uid) && users.TryGetValue(uid, out var name))
                    requestedBy = name;

                return new
                {
                    id = t.Id.ToString(),
                    transferCode = t.TransferCode,
                    fromWarehouse = t.FromWarehouse?.WarehouseName ?? "",
                    toWarehouse = t.ToWarehouse?.WarehouseName ?? "",
                    requestedBy,
                    requestedDate = t.TransferDate,
                    itemsCount = t.Items.Count,
                    status = statusStr,
                    note = t.Notes ?? "",
                };
            }).ToList();

            return Ok(result);
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

            var transfer = new HIS.Core.Entities.WarehouseTransfer
            {
                Id = Guid.NewGuid(),
                TransferCode = $"DC-{DateTime.Now:yyyyMMdd}-{DateTime.Now:HHmmss}",
                FromWarehouseId = fromId,
                ToWarehouseId = toId,
                TransferDate = DateTime.UtcNow,
                Status = 0,
                RequestedBy = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                Notes = request.Note,
                CreatedAt = DateTime.UtcNow,
            };

            _context.WarehouseTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = transfer.Id.ToString(),
                transferCode = transfer.TransferCode,
                status = "pending",
            });
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
            var transfer = await _context.WarehouseTransfers
                .FirstOrDefaultAsync(t => t.Id == transferId && !t.IsDeleted);

            if (transfer == null)
                return NotFound(new { message = "Không tìm thấy phiếu điều chuyển" });

            transfer.Status = 1;
            transfer.ApprovedAt = DateTime.UtcNow;
            transfer.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { id = transfer.Id.ToString(), status = "approved" });
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
            var transfer = await _context.WarehouseTransfers
                .FirstOrDefaultAsync(t => t.Id == transferId && !t.IsDeleted);

            if (transfer == null)
                return NotFound(new { message = "Không tìm thấy phiếu điều chuyển" });

            transfer.Status = 4;
            transfer.CancellationReason = request?.Reason;
            transfer.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { id = transfer.Id.ToString(), status = "rejected" });
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
            var transfer = await _context.WarehouseTransfers
                .FirstOrDefaultAsync(t => t.Id == transferId && !t.IsDeleted);

            if (transfer == null)
                return NotFound(new { message = "Không tìm thấy phiếu điều chuyển" });

            transfer.Status = 3;
            transfer.ReceivedAt = DateTime.UtcNow;
            transfer.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { id = transfer.Id.ToString(), status = "received" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error receiving transfer {Id}", transferId);
            return StatusCode(500, new { message = "Lỗi khi xác nhận nhận hàng" });
        }
    }
}
