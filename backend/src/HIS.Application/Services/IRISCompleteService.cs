using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HIS.Application.DTOs.Radiology;

namespace HIS.Application.Services
{
    /// <summary>
    /// Complete RIS/PACS Service Interface
    /// Module 8: Chẩn đoán hình ảnh, Thăm dò chức năng - 28+ chức năng
    /// </summary>
    public interface IRISCompleteService
    {
        #region 8.1 Màn hình chờ thực hiện (2 chức năng)

        /// <summary>
        /// 8.1.1 Hiển thị danh sách bệnh nhân chờ thực hiện
        /// </summary>
        Task<List<RadiologyWaitingListDto>> GetWaitingListAsync(
            DateTime date,
            Guid? roomId = null,
            string serviceType = null,
            string status = null,
            string keyword = null);

        /// <summary>
        /// 8.1.2 Phát loa gọi bệnh nhân vào thực hiện
        /// </summary>
        Task<CallPatientResultDto> CallPatientAsync(CallPatientDto dto);

        /// <summary>
        /// Lấy cấu hình màn hình hiển thị
        /// </summary>
        Task<WaitingDisplayConfigDto> GetDisplayConfigAsync(Guid roomId);

        /// <summary>
        /// Cập nhật cấu hình màn hình hiển thị
        /// </summary>
        Task<bool> UpdateDisplayConfigAsync(WaitingDisplayConfigDto config);

        /// <summary>
        /// Bắt đầu thực hiện (chuyển trạng thái)
        /// </summary>
        Task<bool> StartExamAsync(Guid orderId);

        /// <summary>
        /// Kết thúc thực hiện
        /// </summary>
        Task<bool> CompleteExamAsync(Guid orderId);

        /// <summary>
        /// DEV: Cập nhật tất cả RadiologyRequests thành ngày hôm nay
        /// </summary>
        Task<int> UpdateAllRequestDatesToTodayAsync();

        /// <summary>
        /// DEV: Thêm DicomStudy test cho các request có status Completed (3) để test nút Xem hình
        /// </summary>
        Task<int> AddTestDicomStudiesForCompletedRequestsAsync();

        /// <summary>
        /// DEV: Sửa StudyInstanceUID fake thành UID thật từ Orthanc
        /// </summary>
        Task<int> FixDicomStudyUIDsAsync();

        /// <summary>
        /// DEV: Xóa DicomStudies của các request chưa hoàn thành (status < 3)
        /// </summary>
        Task<int> CleanupDicomStudiesForIncompleteRequestsAsync();

        /// <summary>
        /// DEV: Đồng bộ status của request dựa trên dữ liệu Exam (startTime, endTime)
        /// </summary>
        Task<int> SyncRequestStatusWithExamsAsync();

        #endregion

        #region 8.2 Kết nối máy sinh ảnh / PACS (4 chức năng)

        /// <summary>
        /// 8.2.1 Kết nối với hệ thống PACS - Danh sách cấu hình
        /// </summary>
        Task<List<PACSConnectionDto>> GetPACSConnectionsAsync();

        /// <summary>
        /// 8.2.2 Kiểm tra kết nối PACS
        /// </summary>
        Task<PACSConnectionStatusDto> CheckPACSConnectionAsync(Guid connectionId);

        /// <summary>
        /// 8.2.3 Danh sách máy chẩn đoán hình ảnh (Modalities)
        /// </summary>
        Task<List<ModalityDto>> GetModalitiesAsync(string keyword = null, string modalityType = null);

        /// <summary>
        /// Thêm mới cấu hình PACS
        /// </summary>
        Task<PACSConnectionDto> CreatePACSConnectionAsync(CreatePACSConnectionDto dto);

        /// <summary>
        /// Cập nhật cấu hình PACS
        /// </summary>
        Task<PACSConnectionDto> UpdatePACSConnectionAsync(Guid id, UpdatePACSConnectionDto dto);

        /// <summary>
        /// Xóa cấu hình PACS
        /// </summary>
        Task<bool> DeletePACSConnectionAsync(Guid id);

        /// <summary>
        /// Thêm mới Modality
        /// </summary>
        Task<ModalityDto> CreateModalityAsync(CreateModalityDto dto);

        /// <summary>
        /// Cập nhật Modality
        /// </summary>
        Task<ModalityDto> UpdateModalityAsync(Guid id, UpdateModalityDto dto);

        /// <summary>
        /// Xóa Modality
        /// </summary>
        Task<bool> DeleteModalityAsync(Guid id);

        /// <summary>
        /// Gửi worklist đến máy
        /// </summary>
        Task<RISSendWorklistResultDto> SendWorklistToModalityAsync(SendModalityWorklistDto dto);

        /// <summary>
        /// Nhận MPPS (Modality Performed Procedure Step) từ máy
        /// </summary>
        Task<bool> ReceiveMPPSAsync(Guid modalityId, string mppsData);

        /// <summary>
        /// 8.2.4 Kết nối với các máy sinh ảnh khác (siêu âm, nội soi)
        /// </summary>
        Task<bool> ConfigureDeviceConnectionAsync(Guid deviceId, DeviceConnectionConfigDto config);

        #endregion

        #region 8.3 Thực hiện CĐHA, TDCN (8 chức năng)

        /// <summary>
        /// Danh sách phiếu yêu cầu CĐHA
        /// </summary>
        Task<List<RadiologyOrderDto>> GetRadiologyOrdersAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null,
            string serviceType = null,
            string status = null,
            string keyword = null);

        /// <summary>
        /// Chi tiết phiếu yêu cầu
        /// </summary>
        Task<RadiologyOrderDto> GetRadiologyOrderAsync(Guid orderId);

        /// <summary>
        /// 8.3.1 Tạo mẫu trả kết quả CĐHA theo loại dịch vụ
        /// </summary>
        Task<List<RadiologyResultTemplateDto>> GetResultTemplatesByServiceTypeAsync(Guid serviceTypeId);

        /// <summary>
        /// 8.3.2 Tạo mẫu trả kết quả CĐHA theo dịch vụ
        /// </summary>
        Task<List<RadiologyResultTemplateDto>> GetResultTemplatesByServiceAsync(Guid serviceId);

        /// <summary>
        /// 8.3.3 Tạo mẫu trả kết quả CĐHA theo giới tính
        /// </summary>
        Task<List<RadiologyResultTemplateDto>> GetResultTemplatesByGenderAsync(string gender);

        /// <summary>
        /// Lấy tất cả mẫu kết quả
        /// </summary>
        Task<List<RadiologyResultTemplateDto>> GetAllResultTemplatesAsync(string keyword = null);

        /// <summary>
        /// Thêm/Sửa mẫu kết quả
        /// </summary>
        Task<RadiologyResultTemplateDto> SaveResultTemplateAsync(SaveResultTemplateDto dto);

        /// <summary>
        /// Xóa mẫu kết quả
        /// </summary>
        Task<bool> DeleteResultTemplateAsync(Guid templateId);

        /// <summary>
        /// 8.3.4 Đổi mẫu kết quả CĐHA
        /// </summary>
        Task<RadiologyResultDto> ChangeResultTemplateAsync(ChangeResultTemplateDto dto);

        /// <summary>
        /// 8.3.5 Nhập mô tả, kết luận và ghi chú
        /// </summary>
        Task<RadiologyResultDto> EnterRadiologyResultAsync(EnterRadiologyResultDto dto);

        /// <summary>
        /// Lấy kết quả CĐHA
        /// </summary>
        Task<RadiologyResultDto> GetRadiologyResultAsync(Guid orderItemId);

        /// <summary>
        /// Cập nhật kết quả CĐHA
        /// </summary>
        Task<RadiologyResultDto> UpdateRadiologyResultAsync(Guid resultId, UpdateRadiologyResultDto dto);

        /// <summary>
        /// 8.3.6 Đính kèm ảnh
        /// </summary>
        Task<AttachedImageDto> AttachImageAsync(AttachImageDto dto);

        /// <summary>
        /// Xóa ảnh đính kèm
        /// </summary>
        Task<bool> RemoveAttachedImageAsync(Guid imageId);

        /// <summary>
        /// Lấy ảnh từ PACS
        /// </summary>
        Task<List<DicomStudyDto>> GetStudiesFromPACSAsync(string patientId, DateTime? fromDate = null, DateTime? toDate = null);

        /// <summary>
        /// Lấy series trong study
        /// </summary>
        Task<List<DicomSeriesDto>> GetSeriesAsync(string studyInstanceUID);

        /// <summary>
        /// Lấy images trong series
        /// </summary>
        Task<List<DicomImageDto>> GetImagesAsync(string seriesInstanceUID);

        /// <summary>
        /// Link DICOM study với order
        /// </summary>
        Task<bool> LinkStudyToOrderAsync(Guid orderItemId, string studyInstanceUID);

        /// <summary>
        /// Duyệt kết quả sơ bộ (KTV)
        /// </summary>
        Task<bool> PreliminaryApproveResultAsync(Guid resultId, string note);

        /// <summary>
        /// Duyệt kết quả chính thức (BS)
        /// </summary>
        Task<bool> FinalApproveResultAsync(ApproveRadiologyResultDto dto);

        /// <summary>
        /// Hủy duyệt kết quả
        /// </summary>
        Task<bool> CancelApprovalAsync(Guid resultId, string reason);

        /// <summary>
        /// 8.3.7 In kết quả bằng phần mềm
        /// </summary>
        Task<byte[]> PrintRadiologyResultAsync(Guid resultId, string format = "A4", bool includeImages = true);

        /// <summary>
        /// In kết quả hàng loạt
        /// </summary>
        Task<byte[]> PrintRadiologyResultsBatchAsync(List<Guid> resultIds, string format = "A4");

        /// <summary>
        /// 8.3.8 Trả kết quả qua mạng về khoa/phòng
        /// </summary>
        Task<SendResultResponseDto> SendResultToDepartmentAsync(SendResultDto dto);

        /// <summary>
        /// Lấy lịch sử kết quả của bệnh nhân
        /// </summary>
        Task<List<RadiologyResultDto>> GetPatientRadiologyHistoryAsync(Guid patientId, string serviceType = null, int? lastNMonths = 12);

        #endregion

        #region 8.4 Kê thuốc, vật tư (12+ chức năng)

        /// <summary>
        /// Lấy danh sách phiếu kê thuốc/vật tư cho CĐHA
        /// </summary>
        Task<List<RadiologyPrescriptionDto>> GetRadiologyPrescriptionsAsync(Guid orderItemId);

        /// <summary>
        /// Tạo phiếu kê thuốc/vật tư
        /// </summary>
        Task<RadiologyPrescriptionDto> CreateRadiologyPrescriptionAsync(CreateRadiologyPrescriptionDto dto);

        /// <summary>
        /// Cập nhật phiếu kê
        /// </summary>
        Task<RadiologyPrescriptionDto> UpdateRadiologyPrescriptionAsync(Guid prescriptionId, UpdateRadiologyPrescriptionDto dto);

        /// <summary>
        /// Xóa phiếu kê
        /// </summary>
        Task<bool> DeleteRadiologyPrescriptionAsync(Guid prescriptionId);

        /// <summary>
        /// Kê từ định mức
        /// </summary>
        Task<RadiologyPrescriptionDto> CreatePrescriptionFromNormAsync(Guid orderItemId, Guid warehouseId);

        /// <summary>
        /// Lấy định mức của dịch vụ
        /// </summary>
        Task<RadiologyServiceNormDto> GetServiceNormAsync(Guid serviceId);

        /// <summary>
        /// Cập nhật định mức
        /// </summary>
        Task<bool> UpdateServiceNormAsync(Guid serviceId, List<UpdateNormItemDto> items);

        /// <summary>
        /// Tìm kiếm thuốc/vật tư
        /// </summary>
        Task<List<ItemSearchResultDto>> SearchItemsAsync(string keyword, Guid warehouseId, string itemType = null);

        /// <summary>
        /// Kiểm tra tồn kho
        /// </summary>
        Task<ItemStockDto> CheckItemStockAsync(Guid itemId, Guid warehouseId);

        #endregion

        #region 8.5 Quản lý & Báo cáo (8 chức năng)

        /// <summary>
        /// 8.5.1 Báo cáo doanh thu CĐHA
        /// </summary>
        Task<RadiologyRevenueReportDto> GetRevenueReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null,
            string serviceType = null);

        /// <summary>
        /// 8.5.2 Sổ siêu âm theo QĐ4069
        /// </summary>
        Task<UltrasoundRegisterDto> GetUltrasoundRegisterAsync(DateTime fromDate, DateTime toDate);

        /// <summary>
        /// 8.5.3 Sổ CĐHA có phân chia theo từng loại dịch vụ
        /// </summary>
        Task<RadiologyRegisterDto> GetRadiologyRegisterByTypeAsync(
            DateTime fromDate,
            DateTime toDate,
            string serviceType);

        /// <summary>
        /// 8.5.4 Sổ CĐHA theo QĐ4069
        /// </summary>
        Task<RadiologyRegisterDto> GetRadiologyRegisterAsync(DateTime fromDate, DateTime toDate);

        /// <summary>
        /// 8.5.5 Sổ thăm dò chức năng theo QĐ4069
        /// </summary>
        Task<FunctionalTestRegisterDto> GetFunctionalTestRegisterAsync(DateTime fromDate, DateTime toDate);

        /// <summary>
        /// 8.5.6 Quản lý định mức thuốc, vật tư tiêu hao
        /// </summary>
        Task<ConsumptionNormReportDto> GetConsumptionNormReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? serviceId = null);

        /// <summary>
        /// 8.5.7 Báo cáo doanh thu theo chi phí gốc
        /// </summary>
        Task<RadiologyRevenueReportDto> GetRevenueByBaseCostReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null);

        /// <summary>
        /// 8.5.8 Đồng bộ kết quả CLS với Sở Y tế
        /// </summary>
        Task<SyncResultToDoHDto> SyncResultToDoHAsync(Guid resultId);

        /// <summary>
        /// Thống kê CĐHA
        /// </summary>
        Task<RadiologyStatisticsDto> GetStatisticsAsync(
            DateTime fromDate,
            DateTime toDate,
            string serviceType = null);

        /// <summary>
        /// Xuất báo cáo Excel
        /// </summary>
        Task<byte[]> ExportReportToExcelAsync(string reportType, DateTime fromDate, DateTime toDate, object parameters = null);

        #endregion

        #region DICOM Viewer & Image

        /// <summary>
        /// Lấy URL mở DICOM Viewer
        /// </summary>
        Task<ViewerUrlDto> GetViewerUrlAsync(string studyInstanceUID);

        /// <summary>
        /// Lấy cấu hình DICOM Viewer
        /// </summary>
        Task<DicomViewerConfigDto> GetViewerConfigAsync();

        /// <summary>
        /// Lưu annotation
        /// </summary>
        Task<ImageAnnotationDto> SaveAnnotationAsync(ImageAnnotationDto annotation);

        /// <summary>
        /// Lấy annotations của ảnh
        /// </summary>
        Task<List<ImageAnnotationDto>> GetAnnotationsAsync(string sopInstanceUID);

        /// <summary>
        /// Đánh dấu key image
        /// </summary>
        Task<KeyImageDto> MarkKeyImageAsync(MarkKeyImageDto dto);

        /// <summary>
        /// Lấy danh sách key images
        /// </summary>
        Task<List<KeyImageDto>> GetKeyImagesAsync(string studyInstanceUID);

        /// <summary>
        /// Chỉnh sửa ảnh
        /// </summary>
        Task<byte[]> EditImageAsync(ImageEditDto dto);

        #endregion

        #region Room & Schedule Management

        /// <summary>
        /// Danh sách phòng CĐHA
        /// </summary>
        Task<List<RadiologyRoomDto>> GetRoomsAsync(string keyword = null, string roomType = null);

        /// <summary>
        /// Thêm/Sửa phòng
        /// </summary>
        Task<RadiologyRoomDto> SaveRoomAsync(SaveRadiologyRoomDto dto);

        /// <summary>
        /// Lịch làm việc phòng
        /// </summary>
        Task<List<RadiologyScheduleDto>> GetRoomScheduleAsync(Guid roomId, DateTime fromDate, DateTime toDate);

        /// <summary>
        /// Cập nhật lịch làm việc
        /// </summary>
        Task<RadiologyScheduleDto> SaveScheduleAsync(SaveRadiologyScheduleDto dto);

        #endregion

        #region Print Label - In nhãn dán

        /// <summary>
        /// In nhãn dán cho ca chụp
        /// </summary>
        Task<LabelDataDto> PrintLabelAsync(PrintLabelRequestDto request);

        /// <summary>
        /// Lấy danh sách cấu hình nhãn
        /// </summary>
        Task<List<RadiologyLabelConfigDto>> GetLabelConfigsAsync(Guid? serviceTypeId = null);

        /// <summary>
        /// Lưu cấu hình nhãn
        /// </summary>
        Task<RadiologyLabelConfigDto> SaveLabelConfigAsync(RadiologyLabelConfigDto config);

        /// <summary>
        /// Xóa cấu hình nhãn
        /// </summary>
        Task<bool> DeleteLabelConfigAsync(Guid configId);

        #endregion

        #region Diagnosis Templates - Mẫu chẩn đoán thường dùng

        /// <summary>
        /// Lấy danh sách mẫu chẩn đoán
        /// </summary>
        Task<List<DiagnosisTemplateDto>> GetDiagnosisTemplatesAsync(
            Guid? serviceTypeId = null,
            Guid? serviceId = null,
            string keyword = null);

        /// <summary>
        /// Lưu mẫu chẩn đoán
        /// </summary>
        Task<DiagnosisTemplateDto> SaveDiagnosisTemplateAsync(SaveDiagnosisTemplateDto dto);

        /// <summary>
        /// Xóa mẫu chẩn đoán
        /// </summary>
        Task<bool> DeleteDiagnosisTemplateAsync(Guid templateId);

        #endregion

        #region Abbreviations - Bộ từ viết tắt

        /// <summary>
        /// Lấy danh sách từ viết tắt
        /// </summary>
        Task<List<AbbreviationDto>> GetAbbreviationsAsync(
            string category = null,
            Guid? serviceTypeId = null,
            string keyword = null);

        /// <summary>
        /// Lưu từ viết tắt
        /// </summary>
        Task<AbbreviationDto> SaveAbbreviationAsync(SaveAbbreviationDto dto);

        /// <summary>
        /// Xóa từ viết tắt
        /// </summary>
        Task<bool> DeleteAbbreviationAsync(Guid abbreviationId);

        /// <summary>
        /// Mở rộng từ viết tắt trong văn bản
        /// </summary>
        Task<ExpandAbbreviationResultDto> ExpandAbbreviationsAsync(string text, string category = null, Guid? serviceTypeId = null);

        #endregion

        #region QR Code - Mã QR

        /// <summary>
        /// Sinh mã QR cho ca chụp
        /// </summary>
        Task<QRCodeResultDto> GenerateQRCodeAsync(GenerateQRCodeRequestDto request);

        /// <summary>
        /// Quét mã QR
        /// </summary>
        Task<ScanQRCodeResultDto> ScanQRCodeAsync(string qrData);

        /// <summary>
        /// Chia sẻ kết quả qua QR Code
        /// </summary>
        Task<ShareResultQRDto> CreateShareResultQRAsync(Guid resultId, int? validityHours = 24);

        /// <summary>
        /// Xác thực và lấy kết quả từ share link
        /// </summary>
        Task<RadiologyResultDto> GetSharedResultAsync(string shareCode, string accessCode);

        #endregion

        #region Duty Schedule - Lịch phân công trực

        /// <summary>
        /// Lấy lịch trực
        /// </summary>
        Task<List<DutyScheduleDto>> GetDutySchedulesAsync(
            Guid departmentId,
            DateTime fromDate,
            DateTime toDate,
            Guid? roomId = null);

        /// <summary>
        /// Lưu lịch trực
        /// </summary>
        Task<DutyScheduleDto> SaveDutyScheduleAsync(SaveDutyScheduleDto dto);

        /// <summary>
        /// Tạo lịch trực hàng loạt
        /// </summary>
        Task<List<DutyScheduleDto>> BatchCreateDutySchedulesAsync(BatchCreateDutyScheduleDto dto);

        /// <summary>
        /// Xóa lịch trực
        /// </summary>
        Task<bool> DeleteDutyScheduleAsync(Guid scheduleId);

        /// <summary>
        /// Duyệt lịch trực
        /// </summary>
        Task<bool> ApproveDutyScheduleAsync(Guid scheduleId);

        #endregion

        #region Room Assignment - Phân phòng thực hiện

        /// <summary>
        /// Phân phòng thực hiện
        /// </summary>
        Task<RoomAssignmentDto> AssignRoomAsync(AssignRoomRequestDto request);

        /// <summary>
        /// Cập nhật phân phòng
        /// </summary>
        Task<RoomAssignmentDto> UpdateRoomAssignmentAsync(Guid assignmentId, AssignRoomRequestDto request);

        /// <summary>
        /// Lấy danh sách chờ theo phòng
        /// </summary>
        Task<List<RoomAssignmentDto>> GetRoomQueueAsync(Guid roomId, DateTime date);

        /// <summary>
        /// Gọi bệnh nhân tiếp theo
        /// </summary>
        Task<RoomAssignmentDto> CallNextPatientAsync(Guid roomId);

        /// <summary>
        /// Bỏ qua bệnh nhân
        /// </summary>
        Task<bool> SkipPatientAsync(Guid assignmentId, string reason);

        /// <summary>
        /// Thống kê theo phòng
        /// </summary>
        Task<List<RoomStatisticsDto>> GetRoomStatisticsAsync(DateTime date);

        #endregion

        #region Tags - Quản lý Tag ca chụp

        /// <summary>
        /// Lấy danh sách Tag
        /// </summary>
        Task<List<RadiologyTagDto>> GetTagsAsync(string keyword = null, bool includeInactive = false);

        /// <summary>
        /// Lưu Tag
        /// </summary>
        Task<RadiologyTagDto> SaveTagAsync(SaveRadiologyTagDto dto);

        /// <summary>
        /// Xóa Tag
        /// </summary>
        Task<bool> DeleteTagAsync(Guid tagId);

        /// <summary>
        /// Gắn Tag cho ca chụp
        /// </summary>
        Task<bool> AssignTagsToRequestAsync(AssignTagRequestDto request);

        /// <summary>
        /// Gỡ Tag khỏi ca chụp
        /// </summary>
        Task<bool> RemoveTagFromRequestAsync(Guid requestId, Guid tagId);

        /// <summary>
        /// Lấy các ca chụp theo Tag
        /// </summary>
        Task<List<TaggedRequestDto>> GetRequestsByTagAsync(Guid tagId, DateTime? fromDate = null, DateTime? toDate = null);

        /// <summary>
        /// Lấy các Tag của ca chụp
        /// </summary>
        Task<List<RadiologyTagDto>> GetTagsOfRequestAsync(Guid requestId);

        #endregion

        #region Integration Log - Log tích hợp HIS-RIS

        /// <summary>
        /// Tìm kiếm log tích hợp
        /// </summary>
        Task<IntegrationLogSearchResultDto> SearchIntegrationLogsAsync(SearchIntegrationLogDto searchDto);

        /// <summary>
        /// Lấy chi tiết log
        /// </summary>
        Task<IntegrationLogDto> GetIntegrationLogAsync(Guid logId);

        /// <summary>
        /// Thống kê log tích hợp
        /// </summary>
        Task<IntegrationLogStatisticsDto> GetIntegrationLogStatisticsAsync(DateTime fromDate, DateTime toDate);

        /// <summary>
        /// Retry gửi lại message lỗi
        /// </summary>
        Task<bool> RetryIntegrationAsync(Guid logId);

        #endregion

        #region Digital Signature - Ký số

        /// <summary>
        /// Lấy danh sách cấu hình ký số
        /// </summary>
        Task<List<DigitalSignatureConfigDto>> GetSignatureConfigsAsync();

        /// <summary>
        /// Lưu cấu hình ký số
        /// </summary>
        Task<DigitalSignatureConfigDto> SaveSignatureConfigAsync(SaveDigitalSignatureConfigDto dto);

        /// <summary>
        /// Xóa cấu hình ký số
        /// </summary>
        Task<bool> DeleteSignatureConfigAsync(Guid configId);

        /// <summary>
        /// Ký số kết quả
        /// </summary>
        Task<SignResultResponseDto> SignResultAsync(SignResultRequestDto request);

        /// <summary>
        /// Hủy kết quả đã ký
        /// </summary>
        Task<bool> CancelSignedResultAsync(CancelSignedResultDto dto);

        /// <summary>
        /// Lấy lịch sử ký số
        /// </summary>
        Task<List<SignatureHistoryDto>> GetSignatureHistoryAsync(Guid reportId);

        /// <summary>
        /// In kết quả đã ký số
        /// </summary>
        Task<byte[]> PrintSignedResultAsync(Guid reportId);

        #endregion

        #region Statistics - Thống kê

        /// <summary>
        /// Thống kê ca chụp theo nhóm dịch vụ
        /// </summary>
        Task<ExamStatisticsByServiceTypeDto> GetExamStatisticsByServiceTypeAsync(DateTime fromDate, DateTime toDate);

        #endregion

        #region IV. Capture Device - Thiết bị Capture

        Task<List<CaptureDeviceDto>> GetCaptureDevicesAsync(string deviceType = null, string keyword = null, bool? isActive = null);
        Task<CaptureDeviceDto> SaveCaptureDeviceAsync(SaveCaptureDeviceDto dto);
        Task<bool> DeleteCaptureDeviceAsync(Guid deviceId);
        Task<CaptureDeviceStatusDto> TestCaptureDeviceConnectionAsync(Guid deviceId);
        Task<List<WorkstationDto>> GetWorkstationsAsync(Guid? roomId = null);
        Task<WorkstationDto> SaveWorkstationAsync(SaveWorkstationDto dto);
        Task<CaptureSessionDto> CreateCaptureSessionAsync(CreateCaptureSessionDto dto);
        Task<CaptureSessionDto> EndCaptureSessionAsync(Guid sessionId);
        Task<CapturedMediaDto> SaveCapturedMediaAsync(SaveCapturedMediaDto dto);
        Task<List<CapturedMediaDto>> GetCapturedMediaAsync(Guid sessionId);
        Task<SendToPacsResultDto> SendMediaToPacsAsync(SendToPacsRequestDto request);

        #endregion

        #region V. Consultation - Hội chẩn ca chụp

        Task<ConsultationSearchResultDto> SearchConsultationsAsync(SearchConsultationDto searchDto);
        Task<ConsultationSessionDto> GetConsultationSessionAsync(Guid sessionId);
        Task<ConsultationSessionDto> SaveConsultationSessionAsync(SaveConsultationSessionDto dto);
        Task<bool> DeleteConsultationSessionAsync(Guid sessionId);
        Task<ConsultationSessionDto> StartConsultationAsync(Guid sessionId);
        Task<ConsultationSessionDto> EndConsultationAsync(Guid sessionId);
        Task<ConsultationCaseDto> AddConsultationCaseAsync(AddConsultationCaseDto dto);
        Task<bool> RemoveConsultationCaseAsync(Guid caseId);
        Task<ConsultationParticipantDto> InviteParticipantAsync(InviteParticipantDto dto);
        Task<bool> RemoveParticipantAsync(Guid participantId);
        Task<ConsultationParticipantDto> JoinConsultationAsync(Guid sessionId, Guid userId);
        Task<bool> LeaveConsultationAsync(Guid sessionId, Guid userId);
        Task<ConsultationDiscussionDto> AddDiscussionAsync(AddConsultationDiscussionDto dto);
        Task<List<ConsultationDiscussionDto>> GetDiscussionsAsync(Guid caseId);
        Task<ConsultationImageNoteDto> AddImageNoteAsync(AddConsultationImageNoteDto dto);
        Task<List<ConsultationImageNoteDto>> GetImageNotesAsync(Guid caseId);
        Task<ConsultationMinutesDto> SaveMinutesAsync(SaveConsultationMinutesDto dto);
        Task<ConsultationMinutesDto> GetMinutesAsync(Guid sessionId);
        Task<ConsultationMinutesDto> ApproveMinutesAsync(Guid minutesId);
        Task<ConsultationAttachmentDto> AddAttachmentAsync(AddConsultationAttachmentDto dto);
        Task<List<ConsultationAttachmentDto>> GetAttachmentsAsync(Guid caseId);

        #endregion

        #region X. HL7 CDA Integration

        Task<List<HL7CDAConfigDto>> GetHL7CDAConfigsAsync();
        Task<HL7CDAConfigDto> SaveHL7CDAConfigAsync(SaveHL7CDAConfigDto dto);
        Task<bool> DeleteHL7CDAConfigAsync(Guid configId);
        Task<bool> TestHL7ConnectionAsync(Guid configId);
        Task<SendHL7ResultDto> SendHL7MessageAsync(SendHL7MessageDto dto);
        Task<List<HL7MessageDto>> GetHL7MessagesAsync(DateTime? fromDate = null, DateTime? toDate = null, string direction = null, int? status = null);
        Task<HL7MessageSearchResultDto> SearchHL7MessagesAsync(SearchHL7MessageDto searchDto);
        Task<bool> RetryHL7MessageAsync(Guid messageId);
        Task<CDADocumentDto> CreateCDADocumentAsync(CreateCDADocumentDto dto);
        Task<CDADocumentDto> GetCDADocumentAsync(Guid reportId);
        Task<bool> SendCDADocumentAsync(SendCDADocumentDto dto);
        Task<Guid> ReceiveHL7OrderAsync(string hl7Message);
        Task<SendHL7ResultDto> SendHL7ResultAsync(Guid reportId, bool withSignature);
        Task<bool> CancelHL7ResultAsync(Guid reportId, string reason);

        #endregion

        #region IX. Online Help - Hướng dẫn sử dụng

        Task<List<HelpCategoryDto>> GetHelpCategoriesAsync(Guid? parentId = null);
        Task<HelpCategoryDto> SaveHelpCategoryAsync(SaveHelpCategoryDto dto);
        Task<bool> DeleteHelpCategoryAsync(Guid categoryId);
        Task<HelpSearchResultDto> SearchHelpArticlesAsync(SearchHelpDto searchDto);
        Task<HelpArticleDto> GetHelpArticleAsync(Guid articleId);
        Task<HelpArticleDto> SaveHelpArticleAsync(SaveHelpArticleDto dto);
        Task<bool> DeleteHelpArticleAsync(Guid articleId);
        Task<List<TroubleshootingDto>> GetTroubleshootingListAsync(string category = null, string keyword = null);
        Task<List<TroubleshootingDto>> GetTroubleshootingListAsync(string module = null, int? severity = null);
        Task<TroubleshootingDto> SaveTroubleshootingAsync(SaveTroubleshootingDto dto);
        Task<bool> DeleteTroubleshootingAsync(Guid troubleshootingId);
        Task<bool> IncrementArticleViewCountAsync(Guid articleId);

        #endregion

        #region VII. CLS Screen - Màn hình cận lâm sàng

        Task<CLSScreenConfigDto> GetCLSScreenConfigAsync();
        Task<CLSScreenConfigDto> SaveCLSScreenConfigAsync(SaveCLSScreenConfigDto dto);
        Task<List<ServiceDescriptionTemplateDto>> GetServiceDescriptionTemplatesAsync(Guid serviceId);
        Task<ServiceDescriptionTemplateDto> SaveServiceDescriptionTemplateAsync(SaveServiceDescriptionTemplateDto dto);
        Task<bool> DeleteServiceDescriptionTemplateAsync(Guid templateId);
        Task<List<DiagnosisHistoryDto>> GetDiagnosisHistoryAsync(Guid requestId);
        Task<List<RadiologyWaitingListDto>> GetPatientExamHistoryAsync(Guid patientId, DateTime? fromDate = null, DateTime? toDate = null);

        #endregion
        #region Extended Capture & Consultation Methods

    // Capture Device Management - Extended methods
    Task<bool> CheckDeviceConnectionAsync(Guid deviceId);
    Task<bool> DeleteWorkstationAsync(Guid workstationId);
    Task<CaptureSessionDto> GetActiveCaptureSessionAsync(Guid deviceId);
    Task<CapturedMediaDto> UploadCapturedMediaAsync(SaveCapturedMediaDto dto);
    Task<bool> SetThumbnailImageAsync(Guid sessionId, Guid mediaId);
    Task<object> GetDeviceDailyStatisticsAsync(Guid deviceId, DateTime date);

    // Consultation Session - Extended methods
    Task<bool> CancelConsultationSessionAsync(Guid sessionId, string reason);
    Task<ConsultationSessionDto> StartConsultationSessionAsync(Guid sessionId);
    Task<ConsultationSessionDto> EndConsultationSessionAsync(Guid sessionId);
    Task<ConsultationCaseDto> ConcludeCaseAsync(Guid caseId, string conclusion, string recommendation);
    Task<bool> RespondInvitationAsync(Guid sessionId, Guid userId, bool accepted);
    Task<ConsultationSessionDto> JoinSessionAsync(Guid sessionId);
    Task<bool> LeaveSessionAsync(Guid sessionId);
    Task<ConsultationAttachmentDto> UploadAttachmentAsync(AddConsultationAttachmentDto dto);
    Task<bool> DeleteAttachmentAsync(Guid attachmentId);
    Task<ConsultationDiscussionDto> PostDiscussionAsync(AddConsultationDiscussionDto dto);
    Task<bool> DeleteDiscussionAsync(Guid discussionId);
    Task<ConsultationImageNoteDto> SaveImageNoteAsync(AddConsultationImageNoteDto dto);
    Task<byte[]> GenerateInviteQRCodeAsync(Guid sessionId);
    Task<bool> ToggleRecordingAsync(Guid sessionId, bool start);

    #endregion
    }

    #region Additional DTOs for RIS Service

    public class CreatePACSConnectionDto
    {
        public string Name { get; set; }
        public string ServerType { get; set; }
        public string AETitle { get; set; }
        public string IpAddress { get; set; }
        public int Port { get; set; }
        public int QueryRetrievePort { get; set; }
        public string Protocol { get; set; }
        public bool IsActive { get; set; }
    }

    public class UpdatePACSConnectionDto : CreatePACSConnectionDto
    {
        public Guid Id { get; set; }
    }

    public class CreateModalityDto
    {
        public string Code { get; set; }
        public string Name { get; set; }
        public string ModalityType { get; set; }
        public string Manufacturer { get; set; }
        public string Model { get; set; }
        public string AETitle { get; set; }
        public string IpAddress { get; set; }
        public int? Port { get; set; }
        public Guid RoomId { get; set; }
        public bool SupportsWorklist { get; set; }
        public bool SupportsMPPS { get; set; }
        public bool IsActive { get; set; }
    }

    public class UpdateModalityDto : CreateModalityDto
    {
        public Guid Id { get; set; }
    }

    public class SendModalityWorklistDto
    {
        public Guid ModalityId { get; set; }
        public List<Guid> OrderIds { get; set; }
    }

    public class RISSendWorklistResultDto
    {
        public bool Success { get; set; }
        public int SentCount { get; set; }
        public int FailedCount { get; set; }
        public List<string> Errors { get; set; }
    }

    public class DeviceConnectionConfigDto
    {
        public Guid DeviceId { get; set; }
        public string ConnectionType { get; set; } // Serial, TCP, USB, File
        public string ConnectionString { get; set; }
        public string IpAddress { get; set; }
        public int? Port { get; set; }
        public string ComPort { get; set; }
        public int? BaudRate { get; set; }
        public string Protocol { get; set; }
        public string FolderPath { get; set; }
    }

    public class SaveResultTemplateDto
    {
        public Guid? Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public Guid? ServiceTypeId { get; set; }
        public Guid? ServiceId { get; set; }
        public string Gender { get; set; }
        public string DescriptionTemplate { get; set; }
        public string ConclusionTemplate { get; set; }
        public string NoteTemplate { get; set; }
        public int SortOrder { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
    }

    public class UpdateRadiologyResultDto
    {
        public string Description { get; set; }
        public string Conclusion { get; set; }
        public string Note { get; set; }
        public string TechnicianNote { get; set; }
    }

    public class AttachImageDto
    {
        public Guid OrderItemId { get; set; }
        public string FileName { get; set; }
        public string FileType { get; set; }
        public string Base64Data { get; set; }
        public string Description { get; set; }
        public int SortOrder { get; set; }
        public string DicomStudyUID { get; set; }
        public string DicomSeriesUID { get; set; }
        public string DicomInstanceUID { get; set; }
    }

    public class UpdateRadiologyPrescriptionDto
    {
        public List<CreateRadiologyPrescriptionItemDto> Items { get; set; }
    }

    public class UpdateNormItemDto
    {
        public Guid? Id { get; set; }
        public Guid ItemId { get; set; }
        public decimal Quantity { get; set; }
        public string Unit { get; set; }
        public bool IsRequired { get; set; }
    }

    public class ItemSearchResultDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string ItemType { get; set; }
        public string Unit { get; set; }
        public decimal Price { get; set; }
        public decimal InsurancePrice { get; set; }
        public decimal StockQuantity { get; set; }
        public string LotNumber { get; set; }
        public DateTime? ExpiryDate { get; set; }
    }

    public class ItemStockDto
    {
        public Guid ItemId { get; set; }
        public string ItemCode { get; set; }
        public string ItemName { get; set; }
        public decimal TotalStock { get; set; }
        public decimal AvailableStock { get; set; }
        public List<ItemStockByLotDto> ByLot { get; set; }
    }

    public class ItemStockByLotDto
    {
        public string LotNumber { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public decimal Quantity { get; set; }
    }

    public class MarkKeyImageDto
    {
        public string StudyInstanceUID { get; set; }
        public string SOPInstanceUID { get; set; }
        public string Description { get; set; }
    }

    public class SaveRadiologyRoomDto
    {
        public Guid? Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string RoomType { get; set; }
        public Guid DepartmentId { get; set; }
        public int Capacity { get; set; }
        public bool IsActive { get; set; }
    }

    public class SaveRadiologyScheduleDto
    {
        public Guid? Id { get; set; }
        public Guid RoomId { get; set; }
        public DateTime Date { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public Guid? TechnicianId { get; set; }
        public Guid? DoctorId { get; set; }
        public int MaxSlots { get; set; }
        public string Note { get; set; }
    }

    #endregion
}
