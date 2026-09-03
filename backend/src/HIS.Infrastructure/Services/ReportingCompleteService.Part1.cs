using System.Text.Json;
using HIS.Application.Common;
using HIS.Application.DTOs.Reporting;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public partial class ReportingCompleteService : IReportingCompleteService
{
    private readonly HISDbContext _context;
    private readonly ICurrentUserAccessor _currentUser;
    private readonly ILogger<ReportingCompleteService> _logger;

    public ReportingCompleteService(
        HISDbContext context,
        ICurrentUserAccessor currentUser,
        ILogger<ReportingCompleteService> logger)
    {
        _context = context;
        _currentUser = currentUser;
        _logger = logger;
    }

    // Đọc người dùng hiện tại qua ICurrentUserAccessor (canonical claim) — #200 REFAC-1.
    // Behavior giữ nguyên: claim "sub" trước đây luôn null (AuthService không phát) nên
    // kết quả thực tế = NameIdentifier ?? "system".
    private string GetCurrentUserId() => _currentUser.UserId ?? "system";

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


    public async Task<DashboardDto> GetDashboardAsync(DateTime? date = null)
    {
        var targetDate = date ?? DateTime.Today;
        var monthStart = new DateTime(targetDate.Year, targetDate.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        try
        {
            var todaySummary = await BuildSummaryAsync(targetDate, targetDate.AddDays(1));
            var monthSummary = await BuildSummaryAsync(monthStart, monthEnd);

            // #195: 2 query cho cả tuần thay vì 14 query (mỗi ngày 1 count + 1 sum).
            // Vẫn chia ngăn trong bộ nhớ theo đúng mốc [d, d+1) cũ nên `date` có kèm giờ
            // cũng cho ra y hệt kết quả trước.
            var trendStart = targetDate.AddDays(-6);
            var trendEnd = targetDate.AddDays(1);

            var admissionDates = await _context.MedicalRecords
                .Where(m => m.AdmissionDate >= trendStart && m.AdmissionDate < trendEnd && !m.IsDeleted)
                .Select(m => m.AdmissionDate)
                .ToListAsync();

            var receiptAmounts = await _context.Receipts
                .Where(r => r.ReceiptDate >= trendStart && r.ReceiptDate < trendEnd && r.Status == 1 && !r.IsDeleted)
                .Select(r => new { r.ReceiptDate, r.FinalAmount })
                .ToListAsync();

            // 7-day patient trend
            var patientTrend = new List<DashboardChartDataDto>();
            for (int i = 6; i >= 0; i--)
            {
                var d = targetDate.AddDays(-i);
                var dEnd = d.AddDays(1);
                var count = admissionDates.Count(x => x >= d && x < dEnd);
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
                var rev = receiptAmounts
                    .Where(r => r.ReceiptDate >= d && r.ReceiptDate < dEnd)
                    .Sum(r => r.FinalAmount);
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

            // Operational KPIs — #14b: đọc model 1 ServiceRequestDetail (RequestType=1 XN), model 2 LabRequestItems chỉ seed ghi (rỗng/sai)
            var totalLabTests = await _context.ServiceRequestDetails.CountAsync(d => d.CreatedAt >= fromDate && d.CreatedAt < toDate && !d.IsDeleted
                && d.ServiceRequest.RequestType == 1 && d.Status != 3);
            var completedLabs = await _context.ServiceRequestDetails.CountAsync(d => d.CreatedAt >= fromDate && d.CreatedAt < toDate && !d.IsDeleted
                && d.ServiceRequest.RequestType == 1 && d.Status == 2);

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


}
