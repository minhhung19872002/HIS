using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K2 phien 5 (2026-05-30): tach Module 11 (Tai chinh Ke toan, 9 chuc nang, ~703 dong) khoi
// SystemCompleteService.cs god-file — TAB CUOI K2. ZERO runtime change — partial class.
public partial class SystemCompleteService
{
    #region Module 11: Quan ly Tai chinh Ke toan - 9 chuc nang

    // 11.1 Hach toan doanh thu khoa phong chi dinh
    public async Task<List<RevenueByOrderingDeptDto>> GetRevenueByOrderingDeptAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, string revenueType = null)
    {
        try
        {
            // Query ServiceRequests grouped by ordering department (DepartmentId)
            var query = _context.ServiceRequests.AsNoTracking()
                .Where(sr => sr.RequestDate >= fromDate && sr.RequestDate <= toDate && sr.Status != 4);

            if (departmentId.HasValue)
                query = query.Where(sr => sr.DepartmentId == departmentId.Value);

            var deptGroups = await query
                .GroupBy(sr => sr.DepartmentId)
                .Select(g => new
                {
                    DepartmentId = g.Key,
                    TotalRevenue = g.Sum(sr => sr.TotalAmount),
                    InsuranceRevenue = g.Sum(sr => sr.InsuranceAmount),
                    PatientRevenue = g.Sum(sr => sr.PatientAmount),
                    PatientCount = g.Select(sr => sr.MedicalRecordId).Distinct().Count(),
                    ServiceCount = g.Count()
                })
                .ToListAsync();

            // Load department names
            var deptIds = deptGroups.Select(d => d.DepartmentId).ToList();
            var departments = await _context.Departments.AsNoTracking()
                .Where(d => deptIds.Contains(d.Id))
                .ToDictionaryAsync(d => d.Id, d => new { d.DepartmentCode, d.DepartmentName });

            var byDepartment = deptGroups.Select(g =>
            {
                departments.TryGetValue(g.DepartmentId, out var dept);
                return new DeptRevenueItemDto
                {
                    DepartmentId = g.DepartmentId,
                    DepartmentCode = dept?.DepartmentCode ?? "",
                    DepartmentName = dept?.DepartmentName ?? "",
                    TotalRevenue = g.TotalRevenue,
                    InsuranceRevenue = g.InsuranceRevenue,
                    PatientRevenue = g.PatientRevenue,
                    ServiceRevenue = g.TotalRevenue - g.InsuranceRevenue - g.PatientRevenue,
                    PatientCount = g.PatientCount,
                    ServiceCount = g.ServiceCount
                };
            }).OrderByDescending(d => d.TotalRevenue).ToList();

            var totalRevenue = byDepartment.Sum(d => d.TotalRevenue);
            var totalInsurance = byDepartment.Sum(d => d.InsuranceRevenue);
            var totalPatient = byDepartment.Sum(d => d.PatientRevenue);

            return new List<RevenueByOrderingDeptDto>
            {
                new RevenueByOrderingDeptDto
                {
                    FromDate = fromDate,
                    ToDate = toDate,
                    TotalRevenue = totalRevenue,
                    InsuranceRevenue = totalInsurance,
                    PatientRevenue = totalPatient,
                    ServiceRevenue = totalRevenue - totalInsurance - totalPatient,
                    ByDepartment = byDepartment
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetRevenueByOrderingDeptAsync");
            return new List<RevenueByOrderingDeptDto>();
        }
    }

    // 11.2 Hach toan doanh thu khoa phong thuc hien
    public async Task<List<RevenueByExecutingDeptDto>> GetRevenueByExecutingDeptAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, string revenueType = null)
    {
        try
        {
            // Query ServiceRequests grouped by executing department (ExecuteDepartmentId)
            var query = _context.ServiceRequests.AsNoTracking()
                .Where(sr => sr.RequestDate >= fromDate && sr.RequestDate <= toDate && sr.Status != 4);

            if (departmentId.HasValue)
                query = query.Where(sr => sr.ExecuteDepartmentId == departmentId.Value);

            // Group by ExecuteDepartmentId; fallback to DepartmentId when null
            var deptGroups = await query
                .GroupBy(sr => sr.ExecuteDepartmentId ?? sr.DepartmentId)
                .Select(g => new
                {
                    DepartmentId = g.Key,
                    TotalRevenue = g.Sum(sr => sr.TotalAmount),
                    InsuranceRevenue = g.Sum(sr => sr.InsuranceAmount),
                    PatientRevenue = g.Sum(sr => sr.PatientAmount),
                    PatientCount = g.Select(sr => sr.MedicalRecordId).Distinct().Count(),
                    ServiceCount = g.Count()
                })
                .ToListAsync();

            var deptIds = deptGroups.Select(d => d.DepartmentId).ToList();
            var departments = await _context.Departments.AsNoTracking()
                .Where(d => deptIds.Contains(d.Id))
                .ToDictionaryAsync(d => d.Id, d => new { d.DepartmentCode, d.DepartmentName });

            var byDepartment = deptGroups.Select(g =>
            {
                departments.TryGetValue(g.DepartmentId, out var dept);
                return new DeptRevenueItemDto
                {
                    DepartmentId = g.DepartmentId,
                    DepartmentCode = dept?.DepartmentCode ?? "",
                    DepartmentName = dept?.DepartmentName ?? "",
                    TotalRevenue = g.TotalRevenue,
                    InsuranceRevenue = g.InsuranceRevenue,
                    PatientRevenue = g.PatientRevenue,
                    ServiceRevenue = g.TotalRevenue - g.InsuranceRevenue - g.PatientRevenue,
                    PatientCount = g.PatientCount,
                    ServiceCount = g.ServiceCount
                };
            }).OrderByDescending(d => d.TotalRevenue).ToList();

            var totalRevenue = byDepartment.Sum(d => d.TotalRevenue);
            var totalInsurance = byDepartment.Sum(d => d.InsuranceRevenue);
            var totalPatient = byDepartment.Sum(d => d.PatientRevenue);

            return new List<RevenueByExecutingDeptDto>
            {
                new RevenueByExecutingDeptDto
                {
                    FromDate = fromDate,
                    ToDate = toDate,
                    TotalRevenue = totalRevenue,
                    InsuranceRevenue = totalInsurance,
                    PatientRevenue = totalPatient,
                    ServiceRevenue = totalRevenue - totalInsurance - totalPatient,
                    ByDepartment = byDepartment
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetRevenueByExecutingDeptAsync");
            return new List<RevenueByExecutingDeptDto>();
        }
    }

    // 11.3 Hach toan doanh thu theo dich vu ky thuat
    public async Task<List<RevenueByServiceDto>> GetRevenueByServiceAsync(
        DateTime fromDate, DateTime toDate, Guid? serviceGroupId = null, Guid? serviceId = null)
    {
        try
        {
            // Query ServiceRequestDetails joined with ServiceRequest for date range
            var query = _context.ServiceRequestDetails.AsNoTracking()
                .Include(d => d.ServiceRequest)
                .Include(d => d.Service)
                    .ThenInclude(s => s.ServiceGroup)
                .Where(d => d.ServiceRequest.RequestDate >= fromDate
                         && d.ServiceRequest.RequestDate <= toDate
                         && d.ServiceRequest.Status != 4
                         && d.Status != 3); // exclude cancelled details

            if (serviceId.HasValue)
                query = query.Where(d => d.ServiceId == serviceId.Value);
            if (serviceGroupId.HasValue)
                query = query.Where(d => d.Service.ServiceGroupId == serviceGroupId.Value);

            var serviceGroups = await query
                .GroupBy(d => new { d.ServiceId, d.Service.ServiceCode, d.Service.ServiceName, GroupName = d.Service.ServiceGroup.GroupName })
                .Select(g => new ServiceRevenueItemDto
                {
                    ServiceId = g.Key.ServiceId,
                    ServiceCode = g.Key.ServiceCode,
                    ServiceName = g.Key.ServiceName,
                    ServiceGroup = g.Key.GroupName,
                    Quantity = g.Sum(d => d.Quantity),
                    UnitPrice = g.Average(d => d.UnitPrice),
                    TotalRevenue = g.Sum(d => d.Amount),
                    InsuranceRevenue = g.Sum(d => d.InsuranceAmount),
                    PatientRevenue = g.Sum(d => d.PatientAmount)
                })
                .OrderByDescending(s => s.TotalRevenue)
                .ToListAsync();

            return new List<RevenueByServiceDto>
            {
                new RevenueByServiceDto
                {
                    FromDate = fromDate,
                    ToDate = toDate,
                    TotalRevenue = serviceGroups.Sum(s => s.TotalRevenue),
                    ByService = serviceGroups
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetRevenueByServiceAsync");
            return new List<RevenueByServiceDto>();
        }
    }

    // 11.4 Hach toan doanh thu, loi nhuan PTTT
    public async Task<List<SurgeryProfitReportDto>> GetSurgeryProfitReportAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, Guid? surgeryId = null)
    {
        try
        {
            // Query ServiceRequests with RequestType == 4 (PTTT) for revenue
            var revenueQuery = _context.ServiceRequests.AsNoTracking()
                .Where(sr => sr.RequestType == 4
                          && sr.RequestDate >= fromDate && sr.RequestDate <= toDate
                          && sr.Status != 4);

            if (departmentId.HasValue)
                revenueQuery = revenueQuery.Where(sr => sr.DepartmentId == departmentId.Value);
            if (surgeryId.HasValue)
                revenueQuery = revenueQuery.Where(sr => sr.ServiceId == surgeryId.Value);

            // Group by ServiceId to get per-surgery revenue
            var revenueByService = await revenueQuery
                .Where(sr => sr.ServiceId.HasValue)
                .GroupBy(sr => new { ServiceId = sr.ServiceId.Value })
                .Select(g => new
                {
                    g.Key.ServiceId,
                    Count = g.Count(),
                    Revenue = g.Sum(sr => sr.TotalAmount)
                })
                .ToListAsync();

            // Load service details
            var serviceIds = revenueByService.Select(r => r.ServiceId).ToList();
            var services = await _context.Services.AsNoTracking()
                .Where(s => serviceIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => new { s.ServiceCode, s.ServiceName, s.SurgeryType });

            // Estimate cost: query PrescriptionDetails for surgery-related records in the period
            // (medicines + supplies used during surgery)
            var medicineCostByDept = await _context.PrescriptionDetails.AsNoTracking()
                .Include(pd => pd.Prescription)
                .Where(pd => pd.Prescription.PrescriptionDate >= fromDate
                          && pd.Prescription.PrescriptionDate <= toDate
                          && pd.Prescription.Status != 4)
                .GroupBy(pd => pd.Prescription.DepartmentId)
                .Select(g => new { DeptId = g.Key, Cost = g.Sum(pd => pd.Amount) })
                .ToDictionaryAsync(x => x.DeptId, x => x.Cost);

            var surgeryTypeNames = new Dictionary<int, string>
            {
                { 0, "Khong" }, { 1, "Dac biet" }, { 2, "Loai 1" }, { 3, "Loai 2" }, { 4, "Loai 3" }
            };

            var items = revenueByService.Select(r =>
            {
                services.TryGetValue(r.ServiceId, out var svc);
                var surgeryTypeName = svc != null && surgeryTypeNames.ContainsKey(svc.SurgeryType)
                    ? surgeryTypeNames[svc.SurgeryType] : "Khac";
                // Estimate medicine cost proportionally per surgery count
                var estimatedMedicineCost = r.Revenue * 0.15m; // 15% estimate for medicine/supply cost
                var estimatedLaborCost = r.Revenue * 0.30m;    // 30% estimate for labor cost
                var totalCost = estimatedMedicineCost + estimatedLaborCost;
                return new SurgeryProfitItemDto
                {
                    SurgeryCode = svc?.ServiceCode ?? "",
                    SurgeryName = svc?.ServiceName ?? "",
                    SurgeryType = surgeryTypeName,
                    Count = r.Count,
                    Revenue = r.Revenue,
                    MedicineCost = estimatedMedicineCost * 0.6m, // 60% medicine
                    SupplyCost = estimatedMedicineCost * 0.4m,   // 40% supply
                    LaborCost = estimatedLaborCost,
                    TotalCost = totalCost,
                    Profit = r.Revenue - totalCost
                };
            }).OrderByDescending(i => i.Revenue).ToList();

            var totalRevenue = items.Sum(i => i.Revenue);
            var totalCostAll = items.Sum(i => i.TotalCost);

            return new List<SurgeryProfitReportDto>
            {
                new SurgeryProfitReportDto
                {
                    FromDate = fromDate,
                    ToDate = toDate,
                    TotalRevenue = totalRevenue,
                    TotalCost = totalCostAll,
                    TotalProfit = totalRevenue - totalCostAll,
                    ProfitMargin = totalRevenue > 0 ? (totalRevenue - totalCostAll) / totalRevenue * 100 : 0,
                    Items = items
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSurgeryProfitReportAsync");
            return new List<SurgeryProfitReportDto>();
        }
    }

    // 11.5 Hach toan chi phi theo khoa phong → SystemCompleteService.M11.CostByDepartment.cs (QA-R3)

    // 11.6 Bao cao tong hop tai chinh
    public async Task<FinancialSummaryReportDto> GetFinancialSummaryReportAsync(
        DateTime fromDate, DateTime toDate)
    {
        try
        {
            // QA-R3: revenue = net money collected (shared rule: collected receipts, minus approved/paid refunds
            // that are not deposit refunds), inclusive last day. It used to take the larger of "receipts" and
            // "paid service requests" and dropped the whole last day.
            var toEnd = ReportPeriod.EndExclusive(toDate);
            var totalRevenue = await _context.Receipts.AsNoTracking()
                .Where(r => r.ReceiptDate >= fromDate && r.ReceiptDate < toEnd && !r.IsDeleted)
                .Where(ReportPeriod.CashReceipt)
                .SumAsync(r => (decimal?)(r.ReceiptType == 3 ? -r.FinalAmount : r.FinalAmount)) ?? 0;

            var cost = await ComputeFinancialCostsAsync(fromDate, toEnd);

            // Revenue by department
            var revenueByDeptData = await _context.ServiceRequests.AsNoTracking()
                .Where(sr => sr.RequestDate >= fromDate && sr.RequestDate <= toDate && sr.Status != 4)
                .GroupBy(sr => sr.DepartmentId)
                .Select(g => new
                {
                    DepartmentId = g.Key,
                    TotalRevenue = g.Sum(sr => sr.TotalAmount),
                    InsuranceRevenue = g.Sum(sr => sr.InsuranceAmount),
                    PatientRevenue = g.Sum(sr => sr.PatientAmount),
                    PatientCount = g.Select(sr => sr.MedicalRecordId).Distinct().Count(),
                    ServiceCount = g.Count()
                })
                .ToListAsync();

            var deptIds = revenueByDeptData.Select(d => d.DepartmentId).ToList();
            var departments = await _context.Departments.AsNoTracking()
                .Where(d => deptIds.Contains(d.Id))
                .ToDictionaryAsync(d => d.Id, d => new { d.DepartmentCode, d.DepartmentName });

            var revenueByDepartment = revenueByDeptData.Select(g =>
            {
                departments.TryGetValue(g.DepartmentId, out var dept);
                return new DeptRevenueItemDto
                {
                    DepartmentId = g.DepartmentId,
                    DepartmentCode = dept?.DepartmentCode ?? "",
                    DepartmentName = dept?.DepartmentName ?? "",
                    TotalRevenue = g.TotalRevenue,
                    InsuranceRevenue = g.InsuranceRevenue,
                    PatientRevenue = g.PatientRevenue,
                    ServiceRevenue = g.TotalRevenue - g.InsuranceRevenue - g.PatientRevenue,
                    PatientCount = g.PatientCount,
                    ServiceCount = g.ServiceCount
                };
            }).OrderByDescending(d => d.TotalRevenue).ToList();

            // Cost by department (from GetCostByDepartmentAsync)
            var costByDepartment = await GetCostByDepartmentAsync(fromDate, toDate);

            var missing = new List<string>();
            if (cost.MedicineCost == null) missing.Add("Giá vốn thuốc: lô xuất không có giá nhập");
            if (cost.UncostedLines > 0) missing.Add($"{cost.UncostedLines} dòng xuất kho chưa có giá nhập — không tính vào giá vốn");
            if (cost.PersonnelCost == null) missing.Add("Chi phí nhân sự: chưa có bảng lương đã duyệt cho các tháng trọn vẹn trong kỳ");
            if (cost.Depreciation == null) missing.Add("Khấu hao: chưa chạy khấu hao cho các tháng trọn vẹn trong kỳ");
            missing.Add("Chi phí vận hành (điện, nước, dịch vụ mua ngoài): chưa có nguồn dữ liệu");

            var cogs = cost.MedicineCost.HasValue || cost.SupplyCost.HasValue
                ? (cost.MedicineCost ?? 0) + (cost.SupplyCost ?? 0) : (decimal?)null;
            decimal? grossProfit = cogs.HasValue ? totalRevenue - cogs.Value : null;
            var parts = new[] { cost.MedicineCost, cost.SupplyCost, cost.PersonnelCost, cost.Depreciation };
            decimal? totalCost = parts.Any(p => p.HasValue) ? parts.Sum(p => p ?? 0) : null;
            // Operating cost has no source in HIS, so a true net profit cannot be computed.
            decimal? netProfit = null;

            return new FinancialSummaryReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                TotalRevenue = totalRevenue,
                TotalCost = totalCost,
                MedicineCost = cost.MedicineCost,
                SupplyCost = cost.SupplyCost,
                PersonnelCost = cost.PersonnelCost,
                Depreciation = cost.Depreciation,
                OperatingCost = null,
                GrossProfit = grossProfit,
                NetProfit = netProfit,
                ProfitMargin = grossProfit.HasValue && totalRevenue > 0 ? Math.Round(grossProfit.Value / totalRevenue * 100, 2) : null,
                UncostedDispensedLines = cost.UncostedLines,
                MissingData = missing,
                RevenueByDepartment = revenueByDepartment,
                CostByDepartment = costByDepartment
            };
        }
        catch (Exception ex)
        {
            // Surface the failure instead of a report of zeros that looks real.
            _logger.LogError(ex, "Error in GetFinancialSummaryReportAsync");
            throw;
        }
    }

    /// <summary>
    /// QA-R3: real cost components for [fromDate, toEnd).
    /// Medicine/supply = quantity dispensed to patients (non-cancelled OPD/IPD export receipts + completed retail
    /// sales) × import price of the lot it came from; lines whose lot has no import price are counted, not guessed.
    /// Personnel = approved payroll (base + allowance + other income) and depreciation = AssetDepreciations, both only
    /// for calendar months FULLY inside the period (a partial month cannot be apportioned honestly) — null otherwise.
    /// </summary>
    private async Task<(decimal? MedicineCost, decimal? SupplyCost, decimal? PersonnelCost, decimal? Depreciation, int UncostedLines)>
        ComputeFinancialCostsAsync(DateTime fromDate, DateTime toEnd)
    {
        var exportLines = await _context.ExportReceiptDetails.AsNoTracking()
            .Where(d => !d.IsDeleted && !d.ExportReceipt.IsDeleted && d.ExportReceipt.Status != 2
                && (d.ExportReceipt.ExportType == 1 || d.ExportReceipt.ExportType == 2)
                && d.ExportReceipt.ReceiptDate >= fromDate && d.ExportReceipt.ReceiptDate < toEnd)
            .Select(d => new
            {
                IsSupply = d.MedicineId == null && d.SupplyId != null,
                d.Quantity,
                ImportPrice = d.InventoryItem != null ? d.InventoryItem.ImportPrice : 0m,
            })
            .ToListAsync();

        // Retail sales: CreatedAt is UTC; the sale line keeps warehouse + batch → match the lot.
        var fromUtc = ReportPeriod.ToUtc(fromDate);
        var toUtc = ReportPeriod.ToUtc(toEnd);
        var saleLines = await _context.RetailSaleItems.AsNoTracking()
            .Where(i => !i.IsDeleted && !i.RetailSale!.IsDeleted && i.RetailSale!.Status == "Completed"
                && i.RetailSale!.CreatedAt >= fromUtc && i.RetailSale!.CreatedAt < toUtc)
            .Select(i => new
            {
                i.Quantity,
                ImportPrice = _context.InventoryItems
                    .Where(l => l.WarehouseId == i.WarehouseId && l.MedicineId == i.MedicineId && l.BatchNumber == i.BatchNumber)
                    .Select(l => (decimal?)l.ImportPrice).FirstOrDefault() ?? 0m,
            })
            .ToListAsync();

        var medLines = exportLines.Where(l => !l.IsSupply).Select(l => (l.Quantity, l.ImportPrice))
            .Concat(saleLines.Select(l => (l.Quantity, l.ImportPrice))).ToList();
        var supplyLines = exportLines.Where(l => l.IsSupply).Select(l => (l.Quantity, l.ImportPrice)).ToList();
        var uncosted = medLines.Count(l => l.ImportPrice <= 0) + supplyLines.Count(l => l.ImportPrice <= 0);

        static decimal? CostOf(List<(decimal Quantity, decimal ImportPrice)> lines) =>
            lines.Count == 0 ? 0m
            : lines.Any(l => l.ImportPrice > 0) ? lines.Where(l => l.ImportPrice > 0).Sum(l => l.Quantity * l.ImportPrice)
            : null;

        // Calendar months fully inside [fromDate, toEnd).
        var months = new List<(int Year, int Month)>();
        var m = new DateTime(fromDate.Year, fromDate.Month, 1);
        if (m < fromDate.Date) m = m.AddMonths(1);
        for (; m.AddMonths(1) <= toEnd.Date; m = m.AddMonths(1)) months.Add((m.Year, m.Month));

        decimal? personnel = null, depreciation = null;
        if (months.Count > 0)
        {
            var keys = months.Select(x => x.Year * 100 + x.Month).ToList();
            var payroll = await _context.PayrollPeriods.AsNoTracking()
                .Where(p => p.Status == 1 && keys.Contains(p.Year * 100 + p.Month))
                .Select(p => new { Key = p.Year * 100 + p.Month, Total = p.Items.Sum(i => (decimal?)(i.BaseSalary + i.Allowance + i.OtherIncome)) ?? 0m })
                .ToListAsync();
            // Only when EVERY month of the period has an approved payroll — otherwise the figure would be partial.
            if (keys.All(k => payroll.Any(p => p.Key == k)))
                personnel = payroll.Sum(p => p.Total);

            var dep = await _context.AssetDepreciations.AsNoTracking()
                .Where(d => !d.IsDeleted && keys.Contains(d.Year * 100 + d.Month))
                .Select(d => new { Key = d.Year * 100 + d.Month, d.DepreciationAmount })
                .ToListAsync();
            if (keys.All(k => dep.Any(d => d.Key == k)))
                depreciation = dep.Sum(d => d.DepreciationAmount);
        }

        return (CostOf(medLines), CostOf(supplyLines), personnel, depreciation, uncosted);
    }

    // 11.7 Bao cao cong no benh nhan
    public async Task<List<PatientDebtReportDto>> GetPatientDebtReportAsync(
        DateTime? fromDate = null, DateTime? toDate = null, string debtStatus = null)
    {
        try
        {
            // Patients with InvoiceSummaries that have RemainingAmount > 0
            var query = _context.InvoiceSummaries.AsNoTracking()
                .Include(inv => inv.MedicalRecord)
                    .ThenInclude(mr => mr.Patient)
                .Where(inv => inv.RemainingAmount > 0 || inv.Status == 0); // Unpaid or has remaining

            if (fromDate.HasValue)
                query = query.Where(inv => inv.InvoiceDate >= fromDate.Value);
            if (toDate.HasValue)
                query = query.Where(inv => inv.InvoiceDate <= toDate.Value);

            var invoices = await query.ToListAsync();

            // Group by patient
            var grouped = invoices
                .Where(inv => inv.MedicalRecord?.Patient != null)
                .GroupBy(inv => inv.MedicalRecord.PatientId)
                .Select(g =>
                {
                    var patient = g.First().MedicalRecord.Patient;
                    var totalDebt = g.Sum(inv => inv.TotalAmount);
                    var paidAmount = g.Sum(inv => inv.PaidAmount + inv.DepositAmount);
                    var remaining = g.Sum(inv => inv.RemainingAmount);
                    var lastPayment = g.Where(inv => inv.PaidAmount > 0)
                        .OrderByDescending(inv => inv.InvoiceDate)
                        .FirstOrDefault()?.InvoiceDate;
                    var status = remaining > 0 ? "ConNo" : "DaThanhToan";

                    return new PatientDebtReportDto
                    {
                        PatientId = patient.Id,
                        PatientCode = patient.PatientCode,
                        PatientName = patient.FullName,
                        TotalDebt = totalDebt,
                        PaidAmount = paidAmount,
                        RemainingAmount = remaining,
                        LastPaymentDate = lastPayment,
                        Status = status
                    };
                })
                .Where(p => debtStatus == null || p.Status == debtStatus)
                .OrderByDescending(p => p.RemainingAmount)
                .ToList();

            return grouped;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetPatientDebtReportAsync");
            return new List<PatientDebtReportDto>();
        }
    }

    // 11.8 Bao cao cong no bao hiem
    public async Task<List<InsuranceDebtReportDto>> GetInsuranceDebtReportAsync(
        DateTime fromDate, DateTime toDate, string insuranceCode = null)
    {
        try
        {
            var query = _context.InsuranceClaims.AsNoTracking()
                .Where(c => c.ServiceDate >= fromDate && c.ServiceDate <= toDate);

            if (!string.IsNullOrWhiteSpace(insuranceCode))
                query = query.Where(c => c.InsuranceNumber != null && c.InsuranceNumber.Contains(insuranceCode));

            // Group by month period
            var claims = await query.ToListAsync();

            var grouped = claims
                .GroupBy(c => c.ServiceDate.ToString("yyyy-MM"))
                .Select(g =>
                {
                    var totalClaim = g.Sum(c => c.TotalAmount);
                    var approved = g.Where(c => c.ClaimStatus == 2 || c.ClaimStatus == 5).Sum(c => c.InsuranceAmount);
                    var rejected = g.Where(c => c.ClaimStatus == 3 || c.ClaimStatus == 4).Sum(c => c.InsuranceAmount);
                    var pending = g.Where(c => c.ClaimStatus == 0 || c.ClaimStatus == 1).Sum(c => c.InsuranceAmount);

                    return new InsuranceDebtReportDto
                    {
                        Period = g.Key,
                        InsuranceCode = insuranceCode ?? "ALL",
                        TotalClaimAmount = totalClaim,
                        ApprovedAmount = approved,
                        RejectedAmount = rejected,
                        PendingAmount = pending,
                        ClaimCount = g.Count()
                    };
                })
                .OrderBy(r => r.Period)
                .ToList();

            return grouped;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetInsuranceDebtReportAsync");
            return new List<InsuranceDebtReportDto>();
        }
    }

    // 11.9 Doi chieu bao hiem
    public async Task<InsuranceReconciliationDto> GetInsuranceReconciliationAsync(
        DateTime fromDate, DateTime toDate, string insuranceCode = null)
    {
        try
        {
            var claimQuery = _context.InsuranceClaims.AsNoTracking()
                .Include(c => c.Patient)
                .Where(c => c.ServiceDate >= fromDate && c.ServiceDate <= toDate);

            if (!string.IsNullOrWhiteSpace(insuranceCode))
                claimQuery = claimQuery.Where(c => c.InsuranceNumber != null && c.InsuranceNumber.Contains(insuranceCode));

            var claims = await claimQuery.ToListAsync();

            // Hospital amount = what hospital calculates as insurance-covered
            // Insurance amount = what insurance actually approved/paid
            var items = claims.Select(c => new ReconciliationItemDto
            {
                PatientCode = c.Patient?.PatientCode ?? "",
                PatientName = c.Patient?.FullName ?? "",
                HospitalAmount = c.TotalAmount * (c.InsurancePaymentRate / 100m),
                InsuranceAmount = c.InsuranceAmount,
                Difference = (c.TotalAmount * (c.InsurancePaymentRate / 100m)) - c.InsuranceAmount,
                Reason = c.ClaimStatus == 3 ? "Tu choi mot phan"
                       : c.ClaimStatus == 4 ? "Tu choi toan bo"
                       : (c.TotalAmount * (c.InsurancePaymentRate / 100m)) != c.InsuranceAmount ? "Chenh lech"
                       : ""
            })
            .Where(i => Math.Abs(i.Difference) > 0.01m) // Only show items with difference
            .OrderByDescending(i => Math.Abs(i.Difference))
            .ToList();

            var hospitalTotal = claims.Sum(c => c.TotalAmount * (c.InsurancePaymentRate / 100m));
            var insuranceTotal = claims.Sum(c => c.InsuranceAmount);

            return new InsuranceReconciliationDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                HospitalAmount = hospitalTotal,
                InsuranceAmount = insuranceTotal,
                Difference = hospitalTotal - insuranceTotal,
                Items = items
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetInsuranceReconciliationAsync");
            return new InsuranceReconciliationDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                HospitalAmount = 0,
                InsuranceAmount = 0,
                Difference = 0,
                Items = new List<ReconciliationItemDto>()
            };
        }
    }

    // 11.10 In bao cao tai chinh
    public async Task<byte[]> PrintFinancialReportAsync(FinancialReportRequest request)
    {
        // QA-R3: every report type used to print one receipts-by-day table (UTC CreatedAt, cancelled receipts and
        // refunds of any status counted, last day dropped) as HTML served under application/pdf. Each type now
        // reads its own data; format follows request.OutputFormat; unknown type → ArgumentException (400).
        var table = await BuildFinancialReportTableAsync(request);
        return Export.ReportFileRenderer.Render(table, request.OutputFormat).Content;
    }

    // 11.11 Xuat bao cao tai chinh Excel
    public async Task<byte[]> ExportFinancialReportToExcelAsync(FinancialReportRequest request)
    {
        // QA-R3: was the print HTML served as .xlsx (Excel refused to open it).
        var table = await BuildFinancialReportTableAsync(request);
        return Export.ReportFileRenderer.ToXlsx(table);
    }

    private async Task<Export.ReportTable> BuildFinancialReportTableAsync(FinancialReportRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ReportType))
            throw new ArgumentException("Thiếu loại báo cáo tài chính (reportType).");
        if (request.ToDate.Date < request.FromDate.Date)
            throw new ArgumentException("Đến ngày phải sau hoặc bằng từ ngày.");
        var subtitle = $"Từ {request.FromDate:dd/MM/yyyy} đến {request.ToDate:dd/MM/yyyy}";

        if (HospitalReportService.IsKnownReport(request.ReportType))
        {
            var result = await _hospitalReports.GetReportDataAsync(request.ReportType, request.FromDate, request.ToDate, request.DepartmentId, null);
            return Export.ReportFileRenderer.FromHospitalReport(result, subtitle);
        }

        switch (request.ReportType.Trim().ToLowerInvariant())
        {
            case "revenue":
            {
                // Net money collected per business day (same rule as the other revenue reports).
                var toEnd = ReportPeriod.EndExclusive(request.ToDate);
                var query = _context.Receipts.AsNoTracking()
                    .Where(r => r.ReceiptDate >= request.FromDate && r.ReceiptDate < toEnd && !r.IsDeleted)
                    .Where(ReportPeriod.CashReceipt);
                if (request.DepartmentId.HasValue)
                    query = query.Where(r => r.MedicalRecord != null && r.MedicalRecord.DepartmentId == request.DepartmentId);
                var days = await query
                    .GroupBy(r => r.ReceiptDate.Date)
                    .Select(g => new
                    {
                        Date = g.Key,
                        Count = g.Count(r => r.ReceiptType != 3),
                        Revenue = g.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount),
                        Refund = g.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount),
                    })
                    .OrderBy(x => x.Date)
                    .ToListAsync();
                var rows = days.Select(d => (IReadOnlyList<object?>)new object?[] { d.Date, d.Count, d.Revenue, d.Refund, d.Revenue - d.Refund }).ToList();
                if (rows.Count > 0)
                    rows.Add(new object?[] { "TỔNG CỘNG", days.Sum(d => d.Count), days.Sum(d => d.Revenue), days.Sum(d => d.Refund), days.Sum(d => d.Revenue - d.Refund) });
                return new Export.ReportTable("BÁO CÁO DOANH THU", subtitle,
                    new[] { "Ngày", "Số phiếu thu", "Doanh thu", "Hoàn trả", "Thực thu" }, rows);
            }
            case "summary":
            case "expense":
            case "cost":
            {
                var s = await GetFinancialSummaryReportAsync(request.FromDate, request.ToDate);
                object? V(decimal? v) => v.HasValue ? v.Value : Export.ReportFileRenderer.NoData;
                var lines = new List<(string, object?)>();
                if (request.ReportType.Trim().ToLowerInvariant() == "summary")
                    lines.Add(("Tổng doanh thu (thực thu)", s.TotalRevenue));
                lines.AddRange(new (string, object?)[]
                {
                    ("Giá vốn thuốc", V(s.MedicineCost)), ("Giá vốn vật tư", V(s.SupplyCost)),
                    ("Chi phí nhân sự", V(s.PersonnelCost)), ("Khấu hao tài sản", V(s.Depreciation)),
                    ("Chi phí vận hành", V(s.OperatingCost)), ("Tổng chi phí (các khoản có dữ liệu)", V(s.TotalCost)),
                });
                if (request.ReportType.Trim().ToLowerInvariant() == "summary")
                    lines.AddRange(new (string, object?)[] { ("Lợi nhuận gộp", V(s.GrossProfit)), ("Lợi nhuận ròng", V(s.NetProfit)) });
                lines.AddRange(s.MissingData.Select(m => ("Ghi chú", (object?)m)));
                return new Export.ReportTable(
                    request.ReportType.Trim().ToLowerInvariant() == "summary" ? "BÁO CÁO TỔNG HỢP TÀI CHÍNH" : "BÁO CÁO CHI PHÍ",
                    subtitle, new[] { "Khoản mục", "Giá trị" },
                    lines.Select(l => (IReadOnlyList<object?>)new object?[] { l.Item1, l.Item2 }).ToList());
            }
            case "revenue_dept":
                return Export.ReportFileRenderer.FromItems("DOANH THU THEO KHOA CHỈ ĐỊNH", subtitle,
                    await GetRevenueByOrderingDeptAsync(request.FromDate, request.ToDate, request.DepartmentId));
            case "revenue_service":
                return Export.ReportFileRenderer.FromItems("DOANH THU THEO DỊCH VỤ", subtitle,
                    await GetRevenueByServiceAsync(request.FromDate, request.ToDate, null, request.ServiceId));
            case "surgery_profit":
                return Export.ReportFileRenderer.FromItems("LỢI NHUẬN PHẪU THUẬT", subtitle,
                    await GetSurgeryProfitReportAsync(request.FromDate, request.ToDate, request.DepartmentId));
            case "debt":
                return Export.ReportFileRenderer.FromItems("CÔNG NỢ BỆNH NHÂN", subtitle,
                    await GetPatientDebtReportAsync(request.FromDate, request.ToDate));
            case "insurance":
                return Export.ReportFileRenderer.FromItems("CÔNG NỢ BHYT", subtitle,
                    await GetInsuranceDebtReportAsync(request.FromDate, request.ToDate));
            default:
                throw new ArgumentException($"Loại báo cáo tài chính '{request.ReportType}' không được hỗ trợ.");
        }
    }

    #endregion
}
