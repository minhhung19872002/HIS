using System.ComponentModel.DataAnnotations;
using HIS.Application.Common;

namespace HIS.Application.DTOs.Reception;


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

    /// <summary>
    /// Nguồn của kết quả: "BHXH" = tra cứu thật từ cổng giám định · "MOCK" = dữ liệu mô phỏng
    /// (chưa cấu hình tài khoản cổng BHXH) · "VALIDATION" = chặn tại chỗ do sai định dạng số thẻ.
    /// Giao diện PHẢI hiển thị rõ khi giá trị là "MOCK" — quyền lợi/hạn thẻ khi đó không có thật.
    /// </summary>
    public string DataSource { get; set; } = "MOCK";

    /// <summary>Tiện ích cho giao diện — kết quả không đến từ cổng BHXH thật.</summary>
    public bool IsMockData => DataSource == "MOCK";
}



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
    public CreatePatientDto? NewPatient { get; set; } // BN mới (đăng ký BHYT lần đầu) — tạo nếu không tìm thấy BN cũ

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


