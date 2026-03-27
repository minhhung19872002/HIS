namespace HIS.Application.Services;

// ============================================================
// Module 6: SchoolHealth (Y te truong hoc) - DTOs
// ============================================================

public class SchoolHealthListDto
{
    public Guid Id { get; set; }
    public string SchoolName { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string? StudentCode { get; set; }
    public string? Grade { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public DateTime ExamDate { get; set; }
    public float? Height { get; set; }
    public float? Weight { get; set; }
    public float? BMI { get; set; }
    public string? Vision { get; set; }
    public string? Hearing { get; set; }
    public string? DentalStatus { get; set; }
    public string? VaccinationStatus { get; set; }
    public string? Findings { get; set; }
    public bool HasReferral { get; set; }
    public string? DoctorName { get; set; }
    public int Status { get; set; }
}

public class SchoolHealthSearchDto2
{
    public string? Keyword { get; set; }
    public string? SchoolName { get; set; }
    public string? Grade { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public bool? HasReferral { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class CreateSchoolHealthDto2
{
    public string SchoolName { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string? StudentCode { get; set; }
    public string? Grade { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public DateTime ScreeningDate { get; set; }
    public float? Height { get; set; }
    public float? Weight { get; set; }
    public string? Vision { get; set; }
    public string? Hearing { get; set; }
    public string? DentalStatus { get; set; }
    public string? VaccinationStatus { get; set; }
    public string? Findings { get; set; }
    public string? Referral { get; set; }
    public Guid? DoctorId { get; set; }
    public string? Notes { get; set; }
}

public class SchoolHealthStatisticsDto2
{
    public int TotalRecords { get; set; }
    public int TotalSchools { get; set; }
    public int TotalStudents { get; set; }
    public int ReferralCount { get; set; }
    public double AverageBMI { get; set; }
    public int VisionIssues { get; set; }
    public int HearingIssues { get; set; }
    public int DentalIssues { get; set; }
    public List<SchoolBreakdownDto2> BySchool { get; set; } = new();
}

public class SchoolBreakdownDto2
{
    public string SchoolName { get; set; } = string.Empty;
    public int StudentCount { get; set; }
    public int ReferralCount { get; set; }
    public double AverageBMI { get; set; }
}

public class SchoolHealthPagedResult
{
    public List<SchoolHealthListDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

// ============================================================
// Module 7: OccupationalHealth (Y te nghe nghiep) - DTOs
// ============================================================

public class OccHealthListDto
{
    public Guid Id { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? EmployeeCode { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public DateTime ExamDate { get; set; }
    public string? ExamType { get; set; }
    public string? HazardExposure { get; set; }
    public string? Findings { get; set; }
    public string? Classification { get; set; }
    public string? OccupationalDisease { get; set; }
    public string? Recommendations { get; set; }
    public string? DoctorName { get; set; }
    public DateTime? NextExamDate { get; set; }
    public int Status { get; set; }
}

public class OccHealthSearchDto2
{
    public string? Keyword { get; set; }
    public string? CompanyName { get; set; }
    public string? ExamType { get; set; }
    public string? Classification { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class CreateOccHealthDto2
{
    public string EmployeeName { get; set; } = string.Empty;
    public string? EmployeeCode { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public DateTime ExaminationDate { get; set; }
    public string ExaminationType { get; set; } = string.Empty; // Periodic/PreEmployment/Special
    public string? HazardExposure { get; set; }
    public string? Findings { get; set; }
    public string? Classification { get; set; } // Fit/FitWithRestriction/Unfit/TemporarilyUnfit
    public string? OccupationalDisease { get; set; }
    public string? Recommendations { get; set; }
    public Guid? DoctorId { get; set; }
    public DateTime? NextExamDate { get; set; }
    public string? Notes { get; set; }
}

public class OccHealthStatisticsDto2
{
    public int TotalRecords { get; set; }
    public int TotalCompanies { get; set; }
    public int TotalEmployees { get; set; }
    public int FitCount { get; set; }
    public int FitWithRestrictionCount { get; set; }
    public int UnfitCount { get; set; }
    public int TemporarilyUnfitCount { get; set; }
    public int DiseaseDetectedCount { get; set; }
    public List<CompanyBreakdownDto2> ByCompany { get; set; } = new();
}

public class CompanyBreakdownDto2
{
    public string CompanyName { get; set; } = string.Empty;
    public int EmployeeCount { get; set; }
    public int FitCount { get; set; }
    public int DiseaseCount { get; set; }
}

public class OccHealthDiseaseReportDto
{
    public string DiseaseName { get; set; } = string.Empty;
    public string? IcdCode { get; set; }
    public int CaseCount { get; set; }
    public List<OccHealthListDto> Cases { get; set; } = new();
}

public class OccHealthPagedResult
{
    public List<OccHealthListDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

// ============================================================
// Module 8: MethadoneTreatment (Chuong trinh Methadone) - DTOs
// ============================================================

public class MethadoneListDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string? PatientCode { get; set; }
    public DateTime EnrollmentDate { get; set; }
    public float CurrentDoseMg { get; set; }
    public string? Phase { get; set; }
    public int Status { get; set; }
    public string? StatusName { get; set; }
    public DateTime? LastDosingDate { get; set; }
    public int MissedDoseCount { get; set; }
    public string? Notes { get; set; }
}

public class MethadoneSearchDto2
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public string? Phase { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class MethadoneDetailDto2
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string? PatientCode { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public DateTime EnrollmentDate { get; set; }
    public DateTime? DischargeDate { get; set; }
    public float CurrentDoseMg { get; set; }
    public string? Phase { get; set; }
    public int Status { get; set; }
    public string? StatusName { get; set; }
    public DateTime? LastDosingDate { get; set; }
    public int MissedDoseCount { get; set; }
    public string? TransferredFrom { get; set; }
    public string? TransferredTo { get; set; }
    public string? Notes { get; set; }
    public int TotalDoses { get; set; }
    public int TotalUrineTests { get; set; }
    public int PositiveUrineCount { get; set; }
}

public class CreateMethadoneDto2
{
    public Guid PatientId { get; set; }
    public DateTime EnrollmentDate { get; set; }
    public float CurrentDose { get; set; }
    public Guid? CounselorId { get; set; }
    public string? Notes { get; set; }
}

public class DoseRecordDto2
{
    public Guid Id { get; set; }
    public Guid MethadonePatientId { get; set; }
    public DateTime DoseDate { get; set; }
    public float DoseMg { get; set; }
    public string? AdministeredBy { get; set; }
    public string? WitnessedBy { get; set; }
    public bool MissedDose { get; set; }
    public int Status { get; set; }
    public string? Notes { get; set; }
}

public class CreateDoseRecordDto
{
    public Guid MethadonePatientId { get; set; }
    public DateTime DoseDate { get; set; }
    public float DoseMg { get; set; }
    public Guid? AdministeredById { get; set; }
    public string? WitnessedBy { get; set; }
    public bool MissedDose { get; set; }
    public string? Notes { get; set; }
}

public class ScreeningDto2
{
    public Guid Id { get; set; }
    public Guid MethadonePatientId { get; set; }
    public DateTime ScreeningDate { get; set; }
    public string? OverallResult { get; set; }
    public string? Morphine { get; set; }
    public string? Amphetamine { get; set; }
    public string? Methamphetamine { get; set; }
    public string? THC { get; set; }
    public string? Benzodiazepine { get; set; }
    public string? MethadoneResult { get; set; }
    public string? Notes { get; set; }
}

public class CreateScreeningDto
{
    public Guid MethadonePatientId { get; set; }
    public DateTime ScreeningDate { get; set; }
    public string? Morphine { get; set; }
    public string? Amphetamine { get; set; }
    public string? Methamphetamine { get; set; }
    public string? THC { get; set; }
    public string? Benzodiazepine { get; set; }
    public string? MethadoneResult { get; set; }
    public string? Notes { get; set; }
}

public class MethadoneDashboardDto2
{
    public int TotalActive { get; set; }
    public int TotalSuspended { get; set; }
    public int TotalCompleted { get; set; }
    public int TotalTransferred { get; set; }
    public int TotalDropped { get; set; }
    public int DosedToday { get; set; }
    public int MissedToday { get; set; }
    public float AverageDoseMg { get; set; }
    public int PositiveUrineThisMonth { get; set; }
    public int TotalUrineThisMonth { get; set; }
    public double PositiveRate { get; set; }
    public List<PhaseBreakdownDto2> ByPhase { get; set; } = new();
}

public class PhaseBreakdownDto2
{
    public string Phase { get; set; } = string.Empty;
    public int Count { get; set; }
    public float AverageDoseMg { get; set; }
}

public class MethadonePagedResult
{
    public List<MethadoneListDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

public class UpdateMethadoneStatusDto
{
    public int Status { get; set; }
    public string? Notes { get; set; }
}

// ============================================================
// Module 9: BhxhAudit (Kiem tra BHXH) - DTOs
// ============================================================

public class BhxhAuditSearchDto
{
    public string? Keyword { get; set; }
    public int? PeriodMonth { get; set; }
    public int? PeriodYear { get; set; }
    public int? Status { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class BhxhAuditListDto
{
    public Guid Id { get; set; }
    public string SessionCode { get; set; } = string.Empty;
    public int PeriodMonth { get; set; }
    public int PeriodYear { get; set; }
    public int TotalRecords { get; set; }
    public decimal TotalAmount { get; set; }
    public int ErrorCount { get; set; }
    public decimal ErrorAmount { get; set; }
    public int Status { get; set; }
    public string? StatusName { get; set; }
    public string? AuditorName { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class BhxhAuditDetailDto
{
    public Guid Id { get; set; }
    public string SessionCode { get; set; } = string.Empty;
    public int PeriodMonth { get; set; }
    public int PeriodYear { get; set; }
    public int TotalRecords { get; set; }
    public decimal TotalAmount { get; set; }
    public int ErrorCount { get; set; }
    public decimal ErrorAmount { get; set; }
    public int Status { get; set; }
    public string? StatusName { get; set; }
    public string? AuditorName { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<AuditErrorDto> Errors { get; set; } = new();
}

public class CreateAuditSessionDto
{
    public int PeriodMonth { get; set; }
    public int PeriodYear { get; set; }
    public string? Notes { get; set; }
}

public class AuditErrorDto
{
    public Guid Id { get; set; }
    public Guid AuditSessionId { get; set; }
    public Guid? RecordId { get; set; }
    public string? PatientName { get; set; }
    public string? InsuranceNumber { get; set; }
    public string ErrorType { get; set; } = string.Empty;
    public string? ErrorTypeName { get; set; }
    public string? ErrorDescription { get; set; }
    public decimal OriginalAmount { get; set; }
    public decimal AdjustedAmount { get; set; }
    public bool IsFixed { get; set; }
    public string? FixedBy { get; set; }
    public DateTime? FixedDate { get; set; }
    public string? Notes { get; set; }
}

public class FixAuditErrorDto
{
    public decimal AdjustedAmount { get; set; }
    public string? Notes { get; set; }
}

public class AuditDashboardDto
{
    public int TotalSessions { get; set; }
    public int CompletedSessions { get; set; }
    public int TotalErrors { get; set; }
    public int FixedErrors { get; set; }
    public decimal TotalErrorAmount { get; set; }
    public decimal FixedAmount { get; set; }
    public List<ErrorTypeBreakdownDto> ByErrorType { get; set; } = new();
    public List<MonthlyAuditDto> MonthlyTrend { get; set; } = new();
}

public class ErrorTypeBreakdownDto
{
    public string ErrorType { get; set; } = string.Empty;
    public string ErrorTypeName { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal TotalAmount { get; set; }
}

public class MonthlyAuditDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public int ErrorCount { get; set; }
    public decimal ErrorAmount { get; set; }
}

public class BhxhAuditPagedResult
{
    public List<BhxhAuditListDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

public class BhxhAuditStatisticsDto
{
    public int TotalSessionsThisYear { get; set; }
    public int TotalErrorsThisYear { get; set; }
    public decimal TotalErrorAmountThisYear { get; set; }
    public double FixRate { get; set; }
    public double ErrorRate { get; set; }
    public string? MostCommonErrorType { get; set; }
    public List<MonthlyAuditDto> MonthlyStats { get; set; } = new();
}
