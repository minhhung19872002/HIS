using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;

namespace HIS.Application.Services;

/// <summary>
/// Service Interface đầy đủ cho Phân hệ 6: Phẫu thuật thủ thuật (PTTT)
/// </summary>
public interface ISurgeryCompleteService
{
    #region 6.1 Quản lý PTTT

    /// <summary>
    /// Tạo yêu cầu PTTT
    /// </summary>
    Task<SurgeryDto> CreateSurgeryRequestAsync(CreateSurgeryRequestDto dto, Guid userId);

    /// <summary>
    /// Duyệt mổ
    /// </summary>
    Task<SurgeryDto> ApproveSurgeryAsync(ApproveSurgeryDto dto, Guid userId);

    /// <summary>
    /// Từ chối duyệt mổ
    /// </summary>
    Task<SurgeryDto> RejectSurgeryAsync(Guid surgeryId, string reason, Guid userId);

    /// <summary>
    /// Lên lịch mổ
    /// </summary>
    Task<SurgeryDto> ScheduleSurgeryAsync(ScheduleSurgeryDto dto, Guid userId);

    /// <summary>
    /// Lấy lịch mổ theo ngày/phòng
    /// </summary>
    Task<List<SurgeryScheduleDto>> GetSurgeryScheduleAsync(DateTime date, Guid? operatingRoomId);

    /// <summary>
    /// Tiếp nhận bệnh nhân chuyển mổ
    /// </summary>
    Task<SurgeryDto> CheckInPatientAsync(SurgeryCheckInDto dto, Guid userId);

    /// <summary>
    /// Lấy danh sách bệnh nhân theo ngày/phòng mổ
    /// </summary>
    Task<PagedResultDto<SurgeryDto>> GetSurgeriesAsync(SurgerySearchDto dto);

    /// <summary>
    /// Lấy chi tiết PTTT
    /// </summary>
    Task<SurgeryDto?> GetSurgeryByIdAsync(Guid id);

    /// <summary>
    /// Cập nhật trạng thái PTTT
    /// </summary>
    Task<SurgeryDto> UpdateSurgeryStatusAsync(Guid surgeryId, int status, Guid userId);

    /// <summary>
    /// Hủy PTTT
    /// </summary>
    Task<bool> CancelSurgeryAsync(Guid surgeryId, string reason, Guid userId);

    /// <summary>
    /// Khai báo tiền công tham gia PTTT
    /// </summary>
    Task<SurgeryDto> SetTeamFeesAsync(Guid surgeryId, List<SurgeryTeamMemberRequestDto> teamMembers, Guid userId);

    /// <summary>
    /// Tính công PTTT theo QĐ73
    /// </summary>
    Task<SurgeryFeeCalculationDto> CalculateTeamFeesAsync(Guid surgeryId);

    /// <summary>
    /// Tính toán lợi nhuận PTTT
    /// </summary>
    Task<SurgeryProfitDto> CalculateProfitAsync(Guid surgeryId);

    /// <summary>
    /// Tính toán chi phí cuộc mổ theo TT37
    /// </summary>
    Task<SurgeryCostCalculationDto> CalculateCostTT37Async(Guid surgeryId, bool hasTeamChange);

    /// <summary>
    /// Báo cáo thống kê PTTT
    /// </summary>
    Task<SurgeryStatisticsDto> GetStatisticsAsync(DateTime fromDate, DateTime toDate, Guid? departmentId);

    #endregion

    #region 6.1.1 Quản lý định mức

    /// <summary>
    /// Lấy danh sách gói PTTT
    /// </summary>
    Task<List<SurgeryPackageDto>> GetSurgeryPackagesAsync(Guid? surgeryServiceId);

    /// <summary>
    /// Lấy chi tiết gói PTTT
    /// </summary>
    Task<SurgeryPackageDto?> GetSurgeryPackageByIdAsync(Guid id);

    /// <summary>
    /// Tạo/Cập nhật gói PTTT
    /// </summary>
    Task<SurgeryPackageDto> SaveSurgeryPackageAsync(SurgeryPackageDto dto, Guid userId);

    /// <summary>
    /// Xóa gói PTTT
    /// </summary>
    Task<bool> DeleteSurgeryPackageAsync(Guid id, Guid userId);

    /// <summary>
    /// Lấy định mức thuốc theo gói
    /// </summary>
    Task<List<PackageMedicineNormDto>> GetPackageMedicineNormsAsync(Guid packageId);

    /// <summary>
    /// Lấy định mức vật tư theo gói
    /// </summary>
    Task<List<PackageSupplyNormDto>> GetPackageSupplyNormsAsync(Guid packageId);

    #endregion

    #region 6.2 Màn hình chờ phòng mổ

    /// <summary>
    /// Lấy danh sách bệnh nhân chờ PTTT
    /// </summary>
    Task<SurgeryWaitingListDto> GetWaitingListAsync(Guid operatingRoomId, DateTime date);

    /// <summary>
    /// Lấy tất cả danh sách chờ của tất cả phòng mổ
    /// </summary>
    Task<List<SurgeryWaitingListDto>> GetAllWaitingListsAsync(DateTime date);

    /// <summary>
    /// Lấy danh sách phòng mổ
    /// </summary>
    Task<List<OperatingRoomDto>> GetOperatingRoomsAsync(int? roomType, int? status);

    /// <summary>
    /// Cập nhật trạng thái phòng mổ
    /// </summary>
    Task<OperatingRoomDto> UpdateOperatingRoomStatusAsync(Guid roomId, int status, Guid userId);

    #endregion

    #region 6.3 Thực hiện PTTT

    /// <summary>
    /// Bắt đầu ca mổ
    /// </summary>
    Task<SurgeryDto> StartSurgeryAsync(StartSurgeryDto dto, Guid userId);

    /// <summary>
    /// Kết thúc ca mổ
    /// </summary>
    Task<SurgeryDto> CompleteSurgeryAsync(CompleteSurgeryDto dto, Guid userId);

    /// <summary>
    /// Cập nhật thông tin thực hiện PTTT
    /// </summary>
    Task<SurgeryDto> UpdateExecutionInfoAsync(SurgeryExecutionDto dto, Guid userId);

    /// <summary>
    /// Nhập chẩn đoán trước mổ
    /// </summary>
    Task<SurgeryDto> UpdatePreOperativeDiagnosisAsync(Guid surgeryId, string diagnosis, string icdCode, Guid userId);

    /// <summary>
    /// Nhập chẩn đoán sau mổ
    /// </summary>
    Task<SurgeryDto> UpdatePostOperativeDiagnosisAsync(Guid surgeryId, string diagnosis, string icdCode, Guid userId);

    /// <summary>
    /// Khai báo thông tin PTTT theo TT50
    /// </summary>
    Task<SurgeryDto> UpdateTT50InfoAsync(Guid surgeryId, SurgeryTT50InfoDto dto, Guid userId);

    /// <summary>
    /// Nhập mô tả ca mổ
    /// </summary>
    Task<SurgeryDto> UpdateDescriptionAsync(Guid surgeryId, string description, Guid userId);

    /// <summary>
    /// Nhập kết luận ca mổ
    /// </summary>
    Task<SurgeryDto> UpdateConclusionAsync(Guid surgeryId, string conclusion, Guid userId);

    /// <summary>
    /// Cập nhật ekip mổ
    /// </summary>
    Task<SurgeryDto> UpdateTeamMembersAsync(Guid surgeryId, List<SurgeryTeamMemberRequestDto> members, Guid userId);

    /// <summary>
    /// Thay đổi ekip mổ giữa chừng
    /// </summary>
    Task<SurgeryDto> ChangeTeamMemberAsync(Guid surgeryId, Guid oldMemberId, SurgeryTeamMemberRequestDto newMember, DateTime changeTime, Guid userId);

    #endregion

    #region 6.3.1 In ấn PTTT

    /// <summary>
    /// In phiếu chứng nhận PTTT
    /// </summary>
    Task<byte[]> PrintSurgeryCertificateAsync(Guid surgeryId);

    /// <summary>
    /// In giải trình/tường trình phẫu thuật
    /// </summary>
    Task<byte[]> PrintSurgeryReportAsync(Guid surgeryId);

    /// <summary>
    /// In bảng kiểm an toàn phẫu thuật
    /// </summary>
    Task<byte[]> PrintSafetyChecklistAsync(Guid surgeryId);

    /// <summary>
    /// In phiếu PTTT
    /// </summary>
    Task<byte[]> PrintSurgeryFormAsync(Guid surgeryId);

    /// <summary>
    /// In phiếu xét nghiệm giải phẫu bệnh sinh thiết
    /// </summary>
    Task<byte[]> PrintPathologyFormAsync(Guid surgeryId);

    /// <summary>
    /// In trích/biên bản hội chẩn PT
    /// </summary>
    Task<byte[]> PrintConsultationMinutesAsync(Guid surgeryId);

    /// <summary>
    /// In bảng kiểm chuẩn bị BN trước PT
    /// </summary>
    Task<byte[]> PrintPreOpChecklistAsync(Guid surgeryId);

    /// <summary>
    /// In bảng câu hỏi tiền phẫu
    /// </summary>
    Task<byte[]> PrintPreOpQuestionnaireAsync(Guid surgeryId);

    /// <summary>
    /// In phiếu GMHS
    /// </summary>
    Task<byte[]> PrintAnesthesiaFormAsync(Guid surgeryId);

    /// <summary>
    /// In phiếu theo dõi BN chăm sóc cấp I sau PT
    /// </summary>
    Task<byte[]> PrintPostOpCareFormAsync(Guid surgeryId);

    /// <summary>
    /// In phiếu thực hiện và công khai thuốc
    /// </summary>
    Task<byte[]> PrintMedicineDisclosureAsync(Guid surgeryId);

    /// <summary>
    /// Xuất XML 4210 bảng 5 (PTTT)
    /// </summary>
    Task<byte[]> ExportXml4210Async(Guid surgeryId);

    #endregion

    #region 6.4 Chỉ định dịch vụ trong PTTT

    /// <summary>
    /// Lấy chẩn đoán từ y lệnh
    /// </summary>
    Task<string?> GetDiagnosisFromOrderAsync(Guid medicalRecordId);

    /// <summary>
    /// Tìm kiếm bệnh theo ICD-10
    /// </summary>
    Task<List<IcdCodeDto>> SearchIcdCodesAsync(string keyword, bool byCode);

    /// <summary>
    /// Tìm kiếm dịch vụ
    /// </summary>
    Task<List<SurgeryServiceDto>> SearchServicesAsync(string keyword, int? serviceType);

    /// <summary>
    /// Chỉ định dịch vụ trong PTTT
    /// </summary>
    Task<SurgeryServiceOrderDto> OrderServiceAsync(CreateSurgeryServiceOrderDto dto, Guid userId);

    /// <summary>
    /// Chỉ định nhiều dịch vụ cùng lúc
    /// </summary>
    Task<List<SurgeryServiceOrderDto>> OrderServicesAsync(Guid surgeryId, List<CreateSurgeryServiceOrderDto> dtos, Guid userId);

    /// <summary>
    /// Chỉ định dịch vụ theo gói
    /// </summary>
    Task<SurgeryPackageOrderDto> OrderPackageAsync(Guid surgeryId, Guid packageId, Guid userId);

    /// <summary>
    /// Sao chép y lệnh cận lâm sàng cũ
    /// </summary>
    Task<List<SurgeryServiceOrderDto>> CopyPreviousOrdersAsync(Guid surgeryId, Guid sourceSurgeryId, Guid userId);

    /// <summary>
    /// Sửa chỉ định dịch vụ
    /// </summary>
    Task<SurgeryServiceOrderDto> UpdateServiceOrderAsync(Guid orderId, CreateSurgeryServiceOrderDto dto, Guid userId);

    /// <summary>
    /// Xóa chỉ định dịch vụ
    /// </summary>
    Task<bool> DeleteServiceOrderAsync(Guid orderId, Guid userId);

    /// <summary>
    /// Lấy danh sách chỉ định dịch vụ của PTTT
    /// </summary>
    Task<List<SurgeryServiceOrderDto>> GetServiceOrdersAsync(Guid surgeryId);

    /// <summary>
    /// Thay đổi người chỉ định
    /// </summary>
    Task<SurgeryServiceOrderDto> ChangeOrderDoctorAsync(Guid orderId, Guid newDoctorId, Guid userId);

    /// <summary>
    /// Thay đổi đối tượng thanh toán
    /// </summary>
    Task<SurgeryServiceOrderDto> ChangePaymentObjectAsync(Guid orderId, int paymentObject, Guid userId);

    /// <summary>
    /// Xem tổng chi phí dịch vụ
    /// </summary>
    Task<ServiceCostInfoDto> GetServiceCostInfoAsync(Guid surgeryId);

    /// <summary>
    /// Kiểm tra cảnh báo trước khi chỉ định
    /// </summary>
    Task<List<ServiceOrderWarningDto>> CheckOrderWarningsAsync(Guid surgeryId, Guid serviceId);

    #endregion

    #region 6.4.1 Nhóm dịch vụ nhanh

    /// <summary>
    /// Lấy danh sách nhóm dịch vụ nhanh
    /// </summary>
    Task<List<SurgeryServiceGroupDto>> GetServiceGroupsAsync(Guid userId);

    /// <summary>
    /// Tạo nhóm dịch vụ nhanh
    /// </summary>
    Task<SurgeryServiceGroupDto> CreateServiceGroupAsync(SurgeryServiceGroupDto dto, Guid userId);

    /// <summary>
    /// Cập nhật nhóm dịch vụ
    /// </summary>
    Task<SurgeryServiceGroupDto> UpdateServiceGroupAsync(Guid groupId, SurgeryServiceGroupDto dto, Guid userId);

    /// <summary>
    /// Xóa nhóm dịch vụ
    /// </summary>
    Task<bool> DeleteServiceGroupAsync(Guid groupId, Guid userId);

    /// <summary>
    /// Chỉ định theo nhóm dịch vụ
    /// </summary>
    Task<List<SurgeryServiceOrderDto>> OrderByGroupAsync(Guid surgeryId, Guid groupId, Guid userId);

    #endregion

    #region 6.4.2 In chỉ định

    /// <summary>
    /// In phiếu chỉ định
    /// </summary>
    Task<byte[]> PrintServiceOrderAsync(Guid orderId);

    /// <summary>
    /// In tách chỉ định theo đối tượng thanh toán
    /// </summary>
    Task<byte[]> PrintOrdersByPaymentObjectAsync(Guid surgeryId, int paymentObject);

    /// <summary>
    /// In tách chỉ định theo nhóm dịch vụ
    /// </summary>
    Task<byte[]> PrintOrdersByGroupAsync(Guid surgeryId, string serviceGroup);

    /// <summary>
    /// In gộp nhiều chỉ định
    /// </summary>
    Task<byte[]> PrintMultipleOrdersAsync(List<Guid> orderIds);

    #endregion

    #region 6.5 Kê thuốc, vật tư trong PTTT

    /// <summary>
    /// Lấy đơn thuốc/vật tư của PTTT
    /// </summary>
    Task<SurgeryPrescriptionDto> GetPrescriptionAsync(Guid surgeryId);

    /// <summary>
    /// Thêm thuốc vào PTTT
    /// </summary>
    Task<SurgeryMedicineDto> AddMedicineAsync(AddSurgeryMedicineDto dto, Guid userId);

    /// <summary>
    /// Thêm vật tư vào PTTT
    /// </summary>
    Task<SurgerySupplyDto> AddSupplyAsync(AddSurgerySupplyDto dto, Guid userId);

    /// <summary>
    /// Cập nhật thuốc trong PTTT
    /// </summary>
    Task<SurgeryMedicineDto> UpdateMedicineAsync(Guid medicineItemId, AddSurgeryMedicineDto dto, Guid userId);

    /// <summary>
    /// Cập nhật vật tư trong PTTT
    /// </summary>
    Task<SurgerySupplyDto> UpdateSupplyAsync(Guid supplyItemId, AddSurgerySupplyDto dto, Guid userId);

    /// <summary>
    /// Xóa thuốc khỏi PTTT
    /// </summary>
    Task<bool> RemoveMedicineAsync(Guid medicineItemId, Guid userId);

    /// <summary>
    /// Xóa vật tư khỏi PTTT
    /// </summary>
    Task<bool> RemoveSupplyAsync(Guid supplyItemId, Guid userId);

    /// <summary>
    /// Kê thuốc/vật tư theo gói
    /// </summary>
    Task<SurgeryPrescriptionDto> ApplyPackageAsync(Guid surgeryId, Guid packageId, Guid userId);

    /// <summary>
    /// Kê thuốc từ tủ trực
    /// </summary>
    Task<List<SurgeryMedicineDto>> AddFromEmergencyCabinetAsync(Guid surgeryId, Guid cabinetId, List<AddSurgeryMedicineDto> medicines, Guid userId);

    /// <summary>
    /// Tìm kiếm thuốc
    /// </summary>
    Task<List<MedicineDetailDto>> SearchMedicinesAsync(string keyword, Guid warehouseId);

    /// <summary>
    /// Kiểm tra cảnh báo thuốc
    /// </summary>
    Task<List<MedicineWarningDto>> CheckMedicineWarningsAsync(Guid surgeryId, Guid medicineId);

    /// <summary>
    /// Xem thông tin chống chỉ định
    /// </summary>
    Task<string?> GetContraindicationsAsync(Guid medicineId);

    /// <summary>
    /// Xem tồn kho thuốc
    /// </summary>
    Task<decimal> GetMedicineStockAsync(Guid medicineId, Guid warehouseId);

    /// <summary>
    /// Xem thông tin chi tiết thuốc
    /// </summary>
    Task<MedicineDetailDto?> GetMedicineDetailAsync(Guid medicineId, Guid warehouseId);

    #endregion

    #region 6.5.1 Mẫu đơn thuốc

    /// <summary>
    /// Lấy danh sách mẫu đơn thuốc
    /// </summary>
    Task<List<SurgeryPrescriptionTemplateDto>> GetPrescriptionTemplatesAsync(Guid userId, Guid? surgeryServiceId);

    /// <summary>
    /// Lưu mẫu đơn thuốc
    /// </summary>
    Task<SurgeryPrescriptionTemplateDto> SavePrescriptionTemplateAsync(SurgeryPrescriptionTemplateDto dto, Guid userId);

    /// <summary>
    /// Xóa mẫu đơn thuốc
    /// </summary>
    Task<bool> DeletePrescriptionTemplateAsync(Guid templateId, Guid userId);

    /// <summary>
    /// Chia sẻ mẫu đơn thuốc
    /// </summary>
    Task<SurgeryPrescriptionTemplateDto> SharePrescriptionTemplateAsync(Guid templateId, Guid userId);

    /// <summary>
    /// Áp dụng mẫu đơn thuốc
    /// </summary>
    Task<SurgeryPrescriptionDto> ApplyPrescriptionTemplateAsync(Guid surgeryId, Guid templateId, Guid userId);

    /// <summary>
    /// Sao chép đơn thuốc cũ
    /// </summary>
    Task<SurgeryPrescriptionDto> CopyPrescriptionAsync(Guid surgeryId, Guid sourceSurgeryId, Guid userId);

    #endregion

    #region 6.6 Kê đơn máu trong PTTT

    /// <summary>
    /// Lấy kê đơn máu của PTTT
    /// </summary>
    Task<SurgeryBloodOrderDto?> GetBloodOrderAsync(Guid surgeryId);

    /// <summary>
    /// Tạo kê đơn máu
    /// </summary>
    Task<SurgeryBloodOrderDto> CreateBloodOrderAsync(CreateBloodOrderDto dto, Guid userId);

    /// <summary>
    /// Cập nhật kê đơn máu
    /// </summary>
    Task<SurgeryBloodOrderDto> UpdateBloodOrderAsync(Guid orderId, CreateBloodOrderDto dto, Guid userId);

    /// <summary>
    /// Xóa kê đơn máu
    /// </summary>
    Task<bool> DeleteBloodOrderAsync(Guid orderId, Guid userId);

    /// <summary>
    /// Lấy danh sách kho máu
    /// </summary>
    Task<List<BloodBankDto>> GetBloodBanksAsync();

    /// <summary>
    /// Tìm kiếm chế phẩm máu
    /// </summary>
    Task<List<BloodProductItemDto>> SearchBloodProductsAsync(Guid bloodBankId, string? bloodType, string? rhFactor);

    /// <summary>
    /// Xem tồn kho máu
    /// </summary>
    Task<decimal> GetBloodProductStockAsync(Guid bloodProductId, Guid bloodBankId);

    #endregion
}

#region Additional DTOs

/// <summary>
/// DTO cho mã ICD
/// </summary>
public class IcdCodeDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? NameEnglish { get; set; }
    public string? Chapter { get; set; }
}

/// <summary>
/// DTO cho dịch vụ phẫu thuật
/// </summary>
public class SurgeryServiceDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? GroupName { get; set; }
    public int ServiceType { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal? InsurancePrice { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO cho kho máu
/// </summary>
public class BloodBankDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

#endregion
