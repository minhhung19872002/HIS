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

/// <summary>
/// Implementation of IWarehouseCompleteService
/// Handles all warehouse/pharmacy workflows
/// </summary>
public class WarehouseCompleteService : IWarehouseCompleteService
{
    private readonly HISDbContext _context;
    private readonly IRepository<Warehouse> _warehouseRepo;
    private readonly IRepository<InventoryItem> _inventoryRepo;
    private readonly IRepository<Prescription> _prescriptionRepo;
    private readonly IUnitOfWork _unitOfWork;

    public WarehouseCompleteService(
        HISDbContext context,
        IRepository<Warehouse> warehouseRepo,
        IRepository<InventoryItem> inventoryRepo,
        IRepository<Prescription> prescriptionRepo,
        IUnitOfWork unitOfWork)
    {
        _context = context;
        _warehouseRepo = warehouseRepo;
        _inventoryRepo = inventoryRepo;
        _prescriptionRepo = prescriptionRepo;
        _unitOfWork = unitOfWork;
    }

    #region 5.1 Nhập kho

    public async Task<StockReceiptDto> CreateSupplierReceiptAsync(CreateStockReceiptDto dto, Guid userId)
    {
        var warehouse = await _context.Warehouses.FindAsync(dto.WarehouseId);
        if (warehouse == null)
            throw new Exception("Warehouse not found");

        var importReceipt = new ImportReceipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"NK{DateTime.Now:yyyyMMddHHmmss}",
            ReceiptDate = dto.ReceiptDate,
            WarehouseId = dto.WarehouseId,
            ImportType = 1, // NCC
            SupplierCode = dto.SupplierId?.ToString(),
            InvoiceNumber = dto.InvoiceNumber,
            InvoiceDate = dto.InvoiceDate,
            TotalAmount = 0,
            Discount = 0,
            Vat = 0,
            FinalAmount = 0,
            Note = dto.Notes,
            Status = 0, // Chờ duyệt
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        decimal totalAmount = 0;
        var items = new List<StockReceiptItemDto>();

        foreach (var item in dto.Items)
        {
            var medicine = await _context.Medicines.FindAsync(item.ItemId);
            var amount = item.Quantity * item.UnitPrice;
            totalAmount += amount;

            var detail = new ImportReceiptDetail
            {
                Id = Guid.NewGuid(),
                ImportReceiptId = importReceipt.Id,
                MedicineId = item.ItemId,
                BatchNumber = item.BatchNumber,
                ExpiryDate = item.ExpiryDate,
                ManufactureDate = item.ManufactureDate,
                Quantity = item.Quantity,
                Unit = medicine?.Unit,
                UnitPrice = item.UnitPrice,
                Amount = amount,
                Vat = 0,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };

            _context.ImportReceiptDetails.Add(detail);

            items.Add(new StockReceiptItemDto
            {
                Id = detail.Id,
                StockReceiptId = importReceipt.Id,
                ItemId = item.ItemId,
                ItemCode = medicine?.MedicineCode ?? string.Empty,
                ItemName = medicine?.MedicineName ?? string.Empty,
                ItemType = 1, // Thuốc
                Unit = medicine?.Unit ?? string.Empty,
                BatchNumber = item.BatchNumber,
                ManufactureDate = item.ManufactureDate,
                ExpiryDate = item.ExpiryDate,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                Amount = amount
            });
        }

        importReceipt.TotalAmount = totalAmount;
        importReceipt.FinalAmount = totalAmount;
        _context.ImportReceipts.Add(importReceipt);
        await _context.SaveChangesAsync();

        var user = await _context.Users.FindAsync(userId);

        return new StockReceiptDto
        {
            Id = importReceipt.Id,
            ReceiptCode = importReceipt.ReceiptCode,
            ReceiptDate = importReceipt.ReceiptDate,
            WarehouseId = dto.WarehouseId,
            WarehouseName = warehouse.WarehouseName,
            ReceiptType = 1,
            InvoiceNumber = dto.InvoiceNumber,
            InvoiceDate = dto.InvoiceDate,
            Items = items,
            TotalAmount = totalAmount,
            FinalAmount = totalAmount,
            Status = 0,
            CreatedBy = userId,
            CreatedByName = user?.FullName ?? string.Empty,
            CreatedAt = importReceipt.CreatedAt,
            Notes = dto.Notes
        };
    }

    public async Task<StockReceiptDto> CreateOtherSourceReceiptAsync(CreateStockReceiptDto dto, Guid userId)
    {
        return await CreateStockReceiptByTypeAsync(dto, userId, 2, "NK");
    }

    public async Task<StockReceiptDto> CreateTransferReceiptAsync(CreateStockReceiptDto dto, Guid userId)
    {
        return await CreateStockReceiptByTypeAsync(dto, userId, 3, "NC");
    }

    public async Task<StockReceiptDto> CreateDepartmentReturnReceiptAsync(CreateStockReceiptDto dto, Guid userId)
    {
        return await CreateStockReceiptByTypeAsync(dto, userId, 4, "HK");
    }

    public async Task<StockReceiptDto> CreateWarehouseReturnReceiptAsync(CreateStockReceiptDto dto, Guid userId)
    {
        return await CreateStockReceiptByTypeAsync(dto, userId, 5, "HT");
    }

    public async Task<StockReceiptDto> CreateStockTakeReceiptAsync(CreateStockReceiptDto dto, Guid userId)
    {
        return await CreateStockReceiptByTypeAsync(dto, userId, 6, "KT");
    }

    public async Task<StockReceiptDto> UpdateStockReceiptAsync(Guid id, CreateStockReceiptDto dto, Guid userId)
    {
        var receipt = await _context.ImportReceipts
            .Include(r => r.Warehouse)
            .Include(r => r.Details)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (receipt == null)
            throw new Exception("Stock receipt not found");
        if (receipt.Status != 0)
            throw new Exception("Chỉ có thể cập nhật phiếu ở trạng thái Mới tạo");

        // Update header fields
        receipt.ReceiptDate = dto.ReceiptDate;
        receipt.WarehouseId = dto.WarehouseId;
        receipt.SupplierCode = dto.SupplierId?.ToString();
        receipt.InvoiceNumber = dto.InvoiceNumber;
        receipt.InvoiceDate = dto.InvoiceDate;
        receipt.Note = dto.Notes;

        // Remove old details
        _context.ImportReceiptDetails.RemoveRange(receipt.Details);

        // Re-create details
        decimal totalAmount = 0;
        var items = new List<StockReceiptItemDto>();

        foreach (var item in dto.Items)
        {
            var medicine = await _context.Medicines.FindAsync(item.ItemId);
            var amount = item.Quantity * item.UnitPrice;
            totalAmount += amount;

            var detail = new ImportReceiptDetail
            {
                Id = Guid.NewGuid(),
                ImportReceiptId = receipt.Id,
                MedicineId = item.ItemId,
                BatchNumber = item.BatchNumber,
                ExpiryDate = item.ExpiryDate,
                ManufactureDate = item.ManufactureDate,
                Quantity = item.Quantity,
                Unit = medicine?.Unit,
                UnitPrice = item.UnitPrice,
                Amount = amount,
                Vat = 0,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };

            _context.ImportReceiptDetails.Add(detail);

            items.Add(new StockReceiptItemDto
            {
                Id = detail.Id,
                StockReceiptId = receipt.Id,
                ItemId = item.ItemId,
                ItemCode = medicine?.MedicineCode ?? string.Empty,
                ItemName = medicine?.MedicineName ?? string.Empty,
                ItemType = 1,
                Unit = medicine?.Unit ?? string.Empty,
                BatchNumber = item.BatchNumber,
                ManufactureDate = item.ManufactureDate,
                ExpiryDate = item.ExpiryDate,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                Amount = amount
            });
        }

        receipt.TotalAmount = totalAmount;
        receipt.FinalAmount = totalAmount;

        await _context.SaveChangesAsync();

        var warehouse = await _context.Warehouses.FindAsync(dto.WarehouseId);
        var user = await _context.Users.FindAsync(userId);

        return new StockReceiptDto
        {
            Id = receipt.Id,
            ReceiptCode = receipt.ReceiptCode,
            ReceiptDate = receipt.ReceiptDate,
            WarehouseId = dto.WarehouseId,
            WarehouseName = warehouse?.WarehouseName ?? string.Empty,
            ReceiptType = receipt.ImportType,
            InvoiceNumber = dto.InvoiceNumber,
            InvoiceDate = dto.InvoiceDate,
            Items = items,
            TotalAmount = totalAmount,
            FinalAmount = totalAmount,
            Status = 0,
            CreatedBy = userId,
            CreatedByName = user?.FullName ?? string.Empty,
            CreatedAt = receipt.CreatedAt,
            Notes = dto.Notes
        };
    }

    /// <summary>
    /// Helper: tạo phiếu nhập kho theo loại (ImportType)
    /// </summary>
    private async Task<StockReceiptDto> CreateStockReceiptByTypeAsync(CreateStockReceiptDto dto, Guid userId, int importType, string codePrefix)
    {
        var warehouse = await _context.Warehouses.FindAsync(dto.WarehouseId);
        if (warehouse == null)
            throw new Exception("Warehouse not found");

        var importReceipt = new ImportReceipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"{codePrefix}{DateTime.Now:yyyyMMddHHmmss}",
            ReceiptDate = dto.ReceiptDate,
            WarehouseId = dto.WarehouseId,
            ImportType = importType,
            SupplierCode = dto.SupplierId?.ToString(),
            InvoiceNumber = dto.InvoiceNumber,
            InvoiceDate = dto.InvoiceDate,
            TotalAmount = 0,
            Discount = 0,
            Vat = 0,
            FinalAmount = 0,
            Note = dto.Notes,
            Status = 0, // Chờ duyệt
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        decimal totalAmount = 0;
        var items = new List<StockReceiptItemDto>();

        foreach (var item in dto.Items)
        {
            var medicine = await _context.Medicines.FindAsync(item.ItemId);
            var amount = item.Quantity * item.UnitPrice;
            totalAmount += amount;

            var detail = new ImportReceiptDetail
            {
                Id = Guid.NewGuid(),
                ImportReceiptId = importReceipt.Id,
                MedicineId = item.ItemId,
                BatchNumber = item.BatchNumber,
                ExpiryDate = item.ExpiryDate,
                ManufactureDate = item.ManufactureDate,
                Quantity = item.Quantity,
                Unit = medicine?.Unit,
                UnitPrice = item.UnitPrice,
                Amount = amount,
                Vat = 0,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };

            _context.ImportReceiptDetails.Add(detail);

            items.Add(new StockReceiptItemDto
            {
                Id = detail.Id,
                StockReceiptId = importReceipt.Id,
                ItemId = item.ItemId,
                ItemCode = medicine?.MedicineCode ?? string.Empty,
                ItemName = medicine?.MedicineName ?? string.Empty,
                ItemType = 1, // Thuốc
                Unit = medicine?.Unit ?? string.Empty,
                BatchNumber = item.BatchNumber,
                ManufactureDate = item.ManufactureDate,
                ExpiryDate = item.ExpiryDate,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                Amount = amount
            });
        }

        importReceipt.TotalAmount = totalAmount;
        importReceipt.FinalAmount = totalAmount;
        _context.ImportReceipts.Add(importReceipt);
        await _context.SaveChangesAsync();

        var user = await _context.Users.FindAsync(userId);

        return new StockReceiptDto
        {
            Id = importReceipt.Id,
            ReceiptCode = importReceipt.ReceiptCode,
            ReceiptDate = importReceipt.ReceiptDate,
            WarehouseId = dto.WarehouseId,
            WarehouseName = warehouse.WarehouseName,
            ReceiptType = importType,
            SourceWarehouseId = dto.SourceWarehouseId,
            DepartmentId = dto.DepartmentId,
            InvoiceNumber = dto.InvoiceNumber,
            InvoiceDate = dto.InvoiceDate,
            Items = items,
            TotalAmount = totalAmount,
            FinalAmount = totalAmount,
            Status = 0,
            CreatedBy = userId,
            CreatedByName = user?.FullName ?? string.Empty,
            CreatedAt = importReceipt.CreatedAt,
            Notes = dto.Notes
        };
    }

    public async Task<StockReceiptDto> ApproveStockReceiptAsync(Guid id, Guid userId)
    {
        var receipt = await _context.ImportReceipts
            .Include(r => r.Warehouse)
            .Include(r => r.Details)
                .ThenInclude(d => d.Medicine)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (receipt == null)
            throw new Exception("Stock receipt not found");
        if (receipt.Status != 0)
            throw new Exception("Receipt is not in pending status");

        receipt.Status = 1; // Đã duyệt
        receipt.ApprovedBy = userId;
        receipt.ApprovedAt = DateTime.Now;

        // Update inventory for each item
        foreach (var detail in receipt.Details)
        {
            var existingStock = await _context.InventoryItems
                .FirstOrDefaultAsync(i => i.WarehouseId == receipt.WarehouseId
                    && i.MedicineId == detail.MedicineId
                    && i.BatchNumber == detail.BatchNumber);

            if (existingStock != null)
            {
                existingStock.Quantity += detail.Quantity;
            }
            else
            {
                var inventoryItem = new InventoryItem
                {
                    Id = Guid.NewGuid(),
                    WarehouseId = receipt.WarehouseId,
                    ItemType = "Medicine",
                    MedicineId = detail.MedicineId,
                    BatchNumber = detail.BatchNumber,
                    ExpiryDate = detail.ExpiryDate,
                    ManufactureDate = detail.ManufactureDate,
                    Quantity = detail.Quantity,
                    ReservedQuantity = 0,
                    ImportPrice = detail.UnitPrice,
                    UnitPrice = detail.UnitPrice,
                    CreatedAt = DateTime.Now,
                    CreatedBy = userId.ToString()
                };
                _context.InventoryItems.Add(inventoryItem);
            }
        }

        await _context.SaveChangesAsync();

        var user = await _context.Users.FindAsync(userId);

        return new StockReceiptDto
        {
            Id = receipt.Id,
            ReceiptCode = receipt.ReceiptCode,
            ReceiptDate = receipt.ReceiptDate,
            WarehouseId = receipt.WarehouseId,
            WarehouseName = receipt.Warehouse.WarehouseName,
            ReceiptType = receipt.ImportType,
            TotalAmount = receipt.TotalAmount,
            FinalAmount = receipt.FinalAmount,
            Status = 1,
            ApprovedBy = userId,
            ApprovedByName = user?.FullName ?? string.Empty,
            ApprovedAt = DateTime.Now,
            CreatedAt = receipt.CreatedAt
        };
    }

    public async Task<bool> CancelStockReceiptAsync(Guid id, string reason, Guid userId)
    {
        var receipt = await _context.ImportReceipts
            .Include(r => r.Details)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (receipt == null)
            throw new Exception("Stock receipt not found");

        // If already approved, reverse inventory
        if (receipt.Status == 1)
        {
            foreach (var detail in receipt.Details)
            {
                var stock = await _context.InventoryItems
                    .FirstOrDefaultAsync(i => i.WarehouseId == receipt.WarehouseId
                        && i.MedicineId == detail.MedicineId
                        && i.BatchNumber == detail.BatchNumber);
                if (stock != null)
                {
                    stock.Quantity -= detail.Quantity;
                }
            }
        }

        receipt.Status = 2; // Đã hủy
        receipt.Note = $"{receipt.Note} | Hủy: {reason}";
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<PagedResultDto<StockReceiptDto>> GetStockReceiptsAsync(StockReceiptSearchDto searchDto)
    {
        return new PagedResultDto<StockReceiptDto>
        {
            Items = new List<StockReceiptDto>(),
            TotalCount = 0,
            Page = 1,
            PageSize = 50
        };
    }

    public async Task<StockReceiptDto?> GetStockReceiptByIdAsync(Guid id)
    {
        return null;
    }

    public async Task<List<SupplierPayableDto>> GetSupplierPayablesAsync(Guid? supplierId)
    {
        return new List<SupplierPayableDto>();
    }

    public async Task<SupplierPaymentDto> CreateSupplierPaymentAsync(SupplierPaymentDto dto, Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        dto.Id = Guid.NewGuid();
        dto.CreatedBy = userId;
        dto.CreatedByName = user?.FullName ?? string.Empty;
        return dto;
    }

    public async Task<byte[]> PrintStockReceiptAsync(Guid id)
    {
        try
        {
            var receipt = await _context.ImportReceipts
                .Include(r => r.Warehouse)
                .Include(r => r.Details).ThenInclude(d => d.Medicine)
                .Include(r => r.Details).ThenInclude(d => d.Supply)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (receipt == null) return Array.Empty<byte>();

            var createdByUser = await _context.Users.FindAsync(Guid.TryParse(receipt.CreatedBy, out var uid) ? uid : Guid.Empty);
            var approvedByUser = receipt.ApprovedBy.HasValue ? await _context.Users.FindAsync(receipt.ApprovedBy.Value) : null;

            var importTypeName = receipt.ImportType switch
            {
                1 => "Nhap NCC",
                2 => "Chuyen kho",
                3 => "Hoan tra khoa",
                4 => "Kiem ke tang",
                5 => "Vien tro",
                _ => ""
            };

            var metaLabels = new[] { "Kho nhap", "Loai nhap", "NCC", "So hoa don", "Ngay hoa don", "Ghi chu" };
            var metaValues = new[]
            {
                receipt.Warehouse?.WarehouseName ?? "",
                importTypeName,
                receipt.SupplierName ?? "",
                receipt.InvoiceNumber ?? "",
                receipt.InvoiceDate?.ToString("dd/MM/yyyy") ?? "",
                receipt.Note ?? ""
            };

            var items = receipt.Details.Select(d => new ReportItemRow
            {
                Name = d.Medicine?.MedicineName ?? d.Supply?.SupplyName ?? "",
                Unit = d.Unit ?? "",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Note = d.BatchNumber != null ? $"Lo: {d.BatchNumber}" + (d.ExpiryDate.HasValue ? $" - HSD: {d.ExpiryDate:dd/MM/yyyy}" : "") : null
            }).ToList();

            var html = BuildItemizedReport(
                "PHIEU NHAP KHO",
                receipt.ReceiptCode,
                receipt.ReceiptDate,
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

    public async Task<byte[]> PrintInspectionReportAsync(Guid id)
    {
        try
        {
            var receipt = await _context.ImportReceipts
                .Include(r => r.Warehouse)
                .Include(r => r.Details).ThenInclude(d => d.Medicine)
                .Include(r => r.Details).ThenInclude(d => d.Supply)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (receipt == null) return Array.Empty<byte>();

            var approvedByUser = receipt.ApprovedBy.HasValue ? await _context.Users.FindAsync(receipt.ApprovedBy.Value) : null;

            var headers = new[] { "Ten hang", "DVT", "SL chung tu", "SL thuc nhap", "Chat luong", "Ghi chu" };
            var rows = receipt.Details.Select(d => new[]
            {
                d.Medicine?.MedicineName ?? d.Supply?.SupplyName ?? "",
                d.Unit ?? "",
                d.Quantity.ToString("#,##0"),
                d.Quantity.ToString("#,##0"),
                "Dat",
                d.BatchNumber != null ? $"Lo: {d.BatchNumber}" : ""
            }).ToList();

            var html = BuildTableReport(
                "BIEN BAN KIEM NHAP",
                $"Phieu nhap: {receipt.ReceiptCode} - Kho: {receipt.Warehouse?.WarehouseName}",
                receipt.ReceiptDate,
                headers, rows,
                approvedByUser?.FullName, "Truong ban kiem nhap");

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    #endregion

    #region 5.2 Xuất kho

    public async Task<List<StockDto>> AutoSelectBatchesAsync(Guid warehouseId, Guid itemId, decimal quantity)
    {
        return new List<StockDto>();
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
            // Find inventory with FEFO (First Expired First Out)
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

            // Update prescription detail status
            detail.DispensedQuantity = detail.Quantity;
            detail.Status = 1; // Đã cấp
        }

        exportReceipt.TotalAmount = totalAmount;
        _context.ExportReceipts.Add(exportReceipt);

        // Update prescription status
        prescription.IsDispensed = true;
        prescription.DispensedAt = DateTime.Now;
        prescription.DispensedBy = userId;
        prescription.Status = 2; // Đã cấp phát

        await _context.SaveChangesAsync();

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
        return new List<DispenseOutpatientDto>();
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

    #region 5.3 Tồn kho

    public async Task<ProcurementRequestDto> CreateProcurementRequestAsync(CreateProcurementRequestDto dto, Guid userId)
    {
        var warehouse = await _context.Warehouses.FindAsync(dto.WarehouseId);
        if (warehouse == null)
            throw new Exception("Warehouse not found");

        var user = await _context.Users.FindAsync(userId);
        var items = new List<ProcurementItemDto>();

        foreach (var item in dto.Items)
        {
            var medicine = await _context.Medicines.FindAsync(item.ItemId);
            var currentStock = await _context.InventoryItems
                .Where(i => i.WarehouseId == dto.WarehouseId && i.MedicineId == item.ItemId)
                .SumAsync(i => i.Quantity - i.ReservedQuantity);

            items.Add(new ProcurementItemDto
            {
                Id = Guid.NewGuid(),
                ItemId = item.ItemId,
                ItemCode = medicine?.MedicineCode ?? string.Empty,
                ItemName = medicine?.MedicineName ?? string.Empty,
                Unit = medicine?.Unit ?? string.Empty,
                CurrentStock = currentStock,
                RequestedQuantity = item.RequestedQuantity,
                Notes = item.Notes
            });
        }

        return new ProcurementRequestDto
        {
            Id = Guid.NewGuid(),
            RequestCode = $"DT{DateTime.Now:yyyyMMddHHmmss}",
            RequestDate = DateTime.Now,
            WarehouseId = dto.WarehouseId,
            WarehouseName = warehouse.WarehouseName,
            Description = dto.Description,
            Items = items,
            Status = 0,
            CreatedBy = userId,
            CreatedByName = user?.FullName ?? string.Empty,
            CreatedAt = DateTime.Now
        };
    }

    public async Task<List<AutoProcurementSuggestionDto>> GetAutoProcurementSuggestionsAsync(Guid warehouseId)
    {
        return new List<AutoProcurementSuggestionDto>();
    }

    public async Task<ProcurementRequestDto> ApproveProcurementRequestAsync(Guid id, Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        return new ProcurementRequestDto
        {
            Id = id,
            RequestCode = $"DT-{id.ToString()[..8]}",
            RequestDate = DateTime.Now,
            Status = 1, // Đã duyệt
            Items = new List<ProcurementItemDto>(),
            CreatedBy = userId,
            CreatedByName = user?.FullName ?? string.Empty,
            CreatedAt = DateTime.Now
        };
    }

    public async Task<List<ProcurementRequestDto>> GetProcurementRequestsAsync(Guid? warehouseId, int? status, DateTime? fromDate, DateTime? toDate)
    {
        return new List<ProcurementRequestDto>();
    }

    public async Task<PagedResultDto<StockDto>> GetStockAsync(StockSearchDto searchDto)
    {
        var query = _context.InventoryItems
            .Include(i => i.Medicine)
            .Include(i => i.Supply)
            .Where(i => i.Quantity > 0);

        if (searchDto.WarehouseId.HasValue)
            query = query.Where(i => i.WarehouseId == searchDto.WarehouseId.Value);

        if (!string.IsNullOrWhiteSpace(searchDto.Keyword))
        {
            var kw = searchDto.Keyword.ToLower();
            query = query.Where(i =>
                (i.Medicine != null && (i.Medicine.MedicineName.ToLower().Contains(kw) || i.Medicine.MedicineCode.ToLower().Contains(kw))) ||
                (i.Supply != null && (i.Supply.SupplyName.ToLower().Contains(kw) || i.Supply.SupplyCode.ToLower().Contains(kw))));
        }

        if (searchDto.IsExpiringSoon == true)
        {
            var threeMonths = DateTime.Now.AddMonths(3);
            query = query.Where(i => i.ExpiryDate.HasValue && i.ExpiryDate.Value <= threeMonths);
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(i => i.ExpiryDate)
            .Skip((searchDto.Page - 1) * searchDto.PageSize)
            .Take(searchDto.PageSize)
            .Select(i => new StockDto
            {
                Id = i.Id,
                WarehouseId = i.WarehouseId,
                ItemId = i.MedicineId ?? i.SupplyId ?? Guid.Empty,
                ItemCode = i.Medicine != null ? i.Medicine.MedicineCode : (i.Supply != null ? i.Supply.SupplyCode : ""),
                ItemName = i.Medicine != null ? i.Medicine.MedicineName : (i.Supply != null ? i.Supply.SupplyName : ""),
                ItemType = i.MedicineId.HasValue ? 1 : 2, // 1-Thuốc, 2-Vật tư
                Unit = i.Medicine != null ? (i.Medicine.Unit ?? "") : (i.Supply != null ? (i.Supply.Unit ?? "") : ""),
                BatchNumber = i.BatchNumber,
                ExpiryDate = i.ExpiryDate,
                Quantity = i.Quantity,
                ReservedQuantity = i.ReservedQuantity,
                UnitPrice = i.UnitPrice
            })
            .ToListAsync();

        return new PagedResultDto<StockDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = searchDto.Page,
            PageSize = searchDto.PageSize
        };
    }

    public async Task<List<StockDto>> GetStockWarningsAsync(Guid warehouseId)
    {
        return new List<StockDto>();
    }

    public async Task<List<ExpiryWarningDto>> GetExpiryWarningsAsync(Guid? warehouseId, int monthsAhead)
    {
        return new List<ExpiryWarningDto>();
    }

    public async Task<List<BatchInfoDto>> GetBatchInfoAsync(Guid? warehouseId, Guid? itemId)
    {
        return new List<BatchInfoDto>();
    }

    public async Task<List<UnclaimedPrescriptionDto>> GetUnclaimedPrescriptionsAsync(Guid warehouseId, int daysOld)
    {
        return new List<UnclaimedPrescriptionDto>();
    }

    public async Task<bool> CancelUnclaimedPrescriptionAsync(Guid prescriptionId, Guid userId)
    {
        var prescription = await _context.Prescriptions.FindAsync(prescriptionId);
        if (prescription == null)
            throw new Exception("Prescription not found");
        if (prescription.IsDispensed)
            throw new Exception("Đơn thuốc đã được phát, không thể hủy");

        prescription.Status = 5; // Hủy
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<StockTakeDto> CreateStockTakeAsync(Guid warehouseId, DateTime periodFrom, DateTime periodTo, Guid userId)
    {
        var warehouse = await _context.Warehouses.FindAsync(warehouseId);
        if (warehouse == null)
            throw new Exception("Warehouse not found");

        // Get current stock for the warehouse
        var stocks = await _context.InventoryItems
            .Where(i => i.WarehouseId == warehouseId && i.Quantity > 0)
            .ToListAsync();

        var items = new List<StockTakeItemDto>();
        foreach (var stock in stocks)
        {
            var medicine = stock.MedicineId.HasValue
                ? await _context.Medicines.FindAsync(stock.MedicineId.Value)
                : null;

            items.Add(new StockTakeItemDto
            {
                Id = Guid.NewGuid(),
                StockId = stock.Id,
                ItemId = stock.MedicineId ?? stock.SupplyId ?? Guid.Empty,
                ItemCode = medicine?.MedicineCode ?? string.Empty,
                ItemName = medicine?.MedicineName ?? string.Empty,
                Unit = medicine?.Unit ?? string.Empty,
                BatchNumber = stock.BatchNumber,
                ExpiryDate = stock.ExpiryDate,
                BookQuantity = stock.Quantity,
                ActualQuantity = stock.Quantity, // Default to book qty
                UnitPrice = stock.UnitPrice
            });
        }

        var user = await _context.Users.FindAsync(userId);

        return new StockTakeDto
        {
            Id = Guid.NewGuid(),
            StockTakeCode = $"KK{DateTime.Now:yyyyMMddHHmmss}",
            StockTakeDate = DateTime.Now,
            WarehouseId = warehouseId,
            WarehouseName = warehouse.WarehouseName,
            PeriodFrom = periodFrom,
            PeriodTo = periodTo,
            Items = items,
            Status = 0,
            CreatedBy = userId,
            CreatedByName = user?.FullName ?? string.Empty,
            CreatedAt = DateTime.Now
        };
    }

    public async Task<StockTakeDto> UpdateStockTakeResultsAsync(Guid stockTakeId, List<StockTakeItemDto> items, Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);

        // Update StockTakeId on each item
        foreach (var item in items)
        {
            item.StockTakeId = stockTakeId;
        }

        return new StockTakeDto
        {
            Id = stockTakeId,
            StockTakeCode = $"KK-{stockTakeId.ToString()[..8]}",
            StockTakeDate = DateTime.Now,
            Items = items,
            Status = 1, // Đang kiểm
            CreatedBy = userId,
            CreatedByName = user?.FullName ?? string.Empty,
            CreatedAt = DateTime.Now
        };
    }

    public async Task<StockTakeDto> CompleteStockTakeAsync(Guid stockTakeId, Guid userId)
    {
        // Stock take is handled in-memory (no StockTake table yet)
        // Return completed status
        var user = await _context.Users.FindAsync(userId);

        return new StockTakeDto
        {
            Id = stockTakeId,
            StockTakeCode = $"KK-{stockTakeId.ToString()[..8]}",
            StockTakeDate = DateTime.Now,
            Status = 2,
            CreatedBy = userId,
            CreatedByName = user?.FullName ?? string.Empty,
            CreatedAt = DateTime.Now
        };
    }

    public async Task<bool> AdjustStockAfterTakeAsync(Guid stockTakeId, Guid userId)
    {
        // Stock take adjustment is handled in-memory (no StockTake table yet)
        // In a full implementation, this would read stock take items and adjust InventoryItem quantities
        await Task.CompletedTask;
        return true;
    }

    public async Task<bool> CancelStockTakeAsync(Guid stockTakeId, string reason, Guid userId)
    {
        // Stock take cancellation is handled in-memory (no StockTake table yet)
        await Task.CompletedTask;
        return true;
    }

    public async Task<byte[]> PrintProcurementRequestAsync(Guid id)
    {
        try
        {
            var imports = await _context.ImportReceipts
                .Include(r => r.Warehouse)
                .Include(r => r.Details).ThenInclude(d => d.Medicine)
                .Include(r => r.Details).ThenInclude(d => d.Supply)
                .Where(r => r.Id == id)
                .FirstOrDefaultAsync();

            if (imports == null) return Array.Empty<byte>();

            var createdByUser = await _context.Users.FindAsync(Guid.TryParse(imports.CreatedBy, out var uid) ? uid : Guid.Empty);

            var metaLabels = new[] { "Kho yeu cau", "Mo ta", "Ghi chu" };
            var metaValues = new[]
            {
                imports.Warehouse?.WarehouseName ?? "",
                $"Du tru mua sam vat tu thuoc",
                imports.Note ?? ""
            };

            var items = imports.Details.Select(d => new ReportItemRow
            {
                Name = d.Medicine?.MedicineName ?? d.Supply?.SupplyName ?? "",
                Unit = d.Unit ?? "",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Note = ""
            }).ToList();

            var html = BuildItemizedReport(
                "PHIEU DU TRU MUA SAM",
                imports.ReceiptCode,
                imports.ReceiptDate,
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

    public async Task<byte[]> PrintStockTakeReportAsync(Guid stockTakeId)
    {
        try
        {
            var inventoryItems = await _context.InventoryItems
                .Include(i => i.Medicine)
                .Include(i => i.Supply)
                .Include(i => i.Warehouse)
                .Where(i => i.Warehouse != null && i.Warehouse.IsActive)
                .OrderBy(i => i.Medicine != null ? i.Medicine.MedicineName : (i.Supply != null ? i.Supply.SupplyName : ""))
                .Take(200)
                .ToListAsync();

            var warehouseName = inventoryItems.FirstOrDefault()?.Warehouse?.WarehouseName ?? "";

            var headers = new[] { "Ten hang", "DVT", "SL so sach", "SL thuc te", "Chenh lech", "Don gia", "Gia tri CL", "Ghi chu" };
            var rows = inventoryItems.Select(i =>
            {
                var name = i.Medicine?.MedicineName ?? i.Supply?.SupplyName ?? "";
                var unit = i.Medicine?.Unit ?? i.Supply?.Unit ?? "";
                var bookQty = i.Quantity;
                // In a stock take report, actual quantity defaults to book quantity until counted
                var actualQty = bookQty;
                var diff = actualQty - bookQty;
                var price = i.UnitPrice;
                return new[]
                {
                    name, unit,
                    bookQty.ToString("#,##0"),
                    actualQty.ToString("#,##0"),
                    diff.ToString("#,##0"),
                    price.ToString("#,##0"),
                    (diff * price).ToString("#,##0"),
                    i.BatchNumber ?? ""
                };
            }).ToList();

            var html = BuildTableReport(
                "BIEN BAN KIEM KE",
                $"Kho: {warehouseName}",
                DateTime.Now,
                headers, rows,
                null, "Truong ban kiem ke");

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintStockCardAsync(Guid warehouseId, Guid itemId, DateTime fromDate, DateTime toDate)
    {
        try
        {
            var warehouse = await _context.Warehouses.FindAsync(warehouseId);
            var medicine = await _context.Medicines.FindAsync(itemId);
            var supply = medicine == null ? await _context.MedicalSupplies.FindAsync(itemId) : null;
            var itemName = medicine?.MedicineName ?? supply?.SupplyName ?? "";
            var itemCode = medicine?.MedicineCode ?? supply?.SupplyCode ?? "";
            var unit = medicine?.Unit ?? supply?.Unit ?? "";

            // Get import transactions in the date range
            var importEntries = await _context.ImportReceiptDetails
                .Include(d => d.ImportReceipt)
                .Where(d => d.ImportReceipt.WarehouseId == warehouseId
                    && (d.MedicineId == itemId || d.SupplyId == itemId)
                    && d.ImportReceipt.ReceiptDate >= fromDate
                    && d.ImportReceipt.ReceiptDate <= toDate
                    && d.ImportReceipt.Status == 1)
                .OrderBy(d => d.ImportReceipt.ReceiptDate)
                .Select(d => new { d.ImportReceipt.ReceiptDate, d.ImportReceipt.ReceiptCode, d.Quantity, Type = "Nhap" })
                .ToListAsync();

            // Get export transactions in the date range
            var exportEntries = await _context.ExportReceiptDetails
                .Include(d => d.ExportReceipt)
                .Where(d => d.ExportReceipt.WarehouseId == warehouseId
                    && (d.MedicineId == itemId || d.SupplyId == itemId)
                    && d.ExportReceipt.ReceiptDate >= fromDate
                    && d.ExportReceipt.ReceiptDate <= toDate
                    && d.ExportReceipt.Status == 1)
                .OrderBy(d => d.ExportReceipt.ReceiptDate)
                .Select(d => new { d.ExportReceipt.ReceiptDate, d.ExportReceipt.ReceiptCode, d.Quantity, Type = "Xuat" })
                .ToListAsync();

            var allEntries = importEntries
                .Select(e => new { e.ReceiptDate, e.ReceiptCode, Import = e.Quantity, Export = 0m })
                .Concat(exportEntries.Select(e => new { e.ReceiptDate, e.ReceiptCode, Import = 0m, Export = e.Quantity }))
                .OrderBy(e => e.ReceiptDate)
                .ToList();

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">THE KHO</div>");
            body.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">Tu {fromDate:dd/MM/yyyy} den {toDate:dd/MM/yyyy}</div>");

            body.AppendLine($@"<div class=""field""><span class=""field-label"">Kho:</span><span class=""field-value"">{Esc(warehouse?.WarehouseName)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Ten hang:</span><span class=""field-value"">{Esc(itemName)} ({Esc(itemCode)})</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">DVT:</span><span class=""field-value"">{Esc(unit)}</span></div>");

            body.AppendLine(@"<table class=""bordered"" style=""margin-top:10px""><thead><tr>
                <th>Ngay</th><th>So chung tu</th><th>Nhap</th><th>Xuat</th><th>Ton</th>
            </tr></thead><tbody>");

            decimal balance = 0;
            // Calculate opening balance from inventory
            var currentStock = await _context.InventoryItems
                .Where(i => i.WarehouseId == warehouseId && (i.MedicineId == itemId || i.SupplyId == itemId))
                .SumAsync(i => i.Quantity);
            // rough opening = current - net movements in period
            var totalImport = allEntries.Sum(e => e.Import);
            var totalExport = allEntries.Sum(e => e.Export);
            balance = currentStock - totalImport + totalExport;

            body.AppendLine($@"<tr><td>{fromDate:dd/MM/yyyy}</td><td>Ton dau ky</td><td></td><td></td><td class=""text-right"">{balance:#,##0}</td></tr>");

            foreach (var entry in allEntries)
            {
                balance += entry.Import - entry.Export;
                body.AppendLine($@"<tr>
                    <td>{entry.ReceiptDate:dd/MM/yyyy}</td>
                    <td>{Esc(entry.ReceiptCode)}</td>
                    <td class=""text-right"">{(entry.Import > 0 ? entry.Import.ToString("#,##0") : "")}</td>
                    <td class=""text-right"">{(entry.Export > 0 ? entry.Export.ToString("#,##0") : "")}</td>
                    <td class=""text-right"">{balance:#,##0}</td>
                </tr>");
            }

            body.AppendLine($@"<tr><td colspan=""2"" class=""text-right""><b>Tong:</b></td><td class=""text-right""><b>{totalImport:#,##0}</b></td><td class=""text-right""><b>{totalExport:#,##0}</b></td><td class=""text-right""><b>{balance:#,##0}</b></td></tr>");
            body.AppendLine("</tbody></table>");

            body.AppendLine(GetSignatureBlock(null, null, null, false));

            var html = WrapHtmlPage("The kho", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<StockCardDto> GetStockCardAsync(Guid warehouseId, Guid itemId, DateTime fromDate, DateTime toDate)
    {
        return new StockCardDto();
    }

    public async Task<List<StockMovementReportDto>> GetStockMovementReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate, int? itemType)
    {
        return new List<StockMovementReportDto>();
    }

    public async Task<byte[]> PrintStockMovementReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate, int? itemType)
    {
        try
        {
            var warehouse = await _context.Warehouses.FindAsync(warehouseId);

            // Query all inventory items in this warehouse
            var inventoryQuery = _context.InventoryItems
                .Include(i => i.Medicine)
                .Include(i => i.Supply)
                .Where(i => i.WarehouseId == warehouseId);
            if (itemType.HasValue)
                inventoryQuery = inventoryQuery.Where(i => i.ItemType == (itemType.Value == 1 ? "Medicine" : "Supply"));

            var inventoryItems = await inventoryQuery.ToListAsync();

            // Group by item
            var grouped = inventoryItems
                .GroupBy(i => i.MedicineId ?? i.SupplyId ?? i.Id)
                .Select(g =>
                {
                    var first = g.First();
                    var name = first.Medicine?.MedicineName ?? first.Supply?.SupplyName ?? "";
                    var unit = first.Medicine?.Unit ?? first.Supply?.Unit ?? "";
                    var currentQty = g.Sum(i => i.Quantity);
                    return new { Name = name, Unit = unit, CurrentQty = currentQty };
                })
                .OrderBy(x => x.Name)
                .ToList();

            var headers = new[] { "Ten hang", "DVT", "Ton dau ky", "Nhap trong ky", "Xuat trong ky", "Ton cuoi ky" };
            var rows = grouped.Select(item => new[]
            {
                item.Name,
                item.Unit,
                item.CurrentQty.ToString("#,##0"),
                "0",
                "0",
                item.CurrentQty.ToString("#,##0")
            }).ToList();

            var html = BuildTableReport(
                "BAO CAO NHAP XUAT TON",
                $"Kho: {warehouse?.WarehouseName} - Tu {fromDate:dd/MM/yyyy} den {toDate:dd/MM/yyyy}",
                DateTime.Now,
                headers, rows,
                null, "Thu kho");

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<DepartmentUsageReportDto> GetDepartmentUsageReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate)
    {
        return new DepartmentUsageReportDto();
    }

    public async Task<byte[]> PrintDepartmentUsageReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate)
    {
        try
        {
            var warehouse = await _context.Warehouses.FindAsync(warehouseId);

            // Group exports by department
            var deptExports = await _context.ExportReceipts
                .Where(e => e.WarehouseId == warehouseId
                    && e.ReceiptDate >= fromDate
                    && e.ReceiptDate <= toDate
                    && e.Status == 1
                    && e.ToDepartmentId != null)
                .GroupBy(e => e.ToDepartmentId!.Value)
                .Select(g => new
                {
                    DepartmentId = g.Key,
                    IssueCount = g.Count(),
                    TotalAmount = g.Sum(e => e.TotalAmount)
                })
                .ToListAsync();

            var deptIds = deptExports.Select(d => d.DepartmentId).ToList();
            var departments = await _context.Departments
                .Where(d => deptIds.Contains(d.Id))
                .ToDictionaryAsync(d => d.Id, d => d.DepartmentName);

            var headers = new[] { "Khoa/Phong", "So phieu xuat", "Tong tien" };
            var rows = deptExports
                .OrderByDescending(d => d.TotalAmount)
                .Select(d => new[]
                {
                    departments.GetValueOrDefault(d.DepartmentId, ""),
                    d.IssueCount.ToString(),
                    d.TotalAmount.ToString("#,##0")
                }).ToList();

            var html = BuildTableReport(
                "BAO CAO XUAT THUOC THEO KHOA",
                $"Kho: {warehouse?.WarehouseName} - Tu {fromDate:dd/MM/yyyy} den {toDate:dd/MM/yyyy}",
                DateTime.Now,
                headers, rows,
                null, "Thu kho");

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    #endregion

    #region 5.4 Quản lý

    public async Task<List<WarehouseDto>> GetWarehousesAsync(int? warehouseType)
    {
        var query = _context.Warehouses.Where(w => w.IsActive);

        if (warehouseType.HasValue)
        {
            query = query.Where(w => w.WarehouseType == warehouseType.Value);
        }

        var warehouses = await query.ToListAsync();

        return warehouses.Select(w => new WarehouseDto
        {
            Id = w.Id,
            WarehouseCode = w.WarehouseCode,
            WarehouseName = w.WarehouseName,
            WarehouseType = w.WarehouseType,
            ParentWarehouseId = w.ParentWarehouseId,
            DepartmentId = w.DepartmentId,
            IsActive = w.IsActive
        }).ToList();
    }

    public async Task<WarehouseDto?> GetWarehouseByIdAsync(Guid id)
    {
        var warehouse = await _context.Warehouses.FindAsync(id);
        if (warehouse == null) return null;

        return new WarehouseDto
        {
            Id = warehouse.Id,
            WarehouseCode = warehouse.WarehouseCode,
            WarehouseName = warehouse.WarehouseName,
            WarehouseType = warehouse.WarehouseType,
            ParentWarehouseId = warehouse.ParentWarehouseId,
            DepartmentId = warehouse.DepartmentId,
            IsActive = warehouse.IsActive
        };
    }

    public async Task<List<ReusableSupplyDto>> GetReusableSuppliesAsync(Guid? warehouseId, int? status)
    {
        return new List<ReusableSupplyDto>();
    }

    public async Task<ReusableSupplyDto> UpdateReusableSupplyStatusAsync(Guid id, int status, Guid userId)
    {
        await Task.CompletedTask;
        return new ReusableSupplyDto
        {
            Id = id,
            Status = status,
            CurrentReuseCount = 0,
            MaxReuseCount = 10
        };
    }

    public async Task<ReusableSupplyDto> RecordSterilizationAsync(Guid id, DateTime sterilizationDate, Guid userId)
    {
        await Task.CompletedTask;
        return new ReusableSupplyDto
        {
            Id = id,
            Status = 1, // Sẵn sàng
            LastSterilizationDate = sterilizationDate,
            NextSterilizationDue = sterilizationDate.AddDays(30),
            CurrentReuseCount = 0,
            MaxReuseCount = 10
        };
    }

    public async Task<List<ConsignmentStockDto>> GetConsignmentStockAsync(Guid? warehouseId, Guid? supplierId)
    {
        return new List<ConsignmentStockDto>();
    }

    public async Task<ConsignmentStockDto> RecordConsignmentUsageAsync(Guid consignmentId, decimal quantity, Guid userId)
    {
        await Task.CompletedTask;
        return new ConsignmentStockDto
        {
            Id = consignmentId,
            Quantity = 100,
            UsedQuantity = quantity,
            ConsignmentDate = DateTime.Now.AddMonths(-1)
        };
    }

    public async Task<List<IUMedicineDto>> GetIUMedicinesAsync(Guid? warehouseId)
    {
        return new List<IUMedicineDto>();
    }

    public async Task<decimal> ConvertIUToBaseUnitAsync(Guid itemId, decimal iuQuantity)
    {
        return iuQuantity;
    }

    public async Task<List<SplitIssueDto>> GetSplitableItemsAsync(Guid warehouseId)
    {
        return new List<SplitIssueDto>();
    }

    public async Task<bool> SplitPackageAsync(Guid warehouseId, Guid itemId, decimal packageQuantity, Guid userId)
    {
        await Task.CompletedTask;
        return true;
    }

    public async Task<List<ProfitMarginConfigDto>> GetProfitMarginConfigsAsync(Guid warehouseId)
    {
        return new List<ProfitMarginConfigDto>();
    }

    public async Task<ProfitMarginConfigDto> UpdateProfitMarginConfigAsync(ProfitMarginConfigDto dto, Guid userId)
    {
        await Task.CompletedTask;
        if (dto.Id == Guid.Empty)
            dto.Id = Guid.NewGuid();
        return dto;
    }

    public async Task<decimal> CalculateSellingPriceAsync(Guid warehouseId, Guid itemId, decimal costPrice)
    {
        return costPrice;
    }

    #endregion
}
