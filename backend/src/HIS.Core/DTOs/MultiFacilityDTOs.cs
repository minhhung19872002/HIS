namespace HIS.Core.DTOs;

// ==================== NangCap21 - HIS Đám Mây 3 Cấp ====================

/// <summary>
/// Tổng hợp dashboard đa chi nhánh (Trạm YT → Huyện → Tỉnh)
/// </summary>
public class MultiFacilityDashboardDto
{
    public Guid? BranchId { get; set; }
    public string? BranchName { get; set; }
    public string? BranchLevel { get; set; } // "Trạm YT", "Huyện", "Tỉnh"
    public DateTime ReportDate { get; set; }

    // KPIs
    public int TodayOutpatients { get; set; }
    public int TodayEmergency { get; set; }
    public int TodayAdmissions { get; set; }
    public int TodayDischarges { get; set; }
    public decimal TodayRevenue { get; set; }
    public int CurrentInpatients { get; set; }
    public int AvailableBeds { get; set; }
    public int Surgeries { get; set; }

    // 7-day trend
    public List<DailyTrendItem> WeeklyTrends { get; set; } = new();

    // By department
    public List<BranchDepartmentStat> DepartmentStats { get; set; } = new();

    // By patient type
    public PatientTypeBreakdown PatientTypes { get; set; } = new();

    // Sub-branches summary
    public List<BranchSummary> SubBranches { get; set; } = new();
}

public class DailyTrendItem
{
    public DateTime Date { get; set; }
    public int Outpatients { get; set; }
    public int Inpatients { get; set; }
    public decimal Revenue { get; set; }
    public int Admissions { get; set; }
    public int Discharges { get; set; }
}

public class BranchDepartmentStat
{
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int OutpatientCount { get; set; }
    public int AdmissionCount { get; set; }
    public decimal Revenue { get; set; }
}

public class PatientTypeBreakdown
{
    public int Insurance { get; set; }      // BHYT
    public int General { get; set; }        // Khám bệnh thường
    public int Emergency { get; set; }     // Cấp cứu
    public int Free { get; set; }          // Miễn phí
    public int Other { get; set; }          // Khác
}

public class BranchSummary
{
    public Guid BranchId { get; set; }
    public string BranchCode { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public string BranchLevel { get; set; } = string.Empty;
    public int Outpatients { get; set; }
    public int Inpatients { get; set; }
    public decimal Revenue { get; set; }
    public int SubBranchCount { get; set; }
}

/// <summary>
/// Báo cáo tổng hợp 3 cấp
/// </summary>
public class ConsolidatedReportDto
{
    public Guid? RootBranchId { get; set; }
    public string ReportType { get; set; } = string.Empty; // patient, revenue, service, department
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    // Summary
    public int TotalPatients { get; set; }
    public decimal TotalRevenue { get; set; }
    public int TotalVisits { get; set; }
    public int TotalAdmissions { get; set; }

    // By branch
    public List<BranchReportItem> BranchItems { get; set; } = new();

    // Chart data
    public List<ChartDataPoint> ChartData { get; set; } = new();
}

public class BranchReportItem
{
    public Guid BranchId { get; set; }
    public string BranchCode { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public string BranchLevel { get; set; } = string.Empty;
    public int PatientCount { get; set; }
    public int VisitCount { get; set; }
    public int AdmissionCount { get; set; }
    public decimal Revenue { get; set; }
    public decimal RevenuePercentage { get; set; }
    public int SubBranchCount { get; set; }
}

public class ChartDataPoint
{
    public string Label { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public string? Category { get; set; }
}

/// <summary>
/// Lịch trực theo chi nhánh (NangCap21)
/// </summary>
public class BranchDutyRosterDto
{
    public Guid? BranchId { get; set; }
    public string? BranchName { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }

    public List<DutyShiftItem> Shifts { get; set; } = new();
    public List<BranchStaffSummary> StaffSummary { get; set; } = new();
    public int TotalShifts { get; set; }
    public int StaffCount { get; set; }
}

public class DutyShiftItem
{
    public Guid StaffId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public string? Title { get; set; }
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int DayOfMonth { get; set; }
    public string ShiftType { get; set; } = string.Empty; // Sang, Chieu, Dem
    public string? Notes { get; set; }
}

public class BranchStaffSummary
{
    public Guid StaffId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public string? Title { get; set; }
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int MorningShifts { get; set; }
    public int AfternoonShifts { get; set; }
    public int NightShifts { get; set; }
    public int TotalShifts { get; set; }
}

/// <summary>
/// Tree view chi nhánh đầy đủ
/// </summary>
public class BranchTreeDto
{
    public Guid Id { get; set; }
    public string BranchCode { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public string BranchLevel { get; set; } = string.Empty; // Computed
    public bool IsHeadquarters { get; set; }
    public bool IsActive { get; set; }
    public int PatientCount { get; set; }
    public int StaffCount { get; set; }
    public decimal TodayRevenue { get; set; }
    public List<BranchTreeDto> Children { get; set; } = new();
}

/// <summary>
/// Search filter cho multi-facility
/// </summary>
public class MultiFacilitySearchDto
{
    public Guid? BranchId { get; set; }          // Chi nhánh hiện tại
    public bool IncludeSubBranches { get; set; } // Bao gồm chi nhánh con?
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
