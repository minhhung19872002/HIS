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

        var warehouseId = prescription.WarehouseId
            ?? throw new InvalidOperationException("Don thuoc chua duoc gan kho xuat (WarehouseId trong)");
        var warehouse = await _context.Warehouses.FindAsync(warehouseId);

        // NangCap26 V.33: kho đang khóa → không phát thuốc ngoại trú.
        await EnsureWarehouseNotLockedAsync(warehouseId);

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

        foreach (var detail in prescription.Details)
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

            var totalAvailable = batches.Sum(b => b.Quantity - b.ReservedQuantity);
            if (totalAvailable < detail.Quantity)
                throw new InvalidOperationException(
                    $"Không đủ tồn kho để phát thuốc {detail.Medicine?.MedicineName ?? detail.MedicineId.ToString()} " +
                    $"(cần {detail.Quantity}, còn {totalAvailable})");

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
            detail.Status = 1; // Đã cấp
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
            throw new Exception("Inpatient prescription not found");

        var warehouseId = prescription.WarehouseId ?? throw new Exception("No warehouse assigned");
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

        foreach (var detail in prescription.Details.Where(d => d.Status == 0))
        {
            // NangCap26 V.31: loại lô đang khóa khỏi FEFO (trước đây nội trú không lọc IsLocked
            // trong khi ngoại trú đã lọc → lô thu hồi vẫn phát được cho BN nội trú).
            var stock = await _context.InventoryItems
                .Where(i => i.WarehouseId == warehouseId
                    && i.MedicineId == detail.MedicineId
                    && (i.Quantity - i.ReservedQuantity) >= detail.Quantity
                    && !i.IsLocked && !i.IsDeleted)
                .OrderBy(i => i.ExpiryDate)
                .FirstOrDefaultAsync();

            if (stock != null)
            {
                stock.Quantity -= detail.Quantity;
                var amount = detail.Quantity * detail.UnitPrice;
                totalAmount += amount;

                var exportDetail = new ExportReceiptDetail
                {
                    Id = Guid.NewGuid(),
                    ExportReceiptId = exportReceipt.Id,
                    MedicineId = detail.MedicineId,
                    InventoryItemId = stock.Id,
                    BatchNumber = stock.BatchNumber,
                    ExpiryDate = stock.ExpiryDate,
                    Quantity = detail.Quantity,
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
                    Quantity = detail.Quantity,
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
        var warehouse = await _context.Warehouses.FindAsync(dto.WarehouseId);
        if (warehouse == null)
            throw new Exception("Warehouse not found");

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

        foreach (var item in dto.Items)
        {
            var stock = item.StockId.HasValue
                ? await _context.InventoryItems.FindAsync(item.StockId.Value)
                : await _context.InventoryItems
                    .Where(i => i.WarehouseId == dto.WarehouseId && i.MedicineId == item.ItemId && (i.Quantity - i.ReservedQuantity) >= item.Quantity
                        && !i.IsLocked && !i.IsDeleted)
                    .OrderBy(i => i.ExpiryDate)
                    .FirstOrDefaultAsync();

            if (stock == null)
                throw new Exception($"Insufficient stock for item {item.ItemId}");

            // NangCap26 V.31: chọn đích danh lô cũng không được nếu lô đang khóa.
            EnsureBatchNotLocked(stock);

            stock.Quantity -= item.Quantity;

            medicinesMap.TryGetValue(item.ItemId, out var medicine);
            var amount = item.Quantity * stock.UnitPrice;
            totalAmount += amount;

            var exportDetail = new ExportReceiptDetail
            {
                Id = Guid.NewGuid(),
                ExportReceiptId = exportReceipt.Id,
                MedicineId = item.ItemId,
                InventoryItemId = stock.Id,
                BatchNumber = stock.BatchNumber,
                ExpiryDate = stock.ExpiryDate,
                Quantity = item.Quantity,
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
                Quantity = item.Quantity,
                UnitPrice = stock.UnitPrice,
                Amount = amount
            });
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
        return await CreateStockIssueByTypeAsync(dto, userId, 5, "TN");
    }

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

        // Validate cabinet warehouse (must be WarehouseType=4 or IsCabinet=true)
        var warehouse = await _context.Warehouses.FindAsync(dto.WarehouseId);
        if (warehouse == null)
            throw new Exception("Warehouse not found");
        if (warehouse.WarehouseType != 4 && !warehouse.IsCabinet)
            throw new Exception("Selected warehouse is not an emergency cabinet (WarehouseType must be 4 or IsCabinet=true)");

        return await CreateStockIssueByTypeAsync(dto, userId, 12, "TT");
    }

    public async Task<PharmacySaleDto> CreatePharmacySaleByPrescriptionAsync(Guid prescriptionId, Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        return new PharmacySaleDto
        {
            Id = Guid.NewGuid(),
            SaleCode = $"BT{DateTime.Now:yyyyMMddHHmmss}",
            SaleDate = DateTime.Now,
            SaleType = 1, // Theo đơn BS
            PrescriptionId = prescriptionId,
            Items = new List<PharmacySaleItemDto>(),
            SubTotal = 0,
            TotalAmount = 0,
            SoldBy = userId,
            SoldByName = user?.FullName ?? string.Empty
        };
    }

    public async Task<PharmacySaleDto> CreateRetailSaleAsync(PharmacySaleDto dto, Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        dto.Id = Guid.NewGuid();
        dto.SaleCode = $"BL{DateTime.Now:yyyyMMddHHmmss}";
        dto.SaleDate = DateTime.Now;
        dto.SaleType = 2; // Bán lẻ
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
            throw new Exception("Stock issue not found");
        if (receipt.Status == 2)
            throw new Exception("Phiếu xuất đã bị hủy trước đó");

        // If already issued, reverse inventory
        if (receipt.Status == 1)
        {
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
    /// Helper: tạo phiếu xuất kho theo loại (ExportType)
    /// </summary>
    private async Task<StockIssueDto> CreateStockIssueByTypeAsync(CreateStockIssueDto dto, Guid userId, int exportType, string codePrefix)
    {
        var warehouse = await _context.Warehouses.FindAsync(dto.WarehouseId);
        if (warehouse == null)
            throw new Exception("Warehouse not found");

        // NangCap26 V.33: kho đang khóa → chặn mọi phiếu xuất/luân chuyển từ kho này.
        await EnsureWarehouseNotLockedAsync(dto.WarehouseId);

        var department = dto.DepartmentId.HasValue
            ? await _context.Departments.FindAsync(dto.DepartmentId.Value)
            : null;

        var targetWarehouse = dto.TargetWarehouseId.HasValue
            ? await _context.Warehouses.FindAsync(dto.TargetWarehouseId.Value)
            : null;

        var exportReceipt = new ExportReceipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"{codePrefix}{DateTime.Now:yyyyMMddHHmmss}",
            ReceiptDate = dto.IssueDate,
            WarehouseId = dto.WarehouseId,
            ExportType = exportType,
            ToDepartmentId = dto.DepartmentId,
            ToWarehouseId = dto.TargetWarehouseId,
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

        foreach (var item in dto.Items)
        {
            var stock = item.StockId.HasValue
                ? await _context.InventoryItems.FindAsync(item.StockId.Value)
                : await _context.InventoryItems
                    .Where(i => i.WarehouseId == dto.WarehouseId && i.MedicineId == item.ItemId && (i.Quantity - i.ReservedQuantity) >= item.Quantity
                        && !i.IsLocked && !i.IsDeleted)
                    .OrderBy(i => i.ExpiryDate)
                    .FirstOrDefaultAsync();

            if (stock == null)
                throw new Exception($"Insufficient stock for item {item.ItemId}");

            // NangCap26 V.31: chọn đích danh lô cũng không được nếu lô đang khóa.
            EnsureBatchNotLocked(stock);

            stock.Quantity -= item.Quantity;

            medicinesMap.TryGetValue(item.ItemId, out var medicine);
            var amount = item.Quantity * stock.UnitPrice;
            totalAmount += amount;

            var exportDetail = new ExportReceiptDetail
            {
                Id = Guid.NewGuid(),
                ExportReceiptId = exportReceipt.Id,
                MedicineId = item.ItemId,
                InventoryItemId = stock.Id,
                BatchNumber = stock.BatchNumber,
                ExpiryDate = stock.ExpiryDate,
                Quantity = item.Quantity,
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
                Quantity = item.Quantity,
                UnitPrice = stock.UnitPrice,
                Amount = amount
            });
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
            .Skip((page - 1) * pageSize).Take(pageSize)
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
