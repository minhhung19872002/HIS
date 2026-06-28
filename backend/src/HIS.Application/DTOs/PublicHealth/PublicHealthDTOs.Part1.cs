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
    // VSATTP-specific
    public string? FoodHandlerRole { get; set; }
    public string? FoodSafetyConclusion { get; set; }
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
    // Specialty fields
    public string? Classification { get; set; }
    public string? GeneralConclusion { get; set; }
    public string? ExamResult { get; set; }
    public float? Height { get; set; }
    public float? Weight { get; set; }
    public string? BloodPressure { get; set; }
    public float? HeartRate { get; set; }
    public string? BloodType { get; set; }
    public string? VisionLeft { get; set; }
    public string? VisionRight { get; set; }
    public string? HearingLeft { get; set; }
    public string? HearingRight { get; set; }
    public string? InternalMedicine { get; set; }
    public string? Surgery { get; set; }
    public string? Ophthalmology { get; set; }
    public string? ENT { get; set; }
    public string? Dental { get; set; }
    public string? Dermatology { get; set; }
    public string? Gynecology { get; set; }
    public string? Psychiatry { get; set; }
    public string? LabResults { get; set; }
    public string? XrayResult { get; set; }
    public string? CertificateNumber { get; set; }
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
    // VSATTP-specific
    public string? FoodHandlerRole { get; set; }
    public string? FoodSafetyConclusion { get; set; }
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
    // VSATTP-specific
    public string? FoodHandlerRole { get; set; }
    public string? FoodSafetyConclusion { get; set; }
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

// F10.5: Paged result for HealthCheckup CRUD list
public class HealthCheckupPagedResult
{
    public List<HealthCheckupDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

// F10.5: KSK type descriptor (for /types endpoint)
public class CheckupTypeDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? FormCode { get; set; }
    public string? Description { get; set; }
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
    public double? DoseMl { get; set; }
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
    public double? DoseMl { get; set; }
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

