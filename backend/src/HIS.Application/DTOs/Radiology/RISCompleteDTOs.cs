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
        public int StatusCode { get; set; } // 0: Pending, 1: Scheduled, 2: InProgress, 3: Completed, 4: Reported, 5: Approved, 6: Cancelled
        public string Status { get; set; } // Display name for status
        public string PatientType { get; set; } // Inpatient, Outpatient, Emergency
        public string Priority { get; set; } // Normal, Urgent, Emergency
        public DateTime? CalledTime { get; set; }
        public DateTime? StartTime { get; set; }
        public string StudyInstanceUID { get; set; } // For DICOM viewer integration
        public bool HasImages { get; set; } // True if DICOM images are available
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
        public string? PatientName { get; set; }
        public string? PatientId { get; set; }
        public string? StudyDate { get; set; }
        public string? StudyDescription { get; set; }
        public string? OrthancStudyId { get; set; }
        public string? OrthancSeriesId { get; set; }
        public int? InstanceCount { get; set; }
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

    #region Print Label - In nhãn dán

    /// <summary>
    /// Cấu hình nhãn dán
    /// </summary>
    public class RadiologyLabelConfigDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public int LabelWidth { get; set; } // mm
        public int LabelHeight { get; set; } // mm
        public string TemplateHtml { get; set; }
        public string TemplateZpl { get; set; }
        public bool IncludeQRCode { get; set; }
        public bool IncludeBarcode { get; set; }
        public string BarcodeFormat { get; set; } // CODE128, CODE39, QR
        public Guid? ServiceTypeId { get; set; }
        public string ServiceTypeName { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Yêu cầu in nhãn
    /// </summary>
    public class PrintLabelRequestDto
    {
        public Guid OrderId { get; set; }
        public Guid? LabelConfigId { get; set; }
        public int Copies { get; set; } = 1;
        public string PrinterName { get; set; }
        public string OutputFormat { get; set; } = "HTML"; // HTML, ZPL, PDF
    }

    /// <summary>
    /// Dữ liệu in nhãn
    /// </summary>
    public class LabelDataDto
    {
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public int? Age { get; set; }
        public string Gender { get; set; }
        public string OrderCode { get; set; }
        public string ServiceName { get; set; }
        public string RoomName { get; set; }
        public DateTime OrderDate { get; set; }
        public int QueueNumber { get; set; }
        public string AccessionNumber { get; set; }
        public string QRCodeData { get; set; }
        public string BarcodeData { get; set; }
        public string LabelContent { get; set; } // Rendered HTML/ZPL
    }

    #endregion

    #region Diagnosis Templates - Mẫu chẩn đoán thường dùng

    /// <summary>
    /// Mẫu chẩn đoán thường dùng
    /// </summary>
    public class DiagnosisTemplateDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Conclusion { get; set; }
        public string Recommendation { get; set; }
        public Guid? ServiceTypeId { get; set; }
        public string ServiceTypeName { get; set; }
        public Guid? ServiceId { get; set; }
        public string ServiceName { get; set; }
        public string Gender { get; set; }
        public int? MinAge { get; set; }
        public int? MaxAge { get; set; }
        public int SortOrder { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
        public string CreatedByUserName { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật mẫu chẩn đoán
    /// </summary>
    public class SaveDiagnosisTemplateDto
    {
        public Guid? Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Conclusion { get; set; }
        public string Recommendation { get; set; }
        public Guid? ServiceTypeId { get; set; }
        public Guid? ServiceId { get; set; }
        public string Gender { get; set; }
        public int? MinAge { get; set; }
        public int? MaxAge { get; set; }
        public int SortOrder { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
    }

    #endregion

    #region Abbreviations - Bộ từ viết tắt

    /// <summary>
    /// Từ viết tắt
    /// </summary>
    public class AbbreviationDto
    {
        public Guid Id { get; set; }
        public string Abbreviation { get; set; }
        public string FullText { get; set; }
        public string Category { get; set; } // Description, Conclusion, Recommendation
        public Guid? ServiceTypeId { get; set; }
        public string ServiceTypeName { get; set; }
        public bool IsGlobal { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public string CreatedByUserName { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật từ viết tắt
    /// </summary>
    public class SaveAbbreviationDto
    {
        public Guid? Id { get; set; }
        public string Abbreviation { get; set; }
        public string FullText { get; set; }
        public string Category { get; set; }
        public Guid? ServiceTypeId { get; set; }
        public bool IsGlobal { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Kết quả mở rộng từ viết tắt
    /// </summary>
    public class ExpandAbbreviationResultDto
    {
        public string OriginalText { get; set; }
        public string ExpandedText { get; set; }
        public int ReplacementCount { get; set; }
        public List<string> ReplacedAbbreviations { get; set; }
    }

    #endregion

    #region QR Code - Mã QR

    /// <summary>
    /// Yêu cầu sinh mã QR
    /// </summary>
    public class GenerateQRCodeRequestDto
    {
        public Guid OrderId { get; set; }
        public string? QRType { get; set; } // PATIENT_INFO, ORDER_INFO, RESULT_SHARE, DICOM_LINK
        public int Size { get; set; } = 200; // pixels
        public bool IncludePatientInfo { get; set; }
        public bool IncludeOrderInfo { get; set; }
        public bool IncludeResultLink { get; set; }
        public int? ValidityHours { get; set; } // Thời gian hiệu lực link
    }

    /// <summary>
    /// Kết quả sinh mã QR
    /// </summary>
    public class QRCodeResultDto
    {
        public Guid OrderId { get; set; }
        public string QRType { get; set; }
        public string QRCodeBase64 { get; set; }
        public string QRCodeUrl { get; set; }
        public string EncodedData { get; set; }
        public DateTime GeneratedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }

    /// <summary>
    /// Dữ liệu quét mã QR
    /// </summary>
    public class ScanQRCodeResultDto
    {
        public bool Success { get; set; }
        public string QRType { get; set; }
        public Guid? PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public Guid? OrderId { get; set; }
        public string OrderCode { get; set; }
        public string ResultShareUrl { get; set; }
        public string DicomViewerUrl { get; set; }
        public string ErrorMessage { get; set; }
    }

    /// <summary>
    /// Chia sẻ kết quả qua QR
    /// </summary>
    public class ShareResultQRDto
    {
        public Guid ResultId { get; set; }
        public string ShareUrl { get; set; }
        public string QRCodeBase64 { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string AccessCode { get; set; }
    }

    #endregion

    #region Duty Schedule - Lịch phân công trực

    /// <summary>
    /// Lịch phân công trực
    /// </summary>
    public class DutyScheduleDto
    {
        public Guid Id { get; set; }
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public Guid? RoomId { get; set; }
        public string RoomName { get; set; }
        public DateTime DutyDate { get; set; }
        public int ShiftType { get; set; } // 1=Sáng, 2=Chiều, 3=Đêm, 4=Ca 24h
        public string ShiftTypeName { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public Guid? DoctorId { get; set; }
        public string DoctorName { get; set; }
        public Guid? TechnicianId { get; set; }
        public string TechnicianName { get; set; }
        public Guid? AssistantTechnicianId { get; set; }
        public string AssistantTechnicianName { get; set; }
        public string Notes { get; set; }
        public int Status { get; set; } // 0=Draft, 1=Confirmed, 2=Cancelled
        public string StatusName { get; set; }
        public string ApprovedByName { get; set; }
        public DateTime? ApprovedAt { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật lịch trực
    /// </summary>
    public class SaveDutyScheduleDto
    {
        public Guid? Id { get; set; }
        public Guid DepartmentId { get; set; }
        public Guid? RoomId { get; set; }
        public DateTime DutyDate { get; set; }
        public int ShiftType { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public Guid? DoctorId { get; set; }
        public Guid? TechnicianId { get; set; }
        public Guid? AssistantTechnicianId { get; set; }
        public string Notes { get; set; }
    }

    /// <summary>
    /// Tạo lịch trực hàng loạt
    /// </summary>
    public class BatchCreateDutyScheduleDto
    {
        public Guid DepartmentId { get; set; }
        public Guid? RoomId { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public List<int> ShiftTypes { get; set; }
        public List<DutyScheduleStaffDto> Staff { get; set; }
    }

    /// <summary>
    /// Nhân sự trực
    /// </summary>
    public class DutyScheduleStaffDto
    {
        public int DayOfWeek { get; set; }
        public int ShiftType { get; set; }
        public Guid? DoctorId { get; set; }
        public Guid? TechnicianId { get; set; }
        public Guid? AssistantTechnicianId { get; set; }
    }

    #endregion

    #region Room Assignment - Phân phòng thực hiện

    /// <summary>
    /// Phân phòng thực hiện
    /// </summary>
    public class RoomAssignmentDto
    {
        public Guid Id { get; set; }
        public Guid RadiologyRequestId { get; set; }
        public string OrderCode { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public string ServiceName { get; set; }
        public Guid RoomId { get; set; }
        public string RoomName { get; set; }
        public Guid? ModalityId { get; set; }
        public string ModalityName { get; set; }
        public int QueueNumber { get; set; }
        public int Status { get; set; } // 0=Waiting, 1=Called, 2=InProgress, 3=Completed, 4=Skipped
        public string StatusName { get; set; }
        public DateTime AssignedAt { get; set; }
        public string AssignedByUserName { get; set; }
        public DateTime? CalledAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string Notes { get; set; }
    }

    /// <summary>
    /// Yêu cầu phân phòng
    /// </summary>
    public class AssignRoomRequestDto
    {
        public Guid RadiologyRequestId { get; set; }
        public Guid RoomId { get; set; }
        public Guid? ModalityId { get; set; }
        public string Notes { get; set; }
    }

    /// <summary>
    /// Thống kê phòng
    /// </summary>
    public class RoomStatisticsDto
    {
        public Guid RoomId { get; set; }
        public string RoomName { get; set; }
        public int WaitingCount { get; set; }
        public int CalledCount { get; set; }
        public int InProgressCount { get; set; }
        public int CompletedCount { get; set; }
        public int SkippedCount { get; set; }
        public int TotalCount { get; set; }
        public decimal AverageWaitTimeMinutes { get; set; }
    }

    #endregion

    #region Tags - Quản lý Tag ca chụp

    /// <summary>
    /// Tag ca chụp
    /// </summary>
    public class RadiologyTagDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Color { get; set; }
        public Guid? ParentId { get; set; }
        public string ParentName { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public int RequestCount { get; set; } // Số ca chụp được gắn tag này
        public List<RadiologyTagDto> Children { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật Tag
    /// </summary>
    public class SaveRadiologyTagDto
    {
        public Guid? Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Color { get; set; }
        public Guid? ParentId { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Gắn/Gỡ Tag cho ca chụp
    /// </summary>
    public class AssignTagRequestDto
    {
        public Guid RadiologyRequestId { get; set; }
        public List<Guid> TagIds { get; set; }
        public string Note { get; set; }
    }

    /// <summary>
    /// Ca chụp được gắn Tag
    /// </summary>
    public class TaggedRequestDto
    {
        public Guid Id { get; set; }
        public Guid RadiologyRequestId { get; set; }
        public string OrderCode { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public string ServiceName { get; set; }
        public DateTime OrderDate { get; set; }
        public Guid TagId { get; set; }
        public string TagName { get; set; }
        public string TagColor { get; set; }
        public string Note { get; set; }
        public string AddedByUserName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    #endregion

    #region Integration Log - Log tích hợp HIS-RIS

    /// <summary>
    /// Log tích hợp
    /// </summary>
    public class IntegrationLogDto
    {
        public Guid Id { get; set; }
        public string LogCode { get; set; }
        public string Direction { get; set; } // HIS_TO_RIS, RIS_TO_HIS
        public string DirectionName { get; set; }
        public string MessageType { get; set; } // ORDER, RESULT, CANCEL
        public string MessageTypeName { get; set; }
        public Guid? RadiologyRequestId { get; set; }
        public string PatientCode { get; set; }
        public string MedicalRecordCode { get; set; }
        public string RequestCode { get; set; }
        public DateTime SentAt { get; set; }
        public string RequestPayload { get; set; }
        public string ResponsePayload { get; set; }
        public int Status { get; set; } // 0=Pending, 1=Success, 2=Failed, 3=Retrying
        public string StatusName { get; set; }
        public string ErrorMessage { get; set; }
        public int RetryCount { get; set; }
        public DateTime? LastRetryAt { get; set; }
        public string SourceSystem { get; set; }
        public string TargetSystem { get; set; }
        public string TransactionId { get; set; }
    }

    /// <summary>
    /// Tìm kiếm log tích hợp
    /// </summary>
    public class SearchIntegrationLogDto
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? Direction { get; set; }
        public string? MessageType { get; set; }
        public int? Status { get; set; }
        public string? RequestCode { get; set; }
        public string? PatientCode { get; set; }
        public string? MedicalRecordCode { get; set; }
        public string? SourceSystem { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }

    /// <summary>
    /// Kết quả tìm kiếm log
    /// </summary>
    public class IntegrationLogSearchResultDto
    {
        public List<IntegrationLogDto> Items { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    /// <summary>
    /// Thống kê log tích hợp
    /// </summary>
    public class IntegrationLogStatisticsDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalMessages { get; set; }
        public int SuccessCount { get; set; }
        public int FailedCount { get; set; }
        public int PendingCount { get; set; }
        public decimal SuccessRate { get; set; }
        public List<IntegrationLogByTypeDto> ByMessageType { get; set; }
        public List<IntegrationLogByDayDto> ByDay { get; set; }
    }

    /// <summary>
    /// Thống kê theo loại message
    /// </summary>
    public class IntegrationLogByTypeDto
    {
        public string MessageType { get; set; }
        public int TotalCount { get; set; }
        public int SuccessCount { get; set; }
        public int FailedCount { get; set; }
    }

    /// <summary>
    /// Thống kê theo ngày
    /// </summary>
    public class IntegrationLogByDayDto
    {
        public DateTime Date { get; set; }
        public int TotalCount { get; set; }
        public int SuccessCount { get; set; }
        public int FailedCount { get; set; }
    }

    #endregion

    #region Digital Signature - Ký số

    /// <summary>
    /// Cấu hình ký số
    /// </summary>
    public class DigitalSignatureConfigDto
    {
        public Guid Id { get; set; }
        public string SignatureType { get; set; } // NONE, DIGITAL, EKYC, SIGNSERVER, SMARTCA
        public string SignatureTypeName { get; set; }
        public string Name { get; set; }
        public string ProviderUrl { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật cấu hình ký số
    /// </summary>
    public class SaveDigitalSignatureConfigDto
    {
        public Guid? Id { get; set; }
        public string SignatureType { get; set; }
        public string Name { get; set; }
        public string ProviderUrl { get; set; }
        public string ApiKey { get; set; }
        public string ApiSecret { get; set; }
        public string CertificatePath { get; set; }
        public string CertificatePassword { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
        public string ConfigJson { get; set; }
    }

    /// <summary>
    /// Yêu cầu ký số
    /// </summary>
    public class SignResultRequestDto
    {
        public Guid ReportId { get; set; }
        public Guid? SignatureConfigId { get; set; }
        public string? SignatureType { get; set; }
        public string? Pin { get; set; } // PIN cho USB token
        public string? OTP { get; set; } // OTP cho cloud signing
        public string? Note { get; set; } // Ghi chú
    }

    /// <summary>
    /// Kết quả ký số
    /// </summary>
    public class SignResultResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public DateTime? SignedAt { get; set; }
        public string SignerName { get; set; }
        public string CertificateSerial { get; set; }
        public string SignedDocumentPath { get; set; }
        public string TransactionId { get; set; }
    }

    /// <summary>
    /// Lịch sử ký số
    /// </summary>
    public class SignatureHistoryDto
    {
        public Guid Id { get; set; }
        public Guid RadiologyReportId { get; set; }
        public string OrderCode { get; set; }
        public string PatientName { get; set; }
        public string ServiceName { get; set; }
        public Guid SignedByUserId { get; set; }
        public string SignedByUserName { get; set; }
        public string SignatureType { get; set; }
        public string SignatureTypeName { get; set; }
        public DateTime SignedAt { get; set; }
        public string CertificateSerial { get; set; }
        public string CertificateSubject { get; set; }
        public string CertificateIssuer { get; set; }
        public DateTime? CertificateValidFrom { get; set; }
        public DateTime? CertificateValidTo { get; set; }
        public int Status { get; set; }
        public string StatusName { get; set; }
        public string SignedDocumentPath { get; set; }
        public string TransactionId { get; set; }
    }

    /// <summary>
    /// Hủy kết quả đã ký
    /// </summary>
    public class CancelSignedResultDto
    {
        public Guid ReportId { get; set; }
        public string Reason { get; set; }
    }

    #endregion

    #region Statistics By Service Type - Thống kê theo nhóm dịch vụ

    /// <summary>
    /// Thống kê ca chụp theo nhóm dịch vụ
    /// </summary>
    public class ExamStatisticsByServiceTypeDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalExams { get; set; }
        public List<ServiceTypeStatisticsDto> ServiceTypes { get; set; }
    }

    /// <summary>
    /// Thống kê theo từng nhóm dịch vụ
    /// </summary>
    public class ServiceTypeStatisticsDto
    {
        public Guid ServiceTypeId { get; set; }
        public string ServiceTypeCode { get; set; }
        public string ServiceTypeName { get; set; }
        public int TotalExams { get; set; }
        public int CompletedExams { get; set; }
        public int PendingExams { get; set; }
        public int CancelledExams { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal InsuranceRevenue { get; set; }
        public decimal PatientRevenue { get; set; }
        public decimal Percentage { get; set; }
        public List<ServiceStatisticsDto> Services { get; set; }
    }

    /// <summary>
    /// Thống kê theo từng dịch vụ
    /// </summary>
    public class ServiceStatisticsDto
    {
        public Guid ServiceId { get; set; }
        public string ServiceCode { get; set; }
        public string ServiceName { get; set; }
        public int TotalExams { get; set; }
        public int CompletedExams { get; set; }
        public decimal TotalRevenue { get; set; }
    }

    #endregion

// Additional request DTOs
public class ExpandAbbreviationRequest
{
    public string Text { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public Guid? ServiceTypeId { get; set; }
}

public class ScanQRCodeRequest
{
    public string QRData { get; set; } = string.Empty;
    public string ScanType { get; set; } = string.Empty;
}

public class SkipPatientRequest
{
    public Guid PatientId { get; set; }
    public Guid ExamId { get; set; }
    public string Reason { get; set; } = string.Empty;
}

    #region IV. Capture Device - Thiết bị Capture

    /// <summary>
    /// Thiết bị Capture
    /// </summary>
    public class CaptureDeviceDto
    {
        public Guid Id { get; set; }
        public string DeviceCode { get; set; }
        public string DeviceName { get; set; }
        public string DeviceType { get; set; } // Ultrasound, Endoscopy
        public string Manufacturer { get; set; }
        public string Model { get; set; }
        public string SerialNumber { get; set; }
        public Guid? RoomId { get; set; }
        public string RoomName { get; set; }
        public string ConnectionType { get; set; } // TCP, Serial, USB, File
        public string IpAddress { get; set; }
        public int? Port { get; set; }
        public string ComPort { get; set; }
        public int? BaudRate { get; set; }
        public string FolderPath { get; set; }
        public string AETitle { get; set; }
        public bool SupportsDicom { get; set; }
        public bool SupportsWorklist { get; set; }
        public bool SupportsMPPS { get; set; }
        public int MaxExamsPerDay { get; set; }
        public bool AutoSelectThumbnail { get; set; }
        public bool SendOnlyThumbnail { get; set; }
        public string DefaultFrameFormat { get; set; }
        public string VideoFormat { get; set; }
        public int Status { get; set; } // 0=Offline, 1=Online, 2=Busy, 3=Error
        public string StatusName { get; set; }
        public bool IsActive { get; set; }
        public DateTime? LastCommunication { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật thiết bị Capture
    /// </summary>
    public class SaveCaptureDeviceDto
    {
        public Guid? Id { get; set; }
        public string DeviceCode { get; set; }
        public string DeviceName { get; set; }
        public string DeviceType { get; set; }
        public string Manufacturer { get; set; }
        public string Model { get; set; }
        public string SerialNumber { get; set; }
        public Guid? RoomId { get; set; }
        public string ConnectionType { get; set; }
        public string IpAddress { get; set; }
        public int? Port { get; set; }
        public string ComPort { get; set; }
        public int? BaudRate { get; set; }
        public string FolderPath { get; set; }
        public string AETitle { get; set; }
        public bool SupportsDicom { get; set; }
        public bool SupportsWorklist { get; set; }
        public bool SupportsMPPS { get; set; }
        public int MaxExamsPerDay { get; set; }
        public bool AutoSelectThumbnail { get; set; }
        public bool SendOnlyThumbnail { get; set; }
        public string DefaultFrameFormat { get; set; }
        public string VideoFormat { get; set; }
        public bool IsActive { get; set; }
        public string ConfigJson { get; set; }
    }

    /// <summary>
    /// Workstation
    /// </summary>
    public class WorkstationDto
    {
        public Guid Id { get; set; }
        public string WorkstationCode { get; set; }
        public string WorkstationName { get; set; }
        public string ComputerName { get; set; }
        public string IpAddress { get; set; }
        public Guid? RoomId { get; set; }
        public string RoomName { get; set; }
        public Guid? DefaultDeviceId { get; set; }
        public string DefaultDeviceName { get; set; }
        public string HotkeysConfig { get; set; }
        public int? BrightnessLevel { get; set; }
        public int? ContrastLevel { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật Workstation
    /// </summary>
    public class SaveWorkstationDto
    {
        public Guid? Id { get; set; }
        public string WorkstationCode { get; set; }
        public string WorkstationName { get; set; }
        public string ComputerName { get; set; }
        public string IpAddress { get; set; }
        public Guid? RoomId { get; set; }
        public Guid? DefaultDeviceId { get; set; }
        public string HotkeysConfig { get; set; }
        public int? BrightnessLevel { get; set; }
        public int? ContrastLevel { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Phiên capture
    /// </summary>
    public class CaptureSessionDto
    {
        public Guid Id { get; set; }
        public Guid DeviceId { get; set; }
        public string DeviceName { get; set; }
        public Guid? WorkstationId { get; set; }
        public string WorkstationName { get; set; }
        public Guid RadiologyRequestId { get; set; }
        public string OrderCode { get; set; }
        public string PatientName { get; set; }
        public string ServiceName { get; set; }
        public Guid? OperatorId { get; set; }
        public string OperatorName { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public int Status { get; set; } // 0=Active, 1=Paused, 2=Completed, 3=Cancelled
        public string StatusName { get; set; }
        public int CapturedImageCount { get; set; }
        public int CapturedVideoCount { get; set; }
    }

    /// <summary>
    /// Tạo phiên capture
    /// </summary>
    public class CreateCaptureSessionDto
    {
        public Guid DeviceId { get; set; }
        public Guid? WorkstationId { get; set; }
        public Guid RadiologyRequestId { get; set; }
    }

    /// <summary>
    /// Hình ảnh/Video capture
    /// </summary>
    public class CapturedMediaDto
    {
        public Guid Id { get; set; }
        public Guid SessionId { get; set; }
        public string MediaType { get; set; } // Image, Video
        public string FileName { get; set; }
        public string FilePath { get; set; }
        public string ThumbnailPath { get; set; }
        public long FileSize { get; set; }
        public string MimeType { get; set; }
        public int SequenceNumber { get; set; }
        public bool IsThumbnail { get; set; }
        public bool IsSentToPacs { get; set; }
        public DateTime? SentToPacsAt { get; set; }
        public string DicomStudyUID { get; set; }
        public string DicomSeriesUID { get; set; }
        public string DicomInstanceUID { get; set; }
        public string Annotations { get; set; }
        public string Notes { get; set; }
    }

    /// <summary>
    /// Upload hình ảnh capture
    /// </summary>
    public class UploadCapturedMediaDto
    {
        public Guid SessionId { get; set; }
        public string MediaType { get; set; }
        public string FileName { get; set; }
        public string Base64Data { get; set; }
        public bool IsThumbnail { get; set; }
        public string Notes { get; set; }
    }

    /// <summary>
    /// Gửi ảnh đến PACS
    /// </summary>
    public class SendToPacsRequestDto
    {
        public Guid SessionId { get; set; }
        public List<Guid> MediaIds { get; set; }
        public bool OnlyThumbnails { get; set; }
    }

    /// <summary>
    /// Kết quả gửi PACS
    /// </summary>
    public class SendToPacsResultDto
    {
        public bool Success { get; set; }
        public int SentCount { get; set; }
        public int FailedCount { get; set; }
        public string StudyInstanceUID { get; set; }
        public List<string> Errors { get; set; }
        public DateTime SentAt { get; set; }
    }

    /// <summary>
    /// Trạng thái thiết bị Capture
    /// </summary>
    public class CaptureDeviceStatusDto
    {
        public Guid DeviceId { get; set; }
        public bool IsConnected { get; set; }
        public DateTime? LastCommunication { get; set; }
        public string Status { get; set; }
        public string Message { get; set; }
    }

    /// <summary>
    /// Lưu media capture
    /// </summary>
    public class SaveCapturedMediaDto
    {
        public Guid CaptureSessionId { get; set; }
        public string MediaType { get; set; }
        public string FilePath { get; set; }
        public long FileSize { get; set; }
        public string ThumbnailPath { get; set; }
        public string Description { get; set; }
    }

    /// <summary>
    /// Thống kê thiết bị hàng ngày
    /// </summary>
    public class DeviceDailyStatisticsDto
    {
        public Guid DeviceId { get; set; }
        public string DeviceName { get; set; }
        public DateTime Date { get; set; }
        public int TotalExams { get; set; }
        public int RemainingExams { get; set; }
        public bool IsLimitReached { get; set; }
    }

    #endregion

    #region V. Consultation - Hội chẩn ca chụp

    /// <summary>
    /// Phiên hội chẩn
    /// </summary>
    public class ConsultationSessionDto
    {
        public Guid Id { get; set; }
        public string SessionCode { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public DateTime ScheduledStartTime { get; set; }
        public DateTime ScheduledEndTime { get; set; }
        public DateTime? ActualStartTime { get; set; }
        public DateTime? ActualEndTime { get; set; }
        public Guid OrganizerId { get; set; }
        public string OrganizerName { get; set; }
        public Guid? LeaderId { get; set; }
        public string LeaderName { get; set; }
        public Guid? SecretaryId { get; set; }
        public string SecretaryName { get; set; }
        public int Status { get; set; } // 0=Draft, 1=Scheduled, 2=InProgress, 3=Completed, 4=Cancelled
        public string StatusName { get; set; }
        public string MeetingUrl { get; set; }
        public string QRCodeData { get; set; }
        public string RecordingPath { get; set; }
        public bool IsRecording { get; set; }
        public string Notes { get; set; }
        public int CaseCount { get; set; }
        public int ParticipantCount { get; set; }
        public List<ConsultationCaseDto> Cases { get; set; }
        public List<ConsultationParticipantDto> Participants { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật phiên hội chẩn
    /// </summary>
    public class SaveConsultationSessionDto
    {
        public Guid? Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public DateTime ScheduledStartTime { get; set; }
        public DateTime ScheduledEndTime { get; set; }
        public Guid? LeaderId { get; set; }
        public Guid? SecretaryId { get; set; }
        public string Notes { get; set; }
        public List<Guid> CaseRequestIds { get; set; }
        public List<Guid> ParticipantUserIds { get; set; }
    }

    /// <summary>
    /// Ca chụp trong phiên hội chẩn
    /// </summary>
    public class ConsultationCaseDto
    {
        public Guid Id { get; set; }
        public Guid SessionId { get; set; }
        public Guid RadiologyRequestId { get; set; }
        public string OrderCode { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public int? PatientAge { get; set; }
        public string PatientGender { get; set; }
        public string ServiceName { get; set; }
        public string StudyInstanceUID { get; set; }
        public int OrderNumber { get; set; }
        public string Reason { get; set; }
        public string PreliminaryDiagnosis { get; set; }
        public int Status { get; set; } // 0=Pending, 1=Discussed, 2=Concluded
        public string StatusName { get; set; }
        public string Conclusion { get; set; }
        public string Recommendation { get; set; }
        public string Notes { get; set; }
    }

    /// <summary>
    /// Thêm ca vào phiên hội chẩn
    /// </summary>
    public class AddConsultationCaseDto
    {
        public Guid SessionId { get; set; }
        public Guid RadiologyRequestId { get; set; }
        public string Reason { get; set; }
        public string PreliminaryDiagnosis { get; set; }
    }

    /// <summary>
    /// Kết luận ca hội chẩn
    /// </summary>
    public class ConcludeCaseDto
    {
        public Guid CaseId { get; set; }
        public string Conclusion { get; set; }
        public string Recommendation { get; set; }
        public string Notes { get; set; }
    }

    /// <summary>
    /// Người tham gia hội chẩn
    /// </summary>
    public class ConsultationParticipantDto
    {
        public Guid Id { get; set; }
        public Guid SessionId { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; }
        public string Department { get; set; }
        public string Role { get; set; } // Leader, Secretary, Participant, Observer
        public int Status { get; set; } // 0=Invited, 1=Accepted, 2=Rejected, 3=Joined, 4=Left
        public string StatusName { get; set; }
        public DateTime? InvitedAt { get; set; }
        public DateTime? JoinedAt { get; set; }
        public DateTime? LeftAt { get; set; }
        public bool IsAudioEnabled { get; set; }
        public bool IsVideoEnabled { get; set; }
        public bool IsScreenSharing { get; set; }
    }

    /// <summary>
    /// Mời tham gia hội chẩn
    /// </summary>
    public class InviteParticipantDto
    {
        public Guid SessionId { get; set; }
        public Guid UserId { get; set; }
        public string Role { get; set; }
    }

    /// <summary>
    /// Chấp nhận/Từ chối lời mời
    /// </summary>
    public class RespondInvitationDto
    {
        public Guid SessionId { get; set; }
        public Guid UserId { get; set; }
        public bool Accept { get; set; }
        public string Note { get; set; }
    }

    /// <summary>
    /// File đính kèm hội chẩn
    /// </summary>
    public class ConsultationAttachmentDto
    {
        public Guid Id { get; set; }
        public Guid SessionId { get; set; }
        public Guid? CaseId { get; set; }
        public string FileName { get; set; }
        public string FilePath { get; set; }
        public string FileType { get; set; }
        public long FileSize { get; set; }
        public string UploadedByUserName { get; set; }
        public DateTime UploadedAt { get; set; }
        public string Description { get; set; }
    }

    /// <summary>
    /// Upload file đính kèm
    /// </summary>
    public class UploadConsultationAttachmentDto
    {
        public Guid SessionId { get; set; }
        public Guid? CaseId { get; set; }
        public string FileName { get; set; }
        public string FileType { get; set; }
        public string Base64Data { get; set; }
        public string Description { get; set; }
    }

    /// <summary>
    /// Thêm file đính kèm vào hội chẩn
    /// </summary>
    public class AddConsultationAttachmentDto
    {
        public Guid SessionId { get; set; }
        public Guid? CaseId { get; set; }
        public string FileName { get; set; }
        public string FileType { get; set; }
        public string Base64Data { get; set; }
        public string Description { get; set; }
    }

    /// <summary>
    /// Thảo luận trong hội chẩn
    /// </summary>
    public class ConsultationDiscussionDto
    {
        public Guid Id { get; set; }
        public Guid SessionId { get; set; }
        public Guid? CaseId { get; set; }
        public Guid ParticipantId { get; set; }
        public string ParticipantName { get; set; }
        public string MessageType { get; set; } // Text, Image, Annotation
        public string Content { get; set; }
        public string AttachmentPath { get; set; }
        public DateTime PostedAt { get; set; }
        public bool IsDeleted { get; set; }
    }

    /// <summary>
    /// Gửi tin nhắn thảo luận
    /// </summary>
    public class PostDiscussionDto
    {
        public Guid SessionId { get; set; }
        public Guid? CaseId { get; set; }
        public string MessageType { get; set; }
        public string Content { get; set; }
        public string AttachmentBase64 { get; set; }
    }

    /// <summary>
    /// Thêm thảo luận vào hội chẩn
    /// </summary>
    public class AddConsultationDiscussionDto
    {
        public Guid SessionId { get; set; }
        public Guid? CaseId { get; set; }
        public string MessageType { get; set; }
        public string Content { get; set; }
        public string AttachmentBase64 { get; set; }
    }

    /// <summary>
    /// Ghi chú ảnh DICOM hội chẩn
    /// </summary>
    public class ConsultationImageNoteDto
    {
        public Guid Id { get; set; }
        public Guid SessionId { get; set; }
        public string StudyInstanceUID { get; set; }
        public string SeriesInstanceUID { get; set; }
        public string SOPInstanceUID { get; set; }
        public Guid CreatedByUserId { get; set; }
        public string CreatedByUserName { get; set; }
        public string AnnotationType { get; set; }
        public string AnnotationData { get; set; }
        public string Notes { get; set; }
        public bool IsShared { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Lưu ghi chú ảnh
    /// </summary>
    public class SaveImageNoteDto
    {
        public Guid SessionId { get; set; }
        public string StudyInstanceUID { get; set; }
        public string SeriesInstanceUID { get; set; }
        public string SOPInstanceUID { get; set; }
        public string AnnotationType { get; set; }
        public string AnnotationData { get; set; }
        public string Notes { get; set; }
        public bool IsShared { get; set; }
    }

    /// <summary>
    /// Thêm ghi chú ảnh vào hội chẩn
    /// </summary>
    public class AddConsultationImageNoteDto
    {
        public Guid SessionId { get; set; }
        public string StudyInstanceUID { get; set; }
        public string SeriesInstanceUID { get; set; }
        public string SOPInstanceUID { get; set; }
        public string AnnotationType { get; set; }
        public string AnnotationData { get; set; }
        public string Notes { get; set; }
        public bool IsShared { get; set; }
    }

    /// <summary>
    /// Biên bản hội chẩn
    /// </summary>
    public class ConsultationMinutesDto
    {
        public Guid Id { get; set; }
        public Guid SessionId { get; set; }
        public string MinutesCode { get; set; }
        public string TemplateUsed { get; set; }
        public string Content { get; set; }
        public string Conclusions { get; set; }
        public string Recommendations { get; set; }
        public string CreatedByUserName { get; set; }
        public int Status { get; set; }
        public string StatusName { get; set; }
        public string ApprovedByUserName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string PdfPath { get; set; }
    }

    /// <summary>
    /// Lưu biên bản
    /// </summary>
    public class SaveConsultationMinutesDto
    {
        public Guid SessionId { get; set; }
        public string TemplateUsed { get; set; }
        public string Content { get; set; }
        public string Conclusions { get; set; }
        public string Recommendations { get; set; }
    }

    /// <summary>
    /// QR Code mời hội chẩn
    /// </summary>
    public class ConsultationInviteQRDto
    {
        public Guid SessionId { get; set; }
        public string SessionCode { get; set; }
        public string Title { get; set; }
        public string MeetingUrl { get; set; }
        public string QRCodeBase64 { get; set; }
        public DateTime ExpiresAt { get; set; }
    }

    /// <summary>
    /// Tìm kiếm phiên hội chẩn
    /// </summary>
    public class SearchConsultationDto
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public int? Status { get; set; }
        public Guid? OrganizerId { get; set; }
        public string? Keyword { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    /// <summary>
    /// Kết quả tìm kiếm phiên hội chẩn
    /// </summary>
    public class ConsultationSearchResultDto
    {
        public List<ConsultationSessionDto> Items { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    #endregion

    #region X. HL7 CDA Integration

    /// <summary>
    /// Cấu hình HL7 CDA
    /// </summary>
    public class HL7CDAConfigDto
    {
        public Guid Id { get; set; }
        public string ConfigName { get; set; }
        public string HL7Version { get; set; }
        public string CDAVersion { get; set; }
        public string SendingApplication { get; set; }
        public string SendingFacility { get; set; }
        public string ReceivingApplication { get; set; }
        public string ReceivingFacility { get; set; }
        public string ConnectionType { get; set; } // MLLP, HTTP, File
        public string ServerAddress { get; set; }
        public int? ServerPort { get; set; }
        public string FilePath { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Lưu cấu hình HL7 CDA
    /// </summary>
    public class SaveHL7CDAConfigDto
    {
        public Guid? Id { get; set; }
        public string ConfigName { get; set; }
        public string HL7Version { get; set; }
        public string CDAVersion { get; set; }
        public string SendingApplication { get; set; }
        public string SendingFacility { get; set; }
        public string ReceivingApplication { get; set; }
        public string ReceivingFacility { get; set; }
        public string ConnectionType { get; set; }
        public string ServerAddress { get; set; }
        public int? ServerPort { get; set; }
        public string FilePath { get; set; }
        public bool IsActive { get; set; }
        public string ConfigJson { get; set; }
    }

    /// <summary>
    /// Message HL7
    /// </summary>
    public class HL7MessageDto
    {
        public Guid Id { get; set; }
        public string MessageControlId { get; set; }
        public string MessageType { get; set; }
        public string TriggerEvent { get; set; }
        public string Direction { get; set; }
        public Guid? RadiologyRequestId { get; set; }
        public string PatientId { get; set; }
        public string AccessionNumber { get; set; }
        public string RawMessage { get; set; }
        public string ParsedData { get; set; }
        public DateTime MessageDateTime { get; set; }
        public int Status { get; set; }
        public string StatusName { get; set; }
        public string AckCode { get; set; }
        public string ErrorMessage { get; set; }
        public int RetryCount { get; set; }
    }

    /// <summary>
    /// Gửi HL7 message
    /// </summary>
    public class SendHL7MessageDto
    {
        public string MessageType { get; set; }
        public string TriggerEvent { get; set; }
        public Guid? RadiologyRequestId { get; set; }
        public string PatientId { get; set; }
        public string AccessionNumber { get; set; }
        public Dictionary<string, object> Segments { get; set; }
    }

    /// <summary>
    /// Kết quả gửi HL7
    /// </summary>
    public class SendHL7ResultDto
    {
        public bool Success { get; set; }
        public string MessageControlId { get; set; }
        public string AckCode { get; set; }
        public string ErrorMessage { get; set; }
        public DateTime SentAt { get; set; }
    }

    /// <summary>
    /// Tài liệu CDA
    /// </summary>
    public class CDADocumentDto
    {
        public Guid Id { get; set; }
        public string DocumentId { get; set; }
        public string DocumentType { get; set; }
        public Guid RadiologyReportId { get; set; }
        public string OrderCode { get; set; }
        public string PatientName { get; set; }
        public string CDAContent { get; set; }
        public string PdfPath { get; set; }
        public bool IsSigned { get; set; }
        public string SignatureType { get; set; }
        public DateTime? SignedAt { get; set; }
        public int Status { get; set; }
        public string StatusName { get; set; }
        public DateTime? SentAt { get; set; }
        public string AckStatus { get; set; }
    }

    /// <summary>
    /// Tạo tài liệu CDA
    /// </summary>
    public class CreateCDADocumentDto
    {
        public Guid RadiologyReportId { get; set; }
        public string DocumentType { get; set; }
        public string SignatureType { get; set; }
    }

    /// <summary>
    /// Gửi CDA document
    /// </summary>
    public class SendCDADocumentDto
    {
        public Guid DocumentId { get; set; }
        public Guid? ConfigId { get; set; }
    }

    /// <summary>
    /// Tìm kiếm HL7 messages
    /// </summary>
    public class SearchHL7MessageDto
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? MessageType { get; set; }
        public string? Direction { get; set; }
        public int? Status { get; set; }
        public string? PatientId { get; set; }
        public string? AccessionNumber { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }

    /// <summary>
    /// Kết quả tìm kiếm HL7 messages
    /// </summary>
    public class HL7MessageSearchResultDto
    {
        public List<HL7MessageDto> Items { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    #endregion

    #region IX. Online Help - Hướng dẫn sử dụng

    /// <summary>
    /// Danh mục hướng dẫn
    /// </summary>
    public class HelpCategoryDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string IconClass { get; set; }
        public Guid? ParentId { get; set; }
        public string ParentName { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public int ArticleCount { get; set; }
        public List<HelpCategoryDto> Children { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật danh mục
    /// </summary>
    public class SaveHelpCategoryDto
    {
        public Guid? Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string IconClass { get; set; }
        public Guid? ParentId { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Bài viết hướng dẫn
    /// </summary>
    public class HelpArticleDto
    {
        public Guid Id { get; set; }
        public Guid CategoryId { get; set; }
        public string CategoryName { get; set; }
        public string Title { get; set; }
        public string Summary { get; set; }
        public string Content { get; set; }
        public string VideoUrl { get; set; }
        public string ArticleType { get; set; } // Guide, FAQ, Troubleshooting, Video
        public int SortOrder { get; set; }
        public int ViewCount { get; set; }
        public bool IsPublished { get; set; }
        public string CreatedByUserName { get; set; }
        public DateTime? PublishedAt { get; set; }
        public string Tags { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật bài viết
    /// </summary>
    public class SaveHelpArticleDto
    {
        public Guid? Id { get; set; }
        public Guid CategoryId { get; set; }
        public string Title { get; set; }
        public string Summary { get; set; }
        public string Content { get; set; }
        public string VideoUrl { get; set; }
        public string ArticleType { get; set; }
        public int SortOrder { get; set; }
        public bool IsPublished { get; set; }
        public string Tags { get; set; }
    }

    /// <summary>
    /// Lỗi thường gặp
    /// </summary>
    public class TroubleshootingDto
    {
        public Guid Id { get; set; }
        public string ErrorCode { get; set; }
        public string ErrorTitle { get; set; }
        public string ErrorDescription { get; set; }
        public string Symptoms { get; set; }
        public string Causes { get; set; }
        public string Solution { get; set; }
        public string RelatedModule { get; set; }
        public int Severity { get; set; }
        public string SeverityName { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật troubleshooting
    /// </summary>
    public class SaveTroubleshootingDto
    {
        public Guid? Id { get; set; }
        public string ErrorCode { get; set; }
        public string ErrorTitle { get; set; }
        public string ErrorDescription { get; set; }
        public string Symptoms { get; set; }
        public string Causes { get; set; }
        public string Solution { get; set; }
        public string RelatedModule { get; set; }
        public int Severity { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Tìm kiếm hướng dẫn
    /// </summary>
    public class SearchHelpDto
    {
        public string? Keyword { get; set; }
        public Guid? CategoryId { get; set; }
        public string? ArticleType { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    /// <summary>
    /// Kết quả tìm kiếm hướng dẫn
    /// </summary>
    public class HelpSearchResultDto
    {
        public List<HelpArticleDto> Items { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    #endregion

    #region VII. CLS Screen - Màn hình cận lâm sàng

    /// <summary>
    /// Cấu hình màn hình CLS
    /// </summary>
    public class CLSScreenConfigDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string DefaultFilters { get; set; }
        public string ColumnSettings { get; set; }
        public int PageSize { get; set; }
        public bool AutoLoadTemplate { get; set; }
        public bool ShowPatientHistory { get; set; }
        public bool EnableShortcuts { get; set; }
        public string CustomSettings { get; set; }
    }

    /// <summary>
    /// Lưu cấu hình CLS
    /// </summary>
    public class SaveCLSScreenConfigDto
    {
        public string DefaultFilters { get; set; }
        public string ColumnSettings { get; set; }
        public int PageSize { get; set; }
        public bool AutoLoadTemplate { get; set; }
        public bool ShowPatientHistory { get; set; }
        public bool EnableShortcuts { get; set; }
        public string CustomSettings { get; set; }
    }

    /// <summary>
    /// Mẫu mô tả dịch vụ
    /// </summary>
    public class ServiceDescriptionTemplateDto
    {
        public Guid Id { get; set; }
        public Guid ServiceId { get; set; }
        public string ServiceName { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Conclusion { get; set; }
        public string Notes { get; set; }
        public bool IsDefault { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public string CreatedByUserName { get; set; }
    }

    /// <summary>
    /// Lưu mẫu mô tả
    /// </summary>
    public class SaveServiceDescriptionTemplateDto
    {
        public Guid? Id { get; set; }
        public Guid ServiceId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Conclusion { get; set; }
        public string Notes { get; set; }
        public bool IsDefault { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Lịch sử chẩn đoán ca chụp
    /// </summary>
    public class DiagnosisHistoryDto
    {
        public Guid Id { get; set; }
        public Guid RadiologyRequestId { get; set; }
        public string OrderCode { get; set; }
        public DateTime DiagnosisDate { get; set; }
        public string DoctorName { get; set; }
        public string Description { get; set; }
        public string Conclusion { get; set; }
        public string Notes { get; set; }
        public int Version { get; set; }
    }

    #endregion


    #region Request DTOs

    /// <summary>
    /// Request h?y phi�n h?i ch?n
    /// </summary>
    public class CancelConsultationRequest
    {
        public string Reason { get; set; }
    }

    /// <summary>
    /// Request nh?n ch? d?nh HL7
    /// </summary>
    public class ReceiveHL7OrderRequest
    {
        public string HL7Message { get; set; }
    }

    /// <summary>
    /// Request h?y k?t qu? HL7
    /// </summary>
    public class CancelHL7ResultRequest
    {
        public string Reason { get; set; }
    }

    #endregion
}
