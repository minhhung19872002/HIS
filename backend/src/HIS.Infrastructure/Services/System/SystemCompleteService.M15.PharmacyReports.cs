using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K2 phien 4 (2026-05-30): tach Module 15 (Bao cao Duoc, 17 chuc nang, ~951 dong) khoi
// SystemCompleteService.cs god-file. ZERO runtime change — partial class.
public partial class SystemCompleteService
{
    #region Module 15: Bao cao Duoc - 17 chuc nang

    // QA-R3: the controlled-drug registers read StockMovements, a table no stock flow writes (0 rows) — every
    // register (gây nghiện / hướng thần / tiền chất) came back empty although the drugs are stocked and dispensed.
    // They are now built from the real stock documents: non-cancelled import receipts (in), non-cancelled export
    // receipts + completed retail sales (out), and the live lot quantities (closing stock today). Opening and
    // closing for the period are derived backwards from today's stock, so a register for a past month is right.
    private sealed record ControlledDrugMove(Guid MedicineId, DateTime Date, bool IsIn, decimal Quantity,
        string DocumentCode, string? LotNumber, string? Unit, string Recipient);

    private sealed record ControlledDrugLedger(
        Dictionary<Guid, Medicine> Medicines,
        Dictionary<Guid, decimal> StockNow,
        List<ControlledDrugMove> Moves);

    private async Task<ControlledDrugLedger> LoadControlledDrugLedgerAsync(
        DateTime fromDate, Guid? warehouseId,
        System.Linq.Expressions.Expression<Func<Medicine, bool>> drugFilter)
    {
        var medicines = await _context.Medicines.AsNoTracking()
            .Where(drugFilter)
            .Where(m => m.IsActive && !m.IsDeleted)
            .ToDictionaryAsync(m => m.Id);
        var ids = medicines.Keys.ToList();
        if (ids.Count == 0)
            return new ControlledDrugLedger(medicines, new Dictionary<Guid, decimal>(), new List<ControlledDrugMove>());

        var from = fromDate.Date;
        var stockNow = await _context.InventoryItems.AsNoTracking()
            .Where(i => i.MedicineId != null && ids.Contains(i.MedicineId.Value) && !i.IsDeleted
                && (warehouseId == null || i.WarehouseId == warehouseId))
            .GroupBy(i => i.MedicineId!.Value)
            .Select(g => new { g.Key, Qty = g.Sum(i => i.Quantity) })
            .ToDictionaryAsync(x => x.Key, x => x.Qty);

        var imports = await _context.ImportReceiptDetails.AsNoTracking()
            .Where(d => d.MedicineId != null && ids.Contains(d.MedicineId.Value) && !d.IsDeleted
                && !d.ImportReceipt.IsDeleted && d.ImportReceipt.Status != 2
                && d.ImportReceipt.ReceiptDate >= from
                && (warehouseId == null || d.ImportReceipt.WarehouseId == warehouseId))
            .Select(d => new ControlledDrugMove(d.MedicineId!.Value, d.ImportReceipt.ReceiptDate, true, d.Quantity,
                d.ImportReceipt.ReceiptCode, d.BatchNumber, d.Unit, d.ImportReceipt.SupplierName ?? ""))
            .ToListAsync();

        var exports = await _context.ExportReceiptDetails.AsNoTracking()
            .Where(d => d.MedicineId != null && ids.Contains(d.MedicineId.Value) && !d.IsDeleted
                && !d.ExportReceipt.IsDeleted && d.ExportReceipt.Status != 2
                && d.ExportReceipt.ReceiptDate >= from
                && (warehouseId == null || d.ExportReceipt.WarehouseId == warehouseId))
            .Select(d => new ControlledDrugMove(d.MedicineId!.Value, d.ExportReceipt.ReceiptDate, false, d.Quantity,
                d.ExportReceipt.ReceiptCode, d.BatchNumber, d.Unit,
                d.ExportReceipt.ExportType == 1 ? "BN ngoại trú" : d.ExportReceipt.ExportType == 2 ? "BN nội trú" : "Xuất kho"))
            .ToListAsync();

        // Retail sale timestamps are UTC (CreatedAt) — compare on the VN day.
        var fromUtc = HIS.Core.Common.VnTime.DayRangeUtc(from).FromUtc;
        var sales = await _context.RetailSaleItems.AsNoTracking()
            .Where(i => ids.Contains(i.MedicineId) && !i.IsDeleted
                && !i.RetailSale!.IsDeleted && i.RetailSale!.Status != "Cancelled"
                && i.RetailSale!.CreatedAt >= fromUtc
                && (warehouseId == null || i.WarehouseId == warehouseId))
            .Select(i => new { i.MedicineId, i.RetailSale!.CreatedAt, i.Quantity, i.RetailSale!.SaleCode, i.BatchNumber, i.Unit })
            .ToListAsync();
        var moves = imports.Concat(exports)
            .Concat(sales.Select(s => new ControlledDrugMove(s.MedicineId, s.CreatedAt.AddHours(7), false, s.Quantity,
                s.SaleCode, s.BatchNumber, s.Unit, "Bán lẻ nhà thuốc")))
            .ToList();
        return new ControlledDrugLedger(medicines, stockNow, moves);
    }

    /// <summary>Per medicine: opening/in/out/closing for [fromDate, toDate] (toDate inclusive calendar day).</summary>
    private static List<(Medicine Medicine, decimal Opening, decimal In, decimal Out, decimal Closing)> SummarizeControlledDrugs(
        ControlledDrugLedger ledger, DateTime fromDate, DateTime toDate)
    {
        var toEnd = toDate.Date.AddDays(1);
        return ledger.Medicines.Values
            .OrderBy(m => m.MedicineName)
            .Select(m =>
            {
                var mine = ledger.Moves.Where(x => x.MedicineId == m.Id).ToList();
                var inAfter = mine.Where(x => x.IsIn && x.Date >= toEnd).Sum(x => x.Quantity);
                var outAfter = mine.Where(x => !x.IsIn && x.Date >= toEnd).Sum(x => x.Quantity);
                var inPeriod = mine.Where(x => x.IsIn && x.Date < toEnd).Sum(x => x.Quantity);
                var outPeriod = mine.Where(x => !x.IsIn && x.Date < toEnd).Sum(x => x.Quantity);
                var closing = ledger.StockNow.GetValueOrDefault(m.Id) - inAfter + outAfter;
                var opening = closing - inPeriod + outPeriod;
                return (m, opening, inPeriod, outPeriod, closing);
            })
            .ToList();
    }

    // 15.1 So thuoc gay nghien
    public async Task<List<NarcoticDrugRegisterDto>> GetNarcoticDrugRegisterAsync(
        DateTime fromDate, DateTime toDate, Guid? warehouseId = null)
    {
        try
        {
            var ledger = await LoadControlledDrugLedgerAsync(fromDate, warehouseId, m => m.IsNarcotic);
            var toEnd = toDate.Date.AddDays(1);
            var items = new List<NarcoticDrugRegisterItemDto>();
            var rowNum = 0;
            foreach (var s in SummarizeControlledDrugs(ledger, fromDate, toDate))
            {
                // Opening line, then each document of the period with a running balance.
                var balance = s.Opening;
                items.Add(new NarcoticDrugRegisterItemDto
                {
                    RowNumber = ++rowNum, TransactionDate = fromDate.Date, TransactionType = "Opening", DocumentCode = "",
                    MedicineCode = s.Medicine.MedicineCode, MedicineName = s.Medicine.MedicineName, LotNumber = "",
                    Unit = s.Medicine.Unit ?? "", ImportQuantity = 0, ExportQuantity = 0, Balance = balance,
                    RecipientInfo = "", Note = "Tồn đầu kỳ"
                });
                foreach (var mv in ledger.Moves
                    .Where(x => x.MedicineId == s.Medicine.Id && x.Date >= fromDate.Date && x.Date < toEnd)
                    .OrderBy(x => x.Date).ThenBy(x => x.IsIn ? 0 : 1))
                {
                    balance += mv.IsIn ? mv.Quantity : -mv.Quantity;
                    items.Add(new NarcoticDrugRegisterItemDto
                    {
                        RowNumber = ++rowNum, TransactionDate = mv.Date, TransactionType = mv.IsIn ? "Import" : "Export",
                        DocumentCode = mv.DocumentCode, MedicineCode = s.Medicine.MedicineCode, MedicineName = s.Medicine.MedicineName,
                        LotNumber = mv.LotNumber ?? "", Unit = mv.Unit ?? s.Medicine.Unit ?? "",
                        ImportQuantity = mv.IsIn ? mv.Quantity : 0, ExportQuantity = mv.IsIn ? 0 : mv.Quantity,
                        Balance = balance, RecipientInfo = mv.Recipient, Note = ""
                    });
                }
            }
            return new List<NarcoticDrugRegisterDto>
            {
                new NarcoticDrugRegisterDto { FromDate = fromDate, ToDate = toDate, DrugType = "Narcotic", Items = items }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetNarcoticDrugRegisterAsync");
            return new List<NarcoticDrugRegisterDto>();
        }
    }

    // 15.2 So thuoc huong than
    public async Task<List<PsychotropicDrugRegisterDto>> GetPsychotropicDrugRegisterAsync(
        DateTime fromDate, DateTime toDate, Guid? warehouseId = null)
    {
        try
        {
            var ledger = await LoadControlledDrugLedgerAsync(fromDate, warehouseId, m => m.IsPsychotropic);
            return SummarizeControlledDrugs(ledger, fromDate, toDate).Select(s => new PsychotropicDrugRegisterDto
            {
                Date = toDate, MedicineId = s.Medicine.Id, MedicineCode = s.Medicine.MedicineCode,
                MedicineName = s.Medicine.MedicineName, BatchNumber = "",
                OpeningStock = s.Opening, ReceivedQuantity = s.In, IssuedQuantity = s.Out, ClosingStock = s.Closing
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetPsychotropicDrugRegisterAsync");
            return new List<PsychotropicDrugRegisterDto>();
        }
    }

    // 15.3 So thuoc tien chat
    public async Task<List<PrecursorDrugRegisterDto>> GetPrecursorDrugRegisterAsync(
        DateTime fromDate, DateTime toDate, Guid? warehouseId = null)
    {
        try
        {
            var ledger = await LoadControlledDrugLedgerAsync(fromDate, warehouseId, m => m.IsPrecursor);
            return SummarizeControlledDrugs(ledger, fromDate, toDate).Select(s => new PrecursorDrugRegisterDto
            {
                Date = toDate, MedicineId = s.Medicine.Id, MedicineCode = s.Medicine.MedicineCode,
                MedicineName = s.Medicine.MedicineName, BatchNumber = "",
                OpeningStock = s.Opening, ReceivedQuantity = s.In, IssuedQuantity = s.Out, ClosingStock = s.Closing
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetPrecursorDrugRegisterAsync");
            return new List<PrecursorDrugRegisterDto>();
        }
    }

    // 15.4 Bao cao su dung thuoc
    public async Task<List<MedicineUsageReportDto>> GetMedicineUsageReportAsync(
        DateTime fromDate, DateTime toDate, Guid? medicineId = null, Guid? departmentId = null)
    {
        try
        {
            var query = _context.PrescriptionDetails.AsNoTracking()
                .Include(pd => pd.Medicine)
                .Include(pd => pd.Prescription)
                .Where(pd => pd.Prescription.PrescriptionDate >= fromDate
                          && pd.Prescription.PrescriptionDate <= toDate
                          && pd.Prescription.Status != 4);

            if (medicineId.HasValue)
                query = query.Where(pd => pd.MedicineId == medicineId.Value);
            if (departmentId.HasValue)
                query = query.Where(pd => pd.Prescription.DepartmentId == departmentId.Value);

            var grouped = await query
                .GroupBy(pd => new
                {
                    pd.MedicineId,
                    pd.Medicine.MedicineCode,
                    pd.Medicine.MedicineName,
                    pd.Medicine.ActiveIngredient,
                    pd.Medicine.Unit
                })
                .Select(g => new MedicineUsageItemDto
                {
                    MedicineCode = g.Key.MedicineCode ?? "",
                    MedicineName = g.Key.MedicineName ?? "",
                    ActiveIngredient = g.Key.ActiveIngredient ?? "",
                    Unit = g.Key.Unit ?? "",
                    Quantity = g.Sum(x => x.Quantity),
                    UnitPrice = g.Average(x => x.UnitPrice),
                    TotalValue = g.Sum(x => x.Amount)
                })
                .OrderByDescending(x => x.TotalValue)
                .ToListAsync();

            var rowNum = 0;
            grouped.ForEach(item => item.RowNumber = ++rowNum);

            return new List<MedicineUsageReportDto>
            {
                new MedicineUsageReportDto
                {
                    FromDate = fromDate,
                    ToDate = toDate,
                    Items = grouped
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicineUsageReportAsync");
            return new List<MedicineUsageReportDto>();
        }
    }

    // 15.5 Bao cao su dung khang sinh
    public async Task<List<AntibioticUsageReportDto>> GetAntibioticUsageReportAsync(
        DateTime fromDate, DateTime toDate, Guid? antibioticId = null, Guid? departmentId = null)
    {
        try
        {
            var allPrescriptionsQuery = _context.Prescriptions.AsNoTracking()
                .Where(p => p.PrescriptionDate >= fromDate && p.PrescriptionDate <= toDate && p.Status != 4);
            if (departmentId.HasValue)
                allPrescriptionsQuery = allPrescriptionsQuery.Where(p => p.DepartmentId == departmentId.Value);

            var totalPatients = await allPrescriptionsQuery
                .Select(p => p.MedicalRecordId)
                .Distinct()
                .CountAsync();

            var abQuery = _context.PrescriptionDetails.AsNoTracking()
                .Include(pd => pd.Medicine)
                .Include(pd => pd.Prescription)
                .Where(pd => pd.Medicine.IsAntibiotic)
                .Where(pd => pd.Prescription.PrescriptionDate >= fromDate
                          && pd.Prescription.PrescriptionDate <= toDate
                          && pd.Prescription.Status != 4);

            if (antibioticId.HasValue)
                abQuery = abQuery.Where(pd => pd.MedicineId == antibioticId.Value);
            if (departmentId.HasValue)
                abQuery = abQuery.Where(pd => pd.Prescription.DepartmentId == departmentId.Value);

            var patientsWithAntibiotics = await abQuery
                .Select(pd => pd.Prescription.MedicalRecordId)
                .Distinct()
                .CountAsync();

            var items = await abQuery
                .GroupBy(pd => new
                {
                    pd.Medicine.MedicineName,
                    pd.Medicine.MedicineGroupCode
                })
                .Select(g => new AntibioticUsageItemDto
                {
                    AntibioticName = g.Key.MedicineName ?? "",
                    AntibioticGroup = g.Key.MedicineGroupCode ?? "",
                    PatientCount = g.Select(x => x.Prescription.MedicalRecordId).Distinct().Count(),
                    Quantity = g.Sum(x => x.Quantity),
                    Unit = g.Max(x => x.Medicine.Unit) ?? "",
                    Value = g.Sum(x => x.Amount)
                })
                .OrderByDescending(x => x.Value)
                .ToListAsync();

            return new List<AntibioticUsageReportDto>
            {
                new AntibioticUsageReportDto
                {
                    FromDate = fromDate,
                    ToDate = toDate,
                    TotalPatients = totalPatients,
                    PatientsWithAntibiotics = patientsWithAntibiotics,
                    AntibioticUsageRate = totalPatients > 0
                        ? Math.Round((decimal)patientsWithAntibiotics / totalPatients * 100, 2)
                        : 0,
                    Items = items
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAntibioticUsageReportAsync");
            return new List<AntibioticUsageReportDto>();
        }
    }

    // 15.6 Bien ban kiem ke
    public async Task<List<InventoryRecordDto>> GetDrugInventoryRecordAsync(
        DateTime inventoryDate, Guid warehouseId)
    {
        try
        {
            var warehouse = await _context.Warehouses.AsNoTracking()
                .FirstOrDefaultAsync(w => w.Id == warehouseId);

            var inventoryItems = await _context.InventoryItems.AsNoTracking()
                .Include(ii => ii.Medicine)
                .Where(ii => ii.WarehouseId == warehouseId && ii.ItemType == "Medicine" && ii.MedicineId != null)
                .OrderBy(ii => ii.Medicine.MedicineCode)
                .ToListAsync();

            var rowNum = 0;
            var items = inventoryItems.Select(ii => new InventoryRecordItemDto
            {
                RowNumber = ++rowNum,
                ItemCode = ii.Medicine?.MedicineCode ?? "",
                ItemName = ii.Medicine?.MedicineName ?? "",
                LotNumber = ii.BatchNumber ?? "",
                ExpiryDate = ii.ExpiryDate,
                Unit = ii.Medicine?.Unit ?? "",
                SystemQuantity = ii.Quantity,
                ActualQuantity = ii.Quantity, // Actual filled during physical count
                Variance = 0,
                UnitPrice = ii.ImportPrice,
                VarianceValue = 0,
                Note = ""
            }).ToList();

            return new List<InventoryRecordDto>
            {
                new InventoryRecordDto
                {
                    Id = Guid.NewGuid(),
                    RecordCode = $"KK-{inventoryDate:yyyyMMdd}",
                    InventoryDate = inventoryDate,
                    WarehouseId = warehouseId,
                    WarehouseName = warehouse?.WarehouseName ?? "",
                    ItemType = "Medicine",
                    Status = "Draft",
                    Items = items
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDrugInventoryRecordAsync");
            return new List<InventoryRecordDto>();
        }
    }

    // 15.7 Bao cao xuat nhap ton
    public async Task<List<DrugStockMovementReportDto>> GetDrugStockMovementReportAsync(
        DateTime fromDate, DateTime toDate, Guid? warehouseId = null, Guid? medicineGroupId = null)
    {
        try
        {
            var query = _context.StockMovements.AsNoTracking()
                .Include(sm => sm.Medicine)
                .Where(sm => sm.MovementDate >= fromDate && sm.MovementDate <= toDate);

            if (warehouseId.HasValue)
                query = query.Where(sm => sm.WarehouseId == warehouseId.Value);
            if (medicineGroupId.HasValue)
                query = query.Where(sm => sm.Medicine.MedicineGroupId == medicineGroupId.Value);

            var grouped = await query
                .GroupBy(sm => new { sm.MedicineId, sm.Medicine.MedicineCode, sm.Medicine.MedicineName })
                .Select(g => new
                {
                    g.Key.MedicineId,
                    g.Key.MedicineCode,
                    g.Key.MedicineName,
                    Received = g.Where(x => x.MovementType == 1).Sum(x => x.Quantity),
                    Issued = g.Where(x => x.MovementType == 2).Sum(x => x.Quantity),
                    Adjusted = g.Where(x => x.MovementType == 4).Sum(x => x.Quantity),
                    FirstBalance = g.OrderBy(x => x.MovementDate).Select(x => x.BalanceBefore).FirstOrDefault(),
                    LastBalance = g.OrderByDescending(x => x.MovementDate).Select(x => x.BalanceAfter).FirstOrDefault()
                })
                .ToListAsync();

            return grouped.Select(g => new DrugStockMovementReportDto
            {
                MedicineId = g.MedicineId,
                MedicineCode = g.MedicineCode ?? "",
                MedicineName = g.MedicineName ?? "",
                OpeningStock = g.FirstBalance,
                ReceivedQuantity = g.Received,
                IssuedQuantity = g.Issued,
                AdjustmentQuantity = g.Adjusted,
                ClosingStock = g.LastBalance
            }).OrderBy(x => x.MedicineCode).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDrugStockMovementReportAsync");
            return new List<DrugStockMovementReportDto>();
        }
    }

    // 15.8 Bao cao thuoc sap het han
    public async Task<List<ExpiringDrugReportDto>> GetExpiringDrugReportAsync(
        int daysUntilExpiry = 90, Guid? warehouseId = null)
    {
        try
        {
            var now = DateTime.UtcNow;
            var expiryThreshold = now.AddDays(daysUntilExpiry);

            var query = _context.InventoryItems.AsNoTracking()
                .Include(ii => ii.Medicine)
                .Where(ii => ii.ItemType == "Medicine"
                          && ii.MedicineId != null
                          && ii.ExpiryDate != null
                          && ii.ExpiryDate > now
                          && ii.ExpiryDate <= expiryThreshold
                          && ii.Quantity > 0);

            if (warehouseId.HasValue)
                query = query.Where(ii => ii.WarehouseId == warehouseId.Value);

            var items = await query
                .OrderBy(ii => ii.ExpiryDate)
                .ToBoundedListAsync("SystemCompleteService.GetExpiringDrugReport");

            return items.Select(ii => new ExpiringDrugReportDto
            {
                MedicineId = ii.MedicineId ?? Guid.Empty,
                MedicineCode = ii.Medicine?.MedicineCode ?? "",
                MedicineName = ii.Medicine?.MedicineName ?? "",
                BatchNumber = ii.BatchNumber ?? "",
                ExpiryDate = ii.ExpiryDate!.Value,
                DaysUntilExpiry = (int)(ii.ExpiryDate!.Value - now).TotalDays,
                Quantity = ii.Quantity,
                Value = ii.Quantity * ii.ImportPrice
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetExpiringDrugReportAsync");
            return new List<ExpiringDrugReportDto>();
        }
    }

    // 15.9 Bao cao thuoc da het han
    public async Task<List<ExpiredDrugReportDto>> GetExpiredDrugReportAsync(Guid? warehouseId = null)
    {
        try
        {
            var now = DateTime.UtcNow;

            var query = _context.InventoryItems.AsNoTracking()
                .Include(ii => ii.Medicine)
                .Where(ii => ii.ItemType == "Medicine"
                          && ii.MedicineId != null
                          && ii.ExpiryDate != null
                          && ii.ExpiryDate < now
                          && ii.Quantity > 0);

            if (warehouseId.HasValue)
                query = query.Where(ii => ii.WarehouseId == warehouseId.Value);

            var items = await query
                .OrderBy(ii => ii.ExpiryDate)
                .ToBoundedListAsync("SystemCompleteService.GetExpiredDrugReport");

            return items.Select(ii => new ExpiredDrugReportDto
            {
                MedicineId = ii.MedicineId ?? Guid.Empty,
                MedicineCode = ii.Medicine?.MedicineCode ?? "",
                MedicineName = ii.Medicine?.MedicineName ?? "",
                BatchNumber = ii.BatchNumber ?? "",
                ExpiryDate = ii.ExpiryDate!.Value,
                DaysExpired = (int)(now - ii.ExpiryDate!.Value).TotalDays,
                Quantity = ii.Quantity,
                Value = ii.Quantity * ii.ImportPrice
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetExpiredDrugReportAsync");
            return new List<ExpiredDrugReportDto>();
        }
    }

    #endregion
}
