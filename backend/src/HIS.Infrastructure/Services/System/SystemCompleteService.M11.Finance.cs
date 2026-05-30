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

    // 11.5 Hach toan chi phi theo khoa phong
    public async Task<List<CostByDepartmentDto>> GetCostByDepartmentAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, string costType = null)
    {
        try
        {
            // Medicine cost from PrescriptionDetails grouped by department
            var medicineCostQuery = _context.PrescriptionDetails.AsNoTracking()
                .Include(pd => pd.Prescription)
                .Where(pd => pd.Prescription.PrescriptionDate >= fromDate
                          && pd.Prescription.PrescriptionDate <= toDate
                          && pd.Prescription.Status != 4);

            if (departmentId.HasValue)
                medicineCostQuery = medicineCostQuery.Where(pd => pd.Prescription.DepartmentId == departmentId.Value);

            var medicineCostByDept = await medicineCostQuery
                .GroupBy(pd => pd.Prescription.DepartmentId)
                .Select(g => new { DeptId = g.Key, Cost = g.Sum(pd => pd.Amount) })
                .ToDictionaryAsync(x => x.DeptId, x => x.Cost);

            // Supply cost from ReceiptDetails where ItemType == 3 (Vat tu)
            var supplyCostQuery = _context.ReceiptDetails.AsNoTracking()
                .Include(rd => rd.Receipt)
                .Where(rd => rd.Receipt.ReceiptDate >= fromDate
                          && rd.Receipt.ReceiptDate <= toDate
                          && rd.Receipt.Status == 1 // Da thu
                          && rd.ItemType == 3); // Vat tu

            // Service cost from ServiceRequests
            var serviceCostQuery = _context.ServiceRequests.AsNoTracking()
                .Where(sr => sr.RequestDate >= fromDate && sr.RequestDate <= toDate && sr.Status != 4);

            if (departmentId.HasValue)
                serviceCostQuery = serviceCostQuery.Where(sr => sr.DepartmentId == departmentId.Value);

            var serviceCostByDept = await serviceCostQuery
                .GroupBy(sr => sr.DepartmentId)
                .Select(g => new { DeptId = g.Key, Cost = g.Sum(sr => sr.TotalAmount) })
                .ToDictionaryAsync(x => x.DeptId, x => x.Cost);

            // Get all relevant department IDs
            var allDeptIds = medicineCostByDept.Keys
                .Union(serviceCostByDept.Keys)
                .Distinct().ToList();

            if (departmentId.HasValue && !allDeptIds.Contains(departmentId.Value))
                allDeptIds.Add(departmentId.Value);

            var departments = await _context.Departments.AsNoTracking()
                .Where(d => allDeptIds.Contains(d.Id))
                .ToDictionaryAsync(d => d.Id, d => new { d.DepartmentCode, d.DepartmentName });

            var result = allDeptIds.Select(deptId =>
            {
                departments.TryGetValue(deptId, out var dept);
                medicineCostByDept.TryGetValue(deptId, out var medCost);
                serviceCostByDept.TryGetValue(deptId, out var svcCost);
                var totalCost = medCost + svcCost;
                return new CostByDepartmentDto
                {
                    DepartmentId = deptId,
                    DepartmentCode = dept?.DepartmentCode ?? "",
                    DepartmentName = dept?.DepartmentName ?? "",
                    TotalCost = totalCost,
                    MedicineCost = medCost,
                    SupplyCost = 0, // Separate supply tracking not available from current schema
                    EquipmentCost = 0,
                    PersonnelCost = 0,
                    OverheadCost = 0
                };
            })
            .Where(c => costType == null || c.TotalCost > 0)
            .OrderByDescending(c => c.TotalCost)
            .ToList();

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetCostByDepartmentAsync");
            return new List<CostByDepartmentDto>();
        }
    }

    // 11.6 Bao cao tong hop tai chinh
    public async Task<FinancialSummaryReportDto> GetFinancialSummaryReportAsync(
        DateTime fromDate, DateTime toDate)
    {
        try
        {
            // Total revenue from Receipts (ReceiptType == 2 = Thanh toan, Status == 1 = Da thu)
            var receiptRevenue = await _context.Receipts.AsNoTracking()
                .Where(r => r.ReceiptDate >= fromDate && r.ReceiptDate <= toDate
                         && r.ReceiptType == 2 && r.Status == 1)
                .SumAsync(r => (decimal?)r.FinalAmount) ?? 0;

            // Total revenue from ServiceRequests (paid)
            var serviceRevenue = await _context.ServiceRequests.AsNoTracking()
                .Where(sr => sr.RequestDate >= fromDate && sr.RequestDate <= toDate
                          && sr.Status != 4 && sr.IsPaid)
                .SumAsync(sr => (decimal?)sr.TotalAmount) ?? 0;

            // Use the larger of the two as total revenue (avoid double counting)
            var totalRevenue = Math.Max(receiptRevenue, serviceRevenue);
            if (totalRevenue == 0) totalRevenue = receiptRevenue + serviceRevenue;

            // Total cost from PrescriptionDetails (medicine dispensed)
            var medicineCost = await _context.PrescriptionDetails.AsNoTracking()
                .Include(pd => pd.Prescription)
                .Where(pd => pd.Prescription.PrescriptionDate >= fromDate
                          && pd.Prescription.PrescriptionDate <= toDate
                          && pd.Prescription.Status != 4)
                .SumAsync(pd => (decimal?)pd.Amount) ?? 0;

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

            var totalCost = medicineCost; // Primary cost driver
            var grossProfit = totalRevenue - totalCost;

            return new FinancialSummaryReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                TotalRevenue = totalRevenue,
                TotalCost = totalCost,
                GrossProfit = grossProfit,
                NetProfit = grossProfit * 0.8m, // Estimate 80% of gross after overheads
                RevenueByDepartment = revenueByDepartment,
                CostByDepartment = costByDepartment
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetFinancialSummaryReportAsync");
            return new FinancialSummaryReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                TotalRevenue = 0,
                TotalCost = 0,
                GrossProfit = 0,
                NetProfit = 0,
                RevenueByDepartment = new List<DeptRevenueItemDto>(),
                CostByDepartment = new List<CostByDepartmentDto>()
            };
        }
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
        try
        {
            var query = _context.Set<Receipt>().AsNoTracking()
                .Where(r => r.CreatedAt >= request.FromDate && r.CreatedAt <= request.ToDate && !r.IsDeleted);
            if (request.DepartmentId.HasValue)
                query = query.Where(r => r.MedicalRecord != null && r.MedicalRecord.DepartmentId == request.DepartmentId);

            var receipts = await query.Include(r => r.MedicalRecord).ThenInclude(m => m.Patient).ToListAsync();

            var totalRevenue = receipts.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount);
            var totalRefund = receipts.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount);
            var net = totalRevenue - totalRefund;

            var grouped = receipts.GroupBy(r => r.CreatedAt.Date).OrderBy(g => g.Key)
                .Select(g => new string[] {
                    g.Key.ToString("dd/MM/yyyy"),
                    g.Count(r => r.ReceiptType != 3).ToString(),
                    g.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount).ToString("N0"),
                    g.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount).ToString("N0"),
                    (g.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount) - g.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount)).ToString("N0")
                }).ToList();

            grouped.Add(new[] { "TONG CONG", receipts.Count(r => r.ReceiptType != 3).ToString(), totalRevenue.ToString("N0"), totalRefund.ToString("N0"), net.ToString("N0") });

            var html = BuildTableReport(
                $"BAO CAO TAI CHINH - {request.ReportType?.ToUpper() ?? "TONG HOP"}",
                $"Tu {request.FromDate:dd/MM/yyyy} den {request.ToDate:dd/MM/yyyy}",
                DateTime.Now,
                new[] { "Ngay", "So phieu", "Doanh thu", "Hoan tra", "Thuc thu" },
                grouped);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    // 11.11 Xuat bao cao tai chinh Excel
    public async Task<byte[]> ExportFinancialReportToExcelAsync(FinancialReportRequest request)
    {
        return await PrintFinancialReportAsync(request);
    }

    #endregion
}
