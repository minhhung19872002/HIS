using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// Phát thuốc nội trú theo khoa — N1.05.
/// Gộp nhiều đơn thuốc nội trú theo khoa thành 1 phiếu xuất tổng hợp.
/// </summary>
[ApiController]
[Route("api/inpatient-dispensing")]
[Authorize]
public class InpatientDispensingController : ControllerBase
{
    private readonly HISDbContext _db;
    public InpatientDispensingController(HISDbContext db) { _db = db; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    /// <summary>
    /// Danh sách đơn thuốc nội trú chờ phát, gộp theo khoa.
    /// </summary>
    [HttpGet("pending")]
    public async Task<IActionResult> Pending([FromQuery] Guid? departmentId, [FromQuery] Guid? warehouseId)
    {
        var q = _db.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Include(p => p.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(p => p.Department)
            .Where(p => p.PrescriptionType == 2 && !p.IsDispensed && p.Status != 4);
        if (departmentId.HasValue) q = q.Where(p => p.DepartmentId == departmentId.Value);
        if (warehouseId.HasValue) q = q.Where(p => p.WarehouseId == warehouseId.Value);

        var list = await q.OrderBy(p => p.DepartmentId).ThenBy(p => p.PrescriptionDate).Take(200).ToListAsync();

        var groups = list
            .GroupBy(p => new { p.DepartmentId, DepartmentName = p.Department != null ? p.Department.DepartmentName : "-" })
            .Select(g => new
            {
                departmentId = g.Key.DepartmentId,
                departmentName = g.Key.DepartmentName,
                totalPrescriptions = g.Count(),
                totalItems = g.Sum(p => p.Details.Count),
                totalAmount = g.Sum(p => p.Details.Sum(d => d.Quantity * d.UnitPrice)),
                prescriptions = g.Select(p => new
                {
                    p.Id,
                    p.PrescriptionCode,
                    p.PrescriptionDate,
                    PatientCode = p.MedicalRecord.Patient.PatientCode,
                    PatientName = p.MedicalRecord.Patient.FullName,
                    MedicalRecordCode = p.MedicalRecord.MedicalRecordCode,
                    p.WarehouseId,
                    items = p.Details.Select(d => new
                    {
                        d.Id,
                        d.MedicineId,
                        MedicineName = d.Medicine != null ? d.Medicine.MedicineName : string.Empty,
                        MedicineCode = d.Medicine != null ? d.Medicine.MedicineCode : string.Empty,
                        d.Quantity,
                        d.Unit,
                        d.UnitPrice,
                    }),
                }),
            });

        return Ok(groups);
    }

    public class BatchDispenseDto
    {
        public Guid WarehouseId { get; set; }
        public Guid DepartmentId { get; set; }
        public List<Guid> PrescriptionIds { get; set; } = new();
        public string? Note { get; set; }
    }

    /// <summary>
    /// Tạo 1 phiếu xuất tổng hợp cho nhiều đơn thuốc cùng 1 khoa.
    /// Gộp thuốc theo MedicineId, trừ tồn FEFO, đánh dấu IsDispensed.
    /// </summary>
    [HttpPost("batch")]
    [Authorize(Roles = "Admin,WarehouseManager,WarehouseStaff,Pharmacist")]
    public async Task<IActionResult> Batch([FromBody] BatchDispenseDto dto)
    {
        if (dto.PrescriptionIds == null || dto.PrescriptionIds.Count == 0)
            return BadRequest(new { message = "Chưa chọn đơn thuốc" });

        var warehouse = await _db.Warehouses.FindAsync(dto.WarehouseId);
        if (warehouse == null) return BadRequest(new { message = "Kho không tồn tại" });
        var department = await _db.Departments.FindAsync(dto.DepartmentId);
        if (department == null) return BadRequest(new { message = "Khoa không tồn tại" });

        var prescriptions = await _db.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Where(p => dto.PrescriptionIds.Contains(p.Id)
                && p.PrescriptionType == 2
                && !p.IsDispensed
                && p.DepartmentId == dto.DepartmentId)
            .ToListAsync();

        if (prescriptions.Count == 0)
            return BadRequest(new { message = "Không có đơn thuốc hợp lệ" });

        var userId = GetUserId();
        var now = DateTime.Now;

        var export = new ExportReceipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"XKN{now:yyyyMMddHHmmss}",
            ReceiptDate = now,
            WarehouseId = dto.WarehouseId,
            ExportType = 2,
            ToDepartmentId = dto.DepartmentId,
            PrescriptionId = null,
            TotalAmount = 0,
            Status = 1,
            Note = $"Lĩnh tổng hợp {prescriptions.Count} đơn nội trú khoa {department.DepartmentName}. {dto.Note ?? string.Empty}",
            CreatedAt = now,
            CreatedBy = userId.ToString(),
        };

        decimal total = 0;
        var byMedicine = prescriptions
            .SelectMany(p => p.Details.Where(d => d.Status == 0).Select(d => new { Prescription = p, Detail = d }))
            .GroupBy(x => x.Detail.MedicineId);

        foreach (var grp in byMedicine)
        {
            var medicineId = grp.Key;
            var totalQty = grp.Sum(x => x.Detail.Quantity);
            var unit = grp.First().Detail.Unit;
            var unitPrice = grp.First().Detail.UnitPrice;
            var medicine = grp.First().Detail.Medicine;

            var remainingQty = totalQty;
            var stocks = await _db.InventoryItems
                .Where(i => i.WarehouseId == dto.WarehouseId && i.MedicineId == medicineId
                    && (i.Quantity - i.ReservedQuantity) > 0)
                .OrderBy(i => i.ExpiryDate)
                .ToListAsync();

            foreach (var stock in stocks)
            {
                if (remainingQty <= 0) break;
                var available = stock.Quantity - stock.ReservedQuantity;
                var take = Math.Min(remainingQty, available);
                if (take <= 0) continue;

                stock.Quantity -= take;
                remainingQty -= take;

                var amount = take * unitPrice;
                total += amount;

                _db.ExportReceiptDetails.Add(new ExportReceiptDetail
                {
                    Id = Guid.NewGuid(),
                    ExportReceiptId = export.Id,
                    MedicineId = medicineId,
                    InventoryItemId = stock.Id,
                    BatchNumber = stock.BatchNumber,
                    ExpiryDate = stock.ExpiryDate,
                    Quantity = take,
                    Unit = unit,
                    UnitPrice = unitPrice,
                    Amount = amount,
                    CreatedAt = now,
                    CreatedBy = userId.ToString(),
                });
            }

            if (remainingQty > 0)
            {
                return BadRequest(new
                {
                    message = $"Không đủ tồn cho {medicine?.MedicineName ?? medicineId.ToString()}. Thiếu {remainingQty} {unit}.",
                });
            }

            foreach (var x in grp)
            {
                x.Detail.DispensedQuantity = x.Detail.Quantity;
                x.Detail.Status = 1;
            }
        }

        export.TotalAmount = total;
        _db.ExportReceipts.Add(export);

        foreach (var p in prescriptions)
        {
            p.IsDispensed = true;
            p.DispensedAt = now;
            p.DispensedBy = userId;
            p.Status = 2;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            exportReceiptId = export.Id,
            receiptCode = export.ReceiptCode,
            totalAmount = export.TotalAmount,
            prescriptionCount = prescriptions.Count,
        });
    }

    /// <summary>
    /// Xem chi tiết phiếu xuất tổng hợp — phục vụ in phiếu lĩnh.
    /// </summary>
    [HttpGet("receipt/{id:guid}")]
    public async Task<IActionResult> Receipt(Guid id)
    {
        var r = await _db.ExportReceipts
            .Include(x => x.Warehouse)
            .Include(x => x.Details).ThenInclude(d => d.Medicine)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return NotFound();

        var dept = r.ToDepartmentId.HasValue
            ? await _db.Departments.FindAsync(r.ToDepartmentId.Value)
            : null;

        return Ok(new
        {
            r.Id,
            r.ReceiptCode,
            r.ReceiptDate,
            WarehouseName = r.Warehouse?.WarehouseName,
            DepartmentName = dept?.DepartmentName,
            r.TotalAmount,
            r.Note,
            items = r.Details.Select(d => new
            {
                d.Id,
                MedicineName = d.Medicine != null ? d.Medicine.MedicineName : string.Empty,
                MedicineCode = d.Medicine != null ? d.Medicine.MedicineCode : string.Empty,
                d.BatchNumber,
                d.ExpiryDate,
                d.Quantity,
                d.Unit,
                d.UnitPrice,
                d.Amount,
            }),
        });
    }
}
