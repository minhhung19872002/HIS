using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.Radiology
{

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


}
