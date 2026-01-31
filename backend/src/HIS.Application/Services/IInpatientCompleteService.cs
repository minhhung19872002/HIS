using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;

namespace HIS.Application.Services;

/// <summary>
/// Service Interface đầy đủ cho Phân hệ 3: Quản lý Điều trị Nội trú
/// Bao gồm 100+ chức năng theo yêu cầu
/// </summary>
public interface IInpatientCompleteService
{
    #region 3.1 Màn hình chờ buồng bệnh

    /// <summary>
    /// Lấy sơ đồ buồng bệnh theo khoa
    /// </summary>
    Task<WardLayoutDto> GetWardLayoutAsync(Guid departmentId);

    /// <summary>
    /// Lấy danh sách phòng với trạng thái giường
    /// </summary>
    Task<List<RoomLayoutDto>> GetRoomLayoutsAsync(Guid departmentId);

    /// <summary>
    /// Lấy chi tiết layout giường trong phòng
    /// </summary>
    Task<List<BedLayoutDto>> GetBedLayoutsAsync(Guid roomId);

    /// <summary>
    /// Lấy thông tin nằm ghép
    /// </summary>
    Task<List<SharedBedPatientDto>> GetSharedBedPatientsAsync(Guid bedId);

    /// <summary>
    /// Lấy cấu hình màu hiển thị
    /// </summary>
    Task<WardColorConfigDto> GetWardColorConfigAsync(Guid? departmentId);

    /// <summary>
    /// Cập nhật cấu hình màu hiển thị
    /// </summary>
    Task UpdateWardColorConfigAsync(Guid? departmentId, WardColorConfigDto config);

    #endregion

    #region 3.2 Quản lý bệnh nhân

    /// <summary>
    /// Lấy danh sách bệnh nhân trong khoa/buồng
    /// </summary>
    Task<PagedResultDto<InpatientListDto>> GetInpatientListAsync(InpatientSearchDto searchDto);

    /// <summary>
    /// Tiếp nhận bệnh nhân từ phòng khám
    /// </summary>
    Task<AdmissionDto> AdmitFromOpdAsync(AdmitFromOpdDto dto, Guid userId);

    /// <summary>
    /// Tiếp nhận bệnh nhân từ khoa khác
    /// </summary>
    Task<AdmissionDto> AdmitFromDepartmentAsync(AdmitFromDepartmentDto dto, Guid userId);

    /// <summary>
    /// Tiếp nhận điều trị kết hợp
    /// </summary>
    Task<CombinedTreatmentDto> CreateCombinedTreatmentAsync(CreateCombinedTreatmentDto dto, Guid userId);

    /// <summary>
    /// Lấy danh sách điều trị kết hợp
    /// </summary>
    Task<List<CombinedTreatmentDto>> GetCombinedTreatmentsAsync(Guid admissionId);

    /// <summary>
    /// Hoàn thành điều trị kết hợp
    /// </summary>
    Task<CombinedTreatmentDto> CompleteCombinedTreatmentAsync(Guid id, string treatmentResult, Guid userId);

    /// <summary>
    /// Chuyển khoa
    /// </summary>
    Task<AdmissionDto> TransferDepartmentAsync(DepartmentTransferDto dto, Guid userId);

    /// <summary>
    /// Chuyển điều trị kết hợp
    /// </summary>
    Task<CombinedTreatmentDto> TransferCombinedTreatmentAsync(Guid combinedTreatmentId, Guid newDepartmentId, Guid userId);

    /// <summary>
    /// Gửi khám chuyên khoa
    /// </summary>
    Task<SpecialtyConsultRequestDto> RequestSpecialtyConsultAsync(CreateSpecialtyConsultDto dto, Guid userId);

    /// <summary>
    /// Lấy danh sách yêu cầu khám chuyên khoa
    /// </summary>
    Task<List<SpecialtyConsultRequestDto>> GetSpecialtyConsultRequestsAsync(Guid admissionId);

    /// <summary>
    /// Hoàn thành khám chuyên khoa
    /// </summary>
    Task<SpecialtyConsultRequestDto> CompleteSpecialtyConsultAsync(Guid id, string result, string recommendations, Guid doctorId);

    /// <summary>
    /// Chuyển mổ phiên
    /// </summary>
    Task<bool> TransferToScheduledSurgeryAsync(SurgeryTransferDto dto, Guid userId);

    /// <summary>
    /// Chuyển mổ cấp cứu
    /// </summary>
    Task<bool> TransferToEmergencySurgeryAsync(SurgeryTransferDto dto, Guid userId);

    /// <summary>
    /// Bổ sung thẻ BHYT
    /// </summary>
    Task<AdmissionDto> UpdateInsuranceAsync(UpdateInsuranceDto dto, Guid userId);

    /// <summary>
    /// Kiểm tra thông tuyến thẻ BHYT
    /// </summary>
    Task<InsuranceReferralCheckDto> CheckInsuranceReferralAsync(Guid admissionId);

    /// <summary>
    /// Tự động chuyển viện phí khi hết BHYT
    /// </summary>
    Task<bool> ConvertToFeePayingAsync(Guid admissionId, Guid userId);

    /// <summary>
    /// Phân giường cho bệnh nhân
    /// </summary>
    Task<BedAssignmentDto> AssignBedAsync(CreateBedAssignmentDto dto, Guid userId);

    /// <summary>
    /// Chuyển giường
    /// </summary>
    Task<BedAssignmentDto> TransferBedAsync(TransferBedDto dto, Guid userId);

    /// <summary>
    /// Đăng ký nằm ghép
    /// </summary>
    Task<bool> RegisterSharedBedAsync(Guid admissionId, Guid bedId, Guid userId);

    /// <summary>
    /// Trả giường
    /// </summary>
    Task ReleaseBedAsync(Guid admissionId, Guid userId);

    /// <summary>
    /// Lấy trạng thái giường
    /// </summary>
    Task<List<BedStatusDto>> GetBedStatusAsync(Guid? departmentId, Guid? roomId);

    /// <summary>
    /// Lấy thông tin y lệnh theo ngày
    /// </summary>
    Task<DailyOrderSummaryDto> GetDailyOrderSummaryAsync(Guid admissionId, DateTime date);

    /// <summary>
    /// Lấy kết quả CLS của bệnh nhân
    /// </summary>
    Task<List<LabResultItemDto>> GetLabResultsAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate);

    /// <summary>
    /// In kết quả xét nghiệm
    /// </summary>
    Task<byte[]> PrintLabResultsAsync(Guid admissionId, List<Guid> resultIds);

    /// <summary>
    /// In phiếu PTTT
    /// </summary>
    Task<byte[]> PrintSurgeryFormAsync(Guid surgeryId);

    /// <summary>
    /// Lấy tình hình viện phí khoa
    /// </summary>
    Task<DepartmentFeeOverviewDto> GetDepartmentFeeOverviewAsync(Guid departmentId);

    /// <summary>
    /// Lấy viện phí bệnh nhân
    /// </summary>
    Task<PatientFeeItemDto> GetPatientFeeAsync(Guid admissionId);

    /// <summary>
    /// Tạo yêu cầu tạm ứng
    /// </summary>
    Task<DepositRequestDto> CreateDepositRequestAsync(CreateDepositRequestDto dto, Guid userId);

    /// <summary>
    /// Lấy danh sách yêu cầu tạm ứng
    /// </summary>
    Task<List<DepositRequestDto>> GetDepositRequestsAsync(Guid? departmentId, int? status);

    /// <summary>
    /// Kiểm tra cảnh báo chuyển khoa
    /// </summary>
    Task<TransferWarningDto> CheckTransferWarningsAsync(Guid admissionId);

    #endregion

    #region 3.3 Chỉ định dịch vụ nội trú

    /// <summary>
    /// Lấy chẩn đoán từ hồ sơ
    /// </summary>
    Task<(string? DiagnosisCode, string? Diagnosis)> GetDiagnosisFromRecordAsync(Guid admissionId);

    /// <summary>
    /// Tìm kiếm dịch vụ theo cây
    /// </summary>
    Task<List<object>> GetServiceTreeAsync(Guid? parentId);

    /// <summary>
    /// Tìm kiếm dịch vụ theo mã/tên
    /// </summary>
    Task<List<object>> SearchServicesAsync(string keyword, string? serviceType);

    /// <summary>
    /// Tạo chỉ định dịch vụ
    /// </summary>
    Task<InpatientServiceOrderDto> CreateServiceOrderAsync(CreateInpatientServiceOrderDto dto, Guid userId);

    /// <summary>
    /// Cập nhật chỉ định dịch vụ
    /// </summary>
    Task<InpatientServiceOrderDto> UpdateServiceOrderAsync(Guid id, CreateInpatientServiceOrderDto dto, Guid userId);

    /// <summary>
    /// Xóa chỉ định dịch vụ
    /// </summary>
    Task DeleteServiceOrderAsync(Guid id, Guid userId);

    /// <summary>
    /// Xóa item dịch vụ
    /// </summary>
    Task DeleteServiceItemAsync(Guid itemId, Guid userId);

    /// <summary>
    /// Lấy danh sách chỉ định dịch vụ
    /// </summary>
    Task<List<InpatientServiceOrderDto>> GetServiceOrdersAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate);

    /// <summary>
    /// Lấy chi tiết chỉ định
    /// </summary>
    Task<InpatientServiceOrderDto?> GetServiceOrderByIdAsync(Guid id);

    /// <summary>
    /// Tạo nhóm dịch vụ mẫu
    /// </summary>
    Task<ServiceGroupTemplateDto> CreateServiceGroupTemplateAsync(ServiceGroupTemplateDto dto, Guid userId);

    /// <summary>
    /// Lấy danh sách nhóm dịch vụ mẫu
    /// </summary>
    Task<List<ServiceGroupTemplateDto>> GetServiceGroupTemplatesAsync(Guid? departmentId, Guid? userId);

    /// <summary>
    /// Chỉ định theo nhóm mẫu
    /// </summary>
    Task<InpatientServiceOrderDto> OrderByTemplateAsync(Guid admissionId, Guid templateId, Guid userId);

    /// <summary>
    /// Sao chép y lệnh CLS cũ
    /// </summary>
    Task<InpatientServiceOrderDto> CopyPreviousServiceOrderAsync(Guid admissionId, Guid sourceOrderId, Guid userId);

    /// <summary>
    /// Chỉ định theo gói
    /// </summary>
    Task<InpatientServiceOrderDto> OrderByPackageAsync(Guid admissionId, Guid packageId, Guid userId);

    /// <summary>
    /// Đánh dấu chỉ định ưu tiên
    /// </summary>
    Task MarkServiceAsUrgentAsync(Guid itemId, bool isUrgent, Guid userId);

    /// <summary>
    /// Đánh dấu chỉ định cấp cứu
    /// </summary>
    Task MarkServiceAsEmergencyAsync(Guid itemId, bool isEmergency, Guid userId);

    /// <summary>
    /// Kiểm tra cảnh báo chỉ định
    /// </summary>
    Task<ServiceOrderWarningDto> CheckServiceOrderWarningsAsync(Guid admissionId, List<CreateInpatientServiceItemDto> items);

    /// <summary>
    /// In phiếu chỉ định
    /// </summary>
    Task<byte[]> PrintServiceOrderAsync(Guid orderId);

    /// <summary>
    /// In phiếu chỉ định tách theo đối tượng
    /// </summary>
    Task<byte[]> PrintServiceOrderByPaymentSourceAsync(Guid orderId, int paymentSource);

    /// <summary>
    /// In phiếu chỉ định gộp
    /// </summary>
    Task<byte[]> PrintCombinedServiceOrderAsync(Guid admissionId, DateTime fromDate, DateTime toDate);

    #endregion

    #region 3.4 Kê đơn thuốc nội trú

    /// <summary>
    /// Tìm kiếm thuốc theo tên/mã/hoạt chất
    /// </summary>
    Task<List<object>> SearchMedicinesAsync(string keyword, Guid warehouseId);

    /// <summary>
    /// Xem thông tin chống chỉ định thuốc
    /// </summary>
    Task<object> GetMedicineContraindicationsAsync(Guid medicineId, Guid admissionId);

    /// <summary>
    /// Xem tồn kho thuốc
    /// </summary>
    Task<decimal> GetMedicineStockAsync(Guid medicineId, Guid warehouseId);

    /// <summary>
    /// Xem thông tin chi tiết thuốc
    /// </summary>
    Task<object> GetMedicineDetailsAsync(Guid medicineId);

    /// <summary>
    /// Tạo đơn thuốc nội trú
    /// </summary>
    Task<InpatientPrescriptionDto> CreatePrescriptionAsync(CreateInpatientPrescriptionDto dto, Guid userId);

    /// <summary>
    /// Cập nhật đơn thuốc
    /// </summary>
    Task<InpatientPrescriptionDto> UpdatePrescriptionAsync(Guid id, CreateInpatientPrescriptionDto dto, Guid userId);

    /// <summary>
    /// Xóa đơn thuốc
    /// </summary>
    Task DeletePrescriptionAsync(Guid id, Guid userId);

    /// <summary>
    /// Lấy danh sách đơn thuốc
    /// </summary>
    Task<List<InpatientPrescriptionDto>> GetPrescriptionsAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate);

    /// <summary>
    /// Lấy chi tiết đơn thuốc
    /// </summary>
    Task<InpatientPrescriptionDto?> GetPrescriptionByIdAsync(Guid id);

    /// <summary>
    /// Kê đơn từ tủ trực
    /// </summary>
    Task<EmergencyCabinetPrescriptionDto> CreateEmergencyCabinetPrescriptionAsync(Guid admissionId, Guid cabinetId, List<CreateInpatientMedicineItemDto> items, Guid userId);

    /// <summary>
    /// Lấy danh sách tủ trực
    /// </summary>
    Task<List<object>> GetEmergencyCabinetsAsync(Guid departmentId);

    /// <summary>
    /// Kê đơn YHCT
    /// </summary>
    Task<InpatientPrescriptionDto> CreateTraditionalMedicinePrescriptionAsync(Guid admissionId, int numberOfDoses, List<CreateInpatientMedicineItemDto> items, Guid userId);

    /// <summary>
    /// Tính số lượng theo số ngày
    /// </summary>
    Task<decimal> CalculateQuantityByDaysAsync(Guid medicineId, int days, string dosage);

    /// <summary>
    /// Tạo hướng dẫn sử dụng tự động
    /// </summary>
    Task<string> GenerateUsageInstructionAsync(Guid medicineId, string dosage);

    /// <summary>
    /// Lưu hướng dẫn sử dụng mẫu
    /// </summary>
    Task SaveUsageTemplateAsync(Guid medicineId, string usage, Guid userId);

    /// <summary>
    /// Kiểm tra cảnh báo kê đơn
    /// </summary>
    Task<PrescriptionWarningDto> CheckPrescriptionWarningsAsync(Guid admissionId, List<CreateInpatientMedicineItemDto> items);

    /// <summary>
    /// Tạo đơn thuốc mẫu
    /// </summary>
    Task<PrescriptionTemplateDto> CreatePrescriptionTemplateAsync(PrescriptionTemplateDto dto, Guid userId);

    /// <summary>
    /// Lấy danh sách đơn thuốc mẫu
    /// </summary>
    Task<List<PrescriptionTemplateDto>> GetPrescriptionTemplatesAsync(Guid? departmentId, Guid? userId);

    /// <summary>
    /// Kê theo mẫu
    /// </summary>
    Task<InpatientPrescriptionDto> PrescribeByTemplateAsync(Guid admissionId, Guid templateId, Guid userId);

    /// <summary>
    /// Sao chép đơn thuốc cũ
    /// </summary>
    Task<InpatientPrescriptionDto> CopyPreviousPrescriptionAsync(Guid admissionId, Guid sourcePrescriptionId, Guid userId);

    /// <summary>
    /// Tổng hợp phiếu lĩnh thuốc
    /// </summary>
    Task<MedicineOrderSummaryDto> CreateMedicineOrderSummaryAsync(Guid departmentId, DateTime date, Guid? roomId, Guid warehouseId, Guid userId);

    /// <summary>
    /// Lấy danh sách phiếu tổng hợp thuốc
    /// </summary>
    Task<List<MedicineOrderSummaryDto>> GetMedicineOrderSummariesAsync(Guid departmentId, DateTime fromDate, DateTime toDate);

    /// <summary>
    /// Tổng hợp phiếu lĩnh vật tư
    /// </summary>
    Task<SupplyOrderSummaryDto> CreateSupplyOrderSummaryAsync(Guid departmentId, DateTime date, Guid warehouseId, Guid userId);

    /// <summary>
    /// In phiếu tổng hợp thuốc
    /// </summary>
    Task<byte[]> PrintMedicineOrderSummaryAsync(Guid summaryId);

    /// <summary>
    /// In phiếu tra đối thuốc
    /// </summary>
    Task<byte[]> PrintMedicineVerificationAsync(Guid summaryId);

    /// <summary>
    /// In phiếu phát thuốc cho BN
    /// </summary>
    Task<byte[]> PrintPatientMedicineSlipAsync(Guid admissionId, DateTime date);

    #endregion

    #region 3.5 Chỉ định dinh dưỡng

    /// <summary>
    /// Tạo chỉ định suất ăn
    /// </summary>
    Task<NutritionOrderDto> CreateNutritionOrderAsync(CreateNutritionOrderDto dto, Guid userId);

    /// <summary>
    /// Cập nhật chỉ định suất ăn
    /// </summary>
    Task<NutritionOrderDto> UpdateNutritionOrderAsync(Guid id, CreateNutritionOrderDto dto, Guid userId);

    /// <summary>
    /// Xóa chỉ định suất ăn
    /// </summary>
    Task DeleteNutritionOrderAsync(Guid id, Guid userId);

    /// <summary>
    /// Lấy danh sách chỉ định suất ăn
    /// </summary>
    Task<List<NutritionOrderDto>> GetNutritionOrdersAsync(Guid? admissionId, Guid? departmentId, DateTime date);

    /// <summary>
    /// Tổng hợp suất ăn theo khoa
    /// </summary>
    Task<NutritionSummaryDto> GetNutritionSummaryAsync(Guid departmentId, DateTime date);

    /// <summary>
    /// In phiếu tổng hợp suất ăn
    /// </summary>
    Task<byte[]> PrintNutritionSummaryAsync(Guid departmentId, DateTime date);

    #endregion

    #region 3.6 Thông tin điều trị

    /// <summary>
    /// Tạo tờ điều trị
    /// </summary>
    Task<TreatmentSheetDto> CreateTreatmentSheetAsync(CreateTreatmentSheetDto dto, Guid userId);

    /// <summary>
    /// Cập nhật tờ điều trị
    /// </summary>
    Task<TreatmentSheetDto> UpdateTreatmentSheetAsync(Guid id, CreateTreatmentSheetDto dto, Guid userId);

    /// <summary>
    /// Xóa tờ điều trị
    /// </summary>
    Task DeleteTreatmentSheetAsync(Guid id, Guid userId);

    /// <summary>
    /// Lấy danh sách tờ điều trị
    /// </summary>
    Task<List<TreatmentSheetDto>> GetTreatmentSheetsAsync(TreatmentSheetSearchDto searchDto);

    /// <summary>
    /// Lấy chi tiết tờ điều trị
    /// </summary>
    Task<TreatmentSheetDto?> GetTreatmentSheetByIdAsync(Guid id);

    /// <summary>
    /// Tạo tờ điều trị mẫu
    /// </summary>
    Task<TreatmentSheetTemplateDto> CreateTreatmentSheetTemplateAsync(TreatmentSheetTemplateDto dto, Guid userId);

    /// <summary>
    /// Lấy danh sách mẫu tờ điều trị
    /// </summary>
    Task<List<TreatmentSheetTemplateDto>> GetTreatmentSheetTemplatesAsync(Guid? departmentId);

    /// <summary>
    /// Sao chép tờ điều trị
    /// </summary>
    Task<TreatmentSheetDto> CopyTreatmentSheetAsync(Guid sourceId, DateTime newDate, Guid userId);

    /// <summary>
    /// In tờ điều trị
    /// </summary>
    Task<byte[]> PrintTreatmentSheetAsync(Guid id);

    /// <summary>
    /// In gộp tờ điều trị nhiều ngày
    /// </summary>
    Task<byte[]> PrintCombinedTreatmentSheetsAsync(Guid admissionId, DateTime fromDate, DateTime toDate);

    /// <summary>
    /// Số hóa vỏ bệnh án
    /// </summary>
    Task<bool> DigitizeMedicalRecordCoverAsync(Guid admissionId, byte[] scannedImage, Guid userId);

    /// <summary>
    /// In vỏ bệnh án
    /// </summary>
    Task<byte[]> PrintMedicalRecordCoverAsync(Guid admissionId);

    /// <summary>
    /// Khai báo dấu hiệu sinh tồn
    /// </summary>
    Task<VitalSignsRecordDto> CreateVitalSignsAsync(CreateVitalSignsDto dto, Guid userId);

    /// <summary>
    /// Cập nhật dấu hiệu sinh tồn
    /// </summary>
    Task<VitalSignsRecordDto> UpdateVitalSignsAsync(Guid id, CreateVitalSignsDto dto, Guid userId);

    /// <summary>
    /// Lấy danh sách dấu hiệu sinh tồn
    /// </summary>
    Task<List<VitalSignsRecordDto>> GetVitalSignsListAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate);

    /// <summary>
    /// Lấy dữ liệu biểu đồ sinh tồn
    /// </summary>
    Task<VitalSignsChartDto> GetVitalSignsChartAsync(Guid admissionId, DateTime fromDate, DateTime toDate);

    /// <summary>
    /// In phiếu theo dõi sinh tồn
    /// </summary>
    Task<byte[]> PrintVitalSignsAsync(Guid admissionId, DateTime fromDate, DateTime toDate);

    /// <summary>
    /// Mời hội chẩn
    /// </summary>
    Task<ConsultationDto> CreateConsultationAsync(CreateConsultationDto dto, Guid userId);

    /// <summary>
    /// Cập nhật hội chẩn
    /// </summary>
    Task<ConsultationDto> UpdateConsultationAsync(Guid id, CreateConsultationDto dto, Guid userId);

    /// <summary>
    /// Lấy danh sách hội chẩn
    /// </summary>
    Task<List<ConsultationDto>> GetConsultationsAsync(Guid? admissionId, Guid? departmentId, DateTime? fromDate, DateTime? toDate);

    /// <summary>
    /// Hoàn thành hội chẩn
    /// </summary>
    Task<ConsultationDto> CompleteConsultationAsync(Guid id, string conclusion, string treatment, Guid userId);

    /// <summary>
    /// In biên bản hội chẩn
    /// </summary>
    Task<byte[]> PrintConsultationAsync(Guid id);

    /// <summary>
    /// Tạo phiếu chăm sóc
    /// </summary>
    Task<NursingCareSheetDto> CreateNursingCareSheetAsync(CreateNursingCareSheetDto dto, Guid userId);

    /// <summary>
    /// Cập nhật phiếu chăm sóc
    /// </summary>
    Task<NursingCareSheetDto> UpdateNursingCareSheetAsync(Guid id, CreateNursingCareSheetDto dto, Guid userId);

    /// <summary>
    /// Lấy danh sách phiếu chăm sóc
    /// </summary>
    Task<List<NursingCareSheetDto>> GetNursingCareSheetsAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate);

    /// <summary>
    /// In phiếu chăm sóc
    /// </summary>
    Task<byte[]> PrintNursingCareSheetAsync(Guid id);

    /// <summary>
    /// In gộp chăm sóc nhiều ngày
    /// </summary>
    Task<byte[]> PrintCombinedNursingCareSheetsAsync(Guid admissionId, DateTime fromDate, DateTime toDate);

    /// <summary>
    /// Tạo phiếu truyền dịch
    /// </summary>
    Task<InfusionRecordDto> CreateInfusionRecordAsync(CreateInfusionRecordDto dto, Guid userId);

    /// <summary>
    /// Cập nhật phiếu truyền dịch
    /// </summary>
    Task<InfusionRecordDto> UpdateInfusionRecordAsync(Guid id, string observations, string? complications, Guid userId);

    /// <summary>
    /// Hoàn thành truyền dịch
    /// </summary>
    Task<InfusionRecordDto> CompleteInfusionAsync(Guid id, DateTime endTime, Guid userId);

    /// <summary>
    /// Tính thời gian kết thúc truyền dịch
    /// </summary>
    Task<DateTime> CalculateInfusionEndTimeAsync(int volumeMl, int dropRate);

    /// <summary>
    /// Lấy danh sách phiếu truyền dịch
    /// </summary>
    Task<List<InfusionRecordDto>> GetInfusionRecordsAsync(Guid admissionId);

    /// <summary>
    /// In phiếu truyền dịch
    /// </summary>
    Task<byte[]> PrintInfusionRecordAsync(Guid id);

    /// <summary>
    /// Tạo phiếu truyền máu
    /// </summary>
    Task<BloodTransfusionDto> CreateBloodTransfusionAsync(CreateBloodTransfusionDto dto, Guid userId);

    /// <summary>
    /// Cập nhật theo dõi truyền máu
    /// </summary>
    Task<BloodTransfusionDto> UpdateBloodTransfusionMonitoringAsync(Guid id, string preVitals, string duringVitals, string postVitals, Guid userId);

    /// <summary>
    /// Ghi nhận phản ứng truyền máu
    /// </summary>
    Task<BloodTransfusionDto> RecordTransfusionReactionAsync(Guid id, string reactionDetails, Guid userId);

    /// <summary>
    /// Hoàn thành truyền máu
    /// </summary>
    Task<BloodTransfusionDto> CompleteBloodTransfusionAsync(Guid id, DateTime endTime, Guid userId);

    /// <summary>
    /// Lấy danh sách truyền máu
    /// </summary>
    Task<List<BloodTransfusionDto>> GetBloodTransfusionsAsync(Guid admissionId);

    /// <summary>
    /// In phiếu truyền máu
    /// </summary>
    Task<byte[]> PrintBloodTransfusionAsync(Guid id);

    /// <summary>
    /// Ghi nhận phản ứng thuốc
    /// </summary>
    Task<DrugReactionRecordDto> CreateDrugReactionRecordAsync(Guid admissionId, Guid? medicineId, string medicineName, int severity, string symptoms, string? treatment, Guid userId);

    /// <summary>
    /// Lấy danh sách phản ứng thuốc
    /// </summary>
    Task<List<DrugReactionRecordDto>> GetDrugReactionRecordsAsync(Guid admissionId);

    /// <summary>
    /// In phiếu phản ứng thuốc
    /// </summary>
    Task<byte[]> PrintDrugReactionRecordAsync(Guid id);

    /// <summary>
    /// Tạo hồ sơ tai nạn thương tích
    /// </summary>
    Task<InjuryRecordDto> CreateInjuryRecordAsync(Guid admissionId, InjuryRecordDto dto, Guid userId);

    /// <summary>
    /// Lấy hồ sơ tai nạn thương tích
    /// </summary>
    Task<InjuryRecordDto?> GetInjuryRecordAsync(Guid admissionId);

    /// <summary>
    /// Tạo hồ sơ trẻ sơ sinh
    /// </summary>
    Task<NewbornRecordDto> CreateNewbornRecordAsync(Guid motherAdmissionId, NewbornRecordDto dto, Guid userId);

    /// <summary>
    /// Lấy hồ sơ trẻ sơ sinh
    /// </summary>
    Task<List<NewbornRecordDto>> GetNewbornRecordsAsync(Guid motherAdmissionId);

    #endregion

    #region 3.7 Kết thúc điều trị

    /// <summary>
    /// Kiểm tra trước xuất viện
    /// </summary>
    Task<PreDischargeCheckDto> CheckPreDischargeAsync(Guid admissionId);

    /// <summary>
    /// Xuất viện
    /// </summary>
    Task<DischargeDto> DischargePatientAsync(CompleteDischargeDto dto, Guid userId);

    /// <summary>
    /// Hủy xuất viện
    /// </summary>
    Task<bool> CancelDischargeAsync(Guid admissionId, string reason, Guid userId);

    /// <summary>
    /// In giấy ra viện
    /// </summary>
    Task<byte[]> PrintDischargeCertificateAsync(Guid admissionId);

    /// <summary>
    /// In giấy chuyển tuyến
    /// </summary>
    Task<byte[]> PrintReferralCertificateAsync(Guid admissionId, ReferralCertificateDto data);

    /// <summary>
    /// In phiếu công khai dịch vụ
    /// </summary>
    Task<byte[]> PrintServiceDisclosureAsync(Guid admissionId);

    /// <summary>
    /// In phiếu công khai thuốc (11D)
    /// </summary>
    Task<byte[]> PrintMedicineDisclosureAsync(Guid admissionId);

    /// <summary>
    /// Lấy bảng kê thanh toán 6556
    /// </summary>
    Task<BillingStatement6556Dto> GetBillingStatement6556Async(Guid admissionId);

    /// <summary>
    /// In bảng kê 6556
    /// </summary>
    Task<byte[]> PrintBillingStatement6556Async(Guid admissionId);

    /// <summary>
    /// In bảng kê 6556 theo đối tượng
    /// </summary>
    Task<byte[]> PrintBillingStatement6556ByPatientTypeAsync(Guid admissionId, int patientType);

    /// <summary>
    /// In bảng kê 6556 theo khoa
    /// </summary>
    Task<byte[]> PrintBillingStatement6556ByDepartmentAsync(Guid admissionId, Guid departmentId);

    #endregion

    #region 3.8 Quản lý báo cáo

    /// <summary>
    /// Hạch toán doanh thu khoa
    /// </summary>
    Task<DepartmentRevenueReportDto> GetDepartmentRevenueReportAsync(ReportSearchDto searchDto);

    /// <summary>
    /// Báo cáo hoạt động điều trị
    /// </summary>
    Task<TreatmentActivityReportDto> GetTreatmentActivityReportAsync(ReportSearchDto searchDto);

    /// <summary>
    /// Báo cáo sổ theo QĐ 4069
    /// </summary>
    Task<Register4069Dto> GetRegister4069Async(DateTime fromDate, DateTime toDate, Guid? departmentId);

    /// <summary>
    /// In sổ theo QĐ 4069
    /// </summary>
    Task<byte[]> PrintRegister4069Async(DateTime fromDate, DateTime toDate, Guid? departmentId);

    /// <summary>
    /// Báo cáo thuốc vật tư sử dụng
    /// </summary>
    Task<MedicineSupplyUsageReportDto> GetMedicineSupplyUsageReportAsync(ReportSearchDto searchDto);

    /// <summary>
    /// In báo cáo thuốc vật tư
    /// </summary>
    Task<byte[]> PrintMedicineSupplyUsageReportAsync(ReportSearchDto searchDto);

    #endregion
}
