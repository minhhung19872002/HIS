using HIS.Application.Common;
using HIS.Application.DTOs.InpatientDispensing;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Phát thuốc nội trú theo khoa — N1.05, tách khỏi InpatientDispensingController (#202 thin-controller).
/// Behavior-preserving: mọi logic FEFO/query/response shape/status code/message giữ nguyên;
/// userId truyền từ controller (thay cho GetUserId() cũ đọc claim).
/// </summary>
public class InpatientDispensingService : IInpatientDispensingService
{
    private readonly HISDbContext _db;
    public InpatientDispensingService(HISDbContext db) { _db = db; }

    /// <summary>Danh sách đơn thuốc nội trú chờ phát, gộp theo khoa.</summary>
    public async Task<ServiceOutcome> PendingAsync(Guid? departmentId, Guid? warehouseId)
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

        return ServiceOutcome.Ok(groups);
    }

    /// <summary>
    /// Tạo 1 phiếu xuất tổng hợp cho nhiều đơn thuốc cùng 1 khoa.
    /// Gộp thuốc theo MedicineId, trừ tồn FEFO, đánh dấu IsDispensed.
    /// </summary>
    public async Task<ServiceOutcome> BatchAsync(BatchDispenseDto dto, Guid userId)
    {
        if (dto.PrescriptionIds == null || dto.PrescriptionIds.Count == 0)
            return ServiceOutcome.Bad("Chưa chọn đơn thuốc");

        var warehouse = await _db.Warehouses.FindAsync(dto.WarehouseId);
        if (warehouse == null) return ServiceOutcome.Bad("Kho không tồn tại");
        var department = await _db.Departments.FindAsync(dto.DepartmentId);
        if (department == null) return ServiceOutcome.Bad("Khoa không tồn tại");

        var prescriptions = await _db.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Where(p => dto.PrescriptionIds.Contains(p.Id)
                && p.PrescriptionType == 2
                && !p.IsDispensed
                && p.DepartmentId == dto.DepartmentId)
            .ToListAsync();

        if (prescriptions.Count == 0)
            return ServiceOutcome.Bad("Không có đơn thuốc hợp lệ");

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
                return ServiceOutcome.Bad($"Không đủ tồn cho {medicine?.MedicineName ?? medicineId.ToString()}. Thiếu {remainingQty} {unit}.");
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

        return ServiceOutcome.Ok(new
        {
            exportReceiptId = export.Id,
            receiptCode = export.ReceiptCode,
            totalAmount = export.TotalAmount,
            prescriptionCount = prescriptions.Count,
        });
    }

    /// <summary>Xem chi tiết phiếu xuất tổng hợp — phục vụ in phiếu lĩnh.</summary>
    public async Task<ServiceOutcome> ReceiptAsync(Guid id)
    {
        var r = await _db.ExportReceipts
            .Include(x => x.Warehouse)
            .Include(x => x.Details).ThenInclude(d => d.Medicine)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return ServiceOutcome.NotFound();

        var dept = r.ToDepartmentId.HasValue
            ? await _db.Departments.FindAsync(r.ToDepartmentId.Value)
            : null;

        return ServiceOutcome.Ok(new
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
