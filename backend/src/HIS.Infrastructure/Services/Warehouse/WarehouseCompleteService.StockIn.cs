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

    /// <summary>
    /// QA0915: receipt lines were never validated — qty 0/negative or an unknown medicine id was
    /// accepted (negative qty then REDUCED stock on approve; unknown id failed later as FK 500).
    /// </summary>
    private static void EnsureValidReceiptItems(CreateStockReceiptDto dto, IReadOnlyDictionary<Guid, Medicine> medicinesMap)
    {
        if (dto.Items == null || dto.Items.Count == 0)
            throw new InvalidOperationException("Phiếu nhập phải có ít nhất 1 dòng thuốc.");
        foreach (var item in dto.Items)
        {
            if (item.Quantity <= 0)
                throw new InvalidOperationException("Số lượng nhập mỗi dòng phải lớn hơn 0.");
            if (item.UnitPrice < 0)
                throw new InvalidOperationException("Đơn giá nhập không được âm.");
            if (!medicinesMap.ContainsKey(item.ItemId))
                throw new InvalidOperationException($"Thuốc {item.ItemId} không tồn tại trong danh mục.");
        }
    }

    private static void EnsureValidReceiptRates(CreateStockReceiptDto dto)
    {
        foreach (var item in dto.Items)
            if (item.VatRate < 0 || item.VatRate > 100 || item.DiscountRate < 0 || item.DiscountRate > 100)
                throw new InvalidOperationException("VAT% và chiết khấu% mỗi dòng phải trong khoảng 0–100.");
    }

    /// <summary>
    /// QA-R4: goods coming IN from a supplier / other source with an expiry already in the past were accepted
    /// (measured: 200, lot created) — the lot then sits in stock value / reports and can only leave by destruction.
    /// Returns from departments / transfers keep their (possibly expired) lot as-is, so only intake types check.
    /// </summary>
    private static void EnsureNotExpiredOnIntake(IEnumerable<(string? BatchNumber, DateTime? ExpiryDate)> lines)
    {
        var today = DateTime.Today;
        foreach (var (batch, expiry) in lines)
            if (expiry.HasValue && expiry.Value.Date < today)
                throw new InvalidOperationException(
                    $"Lô {batch ?? "(không số lô)"} đã hết hạn ({expiry:dd/MM/yyyy}) — không nhập kho được.");
    }

    public async Task<StockReceiptDto> CreateSupplierReceiptAsync(CreateStockReceiptDto dto, Guid userId)
    {
        var warehouse = await _context.Warehouses.FindAsync(dto.WarehouseId);
        if (warehouse == null)
            throw new KeyNotFoundException("Warehouse not found");
        if (dto.Items == null || dto.Items.Count == 0)
            throw new InvalidOperationException("Phiếu nhập phải có ít nhất 1 dòng thuốc.");

        await using var codeTx = await SqlAppLock.BeginAsync(_context); // QA-R7: voucher-number lock scope
        var importReceipt = new ImportReceipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = await NextImportCodeAsync("NK"),
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

        decimal totalAmount = 0, vatTotal = 0, discountTotal = 0;
        var items = new List<StockReceiptItemDto>();

        // perf(#195): batch-load medicines used in this receipt instead of FindAsync per item (N+1)
        var medicineIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
        var medicinesMap = await _context.Medicines
            .Where(m => medicineIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id);
        EnsureValidReceiptItems(dto, medicinesMap);
        EnsureValidReceiptRates(dto);
        EnsureNotExpiredOnIntake(dto.Items.Select(i => (i.BatchNumber, i.ExpiryDate)));

        foreach (var item in dto.Items)
        {
            medicinesMap.TryGetValue(item.ItemId, out var medicine);
            var amount = item.Quantity * item.UnitPrice;
            totalAmount += amount;
            // QA-R2: VAT% / CK% typed on the v2 "Nhập từ NCC" form were silently dropped (Vat = 0,
            // FinalAmount = qty × price) → supplier payable and "Thực trả" disagreed with the invoice.
            vatTotal += Math.Round(amount * item.VatRate / 100, 2);
            discountTotal += Math.Round(amount * item.DiscountRate / 100, 2);

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
                Vat = item.VatRate, // line VAT rate (%); Amount stays pre-tax goods value
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
                VatRate = item.VatRate,
                DiscountRate = item.DiscountRate,
                Amount = amount
            });
        }

        importReceipt.TotalAmount = totalAmount;
        importReceipt.Vat = vatTotal;
        importReceipt.Discount = discountTotal;
        importReceipt.FinalAmount = totalAmount + vatTotal - discountTotal;
        _context.ImportReceipts.Add(importReceipt);
        await _context.SaveChangesAsync();
        if (codeTx != null) await codeTx.CommitAsync();

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
            VatAmount = vatTotal,
            DiscountAmount = discountTotal,
            FinalAmount = importReceipt.FinalAmount,
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
            throw new KeyNotFoundException("Stock receipt not found");
        if (receipt.Status != 0)
            throw new InvalidOperationException("Chỉ có thể cập nhật phiếu ở trạng thái Mới tạo");

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
        decimal totalAmount = 0, vatTotal = 0, discountTotal = 0;
        var items = new List<StockReceiptItemDto>();

        // perf(#195): batch-load medicines used in this receipt instead of FindAsync per item (N+1)
        var medicineIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
        var medicinesMap = await _context.Medicines
            .Where(m => medicineIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id);
        EnsureValidReceiptItems(dto, medicinesMap);
        EnsureValidReceiptRates(dto);
        if (receipt.ImportType is 1 or 2)
            EnsureNotExpiredOnIntake(dto.Items.Select(i => (i.BatchNumber, i.ExpiryDate)));

        foreach (var item in dto.Items)
        {
            medicinesMap.TryGetValue(item.ItemId, out var medicine);
            var amount = item.Quantity * item.UnitPrice;
            totalAmount += amount;
            // QA-R4: editing a pending receipt re-saved the lines with Vat = 0 and FinalAmount = goods value
            // while the header kept the OLD Vat/Discount (measured: Vat 1000 / Discount 500 / Final 10000 for a
            // 10000 + 10% − 5% receipt) → supplier payable disagreed with the invoice after any edit. Same
            // arithmetic as CreateSupplierReceiptAsync.
            vatTotal += Math.Round(amount * item.VatRate / 100, 2);
            discountTotal += Math.Round(amount * item.DiscountRate / 100, 2);

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
                Vat = item.VatRate,
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
                VatRate = item.VatRate,
                DiscountRate = item.DiscountRate,
                Amount = amount
            });
        }

        receipt.TotalAmount = totalAmount;
        receipt.Vat = vatTotal;
        receipt.Discount = discountTotal;
        receipt.FinalAmount = totalAmount + vatTotal - discountTotal;
        receipt.UpdatedAt = DateTime.Now;
        receipt.UpdatedBy = userId.ToString();

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
            VatAmount = vatTotal,
            DiscountAmount = discountTotal,
            FinalAmount = receipt.FinalAmount,
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
            throw new KeyNotFoundException("Warehouse not found");

        await using var codeTx = await SqlAppLock.BeginAsync(_context); // QA-R7: voucher-number lock scope
        var importReceipt = new ImportReceipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = await NextImportCodeAsync(codePrefix),
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

        // perf(#195): batch-load medicines used in this receipt instead of FindAsync per item (N+1)
        var medicineIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
        var medicinesMap = await _context.Medicines
            .Where(m => medicineIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id);
        EnsureValidReceiptItems(dto, medicinesMap);
        if (importType == 2) // nhập nguồn khác (viện trợ, mua lẻ...) is an intake like the supplier receipt
            EnsureNotExpiredOnIntake(dto.Items.Select(i => (i.BatchNumber, i.ExpiryDate)));

        foreach (var item in dto.Items)
        {
            medicinesMap.TryGetValue(item.ItemId, out var medicine);
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
        if (codeTx != null) await codeTx.CommitAsync();

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
            throw new KeyNotFoundException("Stock receipt not found");
        if (receipt.Status != 0)
            throw new InvalidOperationException("Receipt is not in pending status");
        // QA-R4: a receipt can wait weeks for approval — re-check intake lots at approve time.
        if (receipt.ImportType is 1 or 2)
            EnsureNotExpiredOnIntake(receipt.Details.Select(d => (d.BatchNumber, d.ExpiryDate)));

        // QA0915: the Status check above is read-then-write — measured 4 concurrent approves of a
        // 10-unit receipt → 3 succeeded and created 3 lot rows (stock 30). Claim the receipt
        // atomically (UPDATE ... WHERE Status = 0) inside a transaction; losers get 400.
        await using var transaction = await _context.Database.BeginTransactionAsync();
        var claimed = await _context.ImportReceipts
            .Where(r => r.Id == id && r.Status == 0)
            .ExecuteUpdateAsync(setters => setters.SetProperty(r => r.Status, 1));
        if (claimed == 0)
            throw new InvalidOperationException("Receipt is not in pending status");

        receipt.Status = 1; // Đã duyệt
        receipt.ApprovedBy = userId;
        receipt.ApprovedAt = DateTime.Now;

        // #195: nạp 1 lần các dòng tồn liên quan thay vì 1 query/dòng phiếu, tra theo đúng
        // khoá cũ (kho + thuốc + số lô). Dòng tồn vừa tạo cũng nạp vào bảng tra: phiếu có 2
        // dòng cùng thuốc-cùng lô giờ cộng vào MỘT dòng tồn thay vì đẻ ra hai — tổng tồn
        // không đổi, trước đây query lặp không thấy được bản chưa SaveChanges.
        var stockInMedicineIds = receipt.Details.Select(d => d.MedicineId).Distinct().ToList();
        var stockInBatches = receipt.Details.Select(d => d.BatchNumber).Distinct().ToList();
        var stockByKey = (await _context.InventoryItems
                .Where(i => i.WarehouseId == receipt.WarehouseId
                    && stockInMedicineIds.Contains(i.MedicineId)
                    && stockInBatches.Contains(i.BatchNumber))
                .ToListAsync())
            .GroupBy(i => (i.MedicineId, i.BatchNumber))
            .ToDictionary(g => g.Key, g => g.First());

        // Update inventory for each item
        foreach (var detail in receipt.Details)
        {
            stockByKey.TryGetValue((detail.MedicineId, detail.BatchNumber), out var existingStock);
            // Pre-push review: deliveries without a batch number all share the key (medicine, ""); a different
            // expiry there is a new lot, not a data-entry error — give it its own stock row.
            if (existingStock != null && string.IsNullOrWhiteSpace(detail.BatchNumber) && existingStock.Quantity > 0
                && detail.ExpiryDate.HasValue && existingStock.ExpiryDate.HasValue
                && detail.ExpiryDate.Value.Date != existingStock.ExpiryDate.Value.Date)
                existingStock = null;

            if (existingStock != null)
            {
                // QA-R6: the lot key is (medicine, batch) — a line with the same batch but another expiry was
                // folded into the old lot and its real expiry was lost (measured: HSD 2028 → shown 2026).
                // An empty lot row is just re-used for the new delivery.
                if (existingStock.Quantity <= 0 && detail.ExpiryDate.HasValue)
                {
                    existingStock.ExpiryDate = detail.ExpiryDate;
                    existingStock.ManufactureDate = detail.ManufactureDate ?? existingStock.ManufactureDate;
                }
                else if (detail.ExpiryDate.HasValue && existingStock.ExpiryDate.HasValue
                    && detail.ExpiryDate.Value.Date != existingStock.ExpiryDate.Value.Date)
                    throw new InvalidOperationException(
                        $"Lô {detail.BatchNumber ?? "(không số lô)"} đã có trong kho với hạn dùng {existingStock.ExpiryDate:dd/MM/yyyy}, "
                        + $"khác hạn dùng trên phiếu ({detail.ExpiryDate:dd/MM/yyyy}) — kiểm tra lại số lô / hạn dùng.");
                existingStock.ExpiryDate ??= detail.ExpiryDate;
                // ... and at another price it kept the old price, so stock value drifted from what was paid
                // (10 × 900 booked at 1000). Carry the lot at the weighted average cost.
                var newQty = existingStock.Quantity + detail.Quantity;
                if (newQty > 0 && detail.UnitPrice != existingStock.ImportPrice)
                {
                    var avg = Math.Round((existingStock.Quantity * existingStock.ImportPrice + detail.Quantity * detail.UnitPrice) / newQty, 4);
                    if (existingStock.UnitPrice == existingStock.ImportPrice)
                        existingStock.UnitPrice = avg;
                    existingStock.ImportPrice = avg;
                }
                existingStock.Quantity = newQty;
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
                stockByKey[(detail.MedicineId, detail.BatchNumber)] = inventoryItem;
            }
        }

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

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
            throw new KeyNotFoundException("Stock receipt not found");
        if (receipt.Status == 2)
            throw new InvalidOperationException("Phiếu nhập đã bị hủy trước đó.");
        // QA-R6: the auto receipt of a warehouse transfer could be cancelled on its own — the target lot went
        // down while the source issue stayed "Đã xuất" (measured: 20 units vanished). It follows its issue.
        if (receipt.ImportType == 3 && receipt.Note != null && receipt.Note.StartsWith("[CK:"))
            throw new InvalidOperationException(
                "Đây là phiếu nhận tự động của một phiếu chuyển kho — không hủy riêng được (phiếu xuất chuyển kho gốc vẫn đang hiệu lực).");
        // QA-R7: same for the increase receipt that "Điều chỉnh tồn" books — cancelling it alone took the counted
        // surplus back out while the stock-take stayed "Đã điều chỉnh".
        if (IsStockTakeAdjustment(receipt.ImportType, 6, receipt.Note))
            throw new InvalidOperationException(
                "Đây là phiếu nhập tự động theo điều chỉnh kiểm kê — không hủy riêng được (phiếu kiểm kê vẫn ở trạng thái đã điều chỉnh).");

        // If already approved, reverse inventory
        if (receipt.Status == 1)
        {
            // QA-R6: taking an approved receipt back takes stock OUT — it went through on a locked warehouse
            // (measured: TT_NOI locked for stock-take, lot 4 → 0).
            await EnsureWarehouseNotLockedAsync(receipt.WarehouseId);
            // #195: nạp 1 lần các dòng tồn cần trừ lại thay vì 1 query/dòng phiếu.
            var reverseMedicineIds = receipt.Details.Select(d => d.MedicineId).Distinct().ToList();
            var reverseBatches = receipt.Details.Select(d => d.BatchNumber).Distinct().ToList();
            var reverseStockByKey = (await _context.InventoryItems
                    .Where(i => i.WarehouseId == receipt.WarehouseId
                        && reverseMedicineIds.Contains(i.MedicineId)
                        && reverseBatches.Contains(i.BatchNumber))
                    .ToListAsync())
                .GroupBy(i => (i.MedicineId, i.BatchNumber))
                .ToDictionary(g => g.Key, g => g.First());

            foreach (var detail in receipt.Details)
            {
                reverseStockByKey.TryGetValue((detail.MedicineId, detail.BatchNumber), out var stock);
                // QA0915: cancelling an approved receipt whose lot was already issued drove the lot
                // negative (measured -10). Block instead — the consumed quantity must be returned first.
                var available = stock == null ? 0 : stock.Quantity - stock.ReservedQuantity;
                if (available < detail.Quantity)
                    throw new InvalidOperationException(
                        $"Không hủy được phiếu nhập: lô {detail.BatchNumber ?? "(không số lô)"} đã xuất dùng "
                        + $"(cần trừ lại {detail.Quantity:0.##}, tồn khả dụng {available:0.##}).");
                stock!.Quantity -= detail.Quantity;
            }
        }

        receipt.Status = 2; // Đã hủy
        receipt.Note = $"{receipt.Note} | Hủy: {reason}";
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Danh sách phiếu nhập. QA0915: trước đây trả rỗng cứng (và by-id trả null → 404), nên màn
    /// "Nhập kho NCC" không bao giờ thấy phiếu vừa tạo và KHÔNG có cách nào bấm Duyệt từ giao diện.
    /// Read-only, cùng khuôn với GetStockIssuesAsync.
    /// </summary>
    public async Task<PagedResultDto<StockReceiptDto>> GetStockReceiptsAsync(StockReceiptSearchDto searchDto)
    {
        var page = searchDto.Page <= 0 ? 1 : searchDto.Page;
        var pageSize = searchDto.PageSize <= 0 ? 50 : searchDto.PageSize;

        var query = _context.ImportReceipts.AsNoTracking().Where(r => !r.IsDeleted);
        if (searchDto.FromDate.HasValue)
            query = query.Where(r => r.ReceiptDate >= searchDto.FromDate.Value.Date);
        if (searchDto.ToDate.HasValue)
        {
            var toExclusive = searchDto.ToDate.Value.Date.AddDays(1);
            query = query.Where(r => r.ReceiptDate < toExclusive);
        }
        if (searchDto.WarehouseId.HasValue)
            query = query.Where(r => r.WarehouseId == searchDto.WarehouseId.Value);
        if (searchDto.ReceiptType.HasValue)
            query = query.Where(r => r.ImportType == searchDto.ReceiptType.Value);
        if (searchDto.SupplierId.HasValue)
        {
            var supplierIdText = searchDto.SupplierId.Value.ToString();
            query = query.Where(r => r.SupplierCode == supplierIdText);
        }
        if (searchDto.Status.HasValue)
            query = query.Where(r => r.Status == searchDto.Status.Value);
        if (!string.IsNullOrWhiteSpace(searchDto.Keyword))
        {
            var kw = searchDto.Keyword.Trim();
            query = query.Where(r => r.ReceiptCode.Contains(kw)
                || (r.InvoiceNumber != null && r.InvoiceNumber.Contains(kw))
                || (r.SupplierName != null && r.SupplierName.Contains(kw))
                || (r.Note != null && r.Note.Contains(kw)));
        }

        var total = await query.CountAsync();
        var receipts = await query
            .OrderByDescending(r => r.ReceiptDate).ThenByDescending(r => r.CreatedAt)
            .Skip(Math.Max(0, page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        var items = new List<StockReceiptDto>();
        foreach (var r in receipts)
            items.Add(await MapImportReceiptAsync(r, includeItems: false));

        return new PagedResultDto<StockReceiptDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<StockReceiptDto?> GetStockReceiptByIdAsync(Guid id)
    {
        var receipt = await _context.ImportReceipts.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
        return receipt == null ? null : await MapImportReceiptAsync(receipt, includeItems: true);
    }

    /// <summary>ImportReceipt → StockReceiptDto. SupplierCode lưu SupplierId dạng chuỗi (xem CreateSupplierReceiptAsync).</summary>
    private async Task<StockReceiptDto> MapImportReceiptAsync(ImportReceipt r, bool includeItems)
    {
        var warehouseName = await _context.Warehouses.AsNoTracking()
            .Where(w => w.Id == r.WarehouseId).Select(w => w.WarehouseName).FirstOrDefaultAsync();

        Guid? supplierId = Guid.TryParse(r.SupplierCode, out var sid) ? sid : null;
        var supplierName = r.SupplierName;
        if (supplierName == null && !string.IsNullOrEmpty(r.SupplierCode))
            supplierName = await _context.Suppliers.AsNoTracking()
                .Where(s => (supplierId.HasValue && s.Id == supplierId.Value) || s.SupplierCode == r.SupplierCode)
                .Select(s => s.SupplierName).FirstOrDefaultAsync();

        var dto = new StockReceiptDto
        {
            Id = r.Id,
            ReceiptCode = r.ReceiptCode,
            ReceiptDate = r.ReceiptDate,
            WarehouseId = r.WarehouseId,
            WarehouseName = warehouseName ?? string.Empty,
            ReceiptType = r.ImportType,
            SupplierId = supplierId,
            SupplierName = supplierName,
            InvoiceNumber = r.InvoiceNumber,
            InvoiceDate = r.InvoiceDate,
            TotalAmount = r.TotalAmount,
            VatAmount = r.Vat,
            DiscountAmount = r.Discount,
            FinalAmount = r.FinalAmount,
            Status = r.Status,
            ApprovedBy = r.ApprovedBy,
            ApprovedAt = r.ApprovedAt,
            CreatedAt = r.CreatedAt,
            Notes = r.Note,
        };

        if (Guid.TryParse(r.CreatedBy, out var creatorId))
        {
            dto.CreatedBy = creatorId;
            dto.CreatedByName = await _context.Users.AsNoTracking()
                .Where(u => u.Id == creatorId).Select(u => u.FullName).FirstOrDefaultAsync() ?? string.Empty;
        }
        if (r.ApprovedBy.HasValue)
            dto.ApprovedByName = await _context.Users.AsNoTracking()
                .Where(u => u.Id == r.ApprovedBy.Value).Select(u => u.FullName).FirstOrDefaultAsync();

        if (!includeItems) return dto;

        var details = await _context.ImportReceiptDetails.AsNoTracking()
            .Where(d => d.ImportReceiptId == r.Id && !d.IsDeleted).ToListAsync();
        var medicineIds = details.Where(d => d.MedicineId.HasValue).Select(d => d.MedicineId!.Value).Distinct().ToList();
        var medicines = await _context.Medicines.AsNoTracking()
            .Where(m => medicineIds.Contains(m.Id))
            .Select(m => new { m.Id, m.MedicineCode, m.MedicineName, m.Unit })
            .ToListAsync();

        dto.Items = details.Select(d =>
        {
            var med = medicines.FirstOrDefault(m => m.Id == d.MedicineId);
            return new StockReceiptItemDto
            {
                Id = d.Id,
                StockReceiptId = r.Id,
                ItemId = d.MedicineId ?? d.SupplyId ?? Guid.Empty,
                ItemCode = med?.MedicineCode ?? string.Empty,
                ItemName = med?.MedicineName ?? string.Empty,
                ItemType = d.MedicineId.HasValue ? 1 : 2,
                Unit = d.Unit ?? med?.Unit ?? string.Empty,
                BatchNumber = d.BatchNumber,
                ManufactureDate = d.ManufactureDate,
                ExpiryDate = d.ExpiryDate,
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                VatRate = d.Vat,
                Amount = d.Amount
            };
        }).ToList();

        return dto;
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
                // QA0915: CreateSupplierReceiptAsync stores the supplier GUID (string) in SupplierCode, so
                // matching only the catalog code filtered every receipt out. Accept both forms.
                var idText = supplierId.Value.ToString();
                receiptsQuery = receiptsQuery.Where(r => r.SupplierCode == idText || (filterCode != null && r.SupplierCode == filterCode));
            }

            var receipts = await receiptsQuery
                .Select(r => new { r.SupplierCode, r.SupplierName, r.FinalAmount })
                .ToListAsync();

            var supplierMap = await _context.Suppliers
                .Where(s => s.IsActive)
                .Select(s => new { s.Id, s.SupplierCode, s.SupplierName })
                .ToListAsync();

            // QA-R6: goods sent back to the supplier ("Xuất trả NCC", ExportType 5) never reduced the payable —
            // measured: returned 10 × 1,000 and the debt stayed 173,000.
            var returnsBySupplier = await _context.ExportReceipts
                .Where(e => !e.IsDeleted && e.ExportType == 5 && e.Status == 1 && e.SupplierId != null
                    && (!supplierId.HasValue || e.SupplierId == supplierId.Value))
                .GroupBy(e => e.SupplierId!.Value)
                .Select(g => new { SupplierId = g.Key, Amount = g.Sum(e => e.TotalAmount) })
                .ToDictionaryAsync(x => x.SupplierId, x => x.Amount);
            var returnsApplied = new HashSet<Guid>();

            return receipts
                .GroupBy(r => r.SupplierCode!)
                .Select(g =>
                {
                    var sup = supplierMap.FirstOrDefault(s => s.SupplierCode == g.Key || s.Id.ToString() == g.Key);
                    var total = g.Sum(x => x.FinalAmount);
                    // A supplier can own two groups (GUID text + catalog code) — subtract its returns once.
                    var returned = sup != null && returnsApplied.Add(sup.Id)
                        && returnsBySupplier.TryGetValue(sup.Id, out var ret) ? ret : 0m;
                    return new SupplierPayableDto
                    {
                        SupplierId = sup?.Id ?? Guid.Empty,
                        SupplierCode = g.Key,
                        SupplierName = sup?.SupplierName ?? g.First().SupplierName ?? "",
                        TotalReceiptAmount = total - returned,
                        PaidAmount = 0,
                        RemainingAmount = total - returned,
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

    public Task<SupplierPaymentDto> CreateSupplierPaymentAsync(SupplierPaymentDto dto, Guid userId)
    {
        // QA-R7: this returned success with a fresh Id but wrote nothing (there is no supplier-payment table), so a
        // payment "recorded" here never reduced the payable. Refuse honestly until the ledger exists.
        throw new NotSupportedException(
            "Chưa hỗ trợ ghi nhận thanh toán nhà cung cấp trên hệ thống (chưa có sổ thanh toán NCC).");
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
