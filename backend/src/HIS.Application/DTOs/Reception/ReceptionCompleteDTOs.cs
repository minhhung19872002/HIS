namespace HIS.Application.DTOs.Reception;

#region 1.1 Điều phối bệnh nhân vào các phòng khám

/// <summary>
/// DTO thống kê tổng quan phòng khám trong ngày
/// </summary>
public class RoomOverviewDto
{
    public Guid RoomId { get; set; }
    public string RoomCode { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;

    // Thống kê bệnh nhân
    public int TotalPatientsToday { get; set; }
    public int WaitingCount { get; set; }
    public int InProgressCount { get; set; }
    public int WaitingResultCount { get; set; }
    public int CompletedCount { get; set; }
    public int DoingLabCount { get; set; } // Đang làm CLS

    // Giới hạn
    public int MaxPatientsPerDay { get; set; }
    public int MaxInsurancePatientsPerDay { get; set; }
    public int InsurancePatientsToday { get; set; }

    // Bác sĩ
    public Guid? CurrentDoctorId { get; set; }
    public string? CurrentDoctorName { get; set; }
    public string? DoctorSchedule { get; set; }

    // Trạng thái phòng
    public int RoomStatus { get; set; } // 0-Đóng, 1-Hoạt động, 2-Tạm nghỉ
    public string RoomStatusColor => RoomStatus switch
    {
        0 => "#f5222d", // Đỏ - Đóng
        1 => WaitingCount > MaxPatientsPerDay * 0.8 ? "#faad14" : "#52c41a", // Vàng nếu gần đầy, Xanh
        2 => "#d9d9d9", // Xám - Tạm nghỉ
        _ => "#d9d9d9"
    };
}

/// <summary>
/// DTO lịch làm việc bác sĩ
/// </summary>
public class DoctorScheduleDto
{
    public Guid DoctorId { get; set; }
    public string DoctorCode { get; set; } = string.Empty;
    public string DoctorName { get; set; } = string.Empty;
    public string? Specialty { get; set; }
    public Guid RoomId { get; set; }
    public string RoomName { get; set; } = string.Empty;
    public DateTime ScheduleDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int MaxPatients { get; set; }
    public int CurrentPatients { get; set; }
    public bool IsAvailable { get; set; }
}

#endregion

#region 1.2 Hệ thống xếp hàng

/// <summary>
/// DTO cấp số thứ tự
/// </summary>
public class IssueQueueTicketDto
{
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public Guid RoomId { get; set; }
    public int QueueType { get; set; } // 1-Tiếp đón, 2-Khám bệnh, 3-CLS, 4-Thanh toán, 5-Lĩnh thuốc
    public int Priority { get; set; } // 0-Thường, 1-Ưu tiên, 2-Cấp cứu
    public string? Source { get; set; } // Kiosk, Mobile, Counter
}

/// <summary>
/// DTO phiếu số thứ tự
/// </summary>
public class QueueTicketDto
{
    public Guid Id { get; set; }
    public string TicketCode { get; set; } = string.Empty;
    public int QueueNumber { get; set; }
    public DateTime QueueDate { get; set; }

    public Guid? PatientId { get; set; }
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }

    public Guid RoomId { get; set; }
    public string RoomName { get; set; } = string.Empty;

    public int QueueType { get; set; }
    public string QueueTypeName => QueueType switch
    {
        1 => "Tiếp đón",
        2 => "Khám bệnh",
        3 => "Cận lâm sàng",
        4 => "Thanh toán",
        5 => "Lĩnh thuốc",
        _ => ""
    };

    public int Priority { get; set; }
    public string PriorityName => Priority switch { 2 => "Cấp cứu", 1 => "Ưu tiên", _ => "Thường" };

    public int Status { get; set; } // 0-Chờ, 1-Đang gọi, 2-Đã vào, 3-Bỏ qua, 4-Hoàn thành
    public string StatusName => Status switch
    {
        0 => "Chờ",
        1 => "Đang gọi",
        2 => "Đã vào",
        3 => "Bỏ qua",
        4 => "Hoàn thành",
        _ => ""
    };

    public int CalledCount { get; set; }
    public DateTime? CalledAt { get; set; }
    public DateTime? ServedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public int EstimatedWaitMinutes { get; set; }
    public string? Counter { get; set; }
    public string? CalledBy { get; set; }
}

/// <summary>
/// DTO màn hình hiển thị hàng đợi
/// </summary>
public class QueueDisplayDto
{
    public Guid RoomId { get; set; }
    public string RoomName { get; set; } = string.Empty;
    public string? DoctorName { get; set; }

    public QueueTicketDto? CurrentServing { get; set; }
    public List<QueueTicketDto> CallingList { get; set; } = new();
    public List<QueueTicketDto> WaitingList { get; set; } = new();

    public int TotalWaiting { get; set; }
    public int AverageWaitMinutes { get; set; }
}

/// <summary>
/// DTO cấp số qua di động
/// </summary>
public class MobileQueueTicketDto
{
    public string PatientPhone { get; set; } = string.Empty;
    public string? PatientName { get; set; }
    public string? InsuranceNumber { get; set; }
    public Guid RoomId { get; set; }
    public int QueueType { get; set; }
}

#endregion

#region 1.3 Kết nối BHYT

/// <summary>
/// DTO kiểm tra thẻ BHYT
/// </summary>
public class InsuranceVerificationRequestDto
{
    public string InsuranceNumber { get; set; } = string.Empty;
    public string? PatientName { get; set; }
    public DateTime? DateOfBirth { get; set; }
}

/// <summary>
/// DTO kết quả kiểm tra BHYT
/// </summary>
public class InsuranceVerificationResultDto
{
    public bool IsValid { get; set; }
    public string InsuranceNumber { get; set; } = string.Empty;
    public string? PatientName { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public string? Address { get; set; }

    // Thông tin thẻ
    public string? InsuranceCode { get; set; } // Mã quyền lợi
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsExpired { get; set; }
    public bool IsNewCard { get; set; } // Đã đổi thẻ mới
    public string? NewInsuranceNumber { get; set; }

    // Nơi ĐKKCB ban đầu
    public string? FacilityCode { get; set; }
    public string? FacilityName { get; set; }

    // Thông tuyến
    public int RightRoute { get; set; } // 1-Đúng tuyến, 2-Trái tuyến, 3-Thông tuyến
    public string RightRouteName => RightRoute switch
    {
        1 => "Đúng tuyến",
        2 => "Trái tuyến",
        3 => "Thông tuyến",
        _ => ""
    };
    public decimal PaymentRate { get; set; } // Tỷ lệ thanh toán %

    // Cảnh báo
    public List<string> Warnings { get; set; } = new();
    public string? ErrorMessage { get; set; }

    // Trạng thái lạm dụng
    public bool IsBlacklisted { get; set; }
    public string? BlacklistReason { get; set; }
}

#endregion

#region 1.4 Cấp thẻ BHYT tạm cho bệnh nhân nhi

/// <summary>
/// DTO thông tin người giám hộ
/// </summary>
public class GuardianInfoDto
{
    public string FullName { get; set; } = string.Empty;
    public string? IdentityNumber { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string Relationship { get; set; } = string.Empty; // Mẹ, Bố, Ông, Bà...
    public string? InsuranceNumber { get; set; }
}

/// <summary>
/// DTO cấp thẻ BHYT tạm cho trẻ sơ sinh (CV 3434/BYT-BH)
/// </summary>
public class TemporaryInsuranceCardDto
{
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
    public string? BirthCertificateNumber { get; set; }

    public GuardianInfoDto Guardian { get; set; } = new();

    public string TemporaryInsuranceNumber { get; set; } = string.Empty;
    public DateTime IssueDate { get; set; }
    public DateTime ExpiryDate { get; set; } // Có hiệu lực đến khi trẻ được 6 tuổi

    public bool IsEligible { get; set; } // Đủ điều kiện cấp thẻ tạm
    public string? EligibilityMessage { get; set; }
}

/// <summary>
/// DTO tạo thẻ BHYT tạm
/// </summary>
public class CreateTemporaryInsuranceDto
{
    public string PatientName { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
    public int Gender { get; set; }
    public string? BirthCertificateNumber { get; set; }
    public GuardianInfoDto Guardian { get; set; } = new();
    public string? Address { get; set; }
}

#endregion

#region 1.5 Chụp ảnh bệnh nhân và giấy tờ

/// <summary>
/// DTO ảnh chụp
/// </summary>
public class PatientPhotoDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }

    public int PhotoType { get; set; } // 1-Chân dung, 2-CCCD mặt trước, 3-CCCD mặt sau, 4-Thẻ BHYT, 5-Giấy tờ khác
    public string PhotoTypeName => PhotoType switch
    {
        1 => "Ảnh chân dung",
        2 => "CCCD mặt trước",
        3 => "CCCD mặt sau",
        4 => "Thẻ BHYT",
        5 => "Giấy tờ khác",
        _ => ""
    };

    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string? ThumbnailPath { get; set; }
    public long FileSize { get; set; }
    public string MimeType { get; set; } = "image/jpeg";

    public DateTime CapturedAt { get; set; }
    public string? CapturedBy { get; set; }
    public string? DeviceInfo { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO upload ảnh
/// </summary>
public class UploadPhotoDto
{
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public int PhotoType { get; set; }
    public string Base64Data { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO cấu hình camera
/// </summary>
public class CameraConfigDto
{
    public string DeviceId { get; set; } = string.Empty;
    public string DeviceName { get; set; } = string.Empty;
    public int Resolution { get; set; } // 1-640x480, 2-1280x720, 3-1920x1080
    public int PhotoCountLimit { get; set; } = 5; // Số ảnh tối đa mỗi lần tiếp đón
    public bool AutoCapture { get; set; }
}

#endregion

#region 1.6 & 1.15 Quản lý giữ/trả giấy tờ

/// <summary>
/// DTO tìm kiếm giấy tờ đang giữ
/// </summary>
public class DocumentHoldSearchDto
{
    public string? Keyword { get; set; }
    public Guid? PatientId { get; set; }
    public int? DocumentType { get; set; }
    public int? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

/// <summary>
/// DTO in phiếu giữ giấy tờ
/// </summary>
public class DocumentHoldReceiptDto
{
    public string ReceiptNumber { get; set; } = string.Empty;
    public DateTime ReceiptDate { get; set; }

    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string? PatientPhone { get; set; }

    public List<DocumentHoldItemDto> Documents { get; set; } = new();

    public string ReceiverName { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class DocumentHoldItemDto
{
    public string DocumentTypeName { get; set; } = string.Empty;
    public string DocumentNumber { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string? Description { get; set; }
}

#endregion

#region 1.7 Đăng ký khám BHYT

/// <summary>
/// DTO đăng ký khám BHYT
/// </summary>
public class InsuranceRegistrationDto
{
    // Thông tin bệnh nhân
    public Guid? PatientId { get; set; }
    public string? PatientCode { get; set; }
    public string? IdentityNumber { get; set; }
    public string? AppointmentCode { get; set; } // Mã hẹn khám

    // Thông tin BHYT
    public string InsuranceNumber { get; set; } = string.Empty;
    public bool UseQRCode { get; set; }
    public string? QRCodeData { get; set; }

    // Phòng khám
    public Guid RoomId { get; set; }
    public Guid? DoctorId { get; set; }

    // Ưu tiên
    public bool IsPriority { get; set; }
    public int PriorityReason { get; set; } // 1-Người cao tuổi, 2-Trẻ em, 3-Phụ nữ có thai, 4-Người khuyết tật, 5-Khác

    // Sử dụng thẻ khám bệnh thông minh
    public bool UseSmartCard { get; set; }
    public string? SmartCardData { get; set; }
}

#endregion

#region 1.8 Đăng ký khám viện phí/dịch vụ

/// <summary>
/// DTO đăng ký khám viện phí
/// </summary>
public class FeeRegistrationDto
{
    // Thông tin bệnh nhân
    public Guid? PatientId { get; set; }
    public CreatePatientDto? NewPatient { get; set; }

    // Phương thức tìm nhanh
    public string? PatientCode { get; set; }
    public string? IdentityNumber { get; set; }
    public string? PhoneNumber { get; set; }
    public string? SmartCardData { get; set; }

    // Loại khám
    public int ServiceType { get; set; } // 2-Viện phí, 3-Dịch vụ
    public bool HasInsuranceButPayFee { get; set; } // Có BHYT nhưng khám dịch vụ

    // Phòng khám & Bác sĩ
    public Guid RoomId { get; set; }
    public Guid? DoctorId { get; set; }
    public bool SelectSpecificDoctor { get; set; } // Chọn đích danh bác sĩ

    // Ưu tiên
    public bool IsPriority { get; set; }
}

#endregion

#region 1.9 Đăng ký khám sức khỏe

/// <summary>
/// DTO hợp đồng khám sức khỏe
/// </summary>
public class HealthCheckContractDto
{
    public Guid Id { get; set; }
    public string ContractNumber { get; set; } = string.Empty;
    public string? ContractCode { get; set; } // Ma hop dong (alias)
    public string ContractName { get; set; } = string.Empty;

    public string CompanyName { get; set; } = string.Empty;
    public string? CompanyAddress { get; set; }
    public string? CompanyPhone { get; set; } // SDT cong ty
    public string? CompanyTaxCode { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalPatients { get; set; }
    public int CompletedPatients { get; set; }

    public decimal TotalAmount { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountRate { get; set; } // Ty le chiet khau (alias)
    public decimal FinalAmount { get; set; }

    public List<HealthCheckPackageDto> Packages { get; set; } = new();

    public int Status { get; set; } // 0-Nháp, 1-Đang thực hiện, 2-Hoàn thành, 3-Hủy
}

/// <summary>
/// DTO gói khám sức khỏe
/// </summary>
public class HealthCheckPackageDto
{
    public Guid Id { get; set; }
    public string PackageCode { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;
    public string? Description { get; set; }

    public int? ForGender { get; set; } // null-Cả 2, 1-Nam, 2-Nữ
    public int? ApplicableGender { get; set; } // Alias for ForGender
    public int? MinAge { get; set; }
    public int? MaxAge { get; set; }

    public decimal Price { get; set; }
    public List<HealthCheckServiceDto> Services { get; set; } = new();
    public List<HealthCheckPackageServiceDto> PackageServices { get; set; } = new();
}

public class HealthCheckServiceDto
{
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public Guid? RoomId { get; set; }
    public string? RoomName { get; set; }
}

/// <summary>
/// DTO dich vu trong goi kham suc khoe (alias)
/// </summary>
public class HealthCheckPackageServiceDto
{
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public bool IsMandatory { get; set; }
}

/// <summary>
/// DTO đăng ký khám sức khỏe
/// </summary>
public class HealthCheckRegistrationDto
{
    public Guid? ContractId { get; set; }
    public Guid? PatientId { get; set; }
    public CreatePatientDto? NewPatient { get; set; }
    public Guid PackageId { get; set; }
    public bool HasLifeInsurance { get; set; }
    public string? LifeInsuranceNumber { get; set; }
}

/// <summary>
/// DTO import danh sách khám sức khỏe
/// </summary>
public class HealthCheckImportDto
{
    public Guid ContractId { get; set; }
    public List<HealthCheckPatientImportDto> Patients { get; set; } = new();
}

public class HealthCheckPatientImportDto
{
    public int RowNumber { get; set; } // So thu tu dong trong file import
    public string FullName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public int? YearOfBirth { get; set; }
    public int Gender { get; set; }
    public string? IdentityNumber { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; } // Dia chi
    public string? Department { get; set; } // Phòng ban trong công ty
    public string? EmployeeCode { get; set; }
    public Guid PackageId { get; set; }
}

#endregion

#region 1.10 Đăng ký khám cấp cứu

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
    public decimal? DepositAmount { get; set; }
}

/// <summary>
/// DTO cập nhật thông tin bệnh nhân cấp cứu
/// </summary>
public class UpdateEmergencyPatientDto
{
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
    public Guid SourcePatientId { get; set; } // BN cần ghép (sẽ xóa)
    public Guid TargetPatientId { get; set; } // BN đích (giữ lại)
    public string Reason { get; set; } = string.Empty;
}

#endregion

#region 1.11 Quản lý tiếp đón khác

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

#endregion

#region 1.12 Xem lịch sử đăng ký khám

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

#endregion

#region 1.13 Chỉ định dịch vụ ở tiếp đón

/// <summary>
/// DTO chỉ định dịch vụ tại tiếp đón
/// </summary>
public class ReceptionServiceOrderDto
{
    public Guid MedicalRecordId { get; set; }
    public List<ServiceOrderItemDto> Services { get; set; } = new();
    public bool AutoSelectRoom { get; set; } = true;
    public bool CalculateOptimalPath { get; set; } // Tính đường đi ngắn nhất (TT54)
}

public class ServiceOrderItemDto
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

#endregion

#region 1.14 In phiếu

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

#endregion

#region 1.16 Thu tiền khám bệnh

/// <summary>
/// DTO tạm ứng tại tiếp đón
/// </summary>
public class ReceptionDepositDto
{
    public Guid MedicalRecordId { get; set; }
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

#endregion

#region 1.17 Thẻ khám bệnh thông minh

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

#endregion

#region Thống kê và báo cáo

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

#endregion
