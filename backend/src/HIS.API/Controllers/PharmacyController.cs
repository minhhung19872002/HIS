using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Data;
using HIS.API.Dtos.Pharmacy;

namespace HIS.API.Controllers;

[Authorize]
[ApiController]
[Route("api/pharmacy")]
public partial class PharmacyController : ControllerBase
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
    [HttpPost("prescriptions/{prescriptionId}/dispense")]
    public async Task<IActionResult> CompleteDispensing(Guid prescriptionId)
    {
        try
        {
            var prescription = await _context.Prescriptions
                .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);

            if (prescription == null)
                return NotFound(new { message = "Không tìm thấy đơn thuốc" });

            // Idempotent: đã phát rồi thì KHÔNG trừ kho lần nữa.
            if (prescription.IsDispensed)
                return Ok(true);

            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            // Phát thuốc PHẢI trừ kho FEFO (audit luồng nghiệp vụ 2026-06-06 #6): đi qua nhánh chuẩn
            // WarehouseComplete (tạo phiếu xuất + trừ tồn + set trạng thái đơn trong transaction).
            // Test e2e prod 2026-06-13: fallback cũ "đơn chưa gán kho → chỉ đánh dấu đã phát" làm
            // thất thoát kho (không phiếu xuất → cancel-dispensed cũng không hoàn được). Nay đơn chưa
            // gán kho → resolve kho lẻ ngoại trú mặc định (WarehouseType=2); không có kho → 400 rõ ràng,
            // TUYỆT ĐỐI không phát mà không trừ tồn.
            if (!prescription.WarehouseId.HasValue || prescription.WarehouseId.Value == Guid.Empty)
            {
                var defaultDispensaryId = await _context.Warehouses
                    .Where(w => w.IsActive && !w.IsDeleted && w.WarehouseType == 2)
                    .OrderBy(w => w.WarehouseName)
                    .Select(w => (Guid?)w.Id)
                    .FirstOrDefaultAsync();
                if (defaultDispensaryId == null)
                    return BadRequest(new
                    {
                        message = "Đơn thuốc chưa gán kho xuất và không có kho lẻ ngoại trú (WarehouseType=2) đang hoạt động — chọn kho trước khi phát"
                    });

                _logger.LogInformation(
                    "CompleteDispensing: prescription {Id} chưa gán kho — dùng kho lẻ mặc định {WarehouseId}",
                    prescriptionId, defaultDispensaryId);
                prescription.WarehouseId = defaultDispensaryId;
                await _context.SaveChangesAsync();
            }

            var warehouseService = HttpContext.RequestServices.GetRequiredService<HIS.Application.Services.IWarehouseCompleteService>();
            await warehouseService.DispenseOutpatientPrescriptionAsync(prescriptionId, userId);
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
}
