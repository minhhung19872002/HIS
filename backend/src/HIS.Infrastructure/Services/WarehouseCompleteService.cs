using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Warehouse;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

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
        throw new NotImplementedException("CreateOtherSourceReceiptAsync not implemented");
    }

    public async Task<StockReceiptDto> CreateTransferReceiptAsync(CreateStockReceiptDto dto, Guid userId)
    {
        throw new NotImplementedException("CreateTransferReceiptAsync not implemented");
    }

    public async Task<StockReceiptDto> CreateDepartmentReturnReceiptAsync(CreateStockReceiptDto dto, Guid userId)
    {
        throw new NotImplementedException("CreateDepartmentReturnReceiptAsync not implemented");
    }

    public async Task<StockReceiptDto> CreateWarehouseReturnReceiptAsync(CreateStockReceiptDto dto, Guid userId)
    {
        throw new NotImplementedException("CreateWarehouseReturnReceiptAsync not implemented");
    }

    public async Task<StockReceiptDto> CreateStockTakeReceiptAsync(CreateStockReceiptDto dto, Guid userId)
    {
        throw new NotImplementedException("CreateStockTakeReceiptAsync not implemented");
    }

    public async Task<StockReceiptDto> UpdateStockReceiptAsync(Guid id, CreateStockReceiptDto dto, Guid userId)
    {
        throw new NotImplementedException("UpdateStockReceiptAsync not implemented");
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
        throw new NotImplementedException("CreateSupplierPaymentAsync not implemented");
    }

    public async Task<byte[]> PrintStockReceiptAsync(Guid id)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> PrintInspectionReportAsync(Guid id)
    {
        return Array.Empty<byte>();
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
        throw new NotImplementedException("CreateTransferIssueAsync not implemented");
    }

    public async Task<StockIssueDto> CreateSupplierReturnAsync(CreateStockIssueDto dto, Guid userId)
    {
        throw new NotImplementedException("CreateSupplierReturnAsync not implemented");
    }

    public async Task<StockIssueDto> CreateExternalIssueAsync(CreateStockIssueDto dto, Guid userId)
    {
        throw new NotImplementedException("CreateExternalIssueAsync not implemented");
    }

    public async Task<StockIssueDto> CreateDestructionIssueAsync(CreateStockIssueDto dto, Guid userId)
    {
        throw new NotImplementedException("CreateDestructionIssueAsync not implemented");
    }

    public async Task<StockIssueDto> CreateTestSampleIssueAsync(CreateStockIssueDto dto, Guid userId)
    {
        throw new NotImplementedException("CreateTestSampleIssueAsync not implemented");
    }

    public async Task<StockIssueDto> CreateStockTakeIssueAsync(CreateStockIssueDto dto, Guid userId)
    {
        throw new NotImplementedException("CreateStockTakeIssueAsync not implemented");
    }

    public async Task<StockIssueDto> CreateDisposalIssueAsync(CreateStockIssueDto dto, Guid userId)
    {
        throw new NotImplementedException("CreateDisposalIssueAsync not implemented");
    }

    public async Task<PharmacySaleDto> CreatePharmacySaleByPrescriptionAsync(Guid prescriptionId, Guid userId)
    {
        throw new NotImplementedException("CreatePharmacySaleByPrescriptionAsync not implemented");
    }

    public async Task<PharmacySaleDto> CreateRetailSaleAsync(PharmacySaleDto dto, Guid userId)
    {
        throw new NotImplementedException("CreateRetailSaleAsync not implemented");
    }

    public async Task<bool> CancelStockIssueAsync(Guid id, string reason, Guid userId)
    {
        throw new NotImplementedException("CancelStockIssueAsync not implemented");
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
        return Array.Empty<byte>();
    }

    public async Task<byte[]> PrintUsageInstructionsAsync(Guid issueId)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> PrintOutpatientPrescriptionAsync(Guid prescriptionId)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> PrintInpatientOrderAsync(Guid orderSummaryId)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> PrintStockIssueAsync(Guid id)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> PrintNarcoticIssueAsync(Guid id)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> PrintToxicIssueAsync(Guid id)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> PrintTransferIssueAsync(Guid id)
    {
        return Array.Empty<byte>();
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
        throw new NotImplementedException("ApproveProcurementRequestAsync not implemented");
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
        throw new NotImplementedException("CancelUnclaimedPrescriptionAsync not implemented");
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
        throw new NotImplementedException("UpdateStockTakeResultsAsync not implemented");
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
        throw new NotImplementedException("AdjustStockAfterTakeAsync not implemented");
    }

    public async Task<bool> CancelStockTakeAsync(Guid stockTakeId, string reason, Guid userId)
    {
        throw new NotImplementedException("CancelStockTakeAsync not implemented");
    }

    public async Task<byte[]> PrintProcurementRequestAsync(Guid id)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> PrintStockTakeReportAsync(Guid stockTakeId)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> PrintStockCardAsync(Guid warehouseId, Guid itemId, DateTime fromDate, DateTime toDate)
    {
        return Array.Empty<byte>();
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
        return Array.Empty<byte>();
    }

    public async Task<DepartmentUsageReportDto> GetDepartmentUsageReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate)
    {
        return new DepartmentUsageReportDto();
    }

    public async Task<byte[]> PrintDepartmentUsageReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate)
    {
        return Array.Empty<byte>();
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
        throw new NotImplementedException("UpdateReusableSupplyStatusAsync not implemented");
    }

    public async Task<ReusableSupplyDto> RecordSterilizationAsync(Guid id, DateTime sterilizationDate, Guid userId)
    {
        throw new NotImplementedException("RecordSterilizationAsync not implemented");
    }

    public async Task<List<ConsignmentStockDto>> GetConsignmentStockAsync(Guid? warehouseId, Guid? supplierId)
    {
        return new List<ConsignmentStockDto>();
    }

    public async Task<ConsignmentStockDto> RecordConsignmentUsageAsync(Guid consignmentId, decimal quantity, Guid userId)
    {
        throw new NotImplementedException("RecordConsignmentUsageAsync not implemented");
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
        throw new NotImplementedException("SplitPackageAsync not implemented");
    }

    public async Task<List<ProfitMarginConfigDto>> GetProfitMarginConfigsAsync(Guid warehouseId)
    {
        return new List<ProfitMarginConfigDto>();
    }

    public async Task<ProfitMarginConfigDto> UpdateProfitMarginConfigAsync(ProfitMarginConfigDto dto, Guid userId)
    {
        throw new NotImplementedException("UpdateProfitMarginConfigAsync not implemented");
    }

    public async Task<decimal> CalculateSellingPriceAsync(Guid warehouseId, Guid itemId, decimal costPrice)
    {
        return costPrice;
    }

    #endregion
}
