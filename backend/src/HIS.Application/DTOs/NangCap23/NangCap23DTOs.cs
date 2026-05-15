namespace HIS.Application.DTOs.NangCap23;

// ============================================================================
// Batch 1: National Pharmacy/Prescription Gateways
// ============================================================================

public class NationalPrescriptionSubmissionDto
{
    public Guid Id { get; set; }
    public Guid PrescriptionId { get; set; }
    public string SubmissionCode { get; set; } = string.Empty;
    public string FacilityCode { get; set; } = string.Empty;
    public string DoctorIdNumber { get; set; } = string.Empty;
    public string DoctorLicenseNumber { get; set; } = string.Empty;
    public string PatientIdNumber { get; set; } = string.Empty;
    public string PrescriptionType { get; set; } = "Outpatient";
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public string? GatewayTransactionId { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public int RetryCount { get; set; }
    public string? PatientName { get; set; }
    public string? PrescriptionCode { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NationalPrescriptionSubmissionDetailDto : NationalPrescriptionSubmissionDto
{
    public string? PayloadJson { get; set; }
    public string? ResponseJson { get; set; }
}

public class SubmitNationalPrescriptionDto
{
    public Guid PrescriptionId { get; set; }
    public string PrescriptionType { get; set; } = "Outpatient";
    public string DoctorIdNumber { get; set; } = string.Empty;
    public string DoctorLicenseNumber { get; set; } = string.Empty;
}

public class NationalPharmacyOutboundReportDto
{
    public Guid Id { get; set; }
    public string ReportCode { get; set; } = string.Empty;
    public string ReportType { get; set; } = string.Empty;
    public DateTime PeriodFrom { get; set; }
    public DateTime PeriodTo { get; set; }
    public int ItemCount { get; set; }
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public string? GatewayTicketNumber { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public int RetryCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Notes { get; set; }
}

public class NationalPharmacyOutboundReportDetailDto : NationalPharmacyOutboundReportDto
{
    public string? PayloadXml { get; set; }
    public string? ResponseXml { get; set; }
}

public class GeneratePharmacyReportDto
{
    public string ReportType { get; set; } = "DailySale"; // DailySale, MonthlyInventory, NarcoticReport
    public DateTime PeriodFrom { get; set; }
    public DateTime PeriodTo { get; set; }
    public Guid? PharmacyId { get; set; }
    public string? Notes { get; set; }
}

public class NationalGatewayConfigDto
{
    public string NationalPrescriptionBaseUrl { get; set; } = "https://donthuocquocgia.vn";
    public string NationalPharmacyBaseUrl { get; set; } = "https://duocquocgia.com.vn";
    public string FacilityCode { get; set; } = string.Empty;
    public string FacilityName { get; set; } = string.Empty;
    public bool MockMode { get; set; } = true;
    public bool AutoSubmit { get; set; } = false;
    public int RetryCount { get; set; } = 3;
    public int TimeoutSeconds { get; set; } = 30;
}

// ============================================================================
// Batch 2: Đề án 06
// ============================================================================

public class BirthCertificateDto
{
    public Guid Id { get; set; }
    public string CertificateNumber { get; set; } = string.Empty;
    public Guid MotherPatientId { get; set; }
    public string? MotherFullName { get; set; }
    public string? MotherIdNumber { get; set; }
    public string? FatherFullName { get; set; }
    public string? FatherIdNumber { get; set; }
    public DateTime BirthDateTime { get; set; }
    public string ChildGender { get; set; } = "Unknown";
    public string? ChildName { get; set; }
    public decimal BirthWeight { get; set; }
    public int GestationalAgeWeeks { get; set; }
    public string BirthMethod { get; set; } = "Vaginal";
    public string BirthLocation { get; set; } = "Hospital";
    public bool IsLiveBirth { get; set; } = true;
    public int SingletonOrMultiple { get; set; } = 1;
    public string? Notes { get; set; }
    public int Da06Status { get; set; }
    public string Da06StatusName { get; set; } = string.Empty;
    public string? Da06SubmissionId { get; set; }
    public string? Da06ErrorMessage { get; set; }
    public DateTime? Da06SubmittedAt { get; set; }
    public DateTime? Da06AcknowledgedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveBirthCertificateDto
{
    public Guid? Id { get; set; }
    public Guid MotherPatientId { get; set; }
    public string? MotherFullName { get; set; }
    public string? MotherIdNumber { get; set; }
    public string? FatherFullName { get; set; }
    public string? FatherIdNumber { get; set; }
    public DateTime BirthDateTime { get; set; }
    public string ChildGender { get; set; } = "Unknown";
    public string? ChildName { get; set; }
    public decimal BirthWeight { get; set; }
    public int GestationalAgeWeeks { get; set; }
    public string BirthMethod { get; set; } = "Vaginal";
    public string BirthLocation { get; set; } = "Hospital";
    public bool IsLiveBirth { get; set; } = true;
    public int SingletonOrMultiple { get; set; } = 1;
    public Guid? AttendingDoctorId { get; set; }
    public Guid? MidwifeId { get; set; }
    public string? Notes { get; set; }
}

public class DeathCertificateDto
{
    public Guid Id { get; set; }
    public string CertificateNumber { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public DateTime DeathDateTime { get; set; }
    public string DeathLocation { get; set; } = "Hospital";
    public string? PrimaryCauseIcd { get; set; }
    public string? PrimaryCauseDescription { get; set; }
    public string? SecondaryCauseIcd { get; set; }
    public string? SecondaryCauseDescription { get; set; }
    public string MannerOfDeath { get; set; } = "Natural";
    public string? CertifyingDoctorName { get; set; }
    public string? CertifyingDoctorLicense { get; set; }
    public DateTime CertifyingDate { get; set; }
    public string? InformantFullName { get; set; }
    public string? InformantIdNumber { get; set; }
    public string? InformantRelationship { get; set; }
    public string? Notes { get; set; }
    public int Da06Status { get; set; }
    public string Da06StatusName { get; set; } = string.Empty;
    public string? Da06SubmissionId { get; set; }
    public string? Da06ErrorMessage { get; set; }
    public DateTime? Da06SubmittedAt { get; set; }
    public DateTime? Da06AcknowledgedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveDeathCertificateDto
{
    public Guid? Id { get; set; }
    public Guid PatientId { get; set; }
    public DateTime DeathDateTime { get; set; }
    public string DeathLocation { get; set; } = "Hospital";
    public string? PrimaryCauseIcd { get; set; }
    public string? PrimaryCauseDescription { get; set; }
    public string? SecondaryCauseIcd { get; set; }
    public string? SecondaryCauseDescription { get; set; }
    public string MannerOfDeath { get; set; } = "Natural";
    public Guid? CertifyingDoctorId { get; set; }
    public string? CertifyingDoctorName { get; set; }
    public string? CertifyingDoctorLicense { get; set; }
    public DateTime CertifyingDate { get; set; }
    public string? InformantFullName { get; set; }
    public string? InformantIdNumber { get; set; }
    public string? InformantRelationship { get; set; }
    public string? Notes { get; set; }
}

public class DrivingLicenseHealthCheckDto
{
    public Guid Id { get; set; }
    public string CertificateNumber { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public string LicenseClass { get; set; } = "B1";
    public DateTime ExamDate { get; set; }
    public decimal HeightCm { get; set; }
    public decimal WeightKg { get; set; }
    public int SystolicBp { get; set; }
    public int DiastolicBp { get; set; }
    public int HeartRate { get; set; }
    public string? VisionRightWithoutGlasses { get; set; }
    public string? VisionLeftWithoutGlasses { get; set; }
    public string? VisionRightWithGlasses { get; set; }
    public string? VisionLeftWithGlasses { get; set; }
    public bool ColorBlindNormal { get; set; } = true;
    public string? ColorVisionDetail { get; set; }
    public string? VisionFieldResult { get; set; }
    public bool HearingNormal { get; set; } = true;
    public string? HearingDetail { get; set; }
    public bool NeurologicalNormal { get; set; } = true;
    public string? NeurologicalDetail { get; set; }
    public bool PsychiatricNormal { get; set; } = true;
    public string? PsychiatricDetail { get; set; }
    public string? CardioRespiratoryConclusion { get; set; }
    public string? MusculoskeletalConclusion { get; set; }
    public string? EndocrineConclusion { get; set; }
    public bool DrugTestPerformed { get; set; }
    public bool DrugTestPositive { get; set; }
    public string? DrugTestDetail { get; set; }
    public bool AlcoholTestPerformed { get; set; }
    public decimal? AlcoholLevelMgPercent { get; set; }
    public bool EligibleToDrive { get; set; }
    public string? Conclusion { get; set; }
    public string? CertifyingDoctorName { get; set; }
    public string? CertifyingDoctorLicense { get; set; }
    public DateTime? IssuedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int Da06Status { get; set; }
    public string Da06StatusName { get; set; } = string.Empty;
    public string? Da06SubmissionId { get; set; }
    public string? Da06ErrorMessage { get; set; }
    public DateTime? Da06SubmittedAt { get; set; }
    public DateTime? Da06AcknowledgedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveDrivingLicenseHealthCheckDto
{
    public Guid? Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid? ExaminationId { get; set; }
    public string LicenseClass { get; set; } = "B1";
    public DateTime ExamDate { get; set; }
    public decimal HeightCm { get; set; }
    public decimal WeightKg { get; set; }
    public int SystolicBp { get; set; }
    public int DiastolicBp { get; set; }
    public int HeartRate { get; set; }
    public string? VisionRightWithoutGlasses { get; set; }
    public string? VisionLeftWithoutGlasses { get; set; }
    public string? VisionRightWithGlasses { get; set; }
    public string? VisionLeftWithGlasses { get; set; }
    public bool ColorBlindNormal { get; set; } = true;
    public string? ColorVisionDetail { get; set; }
    public string? VisionFieldResult { get; set; }
    public bool HearingNormal { get; set; } = true;
    public string? HearingDetail { get; set; }
    public bool NeurologicalNormal { get; set; } = true;
    public string? NeurologicalDetail { get; set; }
    public bool PsychiatricNormal { get; set; } = true;
    public string? PsychiatricDetail { get; set; }
    public string? CardioRespiratoryConclusion { get; set; }
    public string? MusculoskeletalConclusion { get; set; }
    public string? EndocrineConclusion { get; set; }
    public bool DrugTestPerformed { get; set; }
    public bool DrugTestPositive { get; set; }
    public string? DrugTestDetail { get; set; }
    public bool AlcoholTestPerformed { get; set; }
    public decimal? AlcoholLevelMgPercent { get; set; }
    public bool EligibleToDrive { get; set; }
    public string? Conclusion { get; set; }
    public Guid? CertifyingDoctorId { get; set; }
    public string? CertifyingDoctorName { get; set; }
    public string? CertifyingDoctorLicense { get; set; }
    public DateTime? IssuedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

// ============================================================================
// Batch 3: Linen + Functional Diagnostics
// ============================================================================

public class LinenItemDto
{
    public Guid Id { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string Category { get; set; } = "Bedding";
    public string? Unit { get; set; }
    public decimal? StandardWeightKg { get; set; }
    public int? MaxReuseCount { get; set; }
    public int CurrentStock { get; set; }
    public int InCleaning { get; set; }
    public int InRepair { get; set; }
    public int Damaged { get; set; }
    public int MinStockAlert { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
    public bool IsLowStock => CurrentStock <= MinStockAlert;
}

public class LinenTransactionDto
{
    public Guid Id { get; set; }
    public string TransactionCode { get; set; } = string.Empty;
    public string TransactionType { get; set; } = "Dispatch";
    public DateTime TransactionDate { get; set; }
    public Guid? FromDepartmentId { get; set; }
    public string? FromDepartmentName { get; set; }
    public Guid? ToDepartmentId { get; set; }
    public string? ToDepartmentName { get; set; }
    public string? DispatcherName { get; set; }
    public string? ReceiverName { get; set; }
    public int TotalItems { get; set; }
    public decimal TotalWeightKg { get; set; }
    public string? VendorName { get; set; }
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string DetailsJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; }
}

public class SaveLinenTransactionDto
{
    public Guid? Id { get; set; }
    public string TransactionType { get; set; } = "Dispatch";
    public DateTime TransactionDate { get; set; }
    public Guid? FromDepartmentId { get; set; }
    public Guid? ToDepartmentId { get; set; }
    public string? DispatcherName { get; set; }
    public string? ReceiverName { get; set; }
    public string? VendorName { get; set; }
    public string? Notes { get; set; }
    public string DetailsJson { get; set; } = "[]";
}

public class SterilizationScheduleDto
{
    public Guid Id { get; set; }
    public string ScheduleCode { get; set; } = string.Empty;
    public DateTime ScheduledAt { get; set; }
    public string AreaType { get; set; } = "OperatingRoom";
    public Guid? RoomId { get; set; }
    public string? RoomName { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? AreaCode { get; set; }
    public string SterilizationMethod { get; set; } = "ChemicalDisinfection";
    public string? Agent { get; set; }
    public int DurationMinutes { get; set; }
    public string? AssignedStaff { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public string? CultureSampleCode { get; set; }
    public string? CultureResult { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveSterilizationScheduleDto
{
    public Guid? Id { get; set; }
    public DateTime ScheduledAt { get; set; }
    public string AreaType { get; set; } = "OperatingRoom";
    public Guid? RoomId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? AreaCode { get; set; }
    public string SterilizationMethod { get; set; } = "ChemicalDisinfection";
    public string? Agent { get; set; }
    public int DurationMinutes { get; set; }
    public string? AssignedStaff { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? CultureSampleCode { get; set; }
    public string? CultureResult { get; set; }
    public string? Notes { get; set; }
}

public class FunctionalDiagnosticTestDto
{
    public Guid Id { get; set; }
    public string TestCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public string TestType { get; set; } = "ECG";
    public string TestTypeName { get; set; } = string.Empty;
    public Guid? PerformingDoctorId { get; set; }
    public string? PerformingDoctorName { get; set; }
    public Guid? TechnicianId { get; set; }
    public DateTime? PerformedAt { get; set; }
    public string? DeviceName { get; set; }
    public string? DeviceSerialNumber { get; set; }
    public string? ClinicalIndication { get; set; }
    public string? Findings { get; set; }
    public string? Conclusion { get; set; }
    public string? Recommendation { get; set; }
    public string MeasurementsJson { get; set; } = "{}";
    public string ImagesJson { get; set; } = "[]";
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public Guid? VerifiedById { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveFunctionalDiagnosticTestDto
{
    public Guid? Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public Guid? ExaminationId { get; set; }
    public Guid? ServiceRequestDetailId { get; set; }
    public string TestType { get; set; } = "ECG";
    public Guid? PerformingDoctorId { get; set; }
    public string? PerformingDoctorName { get; set; }
    public Guid? TechnicianId { get; set; }
    public DateTime? PerformedAt { get; set; }
    public string? DeviceName { get; set; }
    public string? DeviceSerialNumber { get; set; }
    public string? ClinicalIndication { get; set; }
    public string? Findings { get; set; }
    public string? Conclusion { get; set; }
    public string? Recommendation { get; set; }
    public string MeasurementsJson { get; set; } = "{}";
    public string ImagesJson { get; set; } = "[]";
    public string? Notes { get; set; }
}

// ============================================================================
// Batch 4: Zalo OA + Quality Dashboard
// ============================================================================

public class ZaloNotificationLogDto
{
    public Guid Id { get; set; }
    public string TemplateId { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;
    public string TargetPhone { get; set; } = string.Empty;
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? RelatedEntityType { get; set; }
    public Guid? RelatedEntityId { get; set; }
    public string PayloadJson { get; set; } = "{}";
    public string? MessageId { get; set; }
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public decimal? CostVnd { get; set; }
    public int RetryCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SendZaloMessageDto
{
    public string TemplateId { get; set; } = string.Empty;
    public string TargetPhone { get; set; } = string.Empty;
    public Guid? PatientId { get; set; }
    public string? RelatedEntityType { get; set; }
    public Guid? RelatedEntityId { get; set; }
    public Dictionary<string, string> TemplateParams { get; set; } = new();
}

public class ZaloConfigDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string OaId { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://business.openapi.zalo.me";
    public bool MockMode { get; set; } = true;
    public bool IsEnabled { get; set; } = false;
}

/// <summary>
/// Dashboard chất lượng theo HSMT mục 39 (5 mục view chuyên biệt)
/// </summary>
public class QualityDashboardDto
{
    public DateTime AsOfDate { get; set; } = DateTime.Now;
    public List<ClinicQueueViewDto> ClinicQueues { get; set; } = new();
    public List<InpatientDepartmentViewDto> InpatientByDepartment { get; set; } = new();
    public ParaclinicalStatusViewDto Paraclinical { get; set; } = new();
    public LabStatusViewDto Lab { get; set; } = new();
    public DailyRevenueViewDto Revenue { get; set; } = new();
}

public class ClinicQueueViewDto
{
    public Guid RoomId { get; set; }
    public string RoomName { get; set; } = string.Empty;
    public Guid? DoctorId { get; set; }
    public string? DoctorName { get; set; }
    public int Waiting { get; set; }      // Chờ khám
    public int InProgress { get; set; }   // Đang thực hiện y lệnh
    public int Completed { get; set; }    // Đã khám
}

public class InpatientDepartmentViewDto
{
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int Present { get; set; }    // Đang hiện diện
    public int Admitted { get; set; }   // Nhập viện hôm nay
    public int Discharged { get; set; } // Xuất viện hôm nay
    public decimal TotalCost { get; set; }      // Tổng chi phí đang phát sinh
    public decimal TotalDeposit { get; set; }   // Tổng tạm ứng
    public decimal Receivable { get; set; }     // Công nợ
}

public class ParaclinicalStatusViewDto
{
    public List<ParaclinicalTypeStatusDto> Items { get; set; } = new();
}

public class ParaclinicalTypeStatusDto
{
    public string TypeName { get; set; } = string.Empty; // Radiology, Endoscopy, etc.
    public int Pending { get; set; }    // Chưa có
    public int Completed { get; set; }  // Đã có
}

public class LabStatusViewDto
{
    public List<LabCategoryStatusDto> Categories { get; set; } = new();
}

public class LabCategoryStatusDto
{
    public string CategoryName { get; set; } = string.Empty; // Huyết học, Sinh hóa, Vi sinh, Miễn dịch
    public int Pending { get; set; }
    public int Completed { get; set; }
}

public class DailyRevenueViewDto
{
    public decimal OutpatientTotal { get; set; }
    public decimal InpatientTotal { get; set; }
    public decimal GrandTotal => OutpatientTotal + InpatientTotal;
    public List<CashierRevenueDto> ByCashier { get; set; } = new();
}

public class CashierRevenueDto
{
    public Guid CashierId { get; set; }
    public string CashierName { get; set; } = string.Empty;
    public decimal OutpatientRevenue { get; set; }
    public decimal InpatientRevenue { get; set; }
    public decimal Total => OutpatientRevenue + InpatientRevenue;
    public int ReceiptCount { get; set; }
}
