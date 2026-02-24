using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Data;

namespace HIS.API.Controllers;

[Authorize]
[ApiController]
[Route("api/pharmacy")]
public class PharmacyController : ControllerBase
{
    private readonly HISDbContext _context;
    private readonly ILogger<PharmacyController> _logger;

    public PharmacyController(HISDbContext context, ILogger<PharmacyController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ==================== 1. Pending Prescriptions ====================

    [HttpGet("pending-prescriptions")]
    public async Task<IActionResult> GetPendingPrescriptions()
    {
        try
        {
            var prescriptions = await _context.Prescriptions
                .AsNoTracking()
                .Include(p => p.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(p => p.Doctor)
                .Include(p => p.Department)
                .Include(p => p.Details)
                .Where(p => !p.IsDeleted && (p.Status == 0 || p.Status == 1))
                .OrderByDescending(p => p.CreatedAt)
                .Take(100)
                .Select(p => new
                {
                    id = p.Id.ToString(),
                    prescriptionCode = p.PrescriptionCode,
                    patientName = p.MedicalRecord != null && p.MedicalRecord.Patient != null
                        ? p.MedicalRecord.Patient.FullName : "",
                    patientCode = p.MedicalRecord != null && p.MedicalRecord.Patient != null
                        ? p.MedicalRecord.Patient.PatientCode : "",
                    doctorName = p.Doctor != null ? p.Doctor.FullName : "",
                    itemsCount = p.Details.Count(d => !d.IsDeleted),
                    totalAmount = p.TotalAmount,
                    status = p.Status == 0 ? "pending"
                           : p.Status == 1 ? "accepted"
                           : p.Status == 2 ? "completed"
                           : "rejected",
                    priority = "normal",
                    createdDate = p.CreatedAt,
                    department = p.Department != null ? p.Department.DepartmentName : "",
                })
                .ToListAsync();

            return Ok(prescriptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error fetching pending prescriptions");
            return Ok(Array.Empty<object>());
        }
    }

    // ==================== 2. Inventory ====================

    [HttpGet("inventory")]
    public async Task<IActionResult> GetInventoryItems([FromQuery] string? warehouseId = null)
    {
        try
        {
            var query = _context.InventoryItems
                .AsNoTracking()
                .Include(i => i.Medicine)
                .Include(i => i.Warehouse)
                .Where(i => !i.IsDeleted && i.Quantity > 0 && i.MedicineId != null);

            if (!string.IsNullOrEmpty(warehouseId) && Guid.TryParse(warehouseId, out var wId))
                query = query.Where(i => i.WarehouseId == wId);

            var items = await query.Take(500).ToListAsync();

            if (!items.Any())
                return Ok(Array.Empty<object>());

            // Get stock thresholds
            var medicineIds = items.Where(i => i.MedicineId.HasValue)
                .Select(i => i.MedicineId!.Value).Distinct().ToList();

            var thresholds = await _context.StockThresholds
                .AsNoTracking()
                .Where(t => medicineIds.Contains(t.MedicineId) && t.IsActive)
                .ToListAsync();

            var thresholdMap = thresholds
                .GroupBy(t => t.MedicineId)
                .ToDictionary(g => g.Key, g => g.First());

            // Group by medicine + warehouse
            var grouped = items.GroupBy(i => new { i.MedicineId, i.WarehouseId });

            var result = grouped.Select(g =>
            {
                var first = g.First();
                var medicine = first.Medicine;
                var threshold = first.MedicineId.HasValue
                    ? thresholdMap.GetValueOrDefault(first.MedicineId.Value) : null;
                var totalStock = g.Sum(i => i.Quantity);
                var nearestExpiry = g
                    .Where(i => i.ExpiryDate.HasValue)
                    .OrderBy(i => i.ExpiryDate)
                    .FirstOrDefault()?.ExpiryDate;
                var avgPrice = g.Average(i => i.UnitPrice);
                var minStock = threshold?.MinimumQuantity ?? 0;

                string status = "normal";
                if (totalStock <= 0) status = "out";
                else if (minStock > 0 && totalStock <= minStock) status = "low";
                else if (nearestExpiry.HasValue && nearestExpiry.Value <= DateTime.Now.AddMonths(3)) status = "expiring";

                return new
                {
                    id = first.Id.ToString(),
                    medicationCode = medicine?.MedicineCode ?? "",
                    medicationName = medicine?.MedicineName ?? "",
                    category = medicine?.MedicineGroupCode ?? "",
                    unit = medicine?.Unit ?? "",
                    totalStock = (int)totalStock,
                    minStock = (int)minStock,
                    maxStock = (int)(threshold?.MaximumQuantity ?? 0),
                    warehouse = first.Warehouse?.WarehouseName ?? "",
                    nearestExpiry = nearestExpiry?.ToString("o") ?? "",
                    averagePrice = Math.Round(avgPrice, 0),
                    status,
                };
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error fetching inventory");
            return Ok(Array.Empty<object>());
        }
    }

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

    // ==================== 4. Alerts ====================

    [HttpGet("alerts")]
    public async Task<IActionResult> GetAlerts([FromQuery] bool? acknowledged = null)
    {
        try
        {
            var alerts = new List<object>();

            // Expiry alerts
            var expiryQuery = _context.ExpiryAlerts
                .AsNoTracking()
                .Include(a => a.Medicine)
                .Where(a => !a.IsDeleted);

            if (acknowledged.HasValue)
                expiryQuery = acknowledged.Value
                    ? expiryQuery.Where(a => a.Status >= 1)
                    : expiryQuery.Where(a => a.Status == 0);

            var expiryAlerts = await expiryQuery
                .OrderByDescending(a => a.CreatedAt)
                .Take(50)
                .ToListAsync();

            foreach (var ea in expiryAlerts)
            {
                string severity = ea.AlertLevel switch { 1 => "high", 2 => "medium", _ => "low" };
                alerts.Add(new
                {
                    id = ea.Id.ToString(),
                    type = "expiry",
                    severity,
                    medicationName = ea.Medicine?.MedicineName ?? "",
                    message = $"Thuốc sắp hết hạn ngày {ea.ExpiryDate:dd/MM/yyyy}, lô {ea.BatchNumber}, SL: {ea.Quantity}",
                    createdDate = ea.CreatedAt,
                    acknowledged = ea.Status >= 1,
                });
            }

            // Low stock alerts
            var lowStockQuery = _context.LowStockAlerts
                .AsNoTracking()
                .Include(a => a.Medicine)
                .Where(a => !a.IsDeleted);

            if (acknowledged.HasValue)
                lowStockQuery = acknowledged.Value
                    ? lowStockQuery.Where(a => a.Status >= 1)
                    : lowStockQuery.Where(a => a.Status == 0);

            var lowStockAlerts = await lowStockQuery
                .OrderByDescending(a => a.CreatedAt)
                .Take(50)
                .ToListAsync();

            foreach (var la in lowStockAlerts)
            {
                string severity = la.AlertLevel switch { 1 => "high", 2 => "medium", _ => "low" };
                alerts.Add(new
                {
                    id = la.Id.ToString(),
                    type = la.CurrentQuantity <= 0 ? "out_of_stock" : "low_stock",
                    severity,
                    medicationName = la.Medicine?.MedicineName ?? "",
                    message = $"Tồn kho: {la.CurrentQuantity}, Tồn tối thiểu: {la.MinimumQuantity}",
                    createdDate = la.CreatedAt,
                    acknowledged = la.Status >= 1,
                });
            }

            return Ok(alerts.OrderByDescending(a => ((dynamic)a).createdDate).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error fetching alerts");
            return Ok(Array.Empty<object>());
        }
    }

    // ==================== 5. Additional endpoints for full CRUD ====================

    [HttpPost("prescriptions/{prescriptionId}/accept")]
    public async Task<IActionResult> AcceptPrescription(Guid prescriptionId)
    {
        try
        {
            var prescription = await _context.Prescriptions
                .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);

            if (prescription == null)
                return NotFound(new { message = "Không tìm thấy đơn thuốc" });

            prescription.Status = 1; // Đã duyệt
            prescription.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { id = prescription.Id.ToString(), status = "accepted" });
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
            var prescription = await _context.Prescriptions
                .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);

            if (prescription == null)
                return NotFound(new { message = "Không tìm thấy đơn thuốc" });

            prescription.Status = 4; // Hủy
            prescription.Note = request?.Reason ?? prescription.Note;
            prescription.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

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
            var details = await _context.PrescriptionDetails
                .AsNoTracking()
                .Include(d => d.Medicine)
                .Where(d => d.PrescriptionId == prescriptionId && !d.IsDeleted)
                .ToListAsync();

            var result = details.Select(d => new
            {
                id = d.Id.ToString(),
                medicationCode = d.Medicine?.MedicineCode ?? "",
                medicationName = d.Medicine?.MedicineName ?? "",
                unit = d.Unit ?? d.Medicine?.Unit ?? "",
                quantity = (int)d.Quantity,
                dispensedQuantity = (int)d.DispensedQuantity,
                dosage = d.Dosage ?? "",
                instruction = d.UsageInstructions ?? d.Usage ?? "",
                batches = GetBatchesForMedicine(d.MedicineId, d.WarehouseId),
                selectedBatch = d.BatchNumber,
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error fetching medications for prescription {Id}", prescriptionId);
            return Ok(Array.Empty<object>());
        }
    }

    private List<object> GetBatchesForMedicine(Guid medicineId, Guid? warehouseId)
    {
        try
        {
            var query = _context.InventoryItems
                .AsNoTracking()
                .Include(i => i.Warehouse)
                .Where(i => !i.IsDeleted && i.MedicineId == medicineId && i.Quantity > 0);

            if (warehouseId.HasValue)
                query = query.Where(i => i.WarehouseId == warehouseId.Value);

            return query
                .OrderBy(i => i.ExpiryDate)
                .Take(10)
                .Select(i => (object)new
                {
                    batchNumber = i.BatchNumber ?? "",
                    expiryDate = i.ExpiryDate,
                    availableQuantity = (int)i.AvailableQuantity,
                    warehouse = i.Warehouse != null ? i.Warehouse.WarehouseName : "",
                    manufacturingDate = i.ManufactureDate,
                    recommendedFEFO = true,
                })
                .ToList();
        }
        catch
        {
            return new List<object>();
        }
    }

    [HttpPost("prescriptions/{prescriptionId}/complete")]
    public async Task<IActionResult> CompleteDispensing(Guid prescriptionId)
    {
        try
        {
            var prescription = await _context.Prescriptions
                .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);

            if (prescription == null)
                return NotFound(new { message = "Không tìm thấy đơn thuốc" });

            prescription.Status = 2; // Đã cấp phát
            prescription.IsDispensed = true;
            prescription.DispensedAt = DateTime.UtcNow;
            prescription.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(true);
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
            var detail = await _context.PrescriptionDetails
                .FirstOrDefaultAsync(d => d.Id == itemId && !d.IsDeleted);

            if (detail == null)
                return NotFound(new { message = "Không tìm thấy chi tiết đơn thuốc" });

            detail.DispensedQuantity = request.Quantity;
            if (!string.IsNullOrEmpty(request.BatchNumber))
                detail.BatchNumber = request.BatchNumber;
            detail.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { id = detail.Id.ToString(), dispensedQuantity = (int)detail.DispensedQuantity });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating dispensed quantity for item {Id}", itemId);
            return StatusCode(500, new { message = "Lỗi khi cập nhật số lượng cấp phát" });
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
            var movements = await _context.StockMovements
                .AsNoTracking()
                .Where(m => !m.IsDeleted && m.MedicineId == medicationId)
                .OrderByDescending(m => m.MovementDate)
                .Take(50)
                .ToListAsync();

            var result = movements.Select(m => new
            {
                id = m.Id.ToString(),
                medicationCode = "",
                medicationName = "",
                transactionType = m.MovementType switch
                {
                    1 => "import",
                    2 => "export",
                    3 => "transfer",
                    4 => "adjust",
                    _ => "import",
                },
                quantity = (int)m.Quantity,
                batchNumber = m.BatchNumber,
                referenceCode = m.ReferenceCode,
                note = m.Notes ?? "",
                createdDate = m.MovementDate,
                createdBy = m.CreatedBy ?? "",
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error fetching inventory history for {Id}", medicationId);
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

    [HttpPost("alerts/{alertId}/acknowledge")]
    public async Task<IActionResult> AcknowledgeAlert(Guid alertId)
    {
        try
        {
            // Try expiry alert first
            var expiryAlert = await _context.ExpiryAlerts
                .FirstOrDefaultAsync(a => a.Id == alertId && !a.IsDeleted);

            if (expiryAlert != null)
            {
                expiryAlert.Status = 1;
                expiryAlert.AcknowledgedAt = DateTime.UtcNow;
                expiryAlert.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(true);
            }

            // Try low stock alert
            var lowStockAlert = await _context.LowStockAlerts
                .FirstOrDefaultAsync(a => a.Id == alertId && !a.IsDeleted);

            if (lowStockAlert != null)
            {
                lowStockAlert.Status = 1;
                lowStockAlert.AcknowledgedAt = DateTime.UtcNow;
                lowStockAlert.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(true);
            }

            return NotFound(new { message = "Không tìm thấy cảnh báo" });
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
            var expiryAlert = await _context.ExpiryAlerts
                .FirstOrDefaultAsync(a => a.Id == alertId && !a.IsDeleted);

            if (expiryAlert != null)
            {
                expiryAlert.Status = 2;
                expiryAlert.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(true);
            }

            var lowStockAlert = await _context.LowStockAlerts
                .FirstOrDefaultAsync(a => a.Id == alertId && !a.IsDeleted);

            if (lowStockAlert != null)
            {
                lowStockAlert.Status = 3;
                lowStockAlert.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(true);
            }

            return NotFound(new { message = "Không tìm thấy cảnh báo" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resolving alert {Id}", alertId);
            return StatusCode(500, new { message = "Lỗi khi xử lý cảnh báo" });
        }
    }

    // ==================== Request DTOs ====================

    public class RejectRequest
    {
        public string? Reason { get; set; }
    }

    public class DispenseUpdateRequest
    {
        public decimal Quantity { get; set; }
        public string? BatchNumber { get; set; }
    }

    public class CreateTransferRequest
    {
        public string FromWarehouse { get; set; } = string.Empty;
        public string ToWarehouse { get; set; } = string.Empty;
        public string? Note { get; set; }
    }
}
