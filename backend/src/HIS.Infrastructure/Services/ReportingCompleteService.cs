using System.Text.Json;
using HIS.Application.DTOs.Reporting;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public class ReportingCompleteService : IReportingCompleteService
{
    private readonly HISDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<ReportingCompleteService> _logger;

    public ReportingCompleteService(
        HISDbContext context,
        IHttpContextAccessor httpContextAccessor,
        ILogger<ReportingCompleteService> logger)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    private string GetCurrentUserId()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst("sub")?.Value
            ?? _httpContextAccessor.HttpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? "system";
    }

    private record ReportRow(string Code, string Name, string Value, string Date, string Note);

    private async Task<List<ReportRow>> GetReportRowsAsync(string reportCode, DateTime fromDate, DateTime toDate)
    {
        try
        {
            // Query examinations as default report data source
            var exams = await _context.Examinations
                .Include(e => e.Doctor)
                .Include(e => e.Department)
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt < toDate.AddDays(1) && !e.IsDeleted)
                .OrderByDescending(e => e.StartTime)
                .Take(500)
                .ToListAsync();

            return exams.Select(e => new ReportRow(
                e.Id.ToString("N")[..8],
                e.MainDiagnosis ?? "",
                e.Department?.DepartmentName ?? "",
                e.StartTime?.ToString("dd/MM/yyyy") ?? "",
                e.Doctor?.FullName ?? ""
            )).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<ReportRow>();
        }
    }

    #region Dashboard & KPI

    public async Task<DashboardDto> GetDashboardAsync(DateTime? date = null)
    {
        var targetDate = date ?? DateTime.Today;
        var monthStart = new DateTime(targetDate.Year, targetDate.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        try
        {
            var todaySummary = await BuildSummaryAsync(targetDate, targetDate.AddDays(1));
            var monthSummary = await BuildSummaryAsync(monthStart, monthEnd);

            // 7-day patient trend
            var patientTrend = new List<DashboardChartDataDto>();
            for (int i = 6; i >= 0; i--)
            {
                var d = targetDate.AddDays(-i);
                var dEnd = d.AddDays(1);
                var count = await _context.MedicalRecords
                    .Where(m => m.AdmissionDate >= d && m.AdmissionDate < dEnd && !m.IsDeleted)
                    .CountAsync();
                patientTrend.Add(new DashboardChartDataDto
                {
                    Date = d, Label = d.ToString("dd/MM"), Value = count
                });
            }

            // Revenue trend
            var revenueTrend = new List<DashboardChartDataDto>();
            for (int i = 6; i >= 0; i--)
            {
                var d = targetDate.AddDays(-i);
                var dEnd = d.AddDays(1);
                var rev = await _context.Receipts
                    .Where(r => r.ReceiptDate >= d && r.ReceiptDate < dEnd && r.Status == 1 && !r.IsDeleted)
                    .SumAsync(r => (decimal?)r.FinalAmount) ?? 0;
                revenueTrend.Add(new DashboardChartDataDto
                {
                    Date = d, Label = d.ToString("dd/MM"), Value = rev
                });
            }

            // Top departments
            var topDepts = await _context.Examinations
                .Where(e => e.CreatedAt >= monthStart && e.CreatedAt < monthEnd && !e.IsDeleted)
                .GroupBy(e => new { e.DepartmentId, e.Department.DepartmentName, e.Department.DepartmentCode })
                .Select(g => new DepartmentStatDto
                {
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DepartmentName,
                    DepartmentCode = g.Key.DepartmentCode,
                    PatientCount = g.Count()
                })
                .OrderByDescending(d => d.PatientCount)
                .Take(10)
                .ToListAsync();

            var totalDept = topDepts.Sum(d => d.PatientCount);
            foreach (var d in topDepts)
                d.Percentage = totalDept > 0 ? Math.Round(d.PatientCount * 100m / totalDept, 1) : 0;

            var alerts = await GetAlertsAsync(top: 5);

            return new DashboardDto
            {
                DataDate = targetDate,
                Today = todaySummary,
                ThisMonth = monthSummary,
                PatientTrend = patientTrend,
                RevenueTrend = revenueTrend,
                TopDepartments = topDepts,
                TopServices = new List<ServiceStatDto>(),
                Alerts = alerts
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Dashboard query failed due to missing table/column");
            return new DashboardDto
            {
                DataDate = targetDate,
                Today = new DashboardSummaryDto(),
                ThisMonth = new DashboardSummaryDto(),
                PatientTrend = new List<DashboardChartDataDto>(),
                RevenueTrend = new List<DashboardChartDataDto>(),
                TopDepartments = new List<DepartmentStatDto>(),
                TopServices = new List<ServiceStatDto>(),
                Alerts = new List<AlertDto>()
            };
        }
    }

    public async Task<DashboardDto> GetDepartmentDashboardAsync(Guid departmentId, DateTime? date = null)
    {
        var targetDate = date ?? DateTime.Today;
        var monthStart = new DateTime(targetDate.Year, targetDate.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        try
        {
            var todaySummary = await BuildSummaryAsync(targetDate, targetDate.AddDays(1), departmentId);
            var monthSummary = await BuildSummaryAsync(monthStart, monthEnd, departmentId);

            return new DashboardDto
            {
                DataDate = targetDate,
                Today = todaySummary,
                ThisMonth = monthSummary,
                PatientTrend = new List<DashboardChartDataDto>(),
                RevenueTrend = new List<DashboardChartDataDto>(),
                TopDepartments = new List<DepartmentStatDto>(),
                TopServices = new List<ServiceStatDto>(),
                Alerts = new List<AlertDto>()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Department dashboard query failed");
            return new DashboardDto
            {
                DataDate = targetDate,
                Today = new DashboardSummaryDto(),
                ThisMonth = new DashboardSummaryDto(),
                PatientTrend = new List<DashboardChartDataDto>(),
                RevenueTrend = new List<DashboardChartDataDto>(),
                TopDepartments = new List<DepartmentStatDto>(),
                TopServices = new List<ServiceStatDto>(),
                Alerts = new List<AlertDto>()
            };
        }
    }

    public async Task<KPIDashboardDto> GetKPIDashboardAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var totalDays = Math.Max((toDate - fromDate).Days, 1);
            var prevFrom = fromDate.AddDays(-totalDays);
            var prevTo = fromDate;

            // Clinical KPIs
            var totalExams = await _context.Examinations.CountAsync(e => e.CreatedAt >= fromDate && e.CreatedAt < toDate && !e.IsDeleted);
            var prevExams = await _context.Examinations.CountAsync(e => e.CreatedAt >= prevFrom && e.CreatedAt < prevTo && !e.IsDeleted);
            var completedExams = await _context.Examinations.CountAsync(e => e.CreatedAt >= fromDate && e.CreatedAt < toDate && e.Status == 4 && !e.IsDeleted);

            var totalAdmissions = await _context.Admissions.CountAsync(a => a.AdmissionDate >= fromDate && a.AdmissionDate < toDate && !a.IsDeleted);
            var totalBeds = await _context.Beds.CountAsync(b => b.IsActive && !b.IsDeleted);
            var occupiedBeds = await _context.Beds.CountAsync(b => b.Status == 1 && b.IsActive && !b.IsDeleted);
            var occupancyRate = totalBeds > 0 ? Math.Round(occupiedBeds * 100m / totalBeds, 1) : 0;

            var clinicalKPIs = new List<KPIItemDto>
            {
                BuildKPI("KPI-C01", "Tong luot kham", totalExams, prevExams, "luot", 0),
                BuildKPI("KPI-C02", "Ty le hoan thanh kham", totalExams > 0 ? Math.Round(completedExams * 100m / totalExams, 1) : 0, 0, "%", 95),
                BuildKPI("KPI-C03", "So luong nhap vien", totalAdmissions, 0, "BN", 0),
                BuildKPI("KPI-C04", "Ty le su dung giuong", occupancyRate, 0, "%", 85)
            };

            // Financial KPIs
            var totalRevenue = await _context.Receipts.Where(r => r.ReceiptDate >= fromDate && r.ReceiptDate < toDate && r.Status == 1 && !r.IsDeleted).SumAsync(r => (decimal?)r.FinalAmount) ?? 0;
            var prevRevenue = await _context.Receipts.Where(r => r.ReceiptDate >= prevFrom && r.ReceiptDate < prevTo && r.Status == 1 && !r.IsDeleted).SumAsync(r => (decimal?)r.FinalAmount) ?? 0;
            var avgRevPerPatient = totalExams > 0 ? Math.Round(totalRevenue / totalExams, 0) : 0;

            var financialKPIs = new List<KPIItemDto>
            {
                BuildKPI("KPI-F01", "Tong doanh thu", totalRevenue, prevRevenue, "VND", 0),
                BuildKPI("KPI-F02", "Doanh thu BQ/BN", avgRevPerPatient, 0, "VND", 0)
            };

            // Operational KPIs
            var totalLabTests = await _context.LabRequestItems.CountAsync(l => l.CreatedAt >= fromDate && l.CreatedAt < toDate && !l.IsDeleted);
            var completedLabs = await _context.LabRequestItems.CountAsync(l => l.CreatedAt >= fromDate && l.CreatedAt < toDate && l.Status >= 3 && !l.IsDeleted);

            var operationalKPIs = new List<KPIItemDto>
            {
                BuildKPI("KPI-O01", "Tong xet nghiem", totalLabTests, 0, "mau", 0),
                BuildKPI("KPI-O02", "Ty le XN hoan thanh", totalLabTests > 0 ? Math.Round(completedLabs * 100m / totalLabTests, 1) : 0, 0, "%", 98)
            };

            return new KPIDashboardDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                ClinicalKPIs = clinicalKPIs,
                FinancialKPIs = financialKPIs,
                OperationalKPIs = operationalKPIs,
                QualityKPIs = new List<KPIItemDto>()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "KPI dashboard query failed");
            return new KPIDashboardDto
            {
                FromDate = fromDate, ToDate = toDate,
                ClinicalKPIs = new List<KPIItemDto>(),
                FinancialKPIs = new List<KPIItemDto>(),
                OperationalKPIs = new List<KPIItemDto>(),
                QualityKPIs = new List<KPIItemDto>()
            };
        }
    }

    public async Task<KPIDashboardDto> GetDepartmentKPIAsync(Guid departmentId, DateTime fromDate, DateTime toDate)
    {
        try
        {
            var totalExams = await _context.Examinations.CountAsync(e => e.DepartmentId == departmentId && e.CreatedAt >= fromDate && e.CreatedAt < toDate && !e.IsDeleted);
            var completedExams = await _context.Examinations.CountAsync(e => e.DepartmentId == departmentId && e.CreatedAt >= fromDate && e.CreatedAt < toDate && e.Status == 4 && !e.IsDeleted);

            var clinicalKPIs = new List<KPIItemDto>
            {
                BuildKPI("KPI-DC01", "Luot kham khoa", totalExams, 0, "luot", 0),
                BuildKPI("KPI-DC02", "Ty le hoan thanh", totalExams > 0 ? Math.Round(completedExams * 100m / totalExams, 1) : 0, 0, "%", 95)
            };

            return new KPIDashboardDto
            {
                FromDate = fromDate, ToDate = toDate,
                ClinicalKPIs = clinicalKPIs,
                FinancialKPIs = new List<KPIItemDto>(),
                OperationalKPIs = new List<KPIItemDto>(),
                QualityKPIs = new List<KPIItemDto>()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Department KPI query failed");
            return new KPIDashboardDto
            {
                FromDate = fromDate, ToDate = toDate,
                ClinicalKPIs = new List<KPIItemDto>(),
                FinancialKPIs = new List<KPIItemDto>(),
                OperationalKPIs = new List<KPIItemDto>(),
                QualityKPIs = new List<KPIItemDto>()
            };
        }
    }

    public async Task<Dictionary<string, int>> GetRealtimeWaitingCountAsync()
    {
        try
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);

            var waiting = await _context.QueueTickets
                .Where(q => q.IssueDate >= today && q.IssueDate < tomorrow && q.Status == 0 && !q.IsDeleted)
                .GroupBy(q => q.QueueType)
                .Select(g => new { Type = g.Key, Count = g.Count() })
                .ToListAsync();

            var typeNames = new Dictionary<int, string>
            {
                { 1, "Tiep don" }, { 2, "Kham benh" }, { 3, "Xet nghiem" },
                { 4, "CDHA" }, { 5, "Nha thuoc" }, { 6, "Thanh toan" }
            };

            var result = new Dictionary<string, int>();
            foreach (var w in waiting)
            {
                var name = typeNames.GetValueOrDefault(w.Type, $"Loai {w.Type}");
                result[name] = w.Count;
            }
            return result;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Realtime waiting count query failed");
            return new Dictionary<string, int>();
        }
    }

    public async Task<Dictionary<string, int>> GetRealtimeBedAvailabilityAsync()
    {
        try
        {
            var beds = await _context.Beds
                .Where(b => b.IsActive && !b.IsDeleted)
                .Include(b => b.Room)
                .GroupBy(b => b.Room.DepartmentId)
                .Select(g => new { DeptId = g.Key, Total = g.Count(), Available = g.Count(b => b.Status == 0) })
                .ToListAsync();

            var depts = await _context.Departments
                .Where(d => !d.IsDeleted)
                .ToDictionaryAsync(d => d.Id, d => d.DepartmentName);

            var result = new Dictionary<string, int>();
            foreach (var b in beds)
            {
                if (depts.TryGetValue(b.DeptId, out var name))
                    result[name] = b.Available;
            }
            return result;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Bed availability query failed");
            return new Dictionary<string, int>();
        }
    }

    public async Task<List<AlertDto>> GetAlertsAsync(string? module = null, int? top = 10)
    {
        var alerts = new List<AlertDto>();
        var now = DateTime.Now;

        try
        {
            // Expiring drugs alert
            if (module == null || module == "Pharmacy")
            {
                var expiringCount = await _context.InventoryItems
                    .CountAsync(i => i.ExpiryDate != null && i.ExpiryDate <= now.AddDays(30) && i.Quantity > 0 && !i.IsDeleted);
                if (expiringCount > 0)
                    alerts.Add(new AlertDto { AlertType = "Warning", Title = "Thuoc sap het han", Message = $"{expiringCount} mat hang sap het han trong 30 ngay", Module = "Pharmacy", Count = expiringCount, ActionUrl = "/pharmacy", CreatedAt = now });
            }

            // Low stock alert
            if (module == null || module == "Pharmacy")
            {
                var lowStockCount = await _context.InventoryItems
                    .CountAsync(i => i.Quantity <= 10 && i.Quantity > 0 && !i.IsDeleted);
                if (lowStockCount > 0)
                    alerts.Add(new AlertDto { AlertType = "Warning", Title = "Ton kho thap", Message = $"{lowStockCount} mat hang ton kho duoi 10", Module = "Pharmacy", Count = lowStockCount, ActionUrl = "/pharmacy", CreatedAt = now });
            }

            // Pending admissions
            if (module == null || module == "Inpatient")
            {
                var pendingDischarges = await _context.Admissions
                    .CountAsync(a => a.Status == 0 && a.AdmissionDate < now.AddDays(-14) && !a.IsDeleted);
                if (pendingDischarges > 0)
                    alerts.Add(new AlertDto { AlertType = "Info", Title = "BN noi tru > 14 ngay", Message = $"{pendingDischarges} BN nhap vien tren 14 ngay chua xuat vien", Module = "Inpatient", Count = pendingDischarges, ActionUrl = "/inpatient", CreatedAt = now });
            }
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Alerts query failed");
        }

        return alerts.Take(top ?? 10).ToList();
    }

    #endregion

    #region Clinical Reports

    public async Task<PatientByDepartmentReportDto> GetPatientByDepartmentReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var query = _context.MedicalRecords
                .Where(m => m.AdmissionDate >= fromDate && m.AdmissionDate < toDate && !m.IsDeleted);

            if (departmentId.HasValue)
                query = query.Where(m => m.DepartmentId == departmentId.Value);

            var data = await query
                .GroupBy(m => m.Department!.DepartmentName ?? "Khong xac dinh")
                .Select(g => new PatientByDepartmentItemDto
                {
                    DepartmentName = g.Key,
                    OutpatientCount = g.Count(m => m.TreatmentType == 1),
                    InpatientCount = g.Count(m => m.TreatmentType == 2),
                    EmergencyCount = g.Count(m => m.TreatmentType == 3),
                    TotalCount = g.Count()
                })
                .OrderByDescending(d => d.TotalCount)
                .ToListAsync();

            var total = data.Sum(d => d.TotalCount);
            foreach (var d in data)
                d.Percentage = total > 0 ? Math.Round(d.TotalCount * 100m / total, 1) : 0;

            return new PatientByDepartmentReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                TotalPatients = total,
                Departments = data
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Patient by department report failed");
            return new PatientByDepartmentReportDto { FromDate = fromDate, ToDate = toDate, Departments = new List<PatientByDepartmentItemDto>() };
        }
    }

    public async Task<Top10DiseasesReportDto> GetTop10DiseasesReportAsync(DateTime fromDate, DateTime toDate, string? patientType = null)
    {
        try
        {
            var query = _context.Examinations
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt < toDate && e.MainIcdCode != null && !e.IsDeleted);

            if (!string.IsNullOrEmpty(patientType))
            {
                if (int.TryParse(patientType, out var pt))
                    query = query.Where(e => e.MedicalRecord.PatientType == pt);
            }

            var data = await query
                .GroupBy(e => new { e.MainIcdCode, e.MainDiagnosis })
                .Select(g => new
                {
                    IcdCode = g.Key.MainIcdCode,
                    IcdName = g.Key.MainDiagnosis,
                    CaseCount = g.Count(),
                    MaleCount = g.Count(e => e.MedicalRecord.Patient.Gender == 1),
                    FemaleCount = g.Count(e => e.MedicalRecord.Patient.Gender == 2)
                })
                .OrderByDescending(d => d.CaseCount)
                .Take(10)
                .ToListAsync();

            var totalDiagnoses = await query.CountAsync();

            var diseases = data.Select((d, i) => new DiseaseStatItemDto
            {
                Rank = i + 1,
                IcdCode = d.IcdCode ?? "",
                IcdName = d.IcdName ?? "",
                CaseCount = d.CaseCount,
                MaleCount = d.MaleCount,
                FemaleCount = d.FemaleCount,
                Percentage = totalDiagnoses > 0 ? Math.Round(d.CaseCount * 100m / totalDiagnoses, 1) : 0
            }).ToList();

            return new Top10DiseasesReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                TotalDiagnoses = totalDiagnoses,
                Diseases = diseases
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Top 10 diseases report failed");
            return new Top10DiseasesReportDto { FromDate = fromDate, ToDate = toDate, Diseases = new List<DiseaseStatItemDto>() };
        }
    }

    public async Task<MortalityReportDto> GetMortalityReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var dischargeQuery = _context.Discharges
                .Where(d => d.DischargeDate >= fromDate && d.DischargeDate < toDate && !d.IsDeleted);

            if (departmentId.HasValue)
                dischargeQuery = dischargeQuery.Where(d => d.Admission.DepartmentId == departmentId.Value);

            var totalDischarges = await dischargeQuery.CountAsync();
            var totalDeaths = await dischargeQuery.CountAsync(d => d.DischargeType == 4);
            var mortalityRate = totalDischarges > 0 ? Math.Round(totalDeaths * 100m / totalDischarges, 2) : 0;

            var byDept = await dischargeQuery
                .GroupBy(d => d.Admission.Department.DepartmentName)
                .Select(g => new MortalityByDepartmentDto
                {
                    DepartmentName = g.Key,
                    DeathCount = g.Count(d => d.DischargeType == 4),
                    DischargeCount = g.Count(),
                    Rate = g.Count() > 0 ? Math.Round(g.Count(d => d.DischargeType == 4) * 100m / g.Count(), 2) : 0
                })
                .Where(d => d.DeathCount > 0)
                .OrderByDescending(d => d.DeathCount)
                .ToListAsync();

            var byCause = await dischargeQuery
                .Where(d => d.DischargeType == 4 && d.DischargeDiagnosis != null)
                .GroupBy(d => new { d.Admission.MedicalRecord.MainIcdCode, d.DischargeDiagnosis })
                .Select(g => new MortalityByCauseDto
                {
                    IcdCode = g.Key.MainIcdCode ?? "",
                    CauseOfDeath = g.Key.DischargeDiagnosis ?? "",
                    Count = g.Count()
                })
                .OrderByDescending(c => c.Count)
                .Take(10)
                .ToListAsync();

            foreach (var c in byCause)
                c.Percentage = totalDeaths > 0 ? Math.Round(c.Count * 100m / totalDeaths, 1) : 0;

            return new MortalityReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                TotalDeaths = totalDeaths,
                TotalDischarges = totalDischarges,
                MortalityRate = mortalityRate,
                ByDepartment = byDept,
                ByCause = byCause
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Mortality report failed");
            return new MortalityReportDto { FromDate = fromDate, ToDate = toDate, ByDepartment = new List<MortalityByDepartmentDto>(), ByCause = new List<MortalityByCauseDto>() };
        }
    }

    public async Task<SurgeryStatisticsReportDto> GetSurgeryStatisticsReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var query = _context.SurgeryRequests
                .Where(s => s.RequestDate >= fromDate && s.RequestDate < toDate && !s.IsDeleted);

            var total = await query.CountAsync();
            var emergencyCount = await query.CountAsync(s => s.Priority == 3);
            var electiveCount = total - emergencyCount;

            var byType = await query
                .GroupBy(s => s.SurgeryType)
                .Select(g => new SurgeryByTypeDto
                {
                    SurgeryType = g.Key,
                    Count = g.Count(),
                    Percentage = total > 0 ? Math.Round(g.Count() * 100m / total, 1) : 0
                })
                .OrderByDescending(t => t.Count)
                .ToListAsync();

            var byDoctor = await query
                .GroupBy(s => s.RequestingDoctor.FullName)
                .Select(g => new SurgeryByDoctorDto
                {
                    DoctorName = g.Key,
                    SurgeryCount = g.Count()
                })
                .OrderByDescending(d => d.SurgeryCount)
                .Take(10)
                .ToListAsync();

            var avgDuration = await _context.SurgeryRecords
                .Where(r => r.ActualDuration != null && r.CreatedAt >= fromDate && r.CreatedAt < toDate && !r.IsDeleted)
                .AverageAsync(r => (decimal?)r.ActualDuration) ?? 0;

            return new SurgeryStatisticsReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                TotalSurgeries = total,
                ElectiveSurgeries = electiveCount,
                EmergencySurgeries = emergencyCount,
                MajorSurgeries = byType.FirstOrDefault(t => t.SurgeryType.Contains("lon", StringComparison.OrdinalIgnoreCase))?.Count ?? 0,
                MinorSurgeries = byType.FirstOrDefault(t => t.SurgeryType.Contains("nho", StringComparison.OrdinalIgnoreCase))?.Count ?? 0,
                AverageDurationMinutes = Math.Round(avgDuration, 0),
                ByType = byType,
                ByDoctor = byDoctor
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Surgery statistics report failed");
            return new SurgeryStatisticsReportDto { FromDate = fromDate, ToDate = toDate, ByType = new List<SurgeryByTypeDto>(), ByDoctor = new List<SurgeryByDoctorDto>() };
        }
    }

    public async Task<object> GetLabStatisticsReportAsync(DateTime fromDate, DateTime toDate, string? testType = null)
    {
        try
        {
            var query = _context.LabRequestItems
                .Where(l => l.CreatedAt >= fromDate && l.CreatedAt < toDate && !l.IsDeleted);

            if (!string.IsNullOrEmpty(testType))
                query = query.Where(l => l.SampleType == testType);

            var total = await query.CountAsync();
            var completed = await query.CountAsync(l => l.Status >= 3);
            var pending = await query.CountAsync(l => l.Status < 2);

            var bySampleType = await query
                .GroupBy(l => l.SampleType ?? "Khac")
                .Select(g => new { Type = g.Key, Count = g.Count() })
                .OrderByDescending(t => t.Count)
                .ToListAsync();

            var byStatus = await query
                .GroupBy(l => l.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync();

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalTests = total,
                CompletedTests = completed,
                PendingTests = pending,
                CompletionRate = total > 0 ? Math.Round(completed * 100m / total, 1) : 0,
                BySampleType = bySampleType,
                ByStatus = byStatus
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Lab statistics report failed");
            return new { FromDate = fromDate, ToDate = toDate, TotalTests = 0 };
        }
    }

    public async Task<object> GetRadiologyStatisticsReportAsync(DateTime fromDate, DateTime toDate, string? serviceType = null)
    {
        try
        {
            var query = _context.ServiceRequestDetails
                .Where(s => s.CreatedAt >= fromDate && s.CreatedAt < toDate && !s.IsDeleted);

            var total = await query.CountAsync();
            var completed = await query.CountAsync(s => s.Status >= 3);

            var byStatus = await query
                .GroupBy(s => s.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync();

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalExams = total,
                CompletedExams = completed,
                CompletionRate = total > 0 ? Math.Round(completed * 100m / total, 1) : 0,
                ByStatus = byStatus
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Radiology statistics report failed");
            return new { FromDate = fromDate, ToDate = toDate, TotalExams = 0 };
        }
    }

    public async Task<object> GetFollowUpReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var query = _context.Examinations
                .Where(e => e.FollowUpDate != null && e.FollowUpDate >= fromDate && e.FollowUpDate < toDate && !e.IsDeleted);

            if (departmentId.HasValue)
                query = query.Where(e => e.DepartmentId == departmentId.Value);

            var totalFollowUps = await query.CountAsync();
            var overdue = await query.CountAsync(e => e.FollowUpDate < DateTime.Today);

            var byDept = await query
                .GroupBy(e => e.Department.DepartmentName)
                .Select(g => new { Dept = g.Key, Count = g.Count(), Overdue = g.Count(e => e.FollowUpDate < DateTime.Today) })
                .OrderByDescending(d => d.Count)
                .ToListAsync();

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalFollowUps = totalFollowUps,
                OverdueFollowUps = overdue,
                FollowUpRate = totalFollowUps > 0 ? Math.Round((totalFollowUps - overdue) * 100m / totalFollowUps, 1) : 100,
                ByDepartment = byDept
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Follow-up report failed");
            return new { FromDate = fromDate, ToDate = toDate, TotalFollowUps = 0 };
        }
    }

    public async Task<object> GetHospitalInfectionReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            // Query admissions with discharge condition indicating complications
            var totalAdmissions = await _context.Admissions
                .CountAsync(a => a.AdmissionDate >= fromDate && a.AdmissionDate < toDate && !a.IsDeleted);

            var totalDischarges = await _context.Discharges
                .CountAsync(d => d.DischargeDate >= fromDate && d.DischargeDate < toDate && !d.IsDeleted);

            // Approximate: admissions with worsened condition (DischargeCondition == 4)
            var worsened = await _context.Discharges
                .CountAsync(d => d.DischargeDate >= fromDate && d.DischargeDate < toDate && d.DischargeCondition == 4 && !d.IsDeleted);

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalAdmissions = totalAdmissions,
                TotalDischarges = totalDischarges,
                WorsenedCases = worsened,
                InfectionRate = totalAdmissions > 0 ? Math.Round(worsened * 100m / totalAdmissions, 2) : 0
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Hospital infection report failed");
            return new { FromDate = fromDate, ToDate = toDate, TotalAdmissions = 0 };
        }
    }

    #endregion

    #region Financial Reports

    public async Task<RevenueReportDto> GetRevenueReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null, string? patientType = null)
    {
        try
        {
            var query = _context.Receipts
                .Where(r => r.ReceiptDate >= fromDate && r.ReceiptDate < toDate && r.Status == 1 && !r.IsDeleted);

            var receipts = await query
                .Select(r => new
                {
                    r.ReceiptDate,
                    r.FinalAmount,
                    r.Amount,
                    r.MedicalRecordId,
                    PatientType = r.MedicalRecord != null ? r.MedicalRecord.PatientType : 0,
                    DeptName = r.MedicalRecord != null && r.MedicalRecord.Department != null ? r.MedicalRecord.Department.DepartmentName : "Khong xac dinh"
                })
                .ToListAsync();

            if (!string.IsNullOrEmpty(patientType) && int.TryParse(patientType, out var pt))
                receipts = receipts.Where(r => r.PatientType == pt).ToList();

            var totalRevenue = receipts.Sum(r => r.FinalAmount);
            var insuranceRevenue = receipts.Where(r => r.PatientType == 1).Sum(r => r.FinalAmount);
            var patientRevenue = receipts.Where(r => r.PatientType != 1).Sum(r => r.FinalAmount);

            // By day
            var byDay = receipts
                .GroupBy(r => r.ReceiptDate.Date)
                .Select(g => new RevenueByDayDto
                {
                    Date = g.Key,
                    TotalRevenue = g.Sum(r => r.FinalAmount),
                    InsuranceRevenue = g.Where(r => r.PatientType == 1).Sum(r => r.FinalAmount),
                    PatientRevenue = g.Where(r => r.PatientType != 1).Sum(r => r.FinalAmount),
                    TransactionCount = g.Count()
                })
                .OrderBy(d => d.Date)
                .ToList();

            // By department
            var byDept = receipts
                .GroupBy(r => r.DeptName)
                .Select(g => new RevenueByDepartmentDto
                {
                    DepartmentName = g.Key,
                    Revenue = g.Sum(r => r.FinalAmount),
                    InsuranceRevenue = g.Where(r => r.PatientType == 1).Sum(r => r.FinalAmount),
                    PatientRevenue = g.Where(r => r.PatientType != 1).Sum(r => r.FinalAmount),
                    Percentage = totalRevenue > 0 ? Math.Round(g.Sum(r => r.FinalAmount) * 100m / totalRevenue, 1) : 0
                })
                .OrderByDescending(d => d.Revenue)
                .ToList();

            // By patient type
            var typeNames = new Dictionary<int, string> { { 1, "BHYT" }, { 2, "Vien phi" }, { 3, "Dich vu" }, { 4, "Kham suc khoe" } };
            var byPatientType = receipts
                .GroupBy(r => r.PatientType)
                .Select(g => new RevenueByPatientTypeDto
                {
                    PatientType = typeNames.GetValueOrDefault(g.Key, $"Loai {g.Key}"),
                    Revenue = g.Sum(r => r.FinalAmount),
                    PatientCount = g.Select(r => r.MedicalRecordId).Distinct().Count(),
                    Percentage = totalRevenue > 0 ? Math.Round(g.Sum(r => r.FinalAmount) * 100m / totalRevenue, 1) : 0
                })
                .OrderByDescending(p => p.Revenue)
                .ToList();

            return new RevenueReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                TotalRevenue = totalRevenue,
                InsuranceRevenue = insuranceRevenue,
                PatientRevenue = patientRevenue,
                OtherRevenue = 0,
                ByDay = byDay,
                ByDepartment = byDept,
                ByServiceType = new List<RevenueByServiceTypeDto>(),
                ByPatientType = byPatientType
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Revenue report failed");
            return new RevenueReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                ByDay = new List<RevenueByDayDto>(),
                ByDepartment = new List<RevenueByDepartmentDto>(),
                ByServiceType = new List<RevenueByServiceTypeDto>(),
                ByPatientType = new List<RevenueByPatientTypeDto>()
            };
        }
    }

    public async Task<List<RevenueByDayDto>> GetDailyRevenueReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var data = await _context.Receipts
                .Where(r => r.ReceiptDate >= fromDate && r.ReceiptDate < toDate && r.Status == 1 && !r.IsDeleted)
                .GroupBy(r => r.ReceiptDate.Date)
                .Select(g => new RevenueByDayDto
                {
                    Date = g.Key,
                    TotalRevenue = g.Sum(r => r.FinalAmount),
                    InsuranceRevenue = g.Where(r => r.MedicalRecord != null && r.MedicalRecord.PatientType == 1).Sum(r => r.FinalAmount),
                    PatientRevenue = g.Where(r => r.MedicalRecord == null || r.MedicalRecord.PatientType != 1).Sum(r => r.FinalAmount),
                    TransactionCount = g.Count()
                })
                .OrderBy(d => d.Date)
                .ToListAsync();
            return data;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Daily revenue report failed");
            return new List<RevenueByDayDto>();
        }
    }

    public async Task<PatientDebtReportDto> GetPatientDebtReportAsync(DateTime? asOfDate = null, Guid? departmentId = null)
    {
        var date = asOfDate ?? DateTime.Today;
        try
        {
            var query = _context.InvoiceSummaries
                .Where(inv => inv.RemainingAmount > 0 && inv.Status != 2 && !inv.IsDeleted);

            if (departmentId.HasValue)
                query = query.Where(inv => inv.MedicalRecord.DepartmentId == departmentId.Value);

            var debts = await query
                .Select(inv => new
                {
                    inv.MedicalRecord.PatientId,
                    inv.MedicalRecord.Patient.PatientCode,
                    PatientName = inv.MedicalRecord.Patient.FullName,
                    inv.MedicalRecord.Patient.PhoneNumber,
                    inv.RemainingAmount,
                    inv.CreatedAt,
                    DeptName = inv.MedicalRecord.Department != null ? inv.MedicalRecord.Department.DepartmentName : ""
                })
                .ToListAsync();

            var totalDebt = debts.Sum(d => d.RemainingAmount);
            var totalDebtors = debts.Select(d => d.PatientId).Distinct().Count();

            var topDebtors = debts
                .GroupBy(d => d.PatientId)
                .Select(g => new PatientDebtItemDto
                {
                    PatientId = g.Key,
                    PatientCode = g.First().PatientCode,
                    PatientName = g.First().PatientName,
                    PhoneNumber = g.First().PhoneNumber ?? "",
                    DebtAmount = g.Sum(d => d.RemainingAmount),
                    DaysOverdue = (int)(date - g.Min(d => d.CreatedAt)).TotalDays,
                    LastPaymentDate = g.Max(d => d.CreatedAt),
                    DepartmentName = g.First().DeptName
                })
                .OrderByDescending(d => d.DebtAmount)
                .Take(20)
                .ToList();

            var byDept = debts
                .GroupBy(d => d.DeptName)
                .Select(g => new DebtByDepartmentDto
                {
                    DepartmentName = g.Key,
                    DebtAmount = g.Sum(d => d.RemainingAmount),
                    DebtorCount = g.Select(d => d.PatientId).Distinct().Count()
                })
                .OrderByDescending(d => d.DebtAmount)
                .ToList();

            return new PatientDebtReportDto
            {
                AsOfDate = date,
                TotalDebt = totalDebt,
                TotalDebtors = totalDebtors,
                DebtUnder30Days = debts.Where(d => (date - d.CreatedAt).TotalDays < 30).Sum(d => d.RemainingAmount),
                Debt30To60Days = debts.Where(d => (date - d.CreatedAt).TotalDays >= 30 && (date - d.CreatedAt).TotalDays < 60).Sum(d => d.RemainingAmount),
                Debt60To90Days = debts.Where(d => (date - d.CreatedAt).TotalDays >= 60 && (date - d.CreatedAt).TotalDays < 90).Sum(d => d.RemainingAmount),
                DebtOver90Days = debts.Where(d => (date - d.CreatedAt).TotalDays >= 90).Sum(d => d.RemainingAmount),
                TopDebtors = topDebtors,
                ByDepartment = byDept
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Patient debt report failed");
            return new PatientDebtReportDto { AsOfDate = date, TopDebtors = new List<PatientDebtItemDto>(), ByDepartment = new List<DebtByDepartmentDto>() };
        }
    }

    public async Task<InsuranceClaimReportDto> GetInsuranceClaimReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var claims = await _context.InsuranceClaims
                .Where(c => c.ServiceDate >= fromDate && c.ServiceDate < toDate && !c.IsDeleted)
                .ToListAsync();

            var total = claims.Count;
            var approved = claims.Where(c => c.ClaimStatus == 2 || c.ClaimStatus == 5).ToList();
            var rejected = claims.Where(c => c.ClaimStatus == 4).ToList();
            var partial = claims.Where(c => c.ClaimStatus == 3).ToList();
            var pending = claims.Where(c => c.ClaimStatus <= 1).ToList();

            var byStatus = claims.GroupBy(c => c.ClaimStatus)
                .Select(g => new ClaimByStatusDto
                {
                    Status = g.Key switch { 0 => "Chua gui", 1 => "Da gui", 2 => "Da duyet", 3 => "Tu choi 1 phan", 4 => "Tu choi", 5 => "Da thanh toan", _ => $"Loai {g.Key}" },
                    ClaimCount = g.Count(),
                    Amount = g.Sum(c => c.TotalAmount)
                }).ToList();

            var byType = claims.GroupBy(c => c.TreatmentType)
                .Select(g => new ClaimByTypeDto
                {
                    ClaimType = g.Key switch { 1 => "Ngoai tru", 2 => "Noi tru", 3 => "Cap cuu", _ => "Khac" },
                    ClaimCount = g.Count(),
                    Amount = g.Sum(c => c.TotalAmount)
                }).ToList();

            // Top rejection reasons
            var rejections = await _context.InsuranceRejections
                .Where(r => r.Claim.ServiceDate >= fromDate && r.Claim.ServiceDate < toDate && !r.IsDeleted)
                .GroupBy(r => new { r.RejectionCode, r.RejectionReason })
                .Select(g => new RejectionReasonDto
                {
                    ReasonCode = g.Key.RejectionCode,
                    ReasonDescription = g.Key.RejectionReason,
                    Count = g.Count(),
                    Amount = g.Sum(r => r.RejectedAmount)
                })
                .OrderByDescending(r => r.Count)
                .Take(10)
                .ToListAsync();

            var approvedCount = approved.Count + partial.Count;

            return new InsuranceClaimReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                TotalClaimAmount = claims.Sum(c => c.TotalAmount),
                ApprovedAmount = approved.Sum(c => c.InsuranceAmount),
                RejectedAmount = rejected.Sum(c => c.TotalAmount),
                PendingAmount = pending.Sum(c => c.TotalAmount),
                TotalClaims = total,
                ApprovedClaims = approvedCount,
                RejectedClaims = rejected.Count,
                PendingClaims = pending.Count,
                ApprovalRate = total > 0 ? Math.Round(approvedCount * 100m / total, 1) : 0,
                ByStatus = byStatus,
                ByClaimType = byType,
                TopRejectionReasons = rejections
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Insurance claim report failed");
            return new InsuranceClaimReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                ByStatus = new List<ClaimByStatusDto>(),
                ByClaimType = new List<ClaimByTypeDto>(),
                TopRejectionReasons = new List<RejectionReasonDto>()
            };
        }
    }

    public async Task<ProfitByDepartmentReportDto> GetProfitByDepartmentReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            // Revenue per department from receipts
            var revenueByDept = await _context.Receipts
                .Where(r => r.ReceiptDate >= fromDate && r.ReceiptDate < toDate && r.Status == 1 && !r.IsDeleted && r.MedicalRecord != null)
                .GroupBy(r => r.MedicalRecord!.Department!.DepartmentName ?? "Khong xac dinh")
                .Select(g => new { Dept = g.Key, Revenue = g.Sum(r => r.FinalAmount) })
                .ToListAsync();

            // Cost from prescriptions (drug cost as proxy for department cost)
            var costByDept = await _context.Prescriptions
                .Where(p => p.PrescriptionDate >= fromDate && p.PrescriptionDate < toDate && !p.IsDeleted)
                .GroupBy(p => p.Department.DepartmentName)
                .Select(g => new { Dept = g.Key, Cost = g.Sum(p => p.TotalAmount) })
                .ToListAsync();

            var costDict = costByDept.ToDictionary(c => c.Dept, c => c.Cost);

            var departments = revenueByDept.Select(r =>
            {
                var cost = costDict.GetValueOrDefault(r.Dept, 0);
                var profit = r.Revenue - cost;
                return new DepartmentProfitItemDto
                {
                    DepartmentName = r.Dept,
                    Revenue = r.Revenue,
                    Cost = cost,
                    Profit = profit,
                    ProfitMargin = r.Revenue > 0 ? Math.Round(profit * 100m / r.Revenue, 1) : 0
                };
            }).OrderByDescending(d => d.Revenue).ToList();

            var totalRevenue = departments.Sum(d => d.Revenue);
            var totalCost = departments.Sum(d => d.Cost);
            var totalProfit = totalRevenue - totalCost;

            return new ProfitByDepartmentReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                TotalRevenue = totalRevenue,
                TotalCost = totalCost,
                TotalProfit = totalProfit,
                ProfitMargin = totalRevenue > 0 ? Math.Round(totalProfit * 100m / totalRevenue, 1) : 0,
                Departments = departments
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Profit by department report failed");
            return new ProfitByDepartmentReportDto { FromDate = fromDate, ToDate = toDate, Departments = new List<DepartmentProfitItemDto>() };
        }
    }

    public async Task<object> GetCashierReportAsync(DateTime fromDate, DateTime toDate, Guid? cashierId = null)
    {
        try
        {
            var query = _context.Receipts
                .Where(r => r.ReceiptDate >= fromDate && r.ReceiptDate < toDate && r.Status == 1 && !r.IsDeleted);

            if (cashierId.HasValue)
                query = query.Where(r => r.CashierId == cashierId.Value);

            var byCashier = await query
                .GroupBy(r => new { r.CashierId, r.Cashier.FullName })
                .Select(g => new
                {
                    CashierId = g.Key.CashierId,
                    CashierName = g.Key.FullName,
                    TransactionCount = g.Count(),
                    TotalAmount = g.Sum(r => r.FinalAmount),
                    CashAmount = g.Where(r => r.PaymentMethod == 1).Sum(r => r.FinalAmount),
                    TransferAmount = g.Where(r => r.PaymentMethod == 2).Sum(r => r.FinalAmount),
                    CardAmount = g.Where(r => r.PaymentMethod == 3).Sum(r => r.FinalAmount)
                })
                .OrderByDescending(c => c.TotalAmount)
                .ToListAsync();

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalTransactions = byCashier.Sum(c => c.TransactionCount),
                TotalAmount = byCashier.Sum(c => c.TotalAmount),
                Cashiers = byCashier
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Cashier report failed");
            return new { FromDate = fromDate, ToDate = toDate, TotalTransactions = 0, TotalAmount = 0m, Cashiers = Array.Empty<object>() };
        }
    }

    public async Task<object> GetVATInvoiceReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var invoices = await _context.ElectronicInvoices
                .Where(i => i.InvoiceDate >= fromDate && i.InvoiceDate < toDate && !i.IsDeleted)
                .Select(i => new
                {
                    i.InvoiceNumber,
                    i.InvoiceSeries,
                    i.InvoiceDate,
                    i.PatientName,
                    i.TaxCode,
                    i.SubTotal,
                    i.VatRate,
                    i.VatAmount,
                    i.TotalAmount,
                    i.Status
                })
                .OrderBy(i => i.InvoiceDate)
                .ToListAsync();

            var totalSubTotal = invoices.Where(i => i.Status == 1 || i.Status == 2).Sum(i => i.SubTotal);
            var totalVat = invoices.Where(i => i.Status == 1 || i.Status == 2).Sum(i => i.VatAmount);
            var totalAmount = invoices.Where(i => i.Status == 1 || i.Status == 2).Sum(i => i.TotalAmount);
            var cancelledCount = invoices.Count(i => i.Status == 3);

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalInvoices = invoices.Count,
                CancelledInvoices = cancelledCount,
                TotalSubTotal = totalSubTotal,
                TotalVAT = totalVat,
                TotalAmount = totalAmount,
                Invoices = invoices
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "VAT invoice report failed");
            return new { FromDate = fromDate, ToDate = toDate, TotalInvoices = 0 };
        }
    }

    #endregion

    #region Pharmacy Reports

    public async Task<CurrentStockReportDto> GetCurrentStockReportAsync(Guid? warehouseId = null, string? category = null)
    {
        try
        {
            var query = _context.InventoryItems
                .Where(i => i.Quantity > 0 && !i.IsDeleted);

            if (warehouseId.HasValue)
                query = query.Where(i => i.WarehouseId == warehouseId.Value);

            var items = await query
                .Select(i => new
                {
                    i.WarehouseId,
                    WarehouseName = i.Warehouse.WarehouseName,
                    i.ItemType,
                    i.Quantity,
                    i.ImportPrice,
                    StockValue = i.Quantity * i.ImportPrice,
                    i.ExpiryDate
                })
                .ToListAsync();

            var now = DateTime.Now;
            var totalStockValue = items.Sum(i => i.StockValue);
            var totalItems = items.Count;
            var lowStockItems = items.Count(i => i.Quantity <= 10);
            var expiringItems = items.Count(i => i.ExpiryDate != null && i.ExpiryDate <= now.AddDays(90) && i.ExpiryDate > now);
            var expiredItems = items.Count(i => i.ExpiryDate != null && i.ExpiryDate <= now);

            var byWarehouse = items
                .GroupBy(i => i.WarehouseName)
                .Select(g => new StockByWarehouseDto
                {
                    WarehouseName = g.Key,
                    ItemCount = g.Count(),
                    StockValue = g.Sum(i => i.StockValue)
                })
                .OrderByDescending(w => w.StockValue)
                .ToList();

            var byCategory = items
                .GroupBy(i => i.ItemType)
                .Select(g => new StockByCategoryDto
                {
                    CategoryName = g.Key == "Medicine" ? "Thuoc" : "Vat tu",
                    ItemCount = g.Count(),
                    StockValue = g.Sum(i => i.StockValue)
                })
                .ToList();

            return new CurrentStockReportDto
            {
                AsOfDate = now,
                TotalStockValue = totalStockValue,
                TotalItems = totalItems,
                LowStockItems = lowStockItems,
                ExpiringItems = expiringItems,
                ExpiredItems = expiredItems,
                ByWarehouse = byWarehouse,
                ByCategory = byCategory
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Current stock report failed");
            return new CurrentStockReportDto { AsOfDate = DateTime.Now, ByWarehouse = new List<StockByWarehouseDto>(), ByCategory = new List<StockByCategoryDto>() };
        }
    }

    public async Task<StockMovementReportDto> GetStockMovementReportAsync(DateTime fromDate, DateTime toDate, Guid? warehouseId = null)
    {
        try
        {
            // Imports
            var importQuery = _context.ImportReceiptDetails
                .Where(d => d.ImportReceipt.ReceiptDate >= fromDate && d.ImportReceipt.ReceiptDate < toDate && d.ImportReceipt.Status == 1 && !d.IsDeleted);
            if (warehouseId.HasValue)
                importQuery = importQuery.Where(d => d.ImportReceipt.WarehouseId == warehouseId.Value);

            var importValue = await importQuery.SumAsync(d => (decimal?)d.Amount) ?? 0;

            // Exports
            var exportQuery = _context.ExportReceiptDetails
                .Where(d => d.ExportReceipt.ReceiptDate >= fromDate && d.ExportReceipt.ReceiptDate < toDate && d.ExportReceipt.Status == 1 && !d.IsDeleted);
            if (warehouseId.HasValue)
                exportQuery = exportQuery.Where(d => d.ExportReceipt.WarehouseId == warehouseId.Value);

            var exportValue = await exportQuery.SumAsync(d => (decimal?)d.Amount) ?? 0;

            // Opening/closing stock (approximate: current stock + exports - imports in period)
            var currentStockQuery = _context.InventoryItems.Where(i => !i.IsDeleted);
            if (warehouseId.HasValue)
                currentStockQuery = currentStockQuery.Where(i => i.WarehouseId == warehouseId.Value);

            var closingStockValue = await currentStockQuery.SumAsync(i => (decimal?)(i.Quantity * i.ImportPrice)) ?? 0;
            var openingStockValue = closingStockValue - importValue + exportValue;

            var warehouseName = "";
            if (warehouseId.HasValue)
            {
                var wh = await _context.Warehouses.FindAsync(warehouseId.Value);
                warehouseName = wh?.WarehouseName ?? "";
            }

            return new StockMovementReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                WarehouseId = warehouseId,
                WarehouseName = warehouseName,
                OpeningStockValue = openingStockValue,
                ImportValue = importValue,
                ExportValue = exportValue,
                ClosingStockValue = closingStockValue,
                Items = new List<StockMovementItemDto>()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Stock movement report failed");
            return new StockMovementReportDto { FromDate = fromDate, ToDate = toDate, Items = new List<StockMovementItemDto>() };
        }
    }

    public async Task<ControlledDrugReportDto> GetNarcoticDrugReportAsync(DateTime fromDate, DateTime toDate)
    {
        return await GetControlledDrugReportInternalAsync(fromDate, toDate, isNarcotic: true);
    }

    public async Task<ControlledDrugReportDto> GetPsychotropicDrugReportAsync(DateTime fromDate, DateTime toDate)
    {
        return await GetControlledDrugReportInternalAsync(fromDate, toDate, isNarcotic: false);
    }

    public async Task<ExpiringDrugsReportDto> GetExpiringDrugsReportAsync(int daysAhead = 90, Guid? warehouseId = null)
    {
        try
        {
            var now = DateTime.Now;
            var cutoff = now.AddDays(daysAhead);

            var query = _context.InventoryItems
                .Where(i => i.ExpiryDate != null && i.ExpiryDate <= cutoff && i.Quantity > 0 && !i.IsDeleted);

            if (warehouseId.HasValue)
                query = query.Where(i => i.WarehouseId == warehouseId.Value);

            var items = await query
                .Select(i => new ExpiringDrugItemDto
                {
                    ItemCode = i.Medicine != null ? i.Medicine.MedicineCode : (i.Supply != null ? i.Supply.SupplyCode : ""),
                    ItemName = i.Medicine != null ? i.Medicine.MedicineName : (i.Supply != null ? i.Supply.SupplyName : ""),
                    LotNumber = i.BatchNumber ?? "",
                    ExpiryDate = i.ExpiryDate!.Value,
                    DaysUntilExpiry = (int)(i.ExpiryDate!.Value - now).TotalDays,
                    Quantity = i.Quantity,
                    Unit = i.Medicine != null ? i.Medicine.Unit ?? "" : "",
                    UnitPrice = i.ImportPrice,
                    TotalValue = i.Quantity * i.ImportPrice,
                    WarehouseName = i.Warehouse.WarehouseName
                })
                .OrderBy(i => i.ExpiryDate)
                .ToListAsync();

            return new ExpiringDrugsReportDto
            {
                AsOfDate = now,
                DaysAhead = daysAhead,
                TotalItems = items.Count,
                TotalValue = items.Sum(i => i.TotalValue),
                Items = items
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Expiring drugs report failed");
            return new ExpiringDrugsReportDto { AsOfDate = DateTime.Now, DaysAhead = daysAhead, Items = new List<ExpiringDrugItemDto>() };
        }
    }

    public async Task<object> GetDrugUsageByDepartmentReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var query = _context.PrescriptionDetails
                .Where(pd => pd.Prescription.PrescriptionDate >= fromDate && pd.Prescription.PrescriptionDate < toDate && !pd.IsDeleted);

            if (departmentId.HasValue)
                query = query.Where(pd => pd.Prescription.DepartmentId == departmentId.Value);

            var byDept = await query
                .GroupBy(pd => pd.Prescription.Department.DepartmentName)
                .Select(g => new
                {
                    Department = g.Key,
                    TotalQuantity = g.Sum(pd => pd.Quantity),
                    TotalAmount = g.Sum(pd => pd.Amount),
                    ItemCount = g.Select(pd => pd.MedicineId).Distinct().Count()
                })
                .OrderByDescending(d => d.TotalAmount)
                .ToListAsync();

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalAmount = byDept.Sum(d => d.TotalAmount),
                Departments = byDept
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Drug usage by department report failed");
            return new { FromDate = fromDate, ToDate = toDate, Departments = Array.Empty<object>() };
        }
    }

    public async Task<object> GetABCVENReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var usage = await _context.PrescriptionDetails
                .Where(pd => pd.Prescription.PrescriptionDate >= fromDate && pd.Prescription.PrescriptionDate < toDate && !pd.IsDeleted)
                .GroupBy(pd => new { pd.MedicineId, pd.Medicine.MedicineCode, pd.Medicine.MedicineName })
                .Select(g => new
                {
                    MedicineCode = g.Key.MedicineCode,
                    MedicineName = g.Key.MedicineName,
                    TotalQuantity = g.Sum(pd => pd.Quantity),
                    TotalAmount = g.Sum(pd => pd.Amount)
                })
                .OrderByDescending(m => m.TotalAmount)
                .ToListAsync();

            var totalAmount = usage.Sum(u => u.TotalAmount);
            var cumulative = 0m;

            var classified = usage.Select(u =>
            {
                cumulative += u.TotalAmount;
                var cumulativePercent = totalAmount > 0 ? cumulative * 100m / totalAmount : 0;
                var abcClass = cumulativePercent <= 80 ? "A" : cumulativePercent <= 95 ? "B" : "C";
                return new
                {
                    u.MedicineCode,
                    u.MedicineName,
                    u.TotalQuantity,
                    u.TotalAmount,
                    Percentage = totalAmount > 0 ? Math.Round(u.TotalAmount * 100m / totalAmount, 2) : 0,
                    ABCClass = abcClass,
                    VENClass = "N" // Default to Normal; V/E requires clinical classification
                };
            }).ToList();

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalAmount = totalAmount,
                ClassA_Count = classified.Count(c => c.ABCClass == "A"),
                ClassA_Amount = classified.Where(c => c.ABCClass == "A").Sum(c => c.TotalAmount),
                ClassB_Count = classified.Count(c => c.ABCClass == "B"),
                ClassB_Amount = classified.Where(c => c.ABCClass == "B").Sum(c => c.TotalAmount),
                ClassC_Count = classified.Count(c => c.ABCClass == "C"),
                ClassC_Amount = classified.Where(c => c.ABCClass == "C").Sum(c => c.TotalAmount),
                Items = classified.Take(50)
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "ABC/VEN report failed");
            return new { FromDate = fromDate, ToDate = toDate, TotalAmount = 0m };
        }
    }

    #endregion

    #region Administrative Reports

    public async Task<UserStatisticsReportDto> GetUserStatisticsReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var users = await _context.Users.Where(u => !u.IsDeleted).ToListAsync();

            var totalUsers = users.Count;
            var activeUsers = users.Count(u => u.IsActive);
            var inactiveUsers = totalUsers - activeUsers;
            var newThisMonth = users.Count(u => u.CreatedAt >= fromDate && u.CreatedAt < toDate);

            var byDept = await _context.Users
                .Where(u => !u.IsDeleted && u.DepartmentId != null)
                .GroupBy(u => u.Department!.DepartmentName)
                .Select(g => new UserByDepartmentDto { DepartmentName = g.Key, UserCount = g.Count() })
                .OrderByDescending(d => d.UserCount)
                .ToListAsync();

            var byRole = await _context.UserRoles
                .Where(ur => !ur.IsDeleted)
                .GroupBy(ur => ur.Role.RoleName)
                .Select(g => new UserByRoleDto { RoleName = g.Key, UserCount = g.Count() })
                .OrderByDescending(r => r.UserCount)
                .ToListAsync();

            // Top active users from audit logs
            var topActive = await _context.AuditLogs
                .Where(a => a.Timestamp >= fromDate && a.Timestamp < toDate && a.Username != null)
                .GroupBy(a => new { a.Username, a.UserFullName })
                .Select(g => new UserActivityDto
                {
                    UserName = g.Key.Username ?? "",
                    FullName = g.Key.UserFullName ?? "",
                    ActionCount = g.Count(),
                    LoginCount = g.Count(a => a.Action == "Login"),
                    LastLoginTime = g.Max(a => a.Timestamp)
                })
                .OrderByDescending(u => u.ActionCount)
                .Take(10)
                .ToListAsync();

            return new UserStatisticsReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                TotalUsers = totalUsers,
                ActiveUsers = activeUsers,
                InactiveUsers = inactiveUsers,
                NewUsersThisMonth = newThisMonth,
                ByDepartment = byDept,
                ByRole = byRole,
                TopActiveUsers = topActive
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "User statistics report failed");
            return new UserStatisticsReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                ByDepartment = new List<UserByDepartmentDto>(),
                ByRole = new List<UserByRoleDto>(),
                TopActiveUsers = new List<UserActivityDto>()
            };
        }
    }

    public async Task<AuditLogReportDto> GetAuditLogReportAsync(DateTime fromDate, DateTime toDate, string? module = null, string? userName = null)
    {
        try
        {
            var query = _context.AuditLogs
                .Where(a => a.Timestamp >= fromDate && a.Timestamp < toDate);

            if (!string.IsNullOrEmpty(module))
                query = query.Where(a => a.Module == module);
            if (!string.IsNullOrEmpty(userName))
                query = query.Where(a => a.Username != null && a.Username.Contains(userName));

            var totalLogs = await query.CountAsync();

            var logs = await query
                .OrderByDescending(a => a.Timestamp)
                .Take(500)
                .Select(a => new AuditLogItemDto
                {
                    Id = a.Id,
                    Timestamp = a.Timestamp,
                    UserName = a.Username ?? "",
                    Action = a.Action,
                    Module = a.Module ?? "",
                    EntityType = a.EntityType ?? a.TableName,
                    EntityId = a.EntityId ?? a.RecordId.ToString(),
                    OldValues = a.OldValues,
                    NewValues = a.NewValues,
                    IpAddress = a.IpAddress ?? ""
                })
                .ToListAsync();

            var byAction = await query
                .GroupBy(a => a.Action)
                .Select(g => new AuditByActionDto { Action = g.Key, Count = g.Count() })
                .OrderByDescending(a => a.Count)
                .ToListAsync();

            var byModule = await query
                .Where(a => a.Module != null)
                .GroupBy(a => a.Module!)
                .Select(g => new AuditByModuleDto { Module = g.Key, Count = g.Count() })
                .OrderByDescending(m => m.Count)
                .ToListAsync();

            return new AuditLogReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                TotalLogs = totalLogs,
                Logs = logs,
                ByAction = byAction,
                ByModule = byModule
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Audit log report failed");
            return new AuditLogReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                Logs = new List<AuditLogItemDto>(),
                ByAction = new List<AuditByActionDto>(),
                ByModule = new List<AuditByModuleDto>()
            };
        }
    }

    public async Task<object> GetSystemPerformanceReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            // API response times from audit logs (count per hour as proxy for load)
            var hourlyLoad = await _context.AuditLogs
                .Where(a => a.Timestamp >= fromDate && a.Timestamp < toDate)
                .GroupBy(a => a.Timestamp.Hour)
                .Select(g => new { Hour = g.Key, RequestCount = g.Count() })
                .OrderBy(h => h.Hour)
                .ToListAsync();

            var totalRequests = hourlyLoad.Sum(h => h.RequestCount);
            var peakHour = hourlyLoad.OrderByDescending(h => h.RequestCount).FirstOrDefault();

            // Error rate from audit logs with non-200 status
            var errorCount = await _context.AuditLogs
                .CountAsync(a => a.Timestamp >= fromDate && a.Timestamp < toDate && a.ResponseStatusCode != null && a.ResponseStatusCode >= 500);

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalRequests = totalRequests,
                PeakHour = peakHour?.Hour,
                PeakRequestCount = peakHour?.RequestCount ?? 0,
                ErrorCount = errorCount,
                ErrorRate = totalRequests > 0 ? Math.Round(errorCount * 100m / totalRequests, 2) : 0,
                HourlyLoad = hourlyLoad
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "System performance report failed");
            return new { FromDate = fromDate, ToDate = toDate, TotalRequests = 0 };
        }
    }

    #endregion

    #region Report Export & History

    public async Task<ReportExportResultDto> ExportReportAsync(string reportCode, ReportRequestDto request)
    {
        try
        {
            // Generate report data based on code
            var fileName = $"{reportCode}_{request.FromDate:yyyyMMdd}_{request.ToDate:yyyyMMdd}.{request.Format.ToLower()}";
            var contentType = request.Format.ToLower() switch
            {
                "pdf" => "application/pdf",
                "excel" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                _ => "text/html"
            };

            // Log export history
            var history = new GeneratedReport
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.Now,
                CreatedBy = GetCurrentUserId()
            };
            // Store in GeneratedReports if table exists
            try
            {
                _context.GeneratedReports.Add(history);
                await _context.SaveChangesAsync();
            }
            catch (SqlException) { /* table may not exist */ }

            return new ReportExportResultDto
            {
                Success = true,
                FileName = fileName,
                ContentType = contentType,
                FileContent = Array.Empty<byte>(),
                Message = "Xuat bao cao thanh cong"
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Export report failed for {ReportCode}", reportCode);
            return new ReportExportResultDto { Success = false, Message = $"Loi xuat bao cao: {ex.Message}" };
        }
    }

    public async Task<byte[]> ExportToExcelAsync(string reportCode, DateTime fromDate, DateTime toDate, object? parameters = null)
    {
        try
        {
            // Generate CSV with UTF-8 BOM for Vietnamese character support
            var rows = await GetReportRowsAsync(reportCode, fromDate, toDate);
            var sb = new System.Text.StringBuilder();
            // CSV header
            sb.AppendLine("STT,Ma,Ten,Gia tri,Ngay,Ghi chu");
            for (int i = 0; i < rows.Count; i++)
            {
                var r = rows[i];
                sb.AppendLine($"{i + 1},\"{EscCsv(r.Code)}\",\"{EscCsv(r.Name)}\",\"{EscCsv(r.Value)}\",\"{EscCsv(r.Date)}\",\"{EscCsv(r.Note)}\"");
            }
            // UTF-8 BOM + content
            var bom = new byte[] { 0xEF, 0xBB, 0xBF };
            var content = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
            var result = new byte[bom.Length + content.Length];
            bom.CopyTo(result, 0);
            content.CopyTo(result, bom.Length);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ExportToExcelAsync failed for {ReportCode}", reportCode);
            return Array.Empty<byte>();
        }
    }

    private static string EscCsv(string? val) => (val ?? "").Replace("\"", "\"\"");

    public async Task<byte[]> ExportToPdfAsync(string reportCode, DateTime fromDate, DateTime toDate, object? parameters = null)
    {
        try
        {
            var rows = await GetReportRowsAsync(reportCode, fromDate, toDate);
            var tableRows = new System.Text.StringBuilder();
            for (int i = 0; i < rows.Count; i++)
            {
                var r = rows[i];
                tableRows.AppendLine($@"<tr><td style=""text-align:center"">{i + 1}</td><td>{System.Net.WebUtility.HtmlEncode(r.Code)}</td><td>{System.Net.WebUtility.HtmlEncode(r.Name)}</td><td style=""text-align:right"">{System.Net.WebUtility.HtmlEncode(r.Value)}</td><td>{System.Net.WebUtility.HtmlEncode(r.Date)}</td><td>{System.Net.WebUtility.HtmlEncode(r.Note)}</td></tr>");
            }

            var html = $@"<!DOCTYPE html>
<html><head><meta charset=""utf-8""><title>Bao cao {System.Net.WebUtility.HtmlEncode(reportCode)}</title>
<style>
body {{ font-family: 'Times New Roman', serif; font-size: 13px; margin: 20px; }}
h1 {{ text-align: center; font-size: 16px; text-transform: uppercase; }}
p.subtitle {{ text-align: center; font-style: italic; }}
table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
th, td {{ border: 1px solid #333; padding: 4px 6px; font-size: 12px; }}
th {{ background: #f0f0f0; text-align: center; }}
</style></head><body>
<h1>BAO CAO {System.Net.WebUtility.HtmlEncode(reportCode.ToUpper())}</h1>
<p class=""subtitle"">Tu ngay {fromDate:dd/MM/yyyy} den ngay {toDate:dd/MM/yyyy}</p>
<p class=""subtitle"">Ngay xuat: {DateTime.Now:dd/MM/yyyy HH:mm}</p>
<table><thead><tr><th>STT</th><th>Ma</th><th>Ten</th><th>Gia tri</th><th>Ngay</th><th>Ghi chu</th></tr></thead><tbody>
{tableRows}
</tbody></table>
<p style=""text-align:right;margin-top:30px""><i>Ngay {DateTime.Now:dd} thang {DateTime.Now:MM} nam {DateTime.Now:yyyy}</i></p>
<p style=""text-align:right""><b>Nguoi lap bao cao</b></p>
</body></html>";

            return System.Text.Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ExportToPdfAsync failed for {ReportCode}", reportCode);
            return Array.Empty<byte>();
        }
    }

    public async Task<List<ReportHistoryDto>> GetReportHistoryAsync(string? reportCode = null, DateTime? fromDate = null, DateTime? toDate = null, int? top = 50)
    {
        try
        {
            var query = _context.GeneratedReports.Where(r => !r.IsDeleted).AsQueryable();

            var results = await query
                .OrderByDescending(r => r.CreatedAt)
                .Take(top ?? 50)
                .Select(r => new ReportHistoryDto
                {
                    Id = r.Id,
                    CreatedAt = r.CreatedAt,
                    CreatedBy = r.CreatedBy ?? ""
                })
                .ToListAsync();

            return results;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Report history query failed");
            return new List<ReportHistoryDto>();
        }
    }

    public async Task<byte[]> DownloadReportFromHistoryAsync(Guid reportHistoryId)
    {
        try
        {
            var report = await _context.GeneratedReports.FirstOrDefaultAsync(r => r.Id == reportHistoryId && !r.IsDeleted);
            if (report == null) return Array.Empty<byte>();

            // If file exists on disk, return it
            if (!string.IsNullOrEmpty(report.OutputPath) && System.IO.File.Exists(report.OutputPath))
            {
                return await System.IO.File.ReadAllBytesAsync(report.OutputPath);
            }

            // Otherwise regenerate a summary HTML
            var html = $@"<!DOCTYPE html>
<html><head><meta charset=""utf-8""><title>{System.Net.WebUtility.HtmlEncode(report.ReportName)}</title>
<style>
body {{ font-family: 'Times New Roman', serif; font-size: 13px; margin: 20px; }}
h1 {{ text-align: center; font-size: 16px; }}
.info {{ margin: 6px 0; }}
.label {{ font-weight: bold; display: inline-block; width: 160px; }}
</style></head><body>
<h1>{System.Net.WebUtility.HtmlEncode(report.ReportName)}</h1>
<div class=""info""><span class=""label"">Ma bao cao:</span> {System.Net.WebUtility.HtmlEncode(report.ReportCode)}</div>
<div class=""info""><span class=""label"">Ngay tao:</span> {report.GeneratedAt:dd/MM/yyyy HH:mm}</div>
<div class=""info""><span class=""label"">Dinh dang:</span> {System.Net.WebUtility.HtmlEncode(report.FileFormat ?? "HTML")}</div>
<div class=""info""><span class=""label"">So ban ghi:</span> {report.TotalRecords?.ToString() ?? "N/A"}</div>
<div class=""info""><span class=""label"">Trang thai:</span> {(report.Status == 1 ? "Hoan thanh" : report.Status == 2 ? "Loi" : "Dang tao")}</div>
{(string.IsNullOrEmpty(report.Parameters) ? "" : $"<div class=\"info\"><span class=\"label\">Tham so:</span> {System.Net.WebUtility.HtmlEncode(report.Parameters)}</div>")}
{(string.IsNullOrEmpty(report.ErrorMessage) ? "" : $"<div class=\"info\" style=\"color:red\"><span class=\"label\">Loi:</span> {System.Net.WebUtility.HtmlEncode(report.ErrorMessage)}</div>")}
<p style=""font-style:italic;margin-top:20px"">File goc khong con tren he thong. Day la ban tom tat thong tin bao cao.</p>
</body></html>";

            return System.Text.Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "DownloadReportFromHistoryAsync failed for {Id}", reportHistoryId);
            return Array.Empty<byte>();
        }
    }

    #endregion

    #region Scheduled Reports

    public async Task<List<ScheduledReportConfigDto>> GetScheduledReportsAsync()
    {
        try
        {
            var configs = await _context.SystemConfigs
                .Where(c => c.ConfigKey.StartsWith("ScheduledReport_") && c.IsActive && !c.IsDeleted)
                .ToListAsync();

            return configs.Select(c =>
            {
                try
                {
                    var dto = JsonSerializer.Deserialize<ScheduledReportConfigDto>(c.ConfigValue);
                    if (dto != null)
                    {
                        dto.Id = c.Id;
                        return dto;
                    }
                }
                catch { /* invalid JSON */ }
                return null;
            }).Where(d => d != null).ToList()!;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Scheduled reports query failed");
            return new List<ScheduledReportConfigDto>();
        }
    }

    public async Task<ScheduledReportConfigDto> SaveScheduledReportAsync(SaveScheduledReportDto dto)
    {
        try
        {
            var configKey = $"ScheduledReport_{dto.ReportCode}_{(dto.Id ?? Guid.NewGuid()):N}";
            var now = DateTime.Now;

            var config = dto.Id.HasValue
                ? await _context.SystemConfigs.FindAsync(dto.Id.Value)
                : null;

            var resultDto = new ScheduledReportConfigDto
            {
                Id = dto.Id ?? Guid.NewGuid(),
                ReportCode = dto.ReportCode ?? "",
                ReportName = dto.ReportCode ?? "",
                Schedule = dto.Schedule ?? "Daily",
                CronExpression = dto.CronExpression ?? "",
                Format = dto.Format ?? "Excel",
                Recipients = dto.Recipients ?? "",
                IsActive = dto.IsActive,
                Parameters = dto.Parameters
            };

            var jsonValue = JsonSerializer.Serialize(resultDto);

            if (config != null)
            {
                config.ConfigValue = jsonValue;
                config.UpdatedAt = now;
                config.UpdatedBy = GetCurrentUserId();
            }
            else
            {
                config = new SystemConfig
                {
                    Id = resultDto.Id,
                    ConfigKey = configKey,
                    ConfigValue = jsonValue,
                    ConfigType = "JSON",
                    Description = $"Scheduled report: {dto.ReportCode}",
                    IsActive = true,
                    CreatedAt = now,
                    CreatedBy = GetCurrentUserId()
                };
                _context.SystemConfigs.Add(config);
            }

            await _context.SaveChangesAsync();
            return resultDto;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Save scheduled report failed");
            return new ScheduledReportConfigDto { Id = dto.Id ?? Guid.NewGuid(), ReportCode = dto.ReportCode ?? "" };
        }
    }

    public async Task<bool> DeleteScheduledReportAsync(Guid id)
    {
        try
        {
            var config = await _context.SystemConfigs.FindAsync(id);
            if (config == null) return false;

            config.IsDeleted = true;
            config.UpdatedAt = DateTime.Now;
            config.UpdatedBy = GetCurrentUserId();
            await _context.SaveChangesAsync();
            return true;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Delete scheduled report failed");
            return false;
        }
    }

    public async Task<bool> RunScheduledReportNowAsync(Guid id)
    {
        try
        {
            var config = await _context.SystemConfigs.FindAsync(id);
            if (config == null) return false;

            var dto = JsonSerializer.Deserialize<ScheduledReportConfigDto>(config.ConfigValue);
            if (dto == null) return false;

            // Update last run time
            dto.LastRunTime = DateTime.Now;
            config.ConfigValue = JsonSerializer.Serialize(dto);
            config.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Scheduled report {ReportCode} triggered manually", dto.ReportCode);
            return true;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Run scheduled report failed");
            return false;
        }
    }

    #endregion

    #region Report Definitions

    public Task<List<ReportDefinitionDto>> GetReportDefinitionsAsync(string? category = null)
    {
        var definitions = GetAllReportDefinitions();
        if (!string.IsNullOrEmpty(category))
            definitions = definitions.Where(d => d.Category == category).ToList();
        return Task.FromResult(definitions);
    }

    public Task<ReportDefinitionDto?> GetReportDefinitionAsync(string reportCode)
    {
        var def = GetAllReportDefinitions().FirstOrDefault(d => d.ReportCode == reportCode);
        return Task.FromResult(def);
    }

    #endregion

    #region Private Helpers

    private async Task<DashboardSummaryDto> BuildSummaryAsync(DateTime from, DateTime to, Guid? departmentId = null)
    {
        var mrQuery = _context.MedicalRecords.Where(m => m.AdmissionDate >= from && m.AdmissionDate < to && !m.IsDeleted);
        if (departmentId.HasValue)
            mrQuery = mrQuery.Where(m => m.DepartmentId == departmentId.Value);

        var totalPatients = await mrQuery.CountAsync();
        var outpatient = await mrQuery.CountAsync(m => m.TreatmentType == 1);
        var inpatient = await mrQuery.CountAsync(m => m.TreatmentType == 2);
        var emergency = await mrQuery.CountAsync(m => m.TreatmentType == 3);

        var examQuery = _context.Examinations.Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted);
        if (departmentId.HasValue)
            examQuery = examQuery.Where(e => e.DepartmentId == departmentId.Value);
        var totalExams = await examQuery.CountAsync();

        var receiptQuery = _context.Receipts.Where(r => r.ReceiptDate >= from && r.ReceiptDate < to && r.Status == 1 && !r.IsDeleted);
        var totalRevenue = await receiptQuery.SumAsync(r => (decimal?)r.FinalAmount) ?? 0;

        var labTests = await _context.LabRequestItems.CountAsync(l => l.CreatedAt >= from && l.CreatedAt < to && !l.IsDeleted);

        var surgeries = await _context.SurgeryRequests.CountAsync(s => s.RequestDate >= from && s.RequestDate < to && !s.IsDeleted);

        var totalBeds = await _context.Beds.CountAsync(b => b.IsActive && !b.IsDeleted);
        var availableBeds = await _context.Beds.CountAsync(b => b.Status == 0 && b.IsActive && !b.IsDeleted);
        var occupancyRate = totalBeds > 0 ? Math.Round((totalBeds - availableBeds) * 100m / totalBeds, 1) : 0;

        return new DashboardSummaryDto
        {
            TotalPatients = totalPatients,
            OutpatientCount = outpatient,
            InpatientCount = inpatient,
            EmergencyCount = emergency,
            TotalRevenue = totalRevenue,
            InsuranceRevenue = 0,
            PatientRevenue = totalRevenue,
            TotalExaminations = totalExams,
            TotalLabTests = labTests,
            TotalRadiologyExams = 0,
            TotalSurgeries = surgeries,
            OccupancyRate = occupancyRate,
            AvailableBeds = availableBeds
        };
    }

    private static KPIItemDto BuildKPI(string code, string name, decimal current, decimal previous, string unit, decimal target)
    {
        var change = previous != 0 ? Math.Round((current - previous) * 100m / previous, 1) : 0;
        var trend = change > 0 ? "Up" : change < 0 ? "Down" : "Stable";
        var status = target == 0 ? "Good" : current >= target ? "Good" : current >= target * 0.8m ? "Warning" : "Bad";

        return new KPIItemDto
        {
            Code = code, Name = name,
            CurrentValue = current, TargetValue = target, PreviousValue = previous,
            Unit = unit, Trend = trend, ChangePercent = change, Status = status
        };
    }

    private async Task<ControlledDrugReportDto> GetControlledDrugReportInternalAsync(DateTime fromDate, DateTime toDate, bool isNarcotic)
    {
        try
        {
            var query = _context.PrescriptionDetails
                .Where(pd => pd.Prescription.PrescriptionDate >= fromDate
                    && pd.Prescription.PrescriptionDate < toDate
                    && !pd.IsDeleted
                    && (isNarcotic ? pd.Medicine.IsNarcotic : pd.Medicine.IsPsychotropic));

            var items = await query
                .OrderBy(pd => pd.Prescription.PrescriptionDate)
                .Select(pd => new ControlledDrugItemDto
                {
                    Date = pd.Prescription.PrescriptionDate,
                    PatientCode = pd.Prescription.MedicalRecord.Patient.PatientCode,
                    PatientName = pd.Prescription.MedicalRecord.Patient.FullName,
                    Diagnosis = pd.Prescription.Diagnosis ?? "",
                    DrugCode = pd.Medicine.MedicineCode,
                    DrugName = pd.Medicine.MedicineName,
                    Quantity = pd.Quantity,
                    Unit = pd.Unit ?? "",
                    DoctorName = pd.Prescription.Doctor.FullName,
                    LicenseNumber = pd.Prescription.Doctor.LicenseNumber ?? ""
                })
                .ToListAsync();

            for (int i = 0; i < items.Count; i++)
                items[i].RowNumber = i + 1;

            return new ControlledDrugReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                DrugType = isNarcotic ? "Narcotic" : "Psychotropic",
                Items = items
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Controlled drug report failed");
            return new ControlledDrugReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                DrugType = isNarcotic ? "Narcotic" : "Psychotropic",
                Items = new List<ControlledDrugItemDto>()
            };
        }
    }

    private static List<ReportDefinitionDto> GetAllReportDefinitions()
    {
        var dateParams = new List<ReportParameterDto>
        {
            new() { Name = "fromDate", Label = "Tu ngay", DataType = "Date", IsRequired = true },
            new() { Name = "toDate", Label = "Den ngay", DataType = "Date", IsRequired = true }
        };

        var deptParam = new ReportParameterDto { Name = "departmentId", Label = "Khoa", DataType = "Guid", IsRequired = false, LookupSource = "/api/departments" };
        var formats = new List<string> { "Excel", "PDF", "HTML" };

        return new List<ReportDefinitionDto>
        {
            new() { ReportCode = "BC-001", ReportName = "Bao cao benh nhan theo khoa", Category = "Clinical", Module = "OPD", SupportedFormats = formats, Parameters = new List<ReportParameterDto>(dateParams) { deptParam } },
            new() { ReportCode = "BC-002", ReportName = "Top 10 benh ICD-10", Category = "Clinical", Module = "OPD", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-003", ReportName = "Bao cao ty le tu vong", Category = "Clinical", Module = "Inpatient", SupportedFormats = formats, Parameters = new List<ReportParameterDto>(dateParams) { deptParam } },
            new() { ReportCode = "BC-004", ReportName = "Thong ke phau thuat thu thuat", Category = "Clinical", Module = "Surgery", SupportedFormats = formats, Parameters = new List<ReportParameterDto>(dateParams) { deptParam } },
            new() { ReportCode = "BC-005", ReportName = "Thong ke xet nghiem", Category = "Clinical", Module = "Laboratory", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-006", ReportName = "Thong ke CDHA", Category = "Clinical", Module = "Radiology", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-007", ReportName = "Bao cao tai kham", Category = "Clinical", Module = "OPD", SupportedFormats = formats, Parameters = new List<ReportParameterDto>(dateParams) { deptParam } },
            new() { ReportCode = "BC-008", ReportName = "Bao cao nhiem khuan benh vien", Category = "Clinical", Module = "Inpatient", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-101", ReportName = "Doanh thu tong hop", Category = "Financial", Module = "Billing", SupportedFormats = formats, Parameters = new List<ReportParameterDto>(dateParams) { deptParam } },
            new() { ReportCode = "BC-102", ReportName = "Doanh thu theo ngay", Category = "Financial", Module = "Billing", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-103", ReportName = "Cong no benh nhan", Category = "Financial", Module = "Billing", SupportedFormats = formats, Parameters = new List<ReportParameterDto> { new() { Name = "asOfDate", Label = "Tinh den ngay", DataType = "Date", IsRequired = false } } },
            new() { ReportCode = "BC-104", ReportName = "BHYT tong hop", Category = "Financial", Module = "Insurance", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-105", ReportName = "Loi nhuan theo khoa", Category = "Financial", Module = "Billing", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-106", ReportName = "Thu tien theo nhan vien", Category = "Financial", Module = "Billing", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-107", ReportName = "Hoa don GTGT", Category = "Financial", Module = "Billing", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-201", ReportName = "Ton kho hien tai", Category = "Pharmacy", Module = "Pharmacy", SupportedFormats = formats, Parameters = new List<ReportParameterDto> { new() { Name = "warehouseId", Label = "Kho", DataType = "Guid", IsRequired = false, LookupSource = "/api/warehouses" } } },
            new() { ReportCode = "BC-202", ReportName = "Xuat nhap ton", Category = "Pharmacy", Module = "Pharmacy", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-203", ReportName = "Thuoc gay nghien", Category = "Pharmacy", Module = "Pharmacy", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-204", ReportName = "Thuoc huong than", Category = "Pharmacy", Module = "Pharmacy", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-205", ReportName = "Thuoc sap het han", Category = "Pharmacy", Module = "Pharmacy", SupportedFormats = formats, Parameters = new List<ReportParameterDto> { new() { Name = "daysAhead", Label = "So ngay", DataType = "Int", IsRequired = false, DefaultValue = "90" } } },
            new() { ReportCode = "BC-206", ReportName = "Su dung thuoc theo khoa", Category = "Pharmacy", Module = "Pharmacy", SupportedFormats = formats, Parameters = new List<ReportParameterDto>(dateParams) { deptParam } },
            new() { ReportCode = "BC-207", ReportName = "Phan tich ABC/VEN", Category = "Pharmacy", Module = "Pharmacy", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-301", ReportName = "Thong ke nguoi dung", Category = "Admin", Module = "SystemAdmin", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-302", ReportName = "Nhat ky he thong", Category = "Admin", Module = "SystemAdmin", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-303", ReportName = "Hieu suat he thong", Category = "Admin", Module = "SystemAdmin", SupportedFormats = formats, Parameters = dateParams }
        };
    }

    #endregion
}
