namespace HIS.Core.Entities;

// ============================================================================
// NangCap23 — Gói thầu BV Đa khoa (HSMT 39 phân hệ)
// Batch 1: National Pharmacy/Prescription Gateways (gap #1 + #2)
// ============================================================================

/// <summary>
/// Submission đơn thuốc lên Cổng Đơn thuốc Quốc Gia (donthuocquocgia.vn)
/// Theo QĐ 808/QĐ-BYT 2022 và TT 04/2022/TT-BYT
/// </summary>
public class NationalPrescriptionSubmission : BaseEntity
{
    public Guid PrescriptionId { get; set; }
    public string SubmissionCode { get; set; } = string.Empty; // Mã giao dịch tại cổng QG
    public string FacilityCode { get; set; } = string.Empty;  // Mã CSKB
    public string DoctorIdNumber { get; set; } = string.Empty; // CCCD/CMND BS kê đơn
    public string DoctorLicenseNumber { get; set; } = string.Empty; // Mã chứng chỉ hành nghề
    public string PatientIdNumber { get; set; } = string.Empty;
    public string PrescriptionType { get; set; } = "Outpatient"; // Outpatient, Narcotic, Psychotropic, Precursor
    public string PayloadJson { get; set; } = string.Empty; // Snapshot payload gửi đi
    public string? ResponseJson { get; set; }
    public string? GatewayTransactionId { get; set; }
    public int Status { get; set; } // 0=Draft, 1=Submitted, 2=Acknowledged, 3=Rejected, 4=Cancelled
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public int RetryCount { get; set; }
    public DateTime? NextRetryAt { get; set; }

    public virtual Prescription? Prescription { get; set; }
}

/// <summary>
/// Báo cáo nhà thuốc lên Cổng Dược Quốc Gia (duocquocgia.com.vn)
/// Theo CV 2406/QLD-Ttra 2018 (báo cáo nhập/xuất/tồn thuốc nhà thuốc bệnh viện)
/// </summary>
public class NationalPharmacyOutboundReport : BaseEntity
{
    public string ReportCode { get; set; } = string.Empty; // Mã báo cáo
    public string ReportType { get; set; } = "DailySale"; // DailySale, MonthlyInventory, NarcoticReport, Recall
    public DateTime PeriodFrom { get; set; }
    public DateTime PeriodTo { get; set; }
    public Guid? PharmacyId { get; set; } // Warehouse / Nhà thuốc
    public int ItemCount { get; set; }
    public string PayloadXml { get; set; } = string.Empty; // XML theo schema CV 2406
    public string? ResponseXml { get; set; }
    public string? GatewayTicketNumber { get; set; }
    public int Status { get; set; } // 0=Draft, 1=Submitted, 2=Acknowledged, 3=Rejected
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public int RetryCount { get; set; }
    public string? Notes { get; set; }
}

// ============================================================================
// Batch 2: Đề án 06 — Birth/Death/Driving License (gap #3 + #4 + #6)
// Liên thông cổng gdbhyt.baohiemxahoi.gov.vn
// ============================================================================

/// <summary>
/// Giấy chứng sinh điện tử — Đề án 06 (TT 17/2024/TT-BYT)
/// </summary>
public class BirthCertificateRecord : BaseEntity
{
    public string CertificateNumber { get; set; } = string.Empty;
    public Guid MotherPatientId { get; set; }
    public string? FatherFullName { get; set; }
    public string? FatherIdNumber { get; set; } // CCCD bố
    public string MotherFullName { get; set; } = string.Empty;
    public string MotherIdNumber { get; set; } = string.Empty;
    public DateTime BirthDateTime { get; set; }
    public string ChildGender { get; set; } = "Unknown"; // Male, Female, Unknown
    public string? ChildName { get; set; }
    public decimal BirthWeight { get; set; } // kg
    public int GestationalAgeWeeks { get; set; }
    public string BirthMethod { get; set; } = "Vaginal"; // Vaginal, Cesarean, Assisted
    public string BirthLocation { get; set; } = "Hospital"; // Hospital, Home, OnWay, Other
    public Guid? MedicalRecordId { get; set; }
    public Guid? AttendingDoctorId { get; set; }
    public Guid? MidwifeId { get; set; }
    public bool IsLiveBirth { get; set; } = true;
    public int SingletonOrMultiple { get; set; } = 1; // 1=Singleton, 2=Twin, 3=Triplet+
    public string? Notes { get; set; }

    // Đề án 06 liaison
    public string? Da06SubmissionId { get; set; }
    public string? Da06ResponseCode { get; set; }
    public DateTime? Da06SubmittedAt { get; set; }
    public DateTime? Da06AcknowledgedAt { get; set; }
    public int Da06Status { get; set; } // 0=NotSubmitted, 1=Submitted, 2=Acknowledged, 3=Rejected
    public string? Da06ErrorMessage { get; set; }

    public virtual Patient? Mother { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }
}

/// <summary>
/// Giấy báo tử điện tử — Đề án 06
/// </summary>
public class DeathCertificateRecord : BaseEntity
{
    public string CertificateNumber { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public DateTime DeathDateTime { get; set; }
    public string DeathLocation { get; set; } = "Hospital"; // Hospital, Home, OnWay, Other
    public string? PrimaryCauseIcd { get; set; }
    public string? PrimaryCauseDescription { get; set; }
    public string? SecondaryCauseIcd { get; set; }
    public string? SecondaryCauseDescription { get; set; }
    public string MannerOfDeath { get; set; } = "Natural"; // Natural, Accident, Suicide, Homicide, Undetermined
    public Guid? CertifyingDoctorId { get; set; }
    public string? CertifyingDoctorName { get; set; }
    public string? CertifyingDoctorLicense { get; set; }
    public DateTime CertifyingDate { get; set; }
    public string? InformantFullName { get; set; }
    public string? InformantIdNumber { get; set; }
    public string? InformantRelationship { get; set; }
    public string? Notes { get; set; }

    // Đề án 06 liaison
    public string? Da06SubmissionId { get; set; }
    public string? Da06ResponseCode { get; set; }
    public DateTime? Da06SubmittedAt { get; set; }
    public DateTime? Da06AcknowledgedAt { get; set; }
    public int Da06Status { get; set; } // 0=NotSubmitted, 1=Submitted, 2=Acknowledged, 3=Rejected
    public string? Da06ErrorMessage { get; set; }

    public virtual Patient? Patient { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }
}

/// <summary>
/// Giấy khám sức khỏe lái xe điện tử — TT 24/2023/TT-BYT
/// Liên thông cổng gdbhyt.baohiemxahoi.gov.vn theo Đề án 06
/// </summary>
public class DrivingLicenseHealthCheck : BaseEntity
{
    public string CertificateNumber { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public Guid? ExaminationId { get; set; }
    public string LicenseClass { get; set; } = "B1"; // A1, A2, A3, B1, B2, C, D, E, F
    public DateTime ExamDate { get; set; }

    // Khám lâm sàng tổng quát
    public decimal HeightCm { get; set; }
    public decimal WeightKg { get; set; }
    public int SystolicBp { get; set; }
    public int DiastolicBp { get; set; }
    public int HeartRate { get; set; }

    // Thị lực
    public string? VisionRightWithoutGlasses { get; set; }
    public string? VisionLeftWithoutGlasses { get; set; }
    public string? VisionRightWithGlasses { get; set; }
    public string? VisionLeftWithGlasses { get; set; }
    public bool ColorBlindNormal { get; set; } = true;
    public string? ColorVisionDetail { get; set; }
    public string? VisionFieldResult { get; set; }

    // Thính lực
    public bool HearingNormal { get; set; } = true;
    public string? HearingDetail { get; set; }

    // Tâm thần / thần kinh
    public bool NeurologicalNormal { get; set; } = true;
    public string? NeurologicalDetail { get; set; }
    public bool PsychiatricNormal { get; set; } = true;
    public string? PsychiatricDetail { get; set; }

    // Tim mạch / hô hấp / cơ xương khớp / nội tiết
    public string? CardioRespiratoryConclusion { get; set; }
    public string? MusculoskeletalConclusion { get; set; }
    public string? EndocrineConclusion { get; set; }

    // Xét nghiệm ma túy
    public bool DrugTestPerformed { get; set; }
    public bool DrugTestPositive { get; set; }
    public string? DrugTestDetail { get; set; }

    // Xét nghiệm cồn (BAC)
    public bool AlcoholTestPerformed { get; set; }
    public decimal? AlcoholLevelMgPercent { get; set; }

    // Kết luận
    public bool EligibleToDrive { get; set; }
    public string? Conclusion { get; set; }
    public Guid? CertifyingDoctorId { get; set; }
    public string? CertifyingDoctorName { get; set; }
    public string? CertifyingDoctorLicense { get; set; }
    public DateTime? IssuedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }

    // Đề án 06 liaison
    public string? Da06SubmissionId { get; set; }
    public string? Da06ResponseCode { get; set; }
    public DateTime? Da06SubmittedAt { get; set; }
    public DateTime? Da06AcknowledgedAt { get; set; }
    public int Da06Status { get; set; } // 0=NotSubmitted, 1=Submitted, 2=Acknowledged, 3=Rejected
    public string? Da06ErrorMessage { get; set; }

    public virtual Patient? Patient { get; set; }
    public virtual Examination? Examination { get; set; }
}

// ============================================================================
// Batch 3: Linen Management + Functional Diagnostics (gap #5 + #7)
// ============================================================================

/// <summary>
/// Danh mục đồ vải / đồ giặt — KSNK mục 21
/// </summary>
public class LinenItem : BaseEntity
{
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string Category { get; set; } = "Bedding"; // Bedding, Clothing, Towel, Drape, Surgical, OperatingRoom, Other
    public string? Unit { get; set; } = "Cái";
    public decimal? StandardWeightKg { get; set; }
    public int? MaxReuseCount { get; set; }
    public int CurrentStock { get; set; }
    public int InCleaning { get; set; }
    public int InRepair { get; set; }
    public int Damaged { get; set; }
    public int MinStockAlert { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
}

/// <summary>
/// Giao dịch giao/nhận đồ vải giữa khoa và nhà giặt
/// </summary>
public class LinenTransaction : BaseEntity
{
    public string TransactionCode { get; set; } = string.Empty;
    public string TransactionType { get; set; } = "Dispatch"; // Dispatch (gửi đi giặt), Return (nhận về), Adjust (điều chỉnh), Discard (loại bỏ)
    public DateTime TransactionDate { get; set; }
    public Guid? FromDepartmentId { get; set; }
    public Guid? ToDepartmentId { get; set; }
    public string? DispatcherName { get; set; }
    public string? ReceiverName { get; set; }
    public int TotalItems { get; set; }
    public decimal TotalWeightKg { get; set; }
    public string? VendorName { get; set; } // Nhà giặt thuê ngoài (nếu có)
    public int Status { get; set; } // 0=Draft, 1=Dispatched, 2=Received, 3=Reconciled, 4=Cancelled
    public string? Notes { get; set; }
    public string DetailsJson { get; set; } = "[]"; // [{linenItemId, quantity, weight, condition}]

    public virtual Department? FromDepartment { get; set; }
    public virtual Department? ToDepartment { get; set; }
}

/// <summary>
/// Lịch giám sát vệ sinh / tiệt trùng phòng (đặc biệt phòng mổ)
/// </summary>
public class SterilizationSchedule : BaseEntity
{
    public string ScheduleCode { get; set; } = string.Empty;
    public DateTime ScheduledAt { get; set; }
    public string AreaType { get; set; } = "OperatingRoom"; // OperatingRoom, ICU, Ward, Pharmacy, Other
    public Guid? RoomId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? AreaCode { get; set; }
    public string SterilizationMethod { get; set; } = "ChemicalDisinfection"; // ChemicalDisinfection, UV, Fumigation, Autoclave
    public string? Agent { get; set; } // Tên hóa chất
    public int DurationMinutes { get; set; }
    public string? AssignedStaff { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int Status { get; set; } // 0=Scheduled, 1=InProgress, 2=Completed, 3=Failed, 4=Cancelled
    public string? CultureSampleCode { get; set; } // Mã mẫu nuôi cấy KQ
    public string? CultureResult { get; set; } // Pass, Fail, Pending
    public string? Notes { get; set; }

    public virtual Department? Department { get; set; }
    public virtual Room? Room { get; set; }
}

/// <summary>
/// Kết quả thăm dò chức năng (8 loại theo HSMT mục 18)
/// </summary>
public class FunctionalDiagnosticTest : BaseEntity
{
    public string TestCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public Guid? ExaminationId { get; set; }
    public Guid? ServiceRequestDetailId { get; set; }

    /// <summary>
    /// Loại: ECG (Điện tim thường quy), ECGStress (Điện tim gắng sức),
    /// Endoscopy (Nội soi), BoneDensity (Đo loãng xương), EEG (Điện não),
    /// EMG (Điện cơ), Spirometry (Đo CN hô hấp), Audiometry (Đo thính lực)
    /// </summary>
    public string TestType { get; set; } = "ECG";

    public Guid? PerformingDoctorId { get; set; }
    public string? PerformingDoctorName { get; set; }
    public Guid? TechnicianId { get; set; }
    public DateTime? PerformedAt { get; set; }
    public string? DeviceName { get; set; }
    public string? DeviceSerialNumber { get; set; }

    // Findings / Result
    public string? ClinicalIndication { get; set; }
    public string? Findings { get; set; }
    public string? Conclusion { get; set; }
    public string? Recommendation { get; set; }

    // Numeric measurements (JSON object keyed by parameter name)
    public string MeasurementsJson { get; set; } = "{}";

    // Captured images (JSON array of URLs / base64 thumbnails)
    public string ImagesJson { get; set; } = "[]";

    // Status: 0=Requested, 1=InProgress, 2=Completed, 3=Verified, 4=Cancelled
    public int Status { get; set; }
    public Guid? VerifiedById { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public string? Notes { get; set; }

    public virtual Patient? Patient { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }
    public virtual Examination? Examination { get; set; }
}

// ============================================================================
// Batch 4: Zalo OA / ZNS notifications (gap #9)
// (Quality Dashboard gap #8 dùng query trên dữ liệu hiện hữu, không cần entity)
// ============================================================================

/// <summary>
/// Log gửi Zalo Notification Service (ZNS) qua Official Account
/// </summary>
public class ZaloNotificationLog : BaseEntity
{
    public string TemplateId { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;
    public string TargetPhone { get; set; } = string.Empty;
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? RelatedEntityType { get; set; } // Appointment, Prescription, LabResult, etc.
    public Guid? RelatedEntityId { get; set; }
    public string PayloadJson { get; set; } = "{}";
    public string? MessageId { get; set; } // Zalo trả về sau gửi
    public int Status { get; set; } // 0=Pending, 1=Sent, 2=Delivered, 3=Failed
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public decimal? CostVnd { get; set; }
    public int RetryCount { get; set; }
}
