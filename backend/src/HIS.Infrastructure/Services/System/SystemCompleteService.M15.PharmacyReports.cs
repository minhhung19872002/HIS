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

    // Helper: build controlled drug register (narcotic/psychotropic/precursor) from StockMovements
    private async Task<List<NarcoticDrugRegisterItemDto>> GetControlledDrugMovementsAsync(
        DateTime fromDate, DateTime toDate, Guid? warehouseId,
        System.Linq.Expressions.Expression<Func<Medicine, bool>> drugFilter)
    {
        var medicineIds = await _context.Medicines.AsNoTracking()
            .Where(drugFilter)
            .Where(m => m.IsActive)
            .Select(m => m.Id)
            .ToListAsync();

        if (!medicineIds.Any()) return new List<NarcoticDrugRegisterItemDto>();

        var query = _context.StockMovements.AsNoTracking()
            .Include(sm => sm.Medicine)
            .Where(sm => medicineIds.Contains(sm.MedicineId))
            .Where(sm => sm.MovementDate >= fromDate && sm.MovementDate <= toDate);

        if (warehouseId.HasValue)
            query = query.Where(sm => sm.WarehouseId == warehouseId.Value);

        var movements = await query
            .OrderBy(sm => sm.MedicineId)
            .ThenBy(sm => sm.MovementDate)
            .ToListAsync();

        var rowNum = 0;
        return movements.Select(sm => new NarcoticDrugRegisterItemDto
        {
            RowNumber = ++rowNum,
            TransactionDate = sm.MovementDate,
            TransactionType = sm.MovementType == 1 ? "Import" : "Export",
            DocumentCode = sm.ReferenceCode ?? "",
            MedicineCode = sm.Medicine?.MedicineCode ?? "",
            MedicineName = sm.Medicine?.MedicineName ?? "",
            LotNumber = sm.BatchNumber ?? "",
            Unit = sm.Medicine?.Unit ?? "",
            ImportQuantity = sm.MovementType == 1 ? sm.Quantity : 0,
            ExportQuantity = sm.MovementType == 2 ? sm.Quantity : 0,
            Balance = sm.BalanceAfter,
            RecipientInfo = sm.ReferenceType ?? "",
            Note = sm.Notes ?? ""
        }).ToList();
    }

    // 15.1 So thuoc gay nghien
    public async Task<List<NarcoticDrugRegisterDto>> GetNarcoticDrugRegisterAsync(
        DateTime fromDate, DateTime toDate, Guid? warehouseId = null)
    {
        try
        {
            var items = await GetControlledDrugMovementsAsync(fromDate, toDate, warehouseId, m => m.IsNarcotic);
            return new List<NarcoticDrugRegisterDto>
            {
                new NarcoticDrugRegisterDto
                {
                    FromDate = fromDate,
                    ToDate = toDate,
                    DrugType = "Narcotic",
                    Items = items
                }
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
            var medicineIds = await _context.Medicines.AsNoTracking()
                .Where(m => m.IsPsychotropic && m.IsActive)
                .Select(m => m.Id)
                .ToListAsync();

            if (!medicineIds.Any()) return new List<PsychotropicDrugRegisterDto>();

            var query = _context.StockMovements.AsNoTracking()
                .Include(sm => sm.Medicine)
                .Where(sm => medicineIds.Contains(sm.MedicineId))
                .Where(sm => sm.MovementDate >= fromDate && sm.MovementDate <= toDate);

            if (warehouseId.HasValue)
                query = query.Where(sm => sm.WarehouseId == warehouseId.Value);

            var grouped = await query
                .GroupBy(sm => new { sm.MedicineId, sm.Medicine.MedicineCode, sm.Medicine.MedicineName, sm.BatchNumber })
                .Select(g => new
                {
                    g.Key.MedicineId,
                    g.Key.MedicineCode,
                    g.Key.MedicineName,
                    BatchNumber = g.Key.BatchNumber ?? "",
                    Received = g.Where(x => x.MovementType == 1).Sum(x => x.Quantity),
                    Issued = g.Where(x => x.MovementType == 2).Sum(x => x.Quantity),
                    LastBalance = g.OrderByDescending(x => x.MovementDate).Select(x => x.BalanceAfter).FirstOrDefault()
                })
                .ToListAsync();

            return grouped.Select(g => new PsychotropicDrugRegisterDto
            {
                Date = toDate,
                MedicineId = g.MedicineId,
                MedicineCode = g.MedicineCode ?? "",
                MedicineName = g.MedicineName ?? "",
                BatchNumber = g.BatchNumber,
                OpeningStock = g.LastBalance - g.Received + g.Issued,
                ReceivedQuantity = g.Received,
                IssuedQuantity = g.Issued,
                ClosingStock = g.LastBalance
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
            var medicineIds = await _context.Medicines.AsNoTracking()
                .Where(m => m.IsPrecursor && m.IsActive)
                .Select(m => m.Id)
                .ToListAsync();

            if (!medicineIds.Any()) return new List<PrecursorDrugRegisterDto>();

            var query = _context.StockMovements.AsNoTracking()
                .Include(sm => sm.Medicine)
                .Where(sm => medicineIds.Contains(sm.MedicineId))
                .Where(sm => sm.MovementDate >= fromDate && sm.MovementDate <= toDate);

            if (warehouseId.HasValue)
                query = query.Where(sm => sm.WarehouseId == warehouseId.Value);

            var grouped = await query
                .GroupBy(sm => new { sm.MedicineId, sm.Medicine.MedicineCode, sm.Medicine.MedicineName, sm.BatchNumber })
                .Select(g => new
                {
                    g.Key.MedicineId,
                    g.Key.MedicineCode,
                    g.Key.MedicineName,
                    BatchNumber = g.Key.BatchNumber ?? "",
                    Received = g.Where(x => x.MovementType == 1).Sum(x => x.Quantity),
                    Issued = g.Where(x => x.MovementType == 2).Sum(x => x.Quantity),
                    LastBalance = g.OrderByDescending(x => x.MovementDate).Select(x => x.BalanceAfter).FirstOrDefault()
                })
                .ToListAsync();

            return grouped.Select(g => new PrecursorDrugRegisterDto
            {
                Date = toDate,
                MedicineId = g.MedicineId,
                MedicineCode = g.MedicineCode ?? "",
                MedicineName = g.MedicineName ?? "",
                BatchNumber = g.BatchNumber,
                OpeningStock = g.LastBalance - g.Received + g.Issued,
                ReceivedQuantity = g.Received,
                IssuedQuantity = g.Issued,
                ClosingStock = g.LastBalance
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
