using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.Radiology
{

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


}
