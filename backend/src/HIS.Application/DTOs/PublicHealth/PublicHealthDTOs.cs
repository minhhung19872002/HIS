namespace HIS.Application.DTOs;

// =====================================================================
// HEALTH CHECKUP (Khám sức khỏe)
// =====================================================================

public class HealthCheckupSearchDto
{
    public string? Keyword { get; set; }
    public string? CheckupType { get; set; }
    public int? Status { get; set; }
    public string? BatchCode { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 20;
}

public class HealthCheckupDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public string CheckupType { get; set; } = string.Empty;
    public string FormCode { get; set; } = string.Empty;
    public string? BatchCode { get; set; }
    public string? OrganizationName { get; set; }
    public int Status { get; set; }
    public string? ExamResult { get; set; }
    public string? Classification { get; set; }
    public string? GeneralConclusion { get; set; }
    public float? Height { get; set; }
    public float? Weight { get; set; }
    public float? BMI { get; set; }
    public string? BloodPressure { get; set; }
    public float? HeartRate { get; set; }
    public string? DoctorName { get; set; }
    public string? ExamDate { get; set; }
    public string? CertificateNumber { get; set; }
    public string? Notes { get; set; }
}

public class HealthCheckupDetailDto : HealthCheckupDto
{
    public string? InternalMedicine { get; set; }
    public string? Surgery { get; set; }
    public string? Ophthalmology { get; set; }
    public string? ENT { get; set; }
    public string? Dental { get; set; }
    public string? Dermatology { get; set; }
    public string? Gynecology { get; set; }
    public string? Psychiatry { get; set; }
    public string? BloodType { get; set; }
    public string? VisionLeft { get; set; }
    public string? VisionRight { get; set; }
    public string? HearingLeft { get; set; }
    public string? HearingRight { get; set; }
    public string? LabResults { get; set; }
    public string? XrayResult { get; set; }
    public string? CertificateDate { get; set; }
    // Driver-specific
    public string? DriverLicenseClass { get; set; }
    public string? DriverReactionTest { get; set; }
    public string? DriverColorVision { get; set; }
    // Child-specific
    public int? AgeMonths { get; set; }
    public string? DevelopmentAssessment { get; set; }
    public string? NutritionStatus { get; set; }
    public string? VaccinationStatus { get; set; }
}

public class CreateHealthCheckupDto
{
    public Guid PatientId { get; set; }
    public string CheckupType { get; set; } = string.Empty;
    public string FormCode { get; set; } = string.Empty;
    public string? BatchCode { get; set; }
    public string? OrganizationName { get; set; }
    public string? ExamDate { get; set; }
    public string? DoctorName { get; set; }
    public string? Notes { get; set; }
}

public class UpdateHealthCheckupDto
{
    public int? Status { get; set; }
    public string? ExamResult { get; set; }
    public string? Classification { get; set; }
    public string? GeneralConclusion { get; set; }
    public string? InternalMedicine { get; set; }
    public string? Surgery { get; set; }
    public string? Ophthalmology { get; set; }
    public string? ENT { get; set; }
    public string? Dental { get; set; }
    public string? Dermatology { get; set; }
    public string? Gynecology { get; set; }
    public string? Psychiatry { get; set; }
    public float? Height { get; set; }
    public float? Weight { get; set; }
    public string? BloodPressure { get; set; }
    public float? HeartRate { get; set; }
    public string? BloodType { get; set; }
    public string? VisionLeft { get; set; }
    public string? VisionRight { get; set; }
    public string? HearingLeft { get; set; }
    public string? HearingRight { get; set; }
    public string? LabResults { get; set; }
    public string? XrayResult { get; set; }
    public string? CertificateNumber { get; set; }
    public string? CertificateDate { get; set; }
    public string? DoctorName { get; set; }
    public string? Notes { get; set; }
    // Driver-specific
    public string? DriverLicenseClass { get; set; }
    public string? DriverReactionTest { get; set; }
    public string? DriverColorVision { get; set; }
    // Child-specific
    public int? AgeMonths { get; set; }
    public string? DevelopmentAssessment { get; set; }
    public string? NutritionStatus { get; set; }
    public string? VaccinationStatus { get; set; }
}

public class HealthCheckupStatsDto
{
    public int TotalCheckups { get; set; }
    public int PendingCount { get; set; }
    public int CompletedCount { get; set; }
    public int CancelledCount { get; set; }
    public List<CheckupTypeBreakdownDto> TypeBreakdown { get; set; } = new();
    public List<ClassificationBreakdownDto> ClassificationBreakdown { get; set; } = new();
}

public class CheckupTypeBreakdownDto
{
    public string Type { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class ClassificationBreakdownDto
{
    public string Classification { get; set; } = string.Empty;
    public int Count { get; set; }
}

// =====================================================================
// VACCINATION (Tiêm chủng)
// =====================================================================

public class VaccinationSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public string? VaccineName { get; set; }
    public string? CampaignCode { get; set; }
    public bool? IsEPI { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 20;
}

public class VaccinationRecordDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public string VaccineName { get; set; } = string.Empty;
    public string? VaccineCode { get; set; }
    public string? LotNumber { get; set; }
    public string? Manufacturer { get; set; }
    public string VaccinationDate { get; set; } = string.Empty;
    public int DoseNumber { get; set; }
    public string? InjectionSite { get; set; }
    public string? Route { get; set; }
    public float? DoseMl { get; set; }
    public string? AdministeredBy { get; set; }
    public string? FacilityName { get; set; }
    public int Status { get; set; }
    public string? AefiReport { get; set; }
    public int? AefiSeverity { get; set; }
    public string? NextDoseDate { get; set; }
    public string? CampaignCode { get; set; }
    public string? Notes { get; set; }
    public bool IsEPI { get; set; }
}

public class CreateVaccinationRecordDto
{
    public Guid PatientId { get; set; }
    public string VaccineName { get; set; } = string.Empty;
    public string? VaccineCode { get; set; }
    public string? LotNumber { get; set; }
    public string? Manufacturer { get; set; }
    public string? VaccinationDate { get; set; }
    public int DoseNumber { get; set; } = 1;
    public string? InjectionSite { get; set; }
    public string? Route { get; set; }
    public float? DoseMl { get; set; }
    public string? AdministeredBy { get; set; }
    public string? FacilityName { get; set; }
    public string? NextDoseDate { get; set; }
    public string? CampaignCode { get; set; }
    public bool IsEPI { get; set; }
    public string? Notes { get; set; }
}

public class UpdateVaccinationRecordDto
{
    public int? Status { get; set; }
    public string? AefiReport { get; set; }
    public int? AefiSeverity { get; set; }
    public string? NextDoseDate { get; set; }
    public string? Notes { get; set; }
}

public class VaccinationCampaignDto
{
    public Guid Id { get; set; }
    public string CampaignCode { get; set; } = string.Empty;
    public string CampaignName { get; set; } = string.Empty;
    public string VaccineName { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public string? TargetGroup { get; set; }
    public int TargetCount { get; set; }
    public int CompletedCount { get; set; }
    public int Status { get; set; }
    public string? Description { get; set; }
    public string? Areas { get; set; }
    public double CompletionRate => TargetCount > 0 ? Math.Round((double)CompletedCount / TargetCount * 100, 1) : 0;
}

public class CreateVaccinationCampaignDto
{
    public string CampaignCode { get; set; } = string.Empty;
    public string CampaignName { get; set; } = string.Empty;
    public string VaccineName { get; set; } = string.Empty;
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string? TargetGroup { get; set; }
    public int TargetCount { get; set; }
    public string? Description { get; set; }
    public string? Areas { get; set; }
}

public class VaccinationScheduleDto
{
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string VaccineName { get; set; } = string.Empty;
    public int DoseNumber { get; set; }
    public string? ScheduledDate { get; set; }
    public int Status { get; set; } // 0=Scheduled, 2=Missed
}

public class VaccinationStatsDto
{
    public int TotalRecords { get; set; }
    public int CompletedCount { get; set; }
    public int ScheduledCount { get; set; }
    public int MissedCount { get; set; }
    public int AefiCount { get; set; }
    public int EPICount { get; set; }
    public int ActiveCampaigns { get; set; }
    public List<VaccineBreakdownDto> VaccineBreakdown { get; set; } = new();
}

public class VaccineBreakdownDto
{
    public string VaccineName { get; set; } = string.Empty;
    public int Count { get; set; }
}

// =====================================================================
// DISEASE SURVEILLANCE (Giám sát dịch tễ)
// =====================================================================

public class DiseaseReportSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public string? DiseaseGroup { get; set; }
    public bool? IsNotifiable { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 20;
}

public class DiseaseReportDto
{
    public Guid Id { get; set; }
    public Guid? PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string? PatientAge { get; set; }
    public string? PatientGender { get; set; }
    public string? PatientAddress { get; set; }
    public string DiseaseCode { get; set; } = string.Empty;
    public string DiseaseName { get; set; } = string.Empty;
    public string? DiseaseGroup { get; set; }
    public string OnsetDate { get; set; } = string.Empty;
    public string ReportDate { get; set; } = string.Empty;
    public string? DiagnosisDate { get; set; }
    public string? ReportedBy { get; set; }
    public string? FacilityName { get; set; }
    public int Status { get; set; }
    public bool IsNotifiable { get; set; }
    public string? Outcome { get; set; }
    public string? QuarantineStatus { get; set; }
    public int ContactCount { get; set; }
    public string? Notes { get; set; }
}

public class DiseaseReportDetailDto : DiseaseReportDto
{
    public string? ContactTracingNotes { get; set; }
    public string? TravelHistory { get; set; }
    public string? ExposureSource { get; set; }
    public string? LabConfirmation { get; set; }
}

public class CreateDiseaseReportDto
{
    public Guid? PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string? PatientAge { get; set; }
    public string? PatientGender { get; set; }
    public string? PatientAddress { get; set; }
    public string DiseaseCode { get; set; } = string.Empty;
    public string DiseaseName { get; set; } = string.Empty;
    public string? DiseaseGroup { get; set; }
    public string? OnsetDate { get; set; }
    public bool IsNotifiable { get; set; }
    public string? ReportedBy { get; set; }
    public string? FacilityName { get; set; }
    public string? Notes { get; set; }
}

public class UpdateDiseaseReportDto
{
    public int? Status { get; set; }
    public string? Outcome { get; set; }
    public string? QuarantineStatus { get; set; }
    public string? ContactTracingNotes { get; set; }
    public int? ContactCount { get; set; }
    public string? TravelHistory { get; set; }
    public string? ExposureSource { get; set; }
    public string? LabConfirmation { get; set; }
    public string? DiagnosisDate { get; set; }
    public string? Notes { get; set; }
}

public class OutbreakEventDto
{
    public Guid Id { get; set; }
    public string OutbreakCode { get; set; } = string.Empty;
    public string DiseaseName { get; set; } = string.Empty;
    public string? DiseaseCode { get; set; }
    public string DetectedDate { get; set; } = string.Empty;
    public string? ResolvedDate { get; set; }
    public string? Location { get; set; }
    public string? AffectedArea { get; set; }
    public int CaseCount { get; set; }
    public int DeathCount { get; set; }
    public int Status { get; set; }
    public string? ResponseActions { get; set; }
    public string? RiskLevel { get; set; }
    public string? Notes { get; set; }
}

public class CreateOutbreakEventDto
{
    public string OutbreakCode { get; set; } = string.Empty;
    public string DiseaseName { get; set; } = string.Empty;
    public string? DiseaseCode { get; set; }
    public string? DetectedDate { get; set; }
    public string? Location { get; set; }
    public string? AffectedArea { get; set; }
    public string? RiskLevel { get; set; }
    public string? Notes { get; set; }
}

public class UpdateOutbreakEventDto
{
    public int? Status { get; set; }
    public int? CaseCount { get; set; }
    public int? DeathCount { get; set; }
    public string? ResponseActions { get; set; }
    public string? RiskLevel { get; set; }
    public string? ResolvedDate { get; set; }
    public string? Notes { get; set; }
}

public class DiseaseStatsDto
{
    public int TotalReports { get; set; }
    public int ActiveInvestigations { get; set; }
    public int ConfirmedCases { get; set; }
    public int NotifiableCases { get; set; }
    public int ActiveOutbreaks { get; set; }
    public int TotalDeaths { get; set; }
    public List<DiseaseGroupBreakdownDto> GroupBreakdown { get; set; } = new();
}

public class DiseaseGroupBreakdownDto
{
    public string Group { get; set; } = string.Empty;
    public int Count { get; set; }
}

// =====================================================================
// SCHOOL HEALTH (Y tế trường học)
// =====================================================================

public class SchoolHealthSearchDto
{
    public string? Keyword { get; set; }
    public string? SchoolName { get; set; }
    public string? AcademicYear { get; set; }
    public string? GradeLevel { get; set; }
    public int? Status { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 20;
}

public class SchoolHealthExamDto
{
    public Guid Id { get; set; }
    public string SchoolName { get; set; } = string.Empty;
    public string? SchoolCode { get; set; }
    public string AcademicYear { get; set; } = string.Empty;
    public string? GradeLevel { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string? StudentCode { get; set; }
    public string? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string ExamDate { get; set; } = string.Empty;
    public float? Height { get; set; }
    public float? Weight { get; set; }
    public float? BMI { get; set; }
    public string? NutritionStatus { get; set; }
    public string? VisionLeft { get; set; }
    public string? VisionRight { get; set; }
    public bool? HasVisionProblem { get; set; }
    public string? HearingResult { get; set; }
    public string? DentalResult { get; set; }
    public int? DentalCavityCount { get; set; }
    public string? SpineResult { get; set; }
    public string? SkinResult { get; set; }
    public string? HeartLungResult { get; set; }
    public string? MentalHealthResult { get; set; }
    public string? OverallResult { get; set; }
    public string? Recommendations { get; set; }
    public string? DoctorName { get; set; }
    public string? Notes { get; set; }
    public int Status { get; set; }
}

public class CreateSchoolHealthExamDto
{
    public string SchoolName { get; set; } = string.Empty;
    public string? SchoolCode { get; set; }
    public string AcademicYear { get; set; } = string.Empty;
    public string? GradeLevel { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string? StudentCode { get; set; }
    public string? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? ExamDate { get; set; }
    public string? DoctorName { get; set; }
    public string? Notes { get; set; }
}

public class UpdateSchoolHealthExamDto
{
    public int? Status { get; set; }
    public float? Height { get; set; }
    public float? Weight { get; set; }
    public string? NutritionStatus { get; set; }
    public string? VisionLeft { get; set; }
    public string? VisionRight { get; set; }
    public bool? HasVisionProblem { get; set; }
    public string? HearingResult { get; set; }
    public string? DentalResult { get; set; }
    public int? DentalCavityCount { get; set; }
    public string? SpineResult { get; set; }
    public string? SkinResult { get; set; }
    public string? HeartLungResult { get; set; }
    public string? MentalHealthResult { get; set; }
    public string? OverallResult { get; set; }
    public string? Recommendations { get; set; }
    public string? DoctorName { get; set; }
    public string? Notes { get; set; }
}

public class SchoolHealthStatsDto
{
    public int TotalExams { get; set; }
    public int PendingCount { get; set; }
    public int CompletedCount { get; set; }
    public int VisionProblemCount { get; set; }
    public int DentalProblemCount { get; set; }
    public int MalnutritionCount { get; set; }
    public int OverweightCount { get; set; }
    public List<SchoolBreakdownDto> SchoolBreakdown { get; set; } = new();
}

public class SchoolBreakdownDto
{
    public string SchoolName { get; set; } = string.Empty;
    public int ExamCount { get; set; }
    public int CompletedCount { get; set; }
}

// =====================================================================
// OCCUPATIONAL HEALTH (Sức khỏe nghề nghiệp)
// =====================================================================

public class OccupationalHealthSearchDto
{
    public string? Keyword { get; set; }
    public string? CompanyName { get; set; }
    public string? ExamType { get; set; }
    public int? Status { get; set; }
    public string? HazardExposure { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 20;
}

public class OccupationalHealthExamDto
{
    public Guid Id { get; set; }
    public Guid? PatientId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? EmployeeCode { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? CompanyTaxCode { get; set; }
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public string? HazardExposure { get; set; }
    public int ExposureYears { get; set; }
    public string ExamDate { get; set; } = string.Empty;
    public string ExamType { get; set; } = string.Empty;
    public string? GeneralHealth { get; set; }
    public string? RespiratoryResult { get; set; }
    public string? HearingResult { get; set; }
    public string? VisionResult { get; set; }
    public string? SkinResult { get; set; }
    public string? LabResults { get; set; }
    public string? XrayResult { get; set; }
    public string? OccupationalDisease { get; set; }
    public string? DiseaseCode { get; set; }
    public string? Classification { get; set; }
    public string? Recommendations { get; set; }
    public string? DoctorName { get; set; }
    public int Status { get; set; }
    public string? Notes { get; set; }
}

public class CreateOccupationalHealthExamDto
{
    public Guid? PatientId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? EmployeeCode { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? CompanyTaxCode { get; set; }
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public string? HazardExposure { get; set; }
    public int ExposureYears { get; set; }
    public string ExamType { get; set; } = string.Empty;
    public string? ExamDate { get; set; }
    public string? DoctorName { get; set; }
    public string? Notes { get; set; }
}

public class UpdateOccupationalHealthExamDto
{
    public int? Status { get; set; }
    public string? GeneralHealth { get; set; }
    public string? RespiratoryResult { get; set; }
    public string? HearingResult { get; set; }
    public string? VisionResult { get; set; }
    public string? SkinResult { get; set; }
    public string? LabResults { get; set; }
    public string? XrayResult { get; set; }
    public string? OccupationalDisease { get; set; }
    public string? DiseaseCode { get; set; }
    public string? Classification { get; set; }
    public string? Recommendations { get; set; }
    public string? DoctorName { get; set; }
    public string? Notes { get; set; }
}

public class OccupationalHealthStatsDto
{
    public int TotalExams { get; set; }
    public int PendingCount { get; set; }
    public int CompletedCount { get; set; }
    public int OccupationalDiseaseCount { get; set; }
    public int NeedFollowUpCount { get; set; }
    public List<CompanyBreakdownDto> CompanyBreakdown { get; set; } = new();
    public List<HazardBreakdownDto> HazardBreakdown { get; set; } = new();
}

public class CompanyBreakdownDto
{
    public string CompanyName { get; set; } = string.Empty;
    public int ExamCount { get; set; }
}

public class HazardBreakdownDto
{
    public string Hazard { get; set; } = string.Empty;
    public int Count { get; set; }
}

// =====================================================================
// METHADONE TREATMENT (Điều trị Methadone)
// =====================================================================

public class MethadonePatientSearchDto
{
    public string? Keyword { get; set; }
    public string? Phase { get; set; }
    public int? Status { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 20;
}

public class MethadonePatientDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCodeHIS { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string EnrollmentDate { get; set; } = string.Empty;
    public string? DischargeDate { get; set; }
    public string? DischargeReason { get; set; }
    public float CurrentDoseMg { get; set; }
    public string Phase { get; set; } = string.Empty;
    public int Status { get; set; }
    public string? TransferredFrom { get; set; }
    public string? TransferredTo { get; set; }
    public int MissedDoseCount { get; set; }
    public string? LastDosingDate { get; set; }
    public string? Notes { get; set; }
    public int DosingRecordCount { get; set; }
    public int UrineTestCount { get; set; }
}

public class CreateMethadonePatientDto
{
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string? EnrollmentDate { get; set; }
    public float CurrentDoseMg { get; set; }
    public string Phase { get; set; } = "Induction";
    public string? TransferredFrom { get; set; }
    public string? Notes { get; set; }
}

public class UpdateMethadonePatientDto
{
    public int? Status { get; set; }
    public float? CurrentDoseMg { get; set; }
    public string? Phase { get; set; }
    public string? DischargeDate { get; set; }
    public string? DischargeReason { get; set; }
    public string? TransferredTo { get; set; }
    public string? Notes { get; set; }
}

public class MethadoneDosingRecordDto
{
    public Guid Id { get; set; }
    public Guid MethadonePatientId { get; set; }
    public string DosingDate { get; set; } = string.Empty;
    public float DoseMg { get; set; }
    public bool Witnessed { get; set; }
    public bool TakeHome { get; set; }
    public string? AdministeredBy { get; set; }
    public string? Notes { get; set; }
    public int Status { get; set; }
}

public class CreateMethadoneDosingDto
{
    public Guid MethadonePatientId { get; set; }
    public string? DosingDate { get; set; }
    public float DoseMg { get; set; }
    public bool Witnessed { get; set; } = true;
    public bool TakeHome { get; set; }
    public string? AdministeredBy { get; set; }
    public int Status { get; set; } // 0=Given, 1=Missed, 2=Refused, 3=Holiday
    public string? Notes { get; set; }
}

public class MethadoneUrineTestDto
{
    public Guid Id { get; set; }
    public Guid MethadonePatientId { get; set; }
    public string TestDate { get; set; } = string.Empty;
    public bool IsRandom { get; set; }
    public string? Morphine { get; set; }
    public string? Amphetamine { get; set; }
    public string? Methamphetamine { get; set; }
    public string? THC { get; set; }
    public string? Benzodiazepine { get; set; }
    public string? Methadone { get; set; }
    public string? OverallResult { get; set; }
    public string? Notes { get; set; }
}

public class CreateMethadoneUrineTestDto
{
    public Guid MethadonePatientId { get; set; }
    public string? TestDate { get; set; }
    public bool IsRandom { get; set; }
    public string? Morphine { get; set; }
    public string? Amphetamine { get; set; }
    public string? Methamphetamine { get; set; }
    public string? THC { get; set; }
    public string? Benzodiazepine { get; set; }
    public string? Methadone { get; set; }
    public string? OverallResult { get; set; }
    public string? Notes { get; set; }
}

public class MethadoneStatsDto
{
    public int TotalPatients { get; set; }
    public int ActiveCount { get; set; }
    public int SuspendedCount { get; set; }
    public int DischargedCount { get; set; }
    public int TransferredCount { get; set; }
    public float AverageDoseMg { get; set; }
    public int MissedDosesToday { get; set; }
    public int PositiveUrineTests { get; set; }
    public List<PhaseBreakdownDto> PhaseBreakdown { get; set; } = new();
}

public class PhaseBreakdownDto
{
    public string Phase { get; set; } = string.Empty;
    public int Count { get; set; }
}
