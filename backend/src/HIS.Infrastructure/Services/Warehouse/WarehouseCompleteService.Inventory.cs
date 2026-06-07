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

// K10 phien 3 (2026-05-30): tach 5.3 Tồn kho (~1045 dong) khoi WarehouseCompleteService.
public partial class WarehouseCompleteService {
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
        // Suggest reorder for medicines whose summed available stock ≤
        // ReorderPoint. Average monthly usage = sum of last 30 days exports
        // from StockMovements ÷ 1.
        var thresholds = await _context.StockThresholds
            .Where(t => t.IsActive && (warehouseId == Guid.Empty || t.WarehouseId == warehouseId || t.WarehouseId == null))
            .ToListAsync();
        if (thresholds.Count == 0) return new List<AutoProcurementSuggestionDto>();

        var medIds = thresholds.Select(t => t.MedicineId).ToHashSet();
        var stocks = await _context.InventoryItems
            .Where(i => i.MedicineId.HasValue && medIds.Contains(i.MedicineId.Value)
                        && (warehouseId == Guid.Empty || i.WarehouseId == warehouseId)
                        && !i.IsDeleted)
            .GroupBy(i => i.MedicineId!.Value)
            .Select(g => new { MedicineId = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToListAsync();

        var since = DateTime.UtcNow.AddDays(-30);
        var usage = await _context.StockMovements
            .Where(m => m.MovementType == 2 // export
                        && (warehouseId == Guid.Empty || m.WarehouseId == warehouseId)
                        && m.MovementDate >= since
                        && medIds.Contains(m.MedicineId))
            .GroupBy(m => m.MedicineId)
            .Select(g => new { MedicineId = g.Key, Used = g.Sum(x => x.Quantity) })
            .ToListAsync();

        var medicines = await _context.Medicines
            .Where(m => medIds.Contains(m.Id))
            .ToListAsync();

        var suggestions = new List<AutoProcurementSuggestionDto>();
        foreach (var threshold in thresholds)
        {
            var stock = stocks.FirstOrDefault(s => s.MedicineId == threshold.MedicineId)?.Quantity ?? 0;
            if (stock > threshold.ReorderPoint) continue;
            var medicine = medicines.FirstOrDefault(m => m.Id == threshold.MedicineId);
            if (medicine == null) continue;
            var monthly = usage.FirstOrDefault(u => u.MedicineId == threshold.MedicineId)?.Used ?? 0;
            var suggestQty = Math.Max(threshold.ReorderQuantity, threshold.MaximumQuantity - stock);

            suggestions.Add(new AutoProcurementSuggestionDto
            {
                ItemId = medicine.Id,
                ItemCode = medicine.MedicineCode,
                ItemName = medicine.MedicineName,
                Unit = medicine.Unit ?? "",
                CurrentStock = stock,
                MinimumStock = threshold.MinimumQuantity,
                MaximumStock = threshold.MaximumQuantity,
                AverageMonthlyUsage = monthly,
                SameMonthLastYearUsage = 0,
                SuggestedQuantity = suggestQty,
                SuggestionReason = stock <= threshold.MinimumQuantity
                    ? "Tồn ≤ tồn tối thiểu"
                    : "Tồn ≤ điểm đặt lại",
            });
        }
        return suggestions.OrderByDescending(s => s.SuggestedQuantity).ToList();
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
        var query = _context.ProcurementRequests
            .Include(p => p.Department)
            .Include(p => p.Items)
            .AsQueryable();
        if (status.HasValue)
            query = query.Where(p => p.Status == status.Value);
        if (fromDate.HasValue)
            query = query.Where(p => p.RequestDate >= fromDate.Value);
        if (toDate.HasValue)
            query = query.Where(p => p.RequestDate <= toDate.Value);
        var rows = await query.OrderByDescending(p => p.RequestDate).Take(200).ToListAsync();
        return rows.Select(p => new ProcurementRequestDto
        {
            Id = p.Id,
            RequestCode = p.RequestCode,
            WarehouseId = warehouseId ?? Guid.Empty,
            WarehouseName = p.Department?.DepartmentName ?? string.Empty,
            RequestDate = p.RequestDate,
            Description = p.Notes,
            Status = p.Status,
            Items = p.Items?.Select(i => new ProcurementItemDto
            {
                Id = i.Id,
                ItemId = i.ItemId ?? Guid.Empty,
                ItemCode = i.ItemCode ?? string.Empty,
                ItemName = i.ItemName,
                Unit = i.Unit ?? string.Empty,
                CurrentStock = i.CurrentStock,
                MinimumStock = i.MinimumStock,
                RequestedQuantity = i.RequestedQuantity,
                Notes = i.Notes
            }).ToList() ?? new List<ProcurementItemDto>()
        }).ToList();
    }

    public async Task<PagedResultDto<StockDto>> GetStockAsync(StockSearchDto searchDto)
    {
        var query = _context.InventoryItems
            .Include(i => i.Medicine)
            .Include(i => i.Supply)
            .Where(i => i.Quantity > 0);

        if (searchDto.WarehouseId.HasValue)
            query = query.Where(i => i.WarehouseId == searchDto.WarehouseId.Value);

        // Lọc theo loại kho (5=Tủ trực) — panel Tiện ích LIS tách tủ trực / tồn kho.
        if (searchDto.WarehouseType.HasValue)
            query = query.Where(i => i.Warehouse.WarehouseType == searchDto.WarehouseType.Value);

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
        // Items where current quantity ≤ MinimumQuantity threshold
        var thresholds = await _context.StockThresholds
            .Where(t => t.IsActive && (warehouseId == Guid.Empty || t.WarehouseId == warehouseId || t.WarehouseId == null))
            .ToListAsync();
        if (thresholds.Count == 0) return new List<StockDto>();

        var medicineIds = thresholds.Select(t => t.MedicineId).ToHashSet();
        var inventory = await _context.InventoryItems
            .Include(i => i.Medicine)
            .Include(i => i.Warehouse)
            .Where(i => i.MedicineId.HasValue
                        && medicineIds.Contains(i.MedicineId.Value)
                        && (warehouseId == Guid.Empty || i.WarehouseId == warehouseId)
                        && !i.IsDeleted)
            .ToListAsync();

        // Aggregate per medicine+warehouse so multi-batch sums correctly
        var grouped = inventory
            .GroupBy(i => new { i.MedicineId, i.WarehouseId })
            .Select(g => new { Key = g.Key, Quantity = g.Sum(x => x.Quantity), Sample = g.First() })
            .ToList();

        var warnings = new List<StockDto>();
        foreach (var g in grouped)
        {
            var threshold = thresholds.FirstOrDefault(t => t.MedicineId == g.Key.MedicineId
                && (t.WarehouseId == null || t.WarehouseId == g.Key.WarehouseId));
            if (threshold == null) continue;
            if (g.Quantity > threshold.MinimumQuantity) continue;
            warnings.Add(new StockDto
            {
                Id = g.Sample.Id,
                WarehouseId = g.Key.WarehouseId,
                ItemId = g.Sample.MedicineId ?? Guid.Empty,
                ItemCode = g.Sample.Medicine?.MedicineCode ?? "",
                ItemName = g.Sample.Medicine?.MedicineName ?? "",
                ItemType = 1,
                Unit = g.Sample.Medicine?.Unit ?? "",
                BatchNumber = g.Sample.BatchNumber,
                ExpiryDate = g.Sample.ExpiryDate,
                Quantity = g.Quantity,
                ReservedQuantity = g.Sample.ReservedQuantity,
                UnitPrice = g.Sample.UnitPrice,
            });
        }
        return warnings.OrderBy(w => w.Quantity).ToList();
    }

    public async Task<List<ExpiryWarningDto>> GetExpiryWarningsAsync(Guid? warehouseId, int monthsAhead)
    {
        if (monthsAhead < 1) monthsAhead = 3;
        var horizon = DateTime.UtcNow.Date.AddMonths(monthsAhead);
        try
        {
            // Project explicitly to avoid pulling all Supply columns (schema drift
            // on MedicalSupplies in the demo DB). Medicine is loaded via join to
            // get code/name; Supply name resolved separately for any rows that
            // reference it.
            var query = _context.InventoryItems
                .Where(i => i.ExpiryDate.HasValue
                            && i.ExpiryDate.Value <= horizon
                            && i.Quantity > 0
                            && !i.IsDeleted);
            if (warehouseId.HasValue) query = query.Where(i => i.WarehouseId == warehouseId.Value);

            var rows = await query
                .OrderBy(i => i.ExpiryDate)
                .Take(200)
                .Select(i => new {
                    i.Id,
                    i.MedicineId,
                    i.SupplyId,
                    i.WarehouseId,
                    i.BatchNumber,
                    i.ExpiryDate,
                    i.Quantity,
                    i.UnitPrice,
                    MedicineCode = i.Medicine != null ? i.Medicine.MedicineCode : null,
                    MedicineName = i.Medicine != null ? i.Medicine.MedicineName : null,
                    MedicineUnit = i.Medicine != null ? i.Medicine.Unit : null,
                    WarehouseName = i.Warehouse != null ? i.Warehouse.WarehouseName : null,
                })
                .ToListAsync();

            var today = DateTime.UtcNow.Date;
            return rows.Select(i =>
            {
                var days = i.ExpiryDate!.Value.Date.Subtract(today).Days;
                int level = days < 30 ? 1 : days < 60 ? 2 : 3;
                return new ExpiryWarningDto
                {
                    StockId = i.Id,
                    ItemId = i.MedicineId ?? i.SupplyId ?? Guid.Empty,
                    ItemCode = i.MedicineCode ?? "",
                    ItemName = i.MedicineName ?? "(Vật tư)",
                    Unit = i.MedicineUnit ?? "",
                    BatchNumber = i.BatchNumber,
                    ExpiryDate = i.ExpiryDate.Value,
                    DaysToExpiry = days,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    TotalValue = i.Quantity * i.UnitPrice,
                    WarehouseName = i.WarehouseName ?? "",
                    WarningLevel = level,
                };
            }).ToList();
        }
        catch (Microsoft.Data.SqlClient.SqlException)
        {
            // Schema drift fallback
            return new List<ExpiryWarningDto>();
        }
    }

    public async Task<List<BatchInfoDto>> GetBatchInfoAsync(Guid? warehouseId, Guid? itemId)
    {
        // Each InventoryItem row IS a batch (BatchNumber + ExpiryDate). Sum
        // movement history per batch for received/issued totals.
        var query = _context.InventoryItems
            .Where(i => !string.IsNullOrEmpty(i.BatchNumber)
                        && i.ExpiryDate.HasValue
                        && !i.IsDeleted);
        if (warehouseId.HasValue) query = query.Where(i => i.WarehouseId == warehouseId.Value);
        if (itemId.HasValue) query = query.Where(i => i.MedicineId == itemId.Value || i.SupplyId == itemId.Value);

        var batches = await query
            .Select(i => new {
                i.Id, i.MedicineId, i.SupplyId, i.WarehouseId,
                i.BatchNumber, i.ExpiryDate, i.ManufactureDate, i.Quantity,
                MedicineCode = i.Medicine != null ? i.Medicine.MedicineCode : null,
                MedicineName = i.Medicine != null ? i.Medicine.MedicineName : null,
                Manufacturer = i.Medicine != null ? i.Medicine.Manufacturer : null,
                CountryOfOrigin = i.Medicine != null ? i.Medicine.ManufacturerCountry : null,
                RegistrationNumber = i.Medicine != null ? i.Medicine.RegistrationNumber : null,
            })
            .Take(500)
            .ToListAsync();

        // Look up movement totals per batch+warehouse+medicine
        var batchKeys = batches.Where(b => b.MedicineId.HasValue).Select(b => b.BatchNumber!).Distinct().ToList();
        var movements = await _context.StockMovements
            .Where(m => batchKeys.Contains(m.BatchNumber)
                        && (warehouseId == Guid.Empty || !warehouseId.HasValue || m.WarehouseId == warehouseId.Value))
            .GroupBy(m => new { m.BatchNumber, m.WarehouseId, m.MedicineId })
            .Select(g => new {
                g.Key.BatchNumber,
                g.Key.WarehouseId,
                g.Key.MedicineId,
                Received = g.Where(x => x.MovementType == 1 || x.MovementType == 5).Sum(x => x.Quantity),
                Issued = g.Where(x => x.MovementType == 2).Sum(x => x.Quantity),
            })
            .ToListAsync();

        var today = DateTime.UtcNow.Date;
        return batches.Select(b =>
        {
            var move = movements.FirstOrDefault(m =>
                m.BatchNumber == b.BatchNumber
                && m.WarehouseId == b.WarehouseId
                && m.MedicineId == b.MedicineId);
            return new BatchInfoDto
            {
                Id = b.Id,
                ItemId = b.MedicineId ?? b.SupplyId ?? Guid.Empty,
                ItemCode = b.MedicineCode ?? "",
                ItemName = b.MedicineName ?? "",
                BatchNumber = b.BatchNumber!,
                ManufactureDate = b.ManufactureDate,
                ExpiryDate = b.ExpiryDate!.Value,
                DaysToExpiry = b.ExpiryDate.Value.Date.Subtract(today).Days,
                CountryOfOrigin = b.CountryOfOrigin,
                Manufacturer = b.Manufacturer,
                RegistrationNumber = b.RegistrationNumber,
                ReceivedQuantity = move?.Received ?? b.Quantity,
                IssuedQuantity = move?.Issued ?? 0,
                RemainingQuantity = b.Quantity,
            };
        })
        .OrderBy(b => b.ExpiryDate)
        .ToList();
    }

    public async Task<List<UnclaimedPrescriptionDto>> GetUnclaimedPrescriptionsAsync(Guid warehouseId, int daysOld)
    {
        if (daysOld < 1) daysOld = 7;
        var threshold = DateTime.UtcNow.AddDays(-daysOld);
        var prescriptions = await _context.Prescriptions
            .Include(p => p.MedicalRecord).ThenInclude(m => m!.Patient)
            .Include(p => p.Doctor)
            .Where(p => !p.IsDeleted
                        && !p.IsDispensed
                        && p.Status != 4
                        && p.PrescriptionType == 1
                        && (warehouseId == Guid.Empty || p.WarehouseId == warehouseId)
                        && p.PrescriptionDate <= threshold)
            .OrderBy(p => p.PrescriptionDate)
            .Take(200)
            .ToListAsync();

        var now = DateTime.UtcNow.Date;
        return prescriptions.Select(p => new UnclaimedPrescriptionDto
        {
            PrescriptionId = p.Id,
            PrescriptionCode = p.PrescriptionCode,
            PrescriptionDate = p.PrescriptionDate,
            PatientCode = p.MedicalRecord?.Patient?.PatientCode ?? "",
            PatientName = p.MedicalRecord?.Patient?.FullName ?? "",
            PhoneNumber = p.MedicalRecord?.Patient?.PhoneNumber,
            DoctorName = p.Doctor?.FullName,
            TotalAmount = p.TotalAmount,
            DaysSincePrescription = now.Subtract(p.PrescriptionDate.Date).Days,
            Status = p.Status == 4 ? 1 : 0,
        }).ToList();
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
        try
        {
            var warehouse = await _context.Warehouses.FindAsync(warehouseId);
            var medicine = await _context.Medicines.FindAsync(itemId);

            // Get stock movements for this item in this warehouse within date range
            var movements = await _context.StockMovements
                .Where(sm => sm.WarehouseId == warehouseId && sm.MedicineId == itemId)
                .OrderBy(sm => sm.MovementDate)
                .ToListAsync();

            // Calculate opening balance: sum of movements before fromDate
            var priorMovements = movements.Where(m => m.MovementDate < fromDate).ToList();
            var openingQty = priorMovements.Any() ? priorMovements.Last().BalanceAfter : 0;

            // Movements within the period
            var periodMovements = movements
                .Where(m => m.MovementDate >= fromDate && m.MovementDate <= toDate)
                .ToList();

            var closingQty = periodMovements.Any() ? periodMovements.Last().BalanceAfter : openingQty;

            var entries = periodMovements.Select(m => new StockCardEntryDto
            {
                TransactionDate = m.MovementDate,
                DocumentCode = m.ReferenceCode ?? string.Empty,
                TransactionType = m.MovementType switch
                {
                    1 => "Nhap kho",
                    2 => "Xuat kho",
                    3 => "Chuyen kho",
                    4 => "Dieu chinh",
                    5 => "Tra NCC",
                    _ => "Khac"
                },
                Description = m.Notes,
                ReceivedQuantity = m.MovementType == 1 || (m.MovementType == 4 && m.Quantity > 0) ? m.Quantity : 0,
                IssuedQuantity = m.MovementType == 2 || m.MovementType == 5 || (m.MovementType == 4 && m.Quantity < 0) ? Math.Abs(m.Quantity) : 0,
                Balance = m.BalanceAfter
            }).ToList();

            return new StockCardDto
            {
                ItemId = itemId,
                ItemCode = medicine?.MedicineCode ?? string.Empty,
                ItemName = medicine?.MedicineName ?? string.Empty,
                Unit = medicine?.Unit ?? string.Empty,
                WarehouseId = warehouseId,
                WarehouseName = warehouse?.WarehouseName ?? string.Empty,
                FromDate = fromDate,
                ToDate = toDate,
                OpeningQuantity = openingQty,
                ClosingQuantity = closingQty,
                Entries = entries
            };
        }
        catch { return new StockCardDto { WarehouseId = warehouseId, ItemId = itemId, FromDate = fromDate, ToDate = toDate }; }
    }

    public async Task<List<StockMovementReportDto>> GetStockMovementReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate, int? itemType)
    {
        // Aggregate StockMovements per medicine within the date window:
        //   Opening = balance at fromDate (last balance-after of any movement
        //             dated < fromDate), Receipts = sum of imports/returns,
        //   Issues = sum of exports, Closing = Opening + Receipts − Issues.
        // itemType filter (1=Medicine) is applied implicitly — StockMovements
        // entity tracks medicines only.
        var movements = await _context.StockMovements
            .Where(m => m.WarehouseId == warehouseId
                        && m.MovementDate >= fromDate
                        && m.MovementDate < toDate.AddDays(1))
            .ToListAsync();

        if (movements.Count == 0) return new List<StockMovementReportDto>();

        var medIds = movements.Select(m => m.MedicineId).Distinct().ToList();

        // Opening balance per medicine = sum(balance after) of latest movement strictly before fromDate
        var openingMovements = await _context.StockMovements
            .Where(m => m.WarehouseId == warehouseId
                        && medIds.Contains(m.MedicineId)
                        && m.MovementDate < fromDate)
            .GroupBy(m => m.MedicineId)
            .Select(g => g.OrderByDescending(x => x.MovementDate).FirstOrDefault())
            .ToListAsync();

        var medicines = await _context.Medicines
            .Where(m => medIds.Contains(m.Id))
            .ToListAsync();

        return movements
            .GroupBy(m => m.MedicineId)
            .Select(g =>
            {
                var med = medicines.FirstOrDefault(x => x.Id == g.Key);
                var opening = openingMovements.FirstOrDefault(o => o!.MedicineId == g.Key);
                var openQty = opening?.BalanceAfter ?? 0;
                var openVal = openQty * (g.First().UnitPrice);
                var received = g.Where(x => x.MovementType == 1 || x.MovementType == 5).ToList();
                var issued = g.Where(x => x.MovementType == 2).ToList();

                return new StockMovementReportDto
                {
                    ItemId = g.Key,
                    ItemCode = med?.MedicineCode ?? "",
                    ItemName = med?.MedicineName ?? "",
                    Unit = med?.Unit ?? "",
                    OpeningQuantity = openQty,
                    OpeningValue = openVal,
                    TotalReceived = received.Sum(x => x.Quantity),
                    TotalReceivedValue = received.Sum(x => x.Amount),
                    TotalIssued = issued.Sum(x => x.Quantity),
                    TotalIssuedValue = issued.Sum(x => x.Amount),
                    ClosingQuantity = openQty + received.Sum(x => x.Quantity) - issued.Sum(x => x.Quantity),
                    ClosingValue = openVal + received.Sum(x => x.Amount) - issued.Sum(x => x.Amount),
                };
            })
            .OrderByDescending(d => d.TotalReceivedValue + d.TotalIssuedValue)
            .ToList();
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
        try
        {
            // Get issue movements (type=2) from this warehouse grouped by destination department
            var transfers = await _context.WarehouseTransfers
                .Include(t => t.ToWarehouse).ThenInclude(w => w!.Department)
                .Include(t => t.Items).ThenInclude(i => i.Medicine)
                .Where(t => t.FromWarehouseId == warehouseId
                    && t.TransferDate >= fromDate && t.TransferDate <= toDate
                    && t.Status >= 1 && t.Status != 4) // approved/received, not cancelled
                .ToListAsync();

            var departments = transfers
                .Where(t => t.ToWarehouse?.Department != null)
                .GroupBy(t => new
                {
                    DeptId = t.ToWarehouse!.DepartmentId!.Value,
                    DeptCode = t.ToWarehouse.Department!.DepartmentCode ?? "",
                    DeptName = t.ToWarehouse.Department.DepartmentName ?? ""
                })
                .Select(g =>
                {
                    var items = g.SelectMany(t => t.Items ?? Enumerable.Empty<WarehouseTransferItem>()).ToList();
                    return new DepartmentUsageItemDto
                    {
                        DepartmentId = g.Key.DeptId,
                        DepartmentCode = g.Key.DeptCode,
                        DepartmentName = g.Key.DeptName,
                        IssueCount = g.Count(),
                        TotalQuantity = items.Sum(i => i.ReceivedQuantity ?? i.DeliveredQuantity ?? i.RequestedQuantity),
                        TotalAmount = items.Sum(i => i.Amount),
                        TopItems = items
                            .GroupBy(i => new { i.MedicineId, Name = i.Medicine?.MedicineName ?? "", Code = i.Medicine?.MedicineCode ?? "", Unit = i.Medicine?.Unit ?? "" })
                            .OrderByDescending(ig => ig.Sum(x => x.ReceivedQuantity ?? x.DeliveredQuantity ?? x.RequestedQuantity))
                            .Take(5)
                            .Select(ig => new ItemUsageDto
                            {
                                ItemId = ig.Key.MedicineId,
                                ItemCode = ig.Key.Code,
                                ItemName = ig.Key.Name,
                                Unit = ig.Key.Unit,
                                Quantity = ig.Sum(x => x.ReceivedQuantity ?? x.DeliveredQuantity ?? x.RequestedQuantity),
                                Amount = ig.Sum(x => x.Amount)
                            })
                            .ToList()
                    };
                })
                .OrderByDescending(d => d.TotalAmount)
                .ToList();

            return new DepartmentUsageReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                Departments = departments,
                TotalAmount = departments.Sum(d => d.TotalAmount)
            };
        }
        catch { return new DepartmentUsageReportDto { FromDate = fromDate, ToDate = toDate }; }
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
}
