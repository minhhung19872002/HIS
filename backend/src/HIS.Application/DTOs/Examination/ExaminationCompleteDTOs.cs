namespace HIS.Application.DTOs.Examination;

#region 2.1 Màn hình chờ phòng khám

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

#endregion

#region 2.2 Danh sách bệnh nhân phòng khám

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
    public int? AbnormalType { get; set; } // 1-Cao, 2-Thấp
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

#endregion

#region 2.3 Chức năng khám bệnh

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
}

#endregion

#region 2.4 Chẩn đoán

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

#endregion

#region 2.5 Khám thêm

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

#endregion

#region 2.6 Chỉ định dịch vụ

/// <summary>
/// DTO chỉ định dịch vụ đầy đủ
/// </summary>
public class ServiceOrderFullDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }
    public DateTime OrderDate { get; set; }

    // Chẩn đoán đi kèm
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }

    // Thông tin dịch vụ
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int ServiceType { get; set; } // 1-XN, 2-CĐHA, 3-TDCN, 4-PTTT, 5-Khác
    public int Quantity { get; set; }

    // Giá
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public decimal InsurancePrice { get; set; }
    public decimal PatientPrice { get; set; }
    public decimal? Surcharge { get; set; }

    // Phòng thực hiện
    public Guid? RoomId { get; set; }
    public string? RoomName { get; set; }

    // Đối tượng thanh toán
    public int PaymentType { get; set; } // 1-BHYT, 2-Viện phí, 3-Dịch vụ
    public Guid? PayerSourceId { get; set; }

    // Ưu tiên
    public bool IsPriority { get; set; }
    public bool IsEmergency { get; set; }

    // Trạng thái
    public int Status { get; set; } // 0-Chờ, 1-Đang thực hiện, 2-Có kết quả, 3-Hủy
    public string StatusName => Status switch
    {
        0 => "Chờ thực hiện",
        1 => "Đang thực hiện",
        2 => "Có kết quả",
        3 => "Đã hủy",
        _ => ""
    };

    // Ghi chú
    public string? OrderNotes { get; set; }
    public string? ServiceNotes { get; set; }

    // Người chỉ định
    public Guid OrderedById { get; set; }
    public string? OrderedByName { get; set; }
    public Guid? ConsultantId { get; set; }
    public string? ConsultantName { get; set; }

    // Kết quả (nếu có)
    public string? Result { get; set; }
    public DateTime? ResultDate { get; set; }
}

/// <summary>
/// DTO tạo chỉ định dịch vụ
/// </summary>
public class CreateServiceOrderDto
{
    public Guid ExaminationId { get; set; }

    // Chẩn đoán
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }

    // Danh sách dịch vụ
    public List<ServiceOrderItemDto> Services { get; set; } = new();

    // Cấu hình
    public bool AutoSelectRoom { get; set; } = true;
    public bool CalculateOptimalPath { get; set; } = false;
}

public class ServiceOrderItemDto
{
    public Guid ServiceId { get; set; }
    public int Quantity { get; set; } = 1;
    public Guid? RoomId { get; set; }
    public int PaymentType { get; set; }
    public Guid? PayerSourceId { get; set; }
    public bool IsPriority { get; set; }
    public bool IsEmergency { get; set; }
    public string? Notes { get; set; }
    public decimal? Surcharge { get; set; }
}

/// <summary>
/// DTO nhóm dịch vụ
/// </summary>
public class ServiceGroupTemplateDto
{
    public Guid Id { get; set; }
    public string? TemplateCode { get; set; }
    public string TemplateName { get; set; } = string.Empty;
    public string GroupCode { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public int GroupType { get; set; } // 1-Cá nhân, 2-Khoa, 3-Bệnh viện
    public Guid? DepartmentId { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public bool IsPublic { get; set; }

    public List<Guid> ServiceIds { get; set; } = new();
    public List<ServiceGroupTemplateItemDto> Services { get; set; } = new();
    public bool IsDefault { get; set; }
}

public class ServiceGroupTemplateItemDto
{
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO gói dịch vụ
/// </summary>
public class ServicePackageDto
{
    public Guid Id { get; set; }
    public string PackageCode { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;
    public decimal PackagePrice { get; set; }

    public List<ServicePackageItemDto> Services { get; set; } = new();
}

public class ServicePackageItemDto
{
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

/// <summary>
/// DTO cảnh báo chỉ định
/// </summary>
public class ServiceOrderWarningDto
{
    public int WarningType { get; set; }
    public string WarningTypeName => WarningType switch
    {
        1 => "Trùng dịch vụ trong ngày",
        2 => "Hết tiền tạm ứng",
        3 => "HBA1C chưa đủ thời gian (TT35)",
        4 => "Vượt gói dịch vụ",
        5 => "Ngoài phác đồ",
        _ => ""
    };
    public string Message { get; set; } = string.Empty;
    public bool IsBlocking { get; set; }
    public Guid? RelatedServiceId { get; set; }
    public DateTime? LastOrderDate { get; set; }
}

#endregion

#region 2.7 Kê đơn thuốc

/// <summary>
/// DTO đơn thuốc đầy đủ
/// </summary>
public class PrescriptionFullDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }
    public DateTime PrescriptionDate { get; set; }
    public int PrescriptionType { get; set; } // 1-Ngoại trú, 2-Nội trú, 3-YHCT, 4-Mua ngoài

    // Chẩn đoán
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }

    // Kho xuất
    public Guid? WarehouseId { get; set; }
    public string? WarehouseName { get; set; }

    // Số ngày đơn
    public int TotalDays { get; set; }

    // Danh sách thuốc
    public List<PrescriptionItemFullDto> Items { get; set; } = new();

    // Tổng tiền
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    // Đối tượng
    public int PaymentType { get; set; }

    // Lời dặn
    public string? Instructions { get; set; }

    // Trạng thái
    public int Status { get; set; } // 0-Chờ duyệt, 1-Đã duyệt, 2-Đã phát, 3-Hủy
    public string StatusName => Status switch
    {
        0 => "Chờ duyệt",
        1 => "Đã duyệt",
        2 => "Đã phát thuốc",
        3 => "Đã hủy",
        _ => ""
    };

    // Người kê
    public Guid PrescribedById { get; set; }
    public string? PrescribedByName { get; set; }
}

/// <summary>
/// DTO chi tiết thuốc trong đơn
/// </summary>
public class PrescriptionItemFullDto
{
    public Guid Id { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; }
    public string? Manufacturer { get; set; }
    public string? Country { get; set; }

    // Số lượng
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = string.Empty;
    public int Days { get; set; }

    // Liều dùng
    public string? Dosage { get; set; }
    public string? Route { get; set; } // Đường dùng
    public string? Frequency { get; set; }
    public string? UsageInstructions { get; set; }

    // Giá
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public decimal InsurancePrice { get; set; }
    public decimal PatientPrice { get; set; }

    // Thông tin lô
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    // Đối tượng
    public int PaymentType { get; set; }

    // Trạng thái kho
    public decimal AvailableQuantity { get; set; }
    public bool IsOutOfStock { get; set; }
}

/// <summary>
/// DTO tạo đơn thuốc
/// </summary>
public class CreatePrescriptionDto
{
    public Guid ExaminationId { get; set; }
    public int PrescriptionType { get; set; }

    // Chẩn đoán
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }

    // Kho xuất
    public Guid? WarehouseId { get; set; }

    // Số ngày
    public int TotalDays { get; set; }

    // Danh sách thuốc
    public List<CreatePrescriptionItemDto> Items { get; set; } = new();

    // Lời dặn
    public string? Instructions { get; set; }
}

public class CreatePrescriptionItemDto
{
    public Guid MedicineId { get; set; }
    public decimal Quantity { get; set; }
    public int Days { get; set; }
    public string? Dosage { get; set; }
    public string? Route { get; set; }
    public string? Frequency { get; set; }
    public string? UsageInstructions { get; set; }
    public int PaymentType { get; set; }
}

/// <summary>
/// DTO mẫu đơn thuốc
/// </summary>
public class PrescriptionTemplateDto
{
    public Guid Id { get; set; }
    public string? TemplateCode { get; set; }
    public string TemplateName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TemplateType { get; set; } // 1-Cá nhân, 2-Khoa, 3-Bệnh viện
    public Guid? DepartmentId { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public bool IsPublic { get; set; }

    public List<CreatePrescriptionItemDto> Items { get; set; } = new();
    public List<PrescriptionTemplateItemDto> TemplateItems { get; set; } = new();
    public string? Instructions { get; set; }
    public bool IsShared { get; set; }
}

public class PrescriptionTemplateItemDto
{
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public int Days { get; set; }
    public string? Dosage { get; set; }
    public string? Route { get; set; }
    public string? Frequency { get; set; }
    public string? UsageInstructions { get; set; }
}

/// <summary>
/// DTO tương tác thuốc
/// </summary>
public class DrugInteractionDto
{
    public Guid Medicine1Id { get; set; }
    public string Medicine1Name { get; set; } = string.Empty;
    public Guid Medicine2Id { get; set; }
    public string Medicine2Name { get; set; } = string.Empty;
    public Guid Drug1Id { get; set; }
    public string Drug1Name { get; set; } = string.Empty;
    public Guid Drug2Id { get; set; }
    public string Drug2Name { get; set; } = string.Empty;

    public string? InteractionType { get; set; }
    public int Severity { get; set; } // 1-Nhẹ, 2-Trung bình, 3-Nặng, 4-Chống chỉ định
    public string SeverityName => Severity switch
    {
        1 => "Nhẹ",
        2 => "Trung bình",
        3 => "Nặng",
        4 => "Chống chỉ định",
        _ => ""
    };
    public string SeverityColor => Severity switch
    {
        1 => "#52c41a",
        2 => "#faad14",
        3 => "#fa8c16",
        4 => "#f5222d",
        _ => ""
    };

    public string? Description { get; set; }
    public string? Recommendation { get; set; }
}

/// <summary>
/// DTO cảnh báo kê đơn
/// </summary>
public class PrescriptionWarningDto
{
    public Guid MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public string WarningType { get; set; } = string.Empty;
    public int WarningTypeCode { get; set; }
    public string WarningTypeName => WarningTypeCode switch
    {
        1 => "Ngoài phác đồ",
        2 => "Trùng thuốc trong ngày",
        3 => "Tương tác thuốc",
        4 => "Trùng nhóm kháng sinh",
        5 => "Vượt số ngày BHYT",
        6 => "Vượt trần BHYT",
        7 => "Vượt chi phí gói",
        8 => "Dị ứng thuốc",
        9 => "Chống chỉ định",
        _ => ""
    };
    public string Message { get; set; } = string.Empty;
    public int Severity { get; set; }
    public string? Recommendation { get; set; }
    public bool IsBlocking { get; set; }
    public Guid? RelatedMedicineId { get; set; }
}

/// <summary>
/// DTO thư viện lời dặn
/// </summary>
public class InstructionLibraryDto
{
    public Guid Id { get; set; }
    public string? Code { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Instruction { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsDefault { get; set; }
    public Guid? CreatedByUserId { get; set; }
}

#endregion

#region 2.8 Kết luận khám bệnh

/// <summary>
/// DTO kết luận khám bệnh
/// </summary>
public class ExaminationConclusionDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }

    public int ConclusionType { get; set; }
    // 1-Cấp đơn cho về, 2-Cho về, 3-Nhập viện, 4-Chuyển viện, 5-Tử vong
    // 6-Hẹn khám mới, 7-Hẹn khám tiếp, 8-Khác
    public string ConclusionTypeName => ConclusionType switch
    {
        1 => "Cấp đơn cho về",
        2 => "Cho về",
        3 => "Nhập viện",
        4 => "Chuyển viện",
        5 => "Tử vong",
        6 => "Hẹn khám mới",
        7 => "Hẹn khám tiếp",
        8 => "Khác",
        _ => ""
    };

    public string? ConclusionNotes { get; set; }

    // Thông tin nhập viện (nếu có)
    public Guid? AdmissionDepartmentId { get; set; }
    public string? AdmissionDepartmentName { get; set; }
    public string? AdmissionReason { get; set; }

    // Thông tin chuyển viện (nếu có)
    public string? TransferToFacility { get; set; }
    public string? TransferReason { get; set; }

    // Thông tin hẹn khám (nếu có)
    public DateTime? NextAppointmentDate { get; set; }
    public string? AppointmentNotes { get; set; }

    // Nghỉ ốm (nếu có)
    public int? SickLeaveDays { get; set; }
    public DateTime? SickLeaveFromDate { get; set; }
    public DateTime? SickLeaveToDate { get; set; }

    public DateTime ConcludedAt { get; set; }
    public string? ConcludedBy { get; set; }
}

/// <summary>
/// DTO hoàn thành khám bệnh
/// </summary>
public class CompleteExaminationDto
{
    public int ConclusionType { get; set; }
    public string? ConclusionNotes { get; set; }

    // Nhập viện
    public Guid? AdmissionDepartmentId { get; set; }
    public string? AdmissionReason { get; set; }

    // Chuyển viện
    public string? TransferToFacility { get; set; }
    public string? TransferReason { get; set; }

    // Hẹn khám
    public DateTime? NextAppointmentDate { get; set; }
    public string? AppointmentNotes { get; set; }

    // Nghỉ ốm
    public int? SickLeaveDays { get; set; }

    // Chẩn đoán cuối cùng
    public string? FinalDiagnosisCode { get; set; }
    public string? FinalDiagnosisName { get; set; }
}

#endregion

#region 2.9 Quản lý và báo cáo

/// <summary>
/// DTO thống kê khám bệnh
/// </summary>
public class ExaminationStatisticsDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public int TotalExaminations { get; set; }
    public int InsuranceExaminations { get; set; }
    public int FeeExaminations { get; set; }

    // Theo trạng thái
    public int PendingCount { get; set; }
    public int InProgressCount { get; set; }
    public int WaitingResultCount { get; set; }
    public int CompletedCount { get; set; }

    // Theo kết luận
    public int DischargedHomeCount { get; set; }
    public int HospitalizedCount { get; set; }
    public int TransferredCount { get; set; }
    public int ReexaminationCount { get; set; }

    // Thời gian
    public double AverageWaitingTime { get; set; } // phút
    public double AverageExaminationTime { get; set; } // phút

    // Theo khoa/phòng
    public Dictionary<string, int> ByDepartment { get; set; } = new();
    public Dictionary<string, int> ByRoom { get; set; } = new();

    // Theo bác sĩ
    public List<DoctorExaminationStatDto> ByDoctor { get; set; } = new();
}

public class DoctorExaminationStatDto
{
    public Guid DoctorId { get; set; }
    public string DoctorCode { get; set; } = string.Empty;
    public string DoctorName { get; set; } = string.Empty;
    public int TotalExaminations { get; set; }
    public int InsuranceExaminations { get; set; }
    public int FeeExaminations { get; set; }
    public int ServiceExaminations { get; set; }
    public int CompletedCount { get; set; }
    public int PendingCount { get; set; }
    public double AverageExaminationTime { get; set; }
}

/// <summary>
/// DTO báo cáo bệnh truyền nhiễm
/// </summary>
public class CommunicableDiseaseReportDto
{
    public Guid ExaminationId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public int Age { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string IcdCode { get; set; } = string.Empty;
    public string DiseaseName { get; set; } = string.Empty;
    public DateTime DiagnosisDate { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO nhật ký hoạt động khám bệnh
/// </summary>
public class ExaminationActivityLogDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string ActionDescription { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public DateTime ActionTime { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string? IpAddress { get; set; }
}

/// <summary>
/// DTO cấu hình màn hình chờ
/// </summary>
public class WaitingRoomDisplayConfigDto
{
    public Guid RoomId { get; set; }
    public string? DisplayTitle { get; set; }
    public int DisplayRows { get; set; }
    public bool ShowPatientName { get; set; }
    public bool ShowPatientCode { get; set; }
    public bool EnableVoiceCall { get; set; }
    public int CallIntervalSeconds { get; set; }
    public string? BackgroundColor { get; set; }
    public string? TextColor { get; set; }
}

/// <summary>
/// DTO sổ khám bệnh (QĐ 4069)
/// </summary>
public class ExaminationRegisterDto
{
    public int RowNumber { get; set; }
    public DateTime ExaminationDate { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public int Age { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? InsuranceNumber { get; set; }
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public string? TreatmentResult { get; set; }
    public string? DoctorName { get; set; }
    public string? Notes { get; set; }
}

#endregion

#region Y lệnh thuốc cho nội trú

/// <summary>
/// DTO y lệnh thuốc
/// </summary>
public class MedicationOrderDto
{
    public Guid Id { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;

    public decimal MorningDose { get; set; }
    public decimal NoonDose { get; set; }
    public decimal AfternoonDose { get; set; }
    public decimal EveningDose { get; set; }
    public decimal TotalDailyDose { get; set; }

    public string Unit { get; set; } = string.Empty;
    public string? Route { get; set; }
    public string? Notes { get; set; }
}

#endregion
