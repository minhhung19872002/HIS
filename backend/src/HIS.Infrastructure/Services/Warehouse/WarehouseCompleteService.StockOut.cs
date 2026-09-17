using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Warehouse;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K10 phien 1 (2026-05-30): tach 5.2 Xuất kho (~1111 dong) khoi WarehouseCompleteService.
public partial class WarehouseCompleteService {
    #region 5.2 Xuất kho

    public async Task<List<StockDto>> AutoSelectBatchesAsync(Guid warehouseId, Guid itemId, decimal quantity)
    {
        // FEFO (First Expired, First Out): pick batches in expiry order until
        // we cover the requested quantity.
        var batches = await _context.InventoryItems
            .Where(i => i.WarehouseId == warehouseId
                        && (i.MedicineId == itemId || i.SupplyId == itemId)
                        && i.Quantity - i.ReservedQuantity > 0
                        && !i.IsLocked
                        && !i.IsDeleted)
            .OrderBy(i => i.ExpiryDate ?? DateTime.MaxValue)
            .Select(i => new {
                i.Id, i.WarehouseId, i.MedicineId, i.SupplyId,
                i.BatchNumber, i.ExpiryDate, i.Quantity, i.ReservedQuantity, i.UnitPrice,
                MedicineCode = i.Medicine != null ? i.Medicine.MedicineCode : null,
                MedicineName = i.Medicine != null ? i.Medicine.MedicineName : null,
                MedicineUnit = i.Medicine != null ? i.Medicine.Unit : null,
            })
            .ToListAsync();

        var result = new List<StockDto>();
        decimal remaining = quantity;
        foreach (var b in batches)
        {
            if (remaining <= 0) break;
            var available = b.Quantity - b.ReservedQuantity;
            var take = Math.Min(available, remaining);
            if (take <= 0) continue;
            result.Add(new StockDto
            {
                Id = b.Id,
                WarehouseId = b.WarehouseId,
                ItemId = b.MedicineId ?? b.SupplyId ?? Guid.Empty,
                ItemCode = b.MedicineCode ?? "",
                ItemName = b.MedicineName ?? "",
                ItemType = b.MedicineId.HasValue ? 1 : 2,
                Unit = b.MedicineUnit ?? "",
                BatchNumber = b.BatchNumber,
                ExpiryDate = b.ExpiryDate,
                Quantity = take,
                ReservedQuantity = b.ReservedQuantity,
                UnitPrice = b.UnitPrice,
            });
            remaining -= take;
        }
        return result;
    }

    public async Task<StockIssueDto> DispenseOutpatientPrescriptionAsync(Guid prescriptionId, Guid userId)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Details)
                .ThenInclude(d => d.Medicine)
            .Include(p => p.MedicalRecord)
                .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(p => p.Id == prescriptionId);
        // Sweep 2026-06-12: KeyNotFound/InvalidOperation → filter trả 404/400 message rõ (trước 500)
        if (prescription == null)
            throw new KeyNotFoundException("Khong tim thay don thuoc (prescriptionId khong ton tai)");

        // QA0915: đây là đường màn "Quầy cấp phát thuốc" gọi, nhưng khác PharmacyService.CompleteDispensingAsync
        // nó KHÔNG xét trạng thái đơn — đo được đơn Hủy (4) và đơn Nháp (5) vẫn phát 200 + trừ kho.
        // Chặn các trạng thái chắc chắn không được phát. Đơn "Chờ duyệt" (0) vẫn cho qua như cũ:
        // có bắt buộc bước duyệt dược trước khi phát tại quầy hay không là quyết định nghiệp vụ.
        if (prescription.IsDeleted
            || prescription.Status == HIS.Core.Constants.PrescriptionStatus.Cancelled
            || prescription.Status == HIS.Core.Constants.PrescriptionStatus.Draft
            || prescription.Status == HIS.Core.Constants.PrescriptionStatus.Returned)
            throw new InvalidOperationException(
                $"Đơn thuốc đang ở trạng thái \"{HIS.Core.Constants.PrescriptionStatus.GetName(prescription.Status)}\" — không phát được.");

        // Đơn chưa gán kho xuất → tự chọn kho cấp phát thuốc mặc định, KHÔNG chặn dược sĩ.
        // Nhánh phát thuốc bên PharmacyService đã làm đúng như vậy từ trước (có log); đường này
        // thì ném lỗi thẳng, mà đây LẠI là đường màn "Quầy cấp phát thuốc" thực sự gọi → 611/806
        // đơn không phát được. Hai nhánh giờ xử lý giống nhau.
        Guid warehouseId;
        if (prescription.WarehouseId is Guid assigned && assigned != Guid.Empty)
        {
            warehouseId = assigned;
        }
        else
        {
            warehouseId = await _context.Warehouses
                .Where(w => w.IsActive && !w.IsDeleted
                            && HIS.Core.Constants.WarehouseType.Dispensing.Contains(w.WarehouseType))
                .OrderBy(w => w.WarehouseName)
                .Select(w => (Guid?)w.Id)
                .FirstOrDefaultAsync()
                ?? throw new InvalidOperationException(
                    "Đơn thuốc chưa gán kho xuất và không có kho thuốc / nhà thuốc nào đang hoạt động — "
                    + "cấu hình kho trước khi phát.");
            prescription.WarehouseId = warehouseId; // ghi lại để phiếu xuất và đơn cùng trỏ một kho
        }
        var warehouse = await _context.Warehouses.FindAsync(warehouseId);

        // Kho vật tư / hóa chất KHÔNG được dùng để phát thuốc. 17 đơn cũ đang trỏ nhầm vào kho
        // vật tư do combobox màn kê đơn trước đây lọc sai WarehouseType == 2.
        if (warehouse != null && !HIS.Core.Constants.WarehouseType.IsDispensing(warehouse.WarehouseType))
            throw new InvalidOperationException(
                $"Kho \"{warehouse.WarehouseName}\" không phải kho cấp phát thuốc — chọn lại kho thuốc / nhà thuốc.");

        // NangCap26 V.33: kho đang khóa → không phát thuốc ngoại trú.
        await EnsureWarehouseNotLockedAsync(warehouseId);

        // #218/T3 (2026-09-04): gọi lần thứ hai trước đây chạy lại TOÀN BỘ vòng FEFO và trừ kho
        // thêm một lần nữa — đo được tổng tồn 166 → 160 ở lượt phát thứ hai của cùng một đơn.
        // Hàm anh em bên NỘI TRÚ đã lọc `d.Status == 0` từ lâu; đường ngoại trú thì không.
        // `IsDispensed` có được đặt bên dưới nhưng không chỗ nào đọc nó làm điều kiện — nó chỉ dùng
        // để lọc danh sách chờ phát trên màn hình, tức giấu đơn khỏi worklist chứ không chặn một
        // lời gọi thẳng theo id.
        // A line the pharmacist issued only partly (DispensedQuantity < Quantity) is still owed to the patient,
        // so it keeps the prescription dispensable — otherwise the remainder was stranded forever.
        if (!prescription.Details.Any(d => !d.IsDeleted && (d.Status == 0 || d.DispensedQuantity < d.Quantity)))
            throw new InvalidOperationException(
                "Đơn thuốc này đã phát hết, không phát lại được.");
        await EnsureNotSoldAtPharmacyAsync(prescriptionId);

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {

        // Create export receipt
        var exportReceipt = new ExportReceipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"XK{DateTime.Now:yyyyMMddHHmmss}",
            ReceiptDate = DateTime.Now,
            WarehouseId = warehouseId,
            ExportType = 1, // BN ngoại trú
            PatientId = prescription.MedicalRecord.PatientId,
            MedicalRecordId = prescription.MedicalRecordId,
            PrescriptionId = prescriptionId,
            TotalAmount = 0,
            Status = 1, // Đã xuất
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        decimal totalAmount = 0;
        var issueItems = new List<StockIssueItemDto>();

        // #218/T3: chỉ những dòng CHƯA phát, giống hệt hàm anh em bên nội trú. Thiếu mệnh đề này là
        // gọi lại sẽ phát lại cả những dòng đã phát rồi.
        // QA0915: bỏ dòng thuốc đã xoá mềm (bác sĩ gỡ khỏi đơn) — trước đây vẫn bị phát + trừ kho.
        foreach (var detail in prescription.Details.Where(d => !d.IsDeleted && (d.Status == 0 || d.DispensedQuantity < d.Quantity)))
        {
            // FEFO gộp NHIỀU lô (audit luồng nghiệp vụ 2026-06-06 #12): chọn các lô còn hạn theo
            // hạn dùng tăng dần đến khi đủ số lượng. Tổng tồn không đủ → THROW (transaction rollback),
            // KHÔNG bỏ dòng âm thầm khiến đơn "đã phát" mà thật ra thiếu thuốc. Giữ loại trừ lô hết
            // hạn để bảo đảm an toàn BN.
            var batches = await _context.InventoryItems
                .Where(i => i.WarehouseId == warehouseId
                    && i.MedicineId == detail.MedicineId
                    && (i.Quantity - i.ReservedQuantity) > 0
                    && i.ExpiryDate >= DateTime.Today
                    && !i.IsLocked && !i.IsDeleted)
                .OrderBy(i => i.ExpiryDate)
                .ToListAsync();

            // QA-R4: the pharmacist can save a SMALLER "số lượng cấp phát" per line on the Pharmacy page
            // (PUT /pharmacy/medications/{id}/dispense, clamped to [0, prescribed]) — this path then issued
            // and billed the FULL prescribed quantity anyway (measured: saved 1 of 10 → 10 left the shelf,
            // DispensedQuantity = 10). Honour the saved partial quantity; 0 / unset means "full".
            // What previous rounds already handed over (a line only carries that once it is marked dispensed).
            var issuedSoFar = detail.Status == 1 ? detail.DispensedQuantity : 0;
            // A line not yet dispensed honours the quantity the pharmacist saved; 0 / unset means "full".
            // A line already partly dispensed is being topped up, so the target is the full prescribed amount.
            var target = detail.Status == 0 && detail.DispensedQuantity > 0 && detail.DispensedQuantity < detail.Quantity
                ? detail.DispensedQuantity
                : detail.Quantity;
            var qtyToIssue = target - issuedSoFar;
            if (qtyToIssue <= 0) continue;

            var totalAvailable = batches.Sum(b => b.Quantity - b.ReservedQuantity);
            if (totalAvailable < qtyToIssue)
                throw new InvalidOperationException(
                    $"Không đủ tồn kho để phát thuốc {detail.Medicine?.MedicineName ?? detail.MedicineId.ToString()} " +
                    $"(cần {qtyToIssue}, còn {totalAvailable})");

            var remaining = qtyToIssue;
            foreach (var stock in batches)
            {
                if (remaining <= 0) break;
                var take = Math.Min(stock.Quantity - stock.ReservedQuantity, remaining);
                if (take <= 0) continue;

                stock.Quantity -= take;
                remaining -= take;

                var amount = take * detail.UnitPrice;
                totalAmount += amount;

                var exportDetail = new ExportReceiptDetail
                {
                    Id = Guid.NewGuid(),
                    ExportReceiptId = exportReceipt.Id,
                    MedicineId = detail.MedicineId,
                    InventoryItemId = stock.Id,
                    BatchNumber = stock.BatchNumber,
                    ExpiryDate = stock.ExpiryDate,
                    Quantity = take,
                    Unit = detail.Unit,
                    UnitPrice = detail.UnitPrice,
                    Amount = amount,
                    CreatedAt = DateTime.Now,
                    CreatedBy = userId.ToString()
                };
                _context.ExportReceiptDetails.Add(exportDetail);

                issueItems.Add(new StockIssueItemDto
                {
                    Id = exportDetail.Id,
                    StockIssueId = exportReceipt.Id,
                    ItemId = detail.MedicineId,
                    ItemCode = detail.Medicine?.MedicineCode ?? string.Empty,
                    ItemName = detail.Medicine?.MedicineName ?? string.Empty,
                    ItemType = 1, // Thuốc
                    Unit = detail.Unit ?? string.Empty,
                    StockId = stock.Id,
                    BatchNumber = stock.BatchNumber,
                    ExpiryDate = stock.ExpiryDate,
                    Quantity = take,
                    UnitPrice = detail.UnitPrice,
                    Amount = amount
                });
            }

            detail.DispensedQuantity = issuedSoFar + qtyToIssue;
            detail.Status = 1; // Đã cấp (đủ hoặc một phần — đơn mang trạng thái 6 khi còn thiếu)
        }

        exportReceipt.TotalAmount = totalAmount;
        _context.ExportReceipts.Add(exportReceipt);

        // Update prescription status — Cấp một phần (6) nếu còn dòng chưa cấp đủ, ngược lại Đã cấp phát (2).
        prescription.IsDispensed = true;
        prescription.DispensedAt = DateTime.Now;
        prescription.DispensedBy = userId;
        var allFull1 = prescription.Details.All(d => d.IsDeleted || d.DispensedQuantity >= d.Quantity);
        prescription.Status = allFull1 ? 2 : 6; // 2=Đã cấp phát đủ, 6=Cấp một phần

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        // #17 (audit luồng nghiệp vụ 2026-06-06): tự động tạo billing thuốc ngay sau khi phát
        // (idempotent qua ExportReceipt.IsBilled) — trước đây phải gọi tay, quên thì tiền thuốc
        // không vào hóa đơn. Cố ý nuốt lỗi: việc phát đã commit thành công, billing lỗi có thể
        // retry bằng nút thủ công /pharmacy/create-billing — KHÔNG được rollback phần đã phát.
        try { await CreateBillingAfterDispensingAsync(exportReceipt.Id, userId); }
        catch { /* billing retryable; không làm hỏng việc phát đã commit */ }

        var patient = prescription.MedicalRecord.Patient;

        return new StockIssueDto
        {
            Id = exportReceipt.Id,
            IssueCode = exportReceipt.ReceiptCode,
            IssueDate = exportReceipt.ReceiptDate,
            WarehouseId = warehouseId,
            WarehouseName = warehouse?.WarehouseName ?? string.Empty,
            IssueType = 1,
            PatientId = patient.Id,
            PatientCode = patient.PatientCode,
            PatientName = patient.FullName,
            PrescriptionId = prescriptionId,
            Items = issueItems,
            TotalAmount = totalAmount,
            Status = 1,
            CreatedBy = userId,
            CreatedAt = exportReceipt.CreatedAt
        };

        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<StockIssueDto> DispenseInpatientOrderAsync(Guid orderSummaryId, Guid userId)
    {
        // For inpatient, orderSummaryId is a prescription ID (inpatient type)
        var prescription = await _context.Prescriptions
            .Include(p => p.Details)
                .ThenInclude(d => d.Medicine)
            .Include(p => p.MedicalRecord)
                .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(p => p.Id == orderSummaryId && p.PrescriptionType == 2);
        if (prescription == null)
            throw new KeyNotFoundException("Inpatient prescription not found");
        // QA0915: same status gate as the outpatient path.
        if (prescription.IsDeleted
            || prescription.Status == HIS.Core.Constants.PrescriptionStatus.Cancelled
            || prescription.Status == HIS.Core.Constants.PrescriptionStatus.Draft
            || prescription.Status == HIS.Core.Constants.PrescriptionStatus.Returned)
            throw new InvalidOperationException(
                $"Đơn thuốc đang ở trạng thái \"{HIS.Core.Constants.PrescriptionStatus.GetName(prescription.Status)}\" — không phát được.");
        if (!prescription.Details.Any(d => !d.IsDeleted && d.Status == 0))
            throw new InvalidOperationException("Đơn thuốc này đã phát hết, không phát lại được.");
        await EnsureNotSoldAtPharmacyAsync(orderSummaryId);

        var warehouseId = prescription.WarehouseId ?? throw new InvalidOperationException("No warehouse assigned");
        var warehouse = await _context.Warehouses.FindAsync(warehouseId);

        // NangCap26 V.33: kho đang khóa → không phát thuốc nội trú.
        await EnsureWarehouseNotLockedAsync(warehouseId);

        var exportReceipt = new ExportReceipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"XN{DateTime.Now:yyyyMMddHHmmss}",
            ReceiptDate = DateTime.Now,
            WarehouseId = warehouseId,
            ExportType = 2, // BN nội trú
            PatientId = prescription.MedicalRecord.PatientId,
            MedicalRecordId = prescription.MedicalRecordId,
            PrescriptionId = orderSummaryId,
            TotalAmount = 0,
            Status = 1,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        decimal totalAmount = 0;
        var issueItems = new List<StockIssueItemDto>();

        foreach (var detail in prescription.Details.Where(d => !d.IsDeleted && d.Status == 0))
        {
            // QA0915 (đo trên API): bản cũ chỉ tìm MỘT lô đủ cả số lượng; không có lô nào đủ thì
            // `stock == null` → bỏ qua trừ kho nhưng VẪN đánh dấu dòng "đã cấp" và đơn "Đã cấp phát"
            // (phiếu xuất rỗng, tồn không đổi). Bản cũ cũng không lọc hạn dùng → lô HẾT HẠN được phát
            // cho BN nội trú. Nay làm y hệt nhánh ngoại trú: FEFO gộp nhiều lô còn hạn, thiếu thì THROW.
            // Lọc số lượng khả dụng trên giá trị trong bộ nhớ (thực thể đang theo dõi), nên hai dòng
            // cùng thuốc trong một đơn không cùng "thấy" số tồn trước khi trừ.
            // NangCap26 V.31: loại lô đang khóa khỏi FEFO.
            var batches = (await _context.InventoryItems
                    .Where(i => i.WarehouseId == warehouseId
                        && i.MedicineId == detail.MedicineId
                        && i.ExpiryDate >= DateTime.Today
                        && !i.IsLocked && !i.IsDeleted)
                    .ToListAsync())
                .Where(i => i.Quantity - i.ReservedQuantity > 0)
                .OrderBy(i => i.ExpiryDate)
                .ToList();

            var totalAvailable = batches.Sum(b => b.Quantity - b.ReservedQuantity);
            if (totalAvailable < detail.Quantity)
                throw new InvalidOperationException(
                    $"Không đủ tồn kho để phát thuốc {detail.Medicine?.MedicineName ?? detail.MedicineId.ToString()} " +
                    $"(cần {detail.Quantity}, còn {totalAvailable} trong các lô còn hạn)");

            var remaining = detail.Quantity;
            foreach (var stock in batches)
            {
                if (remaining <= 0) break;
                var take = Math.Min(stock.Quantity - stock.ReservedQuantity, remaining);
                if (take <= 0) continue;

                stock.Quantity -= take;
                remaining -= take;
                var amount = take * detail.UnitPrice;
                totalAmount += amount;

                var exportDetail = new ExportReceiptDetail
                {
                    Id = Guid.NewGuid(),
                    ExportReceiptId = exportReceipt.Id,
                    MedicineId = detail.MedicineId,
                    InventoryItemId = stock.Id,
                    BatchNumber = stock.BatchNumber,
                    ExpiryDate = stock.ExpiryDate,
                    Quantity = take,
                    Unit = detail.Unit,
                    UnitPrice = detail.UnitPrice,
                    Amount = amount,
                    CreatedAt = DateTime.Now,
                    CreatedBy = userId.ToString()
                };
                _context.ExportReceiptDetails.Add(exportDetail);

                issueItems.Add(new StockIssueItemDto
                {
                    Id = exportDetail.Id,
                    StockIssueId = exportReceipt.Id,
                    ItemId = detail.MedicineId,
                    ItemCode = detail.Medicine?.MedicineCode ?? string.Empty,
                    ItemName = detail.Medicine?.MedicineName ?? string.Empty,
                    ItemType = 1, // Thuốc
                    Unit = detail.Unit ?? string.Empty,
                    StockId = stock.Id,
                    BatchNumber = stock.BatchNumber,
                    ExpiryDate = stock.ExpiryDate,
                    Quantity = take,
                    UnitPrice = detail.UnitPrice,
                    Amount = amount
                });
            }

            detail.DispensedQuantity = detail.Quantity;
            detail.Status = 1;
        }

        exportReceipt.TotalAmount = totalAmount;
        _context.ExportReceipts.Add(exportReceipt);

        prescription.IsDispensed = true;
        prescription.DispensedAt = DateTime.Now;
        prescription.DispensedBy = userId;
        var allFull2 = prescription.Details.All(d => d.IsDeleted || d.DispensedQuantity >= d.Quantity);
        prescription.Status = allFull2 ? 2 : 6; // 2=Đã cấp phát đủ, 6=Cấp một phần

        await _context.SaveChangesAsync();

        return new StockIssueDto
        {
            Id = exportReceipt.Id,
            IssueCode = exportReceipt.ReceiptCode,
            IssueDate = exportReceipt.ReceiptDate,
            WarehouseId = warehouseId,
            WarehouseName = warehouse?.WarehouseName ?? string.Empty,
            IssueType = 2,
            PatientId = prescription.MedicalRecord.PatientId,
            PatientName = prescription.MedicalRecord.Patient.FullName,
            PrescriptionId = orderSummaryId,
            Items = issueItems,
            TotalAmount = totalAmount,
            Status = 1,
            CreatedBy = userId,
            CreatedAt = exportReceipt.CreatedAt
        };
    }

    public async Task<StockIssueDto> IssueToDepartmentAsync(CreateStockIssueDto dto, Guid userId)
    {
        NormalizeIssueDate(dto);
        var warehouse = await _context.Warehouses.FindAsync(dto.WarehouseId);
        if (warehouse == null)
            throw new KeyNotFoundException("Warehouse not found");

        // NangCap26 V.33: kho đang khóa → không xuất cho khoa/phòng.
        await EnsureWarehouseNotLockedAsync(dto.WarehouseId);

        var department = dto.DepartmentId.HasValue
            ? await _context.Departments.FindAsync(dto.DepartmentId.Value)
            : null;

        var exportReceipt = new ExportReceipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"XK{DateTime.Now:yyyyMMddHHmmss}",
            ReceiptDate = dto.IssueDate,
            WarehouseId = dto.WarehouseId,
            ExportType = 3, // Chuyển kho / xuất khoa
            ToDepartmentId = dto.DepartmentId,
            TotalAmount = 0,
            Note = dto.Notes,
            Status = 1, // Đã xuất
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        decimal totalAmount = 0;
        var issueItems = new List<StockIssueItemDto>();

        // perf(#195): batch-load medicine reference data (read-only, no accumulator dependency).
        // NOTE: InventoryItems (stock) lookup below is intentionally NOT batched — it depends on
        // in-loop decrements (FEFO oversell-guard `Quantity - ReservedQuantity >= item.Quantity`),
        // so pre-loading a static snapshot would change oversell behavior. Left as per-iteration query.
        var medicineIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
        var medicinesMap = await _context.Medicines
            .Where(m => medicineIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id);

        if (dto.Items == null || dto.Items.Count == 0)
            throw new InvalidOperationException("Phiếu xuất phải có ít nhất 1 dòng thuốc.");

        foreach (var item in dto.Items)
        {
            medicinesMap.TryGetValue(item.ItemId, out var medicine);
            foreach (var (stock, take) in await PickIssueLotsAsync(dto.WarehouseId, item, exportType: 3))
            {
                stock.Quantity -= take;
                var amount = take * stock.UnitPrice;
                totalAmount += amount;

                var exportDetail = new ExportReceiptDetail
                {
                    Id = Guid.NewGuid(),
                    ExportReceiptId = exportReceipt.Id,
                    MedicineId = item.ItemId,
                    InventoryItemId = stock.Id,
                    BatchNumber = stock.BatchNumber,
                    ExpiryDate = stock.ExpiryDate,
                    Quantity = take,
                    Unit = medicine?.Unit,
                    UnitPrice = stock.UnitPrice,
                    Amount = amount,
                    CreatedAt = DateTime.Now,
                    CreatedBy = userId.ToString()
                };
                _context.ExportReceiptDetails.Add(exportDetail);

                issueItems.Add(new StockIssueItemDto
                {
                    Id = exportDetail.Id,
                    StockIssueId = exportReceipt.Id,
                    ItemId = item.ItemId,
                    ItemCode = medicine?.MedicineCode ?? string.Empty,
                    ItemName = medicine?.MedicineName ?? string.Empty,
                    ItemType = 1, // Thuốc
                    Unit = medicine?.Unit ?? string.Empty,
                    StockId = stock.Id,
                    BatchNumber = stock.BatchNumber,
                    ExpiryDate = stock.ExpiryDate,
                    Quantity = take,
                    UnitPrice = stock.UnitPrice,
                    Amount = amount
                });
            }
        }

        exportReceipt.TotalAmount = totalAmount;
        _context.ExportReceipts.Add(exportReceipt);
        await _context.SaveChangesAsync();

        return new StockIssueDto
        {
            Id = exportReceipt.Id,
            IssueCode = exportReceipt.ReceiptCode,
            IssueDate = exportReceipt.ReceiptDate,
            WarehouseId = dto.WarehouseId,
            WarehouseName = warehouse.WarehouseName,
            IssueType = 3,
            DepartmentId = dto.DepartmentId,
            DepartmentName = department?.DepartmentName ?? string.Empty,
            Items = issueItems,
            TotalAmount = totalAmount,
            Status = 1,
            CreatedBy = userId,
            CreatedAt = exportReceipt.CreatedAt,
            Notes = dto.Notes
        };
    }

    public async Task<StockIssueDto> CreateTransferIssueAsync(CreateStockIssueDto dto, Guid userId)
    {
        return await CreateStockIssueByTypeAsync(dto, userId, 4, "CK");
    }

    public async Task<StockIssueDto> CreateSupplierReturnAsync(CreateStockIssueDto dto, Guid userId)
    {
        // QA-R3: the supplier is stored in ExportReceipts.SupplierId (migration 206) — it used to be a
        // "[NCC:<id>]" note tag; MapExportReceiptAsync still reads that tag for rows written before.
        if (dto.SupplierId is Guid supplierId && supplierId != Guid.Empty)
        {
            if (!await _context.Suppliers.AsNoTracking().AnyAsync(s => s.Id == supplierId))
                throw new KeyNotFoundException("Nhà cung cấp không tồn tại");
        }
        else
        {
            dto.SupplierId = null;
        }
        return await CreateStockIssueByTypeAsync(dto, userId, 5, "TN");
    }

    // Legacy note tag for the supplier of a "Xuất trả NCC" issue (before ExportReceipts.SupplierId existed).
    private const string SupplierReturnTagPrefix = "[NCC:";

    public async Task<StockIssueDto> CreateExternalIssueAsync(CreateStockIssueDto dto, Guid userId)
    {
        return await CreateStockIssueByTypeAsync(dto, userId, 6, "XN");
    }

    public async Task<StockIssueDto> CreateDestructionIssueAsync(CreateStockIssueDto dto, Guid userId)
    {
        return await CreateStockIssueByTypeAsync(dto, userId, 7, "HY");
    }

    public async Task<StockIssueDto> CreateTestSampleIssueAsync(CreateStockIssueDto dto, Guid userId)
    {
        return await CreateStockIssueByTypeAsync(dto, userId, 8, "MX");
    }

    public async Task<StockIssueDto> CreateStockTakeIssueAsync(CreateStockIssueDto dto, Guid userId)
    {
        return await CreateStockIssueByTypeAsync(dto, userId, 9, "KG");
    }

    public async Task<StockIssueDto> CreateDisposalIssueAsync(CreateStockIssueDto dto, Guid userId)
    {
        return await CreateStockIssueByTypeAsync(dto, userId, 10, "TL");
    }

    public async Task<StockIssueDto> CreateCabinetIssueAsync(CreateCabinetIssueDto dto, Guid userId)
    {
        // Force IssueType = 12 (EmergencyCabinetIssue) regardless of client value.
        // Context IDs (AdmissionId/SurgeryId/ExaminationId) stored in ExportReceipt.Note
        // for traceability until ExportReceipt entity gains dedicated FK columns.
        dto.IssueType = 12;

        string contextTag = string.Empty;
        if (dto.AdmissionId.HasValue)
            contextTag = $"[ADMISSION:{dto.AdmissionId}]";
        else if (dto.SurgeryId.HasValue)
            contextTag = $"[SURGERY:{dto.SurgeryId}]";
        else if (dto.ExaminationId.HasValue)
            contextTag = $"[EXAM:{dto.ExaminationId}]";

        if (!string.IsNullOrEmpty(contextTag))
            dto.Notes = string.IsNullOrEmpty(dto.Notes) ? contextTag : $"{contextTag} {dto.Notes}";

        // Validate cabinet warehouse (HIS.Core WarehouseType 5 = ward cabinet, or IsCabinet=true).
        // QA-R3: was "type 4" = the hospital pharmacy, so a cabinet issue could deduct pharmacy stock.
        var warehouse = await _context.Warehouses.FindAsync(dto.WarehouseId);
        if (warehouse == null)
            throw new KeyNotFoundException("Warehouse not found");
        if (warehouse.WarehouseType != HIS.Core.Constants.WarehouseType.WardCabinet && !warehouse.IsCabinet)
            throw new InvalidOperationException("Kho đã chọn không phải tủ trực (loại kho 5 hoặc đánh dấu tủ trực).");

        return await CreateStockIssueByTypeAsync(dto, userId, 12, "TT");
    }

    /// <summary>
    /// Bán thuốc theo đơn bác sĩ.
    ///
    /// <para>#218/T3 — trước đây là vỏ rỗng: sinh `SaleCode` từ `DateTime.Now`, `Items = []`,
    /// `TotalAmount = 0`, không ghi gì. Mà giao diện dược lại gọi đúng cửa này
    /// (`frontend/src/modules/pharmacy/api/warehouse.ts`), nên dược sĩ bán thuốc, phần mềm báo thành
    /// công, **tiền không vào sổ và tồn kho không trừ**. Đo được ở
    /// evidence/cross/t3/t3_pharmacy_sale.json.</para>
    ///
    /// <para>Bản đúng đã tồn tại ở `HospitalPharmacyService.CreateSaleAsync` — ghi `RetailSales` +
    /// `RetailSaleItems`, trừ tồn kho theo FEFO, chạy trong transaction, từ chối khi thiếu tồn. Nên
    /// cửa này **ủy thác** cho bản đúng thay vì viết bản thứ ba: sau mười sáu lần gặp hình dạng "một
    /// luật thi hành ở một cửa, bỏ trống ở cửa bên cạnh", gặp hai cửa cùng làm một việc thì hợp nhất,
    /// đừng nhân bản.</para>
    /// </summary>
    public async Task<PharmacySaleDto> CreatePharmacySaleByPrescriptionAsync(Guid prescriptionId, Guid userId)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Include(p => p.MedicalRecord).ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn thuốc");

        var lines = prescription.Details.Where(d => !d.IsDeleted && d.Quantity > 0).ToList();
        if (lines.Count == 0)
            throw new InvalidOperationException("Đơn thuốc không có dòng thuốc nào để bán.");

        var patient = prescription.MedicalRecord?.Patient;
        var sale = await _hospitalPharmacy.CreateSaleAsync(new CreateRetailSaleDto
        {
            PrescriptionId = prescriptionId,
            CashierId = userId,
            PatientId = patient?.Id,
            PatientName = patient?.FullName,
            PhoneNumber = patient?.PhoneNumber,
            PaymentMethod = "Cash",
            Notes = $"Bán theo đơn {prescription.PrescriptionCode}",
            Items = lines.Select(d => new CreateRetailSaleItemDto
            {
                MedicineId = d.MedicineId,
                MedicineName = d.Medicine?.MedicineName ?? string.Empty,
                Unit = d.Unit ?? d.Medicine?.Unit,
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                WarehouseId = d.WarehouseId,
            }).ToList(),
        });

        var user = await _context.Users.FindAsync(userId);
        return new PharmacySaleDto
        {
            Id = sale.Id,
            SaleCode = sale.SaleCode,
            SaleDate = DateTime.Now,
            SaleType = 1, // Theo đơn BS
            PrescriptionId = prescriptionId,
            PatientId = patient?.Id,
            PatientName = patient?.FullName,
            Items = sale.Items.Select(i => new PharmacySaleItemDto
            {
                Id = i.Id,
                ItemId = i.MedicineId,
                ItemName = i.MedicineName,
                Unit = i.Unit ?? string.Empty,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
            }).ToList(),
            SubTotal = sale.TotalAmount,
            TotalAmount = sale.TotalAmount,
            SoldBy = userId,
            SoldByName = user?.FullName ?? string.Empty
        };
    }

    /// <summary>
    /// Bán lẻ tại quầy. #218/T3 — trước đây chỉ gán vài trường lên chính DTO người dùng gửi lên rồi
    /// trả lại nguyên si, không ghi gì. Nay cũng ủy thác cho `HospitalPharmacyService.CreateSaleAsync`
    /// như cửa bán theo đơn, để hai đường bán thuốc dùng chung đúng một bản có trừ tồn kho.
    /// </summary>
    public async Task<PharmacySaleDto> CreateRetailSaleAsync(PharmacySaleDto dto, Guid userId)
    {
        var lines = (dto.Items ?? new List<PharmacySaleItemDto>())
            .Where(i => i.Quantity > 0).ToList();
        if (lines.Count == 0)
            throw new InvalidOperationException("Phiếu bán lẻ không có dòng hàng nào.");

        var sale = await _hospitalPharmacy.CreateSaleAsync(new CreateRetailSaleDto
        {
            CashierId = userId,
            PatientId = dto.PatientId,
            PatientName = dto.PatientName ?? dto.CustomerName,
            PaymentMethod = "Cash",
            Items = lines.Select(i => new CreateRetailSaleItemDto
            {
                MedicineId = i.ItemId,
                MedicineName = i.ItemName,
                Unit = i.Unit,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                WarehouseId = dto.WarehouseId == Guid.Empty ? null : dto.WarehouseId,
            }).ToList(),
        });

        var user = await _context.Users.FindAsync(userId);
        dto.Id = sale.Id;
        dto.SaleCode = sale.SaleCode;
        dto.SaleDate = DateTime.Now;
        dto.SaleType = 2; // Bán lẻ
        dto.SubTotal = sale.TotalAmount;
        dto.TotalAmount = sale.TotalAmount;
        dto.SoldBy = userId;
        dto.SoldByName = user?.FullName ?? string.Empty;
        return dto;
    }

    public async Task<bool> CancelStockIssueAsync(Guid id, string reason, Guid userId)
    {
        var receipt = await _context.ExportReceipts
            .Include(r => r.Details)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (receipt == null)
            throw new KeyNotFoundException("Stock issue not found");
        if (receipt.Status == 2)
            throw new InvalidOperationException("Phiếu xuất đã bị hủy trước đó");

        // If already issued, reverse inventory
        if (receipt.Status == 1)
        {
            // QA0915: phiếu chuyển kho nay có phiếu nhập đối ứng ở kho nhận → đảo cả hai. Kho nhận đã
            // dùng mất hàng thì chặn hủy (không để lô kho nhận âm).
            if (receipt.ExportType == 4)
            {
                var tag = TransferTag(receipt.Id);
                var transferIns = await _context.ImportReceipts
                    .Include(r => r.Details)
                    .Where(r => r.Status == 1 && r.ImportType == 3 && r.Note != null && r.Note.StartsWith(tag))
                    .ToListAsync();
                foreach (var transferIn in transferIns)
                {
                    foreach (var d in transferIn.Details)
                    {
                        var lot = await FindLotAsync(transferIn.WarehouseId, d.MedicineId, d.BatchNumber);
                        var available = lot == null ? 0 : lot.Quantity - lot.ReservedQuantity;
                        if (available < d.Quantity)
                            throw new InvalidOperationException(
                                $"Không hủy được phiếu chuyển kho: kho nhận đã xuất dùng lô {d.BatchNumber ?? "(không số lô)"} "
                                + $"(cần trả lại {d.Quantity:0.##}, tồn khả dụng {available:0.##}).");
                        lot!.Quantity -= d.Quantity;
                    }
                    transferIn.Status = 2;
                    transferIn.Note = $"{transferIn.Note} | Hủy theo phiếu xuất: {reason}";
                }
            }

            foreach (var detail in receipt.Details)
            {
                var stock = await _context.InventoryItems
                    .FirstOrDefaultAsync(i => i.Id == detail.InventoryItemId);
                if (stock != null)
                {
                    stock.Quantity += detail.Quantity;
                }
            }
        }

        receipt.Status = 2; // Đã hủy
        receipt.Note = $"{receipt.Note} | Hủy: {reason}";
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// QA0915 (review M8): đơn đã được BÁN tại nhà thuốc (RetailSale theo đơn, chưa hủy) thì không phát tại
    /// quầy nữa — hai đường cùng trừ kho cho một đơn sẽ trừ hai lần. Chiều ngược lại chặn ở
    /// HospitalPharmacyService.CreateSaleAsync.
    /// </summary>
    private async Task EnsureNotSoldAtPharmacyAsync(Guid prescriptionId)
    {
        var sold = await _context.RetailSales.AnyAsync(s =>
            s.PrescriptionId == prescriptionId && s.Status != "Cancelled" && !s.IsDeleted);
        if (sold)
            throw new InvalidOperationException(
                "Đơn thuốc này đã được bán tại nhà thuốc bệnh viện — không cấp phát tại quầy được. "
                + "Muốn phát tại quầy thì hủy phiếu bán trước.");
    }

    /// <summary>Tag trong ImportReceipt.Note liên kết phiếu nhập đối ứng với phiếu xuất chuyển kho (không có cột FK).</summary>
    private static string TransferTag(Guid exportReceiptId) => $"[CK:{exportReceiptId}]";

    /// <summary>Lô đang theo dõi (kể cả lô vừa Add chưa SaveChanges) theo kho + thuốc + số lô.</summary>
    private async Task<InventoryItem?> FindLotAsync(Guid warehouseId, Guid? medicineId, string? batchNumber)
    {
        var local = _context.InventoryItems.Local.FirstOrDefault(i =>
            i.WarehouseId == warehouseId && i.MedicineId == medicineId && i.BatchNumber == batchNumber && !i.IsDeleted);
        return local ?? await _context.InventoryItems.FirstOrDefaultAsync(i =>
            i.WarehouseId == warehouseId && i.MedicineId == medicineId && i.BatchNumber == batchNumber && !i.IsDeleted);
    }

    /// <summary>Cộng lượng chuyển vào lô tương ứng ở kho nhận (tạo lô mới nếu chưa có) + dòng phiếu nhập đối ứng.</summary>
    private async Task CreditTransferTargetAsync(
        ImportReceipt transferIn, InventoryItem sourceLot, decimal quantity, string? unit, Guid userId,
        Dictionary<(Guid?, string?), InventoryItem> targetLots)
    {
        var key = (sourceLot.MedicineId, sourceLot.BatchNumber);
        if (!targetLots.TryGetValue(key, out var targetLot))
        {
            targetLot = await FindLotAsync(transferIn.WarehouseId, sourceLot.MedicineId, sourceLot.BatchNumber);
            if (targetLot == null)
            {
                targetLot = new InventoryItem
                {
                    Id = Guid.NewGuid(),
                    WarehouseId = transferIn.WarehouseId,
                    ItemType = sourceLot.ItemType,
                    MedicineId = sourceLot.MedicineId,
                    SupplyId = sourceLot.SupplyId,
                    BatchNumber = sourceLot.BatchNumber,
                    ExpiryDate = sourceLot.ExpiryDate,
                    ManufactureDate = sourceLot.ManufactureDate,
                    Quantity = 0,
                    ReservedQuantity = 0,
                    ImportPrice = sourceLot.ImportPrice,
                    UnitPrice = sourceLot.UnitPrice,
                    CreatedAt = DateTime.Now,
                    CreatedBy = userId.ToString()
                };
                _context.InventoryItems.Add(targetLot);
            }
            targetLots[key] = targetLot;
        }
        targetLot.Quantity += quantity;

        _context.ImportReceiptDetails.Add(new ImportReceiptDetail
        {
            Id = Guid.NewGuid(),
            ImportReceiptId = transferIn.Id,
            MedicineId = sourceLot.MedicineId,
            SupplyId = sourceLot.SupplyId,
            BatchNumber = sourceLot.BatchNumber,
            ExpiryDate = sourceLot.ExpiryDate,
            ManufactureDate = sourceLot.ManufactureDate,
            Quantity = quantity,
            Unit = unit,
            UnitPrice = sourceLot.UnitPrice,
            Amount = quantity * sourceLot.UnitPrice,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        });
    }

    /// <summary>
    /// Chọn lô cho một dòng phiếu xuất kho. QA0915 — các lỗi đo được trên API trước khi sửa:
    /// <list type="bullet">
    /// <item>truyền StockId: không kiểm kho / thuốc / số lượng → lô xuống −970; qty âm (−7) còn CỘNG kho;</item>
    /// <item>FEFO tự chọn: điều kiện tồn lọc trong SQL trên giá trị DB, nên 2 dòng cùng thuốc đều "đủ"
    /// theo số tồn trước khi trừ → lô −35; lô HẾT HẠN được chọn trước cho xuất khoa;
    /// và bắt buộc một lô phải đủ cả dòng.</item>
    /// </list>
    /// Lô hết hạn chỉ được xuất ở các loại phiếu sinh ra để đẩy hàng hết hạn đi (trả NCC, hủy, kiểm kê giảm, thanh lý).
    /// </summary>
    private async Task<List<(InventoryItem Stock, decimal Take)>> PickIssueLotsAsync(
        Guid warehouseId, CreateStockIssueItemDto item, int exportType)
    {
        if (item.Quantity <= 0)
            throw new InvalidOperationException("Số lượng xuất mỗi dòng phải lớn hơn 0.");

        var allowExpired = exportType is 5 or 7 or 9 or 10;
        var today = DateTime.Today;

        if (item.StockId.HasValue)
        {
            var stock = await _context.InventoryItems.FindAsync(item.StockId.Value);
            if (stock == null || stock.IsDeleted || stock.WarehouseId != warehouseId
                || (stock.MedicineId != item.ItemId && stock.SupplyId != item.ItemId))
                throw new InvalidOperationException(
                    $"Lô {item.StockId} không thuộc kho xuất hoặc không đúng thuốc đã chọn.");

            // NangCap26 V.31: chọn đích danh lô cũng không được nếu lô đang khóa.
            EnsureBatchNotLocked(stock);

            if (!allowExpired && stock.ExpiryDate.HasValue && stock.ExpiryDate.Value < today)
                throw new InvalidOperationException(
                    $"Lô {stock.BatchNumber} đã hết hạn ({stock.ExpiryDate:dd/MM/yyyy}), không xuất sử dụng được.");

            var available = stock.Quantity - stock.ReservedQuantity;
            if (available < item.Quantity)
                throw new InvalidOperationException(
                    $"Lô {stock.BatchNumber} không đủ tồn (cần {item.Quantity:0.##}, còn {available:0.##}).");
            return new List<(InventoryItem, decimal)> { (stock, item.Quantity) };
        }

        // Thực thể đang theo dõi: EF trả lại đúng instance đã bị các dòng trước trừ trong bộ nhớ,
        // nên lọc/tính tồn khả dụng ở phía C# chứ không trong SQL.
        var lots = (await _context.InventoryItems
                .Where(i => i.WarehouseId == warehouseId && i.MedicineId == item.ItemId
                    && !i.IsLocked && !i.IsDeleted
                    && (allowExpired || i.ExpiryDate == null || i.ExpiryDate >= today))
                .ToListAsync())
            .Where(i => i.Quantity - i.ReservedQuantity > 0)
            .OrderBy(i => i.ExpiryDate ?? DateTime.MaxValue).ThenBy(i => i.Id)
            .ToList();

        var totalAvailable = lots.Sum(l => l.Quantity - l.ReservedQuantity);
        if (totalAvailable < item.Quantity)
            throw new InvalidOperationException(
                $"Insufficient stock for item {item.ItemId}: cần {item.Quantity:0.##}, còn {totalAvailable:0.##}"
                + (allowExpired ? "" : " (không tính lô hết hạn)"));

        var picks = new List<(InventoryItem, decimal)>();
        var remaining = item.Quantity;
        foreach (var lot in lots)
        {
            if (remaining <= 0) break;
            var take = Math.Min(lot.Quantity - lot.ReservedQuantity, remaining);
            picks.Add((lot, take));
            remaining -= take;
        }
        return picks;
    }

    /// <summary>
    /// QA-R6: the slip date was stored as sent while the stock left NOW — an omitted issueDate was saved as
    /// 01/01/0001 (the slip vanished from every dated report) and a future date hid today's issue. The document
    /// date may be earlier (entering yesterday's slip) but not missing and not in the future.
    /// </summary>
    private static void NormalizeIssueDate(CreateStockIssueDto dto)
    {
        if (dto.IssueDate == default)
            dto.IssueDate = DateTime.Now;
        else if (dto.IssueDate.Date > DateTime.Today)
            throw new InvalidOperationException("Ngày xuất không được ở tương lai.");
    }

    /// <summary>
    /// Helper: tạo phiếu xuất kho theo loại (ExportType)
    /// </summary>
    private async Task<StockIssueDto> CreateStockIssueByTypeAsync(CreateStockIssueDto dto, Guid userId, int exportType, string codePrefix)
    {
        NormalizeIssueDate(dto);
        var warehouse = await _context.Warehouses.FindAsync(dto.WarehouseId);
        if (warehouse == null)
            throw new KeyNotFoundException("Warehouse not found");

        // NangCap26 V.33: kho đang khóa → chặn mọi phiếu xuất/luân chuyển từ kho này.
        await EnsureWarehouseNotLockedAsync(dto.WarehouseId);

        var department = dto.DepartmentId.HasValue
            ? await _context.Departments.FindAsync(dto.DepartmentId.Value)
            : null;

        var targetWarehouse = dto.TargetWarehouseId.HasValue
            ? await _context.Warehouses.FindAsync(dto.TargetWarehouseId.Value)
            : null;

        if (dto.Items == null || dto.Items.Count == 0)
            throw new InvalidOperationException("Phiếu xuất phải có ít nhất 1 dòng thuốc.");

        // QA0915: chuyển kho trước đây không kiểm kho nhận (chuyển A→A vẫn 200 và tồn mất 5) và
        // kho nhận KHÔNG bao giờ được cộng (đo được: kho nguồn −10, tủ trực +0).
        if (exportType == 4)
        {
            if (!dto.TargetWarehouseId.HasValue || dto.TargetWarehouseId.Value == Guid.Empty)
                throw new InvalidOperationException("Phiếu chuyển kho phải chọn kho nhận.");
            if (dto.TargetWarehouseId.Value == dto.WarehouseId)
                throw new InvalidOperationException("Kho nhận phải khác kho xuất.");
            if (targetWarehouse == null || targetWarehouse.IsDeleted)
                throw new KeyNotFoundException("Kho nhận không tồn tại");
        }

        var exportReceipt = new ExportReceipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"{codePrefix}{DateTime.Now:yyyyMMddHHmmss}",
            ReceiptDate = dto.IssueDate,
            WarehouseId = dto.WarehouseId,
            ExportType = exportType,
            ToDepartmentId = dto.DepartmentId,
            ToWarehouseId = dto.TargetWarehouseId,
            SupplierId = exportType == 5 ? dto.SupplierId : null, // xuất trả NCC
            TotalAmount = 0,
            Note = dto.Notes,
            Status = 1, // Đã xuất
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        decimal totalAmount = 0;
        var issueItems = new List<StockIssueItemDto>();

        // perf(#195): batch-load medicine reference data (read-only, no accumulator dependency).
        // NOTE: InventoryItems (stock) lookup below is intentionally NOT batched — it depends on
        // in-loop decrements (FEFO oversell-guard `Quantity - ReservedQuantity >= item.Quantity`),
        // so pre-loading a static snapshot would change oversell behavior. Left as per-iteration query.
        var medicineIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
        var medicinesMap = await _context.Medicines
            .Where(m => medicineIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id);

        // Chuyển kho: phiếu nhập đối ứng ở kho nhận, tự duyệt, gắn tag để CancelStockIssueAsync đảo lại.
        ImportReceipt? transferIn = null;
        var targetLots = new Dictionary<(Guid?, string?), InventoryItem>();
        if (exportType == 4)
        {
            transferIn = new ImportReceipt
            {
                Id = Guid.NewGuid(),
                ReceiptCode = $"NC{DateTime.Now:yyyyMMddHHmmss}",
                ReceiptDate = dto.IssueDate,
                WarehouseId = dto.TargetWarehouseId!.Value,
                ImportType = 3, // Nhập chuyển kho
                Status = 1,
                ApprovedBy = userId,
                ApprovedAt = DateTime.Now,
                Note = $"{TransferTag(exportReceipt.Id)} Nhận chuyển kho từ {warehouse.WarehouseName} — phiếu xuất {exportReceipt.ReceiptCode}",
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };
        }

        foreach (var item in dto.Items)
        {
            medicinesMap.TryGetValue(item.ItemId, out var medicine);
            foreach (var (stock, take) in await PickIssueLotsAsync(dto.WarehouseId, item, exportType))
            {
                stock.Quantity -= take;
                var amount = take * stock.UnitPrice;
                totalAmount += amount;

                var exportDetail = new ExportReceiptDetail
                {
                    Id = Guid.NewGuid(),
                    ExportReceiptId = exportReceipt.Id,
                    MedicineId = item.ItemId,
                    InventoryItemId = stock.Id,
                    BatchNumber = stock.BatchNumber,
                    ExpiryDate = stock.ExpiryDate,
                    Quantity = take,
                    Unit = medicine?.Unit,
                    UnitPrice = stock.UnitPrice,
                    Amount = amount,
                    CreatedAt = DateTime.Now,
                    CreatedBy = userId.ToString()
                };
                _context.ExportReceiptDetails.Add(exportDetail);

                issueItems.Add(new StockIssueItemDto
                {
                    Id = exportDetail.Id,
                    StockIssueId = exportReceipt.Id,
                    ItemId = item.ItemId,
                    ItemCode = medicine?.MedicineCode ?? string.Empty,
                    ItemName = medicine?.MedicineName ?? string.Empty,
                    ItemType = 1, // Thuốc
                    Unit = medicine?.Unit ?? string.Empty,
                    StockId = stock.Id,
                    BatchNumber = stock.BatchNumber,
                    ExpiryDate = stock.ExpiryDate,
                    Quantity = take,
                    UnitPrice = stock.UnitPrice,
                    Amount = amount
                });

                if (transferIn != null)
                    await CreditTransferTargetAsync(transferIn, stock, take, medicine?.Unit, userId, targetLots);
            }
        }

        exportReceipt.TotalAmount = totalAmount;
        _context.ExportReceipts.Add(exportReceipt);
        if (transferIn != null)
        {
            transferIn.TotalAmount = totalAmount;
            transferIn.FinalAmount = totalAmount;
            _context.ImportReceipts.Add(transferIn);
        }
        await _context.SaveChangesAsync();

        return new StockIssueDto
        {
            Id = exportReceipt.Id,
            IssueCode = exportReceipt.ReceiptCode,
            IssueDate = exportReceipt.ReceiptDate,
            WarehouseId = dto.WarehouseId,
            WarehouseName = warehouse.WarehouseName,
            IssueType = exportType,
            DepartmentId = dto.DepartmentId,
            DepartmentName = department?.DepartmentName ?? string.Empty,
            TargetWarehouseId = dto.TargetWarehouseId,
            TargetWarehouseName = targetWarehouse?.WarehouseName,
            SupplierId = dto.SupplierId,
            Items = issueItems,
            TotalAmount = totalAmount,
            Status = 1,
            CreatedBy = userId,
            CreatedAt = exportReceipt.CreatedAt,
            Notes = dto.Notes
        };
    }

    /// <summary>
    /// Danh sách phiếu xuất kho. Trước đây trả rỗng cứng nên màn "Xuất kho Dược" luôn trống
    /// dù tạo phiếu thành công; nay đọc thật từ ExportReceipts (nơi các hàm Issue* ghi vào).
    /// Read-only, không đổi đường ghi.
    /// </summary>
    public async Task<PagedResultDto<StockIssueDto>> GetStockIssuesAsync(StockIssueSearchDto searchDto)
    {
        var page = searchDto.Page <= 0 ? 1 : searchDto.Page;
        var pageSize = searchDto.PageSize <= 0 ? 50 : searchDto.PageSize;

        var query = _context.ExportReceipts.AsNoTracking().Where(e => !e.IsDeleted);

        if (searchDto.FromDate.HasValue)
            query = query.Where(e => e.ReceiptDate >= searchDto.FromDate.Value.Date);
        if (searchDto.ToDate.HasValue)
        {
            // ToDate là ngày (không giờ) → so tới hết ngày, tránh rớt phiếu tạo trong ngày.
            var toExclusive = searchDto.ToDate.Value.Date.AddDays(1);
            query = query.Where(e => e.ReceiptDate < toExclusive);
        }
        if (searchDto.WarehouseId.HasValue)
            query = query.Where(e => e.WarehouseId == searchDto.WarehouseId.Value);
        if (searchDto.IssueType.HasValue)
            query = query.Where(e => e.ExportType == searchDto.IssueType.Value);
        if (searchDto.DepartmentId.HasValue)
            query = query.Where(e => e.ToDepartmentId == searchDto.DepartmentId.Value);
        if (searchDto.Status.HasValue)
            query = query.Where(e => e.Status == searchDto.Status.Value);
        if (!string.IsNullOrWhiteSpace(searchDto.Keyword))
        {
            var kw = searchDto.Keyword.Trim();
            query = query.Where(e => e.ReceiptCode.Contains(kw) || (e.Note != null && e.Note.Contains(kw)));
        }

        var total = await query.CountAsync();
        var receipts = await query
            .OrderByDescending(e => e.ReceiptDate).ThenByDescending(e => e.CreatedAt)
            .Skip(Math.Max(0, page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        var items = new List<StockIssueDto>();
        foreach (var e in receipts)
            items.Add(await MapExportReceiptAsync(e, includeItems: false));

        return new PagedResultDto<StockIssueDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    /// <summary>Chi tiết 1 phiếu xuất kèm danh sách dòng (trước đây trả null cứng).</summary>
    public async Task<StockIssueDto?> GetStockIssueByIdAsync(Guid id)
    {
        var receipt = await _context.ExportReceipts.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);
        return receipt == null ? null : await MapExportReceiptAsync(receipt, includeItems: true);
    }

    /// <summary>ExportReceipt → StockIssueDto. Tên kho/khoa/người tạo resolve rời để né correlated-subquery.</summary>
    private async Task<StockIssueDto> MapExportReceiptAsync(ExportReceipt e, bool includeItems)
    {
        var warehouseName = await _context.Warehouses.AsNoTracking()
            .Where(w => w.Id == e.WarehouseId).Select(w => w.WarehouseName).FirstOrDefaultAsync();
        string? departmentName = null;
        if (e.ToDepartmentId.HasValue)
            departmentName = await _context.Departments.AsNoTracking()
                .Where(d => d.Id == e.ToDepartmentId.Value).Select(d => d.DepartmentName).FirstOrDefaultAsync();
        string? targetWarehouseName = null;
        if (e.ToWarehouseId.HasValue)
            targetWarehouseName = await _context.Warehouses.AsNoTracking()
                .Where(w => w.Id == e.ToWarehouseId.Value).Select(w => w.WarehouseName).FirstOrDefaultAsync();

        var dto = new StockIssueDto
        {
            Id = e.Id,
            IssueCode = e.ReceiptCode,
            IssueDate = e.ReceiptDate,
            WarehouseId = e.WarehouseId,
            WarehouseName = warehouseName ?? string.Empty,
            IssueType = e.ExportType,
            DepartmentId = e.ToDepartmentId,
            DepartmentName = departmentName ?? string.Empty,
            TargetWarehouseId = e.ToWarehouseId,
            TargetWarehouseName = targetWarehouseName ?? string.Empty,
            PatientId = e.PatientId,
            PrescriptionId = e.PrescriptionId,
            TotalAmount = e.TotalAmount,
            Status = e.Status,
            CreatedAt = e.CreatedAt,
            Notes = e.Note,
            Items = new List<StockIssueItemDto>()
        };

        // Supplier of a "Xuất trả NCC" issue: SupplierId column (migration 206); rows written before it
        // carry a "[NCC:<id>]" note tag instead.
        Guid? returnSupplierId = e.SupplierId;
        if (returnSupplierId == null && e.ExportType == 5 && e.Note != null)
        {
            var start = e.Note.IndexOf(SupplierReturnTagPrefix, StringComparison.Ordinal);
            var end = start >= 0 ? e.Note.IndexOf(']', start) : -1;
            if (end > start && Guid.TryParse(e.Note.AsSpan(start + SupplierReturnTagPrefix.Length, end - start - SupplierReturnTagPrefix.Length), out var taggedId))
                returnSupplierId = taggedId;
        }
        if (returnSupplierId is Guid supplierId)
        {
            dto.SupplierId = supplierId;
            dto.SupplierName = await _context.Suppliers.AsNoTracking()
                .Where(s => s.Id == supplierId).Select(s => s.SupplierName).FirstOrDefaultAsync();
        }

        if (Guid.TryParse(e.CreatedBy, out var creatorId))
        {
            dto.CreatedBy = creatorId;
            dto.CreatedByName = await _context.Users.AsNoTracking()
                .Where(u => u.Id == creatorId).Select(u => u.FullName).FirstOrDefaultAsync() ?? string.Empty;
        }

        if (!includeItems) return dto;

        var details = await _context.ExportReceiptDetails.AsNoTracking()
            .Where(d => d.ExportReceiptId == e.Id).ToListAsync();
        var medicineIds = details.Select(d => d.MedicineId).Distinct().ToList();
        var medicines = await _context.Medicines.AsNoTracking()
            .Where(m => medicineIds.Contains(m.Id))
            .Select(m => new { m.Id, m.MedicineCode, m.MedicineName, m.Unit })
            .ToListAsync();

        dto.Items = details.Select(d =>
        {
            var med = medicines.FirstOrDefault(m => m.Id == d.MedicineId);
            return new StockIssueItemDto
            {
                Id = d.Id,
                StockIssueId = e.Id,
                ItemId = d.MedicineId ?? Guid.Empty,
                ItemCode = med?.MedicineCode ?? string.Empty,
                ItemName = med?.MedicineName ?? string.Empty,
                ItemType = 1,
                Unit = d.Unit ?? med?.Unit ?? string.Empty,
                StockId = d.InventoryItemId ?? Guid.Empty,
                BatchNumber = d.BatchNumber,
                ExpiryDate = d.ExpiryDate,
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount
            };
        }).ToList();

        return dto;
    }

    public async Task<List<DispenseOutpatientDto>> GetPendingOutpatientPrescriptionsAsync(Guid warehouseId, DateTime date)
    {
        var d = date.Date;
        var dNext = d.AddDays(1);
        var prescriptions = await _context.Prescriptions
            .Include(p => p.MedicalRecord)
                .ThenInclude(m => m.Patient)
            .Include(p => p.Doctor)
            .Include(p => p.Details)
            .Where(p => !p.IsDeleted
                        && !p.IsDispensed
                        && p.Status != 4 // not cancelled
                        && p.PrescriptionType == 1 // ngoại trú
                        && (warehouseId == Guid.Empty || p.WarehouseId == warehouseId)
                        && p.PrescriptionDate >= d && p.PrescriptionDate < dNext)
            .OrderBy(p => p.PrescriptionDate)
            .ToListAsync();

        return prescriptions.Select(p => new DispenseOutpatientDto
        {
            PrescriptionId = p.Id,
            PrescriptionCode = p.PrescriptionCode,
            PrescriptionDate = p.PrescriptionDate,
            PatientCode = p.MedicalRecord?.Patient?.PatientCode ?? "",
            PatientName = p.MedicalRecord?.Patient?.FullName ?? "",
            IsInsurance = !string.IsNullOrEmpty(p.MedicalRecord?.Patient?.InsuranceNumber),
            DoctorName = p.Doctor?.FullName,
            Diagnosis = p.DiagnosisName ?? p.Diagnosis,
            Items = new List<DispenseItemDto>(),
            TotalAmount = p.TotalAmount,
            InsuranceAmount = p.InsuranceAmount,
            PatientPayAmount = p.PatientAmount,
            Status = p.Status,
        }).ToList();
    }

    #endregion
}
