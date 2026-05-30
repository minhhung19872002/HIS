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

// K10 phien 2 (2026-05-30): tach 5.1 Nhập kho (~618 dong) khoi WarehouseCompleteService.
public partial class WarehouseCompleteService {
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
        // Sum approved supplier-source receipts per supplier code. Supplier
        // catalog provides the supplier ID/name; we don't read TotalDebt
        // because the column may be missing on older schemas.
        try
        {
            var receiptsQuery = _context.ImportReceipts
                .Where(r => !r.IsDeleted
                            && r.ImportType == 1
                            && r.Status == 1
                            && !string.IsNullOrEmpty(r.SupplierCode));

            string? filterCode = null;
            if (supplierId.HasValue)
            {
                filterCode = await _context.Suppliers
                    .Where(s => s.Id == supplierId.Value)
                    .Select(s => s.SupplierCode)
                    .FirstOrDefaultAsync();
                if (filterCode != null) receiptsQuery = receiptsQuery.Where(r => r.SupplierCode == filterCode);
            }

            var receipts = await receiptsQuery
                .Select(r => new { r.SupplierCode, r.SupplierName, r.FinalAmount })
                .ToListAsync();

            var supplierMap = await _context.Suppliers
                .Where(s => s.IsActive)
                .Select(s => new { s.Id, s.SupplierCode, s.SupplierName })
                .ToListAsync();

            return receipts
                .GroupBy(r => r.SupplierCode!)
                .Select(g =>
                {
                    var sup = supplierMap.FirstOrDefault(s => s.SupplierCode == g.Key);
                    var total = g.Sum(x => x.FinalAmount);
                    return new SupplierPayableDto
                    {
                        SupplierId = sup?.Id ?? Guid.Empty,
                        SupplierCode = g.Key,
                        SupplierName = sup?.SupplierName ?? g.First().SupplierName ?? "",
                        TotalReceiptAmount = total,
                        PaidAmount = 0,
                        RemainingAmount = total,
                        Invoices = new List<PayableInvoiceDto>(),
                    };
                })
                .OrderByDescending(s => s.RemainingAmount)
                .ToList();
        }
        catch (Microsoft.Data.SqlClient.SqlException)
        {
            return new List<SupplierPayableDto>();
        }
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
}
