using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.Radiology
{
    /// <summary>
    /// Complete RIS/PACS DTOs
    /// Module 8: Chẩn đoán hình ảnh, Thăm dò chức năng - 28+ chức năng
    /// </summary>

    #region 8.1 Màn hình chờ thực hiện

    /// <summary>
    /// Danh sách bệnh nhân chờ thực hiện CĐHA
    /// </summary>
    public class RadiologyWaitingListDto
    {
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public int? Age { get; set; }
        public string Gender { get; set; }
        public Guid VisitId { get; set; }
        public string VisitCode { get; set; }
        public Guid OrderId { get; set; }
        public string OrderCode { get; set; }
        public DateTime OrderTime { get; set; }
        public string OrderDoctorName { get; set; }
        public string DepartmentName { get; set; }
        public string ServiceName { get; set; }
        public string ServiceTypeName { get; set; }
        public string RoomName { get; set; }
        public int QueueNumber { get; set; }
        public string Status { get; set; } // Waiting, InProgress, Completed, Cancelled
        public string PatientType { get; set; } // Inpatient, Outpatient, Emergency
        public string Priority { get; set; } // Normal, Urgent, Emergency
        public DateTime? CalledTime { get; set; }
        public DateTime? StartTime { get; set; }
    }

    /// <summary>
    /// Gọi bệnh nhân vào phòng
    /// </summary>
    public class CallPatientDto
    {
        public Guid OrderId { get; set; }
        public Guid RoomId { get; set; }
        public string Message { get; set; }
        public bool UseSpeaker { get; set; }
    }

    /// <summary>
    /// Kết quả gọi bệnh nhân
    /// </summary>
    public class CallPatientResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public DateTime CalledTime { get; set; }
    }

    /// <summary>
    /// Cấu hình màn hình hiển thị
    /// </summary>
    public class WaitingDisplayConfigDto
    {
        public Guid Id { get; set; }
        public Guid RoomId { get; set; }
        public string RoomName { get; set; }
        public string DisplayMode { get; set; } // List, Grid, Ticker
        public int RefreshIntervalSeconds { get; set; }
        public bool ShowPatientName { get; set; }
        public bool ShowAge { get; set; }
        public bool ShowServiceName { get; set; }
        public bool EnableSound { get; set; }
        public string SoundFile { get; set; }
        public string AnnouncementTemplate { get; set; }
        public bool IsActive { get; set; }
    }

    #endregion

    #region 8.2 Kết nối máy sinh ảnh / PACS

    /// <summary>
    /// Thông tin máy chẩn đoán hình ảnh
    /// </summary>
    public class ModalityDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string ModalityType { get; set; } // XRay, CT, MRI, Ultrasound, Endoscopy, ECG, EEG
        public string Manufacturer { get; set; }
        public string Model { get; set; }
        public string AETitle { get; set; }
        public string IpAddress { get; set; }
        public int? Port { get; set; }
        public Guid RoomId { get; set; }
        public string RoomName { get; set; }
        public string ConnectionStatus { get; set; } // Online, Offline, Error
        public DateTime? LastCommunication { get; set; }
        public bool SupportsWorklist { get; set; }
        public bool SupportsMPPS { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Cấu hình kết nối PACS
    /// </summary>
    public class PACSConnectionDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string ServerType { get; set; } // DCM4CHEE, Orthanc, ClearCanvas, etc.
        public string AETitle { get; set; }
        public string IpAddress { get; set; }
        public int Port { get; set; }
        public int QueryRetrievePort { get; set; }
        public string Protocol { get; set; } // DICOM, HL7, WADO
        public bool IsConnected { get; set; }
        public DateTime? LastSync { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Kiểm tra kết nối PACS
    /// </summary>
    public class PACSConnectionStatusDto
    {
        public Guid ConnectionId { get; set; }
        public bool IsConnected { get; set; }
        public int PingTimeMs { get; set; }
        public string ErrorMessage { get; set; }
        public DateTime CheckTime { get; set; }
    }

    /// <summary>
    /// Study từ PACS
    /// </summary>
    public class DicomStudyDto
    {
        public string StudyInstanceUID { get; set; }
        public string AccessionNumber { get; set; }
        public string PatientId { get; set; }
        public string PatientName { get; set; }
        public DateTime StudyDate { get; set; }
        public DateTime? StudyTime { get; set; }
        public string Modality { get; set; }
        public string StudyDescription { get; set; }
        public string InstitutionName { get; set; }
        public string ReferringPhysician { get; set; }
        public int NumberOfSeries { get; set; }
        public int NumberOfImages { get; set; }
        public string StudyStatus { get; set; }
    }

    /// <summary>
    /// Series trong Study
    /// </summary>
    public class DicomSeriesDto
    {
        public string SeriesInstanceUID { get; set; }
        public string StudyInstanceUID { get; set; }
        public int SeriesNumber { get; set; }
        public string Modality { get; set; }
        public string SeriesDescription { get; set; }
        public string BodyPartExamined { get; set; }
        public int NumberOfImages { get; set; }
        public DateTime? SeriesDate { get; set; }
    }

    /// <summary>
    /// Image trong Series
    /// </summary>
    public class DicomImageDto
    {
        public string SOPInstanceUID { get; set; }
        public string SeriesInstanceUID { get; set; }
        public int InstanceNumber { get; set; }
        public string ImageType { get; set; }
        public int Rows { get; set; }
        public int Columns { get; set; }
        public string PhotometricInterpretation { get; set; }
        public string ThumbnailUrl { get; set; }
        public string ImageUrl { get; set; }
        public string WadoUrl { get; set; }
    }

    /// <summary>
    /// Worklist item gửi đến máy
    /// </summary>
    public class ModalityWorklistItemDto
    {
        public Guid OrderId { get; set; }
        public string AccessionNumber { get; set; }
        public string PatientId { get; set; }
        public string PatientName { get; set; }
        public DateTime PatientBirthDate { get; set; }
        public string PatientSex { get; set; }
        public string RequestedProcedureId { get; set; }
        public string RequestedProcedureDescription { get; set; }
        public string ScheduledStationAETitle { get; set; }
        public string ScheduledModality { get; set; }
        public DateTime ScheduledDateTime { get; set; }
        public string ReferringPhysicianName { get; set; }
    }

    #endregion

    #region 8.3 Thực hiện CĐHA, TDCN

    /// <summary>
    /// Phiếu yêu cầu CĐHA
    /// </summary>
    public class RadiologyOrderDto
    {
        public Guid Id { get; set; }
        public string OrderCode { get; set; }
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public int? Age { get; set; }
        public string Gender { get; set; }
        public Guid VisitId { get; set; }
        public DateTime OrderDate { get; set; }
        public string OrderDoctorName { get; set; }
        public string DepartmentName { get; set; }
        public string Diagnosis { get; set; }
        public string ClinicalInfo { get; set; }
        public List<RadiologyOrderItemDto> Items { get; set; }
        public string Status { get; set; }
        public string PatientType { get; set; }
    }

    /// <summary>
    /// Chi tiết dịch vụ CĐHA
    /// </summary>
    public class RadiologyOrderItemDto
    {
        public Guid Id { get; set; }
        public Guid ServiceId { get; set; }
        public string ServiceCode { get; set; }
        public string ServiceName { get; set; }
        public string ServiceType { get; set; } // XRay, CT, MRI, Ultrasound, Endoscopy, ECG, EEG
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public decimal InsurancePrice { get; set; }
        public string Status { get; set; } // Pending, InProgress, Completed, Cancelled
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public string TechnicianName { get; set; }
        public string DoctorName { get; set; }
        public bool HasResult { get; set; }
        public bool HasImages { get; set; }
    }

    /// <summary>
    /// Mẫu kết quả CĐHA
    /// </summary>
    public class RadiologyResultTemplateDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public Guid? ServiceTypeId { get; set; }
        public string ServiceTypeName { get; set; }
        public Guid? ServiceId { get; set; }
        public string ServiceName { get; set; }
        public string Gender { get; set; } // Male, Female, Both
        public string DescriptionTemplate { get; set; }
        public string ConclusionTemplate { get; set; }
        public string NoteTemplate { get; set; }
        public int SortOrder { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
        public string CreatedBy { get; set; }
    }

    /// <summary>
    /// Nhập kết quả CĐHA
    /// </summary>
    public class EnterRadiologyResultDto
    {
        public Guid OrderItemId { get; set; }
        public Guid? TemplateId { get; set; }
        public string Description { get; set; }
        public string Conclusion { get; set; }
        public string Note { get; set; }
        public List<AttachedImageDto> AttachedImages { get; set; }
        public string TechnicianNote { get; set; }
    }

    /// <summary>
    /// Hình ảnh đính kèm
    /// </summary>
    public class AttachedImageDto
    {
        public Guid? Id { get; set; }
        public string FileName { get; set; }
        public string FileType { get; set; }
        public long FileSize { get; set; }
        public string FilePath { get; set; }
        public string ThumbnailPath { get; set; }
        public string Base64Data { get; set; }
        public string Description { get; set; }
        public int SortOrder { get; set; }
        public string DicomStudyUID { get; set; }
        public string DicomSeriesUID { get; set; }
        public string DicomInstanceUID { get; set; }
    }

    /// <summary>
    /// Kết quả CĐHA đã nhập
    /// </summary>
    public class RadiologyResultDto
    {
        public Guid Id { get; set; }
        public Guid OrderItemId { get; set; }
        public string OrderCode { get; set; }
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public string ServiceCode { get; set; }
        public string ServiceName { get; set; }
        public string ServiceType { get; set; }
        public DateTime ResultDate { get; set; }
        public string Description { get; set; }
        public string Conclusion { get; set; }
        public string Note { get; set; }
        public string TechnicianName { get; set; }
        public string DoctorName { get; set; }
        public string ApprovalStatus { get; set; } // Draft, PreliminaryApproved, FinalApproved
        public DateTime? ApprovedTime { get; set; }
        public string ApprovedBy { get; set; }
        public List<AttachedImageDto> Images { get; set; }
        public string DicomStudyUID { get; set; }
    }

    /// <summary>
    /// Duyệt kết quả CĐHA
    /// </summary>
    public class ApproveRadiologyResultDto
    {
        public Guid ResultId { get; set; }
        public string Note { get; set; }
        public bool IsFinalApproval { get; set; }
    }

    /// <summary>
    /// Đổi mẫu kết quả
    /// </summary>
    public class ChangeResultTemplateDto
    {
        public Guid OrderItemId { get; set; }
        public Guid NewTemplateId { get; set; }
        public bool KeepExistingContent { get; set; }
    }

    #endregion

    #region 8.4 Kê thuốc, vật tư cho CĐHA

    /// <summary>
    /// Kê thuốc/vật tư cho thủ thuật CĐHA
    /// </summary>
    public class RadiologyPrescriptionDto
    {
        public Guid Id { get; set; }
        public Guid OrderItemId { get; set; }
        public string OrderCode { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public string ServiceName { get; set; }
        public DateTime PrescriptionDate { get; set; }
        public List<RadiologyPrescriptionItemDto> Items { get; set; }
        public string DoctorName { get; set; }
        public string Status { get; set; }
        public decimal TotalAmount { get; set; }
    }

    /// <summary>
    /// Chi tiết thuốc/vật tư
    /// </summary>
    public class RadiologyPrescriptionItemDto
    {
        public Guid Id { get; set; }
        public Guid ItemId { get; set; }
        public string ItemCode { get; set; }
        public string ItemName { get; set; }
        public string ItemType { get; set; } // Medicine, Supply
        public string Unit { get; set; }
        public decimal Quantity { get; set; }
        public decimal Price { get; set; }
        public decimal InsurancePrice { get; set; }
        public decimal Amount { get; set; }
        public string LotNumber { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string WarehouseName { get; set; }
        public string Note { get; set; }
    }

    /// <summary>
    /// Tạo phiếu kê thuốc/vật tư
    /// </summary>
    public class CreateRadiologyPrescriptionDto
    {
        public Guid OrderItemId { get; set; }
        public Guid WarehouseId { get; set; }
        public List<CreateRadiologyPrescriptionItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết thuốc/vật tư cần kê
    /// </summary>
    public class CreateRadiologyPrescriptionItemDto
    {
        public Guid ItemId { get; set; }
        public decimal Quantity { get; set; }
        public string Note { get; set; }
    }

    /// <summary>
    /// Định mức thuốc/vật tư cho dịch vụ CĐHA
    /// </summary>
    public class RadiologyServiceNormDto
    {
        public Guid Id { get; set; }
        public Guid ServiceId { get; set; }
        public string ServiceCode { get; set; }
        public string ServiceName { get; set; }
        public List<RadiologyNormItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết định mức
    /// </summary>
    public class RadiologyNormItemDto
    {
        public Guid Id { get; set; }
        public Guid ItemId { get; set; }
        public string ItemCode { get; set; }
        public string ItemName { get; set; }
        public string ItemType { get; set; }
        public decimal Quantity { get; set; }
        public string Unit { get; set; }
        public bool IsRequired { get; set; }
    }

    #endregion

    #region 8.5 Quản lý & Báo cáo

    /// <summary>
    /// Báo cáo doanh thu CĐHA
    /// </summary>
    public class RadiologyRevenueReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal InsuranceRevenue { get; set; }
        public decimal PatientRevenue { get; set; }
        public int TotalExams { get; set; }
        public List<RevenueByServiceTypeDto> ByServiceType { get; set; }
        public List<RevenueByDayDto> ByDay { get; set; }
        public List<RevenueByDoctorDto> ByDoctor { get; set; }
    }

    /// <summary>
    /// Doanh thu theo loại dịch vụ
    /// </summary>
    public class RevenueByServiceTypeDto
    {
        public string ServiceType { get; set; }
        public string ServiceTypeName { get; set; }
        public int ExamCount { get; set; }
        public decimal Revenue { get; set; }
        public decimal InsuranceRevenue { get; set; }
        public decimal PatientRevenue { get; set; }
    }

    /// <summary>
    /// Doanh thu theo ngày
    /// </summary>
    public class RevenueByDayDto
    {
        public DateTime Date { get; set; }
        public int ExamCount { get; set; }
        public decimal Revenue { get; set; }
    }

    /// <summary>
    /// Doanh thu theo bác sĩ
    /// </summary>
    public class RevenueByDoctorDto
    {
        public Guid DoctorId { get; set; }
        public string DoctorName { get; set; }
        public int ExamCount { get; set; }
        public decimal Revenue { get; set; }
    }

    /// <summary>
    /// Sổ siêu âm theo QĐ4069
    /// </summary>
    public class UltrasoundRegisterDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalExams { get; set; }
        public List<UltrasoundRegisterItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết sổ siêu âm
    /// </summary>
    public class UltrasoundRegisterItemDto
    {
        public int RowNumber { get; set; }
        public DateTime ExamDate { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public int? Age { get; set; }
        public string Gender { get; set; }
        public string Address { get; set; }
        public string ExamType { get; set; }
        public string Diagnosis { get; set; }
        public string Conclusion { get; set; }
        public string DoctorName { get; set; }
        public string Note { get; set; }
    }

    /// <summary>
    /// Sổ CĐHA theo QĐ4069
    /// </summary>
    public class RadiologyRegisterDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string ServiceType { get; set; }
        public int TotalExams { get; set; }
        public List<RadiologyRegisterItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết sổ CĐHA
    /// </summary>
    public class RadiologyRegisterItemDto
    {
        public int RowNumber { get; set; }
        public DateTime ExamDate { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public int? Age { get; set; }
        public string Gender { get; set; }
        public string Address { get; set; }
        public string ServiceName { get; set; }
        public string BodyPart { get; set; }
        public string Technique { get; set; }
        public string Description { get; set; }
        public string Conclusion { get; set; }
        public string TechnicianName { get; set; }
        public string DoctorName { get; set; }
    }

    /// <summary>
    /// Sổ thăm dò chức năng theo QĐ4069
    /// </summary>
    public class FunctionalTestRegisterDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalExams { get; set; }
        public List<FunctionalTestRegisterItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết sổ TDCN
    /// </summary>
    public class FunctionalTestRegisterItemDto
    {
        public int RowNumber { get; set; }
        public DateTime ExamDate { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public int? Age { get; set; }
        public string Gender { get; set; }
        public string TestType { get; set; }
        public string Description { get; set; }
        public string Conclusion { get; set; }
        public string TechnicianName { get; set; }
        public string DoctorName { get; set; }
    }

    /// <summary>
    /// Thống kê CĐHA
    /// </summary>
    public class RadiologyStatisticsDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalOrders { get; set; }
        public int TotalExams { get; set; }
        public int CompletedExams { get; set; }
        public int PendingExams { get; set; }
        public decimal AverageTATMinutes { get; set; }
        public List<StatisticsByServiceTypeDto> ByServiceType { get; set; }
        public List<StatisticsByDayDto> ByDay { get; set; }
        public List<StatisticsByModalityDto> ByModality { get; set; }
    }

    /// <summary>
    /// Thống kê theo loại dịch vụ
    /// </summary>
    public class StatisticsByServiceTypeDto
    {
        public string ServiceType { get; set; }
        public string ServiceTypeName { get; set; }
        public int ExamCount { get; set; }
        public int CompletedCount { get; set; }
        public decimal Percentage { get; set; }
    }

    /// <summary>
    /// Thống kê theo ngày
    /// </summary>
    public class StatisticsByDayDto
    {
        public DateTime Date { get; set; }
        public int ExamCount { get; set; }
        public int CompletedCount { get; set; }
    }

    /// <summary>
    /// Thống kê theo máy
    /// </summary>
    public class StatisticsByModalityDto
    {
        public Guid ModalityId { get; set; }
        public string ModalityName { get; set; }
        public string ModalityType { get; set; }
        public int ExamCount { get; set; }
        public decimal UtilizationPercent { get; set; }
    }

    /// <summary>
    /// Báo cáo định mức tiêu hao
    /// </summary>
    public class ConsumptionNormReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public List<ConsumptionByServiceDto> ByService { get; set; }
    }

    /// <summary>
    /// Tiêu hao theo dịch vụ
    /// </summary>
    public class ConsumptionByServiceDto
    {
        public Guid ServiceId { get; set; }
        public string ServiceCode { get; set; }
        public string ServiceName { get; set; }
        public int ExamCount { get; set; }
        public List<ConsumptionItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết tiêu hao
    /// </summary>
    public class ConsumptionItemDto
    {
        public Guid ItemId { get; set; }
        public string ItemCode { get; set; }
        public string ItemName { get; set; }
        public decimal NormQuantity { get; set; }
        public decimal ActualQuantity { get; set; }
        public decimal Variance { get; set; }
        public string Unit { get; set; }
    }

    #endregion

    #region DICOM Viewer & Image Editing

    /// <summary>
    /// Cấu hình DICOM Viewer
    /// </summary>
    public class DicomViewerConfigDto
    {
        public string ViewerUrl { get; set; }
        public string ViewerType { get; set; } // OHIFViewer, Cornerstone, RadiAnt, etc.
        public bool EnableAnnotation { get; set; }
        public bool EnableMeasurement { get; set; }
        public bool EnableMPR { get; set; }
        public bool Enable3D { get; set; }
        public string DefaultLayout { get; set; }
        public string DefaultWindowLevel { get; set; }
    }

    /// <summary>
    /// URL để mở ảnh trong viewer
    /// </summary>
    public class ViewerUrlDto
    {
        public string StudyInstanceUID { get; set; }
        public string ViewerUrl { get; set; }
        public string WadoRsUrl { get; set; }
        public string DicomWebUrl { get; set; }
    }

    /// <summary>
    /// Chỉnh sửa ảnh
    /// </summary>
    public class ImageEditDto
    {
        public Guid ImageId { get; set; }
        public string EditType { get; set; } // Crop, Rotate, Flip, Brightness, Contrast, Zoom
        public string Parameters { get; set; } // JSON parameters
    }

    /// <summary>
    /// Annotation trên ảnh
    /// </summary>
    public class ImageAnnotationDto
    {
        public Guid Id { get; set; }
        public string StudyInstanceUID { get; set; }
        public string SeriesInstanceUID { get; set; }
        public string SOPInstanceUID { get; set; }
        public string AnnotationType { get; set; } // Arrow, Text, Measurement, ROI
        public string AnnotationData { get; set; } // JSON data
        public string CreatedBy { get; set; }
        public DateTime CreatedTime { get; set; }
    }

    /// <summary>
    /// Key image (ảnh quan trọng)
    /// </summary>
    public class KeyImageDto
    {
        public Guid Id { get; set; }
        public string StudyInstanceUID { get; set; }
        public string SOPInstanceUID { get; set; }
        public string Description { get; set; }
        public string ThumbnailUrl { get; set; }
        public string MarkedBy { get; set; }
        public DateTime MarkedTime { get; set; }
    }

    #endregion

    #region Integration & Export

    /// <summary>
    /// Đồng bộ kết quả với Sở Y tế
    /// </summary>
    public class SyncResultToDoHDto
    {
        public Guid ResultId { get; set; }
        public string SyncStatus { get; set; }
        public DateTime? SyncTime { get; set; }
        public string ErrorMessage { get; set; }
        public string DoHTransactionId { get; set; }
    }

    /// <summary>
    /// Xuất kết quả ra các định dạng
    /// </summary>
    public class ExportResultDto
    {
        public Guid ResultId { get; set; }
        public string Format { get; set; } // PDF, DICOM, HL7
        public bool IncludeImages { get; set; }
        public bool IncludeDicom { get; set; }
    }

    /// <summary>
    /// Trả kết quả qua mạng
    /// </summary>
    public class SendResultDto
    {
        public Guid ResultId { get; set; }
        public Guid DepartmentId { get; set; }
        public string SendMethod { get; set; } // Network, Email, SMS
        public string RecipientEmail { get; set; }
        public string RecipientPhone { get; set; }
    }

    /// <summary>
    /// Kết quả gửi
    /// </summary>
    public class SendResultResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public DateTime SentTime { get; set; }
        public string ReceivedBy { get; set; }
    }

    #endregion

    #region Room & Resource Management

    /// <summary>
    /// Phòng chụp CĐHA
    /// </summary>
    public class RadiologyRoomDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string RoomType { get; set; } // XRay, CT, MRI, Ultrasound, Endoscopy, ECG
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int Capacity { get; set; }
        public string Status { get; set; } // Available, Busy, Maintenance
        public List<ModalityDto> Modalities { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Lịch làm việc phòng CĐHA
    /// </summary>
    public class RadiologyScheduleDto
    {
        public Guid Id { get; set; }
        public Guid RoomId { get; set; }
        public string RoomName { get; set; }
        public DateTime Date { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public Guid? TechnicianId { get; set; }
        public string TechnicianName { get; set; }
        public Guid? DoctorId { get; set; }
        public string DoctorName { get; set; }
        public int MaxSlots { get; set; }
        public int BookedSlots { get; set; }
        public string Note { get; set; }
    }

    #endregion
}
