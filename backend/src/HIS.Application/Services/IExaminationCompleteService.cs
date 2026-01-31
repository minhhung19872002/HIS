using HIS.Application.DTOs;
using HIS.Application.DTOs.Examination;

namespace HIS.Application.Services;

/// <summary>
/// Service interface đầy đủ cho Phân hệ 2: Khám bệnh OPD
/// Bao gồm tất cả 180+ chức năng theo yêu cầu
/// </summary>
public interface IExaminationCompleteService
{
    #region 2.1 Màn hình chờ phòng khám

    /// <summary>
    /// Lấy thông tin hiển thị màn hình chờ của phòng khám
    /// </summary>
    Task<WaitingRoomDisplayDto> GetWaitingRoomDisplayAsync(Guid roomId);

    /// <summary>
    /// Lấy danh sách màn hình chờ tất cả phòng khám của khoa
    /// </summary>
    Task<List<WaitingRoomDisplayDto>> GetDepartmentWaitingRoomDisplaysAsync(Guid departmentId);

    /// <summary>
    /// Cập nhật cấu hình hiển thị màn hình chờ
    /// </summary>
    Task<bool> UpdateWaitingRoomDisplayConfigAsync(Guid roomId, WaitingRoomDisplayConfigDto config);

    /// <summary>
    /// Gọi bệnh nhân tiếp theo
    /// </summary>
    Task<CallingPatientDto?> CallNextPatientAsync(Guid roomId);

    /// <summary>
    /// Gọi lại bệnh nhân
    /// </summary>
    Task<CallingPatientDto> RecallPatientAsync(Guid examinationId);

    /// <summary>
    /// Bỏ qua bệnh nhân (chuyển xuống cuối hàng đợi)
    /// </summary>
    Task<bool> SkipPatientAsync(Guid examinationId);

    #endregion

    #region 2.2 Danh sách bệnh nhân phòng khám

    /// <summary>
    /// Lấy danh sách bệnh nhân trong phòng khám (chi tiết đầy đủ)
    /// </summary>
    Task<List<RoomPatientListDto>> GetRoomPatientListAsync(Guid roomId, DateTime date, int? status = null);

    /// <summary>
    /// Tìm kiếm bệnh nhân trong phòng khám
    /// </summary>
    Task<List<RoomPatientListDto>> SearchRoomPatientsAsync(Guid roomId, string keyword, DateTime date);

    /// <summary>
    /// Lọc bệnh nhân theo trạng thái đặc biệt
    /// </summary>
    Task<List<RoomPatientListDto>> FilterPatientsByConditionAsync(Guid roomId, PatientFilterDto filter);

    /// <summary>
    /// Lấy kết quả CLS của bệnh nhân
    /// </summary>
    Task<PatientLabResultsDto> GetPatientLabResultsAsync(Guid examinationId);

    /// <summary>
    /// Kiểm tra trạng thái CLS đang chờ kết quả
    /// </summary>
    Task<List<LabStatusDto>> GetPendingLabStatusAsync(Guid examinationId);

    /// <summary>
    /// Lấy thông tin ảnh chân dung bệnh nhân
    /// </summary>
    Task<string?> GetPatientPhotoAsync(Guid patientId);

    /// <summary>
    /// Cập nhật ảnh chân dung bệnh nhân
    /// </summary>
    Task<bool> UpdatePatientPhotoAsync(Guid patientId, string photoBase64);

    #endregion

    #region 2.3 Chức năng khám bệnh

    /// <summary>
    /// Lấy hồ sơ bệnh án đầy đủ của lượt khám
    /// </summary>
    Task<MedicalRecordFullDto> GetMedicalRecordFullAsync(Guid examinationId);

    /// <summary>
    /// Bắt đầu khám bệnh (chuyển trạng thái)
    /// </summary>
    Task<ExaminationDto> StartExaminationAsync(Guid examinationId, Guid doctorId);

    /// <summary>
    /// Cập nhật dấu hiệu sinh tồn đầy đủ
    /// </summary>
    Task<VitalSignsFullDto> UpdateVitalSignsAsync(Guid examinationId, VitalSignsFullDto dto);

    /// <summary>
    /// Lấy dấu hiệu sinh tồn
    /// </summary>
    Task<VitalSignsFullDto?> GetVitalSignsAsync(Guid examinationId);

    /// <summary>
    /// Tự động tính BMI và phân loại
    /// </summary>
    Task<BmiCalculationResult> CalculateBmiAsync(decimal weight, decimal height);

    /// <summary>
    /// Phân loại huyết áp theo tiêu chuẩn
    /// </summary>
    Task<string> ClassifyBloodPressureAsync(int systolic, int diastolic);

    /// <summary>
    /// Cập nhật thông tin hỏi bệnh
    /// </summary>
    Task<MedicalInterviewDto> UpdateMedicalInterviewAsync(Guid examinationId, MedicalInterviewDto dto);

    /// <summary>
    /// Lấy thông tin hỏi bệnh
    /// </summary>
    Task<MedicalInterviewDto?> GetMedicalInterviewAsync(Guid examinationId);

    /// <summary>
    /// Cập nhật khám toàn thân và bộ phận
    /// </summary>
    Task<PhysicalExaminationDto> UpdatePhysicalExaminationAsync(Guid examinationId, PhysicalExaminationDto dto);

    /// <summary>
    /// Lấy thông tin khám toàn thân
    /// </summary>
    Task<PhysicalExaminationDto?> GetPhysicalExaminationAsync(Guid examinationId);

    /// <summary>
    /// Lấy danh sách mẫu thăm khám
    /// </summary>
    Task<List<ExaminationTemplateDto>> GetExaminationTemplatesAsync(Guid? departmentId = null, int? templateType = null);

    /// <summary>
    /// Tạo mẫu thăm khám mới
    /// </summary>
    Task<ExaminationTemplateDto> CreateExaminationTemplateAsync(ExaminationTemplateDto dto);

    /// <summary>
    /// Cập nhật mẫu thăm khám
    /// </summary>
    Task<ExaminationTemplateDto> UpdateExaminationTemplateAsync(Guid id, ExaminationTemplateDto dto);

    /// <summary>
    /// Xóa mẫu thăm khám
    /// </summary>
    Task<bool> DeleteExaminationTemplateAsync(Guid id);

    /// <summary>
    /// Áp dụng mẫu thăm khám vào lượt khám
    /// </summary>
    Task<PhysicalExaminationDto> ApplyExaminationTemplateAsync(Guid examinationId, Guid templateId);

    /// <summary>
    /// Lưu khám hiện tại thành mẫu mới
    /// </summary>
    Task<ExaminationTemplateDto> SaveAsExaminationTemplateAsync(Guid examinationId, string templateName);

    /// <summary>
    /// Lấy danh sách dị ứng của bệnh nhân
    /// </summary>
    Task<List<AllergyDto>> GetPatientAllergiesAsync(Guid patientId);

    /// <summary>
    /// Thêm dị ứng cho bệnh nhân
    /// </summary>
    Task<AllergyDto> AddPatientAllergyAsync(Guid patientId, AllergyDto dto);

    /// <summary>
    /// Cập nhật dị ứng
    /// </summary>
    Task<AllergyDto> UpdatePatientAllergyAsync(Guid id, AllergyDto dto);

    /// <summary>
    /// Xóa dị ứng
    /// </summary>
    Task<bool> DeletePatientAllergyAsync(Guid id);

    /// <summary>
    /// Lấy danh sách chống chỉ định của bệnh nhân
    /// </summary>
    Task<List<ContraindicationDto>> GetPatientContraindicationsAsync(Guid patientId);

    /// <summary>
    /// Thêm chống chỉ định
    /// </summary>
    Task<ContraindicationDto> AddPatientContraindicationAsync(Guid patientId, ContraindicationDto dto);

    /// <summary>
    /// Cập nhật chống chỉ định
    /// </summary>
    Task<ContraindicationDto> UpdatePatientContraindicationAsync(Guid id, ContraindicationDto dto);

    /// <summary>
    /// Xóa chống chỉ định
    /// </summary>
    Task<bool> DeletePatientContraindicationAsync(Guid id);

    /// <summary>
    /// Lấy lịch sử khám bệnh của bệnh nhân
    /// </summary>
    Task<List<MedicalHistoryDto>> GetPatientMedicalHistoryAsync(Guid patientId, int limit = 20);

    /// <summary>
    /// Lấy chi tiết một lần khám trong lịch sử
    /// </summary>
    Task<MedicalRecordFullDto?> GetMedicalHistoryDetailAsync(Guid examinationId);

    /// <summary>
    /// Xem ảnh CĐHA trong lịch sử
    /// </summary>
    Task<List<string>> GetHistoryImagingImagesAsync(Guid orderId);

    /// <summary>
    /// Tạo tờ điều trị
    /// </summary>
    Task<TreatmentSheetDto> CreateTreatmentSheetAsync(TreatmentSheetDto dto);

    /// <summary>
    /// Cập nhật tờ điều trị
    /// </summary>
    Task<TreatmentSheetDto> UpdateTreatmentSheetAsync(Guid id, TreatmentSheetDto dto);

    /// <summary>
    /// Lấy danh sách tờ điều trị
    /// </summary>
    Task<List<TreatmentSheetDto>> GetTreatmentSheetsAsync(Guid examinationId);

    /// <summary>
    /// Tạo biên bản hội chẩn
    /// </summary>
    Task<ConsultationRecordDto> CreateConsultationRecordAsync(ConsultationRecordDto dto);

    /// <summary>
    /// Cập nhật biên bản hội chẩn
    /// </summary>
    Task<ConsultationRecordDto> UpdateConsultationRecordAsync(Guid id, ConsultationRecordDto dto);

    /// <summary>
    /// Lấy danh sách biên bản hội chẩn
    /// </summary>
    Task<List<ConsultationRecordDto>> GetConsultationRecordsAsync(Guid examinationId);

    /// <summary>
    /// Tạo phiếu chăm sóc
    /// </summary>
    Task<NursingCareSheetDto> CreateNursingCareSheetAsync(NursingCareSheetDto dto);

    /// <summary>
    /// Cập nhật phiếu chăm sóc
    /// </summary>
    Task<NursingCareSheetDto> UpdateNursingCareSheetAsync(Guid id, NursingCareSheetDto dto);

    /// <summary>
    /// Lấy danh sách phiếu chăm sóc
    /// </summary>
    Task<List<NursingCareSheetDto>> GetNursingCareSheetsAsync(Guid examinationId);

    /// <summary>
    /// Cập nhật thông tin tai nạn thương tích
    /// </summary>
    Task<InjuryInfoDto> UpdateInjuryInfoAsync(Guid examinationId, InjuryInfoDto dto);

    /// <summary>
    /// Lấy thông tin tai nạn thương tích
    /// </summary>
    Task<InjuryInfoDto?> GetInjuryInfoAsync(Guid examinationId);

    #endregion

    #region 2.4 Chẩn đoán

    /// <summary>
    /// Lấy danh sách chẩn đoán của lượt khám
    /// </summary>
    Task<List<DiagnosisFullDto>> GetDiagnosesAsync(Guid examinationId);

    /// <summary>
    /// Thêm chẩn đoán
    /// </summary>
    Task<DiagnosisFullDto> AddDiagnosisAsync(Guid examinationId, DiagnosisFullDto dto);

    /// <summary>
    /// Cập nhật chẩn đoán
    /// </summary>
    Task<DiagnosisFullDto> UpdateDiagnosisAsync(Guid diagnosisId, DiagnosisFullDto dto);

    /// <summary>
    /// Xóa chẩn đoán
    /// </summary>
    Task<bool> DeleteDiagnosisAsync(Guid diagnosisId);

    /// <summary>
    /// Cập nhật danh sách chẩn đoán (toàn bộ)
    /// </summary>
    Task<List<DiagnosisFullDto>> UpdateDiagnosisListAsync(Guid examinationId, UpdateDiagnosisDto dto);

    /// <summary>
    /// Đặt chẩn đoán chính
    /// </summary>
    Task<DiagnosisFullDto> SetPrimaryDiagnosisAsync(Guid diagnosisId);

    /// <summary>
    /// Tìm kiếm mã ICD-10
    /// </summary>
    Task<List<IcdCodeFullDto>> SearchIcdCodesAsync(string keyword, int? icdType = null, int limit = 20);

    /// <summary>
    /// Lấy mã ICD theo code
    /// </summary>
    Task<IcdCodeFullDto?> GetIcdByCodeAsync(string code);

    /// <summary>
    /// Lấy danh sách ICD phổ biến theo chuyên khoa
    /// </summary>
    Task<List<IcdCodeFullDto>> GetFrequentIcdCodesAsync(Guid? departmentId = null, int limit = 20);

    /// <summary>
    /// Lấy gợi ý ICD dựa trên triệu chứng
    /// </summary>
    Task<List<IcdCodeFullDto>> SuggestIcdCodesAsync(string symptoms);

    /// <summary>
    /// Lấy ICD gần đây của bác sĩ
    /// </summary>
    Task<List<IcdCodeFullDto>> GetRecentIcdCodesAsync(Guid doctorId, int limit = 20);

    /// <summary>
    /// Tìm mã nguyên nhân ngoài
    /// </summary>
    Task<List<IcdCodeFullDto>> SearchExternalCauseCodesAsync(string keyword);

    #endregion

    #region 2.5 Khám thêm

    /// <summary>
    /// Tạo yêu cầu khám thêm
    /// </summary>
    Task<ExaminationDto> CreateAdditionalExaminationAsync(AdditionalExaminationDto dto);

    /// <summary>
    /// Chuyển phòng khám
    /// </summary>
    Task<ExaminationDto> TransferRoomAsync(TransferRoomRequestDto dto);

    /// <summary>
    /// Chuyển khám chính sang phòng khác
    /// </summary>
    Task<ExaminationDto> TransferPrimaryExaminationAsync(Guid examinationId, Guid newRoomId);

    /// <summary>
    /// Lấy danh sách khám thêm của lượt khám
    /// </summary>
    Task<List<ExaminationDto>> GetAdditionalExaminationsAsync(Guid primaryExaminationId);

    /// <summary>
    /// Hủy khám thêm
    /// </summary>
    Task<bool> CancelAdditionalExaminationAsync(Guid examinationId, string reason);

    /// <summary>
    /// Hoàn thành khám thêm và quay về khám chính
    /// </summary>
    Task<ExaminationDto> CompleteAdditionalExaminationAsync(Guid examinationId);

    #endregion

    #region 2.6 Chỉ định dịch vụ

    /// <summary>
    /// Lấy danh sách chỉ định dịch vụ
    /// </summary>
    Task<List<ServiceOrderFullDto>> GetServiceOrdersAsync(Guid examinationId);

    /// <summary>
    /// Tạo chỉ định dịch vụ
    /// </summary>
    Task<List<ServiceOrderFullDto>> CreateServiceOrdersAsync(CreateServiceOrderDto dto);

    /// <summary>
    /// Cập nhật chỉ định dịch vụ
    /// </summary>
    Task<ServiceOrderFullDto> UpdateServiceOrderAsync(Guid orderId, ServiceOrderFullDto dto);

    /// <summary>
    /// Hủy chỉ định dịch vụ
    /// </summary>
    Task<bool> CancelServiceOrderAsync(Guid orderId, string reason);

    /// <summary>
    /// Lấy danh sách dịch vụ theo loại
    /// </summary>
    Task<List<ServiceDto>> GetServicesAsync(int? serviceType = null, Guid? departmentId = null, string? keyword = null);

    /// <summary>
    /// Tìm kiếm dịch vụ
    /// </summary>
    Task<List<ServiceDto>> SearchServicesAsync(string keyword, int limit = 20);

    /// <summary>
    /// Lấy danh sách nhóm dịch vụ
    /// </summary>
    Task<List<ServiceGroupTemplateDto>> GetServiceGroupTemplatesAsync(Guid? departmentId = null);

    /// <summary>
    /// Tạo nhóm dịch vụ mới
    /// </summary>
    Task<ServiceGroupTemplateDto> CreateServiceGroupTemplateAsync(ServiceGroupTemplateDto dto);

    /// <summary>
    /// Cập nhật nhóm dịch vụ
    /// </summary>
    Task<ServiceGroupTemplateDto> UpdateServiceGroupTemplateAsync(Guid id, ServiceGroupTemplateDto dto);

    /// <summary>
    /// Xóa nhóm dịch vụ
    /// </summary>
    Task<bool> DeleteServiceGroupTemplateAsync(Guid id);

    /// <summary>
    /// Lấy danh sách gói dịch vụ
    /// </summary>
    Task<List<ServicePackageDto>> GetServicePackagesAsync();

    /// <summary>
    /// Áp dụng gói dịch vụ
    /// </summary>
    Task<List<ServiceOrderFullDto>> ApplyServicePackageAsync(Guid examinationId, Guid packageId);

    /// <summary>
    /// Kiểm tra trùng dịch vụ
    /// </summary>
    Task<List<ServiceOrderWarningDto>> CheckDuplicateServicesAsync(Guid examinationId, List<Guid> serviceIds);

    /// <summary>
    /// Kiểm tra quy định chỉ định (TT35, etc.)
    /// </summary>
    Task<List<ServiceOrderWarningDto>> ValidateServiceOrdersAsync(Guid examinationId, List<Guid> serviceIds);

    /// <summary>
    /// Lấy danh sách phòng thực hiện dịch vụ
    /// </summary>
    Task<List<RoomDto>> GetServiceRoomsAsync(Guid serviceId);

    /// <summary>
    /// Tự động chọn phòng tối ưu
    /// </summary>
    Task<Guid?> AutoSelectOptimalRoomAsync(Guid serviceId);

    /// <summary>
    /// Tính đường đi tối ưu cho danh sách dịch vụ
    /// </summary>
    Task<List<RoomDto>> CalculateOptimalPathAsync(List<Guid> serviceIds);

    /// <summary>
    /// Lấy dịch vụ thường dùng của bác sĩ
    /// </summary>
    Task<List<ServiceDto>> GetFrequentServicesAsync(Guid doctorId, int limit = 20);

    /// <summary>
    /// In phiếu chỉ định dịch vụ
    /// </summary>
    Task<byte[]> PrintServiceOrderAsync(Guid orderId);

    /// <summary>
    /// In tất cả phiếu chỉ định dịch vụ của lượt khám
    /// </summary>
    Task<byte[]> PrintAllServiceOrdersAsync(Guid examinationId);

    #endregion

    #region 2.7 Kê đơn thuốc

    /// <summary>
    /// Lấy danh sách đơn thuốc của lượt khám
    /// </summary>
    Task<List<PrescriptionFullDto>> GetPrescriptionsAsync(Guid examinationId);

    /// <summary>
    /// Lấy chi tiết đơn thuốc
    /// </summary>
    Task<PrescriptionFullDto?> GetPrescriptionByIdAsync(Guid id);

    /// <summary>
    /// Tạo đơn thuốc mới
    /// </summary>
    Task<PrescriptionFullDto> CreatePrescriptionAsync(CreatePrescriptionDto dto);

    /// <summary>
    /// Cập nhật đơn thuốc
    /// </summary>
    Task<PrescriptionFullDto> UpdatePrescriptionAsync(Guid id, CreatePrescriptionDto dto);

    /// <summary>
    /// Xóa đơn thuốc
    /// </summary>
    Task<bool> DeletePrescriptionAsync(Guid id);

    /// <summary>
    /// Tìm kiếm thuốc
    /// </summary>
    Task<List<MedicineDto>> SearchMedicinesAsync(string keyword, Guid? warehouseId = null, int limit = 20);

    /// <summary>
    /// Lấy thông tin thuốc với tồn kho
    /// </summary>
    Task<MedicineDto?> GetMedicineWithStockAsync(Guid medicineId, Guid? warehouseId = null);

    /// <summary>
    /// Lấy danh sách thuốc theo nhóm
    /// </summary>
    Task<List<MedicineDto>> GetMedicinesByGroupAsync(Guid groupId);

    /// <summary>
    /// Kiểm tra tương tác thuốc
    /// </summary>
    Task<List<DrugInteractionDto>> CheckDrugInteractionsAsync(List<Guid> medicineIds);

    /// <summary>
    /// Kiểm tra dị ứng thuốc
    /// </summary>
    Task<List<PrescriptionWarningDto>> CheckDrugAllergiesAsync(Guid patientId, List<Guid> medicineIds);

    /// <summary>
    /// Kiểm tra chống chỉ định
    /// </summary>
    Task<List<PrescriptionWarningDto>> CheckContraindicationsAsync(Guid patientId, List<Guid> medicineIds);

    /// <summary>
    /// Kiểm tra trùng thuốc trong ngày
    /// </summary>
    Task<List<PrescriptionWarningDto>> CheckDuplicateMedicinesAsync(Guid patientId, List<Guid> medicineIds, DateTime date);

    /// <summary>
    /// Kiểm tra quy định kê đơn BHYT
    /// </summary>
    Task<List<PrescriptionWarningDto>> ValidateBhytPrescriptionAsync(Guid examinationId, CreatePrescriptionDto dto);

    /// <summary>
    /// Lấy danh sách mẫu đơn thuốc
    /// </summary>
    Task<List<PrescriptionTemplateDto>> GetPrescriptionTemplatesAsync(Guid? departmentId = null);

    /// <summary>
    /// Tạo mẫu đơn thuốc
    /// </summary>
    Task<PrescriptionTemplateDto> CreatePrescriptionTemplateAsync(PrescriptionTemplateDto dto);

    /// <summary>
    /// Cập nhật mẫu đơn thuốc
    /// </summary>
    Task<PrescriptionTemplateDto> UpdatePrescriptionTemplateAsync(Guid id, PrescriptionTemplateDto dto);

    /// <summary>
    /// Xóa mẫu đơn thuốc
    /// </summary>
    Task<bool> DeletePrescriptionTemplateAsync(Guid id);

    /// <summary>
    /// Áp dụng mẫu đơn thuốc
    /// </summary>
    Task<PrescriptionFullDto> ApplyPrescriptionTemplateAsync(Guid examinationId, Guid templateId);

    /// <summary>
    /// Lưu đơn thuốc hiện tại thành mẫu
    /// </summary>
    Task<PrescriptionTemplateDto> SaveAsPrescriptionTemplateAsync(Guid prescriptionId, string templateName);

    /// <summary>
    /// Lấy thư viện lời dặn
    /// </summary>
    Task<List<InstructionLibraryDto>> GetInstructionLibraryAsync(string? category = null);

    /// <summary>
    /// Thêm lời dặn vào thư viện
    /// </summary>
    Task<InstructionLibraryDto> AddInstructionAsync(InstructionLibraryDto dto);

    /// <summary>
    /// Xóa lời dặn
    /// </summary>
    Task<bool> DeleteInstructionAsync(Guid id);

    /// <summary>
    /// Lấy thuốc thường dùng của bác sĩ
    /// </summary>
    Task<List<MedicineDto>> GetFrequentMedicinesAsync(Guid doctorId, int limit = 20);

    /// <summary>
    /// In đơn thuốc
    /// </summary>
    Task<byte[]> PrintPrescriptionAsync(Guid prescriptionId);

    /// <summary>
    /// In đơn thuốc ngoài
    /// </summary>
    Task<byte[]> PrintExternalPrescriptionAsync(Guid prescriptionId);

    /// <summary>
    /// Sao chép đơn thuốc từ lịch sử
    /// </summary>
    Task<PrescriptionFullDto> CopyPrescriptionFromHistoryAsync(Guid examinationId, Guid sourcePrescriptionId);

    /// <summary>
    /// Lấy danh sách kho xuất thuốc
    /// </summary>
    Task<List<WarehouseDto>> GetDispensaryWarehousesAsync();

    #endregion

    #region 2.8 Kết luận khám bệnh

    /// <summary>
    /// Lấy kết luận khám bệnh
    /// </summary>
    Task<ExaminationConclusionDto?> GetConclusionAsync(Guid examinationId);

    /// <summary>
    /// Hoàn thành khám bệnh với kết luận
    /// </summary>
    Task<ExaminationConclusionDto> CompleteExaminationAsync(Guid examinationId, CompleteExaminationDto dto);

    /// <summary>
    /// Cập nhật kết luận (trước khi khóa)
    /// </summary>
    Task<ExaminationConclusionDto> UpdateConclusionAsync(Guid examinationId, CompleteExaminationDto dto);

    /// <summary>
    /// Yêu cầu nhập viện
    /// </summary>
    Task<ExaminationDto> RequestHospitalizationAsync(Guid examinationId, HospitalizationRequestDto dto);

    /// <summary>
    /// Yêu cầu chuyển viện
    /// </summary>
    Task<ExaminationDto> RequestTransferAsync(Guid examinationId, TransferRequestDto dto);

    /// <summary>
    /// Tạo hẹn khám
    /// </summary>
    Task<AppointmentDto> CreateAppointmentAsync(Guid examinationId, CreateAppointmentDto dto);

    /// <summary>
    /// Cấp giấy nghỉ ốm
    /// </summary>
    Task<SickLeaveDto> CreateSickLeaveAsync(Guid examinationId, CreateSickLeaveDto dto);

    /// <summary>
    /// In giấy nghỉ ốm
    /// </summary>
    Task<byte[]> PrintSickLeaveAsync(Guid examinationId);

    /// <summary>
    /// Khóa hồ sơ khám bệnh
    /// </summary>
    Task<bool> LockExaminationAsync(Guid examinationId);

    /// <summary>
    /// Mở khóa hồ sơ (cần quyền admin)
    /// </summary>
    Task<bool> UnlockExaminationAsync(Guid examinationId, string reason);

    /// <summary>
    /// Kiểm tra hồ sơ có đủ điều kiện hoàn thành
    /// </summary>
    Task<ExaminationValidationResult> ValidateExaminationForCompletionAsync(Guid examinationId);

    /// <summary>
    /// Hủy lượt khám
    /// </summary>
    Task<bool> CancelExaminationAsync(Guid examinationId, string reason);

    /// <summary>
    /// Hoàn tác hoàn thành (cần quyền)
    /// </summary>
    Task<ExaminationDto> RevertCompletionAsync(Guid examinationId, string reason);

    #endregion

    #region 2.9 Quản lý và báo cáo

    /// <summary>
    /// Tìm kiếm lượt khám
    /// </summary>
    Task<PagedResultDto<ExaminationDto>> SearchExaminationsAsync(ExaminationSearchDto dto);

    /// <summary>
    /// Lấy thống kê khám bệnh
    /// </summary>
    Task<ExaminationStatisticsDto> GetExaminationStatisticsAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null, Guid? roomId = null);

    /// <summary>
    /// Lấy sổ khám bệnh (QĐ 4069)
    /// </summary>
    Task<List<ExaminationRegisterDto>> GetExaminationRegisterAsync(DateTime fromDate, DateTime toDate, Guid? roomId = null);

    /// <summary>
    /// Xuất Excel sổ khám bệnh
    /// </summary>
    Task<byte[]> ExportExaminationRegisterToExcelAsync(DateTime fromDate, DateTime toDate, Guid? roomId = null);

    /// <summary>
    /// Xuất báo cáo thống kê
    /// </summary>
    Task<byte[]> ExportExaminationStatisticsAsync(DateTime fromDate, DateTime toDate, string format = "excel");

    /// <summary>
    /// Lấy báo cáo tổng hợp theo bác sĩ
    /// </summary>
    Task<List<DoctorExaminationStatDto>> GetDoctorStatisticsAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null);

    /// <summary>
    /// Lấy thống kê theo mã bệnh ICD
    /// </summary>
    Task<Dictionary<string, int>> GetDiagnosisStatisticsAsync(DateTime fromDate, DateTime toDate);

    /// <summary>
    /// Lấy báo cáo bệnh truyền nhiễm
    /// </summary>
    Task<List<CommunicableDiseaseReportDto>> GetCommunicableDiseaseReportAsync(DateTime fromDate, DateTime toDate);

    /// <summary>
    /// In phiếu khám bệnh
    /// </summary>
    Task<byte[]> PrintExaminationFormAsync(Guid examinationId);

    /// <summary>
    /// In bệnh án ngoại trú
    /// </summary>
    Task<byte[]> PrintOutpatientMedicalRecordAsync(Guid examinationId);

    /// <summary>
    /// In giấy hẹn khám
    /// </summary>
    Task<byte[]> PrintAppointmentSlipAsync(Guid appointmentId);

    /// <summary>
    /// In phiếu nhập viện
    /// </summary>
    Task<byte[]> PrintAdmissionFormAsync(Guid examinationId);

    /// <summary>
    /// In giấy chuyển viện
    /// </summary>
    Task<byte[]> PrintTransferFormAsync(Guid examinationId);

    #endregion

    #region 2.10 Chức năng bổ sung

    /// <summary>
    /// Lấy thông tin bệnh nhân theo mã hoặc CCCD
    /// </summary>
    Task<PatientInfoDto?> GetPatientInfoAsync(string? patientCode = null, string? idNumber = null);

    /// <summary>
    /// Lấy danh sách phòng khám đang hoạt động
    /// </summary>
    Task<List<RoomDto>> GetActiveExaminationRoomsAsync(Guid? departmentId = null);

    /// <summary>
    /// Lấy danh sách bác sĩ đang trực
    /// </summary>
    Task<List<DoctorDto>> GetOnDutyDoctorsAsync(Guid? departmentId = null);

    /// <summary>
    /// Lấy cấu hình khám bệnh của phòng
    /// </summary>
    Task<RoomExaminationConfigDto> GetRoomExaminationConfigAsync(Guid roomId);

    /// <summary>
    /// Cập nhật cấu hình khám bệnh của phòng
    /// </summary>
    Task<RoomExaminationConfigDto> UpdateRoomExaminationConfigAsync(Guid roomId, RoomExaminationConfigDto config);

    /// <summary>
    /// Ký điện tử lượt khám
    /// </summary>
    Task<bool> SignExaminationAsync(Guid examinationId, string signature);

    /// <summary>
    /// Xác minh chữ ký điện tử
    /// </summary>
    Task<SignatureVerificationResult> VerifyExaminationSignatureAsync(Guid examinationId);

    /// <summary>
    /// Gửi kết quả qua SMS/Zalo
    /// </summary>
    Task<bool> SendResultNotificationAsync(Guid examinationId, string channel);

    /// <summary>
    /// Lấy log hoạt động của lượt khám
    /// </summary>
    Task<List<ExaminationActivityLogDto>> GetExaminationLogsAsync(Guid examinationId);

    #endregion
}

#region Supporting DTOs

public class BmiCalculationResult
{
    public decimal BMI { get; set; }
    public string Classification { get; set; } = string.Empty;
    public string ColorCode { get; set; } = string.Empty;
}

public class WaitingRoomDisplayConfigDto
{
    public string? BackgroundColor { get; set; }
    public string? TextColor { get; set; }
    public int RefreshIntervalSeconds { get; set; } = 5;
    public int DisplayCount { get; set; } = 10;
    public bool ShowPatientPhoto { get; set; }
    public bool ShowInsuranceStatus { get; set; }
}

public class PatientFilterDto
{
    public bool? IsInsurance { get; set; }
    public bool? IsChronic { get; set; }
    public bool? IsPriority { get; set; }
    public bool? IsEmergency { get; set; }
    public bool? HasDebt { get; set; }
    public bool? HasPendingLabs { get; set; }
    public int? Status { get; set; }
}

public class HospitalizationRequestDto
{
    public Guid DepartmentId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public bool IsEmergency { get; set; }
}

public class TransferRequestDto
{
    public string FacilityName { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public string? TransportMethod { get; set; }
}

public class CreateAppointmentDto
{
    public DateTime AppointmentDate { get; set; }
    public Guid? RoomId { get; set; }
    public Guid? DoctorId { get; set; }
    public string? Notes { get; set; }
}

public class AppointmentDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public DateTime AppointmentDate { get; set; }
    public Guid? RoomId { get; set; }
    public string? RoomName { get; set; }
    public Guid? DoctorId { get; set; }
    public string? DoctorName { get; set; }
    public string? Notes { get; set; }
    public int Status { get; set; }
}

public class CreateSickLeaveDto
{
    public int Days { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public string? Reason { get; set; }
}

public class SickLeaveDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }
    public int Days { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public string? Reason { get; set; }
    public string? DoctorName { get; set; }
    public DateTime IssuedAt { get; set; }
}

public class ExaminationValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

public class CommunicableDiseaseReportDto
{
    public string IcdCode { get; set; } = string.Empty;
    public string DiseaseName { get; set; } = string.Empty;
    public int CaseCount { get; set; }
    public DateTime ReportDate { get; set; }
}

public class RoomExaminationConfigDto
{
    public Guid RoomId { get; set; }
    public int MaxPatientsPerDay { get; set; }
    public int AverageExaminationMinutes { get; set; }
    public bool AutoCallNext { get; set; }
    public bool RequireVitalSigns { get; set; }
    public bool RequireDiagnosis { get; set; }
    public List<Guid> DefaultServiceIds { get; set; } = new();
}

public class SignatureVerificationResult
{
    public bool IsValid { get; set; }
    public string? SignerName { get; set; }
    public DateTime? SignedAt { get; set; }
    public string? CertificateInfo { get; set; }
}

public class ExaminationActivityLogDto
{
    public Guid Id { get; set; }
    public DateTime Timestamp { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? UserName { get; set; }
    public string? IpAddress { get; set; }
}

public class MedicineDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; }
    public string? Manufacturer { get; set; }
    public string? Country { get; set; }
    public string? Unit { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal InsurancePrice { get; set; }
    public decimal AvailableQuantity { get; set; }
    public bool IsActive { get; set; }
}

public class WarehouseDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int WarehouseType { get; set; }
    public bool IsActive { get; set; }
}

public class ServiceDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int ServiceType { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal InsurancePrice { get; set; }
    public bool IsActive { get; set; }
}

public class RoomDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public int RoomType { get; set; }
    public bool IsActive { get; set; }
    public int? CurrentQueueCount { get; set; }
}

public class DoctorDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Specialty { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public bool IsOnDuty { get; set; }
}

#endregion
