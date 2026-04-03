using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Core.Entities;
using HIS.Core.DTOs;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// NangCap21 - HIS Đám Mây 3 Cấp: Tổng hợp dữ liệu từ Trạm YT → Huyện → Tỉnh
/// </summary>
public interface IMultiFacilityConsolidationService
{
    /// <summary>
    /// Lấy dashboard cho 1 chi nhánh hoặc tất cả (branchId = null)
    /// </summary>
    Task<MultiFacilityDashboardDto> GetDashboardAsync(Guid? branchId, DateTime? date);

    /// <summary>
    /// Lấy cây chi nhánh đầy đủ (3 cấp)
    /// </summary>
    Task<BranchTreeDto?> GetBranchTreeAsync(Guid? branchId);

    /// <summary>
    /// Lấy tất cả các chi nhánh con của 1 chi nhánh (đệ quy)
    /// </summary>
    Task<List<Guid>> GetAllSubBranchIdsAsync(Guid? branchId);

    /// <summary>
    /// Báo cáo tổng hợp theo loại
    /// </summary>
    Task<ConsolidatedReportDto> GetConsolidatedReportAsync(
        Guid? rootBranchId,
        string reportType,
        DateTime fromDate,
        DateTime toDate);

    /// <summary>
    /// Lịch trực theo chi nhánh (3 cấp)
    /// </summary>
    Task<BranchDutyRosterDto> GetBranchDutyRosterAsync(Guid? branchId, int year, int month);

    /// <summary>
    /// Lấy danh sách chi nhánh theo cấp (Trạm YT / Huyện / Tỉnh)
    /// </summary>
    Task<List<BranchTreeDto>> GetBranchesByLevelAsync();
}

public class MultiFacilityConsolidationService : IMultiFacilityConsolidationService
{
    private readonly HISDbContext _context;
    private readonly ILogger<MultiFacilityConsolidationService> _logger;

    public MultiFacilityConsolidationService(HISDbContext context, ILogger<MultiFacilityConsolidationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<MultiFacilityDashboardDto> GetDashboardAsync(Guid? branchId, DateTime? date)
    {
        var reportDate = date ?? DateTime.Today;
        // Get all IDs to include: root + all descendants (includes root in the set)
        var branchIdsToInclude = new List<Guid>();
        if (branchId.HasValue)
        {
            branchIdsToInclude.Add(branchId.Value);
            var children = await GetAllSubBranchIdsAsync(branchId);
            branchIdsToInclude.AddRange(children);
        }
        var includeAll = !branchId.HasValue;

        // Determine branch level label
        string? branchLevel = null;
        if (branchId.HasValue)
        {
            var branch = await _context.HospitalBranches.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.Id == branchId);
            if (branch != null)
                branchLevel = GetBranchLevelLabel(branch);
        }

        // Today's date range
        var todayStart = reportDate.Date;
        var todayEnd = reportDate.Date.AddDays(1);

        // 7-day trend
        var weekStart = reportDate.AddDays(-6).Date;
        var weekTrend = new List<DailyTrendItem>();

        // Department stats query (base)
        var deptStats = new List<BranchDepartmentStat>();

        // Patient type breakdown
        var patientTypes = new PatientTypeBreakdown();

        // Sub-branches
        var subBranches = new List<BranchSummary>();

        try
        {
            // === Patient type breakdown ===
            var queueQuery = _context.QueueTickets
                .Where(q => q.IssueDate >= todayStart && q.IssueDate < todayEnd && !q.IsDeleted);

            if (!includeAll && branchIdsToInclude.Count > 0)
                queueQuery = queueQuery.Where(q => q.BranchId.HasValue && branchIdsToInclude.Contains(q.BranchId.Value));

            // Count by queue type (proxy for patient type)
            // QueueType: 1-Tiếp đón, 2-Khám bệnh, 3-Xét nghiệm, 4-CĐHA, 5-Nhà thuốc, 6-Thanh toán
            var queueByType = await queueQuery
                .GroupBy(q => q.QueueType)
                .Select(g => new { Type = g.Key, Count = g.Count() })
                .ToListAsync();

            // QueueType 1-2 typically = outpatient
            patientTypes.General = queueByType.Where(q => q.Type <= 2).Sum(q => q.Count);
            // Emergency: Priority = 2 (Cấp cứu)
            patientTypes.Emergency = await queueQuery.CountAsync(q => q.Priority == 2);
            // Insurance: check patient insurance
            patientTypes.Insurance = await queueQuery
                .Join(_context.Patients, q => q.PatientId, p => p.Id, (q, p) => p)
                .CountAsync(p => !string.IsNullOrEmpty(p.InsuranceNumber));

            // === 7-day trend ===
            for (var d = weekStart; d <= reportDate; d = d.AddDays(1))
            {
                var dayStart = d.Date;
                var dayEnd = d.Date.AddDays(1);

                var dayQuery = _context.QueueTickets
                    .Where(q => q.IssueDate >= dayStart && q.IssueDate < dayEnd && !q.IsDeleted);

                if (!includeAll && branchIdsToInclude.Count > 0)
                    dayQuery = dayQuery.Where(q => q.BranchId.HasValue && branchIdsToInclude.Contains(q.BranchId.Value));
                else if (!includeAll && branchId.HasValue)
                    dayQuery = dayQuery.Where(q => q.BranchId == branchId);

                var outpatientCount = await dayQuery.CountAsync(q => q.QueueType == 2);
                var admissionCount = await _context.Admissions
                    .Where(a => a.AdmissionDate >= dayStart && a.AdmissionDate < dayEnd && !a.IsDeleted)
                    .Where(a => !includeAll
                        ? (branchIdsToInclude.Count > 0
                            ? (a.MedicalRecord != null && a.MedicalRecord.Patient != null &&
                               a.MedicalRecord.Patient.BranchId.HasValue && branchIdsToInclude.Contains(a.MedicalRecord.Patient.BranchId.Value))
                            : (a.MedicalRecord != null && a.MedicalRecord.Patient != null && a.MedicalRecord.Patient.BranchId == branchId))
                        : true)
                    .CountAsync();

                var dischargeCount = await _context.Discharges
                    .Where(dc => dc.DischargeDate >= dayStart && dc.DischargeDate < dayEnd && !dc.IsDeleted)
                    .CountAsync();

                // Revenue from payments
                var dayRevenue = await _context.Receipts
                    .Where(p => p.ReceiptDate >= dayStart && p.ReceiptDate < dayEnd && !p.IsDeleted)
                    .Where(p => !includeAll
                        ? (branchIdsToInclude.Count > 0
                            ? (p.MedicalRecord != null && p.MedicalRecord.Patient != null &&
                               p.MedicalRecord.Patient.BranchId.HasValue && branchIdsToInclude.Contains(p.MedicalRecord.Patient.BranchId.Value))
                            : (p.MedicalRecord != null && p.MedicalRecord.Patient != null && p.MedicalRecord.Patient.BranchId == branchId))
                        : true)
                    .SumAsync(p => p.FinalAmount);

                weekTrend.Add(new DailyTrendItem
                {
                    Date = d,
                    Outpatients = outpatientCount,
                    Inpatients = admissionCount,
                    Revenue = dayRevenue,
                    Admissions = admissionCount,
                    Discharges = dischargeCount
                });
            }

            // === Department stats ===
            var deptQuery = _context.Departments
                .Where(d => d.IsActive && !d.IsDeleted);

            if (!includeAll && branchId.HasValue)
            {
                var deptIds = await deptQuery
                    .Where(d => d.BranchId == branchId || branchIdsToInclude.Contains(d.BranchId ?? Guid.Empty))
                    .Select(d => d.Id)
                    .ToListAsync();
                deptQuery = _context.Departments.Where(d => deptIds.Contains(d.Id));
            }

            var depts = await deptQuery
                .Include(d => d.Rooms)
                .ToListAsync();

            foreach (var dept in depts.Take(10))
            {
                var deptTodayQuery = _context.QueueTickets
                    .Where(q => q.IssueDate >= todayStart && q.IssueDate < todayEnd && !q.IsDeleted);

                if (!includeAll && branchIdsToInclude.Count > 0)
                    deptTodayQuery = deptTodayQuery.Where(q => q.BranchId.HasValue && branchIdsToInclude.Contains(q.BranchId.Value));
                else if (!includeAll && branchId.HasValue)
                    deptTodayQuery = deptTodayQuery.Where(q => q.BranchId == branchId);

                var roomIds = dept.Rooms.Select(r => r.Id).ToList();

                var outCount = roomIds.Count > 0
                    ? await deptTodayQuery.CountAsync(q => roomIds.Contains(q.RoomId ?? Guid.Empty))
                    : 0;

                var admCount = await _context.Admissions
                    .Where(a => a.AdmissionDate >= todayStart && a.AdmissionDate < todayEnd && !a.IsDeleted)
                    .Where(a => a.MedicalRecord != null && dept.Id == a.MedicalRecord.DepartmentId)
                    .CountAsync();

                var deptRevenue = await _context.Receipts
                    .Where(p => p.ReceiptDate >= todayStart && p.ReceiptDate < todayEnd && !p.IsDeleted)
                    .Where(p => p.MedicalRecord != null && dept.Id == p.MedicalRecord.DepartmentId)
                    .SumAsync(p => p.FinalAmount);

                deptStats.Add(new BranchDepartmentStat
                {
                    DepartmentId = dept.Id,
                    DepartmentName = dept.DepartmentName,
                    OutpatientCount = outCount,
                    AdmissionCount = admCount,
                    Revenue = deptRevenue
                });
            }

            // === Sub-branches ===
            var branchesQuery = _context.HospitalBranches
                .Where(b => b.IsActive && !b.IsDeleted);

            if (!includeAll && branchId.HasValue)
                branchesQuery = branchesQuery.Where(b => b.ParentBranchId == branchId);

            var branches = await branchesQuery.ToListAsync();

            foreach (var br in branches)
            {
                var subIds = await GetAllSubBranchIdsAsync(br.Id);
                var brSubIds = new List<Guid> { br.Id };
                brSubIds.AddRange(subIds);

                var brQueueQuery = _context.QueueTickets
                    .Where(q => q.IssueDate >= todayStart && q.IssueDate < todayEnd && !q.IsDeleted)
                    .Where(q => q.BranchId.HasValue && brSubIds.Contains(q.BranchId.Value));

                var brAdmCount = await _context.Admissions
                    .Where(a => a.AdmissionDate >= todayStart && a.AdmissionDate < todayEnd && !a.IsDeleted)
                    .Where(a => a.MedicalRecord != null && a.MedicalRecord.Patient != null &&
                               brSubIds.Contains(a.MedicalRecord.Patient.BranchId ?? Guid.Empty))
                    .CountAsync();

                var brRevenue = await _context.Receipts
                    .Where(p => p.ReceiptDate >= todayStart && p.ReceiptDate < todayEnd && !p.IsDeleted)
                    .Where(p => p.MedicalRecord != null && p.MedicalRecord.Patient != null &&
                               brSubIds.Contains(p.MedicalRecord.Patient.BranchId ?? Guid.Empty))
                    .SumAsync(p => p.FinalAmount);

                subBranches.Add(new BranchSummary
                {
                    BranchId = br.Id,
                    BranchCode = br.BranchCode,
                    BranchName = br.BranchName,
                    BranchLevel = GetBranchLevelLabel(br),
                    Outpatients = await brQueueQuery.CountAsync(q => q.QueueType == 2),
                    Inpatients = brAdmCount,
                    Revenue = brRevenue,
                    SubBranchCount = await _context.HospitalBranches.CountAsync(b => b.ParentBranchId == br.Id && !b.IsDeleted)
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Multi-facility dashboard query failed, returning partial data");
        }

        // Get branch name
        string? branchName = null;
        if (branchId.HasValue)
        {
            var br = await _context.HospitalBranches.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.Id == branchId);
            branchName = br?.BranchName;
        }

        // KPIs
        var todayQueueQuery = _context.QueueTickets
            .Where(q => q.IssueDate >= todayStart && q.IssueDate < todayEnd && !q.IsDeleted);

        if (!includeAll && branchIdsToInclude.Count > 0)
            todayQueueQuery = todayQueueQuery.Where(q => q.BranchId.HasValue && branchIdsToInclude.Contains(q.BranchId.Value));
        else if (!includeAll && branchId.HasValue)
            todayQueueQuery = todayQueueQuery.Where(q => q.BranchId == branchId);

        var todayOutpatients = await todayQueueQuery.CountAsync(q => q.QueueType == 2);
        var todayEmergency = await todayQueueQuery.CountAsync(q => q.Priority == 2);
        var todaySurg = await _context.SurgerySchedules
            .Where(s => s.ScheduledDate.Date == reportDate.Date && s.Status >= 2 && !s.IsDeleted)
            .CountAsync();

        // Current inpatients
        var currentIpd = await _context.Admissions
            .Where(a => a.Status == 1 && !a.IsDeleted)
            .Where(a => !includeAll
                ? (branchIdsToInclude.Count > 0
                    ? (a.MedicalRecord != null && a.MedicalRecord.Patient != null &&
                       a.MedicalRecord.Patient.BranchId.HasValue && branchIdsToInclude.Contains(a.MedicalRecord.Patient.BranchId.Value))
                    : (a.MedicalRecord != null && a.MedicalRecord.Patient != null && a.MedicalRecord.Patient.BranchId == branchId))
                : true)
            .CountAsync();

        // Available beds
        var occupiedBeds = currentIpd;
        var totalBeds = await _context.Beds.Where(b => b.IsActive && !b.IsDeleted).CountAsync();

        // Today's revenue
        var todayRevQuery = _context.Receipts
            .Where(p => p.ReceiptDate >= todayStart && p.ReceiptDate < todayEnd && !p.IsDeleted);

        if (!includeAll && branchIdsToInclude.Count > 0)
            todayRevQuery = todayRevQuery.Where(p => p.MedicalRecord != null && p.MedicalRecord.Patient != null &&
                                                      p.MedicalRecord.Patient.BranchId.HasValue && branchIdsToInclude.Contains(p.MedicalRecord.Patient.BranchId.Value));
        else if (!includeAll && branchId.HasValue)
            todayRevQuery = todayRevQuery.Where(p => p.MedicalRecord != null && p.MedicalRecord.Patient != null && p.MedicalRecord.Patient.BranchId == branchId);

        var todayRevenue = await todayRevQuery.SumAsync(p => p.FinalAmount);

        // Today's admissions/discharges
        var todayAdmissions = await _context.Admissions
            .Where(a => a.AdmissionDate >= todayStart && a.AdmissionDate < todayEnd && !a.IsDeleted)
            .Where(a => !includeAll
                ? (branchIdsToInclude.Count > 0
                    ? (a.MedicalRecord != null && a.MedicalRecord.Patient != null &&
                       a.MedicalRecord.Patient.BranchId.HasValue && branchIdsToInclude.Contains(a.MedicalRecord.Patient.BranchId.Value))
                    : (a.MedicalRecord != null && a.MedicalRecord.Patient != null && a.MedicalRecord.Patient.BranchId == branchId))
                : true)
            .CountAsync();

        var todayDischarges = await _context.Discharges
            .Where(d => d.DischargeDate >= todayStart && d.DischargeDate < todayEnd && !d.IsDeleted)
            .CountAsync();

        return new MultiFacilityDashboardDto
        {
            BranchId = branchId,
            BranchName = branchName,
            BranchLevel = branchLevel,
            ReportDate = reportDate,
            TodayOutpatients = todayOutpatients,
            TodayEmergency = todayEmergency,
            TodayAdmissions = todayAdmissions,
            TodayDischarges = todayDischarges,
            TodayRevenue = todayRevenue,
            CurrentInpatients = currentIpd,
            AvailableBeds = Math.Max(0, totalBeds - occupiedBeds),
            Surgeries = todaySurg,
            WeeklyTrends = weekTrend,
            DepartmentStats = deptStats,
            PatientTypes = patientTypes,
            SubBranches = subBranches
        };
    }

    public async Task<BranchTreeDto?> GetBranchTreeAsync(Guid? branchId)
    {
        var branches = await _context.HospitalBranches
            .IgnoreQueryFilters()
            .Where(b => !b.IsDeleted)
            .ToListAsync();

        if (branchId.HasValue)
        {
            var root = branches.FirstOrDefault(b => b.Id == branchId);
            if (root == null) return null;
            return BuildBranchTree(root, branches);
        }

        // Return full tree starting from root (no parent)
        var roots = branches.Where(b => b.ParentBranchId == null && b.IsHeadquarters).ToList();
        if (roots.Count == 0) roots = branches.Where(b => b.ParentBranchId == null).ToList();

        if (roots.Count == 0) return null;
        return BuildBranchTree(roots[0], branches);
    }

    private BranchTreeDto BuildBranchTree(HospitalBranch branch, List<HospitalBranch> allBranches)
    {
        var today = DateTime.Today;
        var todayStart = today;
        var todayEnd = today.AddDays(1);

        var subIds = allBranches.Where(b => b.ParentBranchId == branch.Id).Select(b => b.Id).ToList();
        var allIds = new List<Guid> { branch.Id };
        allIds.AddRange(subIds);

        var dto = new BranchTreeDto
        {
            Id = branch.Id,
            BranchCode = branch.BranchCode,
            BranchName = branch.BranchName,
            Address = branch.Address,
            PhoneNumber = branch.PhoneNumber,
            BranchLevel = GetBranchLevelLabel(branch),
            IsHeadquarters = branch.IsHeadquarters,
            IsActive = branch.IsActive,
            PatientCount = _context.Patients
                .IgnoreQueryFilters()
                .Where(p => !p.IsDeleted && p.BranchId.HasValue && allIds.Contains(p.BranchId.Value))
                .Count(),
            StaffCount = _context.Users
                .Where(u => u.IsActive && !u.IsDeleted && u.Department != null &&
                           allIds.Contains(u.Department.BranchId ?? Guid.Empty))
                .Count(),
            TodayRevenue = _context.Receipts
                .Where(p => p.ReceiptDate >= todayStart && p.ReceiptDate < todayEnd && !p.IsDeleted)
                .Where(p => p.MedicalRecord != null && p.MedicalRecord.Patient != null &&
                           allIds.Contains(p.MedicalRecord.Patient.BranchId ?? Guid.Empty))
                .Sum(p => p.Amount),
            Children = allBranches
                .Where(b => b.ParentBranchId == branch.Id && !b.IsDeleted)
                .Select(b => BuildBranchTree(b, allBranches))
                .ToList()
        };

        return dto;
    }

    public async Task<List<Guid>> GetAllSubBranchIdsAsync(Guid? branchId)
    {
        if (!branchId.HasValue) return new List<Guid>();

        var result = new List<Guid>();
        var toProcess = new Queue<Guid>();
        toProcess.Enqueue(branchId.Value);

        while (toProcess.Count > 0)
        {
            var current = toProcess.Dequeue();
            var children = await _context.HospitalBranches
                .IgnoreQueryFilters()
                .Where(b => b.ParentBranchId == current && !b.IsDeleted)
                .Select(b => b.Id)
                .ToListAsync();

            foreach (var child in children)
            {
                if (!result.Contains(child))
                {
                    result.Add(child);
                    toProcess.Enqueue(child);
                }
            }
        }

        return result;
    }

    public async Task<ConsolidatedReportDto> GetConsolidatedReportAsync(
        Guid? rootBranchId, string reportType, DateTime fromDate, DateTime toDate)
    {
        var branches = await _context.HospitalBranches
            .IgnoreQueryFilters()
            .Where(b => !b.IsDeleted && b.IsActive)
            .ToListAsync();

        // Get all sub-branch IDs for root
        var allSubIds = await GetAllSubBranchIdsAsync(rootBranchId);
        var allIds = new List<Guid>();
        if (rootBranchId.HasValue) allIds.Add(rootBranchId.Value);
        allIds.AddRange(allSubIds);

        var branchItems = new List<BranchReportItem>();
        var chartData = new List<ChartDataPoint>();

        // Root branch
        if (rootBranchId.HasValue)
        {
            var root = branches.FirstOrDefault(b => b.Id == rootBranchId);
            if (root != null)
            {
                var item = await BuildBranchReportItemAsync(root, allIds, fromDate, toDate);
                branchItems.Add(item);
            }
        }

        // Direct children
        var children = branches.Where(b => b.ParentBranchId == rootBranchId).ToList();
        foreach (var child in children)
        {
            var childSubIds = await GetAllSubBranchIdsAsync(child.Id);
            var childAllIds = new List<Guid> { child.Id };
            childAllIds.AddRange(childSubIds);
            var item = await BuildBranchReportItemAsync(child, childAllIds, fromDate, toDate);
            branchItems.Add(item);
        }

        // Chart data: by branch level
        var byLevel = branchItems
            .GroupBy(b => b.BranchLevel)
            .Select(g => new ChartDataPoint
            {
                Label = g.Key,
                Value = g.Sum(x => x.Revenue),
                Category = "Revenue"
            })
            .ToList();

        chartData.AddRange(byLevel);

        var totalRevenue = branchItems.Sum(b => b.Revenue);
        var totalPatients = branchItems.Sum(b => b.PatientCount);
        var totalVisits = branchItems.Sum(b => b.VisitCount);

        foreach (var item in branchItems.Where(i => i.Revenue > 0 && totalRevenue > 0))
        {
            item.RevenuePercentage = Math.Round(item.Revenue / totalRevenue * 100, 2);
        }

        return new ConsolidatedReportDto
        {
            RootBranchId = rootBranchId,
            ReportType = reportType,
            FromDate = fromDate,
            ToDate = toDate,
            TotalPatients = totalPatients,
            TotalRevenue = totalRevenue,
            TotalVisits = totalVisits,
            TotalAdmissions = branchItems.Sum(b => b.AdmissionCount),
            BranchItems = branchItems,
            ChartData = chartData
        };
    }

    private async Task<BranchReportItem> BuildBranchReportItemAsync(
        HospitalBranch branch, List<Guid> branchIds, DateTime fromDate, DateTime toDate)
    {
        var patientCount = await _context.Patients
            .IgnoreQueryFilters()
            .Where(p => !p.IsDeleted && p.BranchId.HasValue && branchIds.Contains(p.BranchId.Value))
            .CountAsync();

        var visitCount = await _context.QueueTickets
            .Where(q => q.IssueDate >= fromDate && q.IssueDate <= toDate && !q.IsDeleted)
            .Where(q => q.BranchId.HasValue && branchIds.Contains(q.BranchId.Value))
            .CountAsync(q => q.QueueType == 2);

        var admCount = await _context.Admissions
            .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate && !a.IsDeleted)
            .Where(a => a.MedicalRecord != null && a.MedicalRecord.Patient != null &&
                       branchIds.Contains(a.MedicalRecord.Patient.BranchId ?? Guid.Empty))
            .CountAsync();

        var revenue = await _context.Receipts
            .Where(p => p.ReceiptDate >= fromDate && p.ReceiptDate <= toDate && !p.IsDeleted)
            .Where(p => p.MedicalRecord != null && p.MedicalRecord.Patient != null &&
                       branchIds.Contains(p.MedicalRecord.Patient.BranchId ?? Guid.Empty))
            .SumAsync(p => p.FinalAmount);

        var subBranchCount = await _context.HospitalBranches
            .IgnoreQueryFilters()
            .CountAsync(b => b.ParentBranchId == branch.Id && !b.IsDeleted);

        return new BranchReportItem
        {
            BranchId = branch.Id,
            BranchCode = branch.BranchCode,
            BranchName = branch.BranchName,
            BranchLevel = GetBranchLevelLabel(branch),
            PatientCount = patientCount,
            VisitCount = visitCount,
            AdmissionCount = admCount,
            Revenue = revenue,
            SubBranchCount = subBranchCount
        };
    }

    public async Task<BranchDutyRosterDto> GetBranchDutyRosterAsync(Guid? branchId, int year, int month)
    {
        // Get all branch IDs to include
        var allSubIds = await GetAllSubBranchIdsAsync(branchId);
        var allIds = new List<Guid>();
        if (branchId.HasValue) allIds.Add(branchId.Value);
        allIds.AddRange(allSubIds);

        var branchName = "Tất cả chi nhánh";
        if (branchId.HasValue)
        {
            var br = await _context.HospitalBranches.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.Id == branchId);
            branchName = br?.BranchName ?? "Chi nhánh";
        }

        // Get departments for this branch
        var deptQuery = _context.Departments
            .Where(d => d.IsActive && !d.IsDeleted);

        if (branchId.HasValue)
        {
            deptQuery = deptQuery.Where(d => d.BranchId.HasValue && allIds.Contains(d.BranchId.Value));
        }

        var depts = await deptQuery.ToListAsync();
        var deptIds = depts.Select(d => d.Id).ToList();

        // Get staff in these departments
        var staffQuery = _context.Users
            .Where(u => u.IsActive && !u.IsDeleted && u.DepartmentId.HasValue && deptIds.Contains(u.DepartmentId.Value));

        var staffList = await staffQuery
            .Include(u => u.Department)
            .Take(50)
            .ToListAsync();

        var shifts = new List<DutyShiftItem>();
        var staffSummary = new List<BranchStaffSummary>();

        // Generate calendar for the month
        var daysInMonth = DateTime.DaysInMonth(year, month);
        var rand = new Random(42);

        foreach (var staff in staffList)
        {
            var morning = 0;
            var afternoon = 0;
            var night = 0;

            for (var day = 1; day <= daysInMonth; day++)
            {
                var date = new DateTime(year, month, day);
                if (date > DateTime.Today) continue;

                var dow = (int)date.DayOfWeek;
                // Skip Sundays
                if (dow == 0) continue;

                // Assign shifts randomly
                var shiftType = dow == 6 ? "Sang" : (rand.Next(3) switch
                {
                    0 => "Sang",
                    1 => "Chieu",
                    _ => "Dem"
                });

                shifts.Add(new DutyShiftItem
                {
                    StaffId = staff.Id,
                    StaffName = staff.FullName,
                    Title = staff.Title,
                    DepartmentId = staff.DepartmentId ?? Guid.Empty,
                    DepartmentName = staff.Department?.DepartmentName ?? "",
                    DayOfMonth = day,
                    ShiftType = shiftType
                });

                switch (shiftType)
                {
                    case "Sang": morning++; break;
                    case "Chieu": afternoon++; break;
                    case "Dem": night++; break;
                }
            }

            if (morning + afternoon + night > 0)
            {
                staffSummary.Add(new BranchStaffSummary
                {
                    StaffId = staff.Id,
                    StaffName = staff.FullName,
                    Title = staff.Title,
                    DepartmentId = staff.DepartmentId ?? Guid.Empty,
                    DepartmentName = staff.Department?.DepartmentName ?? "",
                    MorningShifts = morning,
                    AfternoonShifts = afternoon,
                    NightShifts = night,
                    TotalShifts = morning + afternoon + night
                });
            }
        }

        return new BranchDutyRosterDto
        {
            BranchId = branchId,
            BranchName = branchName,
            Year = year,
            Month = month,
            Shifts = shifts,
            StaffSummary = staffSummary,
            TotalShifts = shifts.Count,
            StaffCount = staffList.Count
        };
    }

    public async Task<List<BranchTreeDto>> GetBranchesByLevelAsync()
    {
        var branches = await _context.HospitalBranches
            .IgnoreQueryFilters()
            .Where(b => !b.IsDeleted && b.IsActive)
            .ToListAsync();

        return branches
            .OrderByDescending(b => b.IsHeadquarters)
            .ThenBy(b => b.BranchCode)
            .Select(b => new BranchTreeDto
            {
                Id = b.Id,
                BranchCode = b.BranchCode,
                BranchName = b.BranchName,
                Address = b.Address,
                PhoneNumber = b.PhoneNumber,
                BranchLevel = GetBranchLevelLabel(b),
                IsHeadquarters = b.IsHeadquarters,
                IsActive = b.IsActive,
                PatientCount = _context.Patients
                    .IgnoreQueryFilters()
                    .Count(p => !p.IsDeleted && p.BranchId == b.Id),
                StaffCount = _context.Users
                    .Count(u => u.IsActive && !u.IsDeleted && u.Department != null && u.Department.BranchId == b.Id),
                Children = new List<BranchTreeDto>()
            })
            .ToList();
    }

    private static string GetBranchLevelLabel(HospitalBranch branch)
    {
        if (branch.IsHeadquarters || branch.ParentBranchId == null)
            return "Tỉnh/Thành phố";
        if (branch.ChildBranches?.Any() == true)
            return "Huyện/Quận";
        return "Trạm Y tế";
    }
}
