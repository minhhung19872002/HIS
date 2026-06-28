using System.ComponentModel.DataAnnotations;
using HIS.Application.Common;

namespace HIS.Application.DTOs.Reception;


/// <summary>
/// DTO đăng ký cấp cứu
/// </summary>
public class EmergencyRegistrationDto
{
    // Có thể không có thông tin đầy đủ
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public int? Gender { get; set; }
    public int? EstimatedAge { get; set; }
    public string? IdentityNumber { get; set; }
    public string? PhoneNumber { get; set; }

    // BHYT nếu có
    public int PatientType { get; set; } // 1-BHYT, 2-Viện phí
    public string? InsuranceNumber { get; set; }

    // Thông tin cấp cứu
    public DateTime? PainStartTime { get; set; } // Thời gian đau/triệu chứng
    public string? ChiefComplaint { get; set; } // Lý do cấp cứu
    public int Severity { get; set; } // 1-Nguy kịch, 2-Nặng, 3-Trung bình, 4-Nhẹ
    public string? TransportMethod { get; set; } // Xe cấp cứu, Tự đến, Chuyển viện

    // Cho phép nợ viện phí
    public bool AllowDebt { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Số tiền tạm ứng không được âm")]
    public decimal? DepositAmount { get; set; }
}

/// <summary>
/// DTO cập nhật thông tin bệnh nhân cấp cứu
/// </summary>
public class UpdateEmergencyPatientDto
{
    [NotEmptyGuid]
    public Guid MedicalRecordId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public int Gender { get; set; }
    public string? IdentityNumber { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string? InsuranceNumber { get; set; }
    public GuardianInfoDto? Guardian { get; set; }
}

/// <summary>
/// DTO ghép mã bệnh nhân (merge duplicate)
/// </summary>
public class MergePatientDto
{
    [NotEmptyGuid]
    public Guid SourcePatientId { get; set; } // BN cần ghép (sẽ xóa)
    [NotEmptyGuid]
    public Guid TargetPatientId { get; set; } // BN đích (giữ lại)
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// DTO tách bệnh án (#99): di chuyển 1 số hồ sơ từ BN nguồn sang BN đích (đã tồn tại).
/// </summary>
public class SplitPatientDto
{
    public Guid SourcePatientId { get; set; }            // BN nguồn (giữ lại các hồ sơ còn lại)
    public Guid TargetPatientId { get; set; }            // BN đích nhận hồ sơ tách (phải tồn tại)
    public List<Guid> MedicalRecordIds { get; set; } = new(); // hồ sơ cần tách sang đích
    public string Reason { get; set; } = string.Empty;
}



/// <summary>
/// DTO danh sách thẻ BHYT bị chặn
/// </summary>
public class BlockedInsuranceDto
{
    public Guid Id { get; set; }
    public string InsuranceNumber { get; set; } = string.Empty;
    public string? PatientName { get; set; }
    public int BlockReason { get; set; } // 1-Lạm dụng quỹ, 2-Thẻ giả, 3-Khác
    public string BlockReasonName => BlockReason switch
    {
        1 => "Lạm dụng quỹ BHYT",
        2 => "Nghi ngờ thẻ giả",
        3 => "Lý do khác",
        _ => ""
    };
    public string? Notes { get; set; }
    public DateTime BlockedAt { get; set; }
    public string? BlockedBy { get; set; }
    public DateTime? UnblockedAt { get; set; }
}

/// <summary>
/// DTO nguồn chi trả khác
/// </summary>
public class OtherPayerDto
{
    public Guid Id { get; set; }
    public string PayerCode { get; set; } = string.Empty;
    public string PayerName { get; set; } = string.Empty;
    public int PayerType { get; set; } // 1-Bảo hiểm tư nhân, 2-Cơ quan, 3-Dự án, 4-Khác
    public string? TaxCode { get; set; }
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContractNumber { get; set; }
    public decimal? CoveragePercent { get; set; }
    public decimal? MaxAmount { get; set; }
    public decimal? CreditLimit { get; set; }
    public decimal? CurrentDebt { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// DTO cảnh báo tiếp đón
/// </summary>
public class ReceptionWarningDto
{
    public int WarningType { get; set; }
    public string WarningTypeName => WarningType switch
    {
        1 => "Nợ viện phí",
        2 => "Còn thuốc chưa dùng hết",
        3 => "Vừa ra viện trong ngày",
        4 => "Thẻ BHYT không hợp lệ",
        5 => "Khám quá số lần cho phép",
        _ => ""
    };
    public string Message { get; set; } = string.Empty;
    public decimal? Amount { get; set; }
    public DateTime? Date { get; set; }
    public bool IsBlocking { get; set; } // Có chặn tiếp đón không
}

/// <summary>
/// DTO đổi/sửa phòng khám
/// </summary>
public class ChangeRoomDto
{
    public Guid MedicalRecordId { get; set; }
    public Guid NewRoomId { get; set; }
    public Guid? NewDoctorId { get; set; }
    public string? Reason { get; set; }
}



/// <summary>
/// DTO lịch sử khám bệnh
/// </summary>
public class PatientVisitHistoryDto
{
    public Guid MedicalRecordId { get; set; }
    public string MedicalRecordCode { get; set; } = string.Empty;
    public DateTime VisitDate { get; set; }

    public string? DepartmentName { get; set; }
    public string? RoomName { get; set; }
    public string? DoctorName { get; set; }

    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public string? TreatmentResult { get; set; }

    public int PatientType { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    public List<VisitServiceDto> Services { get; set; } = new();
}

public class VisitServiceDto
{
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string? Result { get; set; }
    public decimal Amount { get; set; }
}

/// <summary>
/// DTO cấu hình hiển thị lịch sử
/// </summary>
public class HistoryDisplayConfigDto
{
    public bool ShowHistory { get; set; } = true;
    public int MaxHistoryRecords { get; set; } = 5;
    public bool ShowDiagnosis { get; set; } = true;
    public bool ShowServices { get; set; } = true;
    public bool ShowCost { get; set; } = false;
}



/// <summary>
/// DTO chỉ định dịch vụ tại tiếp đón
/// </summary>
public class ReceptionServiceOrderDto
{
    public Guid MedicalRecordId { get; set; }
    public List<ReceptionServiceOrderItemDto> Services { get; set; } = new();
    public bool AutoSelectRoom { get; set; } = true;
    public bool CalculateOptimalPath { get; set; } // Tính đường đi ngắn nhất (TT54)
}

public class ReceptionServiceOrderItemDto
{
    public Guid ServiceId { get; set; }
    public string? ServiceCode { get; set; }
    public string? ServiceName { get; set; }
    public int Quantity { get; set; } = 1;
    public Guid? RoomId { get; set; }
    public int PaymentType { get; set; } // 1-BHYT, 2-Viện phí, 3-Dịch vụ
    public string? Notes { get; set; }
}

/// <summary>
/// DTO nhóm dịch vụ
/// </summary>
public class ServiceGroupDto
{
    public Guid Id { get; set; }
    public string GroupCode { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public List<Guid> ServiceIds { get; set; } = new();
    public bool IsDefault { get; set; }
    public bool IsPublic { get; set; }
    public List<ServiceGroupItemDto> Services { get; set; } = new();
}

/// <summary>
/// DTO chi tiet dich vu trong nhom
/// </summary>
public class ServiceGroupItemDto
{
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO kết quả tính đường đi tối ưu
/// </summary>
public class OptimalPathResultDto
{
    public int TotalEstimatedMinutes { get; set; }
    public List<PathStepDto> Steps { get; set; } = new();
}

public class PathStepDto
{
    public int Order { get; set; }
    public int StepNumber { get; set; } // So buoc
    public Guid ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public Guid RoomId { get; set; }
    public string RoomCode { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public string? Building { get; set; }
    public string? Floor { get; set; }
    public List<string> Services { get; set; } = new();
    public int EstimatedWaitMinutes { get; set; }
    public int EstimatedServiceMinutes { get; set; }
    public int EstimatedMinutes { get; set; } // Tong thoi gian du kien
    public int WaitingCount { get; set; } // So nguoi dang cho
}



/// <summary>
/// DTO yêu cầu in phiếu
/// </summary>
public class PrintRequestDto
{
    public Guid MedicalRecordId { get; set; }
    public int PrintType { get; set; }
    // 1-Phiếu khám bệnh
    // 2-Phiếu khám theo yêu cầu
    // 3-Phiếu giữ thẻ BHYT
    // 4-Thẻ bệnh nhân
    // 5-Phiếu chỉ định
    // 6-Phiếu khám sức khỏe
    public int Copies { get; set; } = 1;
    public string? PrinterName { get; set; }
}

/// <summary>
/// DTO phiếu khám bệnh
/// </summary>
public class ExaminationSlipDto
{
    public string HospitalName { get; set; } = string.Empty;
    public string HospitalAddress { get; set; } = string.Empty;

    public string MedicalRecordCode { get; set; } = string.Empty;
    public int QueueNumber { get; set; }
    public DateTime AdmissionDate { get; set; }

    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public int Gender { get; set; }
    public int Age { get; set; }
    public string? Address { get; set; }

    public int PatientType { get; set; }
    public string? InsuranceNumber { get; set; }

    public string RoomName { get; set; } = string.Empty;
    public string? DoctorName { get; set; }

    public string? QRCodeData { get; set; }
    public string? BarcodeData { get; set; }
}



/// <summary>
/// DTO tạm ứng tại tiếp đón
/// </summary>
public class ReceptionDepositDto
{
    [NotEmptyGuid]
    public Guid MedicalRecordId { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Số tiền tạm ứng không được âm")]
    public decimal Amount { get; set; }
    public int PaymentMethod { get; set; } // 1-Tiền mặt, 2-Chuyển khoản, 3-Thẻ
    public string? TransactionReference { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO thanh toán tại tiếp đón
/// </summary>
public class ReceptionPaymentDto
{
    public Guid MedicalRecordId { get; set; }
    public List<Guid> ServiceIds { get; set; } = new();
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public int PaymentMethod { get; set; }
    public string? TransactionReference { get; set; }
}



/// <summary>
/// DTO đọc thẻ khám bệnh thông minh
/// </summary>
public class SmartCardDataDto
{
    public string CardNumber { get; set; } = string.Empty;
    public string? PatientCode { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public int Gender { get; set; }
    public string? IdentityNumber { get; set; }
    public string? InsuranceNumber { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }

    // Lịch sử khám từ thẻ
    public List<SmartCardVisitDto> RecentVisits { get; set; } = new();
}

public class SmartCardVisitDto
{
    public DateTime VisitDate { get; set; }
    public string FacilityName { get; set; } = string.Empty;
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
}



/// <summary>
/// DTO thống kê hàng ngày
/// </summary>
public class QueueDailyStatisticsDto
{
    public DateTime Date { get; set; }
    public int TotalTickets { get; set; }
    public int ServedTickets { get; set; }
    public int SkippedTickets { get; set; }
    public double AverageWaitingTime { get; set; }
    public double AverageServiceTime { get; set; }
    public int PeakHour { get; set; }
    public int PeakHourCount { get; set; }

    public Dictionary<string, int> ByRoom { get; set; } = new();
    public Dictionary<string, int> ByPatientType { get; set; } = new();
}

/// <summary>
/// DTO thống kê thời gian chờ
/// </summary>
public class AverageWaitingTimeDto
{
    public double OverallAverage { get; set; }
    public double InsurancePatientAverage { get; set; }
    public double FeePatientAverage { get; set; }
    public double ServicePatientAverage { get; set; }

    public Dictionary<Guid, double> ByRoom { get; set; } = new();
    public Dictionary<int, double> ByHour { get; set; } = new();
}

/// <summary>
/// DTO cấu hình hàng đợi
/// </summary>
public class QueueConfigurationDto
{
    public Guid RoomId { get; set; }
    public int QueueType { get; set; }

    public string NumberPrefix { get; set; } = string.Empty; // A, B, C...
    public int StartNumber { get; set; } = 1;
    public bool ResetDaily { get; set; } = true;

    public int MaxCallCount { get; set; } = 3;
    public int CallIntervalSeconds { get; set; } = 30;
    public int AutoSkipMinutes { get; set; } = 15;

    public bool EnableVoiceCall { get; set; } = true;
    public string? VoiceTemplate { get; set; }

    public bool EnableSMS { get; set; } = false;
    public string? SMSTemplate { get; set; }

    public int DisplayRows { get; set; } = 5;
    public string? DisplayColor { get; set; }
}

/// <summary>
/// DTO xuất báo cáo
/// </summary>
public class QueueReportRequestDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? RoomId { get; set; }
    public int? QueueType { get; set; }
    public string ExportFormat { get; set; } = "Excel"; // Excel, PDF
}

/// <summary>
/// DTO thời gian chờ trung bình theo từng khâu (F9.4)
/// Nguồn timestamp:
///   Đăng ký   = MedicalRecord.AdmissionDate
///   Khám       = Examination.StartTime (khi bác sĩ bắt đầu khám) / EndTime
///   CLS        = ServiceRequest.CreatedAt (khi chỉ định) / UpdatedAt khi Status=3 (có KQ) — giả định
///   Kê đơn     = Prescription.PrescriptionDate
/// </summary>
public class WaitingPhaseAnalysisDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public int TotalVisits { get; set; } // Tổng lượt khám trong khoảng

    // Thời gian chờ trung bình từng khâu (phút)
    public double RegistrationToExamMinutes { get; set; }  // Đăng ký → Bắt đầu khám
    public double ExamDurationMinutes { get; set; }        // Thời gian khám (StartTime→EndTime)
    public double ExamToClsRequestMinutes { get; set; }    // Khám xong → Chỉ định CLS (chỉ lượt có CLS)
    public double ClsRequestToResultMinutes { get; set; }  // Chỉ định CLS → Có kết quả (UpdatedAt@Status=3)
    public double ClsResultToPrescriptionMinutes { get; set; }  // Có KQ CLS → Kê đơn (chỉ lượt có CLS+đơn)
    public double OverallMinutes { get; set; }             // Tổng từ đăng ký đến kết thúc khám

    // Break-down theo đối tượng
    public PhaseBreakdownDto InsurancePatients { get; set; } = new(); // PatientType=1 (BHYT)
    public PhaseBreakdownDto FeePatients { get; set; } = new();       // PatientType=2 (Viện phí)
    public PhaseBreakdownDto ServicePatients { get; set; } = new();   // PatientType=3 (Dịch vụ)

    // Break-down theo khoa (DepartmentId → tên + số phút đăng ký→khám)
    public List<DepartmentWaitingDto> ByDepartment { get; set; } = new();
}

/// <summary>
/// DTO thời gian chờ trung bình từng khâu theo nhóm đối tượng
/// </summary>
public class PhaseBreakdownDto
{
    public int VisitCount { get; set; }
    public double RegistrationToExamMinutes { get; set; }
    public double ExamDurationMinutes { get; set; }
    public double OverallMinutes { get; set; }
}

/// <summary>
/// DTO thời gian chờ trung bình theo khoa
/// </summary>
public class DepartmentWaitingDto
{
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int VisitCount { get; set; }
    public double RegistrationToExamMinutes { get; set; }
    public double OverallMinutes { get; set; }
}

/// <summary>
/// DTO thống kê phòng
/// </summary>
public class QueueRoomStatisticsDto
{
    public Guid RoomId { get; set; }
    public string RoomName { get; set; } = string.Empty;
    public int TotalWaiting { get; set; }
    public int TotalServing { get; set; }
    public int TotalCompleted { get; set; }
    public int TotalSkipped { get; set; }
    public int? CurrentNumber { get; set; }
    public double AverageWaitMinutes { get; set; }
}

