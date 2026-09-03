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
    #region Module 15b: Bao cao Ton kho & Chi phi Duoc (15.10-15.17)

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

            // #195: 1 query gom tồn theo (thuốc, kho) thay vì 1 sum/ngưỡng. Mỗi ngưỡng vẫn tự
            // chọn phạm vi như trước: lọc theo kho được truyền vào, hoặc kho của ngưỡng, hoặc
            // cộng mọi kho khi ngưỡng không gắn kho.
            var thresholdMedicineIds = thresholds.Select(t => t.MedicineId).Distinct().ToList();
            var stockScope = _context.InventoryItems.AsNoTracking()
                .Where(ii => thresholdMedicineIds.Contains(ii.MedicineId!.Value)
                    && ii.ItemType == "Medicine" && ii.Quantity > 0);
            if (warehouseId.HasValue)
                stockScope = stockScope.Where(ii => ii.WarehouseId == warehouseId.Value);

            var stockRows = await stockScope
                .GroupBy(ii => new { ii.MedicineId, ii.WarehouseId })
                .Select(g => new { g.Key.MedicineId, g.Key.WarehouseId, Quantity = g.Sum(ii => ii.Quantity) })
                .ToListAsync();

            var stockByMedicineWarehouse = stockRows
                .ToDictionary(x => (x.MedicineId, x.WarehouseId), x => x.Quantity);
            var stockByMedicine = stockRows
                .GroupBy(x => x.MedicineId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity));

            var result = new List<LowStockDrugReportDto>();
            foreach (var t in thresholds)
            {
                decimal currentStock;
                if (!warehouseId.HasValue && t.WarehouseId.HasValue)
                    currentStock = stockByMedicineWarehouse.TryGetValue(((Guid?)t.MedicineId, t.WarehouseId.Value), out var scoped)
                        ? scoped : 0;
                else
                    currentStock = stockByMedicine.TryGetValue(t.MedicineId, out var total) ? total : 0;

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
