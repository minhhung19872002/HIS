namespace HIS.Core.Entities;

// ======= Health Checkup (Khám sức khỏe) =======
public class HealthCheckup : BaseEntity
{
    public Guid PatientId { get; set; }
    public string CheckupType { get; set; } = string.Empty; // General18, Under18, Periodic, Driver, Student, Elderly, Occupational, ChildUnder24m
    public string FormCode { get; set; } = string.Empty; // Mau01, Mau02, Mau03, TT36, PL1, PL2, PL6, TT28
    public string? BatchCode { get; set; } // For group exams (schools, companies)
    public string? OrganizationName { get; set; } // School/company name
    public int Status { get; set; } // 0=Pending, 1=InProgress, 2=Completed, 3=Cancelled
    public string? ExamResult { get; set; } // Đủ/Không đủ điều kiện sức khỏe
    public string? Classification { get; set; } // Loại I-V (health classification)
    public string? GeneralConclusion { get; set; }
    public string? InternalMedicine { get; set; } // Nội khoa
    public string? Surgery { get; set; } // Ngoại khoa
    public string? Ophthalmology { get; set; } // Mắt
    public string? ENT { get; set; } // Tai Mũi Họng
    public string? Dental { get; set; } // Răng Hàm Mặt
    public string? Dermatology { get; set; } // Da liễu
    public string? Gynecology { get; set; } // Phụ khoa
    public string? Psychiatry { get; set; } // Tâm thần kinh
    public float? Height { get; set; }
    public float? Weight { get; set; }
    public float? BMI { get; set; }
    public string? BloodPressure { get; set; }
    public float? HeartRate { get; set; }
    public string? BloodType { get; set; }
    public string? VisionLeft { get; set; }
    public string? VisionRight { get; set; }
    public string? HearingLeft { get; set; }
    public string? HearingRight { get; set; }
    public string? LabResults { get; set; } // JSON: blood, urine tests
    public string? XrayResult { get; set; }
    public string? DoctorId { get; set; }
    public string? DoctorName { get; set; }
    public DateTime? ExamDate { get; set; }
    public DateTime? CertificateDate { get; set; }
    public string? CertificateNumber { get; set; }
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
    public virtual Patient? Patient { get; set; }
}

// ======= Immunization (Tiêm chủng) =======
public class VaccinationRecord : BaseEntity
{
    public Guid PatientId { get; set; }
    public string VaccineName { get; set; } = string.Empty;
    public string? VaccineCode { get; set; }
    public string? LotNumber { get; set; }
    public string? Manufacturer { get; set; }
    public DateTime VaccinationDate { get; set; }
    public int DoseNumber { get; set; } // 1, 2, 3...
    public string? InjectionSite { get; set; } // Vị trí tiêm
    public string? Route { get; set; } // IM, SC, ID, Oral
    public float? DoseMl { get; set; }
    public string? AdministeredBy { get; set; }
    public string? FacilityName { get; set; }
    public int Status { get; set; } // 0=Scheduled, 1=Completed, 2=Missed, 3=Contraindicated
    public string? AefiReport { get; set; } // Adverse Event Following Immunization
    public int? AefiSeverity { get; set; } // 0=None, 1=Mild, 2=Moderate, 3=Severe
    public DateTime? NextDoseDate { get; set; }
    public string? CampaignCode { get; set; } // For mass vaccination campaigns
    public string? Notes { get; set; }
    public bool IsEPI { get; set; } // Tiêm chủng mở rộng
    public virtual Patient? Patient { get; set; }
}

public class VaccinationCampaign : BaseEntity
{
    public string CampaignCode { get; set; } = string.Empty;
    public string CampaignName { get; set; } = string.Empty;
    public string VaccineName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? TargetGroup { get; set; } // Children 1-5, Elderly 65+, etc.
    public int TargetCount { get; set; }
    public int CompletedCount { get; set; }
    public int Status { get; set; } // 0=Planning, 1=Active, 2=Completed, 3=Cancelled
    public string? Description { get; set; }
    public string? Areas { get; set; } // JSON array of areas/districts
}

// ======= Epidemiological Surveillance (Giám sát dịch tễ) =======
public class DiseaseReport : BaseEntity
{
    public Guid? PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string? PatientAge { get; set; }
    public string? PatientGender { get; set; }
    public string? PatientAddress { get; set; }
    public string DiseaseCode { get; set; } = string.Empty; // ICD-10
    public string DiseaseName { get; set; } = string.Empty;
    public string? DiseaseGroup { get; set; } // A=Đặc biệt nguy hiểm, B=Nguy hiểm, C=Khác
    public DateTime OnsetDate { get; set; }
    public DateTime ReportDate { get; set; }
    public DateTime? DiagnosisDate { get; set; }
    public string? ReportedBy { get; set; }
    public string? FacilityName { get; set; }
    public int Status { get; set; } // 0=Reported, 1=Investigating, 2=Confirmed, 3=Resolved, 4=Closed
    public bool IsNotifiable { get; set; } // Bệnh phải khai báo
    public string? Outcome { get; set; } // Recovered, Deceased, Ongoing
    public string? QuarantineStatus { get; set; }
    public string? ContactTracingNotes { get; set; }
    public int ContactCount { get; set; }
    public string? TravelHistory { get; set; }
    public string? ExposureSource { get; set; }
    public string? LabConfirmation { get; set; }
    public string? Notes { get; set; }
    public virtual Patient? Patient { get; set; }
}

public class OutbreakEvent : BaseEntity
{
    public string OutbreakCode { get; set; } = string.Empty;
    public string DiseaseName { get; set; } = string.Empty;
    public string? DiseaseCode { get; set; }
    public DateTime DetectedDate { get; set; }
    public DateTime? ResolvedDate { get; set; }
    public string? Location { get; set; } // District/Ward
    public string? AffectedArea { get; set; }
    public int CaseCount { get; set; }
    public int DeathCount { get; set; }
    public int Status { get; set; } // 0=Detected, 1=Investigating, 2=Contained, 3=Resolved
    public string? ResponseActions { get; set; }
    public string? RiskLevel { get; set; } // Low, Medium, High, Critical
    public string? Notes { get; set; }
}

// ======= School Health (Y tế trường học) =======
public class SchoolHealthExam : BaseEntity
{
    public string SchoolName { get; set; } = string.Empty;
    public string? SchoolCode { get; set; }
    public string AcademicYear { get; set; } = string.Empty; // 2025-2026
    public string? GradeLevel { get; set; } // Lớp 1-12
    public string StudentName { get; set; } = string.Empty;
    public string? StudentCode { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public DateTime ExamDate { get; set; }
    public float? Height { get; set; }
    public float? Weight { get; set; }
    public float? BMI { get; set; }
    public string? NutritionStatus { get; set; } // Bình thường, Suy dinh dưỡng, Thừa cân, Béo phì
    public string? VisionLeft { get; set; }
    public string? VisionRight { get; set; }
    public bool? HasVisionProblem { get; set; }
    public string? HearingResult { get; set; }
    public string? DentalResult { get; set; }
    public int? DentalCavityCount { get; set; }
    public string? SpineResult { get; set; } // Cột sống: Bình thường/Vẹo/Gù
    public string? SkinResult { get; set; }
    public string? HeartLungResult { get; set; }
    public string? MentalHealthResult { get; set; }
    public string? OverallResult { get; set; } // Loại I-IV
    public string? Recommendations { get; set; }
    public string? DoctorName { get; set; }
    public string? Notes { get; set; }
    public int Status { get; set; } // 0=Pending, 1=Completed
}

// ======= Occupational Health (Sức khỏe nghề nghiệp) =======
public class OccupationalHealthExam : BaseEntity
{
    public Guid? PatientId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? EmployeeCode { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? CompanyTaxCode { get; set; }
    public string? Department { get; set; } // Bộ phận
    public string? JobTitle { get; set; } // Chức danh
    public string? HazardExposure { get; set; } // Yếu tố tiếp xúc: Bụi, Hóa chất, Tiếng ồn, etc.
    public int ExposureYears { get; set; }
    public DateTime ExamDate { get; set; }
    public string ExamType { get; set; } = string.Empty; // PreEmployment, Periodic, PostExposure, Return
    public string? GeneralHealth { get; set; }
    public string? RespiratoryResult { get; set; } // Spirometry
    public string? HearingResult { get; set; } // Audiometry
    public string? VisionResult { get; set; }
    public string? SkinResult { get; set; }
    public string? LabResults { get; set; } // JSON: blood lead, urine cotinine, etc.
    public string? XrayResult { get; set; }
    public string? OccupationalDisease { get; set; } // Bệnh nghề nghiệp phát hiện
    public string? DiseaseCode { get; set; } // ICD-10
    public string? Classification { get; set; } // Đủ SK / Không đủ SK / Hạn chế
    public string? Recommendations { get; set; }
    public string? DoctorName { get; set; }
    public int Status { get; set; } // 0=Pending, 1=Completed, 2=NeedFollowUp
    public string? Notes { get; set; }
    public virtual Patient? Patient { get; set; }
}

// ======= Methadone Treatment (Điều trị Methadone) =======
public class MethadonePatient : BaseEntity
{
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty; // Mã BN Methadone
    public DateTime EnrollmentDate { get; set; }
    public DateTime? DischargeDate { get; set; }
    public string? DischargeReason { get; set; }
    public float CurrentDoseMg { get; set; }
    public string Phase { get; set; } = string.Empty; // Induction, Stabilization, Maintenance, Tapering
    public int Status { get; set; } // 0=Active, 1=Suspended, 2=Discharged, 3=Transferred
    public string? TransferredFrom { get; set; }
    public string? TransferredTo { get; set; }
    public int MissedDoseCount { get; set; }
    public DateTime? LastDosingDate { get; set; }
    public string? Notes { get; set; }
    public virtual Patient? Patient { get; set; }
    public virtual ICollection<MethadoneDosingRecord> DosingRecords { get; set; } = new List<MethadoneDosingRecord>();
    public virtual ICollection<MethadoneUrineTest> UrineTests { get; set; } = new List<MethadoneUrineTest>();
}

public class MethadoneDosingRecord : BaseEntity
{
    public Guid MethadonePatientId { get; set; }
    public DateTime DosingDate { get; set; }
    public float DoseMg { get; set; }
    public bool Witnessed { get; set; } // Uống trước mặt NV
    public bool TakeHome { get; set; } // Mang về
    public string? AdministeredBy { get; set; }
    public string? Notes { get; set; }
    public int Status { get; set; } // 0=Given, 1=Missed, 2=Refused, 3=Holiday
    public virtual MethadonePatient? MethadonePatient { get; set; }
}

public class MethadoneUrineTest : BaseEntity
{
    public Guid MethadonePatientId { get; set; }
    public DateTime TestDate { get; set; }
    public bool IsRandom { get; set; }
    public string? Morphine { get; set; } // Positive/Negative
    public string? Amphetamine { get; set; }
    public string? Methamphetamine { get; set; }
    public string? THC { get; set; }
    public string? Benzodiazepine { get; set; }
    public string? Methadone { get; set; }
    public string? OverallResult { get; set; }
    public string? Notes { get; set; }
    public virtual MethadonePatient? MethadonePatient { get; set; }
}
