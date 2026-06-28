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

    // 15.10 Bao cao thuoc duoi nguong ton kho
    public async Task<List<LowStockDrugReportDto>> GetLowStockDrugReportAsync(Guid? warehouseId = null)
    {
        try
        {
            var thresholdQuery = _context.StockThresholds.AsNoTracking()
                .Include(st => st.Medicine)
                .Where(st => st.IsActive && st.MinimumQuantity > 0);

            if (warehouseId.HasValue)
                thresholdQuery = thresholdQuery.Where(st => st.WarehouseId == warehouseId.Value || st.WarehouseId == null);

            var thresholds = await thresholdQuery.ToListAsync();

            var result = new List<LowStockDrugReportDto>();
            foreach (var t in thresholds)
            {
                var stockQuery = _context.InventoryItems.AsNoTracking()
                    .Where(ii => ii.MedicineId == t.MedicineId && ii.ItemType == "Medicine" && ii.Quantity > 0);

                if (warehouseId.HasValue)
                    stockQuery = stockQuery.Where(ii => ii.WarehouseId == warehouseId.Value);
                else if (t.WarehouseId.HasValue)
                    stockQuery = stockQuery.Where(ii => ii.WarehouseId == t.WarehouseId.Value);

                var currentStock = await stockQuery.SumAsync(ii => ii.Quantity);

                if (currentStock < t.MinimumQuantity)
                {
                    result.Add(new LowStockDrugReportDto
                    {
                        MedicineId = t.MedicineId,
                        MedicineCode = t.Medicine?.MedicineCode ?? "",
                        MedicineName = t.Medicine?.MedicineName ?? "",
                        CurrentStock = currentStock,
                        MinStock = t.MinimumQuantity,
                        Shortfall = t.MinimumQuantity - currentStock
                    });
                }
            }

            return result.OrderByDescending(x => x.Shortfall).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetLowStockDrugReportAsync");
            return new List<LowStockDrugReportDto>();
        }
    }

    // 15.11 Chi phi thuoc theo khoa
    public async Task<List<DrugCostByDeptReportDto>> GetDrugCostByDeptReportAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var query = _context.PrescriptionDetails.AsNoTracking()
                .Include(pd => pd.Medicine)
                .Include(pd => pd.Prescription)
                    .ThenInclude(p => p.Department)
                .Where(pd => pd.Prescription.PrescriptionDate >= fromDate
                          && pd.Prescription.PrescriptionDate <= toDate
                          && pd.Prescription.Status != 4);

            if (departmentId.HasValue)
                query = query.Where(pd => pd.Prescription.DepartmentId == departmentId.Value);

            var result = await query
                .GroupBy(pd => new
                {
                    pd.Prescription.DepartmentId,
                    pd.Prescription.Department.DepartmentCode,
                    pd.Prescription.Department.DepartmentName
                })
                .Select(g => new DrugCostByDeptReportDto
                {
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentCode = g.Key.DepartmentCode ?? "",
                    DepartmentName = g.Key.DepartmentName ?? "",
                    TotalCost = g.Sum(x => x.Amount),
                    AntibioticCost = g.Where(x => x.Medicine.IsAntibiotic).Sum(x => x.Amount),
                    PrescriptionCount = g.Select(x => x.PrescriptionId).Distinct().Count()
                })
                .OrderByDescending(x => x.TotalCost)
                .ToListAsync();

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDrugCostByDeptReportAsync");
            return new List<DrugCostByDeptReportDto>();
        }
    }

    // 15.12 Chi phi thuoc theo benh nhan
    public async Task<List<DrugCostByPatientReportDto>> GetDrugCostByPatientReportAsync(
        DateTime fromDate, DateTime toDate, Guid? patientId = null, string patientType = null)
    {
        try
        {
            var query = _context.PrescriptionDetails.AsNoTracking()
                .Include(pd => pd.Prescription)
                    .ThenInclude(p => p.MedicalRecord)
                        .ThenInclude(mr => mr.Patient)
                .Where(pd => pd.Prescription.PrescriptionDate >= fromDate
                          && pd.Prescription.PrescriptionDate <= toDate
                          && pd.Prescription.Status != 4);

            if (patientId.HasValue)
                query = query.Where(pd => pd.Prescription.MedicalRecord.PatientId == patientId.Value);
            if (!string.IsNullOrEmpty(patientType))
            {
                if (int.TryParse(patientType, out var pt))
                    query = query.Where(pd => pd.PatientType == pt);
            }

            var result = await query
                .GroupBy(pd => new
                {
                    pd.Prescription.MedicalRecord.PatientId,
                    pd.Prescription.MedicalRecord.Patient.PatientCode,
                    pd.Prescription.MedicalRecord.Patient.FullName
                })
                .Select(g => new DrugCostByPatientReportDto
                {
                    PatientId = g.Key.PatientId,
                    PatientCode = g.Key.PatientCode ?? "",
                    PatientName = g.Key.FullName ?? "",
                    TotalCost = g.Sum(x => x.Amount),
                    InsuranceCost = g.Sum(x => x.InsuranceAmount),
                    PatientCost = g.Sum(x => x.PatientAmount)
                })
                .OrderByDescending(x => x.TotalCost)
                .ToListAsync();

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDrugCostByPatientReportAsync");
            return new List<DrugCostByPatientReportDto>();
        }
    }

    // 15.13 Thuoc theo doi tuong thanh toan
    public async Task<List<DrugByPaymentTypeReportDto>> GetDrugByPaymentTypeReportAsync(
        DateTime fromDate, DateTime toDate, string paymentType = null)
    {
        try
        {
            var query = _context.PrescriptionDetails.AsNoTracking()
                .Include(pd => pd.Prescription)
                .Where(pd => pd.Prescription.PrescriptionDate >= fromDate
                          && pd.Prescription.PrescriptionDate <= toDate
                          && pd.Prescription.Status != 4);

            if (!string.IsNullOrEmpty(paymentType) && int.TryParse(paymentType, out var pt))
                query = query.Where(pd => pd.PatientType == pt);

            var result = await query
                .GroupBy(pd => pd.PatientType)
                .Select(g => new DrugByPaymentTypeReportDto
                {
                    PaymentType = g.Key == 1 ? "BHYT" : g.Key == 2 ? "Vien phi" : g.Key == 3 ? "Dich vu" : "Khac",
                    TotalQuantity = g.Sum(x => x.Quantity),
                    TotalValue = g.Sum(x => x.Amount),
                    PrescriptionCount = g.Select(x => x.PrescriptionId).Distinct().Count()
                })
                .OrderByDescending(x => x.TotalValue)
                .ToListAsync();

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDrugByPaymentTypeReportAsync");
            return new List<DrugByPaymentTypeReportDto>();
        }
    }

    // 15.14 Thong ke don thuoc ngoai tru
    public async Task<List<OutpatientPrescriptionStatDto>> GetOutpatientPrescriptionStatAsync(
        DateTime fromDate, DateTime toDate, Guid? doctorId = null, Guid? departmentId = null)
    {
        try
        {
            var query = _context.Prescriptions.AsNoTracking()
                .Include(p => p.Doctor)
                .Where(p => p.PrescriptionType == 1
                         && p.PrescriptionDate >= fromDate
                         && p.PrescriptionDate <= toDate
                         && p.Status != 4);

            if (doctorId.HasValue)
                query = query.Where(p => p.DoctorId == doctorId.Value);
            if (departmentId.HasValue)
                query = query.Where(p => p.DepartmentId == departmentId.Value);

            var result = await query
                .GroupBy(p => new { p.DoctorId, p.Doctor.FullName })
                .Select(g => new OutpatientPrescriptionStatDto
                {
                    DoctorId = g.Key.DoctorId,
                    DoctorName = g.Key.FullName ?? "",
                    PrescriptionCount = g.Count(),
                    PatientCount = g.Select(p => p.MedicalRecordId).Distinct().Count(),
                    TotalValue = g.Sum(p => p.TotalAmount)
                })
                .OrderByDescending(x => x.PrescriptionCount)
                .ToListAsync();

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetOutpatientPrescriptionStatAsync");
            return new List<OutpatientPrescriptionStatDto>();
        }
    }

    // 15.15 Thong ke don thuoc noi tru
    public async Task<List<InpatientPrescriptionStatDto>> GetInpatientPrescriptionStatAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var query = _context.Prescriptions.AsNoTracking()
                .Include(p => p.Department)
                .Where(p => p.PrescriptionType == 2
                         && p.PrescriptionDate >= fromDate
                         && p.PrescriptionDate <= toDate
                         && p.Status != 4);

            if (departmentId.HasValue)
                query = query.Where(p => p.DepartmentId == departmentId.Value);

            var result = await query
                .GroupBy(p => new { p.DepartmentId, p.Department.DepartmentName })
                .Select(g => new InpatientPrescriptionStatDto
                {
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DepartmentName ?? "",
                    PatientCount = g.Select(p => p.MedicalRecordId).Distinct().Count(),
                    PrescriptionCount = g.Count(),
                    TotalValue = g.Sum(p => p.TotalAmount)
                })
                .OrderByDescending(x => x.TotalValue)
                .ToListAsync();

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetInpatientPrescriptionStatAsync");
            return new List<InpatientPrescriptionStatDto>();
        }
    }

    // 15.16 Phan tich ABC/VEN
    public async Task<ABCVENReportDto> GetABCVENReportAsync(
        DateTime fromDate, DateTime toDate, Guid? warehouseId = null)
    {
        try
        {
            var query = _context.PrescriptionDetails.AsNoTracking()
                .Include(pd => pd.Medicine)
                .Include(pd => pd.Prescription)
                .Where(pd => pd.Prescription.PrescriptionDate >= fromDate
                          && pd.Prescription.PrescriptionDate <= toDate
                          && pd.Prescription.Status != 4);

            if (warehouseId.HasValue)
                query = query.Where(pd => pd.Prescription.WarehouseId == warehouseId.Value);

            var grouped = await query
                .GroupBy(pd => new { pd.MedicineId, pd.Medicine.MedicineCode, pd.Medicine.MedicineName })
                .Select(g => new
                {
                    g.Key.MedicineCode,
                    g.Key.MedicineName,
                    TotalValue = g.Sum(x => x.Amount)
                })
                .OrderByDescending(x => x.TotalValue)
                .ToListAsync();

            var grandTotal = grouped.Sum(x => x.TotalValue);
            if (grandTotal == 0) grandTotal = 1; // prevent division by zero

            var items = new List<ABCVENItemDto>();
            decimal cumulative = 0;
            foreach (var g in grouped)
            {
                cumulative += g.TotalValue;
                var pct = Math.Round(g.TotalValue / grandTotal * 100, 2);
                var cumulativePct = Math.Round(cumulative / grandTotal * 100, 2);

                string abcClass;
                if (cumulativePct <= 80) abcClass = "A";
                else if (cumulativePct <= 95) abcClass = "B";
                else abcClass = "C";

                items.Add(new ABCVENItemDto
                {
                    MedicineCode = g.MedicineCode ?? "",
                    MedicineName = g.MedicineName ?? "",
                    ABCClass = abcClass,
                    VENClass = "N", // Enriched below
                    TotalValue = g.TotalValue,
                    Percentage = pct
                });
            }

            // Enrich VEN: V=Vital (narcotic/psychotropic/controlled), E=Essential (antibiotic), N=Non-essential
            var medicineCodes = items.Select(i => i.MedicineCode).ToHashSet();
            var medicines = await _context.Medicines.AsNoTracking()
                .Where(m => medicineCodes.Contains(m.MedicineCode))
                .Select(m => new { m.MedicineCode, m.IsNarcotic, m.IsPsychotropic, m.IsControlled, m.IsAntibiotic })
                .ToListAsync();

            var medicineFlags = medicines.ToDictionary(m => m.MedicineCode);
            foreach (var item in items)
            {
                if (medicineFlags.TryGetValue(item.MedicineCode, out var flags))
                {
                    if (flags.IsNarcotic || flags.IsPsychotropic || flags.IsControlled)
                        item.VENClass = "V";
                    else if (flags.IsAntibiotic)
                        item.VENClass = "E";
                }
            }

            return new ABCVENReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                Items = items
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetABCVENReportAsync");
            return new ABCVENReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                Items = new List<ABCVENItemDto>()
            };
        }
    }

    // 15.17 Bao cao DDD (Defined Daily Dose) - khang sinh
    public async Task<List<DDDReportDto>> GetDDDReportAsync(
        DateTime fromDate, DateTime toDate, Guid? medicineId = null)
    {
        try
        {
            var query = _context.PrescriptionDetails.AsNoTracking()
                .Include(pd => pd.Medicine)
                .Include(pd => pd.Prescription)
                .Where(pd => pd.Prescription.PrescriptionDate >= fromDate
                          && pd.Prescription.PrescriptionDate <= toDate
                          && pd.Prescription.Status != 4
                          && pd.Medicine.IsAntibiotic);

            if (medicineId.HasValue)
                query = query.Where(pd => pd.MedicineId == medicineId.Value);

            var grouped = await query
                .GroupBy(pd => new
                {
                    pd.MedicineId,
                    pd.Medicine.MedicineCode,
                    pd.Medicine.MedicineName,
                    pd.Medicine.ConversionRate
                })
                .Select(g => new
                {
                    g.Key.MedicineId,
                    g.Key.MedicineCode,
                    g.Key.MedicineName,
                    g.Key.ConversionRate,
                    TotalQuantity = g.Sum(x => x.Quantity)
                })
                .OrderByDescending(x => x.TotalQuantity)
                .ToListAsync();

            return grouped.Select(g =>
            {
                // Use ConversionRate as proxy for DDD value (WHO DDD not stored on entity)
                var dddValue = g.ConversionRate > 0 ? g.ConversionRate : 1m;
                var totalDDD = dddValue > 0 ? Math.Round(g.TotalQuantity / dddValue, 2) : 0;

                return new DDDReportDto
                {
                    MedicineId = g.MedicineId,
                    MedicineCode = g.MedicineCode ?? "",
                    MedicineName = g.MedicineName ?? "",
                    DDDValue = dddValue,
                    TotalDDD = totalDDD
                };
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDDDReportAsync");
            return new List<DDDReportDto>();
        }
    }

    public async Task<byte[]> PrintPharmacyReportAsync(PharmacyReportRequest request)
    {
        try
        {
            var exports = await _context.ExportReceipts.AsNoTracking()
                .Where(e => e.ReceiptDate >= request.FromDate && e.ReceiptDate <= request.ToDate && !e.IsDeleted)
                .Include(e => e.Warehouse).Include(e => e.Details).ThenInclude(d => d.Medicine)
                .ToListAsync();

            if (request.WarehouseId.HasValue)
                exports = exports.Where(e => e.WarehouseId == request.WarehouseId).ToList();

            var grouped = exports.SelectMany(e => e.Details)
                .Where(d => d.Medicine != null)
                .GroupBy(d => new { d.MedicineId, d.Medicine?.MedicineName, d.Medicine?.MedicineCode })
                .Select(g => new string[] {
                    g.Key.MedicineCode ?? "", g.Key.MedicineName ?? "",
                    g.First().Unit ?? "", g.Sum(d => d.Quantity).ToString("N0"),
                    g.Sum(d => d.Amount).ToString("N0")
                }).ToList();

            var html = BuildTableReport(
                $"BAO CAO DUOC - {request.ReportType?.ToUpper() ?? "TONG HOP"}",
                $"Tu {request.FromDate:dd/MM/yyyy} den {request.ToDate:dd/MM/yyyy}",
                DateTime.Now,
                new[] { "Ma thuoc", "Ten thuoc", "DVT", "So luong", "Thanh tien" },
                grouped);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<byte[]> ExportPharmacyReportToExcelAsync(PharmacyReportRequest request)
    {
        return await PrintPharmacyReportAsync(request);
    }

    #endregion
}
