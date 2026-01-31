using HIS.Application.DTOs;
using HIS.Application.DTOs.Reception;
using QueueDailyStatisticsDto = HIS.Application.DTOs.Reception.QueueDailyStatisticsDto;
using AverageWaitingTimeDto = HIS.Application.DTOs.Reception.AverageWaitingTimeDto;
using QueueReportRequestDto = HIS.Application.DTOs.Reception.QueueReportRequestDto;
using QueueConfigurationDto = HIS.Application.DTOs.Reception.QueueConfigurationDto;

namespace HIS.Application.Services;

/// <summary>
/// Interface Service đầy đủ cho Phân hệ Tiếp đón
/// Bao gồm tất cả 105+ chức năng theo yêu cầu
/// </summary>
public interface IReceptionCompleteService
{
    #region 1.1 Điều phối bệnh nhân vào các phòng khám

    /// <summary>
    /// Xem tổng quan tất cả phòng khám trong ngày
    /// </summary>
    Task<List<RoomOverviewDto>> GetRoomOverviewAsync(Guid? departmentId, DateTime date);

    /// <summary>
    /// Xem chi tiết thống kê một phòng khám
    /// </summary>
    Task<RoomOverviewDto?> GetRoomDetailAsync(Guid roomId, DateTime date);

    /// <summary>
    /// Xem danh sách bác sĩ đang làm việc
    /// </summary>
    Task<List<DoctorScheduleDto>> GetWorkingDoctorsAsync(Guid? departmentId, DateTime date);

    /// <summary>
    /// Xem lịch làm việc bác sĩ theo phòng
    /// </summary>
    Task<List<DoctorScheduleDto>> GetDoctorScheduleAsync(Guid roomId, DateTime date);

    /// <summary>
    /// Lấy danh sách phòng khám có thể điều phối
    /// </summary>
    Task<List<RoomOverviewDto>> GetAvailableRoomsAsync(Guid departmentId, int patientType, DateTime date);

    /// <summary>
    /// Lấy danh sách bệnh nhân đăng ký trong ngày theo phòng
    /// </summary>
    Task<List<AdmissionDto>> GetTodayAdmissionsAsync(Guid? roomId, DateTime date);

    #endregion

    #region 1.2 Hệ thống xếp hàng

    /// <summary>
    /// Cấp số thứ tự mới
    /// </summary>
    Task<QueueTicketDto> IssueQueueTicketAsync(IssueQueueTicketDto dto);

    /// <summary>
    /// Cấp số thứ tự qua di động
    /// </summary>
    Task<QueueTicketDto> IssueQueueTicketMobileAsync(MobileQueueTicketDto dto);

    /// <summary>
    /// Lấy số tiếp theo
    /// </summary>
    Task<QueueTicketDto?> CallNextAsync(Guid roomId, int queueType, Guid userId);

    /// <summary>
    /// Gọi số cụ thể
    /// </summary>
    Task<QueueTicketDto> CallSpecificAsync(Guid ticketId, Guid userId);

    /// <summary>
    /// Gọi lại số
    /// </summary>
    Task<QueueTicketDto> RecallAsync(Guid ticketId, Guid userId);

    /// <summary>
    /// Bỏ qua số
    /// </summary>
    Task<QueueTicketDto> SkipAsync(Guid ticketId, Guid userId, string? reason);

    /// <summary>
    /// Bắt đầu phục vụ
    /// </summary>
    Task<QueueTicketDto> StartServingAsync(Guid ticketId, Guid userId);

    /// <summary>
    /// Hoàn thành phục vụ
    /// </summary>
    Task<QueueTicketDto> CompleteServingAsync(Guid ticketId);

    /// <summary>
    /// Lấy danh sách chờ
    /// </summary>
    Task<List<QueueTicketDto>> GetWaitingListAsync(Guid roomId, int queueType, DateTime date);

    /// <summary>
    /// Lấy danh sách đang phục vụ
    /// </summary>
    Task<List<QueueTicketDto>> GetServingListAsync(Guid roomId, int queueType, DateTime date);

    /// <summary>
    /// Lấy dữ liệu màn hình hiển thị
    /// </summary>
    Task<QueueDisplayDto> GetDisplayDataAsync(Guid roomId, int queueType);

    /// <summary>
    /// Lấy danh sách số đang gọi
    /// </summary>
    Task<List<QueueTicketDto>> GetCallingTicketsAsync(Guid roomId, int limit = 5);

    /// <summary>
    /// Lấy phiếu số theo ID
    /// </summary>
    Task<QueueTicketDto?> GetQueueTicketByIdAsync(Guid id);

    #endregion

    #region 1.3 Kết nối BHYT

    /// <summary>
    /// Kiểm tra thẻ BHYT qua cổng BHXH
    /// </summary>
    Task<InsuranceVerificationResultDto> VerifyInsuranceAsync(InsuranceVerificationRequestDto dto);

    /// <summary>
    /// Đọc thẻ BHYT bằng QR Code
    /// </summary>
    Task<InsuranceVerificationResultDto> VerifyInsuranceByQRAsync(string qrData);

    /// <summary>
    /// Kiểm tra thẻ BHYT đã bị chặn
    /// </summary>
    Task<bool> IsInsuranceBlockedAsync(string insuranceNumber);

    /// <summary>
    /// Lấy danh sách thẻ BHYT bị chặn
    /// </summary>
    Task<PagedResultDto<BlockedInsuranceDto>> GetBlockedInsuranceListAsync(string? keyword, int page, int pageSize);

    /// <summary>
    /// Chặn thẻ BHYT
    /// </summary>
    Task<BlockedInsuranceDto> BlockInsuranceAsync(string insuranceNumber, int reason, string? notes, Guid userId);

    /// <summary>
    /// Mở chặn thẻ BHYT
    /// </summary>
    Task UnblockInsuranceAsync(Guid id, Guid userId);

    #endregion

    #region 1.4 Cấp thẻ BHYT tạm cho trẻ sơ sinh

    /// <summary>
    /// Kiểm tra điều kiện cấp thẻ BHYT tạm
    /// </summary>
    Task<(bool IsEligible, string Message)> CheckTemporaryInsuranceEligibilityAsync(DateTime dateOfBirth);

    /// <summary>
    /// Tạo thẻ BHYT tạm
    /// </summary>
    Task<TemporaryInsuranceCardDto> CreateTemporaryInsuranceAsync(CreateTemporaryInsuranceDto dto, Guid userId);

    /// <summary>
    /// Lấy thông tin thẻ BHYT tạm
    /// </summary>
    Task<TemporaryInsuranceCardDto?> GetTemporaryInsuranceAsync(Guid patientId);

    #endregion

    #region 1.5 Chụp ảnh bệnh nhân và giấy tờ

    /// <summary>
    /// Lưu ảnh chụp
    /// </summary>
    Task<PatientPhotoDto> SavePhotoAsync(UploadPhotoDto dto, Guid userId);

    /// <summary>
    /// Lấy danh sách ảnh của bệnh nhân
    /// </summary>
    Task<List<PatientPhotoDto>> GetPatientPhotosAsync(Guid patientId, Guid? medicalRecordId = null);

    /// <summary>
    /// Xóa ảnh
    /// </summary>
    Task DeletePhotoAsync(Guid photoId, Guid userId);

    /// <summary>
    /// Lấy cấu hình camera
    /// </summary>
    Task<CameraConfigDto> GetCameraConfigAsync(string workstationId);

    /// <summary>
    /// Lưu cấu hình camera
    /// </summary>
    Task SaveCameraConfigAsync(string workstationId, CameraConfigDto config);

    #endregion

    #region 1.6 & 1.15 Quản lý giữ/trả giấy tờ

    /// <summary>
    /// Tạo phiếu giữ giấy tờ
    /// </summary>
    Task<DocumentHoldDto> CreateDocumentHoldAsync(CreateDocumentHoldDto dto, Guid userId);

    /// <summary>
    /// Trả giấy tờ
    /// </summary>
    Task<DocumentHoldDto> ReturnDocumentAsync(ReturnDocumentDto dto, Guid userId);

    /// <summary>
    /// Tìm kiếm giấy tờ đang giữ
    /// </summary>
    Task<PagedResultDto<DocumentHoldDto>> SearchDocumentHoldsAsync(DocumentHoldSearchDto dto);

    /// <summary>
    /// Lấy danh sách giấy tờ đang giữ của bệnh nhân
    /// </summary>
    Task<List<DocumentHoldDto>> GetPatientDocumentHoldsAsync(Guid patientId);

    /// <summary>
    /// In phiếu giữ giấy tờ
    /// </summary>
    Task<DocumentHoldReceiptDto> GetDocumentHoldReceiptAsync(Guid documentHoldId);

    /// <summary>
    /// In phiếu trả giấy tờ
    /// </summary>
    Task<DocumentHoldReceiptDto> GetDocumentReturnReceiptAsync(Guid documentHoldId);

    #endregion

    #region 1.7 Đăng ký khám BHYT

    /// <summary>
    /// Đăng ký khám BHYT
    /// </summary>
    Task<AdmissionDto> RegisterInsurancePatientAsync(InsuranceRegistrationDto dto, Guid userId);

    /// <summary>
    /// Đăng ký khám nhanh bằng mã bệnh nhân
    /// </summary>
    Task<AdmissionDto> QuickRegisterByPatientCodeAsync(string patientCode, Guid roomId, Guid userId);

    /// <summary>
    /// Đăng ký khám nhanh bằng mã hẹn khám
    /// </summary>
    Task<AdmissionDto> QuickRegisterByAppointmentAsync(string appointmentCode, Guid userId);

    /// <summary>
    /// Đăng ký khám nhanh bằng CCCD
    /// </summary>
    Task<AdmissionDto> QuickRegisterByIdentityAsync(string identityNumber, Guid roomId, Guid userId);

    /// <summary>
    /// Đăng ký khám bằng mã điều trị
    /// </summary>
    Task<AdmissionDto> RegisterByTreatmentCodeAsync(string treatmentCode, Guid roomId, Guid userId);

    /// <summary>
    /// Đăng ký bằng thẻ khám bệnh thông minh
    /// </summary>
    Task<AdmissionDto> RegisterBySmartCardAsync(string cardData, Guid roomId, Guid userId);

    #endregion

    #region 1.8 Đăng ký khám viện phí/dịch vụ

    /// <summary>
    /// Đăng ký khám viện phí/dịch vụ
    /// </summary>
    Task<AdmissionDto> RegisterFeePatientAsync(FeeRegistrationDto dto, Guid userId);

    /// <summary>
    /// Đăng ký khám nhanh bằng SĐT
    /// </summary>
    Task<AdmissionDto> QuickRegisterByPhoneAsync(string phoneNumber, Guid roomId, int serviceType, Guid userId);

    #endregion

    #region 1.9 Đăng ký khám sức khỏe

    /// <summary>
    /// Tạo hợp đồng khám sức khỏe
    /// </summary>
    Task<HealthCheckContractDto> CreateHealthCheckContractAsync(HealthCheckContractDto dto, Guid userId);

    /// <summary>
    /// Cập nhật hợp đồng khám sức khỏe
    /// </summary>
    Task<HealthCheckContractDto> UpdateHealthCheckContractAsync(Guid id, HealthCheckContractDto dto, Guid userId);

    /// <summary>
    /// Lấy danh sách hợp đồng
    /// </summary>
    Task<PagedResultDto<HealthCheckContractDto>> GetHealthCheckContractsAsync(string? keyword, int? status, int page, int pageSize);

    /// <summary>
    /// Import danh sách bệnh nhân khám sức khỏe
    /// </summary>
    Task<(int Success, int Failed, List<string> Errors)> ImportHealthCheckPatientsAsync(HealthCheckImportDto dto, Guid userId);

    /// <summary>
    /// Đăng ký khám sức khỏe
    /// </summary>
    Task<AdmissionDto> RegisterHealthCheckPatientAsync(HealthCheckRegistrationDto dto, Guid userId);

    /// <summary>
    /// Lấy danh sách gói khám sức khỏe
    /// </summary>
    Task<List<HealthCheckPackageDto>> GetHealthCheckPackagesAsync(int? forGender = null, int? age = null);

    #endregion

    #region 1.10 Đăng ký khám cấp cứu

    /// <summary>
    /// Đăng ký cấp cứu
    /// </summary>
    Task<AdmissionDto> RegisterEmergencyPatientAsync(EmergencyRegistrationDto dto, Guid userId);

    /// <summary>
    /// Cập nhật thông tin bệnh nhân cấp cứu
    /// </summary>
    Task<AdmissionDto> UpdateEmergencyPatientInfoAsync(UpdateEmergencyPatientDto dto, Guid userId);

    /// <summary>
    /// Ghép mã bệnh nhân (xử lý trùng)
    /// </summary>
    Task MergePatientsAsync(MergePatientDto dto, Guid userId);

    /// <summary>
    /// Tạo phiếu tạm ứng cho cấp cứu
    /// </summary>
    Task<DepositReceiptDto> CreateEmergencyDepositAsync(Guid medicalRecordId, decimal amount, Guid userId);

    #endregion

    #region 1.11 Quản lý tiếp đón khác

    /// <summary>
    /// Lấy cảnh báo tiếp đón
    /// </summary>
    Task<List<ReceptionWarningDto>> GetReceptionWarningsAsync(Guid patientId);

    /// <summary>
    /// Đổi phòng khám
    /// </summary>
    Task<AdmissionDto> ChangeRoomAsync(ChangeRoomDto dto, Guid userId);

    /// <summary>
    /// Sửa thông tin tiếp đón
    /// </summary>
    Task<AdmissionDto> UpdateAdmissionAsync(Guid id, UpdateAdmissionDto dto, Guid userId);

    /// <summary>
    /// Đăng ký với nguồn chi trả khác
    /// </summary>
    Task<AdmissionDto> RegisterWithOtherPayerAsync(Guid admissionId, Guid payerId, Guid userId);

    /// <summary>
    /// Lấy danh sách nguồn chi trả
    /// </summary>
    Task<List<OtherPayerDto>> GetOtherPayersAsync();

    /// <summary>
    /// Khai báo thông tin người thân
    /// </summary>
    Task SaveGuardianInfoAsync(Guid patientId, GuardianInfoDto guardian, Guid userId);

    #endregion

    #region 1.12 Xem lịch sử đăng ký khám

    /// <summary>
    /// Lấy lịch sử khám gần nhất
    /// </summary>
    Task<List<PatientVisitHistoryDto>> GetPatientVisitHistoryAsync(Guid patientId, int maxRecords = 5);

    /// <summary>
    /// Lấy chi tiết lịch sử khám
    /// </summary>
    Task<PatientVisitHistoryDto?> GetVisitDetailAsync(Guid medicalRecordId);

    /// <summary>
    /// Lấy cấu hình hiển thị lịch sử
    /// </summary>
    Task<HistoryDisplayConfigDto> GetHistoryDisplayConfigAsync(Guid userId);

    /// <summary>
    /// Lưu cấu hình hiển thị lịch sử
    /// </summary>
    Task SaveHistoryDisplayConfigAsync(Guid userId, HistoryDisplayConfigDto config);

    #endregion

    #region 1.13 Chỉ định dịch vụ ở tiếp đón

    /// <summary>
    /// Chỉ định dịch vụ tại tiếp đón
    /// </summary>
    Task<List<ServiceOrderResultDto>> OrderServicesAtReceptionAsync(ReceptionServiceOrderDto dto, Guid userId);

    /// <summary>
    /// Chỉ định dịch vụ theo nhóm
    /// </summary>
    Task<List<ServiceOrderResultDto>> OrderServicesByGroupAsync(Guid medicalRecordId, Guid groupId, Guid userId);

    /// <summary>
    /// Sửa chỉ định dịch vụ
    /// </summary>
    Task<ServiceOrderResultDto> UpdateServiceOrderAsync(Guid orderId, ServiceOrderItemDto dto, Guid userId);

    /// <summary>
    /// Xóa chỉ định dịch vụ
    /// </summary>
    Task DeleteServiceOrderAsync(Guid orderId, Guid userId);

    /// <summary>
    /// Lấy danh sách nhóm dịch vụ
    /// </summary>
    Task<List<ServiceGroupDto>> GetServiceGroupsAsync(Guid userId);

    /// <summary>
    /// Tạo nhóm dịch vụ
    /// </summary>
    Task<ServiceGroupDto> CreateServiceGroupAsync(ServiceGroupDto dto, Guid userId);

    /// <summary>
    /// Tính đường đi tối ưu
    /// </summary>
    Task<OptimalPathResultDto> CalculateOptimalPathAsync(Guid medicalRecordId);

    #endregion

    #region 1.14 In phiếu

    /// <summary>
    /// In phiếu khám bệnh
    /// </summary>
    Task<byte[]> PrintExaminationSlipAsync(Guid medicalRecordId);

    /// <summary>
    /// In phiếu giữ thẻ BHYT
    /// </summary>
    Task<byte[]> PrintInsuranceCardHoldSlipAsync(Guid documentHoldId);

    /// <summary>
    /// In thẻ bệnh nhân
    /// </summary>
    Task<byte[]> PrintPatientCardAsync(Guid patientId);

    /// <summary>
    /// In phiếu chỉ định
    /// </summary>
    Task<byte[]> PrintServiceOrderSlipAsync(Guid medicalRecordId);

    /// <summary>
    /// Lấy dữ liệu phiếu khám
    /// </summary>
    Task<ExaminationSlipDto> GetExaminationSlipDataAsync(Guid medicalRecordId);

    #endregion

    #region 1.16 Thu tiền khám bệnh

    /// <summary>
    /// Thu tạm ứng tại tiếp đón
    /// </summary>
    Task<DepositReceiptDto> CreateDepositAsync(ReceptionDepositDto dto, Guid userId);

    /// <summary>
    /// Thu tiền theo dịch vụ
    /// </summary>
    Task<PaymentReceiptDto> CreatePaymentAsync(ReceptionPaymentDto dto, Guid userId);

    /// <summary>
    /// Lấy thông tin viện phí bệnh nhân
    /// </summary>
    Task<PatientBillingInfoDto> GetPatientBillingInfoAsync(Guid medicalRecordId);

    #endregion

    #region 1.17 Thẻ khám bệnh thông minh

    /// <summary>
    /// Đọc thẻ khám bệnh thông minh
    /// </summary>
    Task<SmartCardDataDto> ReadSmartCardAsync(string cardData);

    /// <summary>
    /// Ghi thông tin vào thẻ
    /// </summary>
    Task WriteSmartCardAsync(Guid patientId, string cardData);

    /// <summary>
    /// Kiểm tra kết nối cổng BHXH
    /// </summary>
    Task<bool> CheckBHXHConnectionAsync();

    #endregion

    #region Thống kê và báo cáo

    /// <summary>
    /// Lấy thống kê hàng đợi theo phòng
    /// </summary>
    Task<QueueRoomStatisticsDto> GetRoomQueueStatisticsAsync(Guid roomId, DateTime date);

    /// <summary>
    /// Lấy thống kê hàng đợi theo khoa
    /// </summary>
    Task<List<QueueRoomStatisticsDto>> GetDepartmentQueueStatisticsAsync(Guid departmentId, DateTime date);

    /// <summary>
    /// Lấy thống kê hàng ngày
    /// </summary>
    Task<QueueDailyStatisticsDto> GetDailyStatisticsAsync(DateTime date, Guid? departmentId);

    /// <summary>
    /// Lấy thời gian chờ trung bình
    /// </summary>
    Task<AverageWaitingTimeDto> GetAverageWaitingTimeAsync(DateTime fromDate, DateTime toDate, Guid? roomId);

    /// <summary>
    /// Xuất báo cáo
    /// </summary>
    Task<byte[]> ExportQueueReportAsync(QueueReportRequestDto dto);

    /// <summary>
    /// Lấy cấu hình hàng đợi
    /// </summary>
    Task<QueueConfigurationDto?> GetQueueConfigurationAsync(Guid roomId, int queueType);

    /// <summary>
    /// Lưu cấu hình hàng đợi
    /// </summary>
    Task<QueueConfigurationDto> SaveQueueConfigurationAsync(QueueConfigurationDto dto);

    #endregion
}

#region Supporting DTOs

public class ServiceOrderResultDto
{
    public Guid Id { get; set; }
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public Guid? RoomId { get; set; }
    public string? RoomName { get; set; }
    public int? QueueNumber { get; set; }
    public int Status { get; set; }
}

public class DepositReceiptDto
{
    public Guid Id { get; set; }
    public string ReceiptNumber { get; set; } = string.Empty;
    public DateTime ReceiptDate { get; set; }
    public decimal Amount { get; set; }
    public int PaymentMethod { get; set; }
    public string? TransactionReference { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class PaymentReceiptDto
{
    public Guid Id { get; set; }
    public string ReceiptNumber { get; set; } = string.Empty;
    public DateTime ReceiptDate { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }
    public int PaymentMethod { get; set; }
    public List<PaymentItemDto> Items { get; set; } = new();
}

public class PaymentItemDto
{
    public string ServiceName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
}

public class PatientBillingInfoDto
{
    public Guid MedicalRecordId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public int PatientType { get; set; }

    public decimal TotalServiceAmount { get; set; }
    public decimal InsuranceCoverage { get; set; }
    public decimal PatientResponsibility { get; set; }
    public decimal DepositAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }

    public List<BillingItemDto> PendingItems { get; set; } = new();
}

public class BillingItemDto
{
    public Guid Id { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
    public bool IsPaid { get; set; }
}

#endregion
