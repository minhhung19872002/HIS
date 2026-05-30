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
        if (prescription == null)
            throw new Exception("Prescription not found");

        var warehouseId = prescription.WarehouseId ?? throw new Exception("Prescription has no warehouse assigned");
        var warehouse = await _context.Warehouses.FindAsync(warehouseId);

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
            // Find inventory with FEFO (First Expired First Out) - exclude expired items
            var stock = await _context.InventoryItems
                .Where(i => i.WarehouseId == warehouseId
                    && i.MedicineId == detail.MedicineId
                    && (i.Quantity - i.ReservedQuantity) >= detail.Quantity
                    && i.ExpiryDate >= DateTime.Today)
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

                // Update prescription detail status only when stock was found
                detail.DispensedQuantity = detail.Quantity;
                detail.Status = 1; // Đã cấp
            }
        }

        exportReceipt.TotalAmount = totalAmount;
        _context.ExportReceipts.Add(exportReceipt);

        // Update prescription status
        prescription.IsDispensed = true;
        prescription.DispensedAt = DateTime.Now;
        prescription.DispensedBy = userId;
        prescription.Status = 2; // Đã cấp phát

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

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
            var stock = await _context.InventoryItems
                .Where(i => i.WarehouseId == warehouseId
                    && i.MedicineId == detail.MedicineId
                    && (i.Quantity - i.ReservedQuantity) >= detail.Quantity)
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
        prescription.Status = 2;

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

        foreach (var item in dto.Items)
        {
            var stock = item.StockId.HasValue
                ? await _context.InventoryItems.FindAsync(item.StockId.Value)
                : await _context.InventoryItems
                    .Where(i => i.WarehouseId == dto.WarehouseId && i.MedicineId == item.ItemId && (i.Quantity - i.ReservedQuantity) >= item.Quantity)
                    .OrderBy(i => i.ExpiryDate)
                    .FirstOrDefaultAsync();

            if (stock == null)
                throw new Exception($"Insufficient stock for item {item.ItemId}");

            stock.Quantity -= item.Quantity;

            var medicine = await _context.Medicines.FindAsync(item.ItemId);
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

        foreach (var item in dto.Items)
        {
            var stock = item.StockId.HasValue
                ? await _context.InventoryItems.FindAsync(item.StockId.Value)
                : await _context.InventoryItems
                    .Where(i => i.WarehouseId == dto.WarehouseId && i.MedicineId == item.ItemId && (i.Quantity - i.ReservedQuantity) >= item.Quantity)
                    .OrderBy(i => i.ExpiryDate)
                    .FirstOrDefaultAsync();

            if (stock == null)
                throw new Exception($"Insufficient stock for item {item.ItemId}");

            stock.Quantity -= item.Quantity;

            var medicine = await _context.Medicines.FindAsync(item.ItemId);
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

    public async Task<PagedResultDto<StockIssueDto>> GetStockIssuesAsync(StockIssueSearchDto searchDto)
    {
        return new PagedResultDto<StockIssueDto>
        {
            Items = new List<StockIssueDto>(),
            TotalCount = 0,
            Page = 1,
            PageSize = 50
        };
    }

    public async Task<StockIssueDto?> GetStockIssueByIdAsync(Guid id)
    {
        return null;
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

    public async Task<byte[]> PrintSaleInvoiceAsync(Guid saleId)
    {
        try
        {
            var export = await _context.ExportReceipts
                .Include(e => e.Warehouse)
                .Include(e => e.Details).ThenInclude(d => d.Medicine)
                .Include(e => e.Details).ThenInclude(d => d.Supply)
                .FirstOrDefaultAsync(e => e.Id == saleId);

            if (export == null) return Array.Empty<byte>();

            var patient = export.PatientId.HasValue ? await _context.Patients.FindAsync(export.PatientId.Value) : null;

            var metaLabels = new[] { "Nha thuoc", "Khach hang", "SĐT", "Ghi chu" };
            var metaValues = new[]
            {
                export.Warehouse?.WarehouseName ?? "",
                patient?.FullName ?? "Khach le",
                patient?.PhoneNumber ?? "",
                export.Note ?? ""
            };

            var items = export.Details.Select(d => new ReportItemRow
            {
                Name = d.Medicine?.MedicineName ?? d.Supply?.SupplyName ?? "",
                Unit = d.Unit ?? "",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Note = d.BatchNumber ?? ""
            }).ToList();

            var html = BuildItemizedReport(
                "HOA DON BAN THUOC",
                export.ReceiptCode,
                export.ReceiptDate,
                metaLabels, metaValues!,
                items);

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintUsageInstructionsAsync(Guid issueId)
    {
        try
        {
            var export = await _context.ExportReceipts
                .Include(e => e.Details).ThenInclude(d => d.Medicine)
                .FirstOrDefaultAsync(e => e.Id == issueId);

            if (export == null) return Array.Empty<byte>();

            var patient = export.PatientId.HasValue ? await _context.Patients.FindAsync(export.PatientId.Value) : null;

            Prescription? prescription = null;
            if (export.PrescriptionId.HasValue)
                prescription = await _context.Prescriptions
                    .Include(p => p.Details)
                    .FirstOrDefaultAsync(p => p.Id == export.PrescriptionId.Value);

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">HUONG DAN SU DUNG THUOC</div>");
            body.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">Ngay {export.ReceiptDate:dd/MM/yyyy}</div>");

            if (patient != null)
            {
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Ho ten:</span><span class=""field-value"">{Esc(patient.FullName)}</span></div>");
            }
            if (prescription != null)
            {
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Chan doan:</span><span class=""field-value"">{Esc(prescription.Diagnosis)}</span></div>");
            }

            body.AppendLine(@"<table class=""bordered"" style=""margin-top:10px""><thead><tr>
                <th style=""width:30px"">STT</th><th>Ten thuoc</th><th>Lieu dung</th><th>Cach dung</th><th>Ghi chu</th>
            </tr></thead><tbody>");

            var prescDetails = prescription?.Details.ToList() ?? new List<PrescriptionDetail>();
            int idx = 1;
            foreach (var d in export.Details)
            {
                var matchDetail = prescDetails.FirstOrDefault(pd => pd.MedicineId == d.MedicineId);
                var dosage = matchDetail?.Dosage ?? "";
                var usage = matchDetail?.Usage ?? matchDetail?.UsageInstructions ?? "";
                var frequency = matchDetail?.Frequency ?? "";
                body.AppendLine($@"<tr>
                    <td class=""text-center"">{idx++}</td>
                    <td><b>{Esc(d.Medicine?.MedicineName)}</b><br/>{Esc(d.Medicine?.Concentration)}</td>
                    <td>{Esc(dosage)}{(string.IsNullOrEmpty(frequency) ? "" : $" - {Esc(frequency)}")}</td>
                    <td>{Esc(usage)}</td>
                    <td>{Esc(matchDetail?.Note)}</td>
                </tr>");
            }

            body.AppendLine("</tbody></table>");

            if (prescription?.Note != null)
                body.AppendLine($@"<div class=""mt-10""><b>Loi dan:</b> {Esc(prescription.Note)}</div>");

            body.AppendLine(GetSignatureBlock(null, null, null, false));

            var html = WrapHtmlPage("Huong dan su dung thuoc", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintOutpatientPrescriptionAsync(Guid prescriptionId)
    {
        try
        {
            var prescription = await _context.Prescriptions
                .Include(p => p.Details).ThenInclude(d => d.Medicine)
                .Include(p => p.Doctor)
                .Include(p => p.Department)
                .Include(p => p.MedicalRecord)
                .FirstOrDefaultAsync(p => p.Id == prescriptionId);

            if (prescription == null) return Array.Empty<byte>();

            var patient = await _context.Patients.FindAsync(prescription.MedicalRecord?.PatientId ?? Guid.Empty);

            var prescriptionRows = prescription.Details.Select(d => new PrescriptionRow
            {
                MedicineName = d.Medicine?.MedicineName ?? "",
                Unit = d.Unit ?? d.Medicine?.Unit,
                Quantity = d.Quantity,
                Dosage = d.Dosage,
                Frequency = d.Frequency,
                Route = d.Route,
                Usage = d.Usage ?? d.UsageInstructions
            }).ToList();

            var html = GetPrescription(
                patient?.PatientCode,
                patient?.FullName,
                patient?.Gender ?? 0,
                patient?.DateOfBirth,
                patient?.Address,
                patient?.PhoneNumber,
                patient?.InsuranceNumber,
                prescription.Diagnosis ?? prescription.DiagnosisName,
                prescription.IcdCode ?? prescription.DiagnosisCode,
                prescription.PrescriptionDate,
                prescription.TotalDays,
                prescriptionRows,
                prescription.Note,
                prescription.Doctor?.FullName,
                prescription.Department?.DepartmentName);

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintInpatientOrderAsync(Guid orderSummaryId)
    {
        try
        {
            var prescription = await _context.Prescriptions
                .Include(p => p.Details).ThenInclude(d => d.Medicine)
                .Include(p => p.Doctor)
                .Include(p => p.Department)
                .Include(p => p.MedicalRecord)
                .FirstOrDefaultAsync(p => p.Id == orderSummaryId);

            if (prescription == null) return Array.Empty<byte>();

            var patient = await _context.Patients.FindAsync(prescription.MedicalRecord?.PatientId ?? Guid.Empty);

            var metaLabels = new[] { "Benh nhan", "Ma BN", "Khoa", "Chan doan", "BS ke don", "So ngay" };
            var metaValues = new[]
            {
                patient?.FullName ?? "",
                patient?.PatientCode ?? "",
                prescription.Department?.DepartmentName ?? "",
                prescription.Diagnosis ?? prescription.DiagnosisName ?? "",
                prescription.Doctor?.FullName ?? "",
                prescription.TotalDays.ToString()
            };

            var items = prescription.Details.Select(d => new ReportItemRow
            {
                Name = d.Medicine?.MedicineName ?? "",
                Unit = d.Unit ?? d.Medicine?.Unit ?? "",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Note = d.Dosage != null ? $"{d.Dosage} - {d.Frequency}" : d.Note
            }).ToList();

            var html = BuildItemizedReport(
                "PHIEU LINH THUOC NOI TRU",
                prescription.PrescriptionCode,
                prescription.PrescriptionDate,
                metaLabels, metaValues,
                items,
                prescription.Doctor?.FullName);

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintStockIssueAsync(Guid id)
    {
        try
        {
            var export = await _context.ExportReceipts
                .Include(e => e.Warehouse)
                .Include(e => e.Details).ThenInclude(d => d.Medicine)
                .Include(e => e.Details).ThenInclude(d => d.Supply)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (export == null) return Array.Empty<byte>();

            var createdByUser = await _context.Users.FindAsync(Guid.TryParse(export.CreatedBy, out var uid) ? uid : Guid.Empty);

            var exportTypeName = export.ExportType switch
            {
                1 => "Xuat BN ngoai tru",
                2 => "Xuat BN noi tru",
                3 => "Xuat chuyen kho",
                4 => "Xuat tra NCC",
                5 => "Xuat huy",
                6 => "Xuat kiem ke giam",
                _ => ""
            };

            var metaLabels = new[] { "Kho xuat", "Loai xuat", "Ghi chu" };
            var metaValues = new[]
            {
                export.Warehouse?.WarehouseName ?? "",
                exportTypeName,
                export.Note ?? ""
            };

            var items = export.Details.Select(d => new ReportItemRow
            {
                Name = d.Medicine?.MedicineName ?? d.Supply?.SupplyName ?? "",
                Unit = d.Unit ?? "",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Note = d.BatchNumber != null ? $"Lo: {d.BatchNumber}" : ""
            }).ToList();

            var html = BuildItemizedReport(
                "PHIEU XUAT KHO",
                export.ReceiptCode,
                export.ReceiptDate,
                metaLabels, metaValues,
                items,
                createdByUser?.FullName);

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintNarcoticIssueAsync(Guid id)
    {
        try
        {
            var export = await _context.ExportReceipts
                .Include(e => e.Warehouse)
                .Include(e => e.Details).ThenInclude(d => d.Medicine)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (export == null) return Array.Empty<byte>();

            var patient = export.PatientId.HasValue ? await _context.Patients.FindAsync(export.PatientId.Value) : null;
            var createdByUser = await _context.Users.FindAsync(Guid.TryParse(export.CreatedBy, out var uid) ? uid : Guid.Empty);

            var narcoticDetails = export.Details
                .Where(d => d.Medicine != null && d.Medicine.IsNarcotic)
                .ToList();
            if (!narcoticDetails.Any())
                narcoticDetails = export.Details.ToList();

            var metaLabels = new[] { "Kho xuat", "Benh nhan", "Ma BN", "Ghi chu" };
            var metaValues = new[]
            {
                export.Warehouse?.WarehouseName ?? "",
                patient?.FullName ?? "",
                patient?.PatientCode ?? "",
                export.Note ?? ""
            };

            var items = narcoticDetails.Select(d => new ReportItemRow
            {
                Name = d.Medicine?.MedicineName ?? "",
                Unit = d.Unit ?? "",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Note = d.BatchNumber != null ? $"Lo: {d.BatchNumber}" : ""
            }).ToList();

            var html = BuildItemizedReport(
                "PHIEU XUAT THUOC GAY NGHIEN",
                export.ReceiptCode,
                export.ReceiptDate,
                metaLabels, metaValues,
                items,
                createdByUser?.FullName);

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintToxicIssueAsync(Guid id)
    {
        try
        {
            var export = await _context.ExportReceipts
                .Include(e => e.Warehouse)
                .Include(e => e.Details).ThenInclude(d => d.Medicine)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (export == null) return Array.Empty<byte>();

            var patient = export.PatientId.HasValue ? await _context.Patients.FindAsync(export.PatientId.Value) : null;
            var createdByUser = await _context.Users.FindAsync(Guid.TryParse(export.CreatedBy, out var uid) ? uid : Guid.Empty);

            var toxicDetails = export.Details
                .Where(d => d.Medicine != null && d.Medicine.IsPsychotropic)
                .ToList();
            if (!toxicDetails.Any())
                toxicDetails = export.Details.ToList();

            var metaLabels = new[] { "Kho xuat", "Benh nhan", "Ma BN", "Ghi chu" };
            var metaValues = new[]
            {
                export.Warehouse?.WarehouseName ?? "",
                patient?.FullName ?? "",
                patient?.PatientCode ?? "",
                export.Note ?? ""
            };

            var items = toxicDetails.Select(d => new ReportItemRow
            {
                Name = d.Medicine?.MedicineName ?? "",
                Unit = d.Unit ?? "",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Note = d.BatchNumber != null ? $"Lo: {d.BatchNumber}" : ""
            }).ToList();

            var html = BuildItemizedReport(
                "PHIEU XUAT THUOC HUONG THAN",
                export.ReceiptCode,
                export.ReceiptDate,
                metaLabels, metaValues,
                items,
                createdByUser?.FullName);

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintTransferIssueAsync(Guid id)
    {
        try
        {
            var export = await _context.ExportReceipts
                .Include(e => e.Warehouse)
                .Include(e => e.Details).ThenInclude(d => d.Medicine)
                .Include(e => e.Details).ThenInclude(d => d.Supply)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (export == null) return Array.Empty<byte>();

            var createdByUser = await _context.Users.FindAsync(Guid.TryParse(export.CreatedBy, out var uid) ? uid : Guid.Empty);
            var targetWarehouse = export.ToWarehouseId.HasValue ? await _context.Warehouses.FindAsync(export.ToWarehouseId.Value) : null;

            var metaLabels = new[] { "Kho xuat", "Kho nhan", "Ly do chuyen", "Ghi chu" };
            var metaValues = new[]
            {
                export.Warehouse?.WarehouseName ?? "",
                targetWarehouse?.WarehouseName ?? "",
                "Chuyen kho noi bo",
                export.Note ?? ""
            };

            var items = export.Details.Select(d => new ReportItemRow
            {
                Name = d.Medicine?.MedicineName ?? d.Supply?.SupplyName ?? "",
                Unit = d.Unit ?? "",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Note = d.BatchNumber != null ? $"Lo: {d.BatchNumber}" + (d.ExpiryDate.HasValue ? $" - HSD: {d.ExpiryDate:dd/MM/yyyy}" : "") : ""
            }).ToList();

            var html = BuildItemizedReport(
                "PHIEU XUAT CHUYEN KHO",
                export.ReceiptCode,
                export.ReceiptDate,
                metaLabels, metaValues,
                items,
                createdByUser?.FullName);

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    #endregion
}
