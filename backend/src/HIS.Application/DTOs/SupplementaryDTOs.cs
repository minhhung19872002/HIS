namespace HIS.Application.Services;

// ============================================================
// Module 1: FollowUp DTOs
// ============================================================

public class FollowUpSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; } // 0=Scheduled, 1=Completed, 2=Missed, 3=Cancelled
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 20;
}

public class FollowUpListDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public string? PatientPhone { get; set; }
    public Guid? ExaminationId { get; set; }
    public DateTime ScheduledDate { get; set; }
    public DateTime? ActualDate { get; set; }
    public int Status { get; set; }
    public string? StatusName { get; set; }
    public bool ReminderSent { get; set; }
    public string? Notes { get; set; }
    public string? Reason { get; set; }
    public string? Diagnosis { get; set; }
    public Guid? DoctorId { get; set; }
    public string? DoctorName { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateFollowUpDto
{
    public Guid PatientId { get; set; }
    public Guid? ExaminationId { get; set; }
    public DateTime ScheduledDate { get; set; }
    public string? Notes { get; set; }
    public string? Reason { get; set; }
    public string? Diagnosis { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public int? ReminderDaysBefore { get; set; }
}

public class UpdateFollowUpDto
{
    public int Status { get; set; }
    public DateTime? ActualDate { get; set; }
    public string? Notes { get; set; }
}

public class FollowUpPagedResult
{
    public List<FollowUpListDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

// ============================================================
// Module 2: Procurement DTOs
// ============================================================

public class ProcurementSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public Guid? DepartmentId { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 20;
}

public class ProcurementListDto
{
    public Guid Id { get; set; }
    public string RequestCode { get; set; } = string.Empty;
    public DateTime RequestDate { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? RequestedByName { get; set; }
    public int Status { get; set; }
    public string? StatusName { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedDate { get; set; }
    public int ItemCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProcurementDetailDto : ProcurementListDto
{
    public string? RejectReason { get; set; }
    public List<ProcurementRequestItemDto> Items { get; set; } = new();
}

public class ProcurementRequestItemDto
{
    public Guid Id { get; set; }
    public Guid? ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string? ItemCode { get; set; }
    public string? Unit { get; set; }
    public int RequestedQuantity { get; set; }
    public int CurrentStock { get; set; }
    public int MinimumStock { get; set; }
    public decimal EstimatedPrice { get; set; }
    public string? Notes { get; set; }
    public string? Specification { get; set; }
}

public class CreateProcurementDto
{
    public Guid? DepartmentId { get; set; }
    public string? Notes { get; set; }
    public List<CreateProcurementItemDto> Items { get; set; } = new();
}

public class CreateProcurementItemDto
{
    public Guid? ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string? ItemCode { get; set; }
    public string? Unit { get; set; }
    public int RequestedQuantity { get; set; }
    public decimal EstimatedPrice { get; set; }
    public string? Notes { get; set; }
    public string? Specification { get; set; }
}

public class AutoSuggestionDto
{
    public Guid ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string? ItemCode { get; set; }
    public string? Unit { get; set; }
    public int CurrentStock { get; set; }
    public int MinimumStock { get; set; }
    public int SuggestedQuantity { get; set; }
    public decimal? LastPrice { get; set; }
}

public class ProcurementStatisticsDto
{
    public int TotalRequests { get; set; }
    public int DraftCount { get; set; }
    public int PendingCount { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }
    public decimal TotalApprovedAmount { get; set; }
    public decimal TotalPendingAmount { get; set; }
}

public class ProcurementPagedResult
{
    public List<ProcurementListDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

// ============================================================
// Module 3: Immunization DTOs
// ============================================================

public class ImmunizationSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public Guid? PatientId { get; set; }
    public string? VaccineName { get; set; }
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 20;
}

public class ImmunizationListDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public int? PatientAge { get; set; }
    public string VaccineName { get; set; } = string.Empty;
    public string? VaccineCode { get; set; }
    public string? LotNumber { get; set; }
    public string? Manufacturer { get; set; }
    public int DoseNumber { get; set; }
    public DateTime VaccinationDate { get; set; }
    public string? InjectionSite { get; set; }
    public string? Route { get; set; }
    public DateTime? NextDoseDate { get; set; }
    public string? AefiReport { get; set; }
    public int? AefiSeverity { get; set; }
    public int Status { get; set; }
    public string? StatusName { get; set; }
    public string? AdministeredBy { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateImmunizationDto
{
    public Guid PatientId { get; set; }
    public string VaccineName { get; set; } = string.Empty;
    public string? VaccineCode { get; set; }
    public string? LotNumber { get; set; }
    public string? Manufacturer { get; set; }
    public int DoseNumber { get; set; }
    public DateTime VaccinationDate { get; set; }
    public string? InjectionSite { get; set; }
    public string? Route { get; set; }
    public float? DoseMl { get; set; }
    public DateTime? NextDoseDate { get; set; }
    public string? Notes { get; set; }
}

public class RecordReactionDto
{
    public string? AefiReport { get; set; }
    public int AefiSeverity { get; set; } // 0=None, 1=Mild, 2=Moderate, 3=Severe
    public string? Notes { get; set; }
}

public class ImmunizationScheduleDto
{
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public List<ImmunizationScheduleItemDto> ScheduleItems { get; set; } = new();
}

public class ImmunizationScheduleItemDto
{
    public string VaccineName { get; set; } = string.Empty;
    public int DoseNumber { get; set; }
    public DateTime? ScheduledDate { get; set; }
    public DateTime? ActualDate { get; set; }
    public int Status { get; set; } // 0=Scheduled, 1=Completed, 2=Missed, 3=Contraindicated
    public string? StatusName { get; set; }
}

public class ImmunizationStatisticsDto
{
    public int TotalRecords { get; set; }
    public int CompletedCount { get; set; }
    public int ScheduledCount { get; set; }
    public int MissedCount { get; set; }
    public int AefiCount { get; set; }
    public List<VaccineCountDto> ByVaccine { get; set; } = new();
}

public class VaccineCountDto
{
    public string VaccineName { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class ImmunizationPagedResult
{
    public List<ImmunizationListDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

// ============================================================
// Module 4: HealthCheckup DTOs
// ============================================================

public class CampaignSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 20;
}

public class CampaignListDto
{
    public Guid Id { get; set; }
    public string CampaignCode { get; set; } = string.Empty;
    public string CampaignName { get; set; } = string.Empty;
    public string? OrganizationName { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int Status { get; set; }
    public string? StatusName { get; set; }
    public int TotalRegistered { get; set; }
    public int TotalCompleted { get; set; }
    public decimal CompletionRate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateCampaignDto
{
    public string CampaignName { get; set; } = string.Empty;
    public string? OrganizationName { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Notes { get; set; }
    public string? PackageDescription { get; set; }
    public decimal? ContractAmount { get; set; }
}

public class CheckupRecordDto
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string? CampaignName { get; set; }
    public Guid? PatientId { get; set; }
    public string? EmployeeName { get; set; }
    public string? EmployeeCode { get; set; }
    public string? Department { get; set; }
    public DateTime? CheckupDate { get; set; }
    public string? ResultSummary { get; set; }
    public bool CertificateIssued { get; set; }
    public string? CertificateNumber { get; set; }
    public string? Classification { get; set; }
    public string? DoctorName { get; set; }
    public string? Notes { get; set; }
    public string? BloodPressure { get; set; }
    public float? Height { get; set; }
    public float? Weight { get; set; }
    public float? BMI { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateCheckupRecordDto
{
    public Guid CampaignId { get; set; }
    public Guid? PatientId { get; set; }
    public string? EmployeeName { get; set; }
    public string? EmployeeCode { get; set; }
    public string? Department { get; set; }
    public DateTime? CheckupDate { get; set; }
    public string? ResultSummary { get; set; }
    public string? Classification { get; set; }
    public Guid? DoctorId { get; set; }
    public string? Notes { get; set; }
    public string? BloodPressure { get; set; }
    public float? Height { get; set; }
    public float? Weight { get; set; }
}

public class CheckupStatisticsDto
{
    public int TotalCampaigns { get; set; }
    public int ActiveCampaigns { get; set; }
    public int TotalRecords { get; set; }
    public int CertificatesIssued { get; set; }
    public Dictionary<string, int> ByClassification { get; set; } = new();
}

public class CampaignPagedResult
{
    public List<CampaignListDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

public class CheckupDashboardDto
{
    public int TotalCampaigns { get; set; }
    public int ActiveCampaigns { get; set; }
    public int TotalRecordsThisMonth { get; set; }
    public int CertificatesIssuedThisMonth { get; set; }
    public List<CampaignListDto> RecentCampaigns { get; set; } = new();
}

// Group management DTOs
public class CampaignGroupDto
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public string? RoomAssignment { get; set; }
    public int TotalMembers { get; set; }
    public int CompletedMembers { get; set; }
}

public class CreateCampaignGroupDto
{
    public Guid CampaignId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public string? RoomAssignment { get; set; }
}

public class BatchImportResultDto
{
    public int TotalRows { get; set; }
    public int SuccessCount { get; set; }
    public int ErrorCount { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class CampaignCostReportDto
{
    public Guid CampaignId { get; set; }
    public string CampaignName { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public int TotalPatients { get; set; }
    public decimal TotalServiceCost { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal NetAmount { get; set; }
    public List<CostBreakdownItem> CostBreakdown { get; set; } = new();
}

public class CostBreakdownItem
{
    public string ServiceName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalAmount { get; set; }
}

// ============================================================
// Module 5: Epidemiology DTOs
// ============================================================

public class DiseaseCaseSearchDto
{
    public string? Keyword { get; set; }
    public int? Classification { get; set; } // 0=Suspected, 1=Probable, 2=Confirmed
    public int? Outcome { get; set; }
    public string? DiseaseName { get; set; }
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public bool? IsOutbreak { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 20;
}

public class DiseaseCaseListDto
{
    public Guid Id { get; set; }
    public Guid? PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public int? PatientAge { get; set; }
    public int? PatientGender { get; set; }
    public string DiseaseName { get; set; } = string.Empty;
    public string? IcdCode { get; set; }
    public DateTime? OnsetDate { get; set; }
    public DateTime ReportDate { get; set; }
    public int Classification { get; set; }
    public string? ClassificationName { get; set; }
    public int Outcome { get; set; }
    public string? OutcomeName { get; set; }
    public string? InvestigatorName { get; set; }
    public string? Location { get; set; }
    public bool IsOutbreak { get; set; }
    public string? OutbreakId { get; set; }
    public int ContactCount { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateDiseaseCaseDto
{
    public Guid? PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public int? PatientAge { get; set; }
    public int? PatientGender { get; set; }
    public string DiseaseName { get; set; } = string.Empty;
    public string? IcdCode { get; set; }
    public DateTime? OnsetDate { get; set; }
    public DateTime ReportDate { get; set; }
    public int Classification { get; set; }
    public int Outcome { get; set; }
    public Guid? InvestigatorId { get; set; }
    public string? Location { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public bool IsOutbreak { get; set; }
    public string? OutbreakId { get; set; }
}

public class UpdateDiseaseCaseDto
{
    public int? Classification { get; set; }
    public int? Outcome { get; set; }
    public string? LabTestResult { get; set; }
    public DateTime? LabTestDate { get; set; }
    public string? TreatmentSummary { get; set; }
    public string? Notes { get; set; }
    public bool? IsOutbreak { get; set; }
    public string? OutbreakId { get; set; }
}

public class ContactTraceDto
{
    public Guid Id { get; set; }
    public Guid DiseaseCaseId { get; set; }
    public string ContactName { get; set; } = string.Empty;
    public string? ContactPhone { get; set; }
    public string? Relationship { get; set; }
    public DateTime? ExposureDate { get; set; }
    public string? ExposureType { get; set; }
    public int QuarantineStatus { get; set; }
    public string? QuarantineStatusName { get; set; }
    public string? TestResult { get; set; }
    public DateTime? TestDate { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public bool IsSymptomDeveloped { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateContactTraceDto
{
    public string ContactName { get; set; } = string.Empty;
    public string? ContactPhone { get; set; }
    public string? Relationship { get; set; }
    public DateTime? ExposureDate { get; set; }
    public string? ExposureType { get; set; }
    public int QuarantineStatus { get; set; }
    public string? TestResult { get; set; }
    public DateTime? TestDate { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
}

public class EpidemiologyDashboardDto
{
    public int TotalCases { get; set; }
    public int SuspectedCases { get; set; }
    public int ConfirmedCases { get; set; }
    public int ActiveOutbreaks { get; set; }
    public int TotalDeaths { get; set; }
    public int CasesThisWeek { get; set; }
    public int CasesThisMonth { get; set; }
    public List<DiseaseCountDto> ByDisease { get; set; } = new();
    public List<OutbreakSummaryDto> ActiveOutbreakList { get; set; } = new();
}

public class DiseaseCountDto
{
    public string DiseaseName { get; set; } = string.Empty;
    public int TotalCases { get; set; }
    public int ConfirmedCases { get; set; }
    public int Deaths { get; set; }
}

public class OutbreakSummaryDto
{
    public string? OutbreakId { get; set; }
    public string? DiseaseName { get; set; }
    public string? Location { get; set; }
    public int CaseCount { get; set; }
    public DateTime? FirstCaseDate { get; set; }
    public DateTime? LatestCaseDate { get; set; }
}

public class DiseaseCasePagedResult
{
    public List<DiseaseCaseListDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}
