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
            .Include(p => p.MedicalRecord)
            .Where(p => dto.PrescriptionIds.Contains(p.Id)
                && p.PrescriptionType == 2
                && !p.IsDispensed
                && !p.IsDeleted
                // QA0915: đơn Hủy/Nháp/Hoàn trả không được lĩnh (danh sách chờ đã loại Status 4, lệnh phát thì chưa).
                && p.Status != 3 && p.Status != 4 && p.Status != 5
                // review M8: đơn đã bán tại nhà thuốc thì không lĩnh nữa (tránh trừ kho hai lần)
                && !_db.RetailSales.Any(s => s.PrescriptionId == p.Id && s.Status != "Cancelled" && !s.IsDeleted)
                && p.DepartmentId == dto.DepartmentId)
            .ToListAsync();

        if (prescriptions.Count == 0)
            return ServiceOutcome.Bad("Không có đơn thuốc hợp lệ");

        var now = DateTime.Now;
        var receiptCode = $"XKN{now:yyyyMMddHHmmss}";
        var batchNote = $"Lĩnh tổng hợp {prescriptions.Count} đơn nội trú khoa {department.DepartmentName}. {dto.Note ?? string.Empty}";

        // QA-R6: the batch used to write ONE export receipt with PrescriptionId/MedicalRecordId = null, so
        // "hủy phát" of any of its prescriptions found no receipt (reset the order, stock never returned) and the
        // inpatient reconciliation saw nothing dispensed. One receipt per prescription (same code, same time)
        // keeps each order traceable; ReceiptAsync prints them together as the ward's summary slip.
        var medicineIds = prescriptions.SelectMany(p => p.Details).Select(d => d.MedicineId).Distinct().ToList();
        // QA0915: trước đây không lọc hạn dùng / lô khóa / lô xóa → phiếu lĩnh nội trú lấy cả lô HẾT HẠN
        // và lô đang thu hồi (nhánh phát ngoại trú đã lọc từ lâu).
        var lotsByMedicine = (await _db.InventoryItems
                .Where(i => i.WarehouseId == dto.WarehouseId && i.MedicineId != null && medicineIds.Contains(i.MedicineId.Value)
                    && (i.Quantity - i.ReservedQuantity) > 0
                    && i.ExpiryDate >= DateTime.Today
                    && !i.IsLocked && !i.IsDeleted)
                .ToListAsync())
            .OrderBy(i => i.ExpiryDate).ThenBy(i => i.Id)
            .GroupBy(i => i.MedicineId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        // Stock check per medicine over the whole batch before touching anything.
        foreach (var grp in prescriptions
            .SelectMany(p => p.Details.Where(d => !d.IsDeleted && d.Status == 0))
            .GroupBy(d => d.MedicineId))
        {
            var needed = grp.Sum(d => d.Quantity);
            var available = lotsByMedicine.TryGetValue(grp.Key, out var lots) ? lots.Sum(l => l.Quantity - l.ReservedQuantity) : 0;
            if (available < needed)
            {
                var first = grp.First();
                return ServiceOutcome.Bad($"Không đủ tồn cho {first.Medicine?.MedicineName ?? grp.Key.ToString()}. Thiếu {needed - available} {first.Unit}.");
            }
        }

        decimal total = 0;
        ExportReceipt? firstExport = null;
        foreach (var p in prescriptions)
        {
            var export = new ExportReceipt
            {
                Id = Guid.NewGuid(),
                ReceiptCode = receiptCode,
                ReceiptDate = now,
                WarehouseId = dto.WarehouseId,
                ExportType = 2,
                ToDepartmentId = dto.DepartmentId,
                PrescriptionId = p.Id,
                MedicalRecordId = p.MedicalRecordId,
                PatientId = p.MedicalRecord?.PatientId,
                TotalAmount = 0,
                Status = 1,
                Note = batchNote,
                CreatedAt = now,
                CreatedBy = userId.ToString(),
            };
            firstExport ??= export;

            foreach (var detail in p.Details.Where(d => !d.IsDeleted && d.Status == 0))
            {
                var remainingQty = detail.Quantity;
                foreach (var stock in lotsByMedicine[detail.MedicineId])
                {
                    if (remainingQty <= 0) break;
                    var take = Math.Min(remainingQty, stock.Quantity - stock.ReservedQuantity);
                    if (take <= 0) continue;

                    stock.Quantity -= take;
                    remainingQty -= take;

                    var amount = take * detail.UnitPrice;
                    export.TotalAmount += amount;

                    _db.ExportReceiptDetails.Add(new ExportReceiptDetail
                    {
                        Id = Guid.NewGuid(),
                        ExportReceiptId = export.Id,
                        MedicineId = detail.MedicineId,
                        InventoryItemId = stock.Id,
                        BatchNumber = stock.BatchNumber,
                        ExpiryDate = stock.ExpiryDate,
                        Quantity = take,
                        Unit = detail.Unit,
                        UnitPrice = detail.UnitPrice,
                        Amount = amount,
                        CreatedAt = now,
                        CreatedBy = userId.ToString(),
                    });
                }

                detail.DispensedQuantity = detail.Quantity;
                detail.Status = 1;
            }

            total += export.TotalAmount;
            _db.ExportReceipts.Add(export);
        }
        var exportId = firstExport!.Id;

        foreach (var p in prescriptions)
        {
            p.IsDispensed = true;
            p.DispensedAt = now;
            p.DispensedBy = userId;
            p.Status = 2;
        }

        // QA-R11 (partial write): stock deduction + export receipts + dispensed flags + invoice refresh are two saves —
        // a failed refresh left stock moved and the orders marked dispensed while the invoice stayed stale.
        await using var tx = await SqlAppLock.BeginAsync(_db);
        await _db.SaveChangesAsync();

        // QA-R3: inpatient medicines are charges of the record from the moment they are ordered (InvoiceLedger) —
        // the cashier collects them at settlement from the record's single invoice. Keep an existing invoice current
        // (no second invoice is created here).
        var recordIds = prescriptions.Select(p => p.MedicalRecordId).Distinct().ToList();
        var invoices = await _db.InvoiceSummaries
            .Where(i => recordIds.Contains(i.MedicalRecordId) && !i.IsDeleted && i.Status != 2)
            .ToListAsync();
        if (invoices.Count > 0)
        {
            foreach (var invoice in invoices)
                await InvoiceLedger.RefreshAsync(_db, invoice);
            await _db.SaveChangesAsync();
        }
        if (tx != null) await tx.CommitAsync();

        return ServiceOutcome.Ok(new
        {
            exportReceiptId = exportId,
            receiptCode,
            totalAmount = total,
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

        // QA-R6: a ward batch is one receipt per prescription sharing code + time — print them as one slip.
        var slip = r.ExportType == 2 && r.ToDepartmentId.HasValue
            ? await _db.ExportReceipts
                .Include(x => x.Details).ThenInclude(d => d.Medicine)
                .Where(x => !x.IsDeleted && x.ExportType == 2 && x.ReceiptCode == r.ReceiptCode
                    && x.ReceiptDate == r.ReceiptDate && x.WarehouseId == r.WarehouseId
                    && x.ToDepartmentId == r.ToDepartmentId)
                .ToListAsync()
            : new List<ExportReceipt> { r };
        if (slip.Count == 0) slip.Add(r);

        return ServiceOutcome.Ok(new
        {
            r.Id,
            r.ReceiptCode,
            r.ReceiptDate,
            WarehouseName = r.Warehouse?.WarehouseName,
            DepartmentName = dept?.DepartmentName,
            TotalAmount = slip.Sum(x => x.TotalAmount),
            r.Note,
            items = slip.SelectMany(x => x.Details).Select(d => new
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
