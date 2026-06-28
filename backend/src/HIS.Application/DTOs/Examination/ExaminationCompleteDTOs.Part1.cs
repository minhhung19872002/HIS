namespace HIS.Application.DTOs.Examination;


/// <summary>
/// DTO hiển thị màn hình chờ phòng khám
/// </summary>
public class WaitingRoomDisplayDto
{
    public Guid RoomId { get; set; }
    public string RoomCode { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }

    // Bác sĩ đang khám
    public string? DoctorName { get; set; }
    public string? DoctorTitle { get; set; }

    // Số hiện tại đang khám
    public int? CurrentNumber { get; set; }
    public string? CurrentPatientName { get; set; }

    // Danh sách số đang gọi
    public List<CallingPatientDto> CallingList { get; set; } = new();

    // Danh sách chờ
    public List<WaitingPatientDto> WaitingList { get; set; } = new();

    // Thống kê
    public int TotalWaiting { get; set; }
    public int TotalWaitingResult { get; set; }
    public int TotalCompleted { get; set; }

    // Cấu hình hiển thị
    public string? BackgroundColor { get; set; }
    public string? TextColor { get; set; }
}

public class CallingPatientDto
{
    public int QueueNumber { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public int CalledCount { get; set; }
    public DateTime? CalledAt { get; set; }
}

public class WaitingPatientDto
{
    public Guid ExaminationId { get; set; }
    public int QueueNumber { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public int Priority { get; set; }
    public bool IsInsurance { get; set; }
    public bool IsChronic { get; set; }
    public int Status { get; set; } // 0-Chờ khám, 2-Chờ kết luận
    public bool IsDoingLab { get; set; }
    public int WaitingMinutes { get; set; }
}



/// <summary>
/// DTO danh sách bệnh nhân phòng khám chi tiết
/// </summary>
public class RoomPatientListDto
{
    public Guid ExaminationId { get; set; }
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public int Gender { get; set; }
    public string GenderName { get; set; } = string.Empty;
    public int Age { get; set; }

    // Ảnh chân dung
    public string? PhotoUrl { get; set; }

    // Thông tin BHYT
    public int PatientType { get; set; }
    public string PatientTypeName { get; set; } = string.Empty;
    public string? InsuranceNumber { get; set; }
    public bool IsInsuranceValid { get; set; }

    // Trạng thái đặc biệt
    public bool IsChronic { get; set; } // Bệnh mãn tính
    public bool IsPriority { get; set; }
    public bool IsEmergency { get; set; }
    public bool HasDebt { get; set; } // Nợ viện phí
    public bool HasUnpaidServices { get; set; } // Chưa thanh toán tiền khám

    // Hàng đợi
    public int QueueNumber { get; set; }
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;

    // Trạng thái CLS
    public int TotalLabOrders { get; set; }
    public int CompletedLabOrders { get; set; }
    public bool HasPendingLabs { get; set; }
    public List<LabStatusDto> LabStatuses { get; set; } = new();

    // Chẩn đoán sơ bộ
    public string? PreliminaryDiagnosis { get; set; }
}

public class LabStatusDto
{
    public Guid RequestId { get; set; }
    public string TestCode { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int Status { get; set; } // 0-Chờ, 1-Đang làm, 2-Có kết quả
    public string StatusName { get; set; } = string.Empty;
    public bool HasResult { get; set; }
    public DateTime? RequestedAt { get; set; }
    public DateTime? EstimatedCompletionTime { get; set; }
}

/// <summary>
/// DTO kết quả CLS của bệnh nhân
/// </summary>
public class PatientLabResultsDto
{
    public Guid PatientId { get; set; }
    public Guid ExaminationId { get; set; }

    public List<LabResultSummaryDto> LabResults { get; set; } = new();
    public List<ImagingResultSummaryDto> ImagingResults { get; set; } = new();
}

public class LabResultSummaryDto
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string TestCode { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string? ResultValue { get; set; }
    public string? Unit { get; set; }
    public string? ReferenceRange { get; set; }
    public bool IsAbnormal { get; set; }
    public DateTime? ResultDate { get; set; }
    public int Status { get; set; }
    public List<LabResultItemDto> Items { get; set; } = new();
}

public class LabResultItemDto
{
    public string TestName { get; set; } = string.Empty;
    public string? Result { get; set; }
    public string? Unit { get; set; }
    public string? ReferenceRange { get; set; }
    public bool IsAbnormal { get; set; }
    public int? AbnormalType { get; set; } // 1-Cao, 2-Thấp, 3-Nguy kịch
    public string? Flag { get; set; }      // R1: N/H/L/HH/LL
}

/// <summary>R1: input 1 chỉ số XN khi KTV/analyzer ghi KQ per-parameter. Min/Max/Flag BE tự suy từ catalog
/// (LisTestParameter theo ServiceId) nếu không truyền. Optional — bỏ trống thì giữ hành vi ghi 1 chuỗi cũ.</summary>
public class LabResultParameterInputDto
{
    public string ParameterCode { get; set; } = string.Empty;
    public string ParameterName { get; set; } = string.Empty;
    public string? Value { get; set; }
    public string? Unit { get; set; }
    public decimal? ReferenceMin { get; set; }
    public decimal? ReferenceMax { get; set; }
}

public class ImagingResultSummaryDto
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string ExamCode { get; set; } = string.Empty;
    public string ExamName { get; set; } = string.Empty;
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string? Modality { get; set; }
    public string? Findings { get; set; }
    public DateTime? ResultDate { get; set; }
    public string? Conclusion { get; set; }
    public int Status { get; set; }
    public List<string> ImageUrls { get; set; } = new();
}



/// <summary>
/// DTO hồ sơ bệnh án đầy đủ
/// </summary>
public class MedicalRecordFullDto
{
    public Guid Id { get; set; }
    public string MedicalRecordCode { get; set; } = string.Empty;

    // Thông tin bệnh nhân
    public PatientInfoDto Patient { get; set; } = new();

    // Dấu hiệu sinh tồn
    public VitalSignsFullDto? VitalSigns { get; set; }

    // Thông tin hỏi bệnh
    public MedicalInterviewDto? Interview { get; set; }

    // Khám toàn thân và bộ phận
    public PhysicalExaminationDto? PhysicalExam { get; set; }

    // Chẩn đoán
    public List<DiagnosisFullDto> Diagnoses { get; set; } = new();

    // Chỉ định dịch vụ
    public List<ServiceOrderFullDto> ServiceOrders { get; set; } = new();

    // Đơn thuốc
    public List<PrescriptionFullDto> Prescriptions { get; set; } = new();

    // Lịch sử khám
    public List<MedicalHistoryDto> History { get; set; } = new();

    // Thông tin dị ứng và chống chỉ định
    public List<AllergyDto> Allergies { get; set; } = new();
    public List<ContraindicationDto> Contraindications { get; set; } = new();

    // Kết luận
    public ExaminationConclusionDto? Conclusion { get; set; }
}

public class PatientInfoDto
{
    public Guid Id { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public int Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public int Age { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string? Occupation { get; set; }
    public string? PhotoUrl { get; set; }
}

/// <summary>
/// DTO dấu hiệu sinh tồn đầy đủ
/// </summary>
public class VitalSignsFullDto
{
    public decimal? Weight { get; set; } // kg
    public decimal? Height { get; set; } // cm
    public decimal? BMI { get; set; }
    public string? BMIClassification { get; set; }

    public int? SystolicBP { get; set; } // mmHg
    public int? DiastolicBP { get; set; }
    public string? BPClassification { get; set; }

    public int? Pulse { get; set; } // lần/phút
    public decimal? Temperature { get; set; } // độ C
    public int? RespiratoryRate { get; set; } // lần/phút
    public int? SpO2 { get; set; } // %

    public decimal? BloodGlucose { get; set; } // mmol/L
    public string? GlucoseType { get; set; } // Đói, sau ăn

    public string? Notes { get; set; }
    public DateTime MeasuredAt { get; set; }
    public string? MeasuredBy { get; set; }
}

/// <summary>
/// DTO thông tin hỏi bệnh
/// </summary>
public class MedicalInterviewDto
{
    public string? ChiefComplaint { get; set; } // Lý do đến khám
    public string? HistoryOfPresentIllness { get; set; } // Bệnh sử
    public string? PastMedicalHistory { get; set; } // Tiền sử bệnh
    public string? FamilyHistory { get; set; } // Tiền sử gia đình
    public string? SocialHistory { get; set; } // Tiền sử xã hội (hút thuốc, rượu bia)
    public string? SurgicalHistory { get; set; } // Tiền sử phẫu thuật
    public string? ObstetricHistory { get; set; } // Tiền sử sản khoa (nếu là nữ)
    public string? MedicationHistory { get; set; } // Thuốc đang dùng
    public string? AllergyHistory { get; set; } // Tiền sử dị ứng
}

/// <summary>
/// DTO khám toàn thân và bộ phận
/// </summary>
public class PhysicalExaminationDto
{
    public string? ChiefComplaint { get; set; } // Lý do đến khám
    public string? GeneralAppearance { get; set; } // Tổng quát
    public string? Skin { get; set; } // Da, niêm mạc
    public string? HeadNeck { get; set; } // Đầu, cổ
    public string? Eyes { get; set; } // Mắt
    public string? ENT { get; set; } // Tai mũi họng
    public string? Cardiovascular { get; set; } // Tim mạch
    public string? Respiratory { get; set; } // Hô hấp
    public string? Gastrointestinal { get; set; } // Tiêu hóa
    public string? Genitourinary { get; set; } // Tiết niệu sinh dục
    public string? Musculoskeletal { get; set; } // Cơ xương khớp
    public string? Neurological { get; set; } // Thần kinh
    public string? Psychiatric { get; set; } // Tâm thần
    public string? Lymphatic { get; set; } // Hạch
    public string? OtherFindings { get; set; } // Khác

    // Template đã dùng
    public Guid? TemplateId { get; set; }
    public string? TemplateName { get; set; }
}

/// <summary>
/// DTO mẫu thông tin thăm khám
/// </summary>
public class ExaminationTemplateDto
{
    public Guid Id { get; set; }
    public string TemplateName { get; set; } = string.Empty;
    public string? TemplateCode { get; set; }
    public string? Description { get; set; }
    public int TemplateType { get; set; } // 1-Cá nhân, 2-Khoa, 3-Bệnh viện
    public Guid? DepartmentId { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public bool IsPublic { get; set; }

    public PhysicalExaminationDto Content { get; set; } = new();
    public bool IsDefault { get; set; }
}

/// <summary>
/// DTO thông tin dị ứng
/// </summary>
public class AllergyDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public int AllergyType { get; set; } // 1-Thuốc, 2-Thức ăn, 3-Khác
    public string AllergenName { get; set; } = string.Empty;
    public string? AllergenCode { get; set; }
    public string? Reaction { get; set; }
    public int Severity { get; set; } // 1-Nhẹ, 2-Trung bình, 3-Nặng
    public DateTime? ReportedDate { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO thông tin chống chỉ định
/// </summary>
public class ContraindicationDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public int ContraindicationType { get; set; } // 1-Thuốc, 2-Dịch vụ, 3-Khác
    public string Name { get; set; } = string.Empty;
    public string? ItemName { get; set; }
    public string? ItemCode { get; set; }
    public string? Description { get; set; }
    public string? Reason { get; set; }
    public string? Notes { get; set; }
    public DateTime? ReportedDate { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO tờ điều trị
/// </summary>
public class TreatmentSheetDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }
    public DateTime? TreatmentDate { get; set; }
    public int DayNumber { get; set; }
    public int Day { get; set; }

    public string? DailyProgress { get; set; } // Diễn biến trong ngày
    public string? TreatmentOrders { get; set; } // Y lệnh điều trị
    public string? DoctorOrders { get; set; } // Y lệnh bác sĩ
    public string? DietOrders { get; set; } // Chế độ ăn
    public string? NursingCare { get; set; } // Chăm sóc điều dưỡng
    public string? PatientCondition { get; set; } // Tình trạng bệnh nhân
    public string? DoctorNotes { get; set; } // Ghi chú của bác sĩ
    public string? Notes { get; set; }

    public VitalSignsFullDto? VitalSigns { get; set; }
    public List<MedicationOrderDto> Medications { get; set; } = new();

    public Guid? DoctorId { get; set; }
    public string? DoctorName { get; set; }
    public Guid? NurseId { get; set; }
    public string? NurseName { get; set; }
}

/// <summary>
/// DTO biên bản hội chẩn
/// </summary>
public class ConsultationRecordDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }
    public DateTime? ConsultationDate { get; set; }
    public int ConsultationType { get; set; } // 1-Hội chẩn khoa, 2-Liên khoa, 3-Bệnh viện

    public string? Reason { get; set; }
    public string? Summary { get; set; }
    public string? Conclusion { get; set; }
    public string? Recommendations { get; set; }
    public string? TreatmentPlan { get; set; }
    public string? Participants { get; set; }

    public List<ConsultantDto> Consultants { get; set; } = new();
    public Guid? PresidedByUserId { get; set; }
    public string? PresidedByName { get; set; }
    public Guid? SecretaryUserId { get; set; }
    public string? SecretaryName { get; set; }
    public string? Chairman { get; set; }
    public string? Secretary { get; set; }
}

public class ConsultantDto
{
    public Guid DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public string? Specialty { get; set; }
    public string? Opinion { get; set; }
}

/// <summary>
/// DTO phiếu chăm sóc
/// </summary>
public class NursingCareSheetDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }
    public DateTime? CareDate { get; set; }
    public TimeSpan? CareTime { get; set; }
    public int Shift { get; set; } // 1-Sáng, 2-Chiều, 3-Đêm

    // Vital signs
    public decimal? Temperature { get; set; }
    public int? Pulse { get; set; }
    public int? BloodPressureSystolic { get; set; }
    public int? BloodPressureDiastolic { get; set; }
    public int? RespiratoryRate { get; set; }
    public decimal? SpO2 { get; set; }

    public string? PatientCondition { get; set; }
    public string? NursingAssessment { get; set; }
    public string? NursingDiagnosis { get; set; }
    public string? NursingInterventions { get; set; }
    public string? Evaluation { get; set; }
    public string? PatientResponse { get; set; }
    public string? Notes { get; set; }

    public VitalSignsFullDto? VitalSigns { get; set; }

    // Phân cấp chăm sóc: 1 = Cấp 1, 2 = Cấp 2, null = chưa phân cấp
    public int? CareLevel { get; set; }

    public Guid? NurseId { get; set; }
    public string? NurseName { get; set; }
}

/// <summary>
/// DTO thông tin tai nạn thương tích
/// </summary>
public class InjuryInfoDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }

    public int InjuryType { get; set; } // 1-Tai nạn giao thông, 2-Tai nạn lao động, 3-Bạo lực, 4-Khác
    public DateTime? InjuryDate { get; set; }
    public TimeSpan? InjuryTime { get; set; }
    public string? InjuryLocation { get; set; }
    public string? InjuryCause { get; set; }
    public string? InjuryDescription { get; set; }
    public string? FirstAid { get; set; }
    public string? Witness { get; set; }
    public string? Notes { get; set; }

    // Báo cáo công an (nếu có)
    public bool IsReportedToPolice { get; set; }
    public bool HasPoliceReport { get; set; }
    public string? PoliceReportNumber { get; set; }

    // F1.6 — Truong phap ly TNGT (Bieu 14.5 SYT)
    public bool? HelmetWorn { get; set; }
    public string? AlcoholLevel { get; set; }
    public string? VehicleTypeSelf { get; set; }
    public string? VehicleTypeCauser { get; set; }
    public string? VehicleTypeVictim { get; set; }
}



/// <summary>
/// DTO chẩn đoán đầy đủ
/// </summary>
public class DiagnosisFullDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }

    public int DiagnosisType { get; set; } // 1-Ban đầu, 2-Xác định, 3-Ra viện
    public string DiagnosisTypeName => DiagnosisType switch
    {
        1 => "Chẩn đoán ban đầu",
        2 => "Chẩn đoán xác định",
        3 => "Chẩn đoán ra viện",
        _ => ""
    };

    public bool IsPrimary { get; set; } // Bệnh chính
    public string IcdCode { get; set; } = string.Empty;
    public string IcdName { get; set; } = string.Empty;
    public string? CustomDiagnosis { get; set; } // Tên bệnh tùy chỉnh

    // Nguyên nhân ngoài (nếu có)
    public string? ExternalCauseCode { get; set; }
    public string? ExternalCauseName { get; set; }

    public int Order { get; set; } // Thứ tự
    public DateTime DiagnosedAt { get; set; }
    public string? DiagnosedBy { get; set; }
}

/// <summary>
/// DTO cập nhật chẩn đoán
/// </summary>
public class UpdateDiagnosisDto
{
    public string? PreliminaryDiagnosis { get; set; }
    public string? PrimaryIcdCode { get; set; }
    public string? PrimaryDiagnosis { get; set; }
    public List<SecondaryDiagnosisDto> SecondaryDiagnoses { get; set; } = new();
    public string? ExternalCauseCode { get; set; }
    public string? ExternalCauseName { get; set; }
}

public class SecondaryDiagnosisDto
{
    public string IcdCode { get; set; } = string.Empty;
    public string? DiagnosisName { get; set; }
}

/// <summary>
/// DTO mã ICD
/// </summary>
public class IcdCodeFullDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? EnglishName { get; set; }
    public int IcdType { get; set; } // 1-ICD-10, 2-ICD-9
    public string? ChapterCode { get; set; }
    public string? ChapterName { get; set; }
    public string? GroupCode { get; set; }
    public string? GroupName { get; set; }
    public bool IsActive { get; set; }
    public bool RequiresExternalCause { get; set; }
}



/// <summary>
/// DTO khám thêm
/// </summary>
public class AdditionalExaminationDto
{
    public Guid OriginalExaminationId { get; set; }
    public Guid NewRoomId { get; set; }
    public Guid? NewDoctorId { get; set; }

    public int ExamType { get; set; } // 1-Khám thêm, 2-Chuyển khám chính, 3-Khám thêm kết hợp chuyển khoa
    public int PaymentType { get; set; } // 1-BHYT, 2-Viện phí, 3-Dịch vụ

    public string? Diagnosis { get; set; }
    public string? Reason { get; set; }
}

/// <summary>
/// DTO chuyển phòng khám
/// </summary>
public class TransferRoomRequestDto
{
    public Guid ExaminationId { get; set; }
    public Guid NewRoomId { get; set; }
    public Guid? NewDoctorId { get; set; }
    public string? Reason { get; set; }
    public bool KeepOriginalQueue { get; set; }
}


