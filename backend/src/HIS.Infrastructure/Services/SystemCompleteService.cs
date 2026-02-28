using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of ISystemCompleteService
/// Covers Modules: 11 (Tai chinh), 13 (Danh muc), 15 (Bao cao Duoc), 16 (HSBA & Thong ke), 17 (Quan tri)
/// </summary>
public class SystemCompleteService : ISystemCompleteService
{
    private readonly HISDbContext _context;
    private readonly ILogger<SystemCompleteService> _logger;

    public SystemCompleteService(HISDbContext context, ILogger<SystemCompleteService> logger)
    {
        _context = context;
        _logger = logger;
    }

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

    #region Module 13: Quan ly Danh muc - 17 chuc nang

    // 13.1 Danh muc dich vu kham
    public async Task<List<ExaminationServiceCatalogDto>> GetExaminationServicesAsync(
        string keyword = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Services.AsNoTracking()
                .Where(s => s.ServiceType == 1); // 1 = Kham

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(s => s.ServiceName.Contains(keyword) || s.ServiceCode.Contains(keyword));
            if (isActive.HasValue)
                query = query.Where(s => s.IsActive == isActive.Value);

            var items = await query.OrderBy(s => s.DisplayOrder).ThenBy(s => s.ServiceCode).ToListAsync();
            return items.Select(s => new ExaminationServiceCatalogDto
            {
                Id = s.Id,
                Code = s.ServiceCode,
                Name = s.ServiceName,
                EquivalentCode = s.ServiceCodeBYT,
                Price = s.UnitPrice,
                InsurancePrice = s.InsurancePrice,
                IsActive = s.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetExaminationServicesAsync");
            return new List<ExaminationServiceCatalogDto>();
        }
    }

    public async Task<ExaminationServiceCatalogDto> GetExaminationServiceAsync(Guid serviceId)
    {
        try
        {
            var s = await _context.Services.AsNoTracking().FirstOrDefaultAsync(x => x.Id == serviceId);
            if (s == null) return null;
            return new ExaminationServiceCatalogDto
            {
                Id = s.Id,
                Code = s.ServiceCode,
                Name = s.ServiceName,
                EquivalentCode = s.ServiceCodeBYT,
                Price = s.UnitPrice,
                InsurancePrice = s.InsurancePrice,
                IsActive = s.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetExaminationServiceAsync");
            return null;
        }
    }

    public async Task<ExaminationServiceCatalogDto> SaveExaminationServiceAsync(ExaminationServiceCatalogDto dto)
    {
        try
        {
            Service entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Service
                {
                    ServiceCode = dto.Code ?? string.Empty,
                    ServiceName = dto.Name ?? string.Empty,
                    ServiceCodeBYT = dto.EquivalentCode,
                    UnitPrice = dto.Price,
                    InsurancePrice = dto.InsurancePrice,
                    ServiceType = 1, // Kham
                    IsActive = dto.IsActive,
                    ServiceGroupId = await GetDefaultServiceGroupIdAsync()
                };
                _context.Services.Add(entity);
            }
            else
            {
                entity = await _context.Services.FirstOrDefaultAsync(s => s.Id == dto.Id);
                if (entity == null) return null;
                entity.ServiceCode = dto.Code ?? entity.ServiceCode;
                entity.ServiceName = dto.Name ?? entity.ServiceName;
                entity.ServiceCodeBYT = dto.EquivalentCode;
                entity.UnitPrice = dto.Price;
                entity.InsurancePrice = dto.InsurancePrice;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveExaminationServiceAsync");
            return null;
        }
    }

    public async Task<bool> DeleteExaminationServiceAsync(Guid serviceId)
    {
        try
        {
            var entity = await _context.Services.FirstOrDefaultAsync(s => s.Id == serviceId);
            if (entity == null) return false;
            entity.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in DeleteExaminationServiceAsync");
            return false;
        }
    }

    // 13.2 Danh muc dich vu can lam sang
    public async Task<List<ParaclinicalServiceCatalogDto>> GetParaclinicalServicesAsync(
        string keyword = null, string serviceType = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Services.AsNoTracking()
                .Where(s => s.ServiceType >= 2 && s.ServiceType <= 5); // XN, CDHA, TDCN, PTTT

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(s => s.ServiceName.Contains(keyword) || s.ServiceCode.Contains(keyword));
            if (isActive.HasValue)
                query = query.Where(s => s.IsActive == isActive.Value);

            var items = await query.OrderBy(s => s.DisplayOrder).ThenBy(s => s.ServiceCode).ToListAsync();
            return items.Select(s => new ParaclinicalServiceCatalogDto
            {
                Id = s.Id,
                Code = s.ServiceCode,
                Name = s.ServiceName,
                ServiceType = s.ServiceType.ToString(),
                UnitPrice = s.UnitPrice,
                InsurancePrice = s.InsurancePrice,
                IsActive = s.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetParaclinicalServicesAsync");
            return new List<ParaclinicalServiceCatalogDto>();
        }
    }

    public async Task<ParaclinicalServiceCatalogDto> GetParaclinicalServiceAsync(Guid serviceId)
    {
        try
        {
            var s = await _context.Services.AsNoTracking().FirstOrDefaultAsync(x => x.Id == serviceId);
            if (s == null) return null;
            return new ParaclinicalServiceCatalogDto
            {
                Id = s.Id,
                Code = s.ServiceCode,
                Name = s.ServiceName,
                ServiceType = s.ServiceType.ToString(),
                UnitPrice = s.UnitPrice,
                InsurancePrice = s.InsurancePrice,
                IsActive = s.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetParaclinicalServiceAsync");
            return null;
        }
    }

    public async Task<ParaclinicalServiceCatalogDto> SaveParaclinicalServiceAsync(ParaclinicalServiceCatalogDto dto)
    {
        try
        {
            Service entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Service
                {
                    ServiceCode = dto.Code ?? string.Empty,
                    ServiceName = dto.Name ?? string.Empty,
                    UnitPrice = dto.UnitPrice,
                    InsurancePrice = dto.InsurancePrice ?? 0,
                    ServiceType = int.TryParse(dto.ServiceType, out var st) ? st : 2,
                    IsActive = dto.IsActive,
                    ServiceGroupId = await GetDefaultServiceGroupIdAsync()
                };
                _context.Services.Add(entity);
            }
            else
            {
                entity = await _context.Services.FirstOrDefaultAsync(s => s.Id == dto.Id);
                if (entity == null) return null;
                entity.ServiceCode = dto.Code ?? entity.ServiceCode;
                entity.ServiceName = dto.Name ?? entity.ServiceName;
                entity.UnitPrice = dto.UnitPrice;
                entity.InsurancePrice = dto.InsurancePrice ?? entity.InsurancePrice;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveParaclinicalServiceAsync");
            return null;
        }
    }

    public async Task<bool> DeleteParaclinicalServiceAsync(Guid serviceId)
    {
        return await SoftDeleteEntityAsync<Service>(serviceId);
    }

    // 13.3 Danh muc thuoc
    public async Task<List<MedicineCatalogDto>> GetMedicinesAsync(MedicineCatalogSearchDto search)
    {
        try
        {
            var query = _context.Medicines.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search?.Keyword))
                query = query.Where(m => m.MedicineName.Contains(search.Keyword) || m.MedicineCode.Contains(search.Keyword));
            if (search?.IsActive.HasValue == true)
                query = query.Where(m => m.IsActive == search.IsActive.Value);
            if (search?.IsNarcotic.HasValue == true)
                query = query.Where(m => m.IsNarcotic == search.IsNarcotic.Value);
            if (search?.IsPsychotropic.HasValue == true)
                query = query.Where(m => m.IsPsychotropic == search.IsPsychotropic.Value);
            if (search?.IsPrecursor.HasValue == true)
                query = query.Where(m => m.IsPrecursor == search.IsPrecursor.Value);
            if (search?.IsAntibiotic.HasValue == true)
                query = query.Where(m => m.IsAntibiotic == search.IsAntibiotic.Value);
            if (search?.MedicineGroupId.HasValue == true)
                query = query.Where(m => m.MedicineGroupId == search.MedicineGroupId.Value);

            // Paging
            if (search?.PageIndex.HasValue == true && search?.PageSize.HasValue == true)
            {
                var skip = (search.PageIndex.Value) * search.PageSize.Value;
                query = query.Skip(skip).Take(search.PageSize.Value);
            }
            else
            {
                query = query.Take(500); // default limit
            }

            var items = await query.OrderBy(m => m.MedicineCode).ToListAsync();
            return items.Select(m => MapMedicineToDto(m)).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicinesAsync");
            return new List<MedicineCatalogDto>();
        }
    }

    public async Task<MedicineCatalogDto> GetMedicineAsync(Guid medicineId)
    {
        try
        {
            var m = await _context.Medicines.AsNoTracking().FirstOrDefaultAsync(x => x.Id == medicineId);
            return m == null ? null : MapMedicineToDto(m);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicineAsync");
            return null;
        }
    }

    public async Task<MedicineCatalogDto> SaveMedicineAsync(MedicineCatalogDto dto)
    {
        try
        {
            Medicine entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Medicine
                {
                    MedicineCode = dto.Code ?? string.Empty,
                    MedicineName = dto.Name ?? string.Empty,
                    MedicineCodeBYT = dto.EquivalentCode,
                    RegistrationNumber = dto.RegistrationNumber,
                    ActiveIngredient = dto.ActiveIngredientName,
                    Concentration = dto.Concentration,
                    Unit = dto.Unit,
                    PackageUnit = dto.PackageUnit,
                    Manufacturer = dto.Manufacturer,
                    Country = dto.Country,
                    UnitPrice = dto.Price,
                    InsurancePrice = dto.InsurancePrice,
                    IsNarcotic = dto.IsNarcotic,
                    IsPsychotropic = dto.IsPsychotropic,
                    IsPrecursor = dto.IsPrecursor,
                    IsActive = dto.IsActive,
                    MedicineGroupId = dto.ActiveIngredientId // map if available
                };
                _context.Medicines.Add(entity);
            }
            else
            {
                entity = await _context.Medicines.FirstOrDefaultAsync(m => m.Id == dto.Id);
                if (entity == null) return null;
                entity.MedicineCode = dto.Code ?? entity.MedicineCode;
                entity.MedicineName = dto.Name ?? entity.MedicineName;
                entity.MedicineCodeBYT = dto.EquivalentCode;
                entity.RegistrationNumber = dto.RegistrationNumber;
                entity.ActiveIngredient = dto.ActiveIngredientName;
                entity.Concentration = dto.Concentration;
                entity.Unit = dto.Unit;
                entity.PackageUnit = dto.PackageUnit;
                entity.Manufacturer = dto.Manufacturer;
                entity.Country = dto.Country;
                entity.UnitPrice = dto.Price;
                entity.InsurancePrice = dto.InsurancePrice;
                entity.IsNarcotic = dto.IsNarcotic;
                entity.IsPsychotropic = dto.IsPsychotropic;
                entity.IsPrecursor = dto.IsPrecursor;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveMedicineAsync");
            return null;
        }
    }

    public async Task<bool> DeleteMedicineAsync(Guid medicineId)
    {
        return await SoftDeleteEntityAsync<Medicine>(medicineId);
    }

    public async Task<bool> ImportMedicinesFromExcelAsync(byte[] fileData)
    {
        // Excel import not implemented yet
        _logger.LogWarning("ImportMedicinesFromExcelAsync: Not implemented");
        return false;
    }

    public async Task<byte[]> ExportMedicinesToExcelAsync(MedicineCatalogSearchDto search)
    {
        try
        {
            var query = _context.Medicines.AsNoTracking().Where(m => !m.IsDeleted);
            if (!string.IsNullOrWhiteSpace(search?.Keyword))
                query = query.Where(m => m.MedicineName.Contains(search.Keyword) || m.MedicineCode.Contains(search.Keyword));
            if (search?.IsActive.HasValue == true)
                query = query.Where(m => m.IsActive == search.IsActive);
            var medicines = await query.OrderBy(m => m.MedicineName).Take(2000).ToListAsync();

            var rows = medicines.Select(m => new string[] {
                m.MedicineCode, m.MedicineName, m.ActiveIngredient ?? "", m.Unit ?? "",
                m.Concentration ?? "", m.Manufacturer ?? "", m.IsActive ? "Co" : "Khong"
            }).ToList();

            var html = BuildTableReport("DANH MUC THUOC", $"Tong: {medicines.Count} thuoc", DateTime.Now,
                new[] { "Ma thuoc", "Ten thuoc", "Hoat chat", "DVT", "Ham luong", "Hang SX", "Hoat dong" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    // 13.4 Danh muc vat tu y te
    public async Task<List<MedicalSupplyCatalogDto>> GetMedicalSuppliesAsync(
        string keyword = null, Guid? categoryId = null, bool? isActive = null)
    {
        try
        {
            var query = _context.MedicalSupplies.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(s => s.SupplyName.Contains(keyword) || s.SupplyCode.Contains(keyword));
            if (isActive.HasValue)
                query = query.Where(s => s.IsActive == isActive.Value);

            var items = await query.OrderBy(s => s.SupplyCode).Take(500).ToListAsync();
            return items.Select(s => new MedicalSupplyCatalogDto
            {
                Id = s.Id,
                Code = s.SupplyCode,
                Name = s.SupplyName,
                EquivalentCode = s.SupplyCodeBYT,
                RegistrationNumber = s.RegistrationNumber,
                Specification = s.Specification,
                Unit = s.Unit,
                Manufacturer = s.Manufacturer,
                Country = s.ManufacturerCountry,
                Price = s.UnitPrice,
                InsurancePrice = s.InsurancePrice,
                IsActive = s.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicalSuppliesAsync");
            return new List<MedicalSupplyCatalogDto>();
        }
    }

    public async Task<MedicalSupplyCatalogDto> GetMedicalSupplyAsync(Guid supplyId)
    {
        try
        {
            var s = await _context.MedicalSupplies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == supplyId);
            if (s == null) return null;
            return new MedicalSupplyCatalogDto
            {
                Id = s.Id,
                Code = s.SupplyCode,
                Name = s.SupplyName,
                EquivalentCode = s.SupplyCodeBYT,
                RegistrationNumber = s.RegistrationNumber,
                Specification = s.Specification,
                Unit = s.Unit,
                Manufacturer = s.Manufacturer,
                Country = s.ManufacturerCountry,
                Price = s.UnitPrice,
                InsurancePrice = s.InsurancePrice,
                IsActive = s.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicalSupplyAsync");
            return null;
        }
    }

    public async Task<MedicalSupplyCatalogDto> SaveMedicalSupplyAsync(MedicalSupplyCatalogDto dto)
    {
        try
        {
            MedicalSupply entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new MedicalSupply
                {
                    SupplyCode = dto.Code ?? string.Empty,
                    SupplyName = dto.Name ?? string.Empty,
                    SupplyCodeBYT = dto.EquivalentCode,
                    RegistrationNumber = dto.RegistrationNumber,
                    Specification = dto.Specification,
                    Unit = dto.Unit,
                    Manufacturer = dto.Manufacturer,
                    ManufacturerCountry = dto.Country,
                    UnitPrice = dto.Price,
                    InsurancePrice = dto.InsurancePrice,
                    IsActive = dto.IsActive
                };
                _context.MedicalSupplies.Add(entity);
            }
            else
            {
                entity = await _context.MedicalSupplies.FirstOrDefaultAsync(s => s.Id == dto.Id);
                if (entity == null) return null;
                entity.SupplyCode = dto.Code ?? entity.SupplyCode;
                entity.SupplyName = dto.Name ?? entity.SupplyName;
                entity.SupplyCodeBYT = dto.EquivalentCode;
                entity.RegistrationNumber = dto.RegistrationNumber;
                entity.Specification = dto.Specification;
                entity.Unit = dto.Unit;
                entity.Manufacturer = dto.Manufacturer;
                entity.ManufacturerCountry = dto.Country;
                entity.UnitPrice = dto.Price;
                entity.InsurancePrice = dto.InsurancePrice;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveMedicalSupplyAsync");
            return null;
        }
    }

    public async Task<bool> DeleteMedicalSupplyAsync(Guid supplyId)
    {
        return await SoftDeleteEntityAsync<MedicalSupply>(supplyId);
    }

    public async Task<bool> ImportMedicalSuppliesFromExcelAsync(byte[] fileData)
    {
        _logger.LogWarning("ImportMedicalSuppliesFromExcelAsync: Not implemented");
        return false;
    }

    public async Task<byte[]> ExportMedicalSuppliesToExcelAsync(string keyword = null, Guid? categoryId = null)
    {
        try
        {
            var query = _context.MedicalSupplies.AsNoTracking().Where(s => !s.IsDeleted);
            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(s => s.SupplyName.Contains(keyword) || s.SupplyCode.Contains(keyword));
            var supplies = await query.OrderBy(s => s.SupplyName).Take(2000).ToListAsync();

            var rows = supplies.Select(s => new string[] {
                s.SupplyCode, s.SupplyName, s.Unit ?? "", s.Manufacturer ?? "",
                s.ManufacturerCountry ?? "", s.IsActive ? "Co" : "Khong"
            }).ToList();

            var html = BuildTableReport("DANH MUC VAT TU Y TE", $"Tong: {supplies.Count} vat tu", DateTime.Now,
                new[] { "Ma VT", "Ten vat tu", "DVT", "Hang SX", "Nuoc SX", "Hoat dong" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    // 13.5 Danh muc ICD-10
    public async Task<List<ICD10CatalogDto>> GetICD10CodesAsync(
        string keyword = null, string chapterCode = null, bool? isActive = null)
    {
        try
        {
            var query = _context.IcdCodes.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(i => i.Name.Contains(keyword) || i.Code.Contains(keyword));
            if (!string.IsNullOrWhiteSpace(chapterCode))
                query = query.Where(i => i.ChapterCode == chapterCode);
            if (isActive.HasValue)
                query = query.Where(i => i.IsActive == isActive.Value);

            var items = await query.OrderBy(i => i.Code).Take(1000).ToListAsync();
            return items.Select(i => new ICD10CatalogDto
            {
                Id = i.Id,
                Code = i.Code,
                Name = i.Name,
                EnglishName = i.NameEnglish,
                ChapterCode = i.ChapterCode,
                ChapterName = i.ChapterName,
                GroupCode = i.GroupCode,
                GroupName = i.GroupName,
                IsActive = i.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetICD10CodesAsync");
            return new List<ICD10CatalogDto>();
        }
    }

    public async Task<ICD10CatalogDto> GetICD10CodeAsync(Guid icd10Id)
    {
        try
        {
            var i = await _context.IcdCodes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == icd10Id);
            if (i == null) return null;
            return new ICD10CatalogDto
            {
                Id = i.Id,
                Code = i.Code,
                Name = i.Name,
                EnglishName = i.NameEnglish,
                ChapterCode = i.ChapterCode,
                ChapterName = i.ChapterName,
                GroupCode = i.GroupCode,
                GroupName = i.GroupName,
                IsActive = i.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetICD10CodeAsync");
            return null;
        }
    }

    public async Task<ICD10CatalogDto> SaveICD10CodeAsync(ICD10CatalogDto dto)
    {
        try
        {
            IcdCode entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new IcdCode
                {
                    Code = dto.Code ?? string.Empty,
                    Name = dto.Name ?? string.Empty,
                    NameEnglish = dto.EnglishName,
                    ChapterCode = dto.ChapterCode,
                    ChapterName = dto.ChapterName,
                    GroupCode = dto.GroupCode,
                    GroupName = dto.GroupName,
                    IsActive = dto.IsActive
                };
                _context.IcdCodes.Add(entity);
            }
            else
            {
                entity = await _context.IcdCodes.FirstOrDefaultAsync(x => x.Id == dto.Id);
                if (entity == null) return null;
                entity.Code = dto.Code ?? entity.Code;
                entity.Name = dto.Name ?? entity.Name;
                entity.NameEnglish = dto.EnglishName;
                entity.ChapterCode = dto.ChapterCode;
                entity.ChapterName = dto.ChapterName;
                entity.GroupCode = dto.GroupCode;
                entity.GroupName = dto.GroupName;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveICD10CodeAsync");
            return null;
        }
    }

    public async Task<bool> DeleteICD10CodeAsync(Guid icd10Id)
    {
        return await SoftDeleteEntityAsync<IcdCode>(icd10Id);
    }

    public async Task<bool> ImportICD10FromExcelAsync(byte[] fileData)
    {
        _logger.LogWarning("ImportICD10FromExcelAsync: Not implemented");
        return false;
    }

    public async Task<byte[]> ExportICD10ToExcelAsync(string chapterCode = null)
    {
        try
        {
            var query = _context.IcdCodes.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(chapterCode))
                query = query.Where(i => i.ChapterCode == chapterCode);
            var codes = await query.OrderBy(i => i.Code).Take(5000).ToListAsync();

            var rows = codes.Select(i => new string[] {
                i.Code, i.Name ?? "", i.NameEnglish ?? "", i.ChapterCode ?? "", i.ChapterName ?? ""
            }).ToList();

            var html = BuildTableReport("DANH MUC MA ICD-10", $"Tong: {codes.Count} ma", DateTime.Now,
                new[] { "Ma ICD", "Ten benh", "Ten tieng Anh", "Ma chuong", "Ten chuong" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    // 13.6 Danh muc khoa phong
    public async Task<List<DepartmentCatalogDto>> GetDepartmentsAsync(
        string keyword = null, string departmentType = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Departments.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(d => d.DepartmentName.Contains(keyword) || d.DepartmentCode.Contains(keyword));
            if (!string.IsNullOrWhiteSpace(departmentType) && int.TryParse(departmentType, out var dt))
                query = query.Where(d => d.DepartmentType == dt);
            if (isActive.HasValue)
                query = query.Where(d => d.IsActive == isActive.Value);

            var items = await query.OrderBy(d => d.DisplayOrder).ThenBy(d => d.DepartmentCode).ToListAsync();
            return items.Select(d => new DepartmentCatalogDto
            {
                Id = d.Id,
                Code = d.DepartmentCode,
                Name = d.DepartmentName,
                DepartmentType = d.DepartmentType.ToString(),
                BYTDeptCode = d.DepartmentCodeBYT,
                ParentId = d.ParentId,
                IsActive = d.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDepartmentsAsync");
            return new List<DepartmentCatalogDto>();
        }
    }

    public async Task<DepartmentCatalogDto> GetDepartmentAsync(Guid departmentId)
    {
        try
        {
            var d = await _context.Departments.AsNoTracking()
                .Include(x => x.Parent)
                .FirstOrDefaultAsync(x => x.Id == departmentId);
            if (d == null) return null;
            return new DepartmentCatalogDto
            {
                Id = d.Id,
                Code = d.DepartmentCode,
                Name = d.DepartmentName,
                DepartmentType = d.DepartmentType.ToString(),
                BYTDeptCode = d.DepartmentCodeBYT,
                ParentId = d.ParentId,
                ParentName = d.Parent?.DepartmentName,
                IsActive = d.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDepartmentAsync");
            return null;
        }
    }

    public async Task<DepartmentCatalogDto> SaveDepartmentAsync(DepartmentCatalogDto dto)
    {
        try
        {
            Department entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Department
                {
                    DepartmentCode = dto.Code ?? string.Empty,
                    DepartmentName = dto.Name ?? string.Empty,
                    DepartmentCodeBYT = dto.BYTDeptCode,
                    DepartmentType = int.TryParse(dto.DepartmentType, out var dt) ? dt : 1,
                    ParentId = dto.ParentId,
                    IsActive = dto.IsActive
                };
                _context.Departments.Add(entity);
            }
            else
            {
                entity = await _context.Departments.FirstOrDefaultAsync(d => d.Id == dto.Id);
                if (entity == null) return null;
                entity.DepartmentCode = dto.Code ?? entity.DepartmentCode;
                entity.DepartmentName = dto.Name ?? entity.DepartmentName;
                entity.DepartmentCodeBYT = dto.BYTDeptCode;
                entity.DepartmentType = int.TryParse(dto.DepartmentType, out var dt2) ? dt2 : entity.DepartmentType;
                entity.ParentId = dto.ParentId;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveDepartmentAsync");
            return null;
        }
    }

    public async Task<bool> DeleteDepartmentAsync(Guid departmentId)
    {
        return await SoftDeleteEntityAsync<Department>(departmentId);
    }

    // 13.7 Danh muc phong benh / giuong
    public async Task<List<RoomCatalogDto>> GetRoomsAsync(
        Guid? departmentId = null, string roomType = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Rooms.AsNoTracking()
                .Include(r => r.Department)
                .AsQueryable();

            if (departmentId.HasValue)
                query = query.Where(r => r.DepartmentId == departmentId.Value);
            if (!string.IsNullOrWhiteSpace(roomType) && int.TryParse(roomType, out var rt))
                query = query.Where(r => r.RoomType == rt);
            if (isActive.HasValue)
                query = query.Where(r => r.IsActive == isActive.Value);

            var items = await query.OrderBy(r => r.DisplayOrder).ThenBy(r => r.RoomCode).ToListAsync();
            return items.Select(r => new RoomCatalogDto
            {
                Id = r.Id,
                Code = r.RoomCode,
                Name = r.RoomName,
                DepartmentId = r.DepartmentId,
                DepartmentName = r.Department?.DepartmentName,
                RoomType = r.RoomType.ToString(),
                BedCount = r.Beds?.Count,
                IsActive = r.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetRoomsAsync");
            return new List<RoomCatalogDto>();
        }
    }

    public async Task<RoomCatalogDto> GetRoomAsync(Guid roomId)
    {
        try
        {
            var r = await _context.Rooms.AsNoTracking()
                .Include(x => x.Department)
                .Include(x => x.Beds)
                .FirstOrDefaultAsync(x => x.Id == roomId);
            if (r == null) return null;
            return new RoomCatalogDto
            {
                Id = r.Id,
                Code = r.RoomCode,
                Name = r.RoomName,
                DepartmentId = r.DepartmentId,
                DepartmentName = r.Department?.DepartmentName,
                RoomType = r.RoomType.ToString(),
                BedCount = r.Beds?.Count,
                IsActive = r.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetRoomAsync");
            return null;
        }
    }

    public async Task<RoomCatalogDto> SaveRoomAsync(RoomCatalogDto dto)
    {
        try
        {
            Room entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Room
                {
                    RoomCode = dto.Code ?? string.Empty,
                    RoomName = dto.Name ?? string.Empty,
                    DepartmentId = dto.DepartmentId,
                    RoomType = int.TryParse(dto.RoomType, out var rt) ? rt : 1,
                    IsActive = dto.IsActive
                };
                _context.Rooms.Add(entity);
            }
            else
            {
                entity = await _context.Rooms.FirstOrDefaultAsync(r => r.Id == dto.Id);
                if (entity == null) return null;
                entity.RoomCode = dto.Code ?? entity.RoomCode;
                entity.RoomName = dto.Name ?? entity.RoomName;
                entity.DepartmentId = dto.DepartmentId;
                entity.RoomType = int.TryParse(dto.RoomType, out var rt2) ? rt2 : entity.RoomType;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveRoomAsync");
            return null;
        }
    }

    public async Task<bool> DeleteRoomAsync(Guid roomId)
    {
        return await SoftDeleteEntityAsync<Room>(roomId);
    }

    public async Task<List<BedCatalogDto>> GetBedsAsync(Guid? roomId = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Beds.AsNoTracking()
                .Include(b => b.Room)
                .AsQueryable();

            if (roomId.HasValue)
                query = query.Where(b => b.RoomId == roomId.Value);
            if (isActive.HasValue)
                query = query.Where(b => b.IsActive == isActive.Value);

            var items = await query.OrderBy(b => b.BedCode).ToListAsync();
            return items.Select(b => new BedCatalogDto
            {
                Id = b.Id,
                Code = b.BedCode,
                Name = b.BedName,
                RoomId = b.RoomId,
                RoomName = b.Room?.RoomName,
                BedType = b.BedType.ToString(),
                DailyRate = b.DailyPrice,
                IsActive = b.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBedsAsync");
            return new List<BedCatalogDto>();
        }
    }

    public async Task<BedCatalogDto> GetBedAsync(Guid bedId)
    {
        try
        {
            var b = await _context.Beds.AsNoTracking()
                .Include(x => x.Room)
                .FirstOrDefaultAsync(x => x.Id == bedId);
            if (b == null) return null;
            return new BedCatalogDto
            {
                Id = b.Id,
                Code = b.BedCode,
                Name = b.BedName,
                RoomId = b.RoomId,
                RoomName = b.Room?.RoomName,
                BedType = b.BedType.ToString(),
                DailyRate = b.DailyPrice,
                IsActive = b.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBedAsync");
            return null;
        }
    }

    public async Task<BedCatalogDto> SaveBedAsync(BedCatalogDto dto)
    {
        try
        {
            Bed entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Bed
                {
                    BedCode = dto.Code ?? string.Empty,
                    BedName = dto.Name ?? string.Empty,
                    RoomId = dto.RoomId,
                    BedType = int.TryParse(dto.BedType, out var bt) ? bt : 1,
                    DailyPrice = dto.DailyRate ?? 0,
                    IsActive = dto.IsActive
                };
                _context.Beds.Add(entity);
            }
            else
            {
                entity = await _context.Beds.FirstOrDefaultAsync(b => b.Id == dto.Id);
                if (entity == null) return null;
                entity.BedCode = dto.Code ?? entity.BedCode;
                entity.BedName = dto.Name ?? entity.BedName;
                entity.RoomId = dto.RoomId;
                entity.BedType = int.TryParse(dto.BedType, out var bt2) ? bt2 : entity.BedType;
                entity.DailyPrice = dto.DailyRate ?? entity.DailyPrice;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveBedAsync");
            return null;
        }
    }

    public async Task<bool> DeleteBedAsync(Guid bedId)
    {
        return await SoftDeleteEntityAsync<Bed>(bedId);
    }

    // 13.8 Danh muc nhan vien
    public async Task<List<EmployeeCatalogDto>> GetEmployeesAsync(
        string keyword = null, Guid? departmentId = null, string position = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Users.AsNoTracking()
                .Include(u => u.Department)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(u => u.FullName.Contains(keyword) || u.Username.Contains(keyword));
            if (departmentId.HasValue)
                query = query.Where(u => u.DepartmentId == departmentId.Value);
            if (isActive.HasValue)
                query = query.Where(u => u.IsActive == isActive.Value);

            var items = await query.OrderBy(u => u.FullName).Take(500).ToListAsync();
            return items.Select(u => new EmployeeCatalogDto
            {
                Id = u.Id,
                Code = u.EmployeeCode ?? u.UserCode,
                FullName = u.FullName,
                Position = u.Title,
                DepartmentId = u.DepartmentId,
                DepartmentName = u.Department?.DepartmentName,
                Phone = u.PhoneNumber,
                Email = u.Email,
                IsDoctor = u.UserType == 1,
                IsNurse = u.UserType == 2,
                IsActive = u.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetEmployeesAsync");
            return new List<EmployeeCatalogDto>();
        }
    }

    public async Task<EmployeeCatalogDto> GetEmployeeAsync(Guid employeeId)
    {
        try
        {
            var u = await _context.Users.AsNoTracking()
                .Include(x => x.Department)
                .FirstOrDefaultAsync(x => x.Id == employeeId);
            if (u == null) return null;
            return new EmployeeCatalogDto
            {
                Id = u.Id,
                Code = u.EmployeeCode ?? u.UserCode,
                FullName = u.FullName,
                Position = u.Title,
                DepartmentId = u.DepartmentId,
                DepartmentName = u.Department?.DepartmentName,
                Phone = u.PhoneNumber,
                Email = u.Email,
                IsDoctor = u.UserType == 1,
                IsNurse = u.UserType == 2,
                IsActive = u.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetEmployeeAsync");
            return null;
        }
    }

    public async Task<EmployeeCatalogDto> SaveEmployeeAsync(EmployeeCatalogDto dto)
    {
        try
        {
            var entity = await _context.Users.FirstOrDefaultAsync(u => u.Id == dto.Id);
            if (entity == null) return null; // Employee creation should go through user management
            entity.FullName = dto.FullName ?? entity.FullName;
            entity.Title = dto.Position;
            entity.DepartmentId = dto.DepartmentId;
            entity.PhoneNumber = dto.Phone;
            entity.Email = dto.Email;
            entity.IsActive = dto.IsActive;
            await _context.SaveChangesAsync();
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveEmployeeAsync");
            return null;
        }
    }

    public async Task<bool> DeleteEmployeeAsync(Guid employeeId)
    {
        return await SoftDeleteEntityAsync<User>(employeeId);
    }

    // 13.9 Danh muc nha cung cap
    public async Task<List<SupplierCatalogDto>> GetSuppliersAsync(
        string keyword = null, string supplierType = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Suppliers.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(s => s.SupplierName.Contains(keyword) || s.SupplierCode.Contains(keyword));
            if (!string.IsNullOrWhiteSpace(supplierType) && int.TryParse(supplierType, out var st))
                query = query.Where(s => s.SupplierType == st);
            if (isActive.HasValue)
                query = query.Where(s => s.IsActive == isActive.Value);

            var items = await query.OrderBy(s => s.SupplierCode).ToListAsync();
            return items.Select(s => new SupplierCatalogDto
            {
                Id = s.Id,
                Code = s.SupplierCode,
                Name = s.SupplierName,
                SupplierType = s.SupplierType.ToString(),
                Address = s.Address,
                Phone = s.PhoneNumber,
                TaxCode = s.TaxCode,
                IsActive = s.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSuppliersAsync");
            return new List<SupplierCatalogDto>();
        }
    }

    public async Task<SupplierCatalogDto> GetSupplierAsync(Guid supplierId)
    {
        try
        {
            var s = await _context.Suppliers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == supplierId);
            if (s == null) return null;
            return new SupplierCatalogDto
            {
                Id = s.Id,
                Code = s.SupplierCode,
                Name = s.SupplierName,
                SupplierType = s.SupplierType.ToString(),
                Address = s.Address,
                Phone = s.PhoneNumber,
                TaxCode = s.TaxCode,
                IsActive = s.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSupplierAsync");
            return null;
        }
    }

    public async Task<SupplierCatalogDto> SaveSupplierAsync(SupplierCatalogDto dto)
    {
        try
        {
            Supplier entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Supplier
                {
                    SupplierCode = dto.Code ?? string.Empty,
                    SupplierName = dto.Name ?? string.Empty,
                    SupplierType = int.TryParse(dto.SupplierType, out var st) ? st : 1,
                    Address = dto.Address,
                    PhoneNumber = dto.Phone,
                    TaxCode = dto.TaxCode,
                    IsActive = dto.IsActive
                };
                _context.Suppliers.Add(entity);
            }
            else
            {
                entity = await _context.Suppliers.FirstOrDefaultAsync(s => s.Id == dto.Id);
                if (entity == null) return null;
                entity.SupplierCode = dto.Code ?? entity.SupplierCode;
                entity.SupplierName = dto.Name ?? entity.SupplierName;
                entity.SupplierType = int.TryParse(dto.SupplierType, out var st2) ? st2 : entity.SupplierType;
                entity.Address = dto.Address;
                entity.PhoneNumber = dto.Phone;
                entity.TaxCode = dto.TaxCode;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveSupplierAsync");
            return null;
        }
    }

    public async Task<bool> DeleteSupplierAsync(Guid supplierId)
    {
        return await SoftDeleteEntityAsync<Supplier>(supplierId);
    }

    // 13.10 Danh muc gia vien phi
    public async Task<List<ServicePriceCatalogDto>> GetServicePricesAsync(
        Guid? serviceId = null, string priceType = null, DateTime? effectiveDate = null)
    {
        try
        {
            var query = _context.ServicePrices.AsNoTracking()
                .Include(sp => sp.Service)
                .AsQueryable();

            if (serviceId.HasValue)
                query = query.Where(sp => sp.ServiceId == serviceId.Value);
            if (effectiveDate.HasValue)
                query = query.Where(sp => sp.EffectiveDate <= effectiveDate.Value
                    && (sp.EndDate == null || sp.EndDate >= effectiveDate.Value));

            var items = await query.OrderBy(sp => sp.Service.ServiceCode).Take(500).ToListAsync();
            return items.Select(sp => new ServicePriceCatalogDto
            {
                Id = sp.Id,
                ServiceId = sp.ServiceId,
                ServiceCode = sp.Service?.ServiceCode,
                ServiceName = sp.Service?.ServiceName,
                PriceType = sp.PriceType,
                UnitPrice = sp.Price,
                InsurancePrice = sp.InsurancePrice,
                EffectiveDate = sp.EffectiveDate,
                ExpiryDate = sp.EndDate,
                IsActive = sp.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetServicePricesAsync");
            return new List<ServicePriceCatalogDto>();
        }
    }

    public async Task<ServicePriceCatalogDto> GetServicePriceAsync(Guid priceId)
    {
        try
        {
            var sp = await _context.ServicePrices.AsNoTracking()
                .Include(x => x.Service)
                .FirstOrDefaultAsync(x => x.Id == priceId);
            if (sp == null) return null;
            return new ServicePriceCatalogDto
            {
                Id = sp.Id,
                ServiceId = sp.ServiceId,
                ServiceCode = sp.Service?.ServiceCode,
                ServiceName = sp.Service?.ServiceName,
                PriceType = sp.PriceType,
                UnitPrice = sp.Price,
                InsurancePrice = sp.InsurancePrice,
                EffectiveDate = sp.EffectiveDate,
                ExpiryDate = sp.EndDate,
                IsActive = sp.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetServicePriceAsync");
            return null;
        }
    }

    public async Task<ServicePriceCatalogDto> SaveServicePriceAsync(ServicePriceCatalogDto dto)
    {
        try
        {
            ServicePrice entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new ServicePrice
                {
                    ServiceId = dto.ServiceId,
                    PriceType = dto.PriceType ?? "BHYT",
                    Price = dto.UnitPrice,
                    InsurancePrice = dto.InsurancePrice ?? 0m,
                    EffectiveDate = dto.EffectiveDate,
                    EndDate = dto.ExpiryDate,
                    IsActive = dto.IsActive
                };
                _context.ServicePrices.Add(entity);
            }
            else
            {
                entity = await _context.ServicePrices.FirstOrDefaultAsync(sp => sp.Id == dto.Id);
                if (entity == null) return null;
                entity.ServiceId = dto.ServiceId;
                entity.PriceType = dto.PriceType ?? entity.PriceType;
                entity.Price = dto.UnitPrice;
                entity.InsurancePrice = dto.InsurancePrice ?? 0m;
                entity.EffectiveDate = dto.EffectiveDate;
                entity.EndDate = dto.ExpiryDate;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveServicePriceAsync");
            return null;
        }
    }

    public async Task<bool> DeleteServicePriceAsync(Guid priceId)
    {
        return await SoftDeleteEntityAsync<ServicePrice>(priceId);
    }

    public async Task<bool> ImportServicePricesFromExcelAsync(byte[] fileData, DateTime effectiveDate)
    {
        _logger.LogWarning("ImportServicePricesFromExcelAsync: Not implemented");
        return false;
    }

    public async Task<byte[]> ExportServicePricesToExcelAsync(string priceType = null)
    {
        try
        {
            var services = await _context.Services.AsNoTracking().Where(s => !s.IsDeleted)
                .Include(s => s.ServiceGroup).OrderBy(s => s.ServiceName).Take(3000).ToListAsync();

            var rows = services.Select(s => new string[] {
                s.ServiceCode, s.ServiceName, s.ServiceGroup?.GroupName ?? "",
                s.Unit ?? "", s.UnitPrice.ToString("N0"), s.InsurancePrice.ToString("N0"),
                s.IsActive ? "Co" : "Khong"
            }).ToList();

            var html = BuildTableReport("BANG GIA DICH VU", $"Tong: {services.Count} dich vu", DateTime.Now,
                new[] { "Ma DV", "Ten dich vu", "Khoa", "DVT", "Gia co so", "Gia BHYT", "Hoat dong" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    // 13.11 Danh muc doi tuong benh nhan
    public async Task<List<PatientTypeCatalogDto>> GetPatientTypesAsync(bool? isActive = null)
    {
        // No dedicated PatientType entity in DbContext; return static defaults
        return new List<PatientTypeCatalogDto>
        {
            new PatientTypeCatalogDto { Id = Guid.NewGuid(), Code = "BHYT", Name = "Bao hiem y te", IsDefault = true, IsActive = true },
            new PatientTypeCatalogDto { Id = Guid.NewGuid(), Code = "VP", Name = "Vien phi", IsDefault = false, IsActive = true },
            new PatientTypeCatalogDto { Id = Guid.NewGuid(), Code = "DV", Name = "Dich vu", IsDefault = false, IsActive = true },
            new PatientTypeCatalogDto { Id = Guid.NewGuid(), Code = "KSK", Name = "Kham suc khoe", IsDefault = false, IsActive = true }
        };
    }

    public async Task<PatientTypeCatalogDto> GetPatientTypeAsync(Guid patientTypeId)
    {
        var list = await GetPatientTypesAsync(null);
        return list.FirstOrDefault(x => x.Id == patientTypeId);
    }

    public async Task<PatientTypeCatalogDto> SavePatientTypeAsync(PatientTypeCatalogDto dto)
    {
        _logger.LogWarning("SavePatientTypeAsync: No dedicated entity table; returning dto as-is");
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        return dto;
    }

    public async Task<bool> DeletePatientTypeAsync(Guid patientTypeId)
    {
        _logger.LogWarning("DeletePatientTypeAsync: No dedicated entity table");
        return true;
    }

    // 13.12 Danh muc nguon nhap vien
    public async Task<List<AdmissionSourceCatalogDto>> GetAdmissionSourcesAsync(bool? isActive = null)
    {
        return new List<AdmissionSourceCatalogDto>
        {
            new AdmissionSourceCatalogDto { Id = Guid.NewGuid(), Code = "CC", Name = "Cap cuu", IsDefault = true, IsActive = true },
            new AdmissionSourceCatalogDto { Id = Guid.NewGuid(), Code = "CT", Name = "Chuyen tuyen", IsDefault = false, IsActive = true },
            new AdmissionSourceCatalogDto { Id = Guid.NewGuid(), Code = "DT", Name = "Dieu tri", IsDefault = false, IsActive = true },
            new AdmissionSourceCatalogDto { Id = Guid.NewGuid(), Code = "K", Name = "Khac", IsDefault = false, IsActive = true }
        };
    }

    public async Task<AdmissionSourceCatalogDto> GetAdmissionSourceAsync(Guid sourceId)
    {
        var list = await GetAdmissionSourcesAsync(null);
        return list.FirstOrDefault(x => x.Id == sourceId);
    }

    public async Task<AdmissionSourceCatalogDto> SaveAdmissionSourceAsync(AdmissionSourceCatalogDto dto)
    {
        _logger.LogWarning("SaveAdmissionSourceAsync: No dedicated entity table; returning dto as-is");
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        return dto;
    }

    public async Task<bool> DeleteAdmissionSourceAsync(Guid sourceId)
    {
        _logger.LogWarning("DeleteAdmissionSourceAsync: No dedicated entity table");
        return true;
    }

    // 13.13 Danh muc mau phieu in
    public async Task<List<PrintTemplateCatalogDto>> GetPrintTemplatesAsync(
        string templateType = null, Guid? departmentId = null, bool? isActive = null)
    {
        try
        {
            var query = _context.ReportTemplates.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(templateType))
                query = query.Where(t => t.Category == templateType);
            if (isActive.HasValue)
                query = query.Where(t => t.IsActive == isActive.Value);

            var items = await query.OrderBy(t => t.ReportName).ToListAsync();
            return items.Select(t => new PrintTemplateCatalogDto
            {
                Id = t.Id,
                Code = t.ReportCode,
                Name = t.ReportName,
                TemplateType = t.Category,
                TemplateContent = t.TemplateFile,
                IsActive = t.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetPrintTemplatesAsync");
            return new List<PrintTemplateCatalogDto>();
        }
    }

    public async Task<PrintTemplateCatalogDto> GetPrintTemplateAsync(Guid templateId)
    {
        try
        {
            var t = await _context.ReportTemplates.AsNoTracking().FirstOrDefaultAsync(x => x.Id == templateId);
            if (t == null) return null;
            return new PrintTemplateCatalogDto
            {
                Id = t.Id,
                Code = t.ReportCode,
                Name = t.ReportName,
                TemplateType = t.Category,
                TemplateContent = t.TemplateFile,
                IsActive = t.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetPrintTemplateAsync");
            return null;
        }
    }

    public async Task<PrintTemplateCatalogDto> SavePrintTemplateAsync(PrintTemplateCatalogDto dto)
    {
        try
        {
            ReportTemplate entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new ReportTemplate
                {
                    ReportCode = dto.Code ?? string.Empty,
                    ReportName = dto.Name ?? string.Empty,
                    Category = dto.TemplateType ?? string.Empty,
                    TemplateFile = dto.TemplateContent,
                    IsActive = dto.IsActive
                };
                _context.ReportTemplates.Add(entity);
            }
            else
            {
                entity = await _context.ReportTemplates.FirstOrDefaultAsync(t => t.Id == dto.Id);
                if (entity == null) return null;
                entity.ReportCode = dto.Code ?? entity.ReportCode;
                entity.ReportName = dto.Name ?? entity.ReportName;
                entity.Category = dto.TemplateType ?? entity.Category;
                entity.TemplateFile = dto.TemplateContent;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SavePrintTemplateAsync");
            return null;
        }
    }

    public async Task<bool> DeletePrintTemplateAsync(Guid templateId)
    {
        return await SoftDeleteEntityAsync<ReportTemplate>(templateId);
    }

    // 13.14 Danh muc mau benh an
    public async Task<List<MedicalRecordTemplateCatalogDto>> GetMedicalRecordTemplatesAsync(
        string templateType = null, bool? isActive = null)
    {
        try
        {
            var query = _context.ExaminationTemplates.AsNoTracking().AsQueryable();

            var items = await query.ToListAsync();
            return items.Select(t => new MedicalRecordTemplateCatalogDto
            {
                Id = t.Id,
                Code = t.TemplateCode ?? t.Id.ToString().Substring(0, 8),
                Name = t.TemplateName,
                TemplateType = t.TemplateType.ToString(),
                TemplateContent = t.ChiefComplaintTemplate,
                IsActive = t.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicalRecordTemplatesAsync");
            return new List<MedicalRecordTemplateCatalogDto>();
        }
    }

    public async Task<MedicalRecordTemplateCatalogDto> GetMedicalRecordTemplateAsync(Guid templateId)
    {
        try
        {
            var t = await _context.ExaminationTemplates.AsNoTracking().FirstOrDefaultAsync(x => x.Id == templateId);
            if (t == null) return null;
            return new MedicalRecordTemplateCatalogDto
            {
                Id = t.Id,
                Code = t.TemplateCode,
                Name = t.TemplateName,
                TemplateType = t.TemplateType.ToString(),
                TemplateContent = t.ChiefComplaintTemplate,
                IsActive = t.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicalRecordTemplateAsync");
            return null;
        }
    }

    public async Task<MedicalRecordTemplateCatalogDto> SaveMedicalRecordTemplateAsync(MedicalRecordTemplateCatalogDto dto)
    {
        try
        {
            ExaminationTemplate entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new ExaminationTemplate
                {
                    TemplateName = dto.Name ?? string.Empty,
                    TemplateCode = dto.Code,
                    TemplateType = int.TryParse(dto.TemplateType, out var tt) ? tt : 1,
                    ChiefComplaintTemplate = dto.TemplateContent,
                    IsActive = dto.IsActive
                };
                _context.ExaminationTemplates.Add(entity);
            }
            else
            {
                entity = await _context.ExaminationTemplates.FirstOrDefaultAsync(t => t.Id == dto.Id);
                if (entity == null) return null;
                entity.TemplateName = dto.Name ?? entity.TemplateName;
                entity.TemplateCode = dto.Code ?? entity.TemplateCode;
                entity.TemplateType = int.TryParse(dto.TemplateType, out var tt2) ? tt2 : entity.TemplateType;
                entity.ChiefComplaintTemplate = dto.TemplateContent;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveMedicalRecordTemplateAsync");
            return null;
        }
    }

    public async Task<bool> DeleteMedicalRecordTemplateAsync(Guid templateId)
    {
        return await SoftDeleteEntityAsync<ExaminationTemplate>(templateId);
    }

    // 13.15 Nhom dich vu
    public async Task<List<ServiceGroupCatalogDto>> GetServiceGroupsAsync(
        string groupType = null, bool? isActive = null)
    {
        try
        {
            var query = _context.ServiceGroups.AsNoTracking()
                .Include(g => g.Parent)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(groupType) && int.TryParse(groupType, out var gt))
                query = query.Where(g => g.GroupType == gt);
            if (isActive.HasValue)
                query = query.Where(g => g.IsActive == isActive.Value);

            var items = await query.OrderBy(g => g.DisplayOrder).ThenBy(g => g.GroupCode).ToListAsync();
            return items.Select(g => new ServiceGroupCatalogDto
            {
                Id = g.Id,
                Code = g.GroupCode,
                Name = g.GroupName,
                GroupType = g.GroupType.ToString(),
                ParentId = g.ParentId,
                ParentName = g.Parent?.GroupName,
                IsActive = g.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetServiceGroupsAsync");
            return new List<ServiceGroupCatalogDto>();
        }
    }

    public async Task<ServiceGroupCatalogDto> GetServiceGroupAsync(Guid groupId)
    {
        try
        {
            var g = await _context.ServiceGroups.AsNoTracking()
                .Include(x => x.Parent)
                .FirstOrDefaultAsync(x => x.Id == groupId);
            if (g == null) return null;
            return new ServiceGroupCatalogDto
            {
                Id = g.Id,
                Code = g.GroupCode,
                Name = g.GroupName,
                GroupType = g.GroupType.ToString(),
                ParentId = g.ParentId,
                ParentName = g.Parent?.GroupName,
                IsActive = g.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetServiceGroupAsync");
            return null;
        }
    }

    public async Task<ServiceGroupCatalogDto> SaveServiceGroupAsync(ServiceGroupCatalogDto dto)
    {
        try
        {
            ServiceGroup entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new ServiceGroup
                {
                    GroupCode = dto.Code ?? string.Empty,
                    GroupName = dto.Name ?? string.Empty,
                    GroupType = int.TryParse(dto.GroupType, out var gt) ? gt : 7,
                    ParentId = dto.ParentId,
                    IsActive = dto.IsActive
                };
                _context.ServiceGroups.Add(entity);
            }
            else
            {
                entity = await _context.ServiceGroups.FirstOrDefaultAsync(g => g.Id == dto.Id);
                if (entity == null) return null;
                entity.GroupCode = dto.Code ?? entity.GroupCode;
                entity.GroupName = dto.Name ?? entity.GroupName;
                entity.GroupType = int.TryParse(dto.GroupType, out var gt2) ? gt2 : entity.GroupType;
                entity.ParentId = dto.ParentId;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveServiceGroupAsync");
            return null;
        }
    }

    public async Task<bool> DeleteServiceGroupAsync(Guid groupId)
    {
        return await SoftDeleteEntityAsync<ServiceGroup>(groupId);
    }

    // 13.16 Nhom thuoc
    public async Task<List<MedicineGroupCatalogDto>> GetMedicineGroupsAsync(bool? isActive = null)
    {
        // No dedicated MedicineGroup entity in DbContext; return empty list
        // Medicine has MedicineGroupCode string field but no separate entity
        return new List<MedicineGroupCatalogDto>();
    }

    public async Task<MedicineGroupCatalogDto> GetMedicineGroupAsync(Guid groupId)
    {
        return null;
    }

    public async Task<MedicineGroupCatalogDto> SaveMedicineGroupAsync(MedicineGroupCatalogDto dto)
    {
        _logger.LogWarning("SaveMedicineGroupAsync: No dedicated MedicineGroup entity");
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        return dto;
    }

    public async Task<bool> DeleteMedicineGroupAsync(Guid groupId)
    {
        _logger.LogWarning("DeleteMedicineGroupAsync: No dedicated MedicineGroup entity");
        return true;
    }

    // 13.17 Thuat ngu lam sang (Clinical Terms)
    public async Task<List<ClinicalTermCatalogDto>> GetClinicalTermsAsync(string keyword = null, string category = null, string bodySystem = null, bool? isActive = null)
    {
        var query = _context.ClinicalTerms.AsQueryable();
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(t => t.Code.Contains(keyword) || t.Name.Contains(keyword) || (t.NameEnglish != null && t.NameEnglish.Contains(keyword)));
        if (!string.IsNullOrEmpty(category))
            query = query.Where(t => t.Category == category);
        if (!string.IsNullOrEmpty(bodySystem))
            query = query.Where(t => t.BodySystem == bodySystem);
        if (isActive.HasValue)
            query = query.Where(t => t.IsActive == isActive.Value);

        return await query.OrderBy(t => t.Category).ThenBy(t => t.SortOrder).ThenBy(t => t.Name)
            .Select(t => new ClinicalTermCatalogDto
            {
                Id = t.Id,
                Code = t.Code,
                Name = t.Name,
                NameEnglish = t.NameEnglish,
                Category = t.Category,
                BodySystem = t.BodySystem,
                Description = t.Description,
                SortOrder = t.SortOrder,
                IsActive = t.IsActive,
            }).ToListAsync();
    }

    public async Task<ClinicalTermCatalogDto> GetClinicalTermAsync(Guid termId)
    {
        var t = await _context.ClinicalTerms.FindAsync(termId);
        if (t == null) return null;
        return new ClinicalTermCatalogDto
        {
            Id = t.Id, Code = t.Code, Name = t.Name, NameEnglish = t.NameEnglish,
            Category = t.Category, BodySystem = t.BodySystem, Description = t.Description,
            SortOrder = t.SortOrder, IsActive = t.IsActive,
        };
    }

    public async Task<ClinicalTermCatalogDto> SaveClinicalTermAsync(ClinicalTermCatalogDto dto)
    {
        ClinicalTerm entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _context.ClinicalTerms.FindAsync(dto.Id);
            if (entity == null) throw new KeyNotFoundException($"ClinicalTerm {dto.Id} not found");
        }
        else
        {
            entity = new ClinicalTerm { Id = Guid.NewGuid() };
            _context.ClinicalTerms.Add(entity);
        }
        entity.Code = dto.Code;
        entity.Name = dto.Name;
        entity.NameEnglish = dto.NameEnglish;
        entity.Category = dto.Category;
        entity.BodySystem = dto.BodySystem;
        entity.Description = dto.Description;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteClinicalTermAsync(Guid termId)
    {
        var entity = await _context.ClinicalTerms.FindAsync(termId);
        if (entity == null) return false;
        _context.ClinicalTerms.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    // SNOMED CT Mapping
    public async Task<List<SnomedIcdMappingDto>> GetSnomedMappingsAsync(string? keyword, string? icdCode)
    {
        var query = _context.SnomedIcdMappings.Where(m => m.IsActive);
        if (!string.IsNullOrWhiteSpace(icdCode))
            query = query.Where(m => m.IcdCode.Contains(icdCode));
        if (!string.IsNullOrWhiteSpace(keyword))
            query = query.Where(m => m.IcdName.Contains(keyword) || m.SnomedCtDisplay.Contains(keyword) || m.SnomedCtCode.Contains(keyword));
        return await query.OrderBy(m => m.IcdCode).Take(200).Select(m => new SnomedIcdMappingDto
        {
            Id = m.Id, IcdCode = m.IcdCode, IcdName = m.IcdName,
            SnomedCtCode = m.SnomedCtCode, SnomedCtDisplay = m.SnomedCtDisplay,
            MapGroup = m.MapGroup, MapPriority = m.MapPriority, MapRule = m.MapRule, IsActive = m.IsActive
        }).ToListAsync();
    }

    public async Task<SnomedIcdMappingDto> SaveSnomedMappingAsync(SnomedIcdMappingDto dto)
    {
        SnomedIcdMapping entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _context.SnomedIcdMappings.FindAsync(dto.Id) ?? new SnomedIcdMapping();
        }
        else
        {
            entity = new SnomedIcdMapping();
            _context.SnomedIcdMappings.Add(entity);
        }
        entity.IcdCode = dto.IcdCode; entity.IcdName = dto.IcdName;
        entity.SnomedCtCode = dto.SnomedCtCode; entity.SnomedCtDisplay = dto.SnomedCtDisplay;
        entity.MapGroup = dto.MapGroup; entity.MapPriority = dto.MapPriority;
        entity.MapRule = dto.MapRule; entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteSnomedMappingAsync(Guid mappingId)
    {
        var entity = await _context.SnomedIcdMappings.FindAsync(mappingId);
        if (entity == null) return false;
        _context.SnomedIcdMappings.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<SnomedIcdMappingDto>> SearchSnomedByIcdAsync(string icdCode)
    {
        return await _context.SnomedIcdMappings
            .Where(m => m.IsActive && m.IcdCode == icdCode)
            .OrderBy(m => m.MapPriority)
            .Select(m => new SnomedIcdMappingDto
            {
                Id = m.Id, IcdCode = m.IcdCode, IcdName = m.IcdName,
                SnomedCtCode = m.SnomedCtCode, SnomedCtDisplay = m.SnomedCtDisplay,
                MapGroup = m.MapGroup, MapPriority = m.MapPriority, MapRule = m.MapRule, IsActive = m.IsActive
            }).ToListAsync();
    }

    // 13.18 Dong bo danh muc BHXH
    public async Task<SyncResultDto> SyncBHXHMedicinesAsync()
    {
        _logger.LogWarning("SyncBHXHMedicinesAsync: External integration not implemented");
        return new SyncResultDto
        {
            IsSuccess = false,
            TotalRecords = 0,
            InsertedRecords = 0,
            UpdatedRecords = 0,
            FailedRecords = 0,
            Errors = new List<string> { "BHXH integration not configured" },
            SyncDate = DateTime.UtcNow
        };
    }

    public async Task<SyncResultDto> SyncBHXHServicesAsync()
    {
        _logger.LogWarning("SyncBHXHServicesAsync: External integration not implemented");
        return new SyncResultDto
        {
            IsSuccess = false,
            TotalRecords = 0,
            InsertedRecords = 0,
            UpdatedRecords = 0,
            FailedRecords = 0,
            Errors = new List<string> { "BHXH integration not configured" },
            SyncDate = DateTime.UtcNow
        };
    }

    public async Task<SyncResultDto> SyncBHXHICD10Async()
    {
        _logger.LogWarning("SyncBHXHICD10Async: External integration not implemented");
        return new SyncResultDto
        {
            IsSuccess = false,
            TotalRecords = 0,
            InsertedRecords = 0,
            UpdatedRecords = 0,
            FailedRecords = 0,
            Errors = new List<string> { "BHXH integration not configured" },
            SyncDate = DateTime.UtcNow
        };
    }

    public async Task<DateTime?> GetLastSyncDateAsync(string syncType)
    {
        return null;
    }

    #endregion

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
                .ToListAsync();

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
                .ToListAsync();

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

    #region Module 16: HSBA & Thong ke - 12 chuc nang

    // 16.1 Luu tru ho so benh an
    public async Task<List<MedicalRecordArchiveDto>> GetMedicalRecordArchivesAsync(
        string keyword = null, int? year = null, string archiveStatus = null, Guid? departmentId = null)
    {
        try
        {
            var query = _context.MedicalRecordArchives.AsNoTracking()
                .Include(a => a.Patient)
                .Include(a => a.MedicalRecord)
                .Include(a => a.Department)
                .Include(a => a.ArchivedBy)
                .Where(a => !a.IsDeleted);

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(a =>
                    a.ArchiveCode.Contains(keyword) ||
                    a.Patient.FullName.Contains(keyword) ||
                    a.Patient.PatientCode.Contains(keyword) ||
                    (a.Diagnosis != null && a.Diagnosis.Contains(keyword)));
            if (year.HasValue)
                query = query.Where(a => a.ArchiveYear == year.Value);
            if (!string.IsNullOrWhiteSpace(archiveStatus) && int.TryParse(archiveStatus, out var st))
                query = query.Where(a => a.Status == st);
            if (departmentId.HasValue)
                query = query.Where(a => a.DepartmentId == departmentId.Value);

            var statusNames = new Dictionary<int, string> { {0,"Chờ lưu"}, {1,"Đã lưu"}, {2,"Đang mượn"}, {3,"Đã hủy"} };
            return await query.OrderByDescending(a => a.CreatedAt)
                .Take(500)
                .Select(a => new MedicalRecordArchiveDto
                {
                    Id = a.Id,
                    ArchiveCode = a.ArchiveCode,
                    AdmissionCode = a.MedicalRecord.MedicalRecordCode,
                    PatientId = a.PatientId,
                    PatientCode = a.Patient.PatientCode,
                    PatientName = a.Patient.FullName,
                    AdmissionDate = a.AdmissionDate ?? a.MedicalRecord.AdmissionDate,
                    DischargeDate = a.DischargeDate ?? a.MedicalRecord.DischargeDate ?? DateTime.MinValue,
                    DepartmentName = a.Department != null ? a.Department.DepartmentName : "",
                    Diagnosis = a.Diagnosis ?? a.MedicalRecord.MainDiagnosis ?? "",
                    TreatmentResult = a.TreatmentResult ?? "",
                    StorageLocation = a.StorageLocation ?? "",
                    ShelfNumber = a.ShelfNumber ?? "",
                    Status = a.Status == 0 ? "Chờ lưu" : a.Status == 1 ? "Đã lưu" : a.Status == 2 ? "Đang mượn" : "Đã hủy",
                    ArchivedDate = a.ArchivedDate,
                    ArchivedBy = a.ArchivedBy != null ? a.ArchivedBy.FullName : ""
                })
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicalRecordArchivesAsync");
            return new List<MedicalRecordArchiveDto>();
        }
    }

    public async Task<MedicalRecordArchiveDto> GetMedicalRecordArchiveAsync(Guid archiveId)
    {
        try
        {
            var a = await _context.MedicalRecordArchives.AsNoTracking()
                .Include(x => x.Patient)
                .Include(x => x.MedicalRecord)
                .Include(x => x.Department)
                .Include(x => x.ArchivedBy)
                .FirstOrDefaultAsync(x => x.Id == archiveId && !x.IsDeleted);
            if (a == null) return null;

            return new MedicalRecordArchiveDto
            {
                Id = a.Id,
                ArchiveCode = a.ArchiveCode,
                AdmissionCode = a.MedicalRecord.MedicalRecordCode,
                PatientId = a.PatientId,
                PatientCode = a.Patient.PatientCode,
                PatientName = a.Patient.FullName,
                AdmissionDate = a.AdmissionDate ?? a.MedicalRecord.AdmissionDate,
                DischargeDate = a.DischargeDate ?? a.MedicalRecord.DischargeDate ?? DateTime.MinValue,
                DepartmentName = a.Department?.DepartmentName ?? "",
                Diagnosis = a.Diagnosis ?? a.MedicalRecord.MainDiagnosis ?? "",
                TreatmentResult = a.TreatmentResult ?? "",
                StorageLocation = a.StorageLocation ?? "",
                ShelfNumber = a.ShelfNumber ?? "",
                Status = a.Status == 0 ? "Chờ lưu" : a.Status == 1 ? "Đã lưu" : a.Status == 2 ? "Đang mượn" : "Đã hủy",
                ArchivedDate = a.ArchivedDate,
                ArchivedBy = a.ArchivedBy?.FullName ?? ""
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicalRecordArchiveAsync");
            return null;
        }
    }

    public async Task<MedicalRecordArchiveDto> SaveMedicalRecordArchiveAsync(MedicalRecordArchiveDto dto)
    {
        try
        {
            MedicalRecordArchive entity;
            if (dto.Id == Guid.Empty)
            {
                // Create new archive from a medical record
                entity = new MedicalRecordArchive
                {
                    Id = Guid.NewGuid(),
                    ArchiveCode = $"LT-{DateTime.Now:yyyyMMdd}-{new Random().Next(1000, 9999)}",
                    MedicalRecordId = dto.PatientId != Guid.Empty
                        ? (await _context.MedicalRecords.FirstOrDefaultAsync(m => m.PatientId == dto.PatientId))?.Id ?? Guid.Empty
                        : Guid.Empty,
                    PatientId = dto.PatientId,
                    Diagnosis = dto.Diagnosis,
                    TreatmentResult = dto.TreatmentResult,
                    StorageLocation = dto.StorageLocation,
                    ShelfNumber = dto.ShelfNumber,
                    Status = 0,
                    ArchiveYear = DateTime.Now.Year,
                    CreatedAt = DateTime.UtcNow
                };
                _context.MedicalRecordArchives.Add(entity);
            }
            else
            {
                entity = await _context.MedicalRecordArchives.FindAsync(dto.Id);
                if (entity == null) { dto.Id = Guid.NewGuid(); return dto; }

                entity.StorageLocation = dto.StorageLocation;
                entity.ShelfNumber = dto.ShelfNumber;
                entity.Diagnosis = dto.Diagnosis;
                entity.TreatmentResult = dto.TreatmentResult;
                if (dto.Status == "Đã lưu" && entity.Status == 0)
                {
                    entity.Status = 1;
                    entity.ArchivedDate = DateTime.UtcNow;
                }
                entity.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            dto.ArchiveCode = entity.ArchiveCode;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveMedicalRecordArchiveAsync");
            if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
            return dto;
        }
    }

    public async Task<bool> UpdateArchiveLocationAsync(Guid archiveId, string location)
    {
        try
        {
            var archive = await _context.MedicalRecordArchives.FindAsync(archiveId);
            if (archive == null) return false;
            archive.StorageLocation = location;
            archive.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UpdateArchiveLocationAsync");
            return false;
        }
    }

    // 16.2 Muon tra ho so
    public async Task<List<MedicalRecordBorrowRequestDto>> GetBorrowRequestsAsync(
        DateTime? fromDate = null, DateTime? toDate = null, string status = null, Guid? borrowerId = null)
    {
        try
        {
            var query = _context.MedicalRecordBorrowRequests.AsNoTracking()
                .Include(r => r.MedicalRecordArchive).ThenInclude(a => a.Patient)
                .Include(r => r.RequestedBy)
                .Where(r => !r.IsDeleted);

            if (fromDate.HasValue)
                query = query.Where(r => r.RequestDate >= fromDate.Value);
            if (toDate.HasValue)
                query = query.Where(r => r.RequestDate <= toDate.Value);
            if (!string.IsNullOrWhiteSpace(status) && int.TryParse(status, out var st))
                query = query.Where(r => r.Status == st);
            if (borrowerId.HasValue)
                query = query.Where(r => r.RequestedById == borrowerId.Value);

            var statusNames = new Dictionary<int, string> { {0,"Chờ duyệt"}, {1,"Đã duyệt"}, {2,"Từ chối"}, {3,"Đang mượn"}, {4,"Đã trả"} };
            return await query.OrderByDescending(r => r.RequestDate)
                .Take(500)
                .Select(r => new MedicalRecordBorrowRequestDto
                {
                    Id = r.Id,
                    RequestCode = r.RequestCode,
                    RecordId = r.MedicalRecordArchiveId,
                    ArchiveCode = r.MedicalRecordArchive.ArchiveCode,
                    PatientName = r.MedicalRecordArchive.Patient.FullName,
                    RequestDate = r.RequestDate,
                    RequestedById = r.RequestedById,
                    RequestedByName = r.RequestedBy.FullName,
                    Purpose = r.Purpose ?? "",
                    ExpectedReturnDate = r.ExpectedReturnDate,
                    Status = r.Status == 0 ? "Chờ duyệt" : r.Status == 1 ? "Đã duyệt" : r.Status == 2 ? "Từ chối" : r.Status == 3 ? "Đang mượn" : "Đã trả",
                    BorrowedDate = r.BorrowedDate,
                    ReturnedDate = r.ReturnedDate,
                    Note = r.Note ?? ""
                })
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBorrowRequestsAsync");
            return new List<MedicalRecordBorrowRequestDto>();
        }
    }

    public async Task<MedicalRecordBorrowRequestDto> GetBorrowRequestAsync(Guid requestId)
    {
        try
        {
            var r = await _context.MedicalRecordBorrowRequests.AsNoTracking()
                .Include(x => x.MedicalRecordArchive).ThenInclude(a => a.Patient)
                .Include(x => x.RequestedBy)
                .FirstOrDefaultAsync(x => x.Id == requestId && !x.IsDeleted);
            if (r == null) return null;

            return new MedicalRecordBorrowRequestDto
            {
                Id = r.Id,
                RequestCode = r.RequestCode,
                RecordId = r.MedicalRecordArchiveId,
                ArchiveCode = r.MedicalRecordArchive.ArchiveCode,
                PatientName = r.MedicalRecordArchive.Patient.FullName,
                RequestDate = r.RequestDate,
                RequestedById = r.RequestedById,
                RequestedByName = r.RequestedBy.FullName,
                Purpose = r.Purpose ?? "",
                ExpectedReturnDate = r.ExpectedReturnDate,
                Status = r.Status == 0 ? "Chờ duyệt" : r.Status == 1 ? "Đã duyệt" : r.Status == 2 ? "Từ chối" : r.Status == 3 ? "Đang mượn" : "Đã trả",
                BorrowedDate = r.BorrowedDate,
                ReturnedDate = r.ReturnedDate,
                Note = r.Note ?? ""
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBorrowRequestAsync");
            return null;
        }
    }

    public async Task<MedicalRecordBorrowRequestDto> CreateBorrowRequestAsync(CreateBorrowRequestDto dto)
    {
        try
        {
            var archive = await _context.MedicalRecordArchives
                .Include(a => a.Patient)
                .FirstOrDefaultAsync(a => a.Id == dto.MedicalRecordArchiveId);
            if (archive == null)
                return new MedicalRecordBorrowRequestDto { Id = Guid.Empty };

            var entity = new MedicalRecordBorrowRequest
            {
                Id = Guid.NewGuid(),
                RequestCode = $"MT-{DateTime.Now:yyyyMMdd}-{new Random().Next(1000, 9999)}",
                MedicalRecordArchiveId = dto.MedicalRecordArchiveId,
                RequestedById = Guid.Empty,
                RequestDate = DateTime.UtcNow,
                Purpose = dto.Purpose,
                ExpectedReturnDate = dto.ExpectedReturnDate,
                Status = 0,
                Note = dto.Note,
                CreatedAt = DateTime.UtcNow
            };
            _context.MedicalRecordBorrowRequests.Add(entity);
            await _context.SaveChangesAsync();

            return new MedicalRecordBorrowRequestDto
            {
                Id = entity.Id,
                RequestCode = entity.RequestCode,
                RecordId = entity.MedicalRecordArchiveId,
                ArchiveCode = archive.ArchiveCode,
                PatientName = archive.Patient?.FullName ?? "",
                RequestDate = entity.RequestDate,
                RequestedById = entity.RequestedById,
                Purpose = entity.Purpose ?? "",
                ExpectedReturnDate = entity.ExpectedReturnDate,
                Status = "Chờ duyệt",
                Note = entity.Note ?? ""
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in CreateBorrowRequestAsync");
            return new MedicalRecordBorrowRequestDto { Id = Guid.NewGuid(), Status = "Error" };
        }
    }

    public async Task<bool> ApproveBorrowRequestAsync(Guid requestId)
    {
        try
        {
            var request = await _context.MedicalRecordBorrowRequests.FindAsync(requestId);
            if (request == null || request.Status != 0) return false;
            request.Status = 1;
            request.ApprovedDate = DateTime.UtcNow;
            request.ApprovedById = (Guid?)null;
            request.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ApproveBorrowRequestAsync");
            return false;
        }
    }

    public async Task<bool> RejectBorrowRequestAsync(Guid requestId, string reason)
    {
        try
        {
            var request = await _context.MedicalRecordBorrowRequests.FindAsync(requestId);
            if (request == null || request.Status != 0) return false;
            request.Status = 2;
            request.RejectReason = reason;
            request.ApprovedDate = DateTime.UtcNow;
            request.ApprovedById = (Guid?)null;
            request.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in RejectBorrowRequestAsync");
            return false;
        }
    }

    public async Task<bool> ProcessBorrowAsync(Guid requestId)
    {
        try
        {
            var request = await _context.MedicalRecordBorrowRequests
                .Include(r => r.MedicalRecordArchive)
                .FirstOrDefaultAsync(r => r.Id == requestId);
            if (request == null || request.Status != 1) return false;
            request.Status = 3;
            request.BorrowedDate = DateTime.UtcNow;
            request.UpdatedAt = DateTime.UtcNow;
            // Update archive status to "Đang mượn"
            if (request.MedicalRecordArchive != null)
            {
                request.MedicalRecordArchive.Status = 2;
                request.MedicalRecordArchive.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ProcessBorrowAsync");
            return false;
        }
    }

    public async Task<bool> ReturnMedicalRecordAsync(Guid requestId, string note)
    {
        try
        {
            var request = await _context.MedicalRecordBorrowRequests
                .Include(r => r.MedicalRecordArchive)
                .FirstOrDefaultAsync(r => r.Id == requestId);
            if (request == null || request.Status != 3) return false;
            request.Status = 4;
            request.ReturnedDate = DateTime.UtcNow;
            request.Note = string.IsNullOrWhiteSpace(note) ? request.Note : (request.Note + "\n" + note).Trim();
            request.UpdatedAt = DateTime.UtcNow;
            // Update archive status back to "Đã lưu"
            if (request.MedicalRecordArchive != null)
            {
                request.MedicalRecordArchive.Status = 1;
                request.MedicalRecordArchive.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ReturnMedicalRecordAsync");
            return false;
        }
    }

    // 16.3 Dashboard thong ke benh vien
    public async Task<HospitalDashboardDto> GetHospitalDashboardAsync(DateTime? date = null)
    {
        var reportDate = date ?? DateTime.Today;
        try
        {
            var todayStart = reportDate.Date;
            var todayEnd = todayStart.AddDays(1);

            var todayExams = await _context.Examinations
                .CountAsync(e => e.CreatedAt >= todayStart && e.CreatedAt < todayEnd);

            var todayAdmissions = await _context.Admissions
                .CountAsync(a => a.AdmissionDate >= todayStart && a.AdmissionDate < todayEnd);

            var currentInpatients = await _context.Admissions
                .CountAsync(a => a.Status == 0); // 0 = Dang dieu tri

            var totalBeds = await _context.Beds.CountAsync(b => b.IsActive);

            var todayDischarges = await _context.Discharges
                .CountAsync(d => d.DischargeDate >= todayStart && d.DischargeDate < todayEnd);

            var todaySurgeries = await _context.ServiceRequests
                .CountAsync(sr => sr.RequestType == 3 && sr.CreatedAt >= todayStart && sr.CreatedAt < todayEnd); // 3 = Surgery

            // Emergency = QueueTickets with QueueType 3 (Emergency)
            var todayEmergencies = await _context.QueueTickets
                .CountAsync(q => q.QueueType == 3 && q.CreatedAt >= todayStart && q.CreatedAt < todayEnd);

            var todayRevenue = await _context.Receipts
                .Where(r => r.CreatedAt >= todayStart && r.CreatedAt < todayEnd && r.Status == 1)
                .SumAsync(r => (decimal?)r.Amount) ?? 0;

            // 7-day trends
            var trendStart = todayStart.AddDays(-6);
            var trends = new List<DashboardTrendDto>();
            for (var d = trendStart; d <= todayStart; d = d.AddDays(1))
            {
                var dEnd = d.AddDays(1);
                trends.Add(new DashboardTrendDto
                {
                    Date = d,
                    Outpatients = await _context.Examinations.CountAsync(e => e.CreatedAt >= d && e.CreatedAt < dEnd),
                    Admissions = await _context.Admissions.CountAsync(a => a.AdmissionDate >= d && a.AdmissionDate < dEnd),
                    Revenue = await _context.Receipts.Where(r => r.CreatedAt >= d && r.CreatedAt < dEnd && r.Status == 1).SumAsync(r => (decimal?)r.Amount) ?? 0
                });
            }

            return new HospitalDashboardDto
            {
                ReportDate = reportDate,
                TodayOutpatients = todayExams,
                TodayAdmissions = todayAdmissions,
                CurrentInpatients = currentInpatients,
                AvailableBeds = Math.Max(0, totalBeds - currentInpatients),
                TodayDischarges = todayDischarges,
                TodaySurgeries = todaySurgeries,
                TodayEmergencies = todayEmergencies,
                TodayRevenue = todayRevenue,
                Trends = trends
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetHospitalDashboardAsync");
            return new HospitalDashboardDto
            {
                ReportDate = reportDate,
                Trends = new List<DashboardTrendDto>()
            };
        }
    }

    public async Task<List<DepartmentStatisticsDto>> GetDepartmentStatisticsAsync(
        DateTime fromDate, DateTime toDate)
    {
        try
        {
            var from = fromDate.Date;
            var to = toDate.Date.AddDays(1);

            var departments = await _context.Departments.AsNoTracking()
                .Where(d => d.IsActive)
                .OrderBy(d => d.DisplayOrder)
                .ToListAsync();

            var result = new List<DepartmentStatisticsDto>();
            foreach (var dept in departments)
            {
                var outpatient = await _context.Examinations
                    .CountAsync(e => e.DepartmentId == dept.Id && e.CreatedAt >= from && e.CreatedAt < to);
                var admissions = await _context.Admissions
                    .CountAsync(a => a.DepartmentId == dept.Id && a.AdmissionDate >= from && a.AdmissionDate < to);
                var inpatient = await _context.Admissions
                    .CountAsync(a => a.DepartmentId == dept.Id && a.Status == 0);
                var discharges = await _context.Discharges
                    .CountAsync(d => d.Admission.DepartmentId == dept.Id && d.DischargeDate >= from && d.DischargeDate < to);
                var revenue = await _context.Receipts
                    .Where(r => r.MedicalRecord != null && r.MedicalRecord.DepartmentId == dept.Id && r.CreatedAt >= from && r.CreatedAt < to && r.Status == 1)
                    .SumAsync(r => (decimal?)r.Amount) ?? 0;

                result.Add(new DepartmentStatisticsDto
                {
                    DepartmentId = dept.Id,
                    DepartmentName = dept.DepartmentName,
                    OutpatientCount = outpatient,
                    InpatientCount = inpatient,
                    AdmissionCount = admissions,
                    DischargeCount = discharges,
                    Revenue = revenue
                });
            }
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDepartmentStatisticsAsync");
            return new List<DepartmentStatisticsDto>();
        }
    }

    // 16.4 Bao cao kham benh
    public async Task<List<ExaminationStatisticsDto>> GetExaminationStatisticsAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, Guid? doctorId = null)
    {
        try
        {
            var query = _context.Examinations.AsNoTracking()
                .Include(e => e.Department)
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate);
            if (departmentId.HasValue)
                query = query.Where(e => e.DepartmentId == departmentId.Value);
            if (doctorId.HasValue)
                query = query.Where(e => e.DoctorId == doctorId.Value);

            var result = await query
                .GroupBy(e => new { e.DepartmentId, e.Department.DepartmentName, Date = e.CreatedAt.Date })
                .Select(g => new ExaminationStatisticsDto
                {
                    Date = g.Key.Date,
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DepartmentName,
                    TotalExaminations = g.Count(),
                    NewPatients = g.Count(e => e.ExaminationType == 1),
                    FollowUpPatients = g.Count(e => e.ExaminationType == 2 || e.ExaminationType == 3)
                })
                .OrderBy(x => x.Date).ThenBy(x => x.DepartmentName)
                .ToListAsync();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetExaminationStatisticsAsync");
            return new List<ExaminationStatisticsDto>();
        }
    }

    // 16.5 Bao cao nhap vien
    public async Task<List<AdmissionStatisticsDto>> GetAdmissionStatisticsAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, string admissionSource = null)
    {
        try
        {
            var query = _context.Admissions.AsNoTracking()
                .Include(a => a.Department)
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate);
            if (departmentId.HasValue)
                query = query.Where(a => a.DepartmentId == departmentId.Value);
            if (!string.IsNullOrWhiteSpace(admissionSource))
                query = query.Where(a => a.ReferralSource != null && a.ReferralSource.Contains(admissionSource));

            var result = await query
                .GroupBy(a => new { a.DepartmentId, a.Department.DepartmentName, Date = a.AdmissionDate.Date })
                .Select(g => new AdmissionStatisticsDto
                {
                    Date = g.Key.Date,
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DepartmentName,
                    TotalAdmissions = g.Count(),
                    EmergencyAdmissions = g.Count(a => a.AdmissionType == 1),
                    ElectiveAdmissions = g.Count(a => a.AdmissionType == 3)
                })
                .OrderBy(x => x.Date).ThenBy(x => x.DepartmentName)
                .ToListAsync();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAdmissionStatisticsAsync");
            return new List<AdmissionStatisticsDto>();
        }
    }

    // 16.6 Bao cao xuat vien
    public async Task<List<DischargeStatisticsDto>> GetDischargeStatisticsAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, string dischargeType = null)
    {
        try
        {
            var query = _context.Discharges.AsNoTracking()
                .Include(d => d.Admission).ThenInclude(a => a.Department)
                .Where(d => d.DischargeDate >= fromDate && d.DischargeDate <= toDate);
            if (departmentId.HasValue)
                query = query.Where(d => d.Admission.DepartmentId == departmentId.Value);
            if (!string.IsNullOrWhiteSpace(dischargeType) && int.TryParse(dischargeType, out var dt))
                query = query.Where(d => d.DischargeType == dt);

            var result = await query
                .GroupBy(d => new { d.Admission.DepartmentId, d.Admission.Department.DepartmentName, Date = d.DischargeDate.Date })
                .Select(g => new DischargeStatisticsDto
                {
                    Date = g.Key.Date,
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DepartmentName,
                    TotalDischarges = g.Count(),
                    RecoveredCount = g.Count(d => d.DischargeCondition == 1),
                    ImprovedCount = g.Count(d => d.DischargeCondition == 2),
                    DeathCount = g.Count(d => d.DischargeCondition == 5 || d.DischargeType == 4)
                })
                .OrderBy(x => x.Date).ThenBy(x => x.DepartmentName)
                .ToListAsync();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDischargeStatisticsAsync");
            return new List<DischargeStatisticsDto>();
        }
    }

    // 16.7 Bao cao tu vong
    public async Task<List<MortalityStatisticsDto>> GetMortalityStatisticsAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var deathDischarges = _context.Discharges.AsNoTracking()
                .Include(d => d.Admission).ThenInclude(a => a.Department)
                .Where(d => d.DischargeDate >= fromDate && d.DischargeDate <= toDate)
                .Where(d => d.DischargeType == 4 || d.DischargeCondition == 5);
            if (departmentId.HasValue)
                deathDischarges = deathDischarges.Where(d => d.Admission.DepartmentId == departmentId.Value);

            var totalAdmissions = await _context.Admissions.AsNoTracking()
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate)
                .Where(a => !departmentId.HasValue || a.DepartmentId == departmentId.Value)
                .CountAsync();

            var result = await deathDischarges
                .GroupBy(d => new { d.Admission.DepartmentId, d.Admission.Department.DepartmentName })
                .Select(g => new MortalityStatisticsDto
                {
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DepartmentName,
                    TotalDeaths = g.Count(),
                    DeathWithin24Hours = g.Count(d =>
                        EF.Functions.DateDiffHour(d.Admission.AdmissionDate, d.DischargeDate) <= 24),
                    DeathAfter24Hours = g.Count(d =>
                        EF.Functions.DateDiffHour(d.Admission.AdmissionDate, d.DischargeDate) > 24),
                    MortalityRate = 0
                })
                .OrderByDescending(x => x.TotalDeaths)
                .ToListAsync();

            foreach (var item in result)
            {
                if (totalAdmissions > 0)
                    item.MortalityRate = Math.Round((double)item.TotalDeaths / totalAdmissions * 100, 2);
            }
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMortalityStatisticsAsync");
            return new List<MortalityStatisticsDto>();
        }
    }

    // 16.8 Bao cao benh theo ICD-10
    public async Task<List<DiseaseStatisticsDto>> GetDiseaseStatisticsAsync(
        DateTime fromDate, DateTime toDate, string icdChapter = null, Guid? departmentId = null)
    {
        try
        {
            var examQuery = _context.Examinations.AsNoTracking()
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate)
                .Where(e => e.MainIcdCode != null && e.MainIcdCode != "");
            if (departmentId.HasValue)
                examQuery = examQuery.Where(e => e.DepartmentId == departmentId.Value);
            if (!string.IsNullOrWhiteSpace(icdChapter))
                examQuery = examQuery.Where(e => e.MainIcdCode.StartsWith(icdChapter));

            var examStats = await examQuery
                .GroupBy(e => new { e.MainIcdCode, e.MainDiagnosis })
                .Select(g => new { g.Key.MainIcdCode, g.Key.MainDiagnosis, Count = g.Count() })
                .ToListAsync();

            var admissionQuery = _context.Admissions.AsNoTracking()
                .Include(a => a.MedicalRecord)
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate)
                .Where(a => a.MedicalRecord.MainIcdCode != null && a.MedicalRecord.MainIcdCode != "");
            if (departmentId.HasValue)
                admissionQuery = admissionQuery.Where(a => a.DepartmentId == departmentId.Value);
            if (!string.IsNullOrWhiteSpace(icdChapter))
                admissionQuery = admissionQuery.Where(a => a.MedicalRecord.MainIcdCode.StartsWith(icdChapter));

            var admissionStats = await admissionQuery
                .GroupBy(a => new { a.MedicalRecord.MainIcdCode, a.MedicalRecord.MainDiagnosis })
                .Select(g => new { g.Key.MainIcdCode, g.Key.MainDiagnosis, Count = g.Count() })
                .ToListAsync();

            var allIcds = examStats.Select(x => x.MainIcdCode)
                .Union(admissionStats.Select(x => x.MainIcdCode))
                .Distinct();

            var result = allIcds.Select(icd =>
            {
                var exam = examStats.FirstOrDefault(x => x.MainIcdCode == icd);
                var adm = admissionStats.FirstOrDefault(x => x.MainIcdCode == icd);
                var outpatient = exam?.Count ?? 0;
                var inpatient = adm?.Count ?? 0;
                return new DiseaseStatisticsDto
                {
                    IcdCode = icd,
                    IcdName = exam?.MainDiagnosis ?? adm?.MainDiagnosis ?? "",
                    TotalCases = outpatient + inpatient,
                    OutpatientCases = outpatient,
                    InpatientCases = inpatient
                };
            })
            .OrderByDescending(x => x.TotalCases)
            .ToList();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDiseaseStatisticsAsync");
            return new List<DiseaseStatisticsDto>();
        }
    }

    // 16.9 Bao cao hoat dong khoa
    public async Task<List<DepartmentActivityReportDto>> GetDepartmentActivityReportAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var deptQuery = _context.Departments.AsNoTracking()
                .Where(d => d.IsActive && !d.IsDeleted);
            if (departmentId.HasValue)
                deptQuery = deptQuery.Where(d => d.Id == departmentId.Value);

            var departments = await deptQuery.Select(d => new { d.Id, d.DepartmentName }).ToListAsync();

            var examCounts = await _context.Examinations.AsNoTracking()
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate)
                .GroupBy(e => e.DepartmentId)
                .Select(g => new { DeptId = g.Key, Count = g.Count() })
                .ToListAsync();

            var admissionCounts = await _context.Admissions.AsNoTracking()
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate)
                .GroupBy(a => a.DepartmentId)
                .Select(g => new { DeptId = g.Key, Count = g.Count() })
                .ToListAsync();

            var surgeryCounts = await _context.SurgeryRequests.AsNoTracking()
                .Include(s => s.MedicalRecord)
                .Where(s => s.CreatedAt >= fromDate && s.CreatedAt <= toDate)
                .Where(s => s.Status == 3)
                .Where(s => s.MedicalRecord != null && s.MedicalRecord.DepartmentId != null)
                .GroupBy(s => s.MedicalRecord.DepartmentId)
                .Select(g => new { DeptId = g.Key, Count = g.Count() })
                .ToListAsync();

            var labCounts = await _context.LabRequests.AsNoTracking()
                .Where(l => l.CreatedAt >= fromDate && l.CreatedAt <= toDate)
                .GroupBy(l => l.DepartmentId)
                .Select(g => new { DeptId = g.Key, Count = g.Count() })
                .ToListAsync();

            var revenueSums = await _context.Receipts.AsNoTracking()
                .Where(r => r.CreatedAt >= fromDate && r.CreatedAt <= toDate)
                .Include(r => r.MedicalRecord)
                .Where(r => r.MedicalRecord.DepartmentId != null)
                .GroupBy(r => r.MedicalRecord.DepartmentId)
                .Select(g => new { DeptId = g.Key, Sum = g.Sum(r => r.FinalAmount) })
                .ToListAsync();

            var result = departments.Select(d => new DepartmentActivityReportDto
            {
                DepartmentId = d.Id,
                DepartmentName = d.DepartmentName,
                OutpatientVisits = examCounts.FirstOrDefault(x => x.DeptId == d.Id)?.Count ?? 0,
                InpatientAdmissions = admissionCounts.FirstOrDefault(x => x.DeptId == d.Id)?.Count ?? 0,
                Surgeries = surgeryCounts.FirstOrDefault(x => x.DeptId == d.Id)?.Count ?? 0,
                LabTests = labCounts.FirstOrDefault(x => x.DeptId == d.Id)?.Count ?? 0,
                TotalRevenue = revenueSums.FirstOrDefault(x => x.DeptId == d.Id)?.Sum ?? 0
            })
            .OrderByDescending(x => x.OutpatientVisits + x.InpatientAdmissions)
            .ToList();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDepartmentActivityReportAsync");
            return new List<DepartmentActivityReportDto>();
        }
    }

    // 16.10 Bao cao cong suat giuong benh
    public async Task<List<BedOccupancyReportDto>> GetBedOccupancyReportAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var bedQuery = _context.Beds.AsNoTracking()
                .Include(b => b.Room).ThenInclude(r => r.Department)
                .Where(b => b.IsActive);
            if (departmentId.HasValue)
                bedQuery = bedQuery.Where(b => b.Room.Department.Id == departmentId.Value);

            var beds = await bedQuery.ToListAsync();
            var occupiedBedIds = await _context.Set<BedAssignment>().AsNoTracking()
                .Where(ba => ba.Status == 0)
                .Select(ba => ba.BedId)
                .Distinct()
                .ToListAsync();

            var result = beds
                .GroupBy(b => new { b.Room.Department.Id, b.Room.Department.DepartmentName })
                .Select(g =>
                {
                    var total = g.Count();
                    var occupied = g.Count(b => occupiedBedIds.Contains(b.Id));
                    return new BedOccupancyReportDto
                    {
                        DepartmentId = g.Key.Id,
                        DepartmentName = g.Key.DepartmentName,
                        TotalBeds = total,
                        OccupiedBeds = occupied,
                        AvailableBeds = total - occupied,
                        OccupancyRate = total > 0 ? Math.Round((double)occupied / total * 100, 1) : 0
                    };
                })
                .OrderByDescending(x => x.OccupancyRate)
                .ToList();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBedOccupancyReportAsync");
            return new List<BedOccupancyReportDto>();
        }
    }

    // 16.11 Bao cao A1-A2-A3 (BYT)
    public async Task<BYTReportDto> GetBYTReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var hospitalConfig = await _context.SystemConfigs.AsNoTracking()
                .Where(c => c.ConfigKey == "HospitalName" || c.ConfigKey == "HospitalCode")
                .ToListAsync();

            var totalOutpatients = await _context.Examinations.AsNoTracking()
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate)
                .CountAsync();

            var totalInpatients = await _context.Admissions.AsNoTracking()
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate)
                .CountAsync();

            var totalBeds = await _context.Beds.AsNoTracking()
                .Where(b => b.IsActive)
                .CountAsync();

            return new BYTReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                HospitalName = hospitalConfig.FirstOrDefault(c => c.ConfigKey == "HospitalName")?.ConfigValue ?? "BỆNH VIỆN ĐA KHOA",
                HospitalCode = hospitalConfig.FirstOrDefault(c => c.ConfigKey == "HospitalCode")?.ConfigValue ?? "",
                TotalOutpatients = totalOutpatients,
                TotalInpatients = totalInpatients,
                TotalBeds = totalBeds
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBYTReportAsync");
            return new BYTReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                HospitalName = string.Empty,
                HospitalCode = string.Empty,
                TotalOutpatients = 0,
                TotalInpatients = 0,
                TotalBeds = 0
            };
        }
    }

    // 16.12 KPI benh vien
    public async Task<List<HospitalKPIDto>> GetHospitalKPIsAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var totalExams = await _context.Examinations.AsNoTracking()
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate).CountAsync();
            var completedExams = await _context.Examinations.AsNoTracking()
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate && e.Status == 4).CountAsync();

            var totalAdmissions = await _context.Admissions.AsNoTracking()
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate).CountAsync();
            var discharges = await _context.Discharges.AsNoTracking()
                .Where(d => d.DischargeDate >= fromDate && d.DischargeDate <= toDate).ToListAsync();
            var deaths = discharges.Count(d => d.DischargeType == 4 || d.DischargeCondition == 5);

            var totalBeds = await _context.Beds.AsNoTracking().Where(b => b.IsActive).CountAsync();
            var occupiedBeds = await _context.Set<BedAssignment>().AsNoTracking()
                .Where(ba => ba.Status == 0).Select(ba => ba.BedId).Distinct().CountAsync();

            var avgLos = totalAdmissions > 0
                ? await _context.Discharges.AsNoTracking()
                    .Where(d => d.DischargeDate >= fromDate && d.DischargeDate <= toDate)
                    .Select(d => EF.Functions.DateDiffDay(d.Admission.AdmissionDate, d.DischargeDate))
                    .DefaultIfEmpty(0)
                    .AverageAsync()
                : 0;

            var kpis = new List<HospitalKPIDto>
            {
                new HospitalKPIDto
                {
                    KPIName = "Tỷ lệ hoàn thành khám",
                    KPICategory = "Khám bệnh",
                    TargetValue = 95,
                    ActualValue = totalExams > 0 ? Math.Round((decimal)completedExams / totalExams * 100, 1) : 0,
                    Unit = "%"
                },
                new HospitalKPIDto
                {
                    KPIName = "Công suất giường bệnh",
                    KPICategory = "Nội trú",
                    TargetValue = 85,
                    ActualValue = totalBeds > 0 ? Math.Round((decimal)occupiedBeds / totalBeds * 100, 1) : 0,
                    Unit = "%"
                },
                new HospitalKPIDto
                {
                    KPIName = "Số ngày điều trị trung bình",
                    KPICategory = "Nội trú",
                    TargetValue = 7,
                    ActualValue = Math.Round((decimal)avgLos, 1),
                    Unit = "ngày"
                },
                new HospitalKPIDto
                {
                    KPIName = "Tỷ lệ tử vong",
                    KPICategory = "Chất lượng",
                    TargetValue = 1,
                    ActualValue = totalAdmissions > 0 ? Math.Round((decimal)deaths / totalAdmissions * 100, 2) : 0,
                    Unit = "%"
                },
                new HospitalKPIDto
                {
                    KPIName = "Tổng lượt khám",
                    KPICategory = "Khám bệnh",
                    TargetValue = 1000,
                    ActualValue = totalExams,
                    Unit = "lượt"
                },
                new HospitalKPIDto
                {
                    KPIName = "Tổng lượt nhập viện",
                    KPICategory = "Nội trú",
                    TargetValue = 200,
                    ActualValue = totalAdmissions,
                    Unit = "lượt"
                }
            };

            foreach (var kpi in kpis)
            {
                kpi.Achievement = kpi.TargetValue > 0
                    ? Math.Round((double)(kpi.ActualValue / kpi.TargetValue * 100), 1)
                    : 0;
            }
            return kpis;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetHospitalKPIsAsync");
            return new List<HospitalKPIDto>();
        }
    }

    public async Task<byte[]> PrintStatisticsReportAsync(StatisticsReportRequest request)
    {
        try
        {
            string[] headers;
            var rows = new List<string[]>();
            var title = "BÁO CÁO THỐNG KÊ";

            switch (request.ReportType?.ToLower())
            {
                case "examination":
                    title = "BÁO CÁO KHÁM BỆNH";
                    headers = new[] { "Ngày", "Khoa", "Tổng khám", "Bệnh mới", "Tái khám" };
                    var exams = await GetExaminationStatisticsAsync(request.FromDate, request.ToDate, request.DepartmentId);
                    foreach (var e in exams)
                        rows.Add(new[] { e.Date.ToString("dd/MM/yyyy"), e.DepartmentName ?? "", e.TotalExaminations.ToString(), e.NewPatients.ToString(), e.FollowUpPatients.ToString() });
                    break;
                case "admission":
                    title = "BÁO CÁO NHẬP VIỆN";
                    headers = new[] { "Ngày", "Khoa", "Tổng nhập", "Cấp cứu", "Điều trị" };
                    var adms = await GetAdmissionStatisticsAsync(request.FromDate, request.ToDate, request.DepartmentId);
                    foreach (var a in adms)
                        rows.Add(new[] { a.Date.ToString("dd/MM/yyyy"), a.DepartmentName ?? "", a.TotalAdmissions.ToString(), a.EmergencyAdmissions.ToString(), a.ElectiveAdmissions.ToString() });
                    break;
                case "discharge":
                    title = "BÁO CÁO XUẤT VIỆN";
                    headers = new[] { "Ngày", "Khoa", "Tổng xuất", "Khỏi", "Đỡ", "Tử vong" };
                    var discs = await GetDischargeStatisticsAsync(request.FromDate, request.ToDate, request.DepartmentId);
                    foreach (var d in discs)
                        rows.Add(new[] { d.Date.ToString("dd/MM/yyyy"), d.DepartmentName ?? "", d.TotalDischarges.ToString(), d.RecoveredCount.ToString(), d.ImprovedCount.ToString(), d.DeathCount.ToString() });
                    break;
                case "bed":
                    title = "BÁO CÁO CÔNG SUẤT GIƯỜNG";
                    headers = new[] { "Khoa", "Tổng giường", "Đang dùng", "Còn trống", "Tỷ lệ (%)" };
                    var beds = await GetBedOccupancyReportAsync(request.FromDate, request.ToDate, request.DepartmentId);
                    foreach (var b in beds)
                        rows.Add(new[] { b.DepartmentName ?? "", b.TotalBeds.ToString(), b.OccupiedBeds.ToString(), b.AvailableBeds.ToString(), b.OccupancyRate.ToString("0.0") });
                    break;
                default:
                    title = "BÁO CÁO HOẠT ĐỘNG KHOA";
                    headers = new[] { "Khoa", "Ngoại trú", "Nội trú", "Phẫu thuật", "Xét nghiệm", "Doanh thu" };
                    var acts = await GetDepartmentActivityReportAsync(request.FromDate, request.ToDate, request.DepartmentId);
                    foreach (var a in acts)
                        rows.Add(new[] { a.DepartmentName ?? "", a.OutpatientVisits.ToString(), a.InpatientAdmissions.ToString(), a.Surgeries.ToString(), a.LabTests.ToString(), a.TotalRevenue.ToString("#,##0") });
                    break;
            }

            var subtitle = $"Từ {request.FromDate:dd/MM/yyyy} đến {request.ToDate:dd/MM/yyyy}";
            var html = PdfTemplateHelper.BuildTableReport(title, subtitle, DateTime.Now, headers, rows);
            return System.Text.Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in PrintStatisticsReportAsync");
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> ExportStatisticsReportToExcelAsync(StatisticsReportRequest request)
    {
        // Export as HTML table that can be opened in Excel
        var bytes = await PrintStatisticsReportAsync(request);
        return bytes;
    }

    #endregion

    #region Module 17: Quan tri He thong - 10 chuc nang

    // 17.1 Quan ly nguoi dung
    public async Task<List<SystemUserDto>> GetUsersAsync(
        string keyword = null, Guid? departmentId = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Users.AsNoTracking()
                .Where(u => !u.IsDeleted)
                .Include(u => u.Department)
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(u =>
                    u.FullName.Contains(keyword) ||
                    u.Username.Contains(keyword) ||
                    (u.Email != null && u.Email.Contains(keyword)) ||
                    (u.EmployeeCode != null && u.EmployeeCode.Contains(keyword)));
            if (departmentId.HasValue)
                query = query.Where(u => u.DepartmentId == departmentId.Value);
            if (isActive.HasValue)
                query = query.Where(u => u.IsActive == isActive.Value);

            var items = await query.OrderBy(u => u.FullName).ThenBy(u => u.Username).Take(500).ToListAsync();

            // Batch lookup last login IP from UserSessions
            var userIds = items.Select(u => u.Id).ToList();
            var lastSessions = await _context.UserSessions.AsNoTracking()
                .Where(s => userIds.Contains(s.UserId))
                .GroupBy(s => s.UserId)
                .Select(g => new { UserId = g.Key, LastIP = g.OrderByDescending(s => s.LoginTime).Select(s => s.IPAddress).FirstOrDefault() })
                .ToListAsync();
            var ipLookup = lastSessions.ToDictionary(s => s.UserId, s => s.LastIP);

            return items.Select(u => new SystemUserDto
            {
                Id = u.Id,
                Username = u.Username,
                FullName = u.FullName,
                Email = u.Email,
                Phone = u.PhoneNumber,
                DepartmentId = u.DepartmentId,
                DepartmentName = u.Department?.DepartmentName,
                Roles = u.UserRoles?.Select(ur => ur.Role?.RoleName).Where(r => r != null).ToList() ?? new List<string>(),
                Permissions = new List<string>(),
                IsActive = u.IsActive,
                LastLoginDate = u.LastLoginAt,
                LastLoginIP = ipLookup.TryGetValue(u.Id, out var ip) ? ip : null
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetUsersAsync");
            return new List<SystemUserDto>();
        }
    }

    public async Task<SystemUserDto> GetUserAsync(Guid userId)
    {
        try
        {
            var u = await _context.Users.AsNoTracking()
                .Include(x => x.Department)
                .Include(x => x.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(x => x.Id == userId);
            if (u == null) return null;

            // Lookup last login IP from UserSessions
            var lastSession = await _context.UserSessions.AsNoTracking()
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.LoginTime)
                .FirstOrDefaultAsync();

            // Lookup user permissions through roles
            var roleIds = u.UserRoles?.Select(ur => ur.RoleId).ToList() ?? new List<Guid>();
            var permissions = roleIds.Any()
                ? await _context.RolePermissions.AsNoTracking()
                    .Include(rp => rp.Permission)
                    .Where(rp => roleIds.Contains(rp.RoleId))
                    .Select(rp => rp.Permission.PermissionName)
                    .Distinct()
                    .ToListAsync()
                : new List<string>();

            return new SystemUserDto
            {
                Id = u.Id,
                Username = u.Username,
                FullName = u.FullName,
                Email = u.Email,
                Phone = u.PhoneNumber,
                DepartmentId = u.DepartmentId,
                DepartmentName = u.Department?.DepartmentName,
                Roles = u.UserRoles?.Select(ur => ur.Role?.RoleName).Where(r => r != null).ToList() ?? new List<string>(),
                Permissions = permissions,
                IsActive = u.IsActive,
                LastLoginDate = u.LastLoginAt,
                LastLoginIP = lastSession?.IPAddress
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetUserAsync");
            return null;
        }
    }

    public async Task<SystemUserDto> CreateUserAsync(CreateUserDto dto)
    {
        try
        {
            // Check for duplicate username
            var existingUser = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Username == dto.Username);
            if (existingUser != null)
            {
                _logger.LogWarning("CreateUserAsync: Username '{Username}' already exists", dto.Username);
                return null;
            }

            var user = new User
            {
                Username = dto.Username ?? string.Empty,
                FullName = dto.FullName ?? string.Empty,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                DepartmentId = dto.DepartmentId,
                PasswordHash = HashPassword(dto.InitialPassword ?? "123456"),
                IsActive = true,
                UserType = 5 // Default: Employee
            };
            _context.Users.Add(user);

            // Assign roles
            var roleNames = new List<string>();
            if (dto.RoleIds?.Any() == true)
            {
                var roles = await _context.Roles.AsNoTracking()
                    .Where(r => dto.RoleIds.Contains(r.Id))
                    .ToListAsync();
                roleNames = roles.Select(r => r.RoleName).ToList();

                foreach (var roleId in dto.RoleIds)
                {
                    _context.UserRoles.Add(new UserRole
                    {
                        UserId = user.Id,
                        RoleId = roleId
                    });
                }
            }

            await _context.SaveChangesAsync();

            // Load department name for response
            var deptName = user.DepartmentId.HasValue
                ? (await _context.Departments.AsNoTracking().FirstOrDefaultAsync(d => d.Id == user.DepartmentId.Value))?.DepartmentName
                : null;

            return new SystemUserDto
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.PhoneNumber,
                DepartmentId = user.DepartmentId,
                DepartmentName = deptName,
                IsActive = user.IsActive,
                Roles = roleNames,
                Permissions = new List<string>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in CreateUserAsync");
            return null;
        }
    }

    public async Task<SystemUserDto> UpdateUserAsync(Guid userId, UpdateUserDto dto)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return null;

            user.FullName = dto.FullName ?? user.FullName;
            user.Email = dto.Email;
            user.PhoneNumber = dto.PhoneNumber;
            user.DepartmentId = dto.DepartmentId;
            user.IsActive = dto.IsActive;

            // Sync roles if RoleIds provided
            if (dto.RoleIds != null)
            {
                // Remove existing role assignments
                var existingRoles = await _context.UserRoles.Where(ur => ur.UserId == userId).ToListAsync();
                _context.UserRoles.RemoveRange(existingRoles);

                // Add new role assignments
                foreach (var roleId in dto.RoleIds)
                {
                    _context.UserRoles.Add(new UserRole
                    {
                        UserId = userId,
                        RoleId = roleId
                    });
                }
            }

            await _context.SaveChangesAsync();
            return await GetUserAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UpdateUserAsync");
            return null;
        }
    }

    public async Task<bool> DeleteUserAsync(Guid userId)
    {
        return await SoftDeleteEntityAsync<User>(userId);
    }

    public async Task<bool> ResetPasswordAsync(Guid userId)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return false;
            user.PasswordHash = HashPassword("123456"); // Default reset password
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ResetPasswordAsync");
            return false;
        }
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, AdminChangePasswordDto dto)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return false;
            if (dto.NewPassword != dto.ConfirmPassword) return false;
            user.PasswordHash = HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ChangePasswordAsync");
            return false;
        }
    }

    public async Task<bool> LockUserAsync(Guid userId, string reason)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return false;
            user.IsActive = false;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in LockUserAsync");
            return false;
        }
    }

    public async Task<bool> UnlockUserAsync(Guid userId)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return false;
            user.IsActive = true;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UnlockUserAsync");
            return false;
        }
    }

    // 17.2 Quan ly vai tro
    public async Task<List<RoleDto>> GetRolesAsync(bool? isActive = null)
    {
        try
        {
            var query = _context.Roles.AsNoTracking()
                .Where(r => !r.IsDeleted)
                .Include(r => r.UserRoles)
                .Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
                .AsQueryable();

            var items = await query.OrderBy(r => r.RoleCode).ToListAsync();
            return items.Select(r => new RoleDto
            {
                Id = r.Id,
                Code = r.RoleCode,
                Name = r.RoleName,
                Description = r.Description,
                Permissions = r.RolePermissions?.Select(rp => rp.Permission?.PermissionName).Where(p => p != null).ToList() ?? new List<string>(),
                UserCount = r.UserRoles?.Count(ur => !ur.IsDeleted) ?? 0,
                IsActive = !r.IsDeleted
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetRolesAsync");
            return new List<RoleDto>();
        }
    }

    public async Task<RoleDto> GetRoleAsync(Guid roleId)
    {
        try
        {
            var r = await _context.Roles.AsNoTracking()
                .Include(x => x.UserRoles)
                .Include(x => x.RolePermissions).ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(x => x.Id == roleId);
            if (r == null) return null;
            return new RoleDto
            {
                Id = r.Id,
                Code = r.RoleCode,
                Name = r.RoleName,
                Description = r.Description,
                Permissions = r.RolePermissions?.Select(rp => rp.Permission?.PermissionName).Where(p => p != null).ToList() ?? new List<string>(),
                UserCount = r.UserRoles?.Count ?? 0,
                IsActive = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetRoleAsync");
            return null;
        }
    }

    public async Task<RoleDto> SaveRoleAsync(RoleDto dto)
    {
        try
        {
            Role entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Role
                {
                    RoleCode = dto.Code ?? string.Empty,
                    RoleName = dto.Name ?? string.Empty,
                    Description = dto.Description
                };
                _context.Roles.Add(entity);
            }
            else
            {
                entity = await _context.Roles.FirstOrDefaultAsync(r => r.Id == dto.Id);
                if (entity == null) return null;
                entity.RoleCode = dto.Code ?? entity.RoleCode;
                entity.RoleName = dto.Name ?? entity.RoleName;
                entity.Description = dto.Description;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveRoleAsync");
            return null;
        }
    }

    public async Task<bool> DeleteRoleAsync(Guid roleId)
    {
        return await SoftDeleteEntityAsync<Role>(roleId);
    }

    // 17.3 Quan ly quyen
    public async Task<List<PermissionDto>> GetPermissionsAsync(string module = null)
    {
        try
        {
            var query = _context.Permissions.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(module))
                query = query.Where(p => p.Module == module);

            var items = await query.OrderBy(p => p.Module).ThenBy(p => p.PermissionCode).ToListAsync();
            return items.Select(p => new PermissionDto
            {
                Code = p.PermissionCode,
                Name = p.PermissionName,
                Module = p.Module,
                Description = p.Description
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetPermissionsAsync");
            return new List<PermissionDto>();
        }
    }

    public async Task<List<PermissionDto>> GetRolePermissionsAsync(Guid roleId)
    {
        try
        {
            var rolePerms = await _context.RolePermissions.AsNoTracking()
                .Include(rp => rp.Permission)
                .Where(rp => rp.RoleId == roleId)
                .ToListAsync();

            return rolePerms.Select(rp => new PermissionDto
            {
                Code = rp.Permission?.PermissionCode,
                Name = rp.Permission?.PermissionName,
                Module = rp.Permission?.Module,
                Description = rp.Permission?.Description
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetRolePermissionsAsync");
            return new List<PermissionDto>();
        }
    }

    public async Task<bool> UpdateRolePermissionsAsync(Guid roleId, List<Guid> permissionIds)
    {
        try
        {
            var existing = await _context.RolePermissions.Where(rp => rp.RoleId == roleId).ToListAsync();
            _context.RolePermissions.RemoveRange(existing);

            foreach (var permId in permissionIds)
            {
                _context.RolePermissions.Add(new RolePermission
                {
                    RoleId = roleId,
                    PermissionId = permId
                });
            }
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UpdateRolePermissionsAsync");
            return false;
        }
    }

    public async Task<List<PermissionDto>> GetUserPermissionsAsync(Guid userId)
    {
        try
        {
            var userRoles = await _context.UserRoles.AsNoTracking()
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.RoleId)
                .ToListAsync();

            var perms = await _context.RolePermissions.AsNoTracking()
                .Include(rp => rp.Permission)
                .Where(rp => userRoles.Contains(rp.RoleId))
                .ToListAsync();

            return perms
                .Select(rp => rp.Permission)
                .Where(p => p != null)
                .DistinctBy(p => p.Id)
                .Select(p => new PermissionDto
                {
                    Code = p.PermissionCode,
                    Name = p.PermissionName,
                    Module = p.Module,
                    Description = p.Description
                }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetUserPermissionsAsync");
            return new List<PermissionDto>();
        }
    }

    public async Task<bool> UpdateUserPermissionsAsync(Guid userId, List<Guid> permissionIds)
    {
        // User permissions are managed through roles in this system
        _logger.LogWarning("UpdateUserPermissionsAsync: Permissions are managed through roles");
        return false;
    }

    // 17.4 Nhat ky he thong
    public async Task<List<AuditLogDto>> GetAuditLogsAsync(AuditLogSearchDto search)
    {
        try
        {
            var query = _context.AuditLogs.AsNoTracking().AsQueryable();

            if (search?.FromDate.HasValue == true)
                query = query.Where(l => l.CreatedAt >= search.FromDate.Value);
            if (search?.ToDate.HasValue == true)
                query = query.Where(l => l.CreatedAt <= search.ToDate.Value);
            if (search?.UserId.HasValue == true)
                query = query.Where(l => l.UserId == search.UserId.Value);
            if (!string.IsNullOrWhiteSpace(search?.Action))
                query = query.Where(l => l.Action == search.Action);
            if (!string.IsNullOrWhiteSpace(search?.EntityType))
                query = query.Where(l => l.TableName == search.EntityType || l.EntityType == search.EntityType);

            // Keyword search across username, action, entity type, details
            if (!string.IsNullOrWhiteSpace(search?.Keyword))
            {
                var kw = search.Keyword;
                query = query.Where(l =>
                    (l.Username != null && l.Username.Contains(kw)) ||
                    (l.Action != null && l.Action.Contains(kw)) ||
                    (l.TableName != null && l.TableName.Contains(kw)) ||
                    (l.EntityType != null && l.EntityType.Contains(kw)) ||
                    (l.Details != null && l.Details.Contains(kw)) ||
                    (l.UserFullName != null && l.UserFullName.Contains(kw))
                );
            }

            query = query.OrderByDescending(l => l.CreatedAt);

            if (search?.PageIndex.HasValue == true && search?.PageSize.HasValue == true)
            {
                var skip = search.PageIndex.Value * search.PageSize.Value;
                query = query.Skip(skip).Take(search.PageSize.Value);
            }
            else
            {
                query = query.Take(100);
            }

            var items = await query.ToListAsync();
            return items.Select(l => new AuditLogDto
            {
                Id = l.Id,
                LogTime = l.Timestamp != default ? l.Timestamp : l.CreatedAt,
                UserId = l.UserId,
                Username = l.Username ?? l.UserFullName,
                Action = l.Action,
                Module = l.Module,
                EntityType = l.EntityType ?? l.TableName,
                EntityId = l.EntityId ?? l.RecordId.ToString(),
                OldValue = l.OldValues,
                NewValue = l.NewValues,
                IpAddress = l.IpAddress,
                UserAgent = l.UserAgent
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAuditLogsAsync");
            return new List<AuditLogDto>();
        }
    }

    public async Task<AuditLogDto> GetAuditLogAsync(Guid logId)
    {
        try
        {
            var l = await _context.AuditLogs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == logId);
            if (l == null) return null;
            return new AuditLogDto
            {
                Id = l.Id,
                LogTime = l.Timestamp != default ? l.Timestamp : l.CreatedAt,
                UserId = l.UserId,
                Username = l.Username ?? l.UserFullName,
                Action = l.Action,
                Module = l.Module,
                EntityType = l.EntityType ?? l.TableName,
                EntityId = l.EntityId ?? l.RecordId.ToString(),
                OldValue = l.OldValues,
                NewValue = l.NewValues,
                IpAddress = l.IpAddress,
                UserAgent = l.UserAgent
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAuditLogAsync");
            return null;
        }
    }

    public async Task<byte[]> ExportAuditLogsToExcelAsync(AuditLogSearchDto search)
    {
        try
        {
            var query = _context.Set<AuditLog>().AsNoTracking().AsQueryable();
            if (search?.FromDate.HasValue == true) query = query.Where(a => a.Timestamp >= search.FromDate);
            if (search?.ToDate.HasValue == true) query = query.Where(a => a.Timestamp <= search.ToDate);
            if (!string.IsNullOrWhiteSpace(search?.Action)) query = query.Where(a => a.Action == search.Action);
            if (!string.IsNullOrWhiteSpace(search?.EntityType)) query = query.Where(a => a.EntityType == search.EntityType);

            var logs = await query.OrderByDescending(a => a.Timestamp).Take(2000).ToListAsync();

            var rows = logs.Select(a => new string[] {
                a.Timestamp.ToString("dd/MM/yyyy HH:mm:ss"), a.UserFullName ?? a.Username ?? "",
                a.Action ?? "", a.EntityType ?? "", a.Details ?? "", a.IpAddress ?? ""
            }).ToList();

            var html = BuildTableReport("NHAT KY HE THONG", $"Tong: {logs.Count} ban ghi", DateTime.Now,
                new[] { "Thoi gian", "Nguoi dung", "Hanh dong", "Doi tuong", "Mo ta", "IP" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    // 17.5 Cau hinh he thong
    public async Task<List<SystemConfigDto>> GetSystemConfigsAsync(string category = null)
    {
        try
        {
            var query = _context.SystemConfigs.AsNoTracking()
                .Where(c => c.IsActive)
                .AsQueryable();

            // Filter by category (convention: ConfigKey prefix before '.' is the category)
            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(c => c.ConfigKey.StartsWith(category + ".") || c.ConfigType == category);

            var items = await query.OrderBy(c => c.ConfigKey).ToListAsync();
            return items.Select(c => new SystemConfigDto
            {
                Key = c.ConfigKey,
                Value = c.ConfigValue,
                DataType = c.ConfigType,
                Description = c.Description,
                Category = c.ConfigKey.Contains('.') ? c.ConfigKey.Substring(0, c.ConfigKey.IndexOf('.')) : "General",
                IsEditable = true
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemConfigsAsync");
            return new List<SystemConfigDto>();
        }
    }

    public async Task<SystemConfigDto> GetSystemConfigAsync(string configKey)
    {
        try
        {
            var c = await _context.SystemConfigs.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ConfigKey == configKey);
            if (c == null) return null;
            return new SystemConfigDto
            {
                Key = c.ConfigKey,
                Value = c.ConfigValue,
                DataType = c.ConfigType,
                Description = c.Description,
                Category = c.ConfigKey.Contains('.') ? c.ConfigKey.Substring(0, c.ConfigKey.IndexOf('.')) : "General",
                IsEditable = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemConfigAsync");
            return null;
        }
    }

    public async Task<SystemConfigDto> SaveSystemConfigAsync(SystemConfigDto dto)
    {
        try
        {
            var entity = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == dto.Key);

            if (entity == null)
            {
                entity = new SystemConfig
                {
                    ConfigKey = dto.Key ?? string.Empty,
                    ConfigValue = dto.Value ?? string.Empty,
                    ConfigType = dto.DataType ?? "String",
                    Description = dto.Description,
                    IsActive = true
                };
                _context.SystemConfigs.Add(entity);
            }
            else
            {
                entity.ConfigValue = dto.Value ?? entity.ConfigValue;
                entity.ConfigType = dto.DataType ?? entity.ConfigType;
                entity.Description = dto.Description;
            }
            await _context.SaveChangesAsync();
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveSystemConfigAsync");
            return null;
        }
    }

    public async Task<bool> DeleteSystemConfigAsync(string configKey)
    {
        try
        {
            var entity = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == configKey);
            if (entity == null) return false;
            entity.IsDeleted = true;
            entity.IsActive = false;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in DeleteSystemConfigAsync");
            return false;
        }
    }

    // 17.6 Quan ly phien dang nhap
    public async Task<List<UserSessionDto>> GetActiveSessionsAsync(Guid? userId = null)
    {
        try
        {
            var query = _context.UserSessions.AsNoTracking()
                .Include(s => s.User)
                .Where(s => s.Status == 0) // 0 = Active
                .AsQueryable();

            if (userId.HasValue)
                query = query.Where(s => s.UserId == userId.Value);

            var items = await query.OrderByDescending(s => s.LoginTime).Take(200).ToListAsync();
            return items.Select(s => new UserSessionDto
            {
                Id = s.Id,
                UserId = s.UserId,
                Username = s.User != null ? $"{s.User.Username} ({s.User.FullName})" : null,
                IpAddress = s.IPAddress,
                UserAgent = s.UserAgent,
                LoginTime = s.LoginTime,
                LastActivityTime = s.LogoutTime ?? s.LoginTime,
                IsActive = s.Status == 0
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetActiveSessionsAsync");
            return new List<UserSessionDto>();
        }
    }

    public async Task<bool> TerminateSessionAsync(Guid sessionId)
    {
        try
        {
            var session = await _context.UserSessions.FirstOrDefaultAsync(s => s.Id == sessionId);
            if (session == null) return false;
            session.Status = 2; // Logged out
            session.LogoutTime = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in TerminateSessionAsync");
            return false;
        }
    }

    public async Task<bool> TerminateAllSessionsAsync(Guid userId)
    {
        try
        {
            var sessions = await _context.UserSessions
                .Where(s => s.UserId == userId && s.Status == 0)
                .ToListAsync();

            foreach (var session in sessions)
            {
                session.Status = 2;
                session.LogoutTime = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in TerminateAllSessionsAsync");
            return false;
        }
    }

    // 17.7 Quan ly thong bao he thong
    public async Task<List<SystemNotificationDto>> GetSystemNotificationsAsync(bool? isActive = null)
    {
        try
        {
            var query = _context.Notifications.AsNoTracking()
                .Where(n => !n.IsDeleted)
                .AsQueryable();

            if (isActive.HasValue)
            {
                if (isActive.Value)
                    query = query.Where(n => !n.IsRead);
                else
                    query = query.Where(n => n.IsRead);
            }

            var items = await query.OrderByDescending(n => n.CreatedAt).Take(100).ToListAsync();
            return items.Select(n => new SystemNotificationDto
            {
                Id = n.Id,
                Title = n.Title,
                Message = n.Content,
                NotificationType = n.NotificationType,
                StartTime = n.CreatedAt,
                IsActive = !n.IsRead,
                CreatedBy = n.CreatedBy,
                CreatedAt = n.CreatedAt
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemNotificationsAsync");
            return new List<SystemNotificationDto>();
        }
    }

    public async Task<SystemNotificationDto> GetSystemNotificationAsync(Guid notificationId)
    {
        try
        {
            var n = await _context.Notifications.AsNoTracking()
                .Include(x => x.TargetUser)
                .FirstOrDefaultAsync(x => x.Id == notificationId);
            if (n == null) return null;
            return new SystemNotificationDto
            {
                Id = n.Id,
                Title = n.Title,
                Message = n.Content,
                NotificationType = n.NotificationType,
                StartTime = n.CreatedAt,
                IsActive = !n.IsRead,
                TargetUsers = n.TargetUserId.HasValue ? new List<Guid> { n.TargetUserId.Value } : new List<Guid>(),
                CreatedBy = n.CreatedBy,
                CreatedAt = n.CreatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemNotificationAsync");
            return null;
        }
    }

    public async Task<SystemNotificationDto> SaveSystemNotificationAsync(SystemNotificationDto dto)
    {
        try
        {
            Notification entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Notification
                {
                    Title = dto.Title ?? string.Empty,
                    Content = dto.Message ?? string.Empty,
                    NotificationType = dto.NotificationType ?? "Info",
                    TargetUserId = dto.TargetUsers?.FirstOrDefault(),
                    IsRead = false
                };
                _context.Notifications.Add(entity);

                // If multiple target users, create a notification for each
                if (dto.TargetUsers?.Count > 1)
                {
                    foreach (var targetUserId in dto.TargetUsers.Skip(1))
                    {
                        _context.Notifications.Add(new Notification
                        {
                            Title = dto.Title ?? string.Empty,
                            Content = dto.Message ?? string.Empty,
                            NotificationType = dto.NotificationType ?? "Info",
                            TargetUserId = targetUserId,
                            IsRead = false
                        });
                    }
                }
            }
            else
            {
                entity = await _context.Notifications.FirstOrDefaultAsync(n => n.Id == dto.Id);
                if (entity == null) return null;
                entity.Title = dto.Title ?? entity.Title;
                entity.Content = dto.Message ?? entity.Content;
                entity.NotificationType = dto.NotificationType ?? entity.NotificationType;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveSystemNotificationAsync");
            return null;
        }
    }

    public async Task<bool> DeleteSystemNotificationAsync(Guid notificationId)
    {
        return await SoftDeleteEntityAsync<Notification>(notificationId);
    }

    // 17.8 Sao luu du lieu
    public async Task<List<BackupHistoryDto>> GetBackupHistoryAsync(
        DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            // Query SQL Server backup history from msdb system database
            var results = new List<BackupHistoryDto>();

            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT
                    bs.backup_set_id,
                    bs.name,
                    CASE bs.type
                        WHEN 'D' THEN 'Full'
                        WHEN 'I' THEN 'Differential'
                        WHEN 'L' THEN 'TransactionLog'
                        ELSE bs.type
                    END AS BackupType,
                    bmf.physical_device_name AS FilePath,
                    bs.backup_size,
                    bs.backup_start_date,
                    bs.user_name,
                    CASE
                        WHEN bs.backup_finish_date IS NOT NULL THEN 'Completed'
                        ELSE 'InProgress'
                    END AS Status
                FROM msdb.dbo.backupset bs
                INNER JOIN msdb.dbo.backupmediafamily bmf ON bs.media_set_id = bmf.media_set_id
                WHERE bs.database_name = DB_NAME()
                ORDER BY bs.backup_start_date DESC";

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var backupDate = reader.GetDateTime(5);
                if (fromDate.HasValue && backupDate < fromDate.Value) continue;
                if (toDate.HasValue && backupDate > toDate.Value) continue;

                results.Add(new BackupHistoryDto
                {
                    Id = Guid.NewGuid(), // backup_set_id is int, generate GUID for DTO
                    BackupName = reader.IsDBNull(1) ? $"Backup_{backupDate:yyyyMMdd}" : reader.GetString(1),
                    BackupType = reader.GetString(2),
                    FilePath = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                    FileSize = reader.IsDBNull(4) ? 0 : Convert.ToInt64(reader.GetDecimal(4)),
                    BackupDate = backupDate,
                    BackupBy = reader.IsDBNull(6) ? string.Empty : reader.GetString(6),
                    Status = reader.GetString(7)
                });
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBackupHistoryAsync (msdb query may require elevated permissions)");
            return new List<BackupHistoryDto>();
        }
    }

    public async Task<BackupHistoryDto> CreateBackupAsync(CreateBackupDto dto)
    {
        _logger.LogWarning("CreateBackupAsync: Database backup not implemented in application layer");
        return new BackupHistoryDto
        {
            Id = Guid.NewGuid(),
            BackupName = dto.BackupName,
            BackupType = dto.BackupType,
            BackupDate = DateTime.UtcNow,
            Status = "NotImplemented"
        };
    }

    public async Task<bool> RestoreBackupAsync(Guid backupId)
    {
        _logger.LogWarning("RestoreBackupAsync: Not implemented");
        return false;
    }

    public async Task<bool> DeleteBackupAsync(Guid backupId)
    {
        _logger.LogWarning("DeleteBackupAsync: Not implemented");
        return false;
    }

    // 17.9 Giam sat he thong
    public async Task<SystemHealthDto> GetSystemHealthAsync()
    {
        var dbStatus = "Unknown";
        try
        {
            var canConnect = await _context.Database.CanConnectAsync();
            dbStatus = canConnect ? "Healthy" : "Unhealthy";
        }
        catch
        {
            dbStatus = "Unhealthy";
        }

        // Memory usage from current process
        double memoryUsagePct = 0;
        try
        {
            var process = System.Diagnostics.Process.GetCurrentProcess();
            var workingSetMB = process.WorkingSet64 / (1024.0 * 1024.0);
            // Approximate: ratio of working set to 2GB as a simple metric
            memoryUsagePct = Math.Round(workingSetMB / 2048.0 * 100, 1);
            if (memoryUsagePct > 100) memoryUsagePct = 99;
        }
        catch { /* ignore process access errors */ }

        // Disk usage from application directory
        double diskUsagePct = 0;
        try
        {
            var appDir = AppDomain.CurrentDomain.BaseDirectory;
            var driveInfo = new System.IO.DriveInfo(System.IO.Path.GetPathRoot(appDir) ?? "C");
            if (driveInfo.IsReady && driveInfo.TotalSize > 0)
            {
                var usedBytes = driveInfo.TotalSize - driveInfo.AvailableFreeSpace;
                diskUsagePct = Math.Round((double)usedBytes / driveInfo.TotalSize * 100, 1);
            }
        }
        catch { /* ignore disk access errors */ }

        var overallStatus = dbStatus == "Healthy" ? "Healthy" : "Degraded";
        if (memoryUsagePct > 90 || diskUsagePct > 95) overallStatus = "Degraded";

        return new SystemHealthDto
        {
            Status = overallStatus,
            CpuUsage = 0, // CPU requires PerformanceCounter or OS-specific API
            MemoryUsage = memoryUsagePct,
            DiskUsage = diskUsagePct,
            DatabaseStatus = dbStatus,
            LastCheckTime = DateTime.UtcNow
        };
    }

    public async Task<List<SystemResourceDto>> GetSystemResourcesAsync()
    {
        try
        {
            var resources = new List<SystemResourceDto>();

            // Memory stats from GC and Process
            var process = System.Diagnostics.Process.GetCurrentProcess();
            var workingSetMB = process.WorkingSet64 / (1024.0 * 1024.0);
            var gcTotalMemMB = GC.GetTotalMemory(false) / (1024.0 * 1024.0);
            var maxWorkingSetMB = process.PeakWorkingSet64 / (1024.0 * 1024.0);

            resources.Add(new SystemResourceDto
            {
                ResourceName = "Process Memory",
                ResourceType = "RAM",
                CurrentValue = Math.Round(workingSetMB, 1),
                MaxValue = Math.Round(maxWorkingSetMB, 1),
                UtilizationPercentage = maxWorkingSetMB > 0 ? Math.Round(workingSetMB / maxWorkingSetMB * 100, 1) : 0
            });

            resources.Add(new SystemResourceDto
            {
                ResourceName = "GC Managed Memory",
                ResourceType = "RAM",
                CurrentValue = Math.Round(gcTotalMemMB, 1),
                MaxValue = Math.Round(workingSetMB, 1),
                UtilizationPercentage = workingSetMB > 0 ? Math.Round(gcTotalMemMB / workingSetMB * 100, 1) : 0
            });

            // Thread pool stats
            System.Threading.ThreadPool.GetAvailableThreads(out var workerAvail, out var ioAvail);
            System.Threading.ThreadPool.GetMaxThreads(out var workerMax, out var ioMax);
            var workerInUse = workerMax - workerAvail;

            resources.Add(new SystemResourceDto
            {
                ResourceName = "Thread Pool Workers",
                ResourceType = "Threads",
                CurrentValue = workerInUse,
                MaxValue = workerMax,
                UtilizationPercentage = workerMax > 0 ? Math.Round((double)workerInUse / workerMax * 100, 1) : 0
            });

            // Database connection check
            var dbConnected = await _context.Database.CanConnectAsync();
            resources.Add(new SystemResourceDto
            {
                ResourceName = "Database",
                ResourceType = "Connection",
                CurrentValue = dbConnected ? 1 : 0,
                MaxValue = 1,
                UtilizationPercentage = dbConnected ? 100 : 0
            });

            // Active user sessions count
            var activeSessions = await _context.UserSessions.CountAsync(s => s.Status == 0);
            resources.Add(new SystemResourceDto
            {
                ResourceName = "Active Sessions",
                ResourceType = "Sessions",
                CurrentValue = activeSessions,
                MaxValue = 1000, // arbitrary max
                UtilizationPercentage = Math.Round(activeSessions / 10.0, 1) // % of 1000
            });

            return resources;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemResourcesAsync");
            return new List<SystemResourceDto>
            {
                new SystemResourceDto { ResourceName = "CPU", ResourceType = "Processor", CurrentValue = 0, MaxValue = 100, UtilizationPercentage = 0 },
                new SystemResourceDto { ResourceName = "Memory", ResourceType = "RAM", CurrentValue = 0, MaxValue = 100, UtilizationPercentage = 0 },
                new SystemResourceDto { ResourceName = "Disk", ResourceType = "Storage", CurrentValue = 0, MaxValue = 100, UtilizationPercentage = 0 }
            };
        }
    }

    public async Task<List<DatabaseStatisticsDto>> GetDatabaseStatisticsAsync()
    {
        try
        {
            var results = new List<DatabaseStatisticsDto>();

            // Use raw SQL to query SQL Server system views for table statistics
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT
                    t.NAME AS TableName,
                    p.rows AS RowCount,
                    SUM(a.total_pages) * 8 AS TotalSpaceKB,
                    SUM(a.used_pages) * 8 AS UsedSpaceKB,
                    (SUM(a.total_pages) - SUM(a.used_pages)) * 8 AS UnusedSpaceKB
                FROM sys.tables t
                INNER JOIN sys.indexes i ON t.OBJECT_ID = i.object_id
                INNER JOIN sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
                INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
                WHERE t.NAME NOT LIKE 'dt%'
                    AND t.is_ms_shipped = 0
                    AND i.OBJECT_ID > 255
                GROUP BY t.Name, p.Rows
                ORDER BY p.Rows DESC";

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new DatabaseStatisticsDto
                {
                    TableName = reader.GetString(0),
                    RowCount = reader.GetInt64(1),
                    DataSize = reader.GetInt64(2) * 1024, // Convert KB to bytes
                    IndexSize = reader.GetInt64(3) * 1024  // UsedSpace as index proxy
                });
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDatabaseStatisticsAsync");
            return new List<DatabaseStatisticsDto>();
        }
    }

    // 17.10 Quan ly tich hop (backed by HIEConnections table)
    public async Task<List<IntegrationConfigDto>> GetIntegrationConfigsAsync(bool? isActive = null)
    {
        try
        {
            var query = _context.HIEConnections.AsNoTracking().AsQueryable();

            if (isActive.HasValue)
                query = query.Where(c => c.IsActive == isActive.Value);

            var items = await query.OrderBy(c => c.ConnectionName).ToListAsync();
            return items.Select(c => new IntegrationConfigDto
            {
                Id = c.Id,
                IntegrationName = c.ConnectionName,
                IntegrationType = c.ConnectionType,
                Endpoint = c.EndpointUrl,
                AuthType = c.AuthType,
                IsActive = c.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetIntegrationConfigsAsync");
            return new List<IntegrationConfigDto>();
        }
    }

    public async Task<IntegrationConfigDto> GetIntegrationConfigAsync(Guid integrationId)
    {
        try
        {
            var c = await _context.HIEConnections.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == integrationId);
            if (c == null) return null;
            return new IntegrationConfigDto
            {
                Id = c.Id,
                IntegrationName = c.ConnectionName,
                IntegrationType = c.ConnectionType,
                Endpoint = c.EndpointUrl,
                AuthType = c.AuthType,
                IsActive = c.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetIntegrationConfigAsync");
            return null;
        }
    }

    public async Task<IntegrationConfigDto> SaveIntegrationConfigAsync(IntegrationConfigDto dto)
    {
        try
        {
            HIEConnection entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new HIEConnection
                {
                    ConnectionName = dto.IntegrationName ?? string.Empty,
                    ConnectionType = dto.IntegrationType ?? string.Empty,
                    EndpointUrl = dto.Endpoint ?? string.Empty,
                    AuthType = dto.AuthType ?? "APIKey",
                    IsActive = dto.IsActive
                };
                _context.HIEConnections.Add(entity);
            }
            else
            {
                entity = await _context.HIEConnections.FirstOrDefaultAsync(c => c.Id == dto.Id);
                if (entity == null) return null;
                entity.ConnectionName = dto.IntegrationName ?? entity.ConnectionName;
                entity.ConnectionType = dto.IntegrationType ?? entity.ConnectionType;
                entity.EndpointUrl = dto.Endpoint ?? entity.EndpointUrl;
                entity.AuthType = dto.AuthType ?? entity.AuthType;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveIntegrationConfigAsync");
            return null;
        }
    }

    public async Task<bool> TestIntegrationConnectionAsync(Guid integrationId)
    {
        try
        {
            var conn = await _context.HIEConnections.FirstOrDefaultAsync(c => c.Id == integrationId);
            if (conn == null) return false;

            // Attempt a basic HTTP HEAD request to the endpoint
            using var httpClient = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            var response = await httpClient.SendAsync(new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Head, conn.EndpointUrl));

            if (response.IsSuccessStatusCode)
            {
                conn.LastSuccessfulConnection = DateTime.UtcNow;
                conn.Status = "Active";
                conn.LastErrorMessage = null;
            }
            else
            {
                conn.LastFailedConnection = DateTime.UtcNow;
                conn.Status = "Error";
                conn.LastErrorMessage = $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}";
            }
            await _context.SaveChangesAsync();
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in TestIntegrationConnectionAsync");
            // Update connection status on failure
            try
            {
                var conn = await _context.HIEConnections.FirstOrDefaultAsync(c => c.Id == integrationId);
                if (conn != null)
                {
                    conn.LastFailedConnection = DateTime.UtcNow;
                    conn.Status = "Error";
                    conn.LastErrorMessage = ex.Message;
                    await _context.SaveChangesAsync();
                }
            }
            catch { /* swallow nested exception */ }
            return false;
        }
    }

    public async Task<List<IntegrationLogDto>> GetIntegrationLogsAsync(
        Guid integrationId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            // Query SystemLogs that reference integration activities
            var conn = await _context.HIEConnections.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == integrationId);
            if (conn == null) return new List<IntegrationLogDto>();

            var query = _context.SystemLogs.AsNoTracking()
                .Where(l => l.Message.Contains(conn.ConnectionName) || l.Message.Contains("Integration"))
                .AsQueryable();

            if (fromDate.HasValue)
                query = query.Where(l => l.CreatedAt >= fromDate.Value);
            if (toDate.HasValue)
                query = query.Where(l => l.CreatedAt <= toDate.Value);

            var items = await query.OrderByDescending(l => l.CreatedAt).Take(100).ToListAsync();
            return items.Select(l => new IntegrationLogDto
            {
                Id = l.Id,
                IntegrationId = integrationId,
                IntegrationName = conn.ConnectionName,
                RequestTime = l.CreatedAt,
                ResponseTime = l.CreatedAt,
                Status = l.LogType,
                ErrorMessage = l.Exception
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetIntegrationLogsAsync");
            return new List<IntegrationLogDto>();
        }
    }

    #endregion

    #region Private Helper Methods

    private async Task<bool> SoftDeleteEntityAsync<T>(Guid id) where T : BaseEntity
    {
        try
        {
            var entity = await _context.Set<T>().FirstOrDefaultAsync(e => e.Id == id);
            if (entity == null) return false;
            entity.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SoftDeleteEntityAsync<{EntityType}> for Id {Id}", typeof(T).Name, id);
            return false;
        }
    }

    private async Task<Guid> GetDefaultServiceGroupIdAsync()
    {
        try
        {
            var group = await _context.ServiceGroups.FirstOrDefaultAsync(g => g.IsActive);
            return group?.Id ?? Guid.Empty;
        }
        catch
        {
            return Guid.Empty;
        }
    }

    private MedicineCatalogDto MapMedicineToDto(Medicine m)
    {
        return new MedicineCatalogDto
        {
            Id = m.Id,
            Code = m.MedicineCode,
            Name = m.MedicineName,
            EquivalentCode = m.MedicineCodeBYT,
            RegistrationNumber = m.RegistrationNumber,
            ActiveIngredientName = m.ActiveIngredient,
            Concentration = m.Concentration,
            Unit = m.Unit,
            PackageUnit = m.PackageUnit,
            PackageQuantity = m.ConversionRate,
            Manufacturer = m.Manufacturer,
            Country = m.Country,
            Price = m.UnitPrice,
            InsurancePrice = m.InsurancePrice,
            RouteName = m.RouteName,
            IsNarcotic = m.IsNarcotic,
            IsPsychotropic = m.IsPsychotropic,
            IsPrecursor = m.IsPrecursor,
            IsActive = m.IsActive
        };
    }

    private static string HashPassword(string password)
    {
        // Simple hash for now - should use proper hashing (BCrypt/Argon2) in production
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(password);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    #endregion
}
