namespace HIS.Core.Entities;

/// <summary>
/// Phiếu yêu cầu chẩn đoán hình ảnh
/// </summary>
public class RadiologyRequest : BaseEntity
{
    public string RequestCode { get; set; } = string.Empty; // Mã phiếu CĐHA
    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;
    public Guid? ExaminationId { get; set; }
    public virtual Examination? Examination { get; set; }
    public Guid? MedicalRecordId { get; set; } // Ma ho so benh an
    public virtual MedicalRecord? MedicalRecord { get; set; }

    public DateTime RequestDate { get; set; } // Ngày chỉ định

    // Dịch vụ CĐHA
    public Guid ServiceId { get; set; }
    public virtual Service Service { get; set; } = null!;

    // Bác sĩ chỉ định
    public Guid RequestingDoctorId { get; set; }
    public virtual User RequestingDoctor { get; set; } = null!;

    public int Priority { get; set; } // 1=Bình thường, 2=Khẩn, 3=Cấp cứu
    public int Status { get; set; } // 0=Pending, 1=Scheduled, 2=InProgress, 3=Completed, 4=Reported, 5=Approved, 6=Cancelled

    public string? ClinicalInfo { get; set; } // Thông tin lâm sàng
    public string? BodyPart { get; set; } // Vùng cơ thể
    public bool Contrast { get; set; } // Có dùng thuốc cản quang không

    public DateTime? ScheduledDate { get; set; } // Ngày hẹn thực hiện

    // BHYT
    public int PatientType { get; set; } // 1-BHYT, 2-Viện phí, 3-Dịch vụ
    public string? InsuranceNumber { get; set; }

    // Chi phí
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
    public bool IsPaid { get; set; }

    public string? Notes { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime? CancelledAt { get; set; }
    public Guid? CancelledBy { get; set; }

    // Navigation
    public virtual ICollection<RadiologyExam> Exams { get; set; } = new List<RadiologyExam>();
}

/// <summary>
/// Lượt thực hiện CĐHA (chụp/chiếu)
/// </summary>
public class RadiologyExam : BaseEntity
{
    public Guid RadiologyRequestId { get; set; }
    public virtual RadiologyRequest RadiologyRequest { get; set; } = null!;

    public string ExamCode { get; set; } = string.Empty; // Ma luot chup
    public string ExamName { get; set; } = string.Empty; // Ten loai chup
    public DateTime ExamDate { get; set; } // Ngày thực hiện

    // Máy móc và phòng
    public Guid ModalityId { get; set; }
    public virtual RadiologyModality Modality { get; set; } = null!;

    public Guid? RoomId { get; set; }
    public virtual Room? Room { get; set; }

    // Kỹ thuật viên
    public Guid? TechnicianId { get; set; }
    public virtual User? Technician { get; set; }

    public string AccessionNumber { get; set; } = string.Empty; // Số Accession (DICOM)
    public int Status { get; set; } // 0=Pending, 1=InProgress, 2=Completed, 3=Failed

    // Liều lượng (radiation dose)
    public decimal? Dose { get; set; }
    public string? DoseUnit { get; set; } // mGy, mSv, etc.

    public string? Notes { get; set; }
    public string? TechnicianNotes { get; set; }

    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }

    // Navigation
    public virtual ICollection<DicomStudy> DicomStudies { get; set; } = new List<DicomStudy>();
    public virtual RadiologyReport? Report { get; set; }
}

/// <summary>
/// Báo cáo kết quả CĐHA
/// </summary>
public class RadiologyReport : BaseEntity
{
    public Guid RadiologyExamId { get; set; }
    public virtual RadiologyExam RadiologyExam { get; set; } = null!;

    // Bác sĩ đọc phim
    public Guid RadiologistId { get; set; }
    public virtual User Radiologist { get; set; } = null!;

    public string? Findings { get; set; } // Mô tả hình ảnh
    public string? Impression { get; set; } // Kết luận
    public string? Recommendations { get; set; } // Đề nghị

    public DateTime? ReportDate { get; set; } // Ngày đọc
    public int Status { get; set; } // 0=Draft, 1=Completed, 2=Approved

    // Phê duyệt
    public Guid? ApprovedBy { get; set; }
    public virtual User? ApprovedByUser { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public string? Template { get; set; } // Template báo cáo đã sử dụng
    public string? KeyImages { get; set; } // JSON array các ảnh quan trọng
}

/// <summary>
/// Máy móc CĐHA (Modality)
/// </summary>
public class RadiologyModality : BaseEntity
{
    public string ModalityCode { get; set; } = string.Empty; // XR, CT, MR, US, etc.
    public string ModalityName { get; set; } = string.Empty; // X-quang, CT Scanner, MRI, etc.
    public int ModalityType { get; set; } // 1=XRay, 2=CT, 3=MRI, 4=Ultrasound, 5=Mammography, 6=PET, 7=Other

    public string? AETitle { get; set; } // DICOM Application Entity Title
    public string? IPAddress { get; set; }
    public int? Port { get; set; }

    public Guid? RoomId { get; set; }
    public virtual Room? Room { get; set; }

    public int Status { get; set; } // 0=Offline, 1=Online, 2=Maintenance, 3=Error
    public bool IsActive { get; set; } = true;

    public string? Manufacturer { get; set; } // Hãng sản xuất
    public string? ModelName { get; set; }
    public string? SerialNumber { get; set; }
    public DateTime? InstallationDate { get; set; }
    public DateTime? LastMaintenanceDate { get; set; }

    public string? Notes { get; set; }

    // Navigation
    public virtual ICollection<RadiologyExam> Exams { get; set; } = new List<RadiologyExam>();
}

/// <summary>
/// DICOM Study (nghiên cứu hình ảnh)
/// </summary>
public class DicomStudy : BaseEntity
{
    public Guid RadiologyExamId { get; set; }
    public virtual RadiologyExam RadiologyExam { get; set; } = null!;

    public string StudyInstanceUID { get; set; } = string.Empty; // DICOM Study Instance UID
    public DateTime? StudyDate { get; set; }
    public DateTime? StudyTime { get; set; }
    public string? StudyDescription { get; set; }

    public string? AccessionNumber { get; set; }
    public string? PatientID { get; set; }
    public string? PatientName { get; set; }
    public DateTime? PatientBirthDate { get; set; }
    public string? PatientSex { get; set; }

    public string? ReferringPhysicianName { get; set; }
    public string? PerformingPhysicianName { get; set; }

    public int NumberOfSeries { get; set; } // Số lượng Series
    public int NumberOfImages { get; set; } // Số lượng ảnh

    public string? StorageLocation { get; set; } // Đường dẫn PACS/Storage
    public long? StorageSize { get; set; } // Kích thước (bytes)

    public string? Modality { get; set; } // XR, CT, MR, US, etc.
    public string? BodyPartExamined { get; set; }

    public int Status { get; set; } // 0=Pending, 1=Available, 2=Archived, 3=Deleted
    public bool IsArchived { get; set; }
    public DateTime? ArchivedAt { get; set; }

    public string? DicomData { get; set; } // JSON metadata DICOM khác
}

/// <summary>
/// Mẫu chẩn đoán thường dùng
/// </summary>
public class RadiologyDiagnosisTemplate : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; } // Mô tả
    public string? Conclusion { get; set; } // Kết luận
    public string? Recommendation { get; set; } // Đề nghị

    public Guid? ServiceTypeId { get; set; } // Loại dịch vụ (X-quang, Siêu âm, CT,...)
    public Guid? ServiceId { get; set; } // Dịch vụ cụ thể
    public virtual Service? Service { get; set; }

    public string? Gender { get; set; } // M/F/null (all)
    public int? MinAge { get; set; }
    public int? MaxAge { get; set; }

    public int SortOrder { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;

    public Guid? CreatedByUserId { get; set; }
    public virtual User? CreatedByUser { get; set; }
}

/// <summary>
/// Bộ từ viết tắt
/// </summary>
public class RadiologyAbbreviation : BaseEntity
{
    public string Abbreviation { get; set; } = string.Empty; // Từ viết tắt (e.g. "bt")
    public string FullText { get; set; } = string.Empty; // Nội dung đầy đủ (e.g. "bình thường")
    public string? Category { get; set; } // Phân loại: Description, Conclusion, Recommendation

    public Guid? ServiceTypeId { get; set; } // Loại dịch vụ áp dụng
    public bool IsGlobal { get; set; } = true; // Áp dụng toàn hệ thống

    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public Guid? CreatedByUserId { get; set; }
    public virtual User? CreatedByUser { get; set; }
}

/// <summary>
/// Lịch phân công trực
/// </summary>
public class RadiologyDutySchedule : BaseEntity
{
    public Guid DepartmentId { get; set; }
    public virtual Department Department { get; set; } = null!;

    public Guid? RoomId { get; set; }
    public virtual Room? Room { get; set; }

    public DateTime DutyDate { get; set; } // Ngày trực
    public int ShiftType { get; set; } // 1=Sáng, 2=Chiều, 3=Đêm, 4=Ca 24h
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }

    // Nhân sự trực
    public Guid? DoctorId { get; set; } // Bác sĩ trực
    public virtual User? Doctor { get; set; }

    public Guid? TechnicianId { get; set; } // KTV trực
    public virtual User? Technician { get; set; }

    public Guid? AssistantTechnicianId { get; set; } // KTV phụ
    public virtual User? AssistantTechnician { get; set; }

    public string? Notes { get; set; }
    public int Status { get; set; } // 0=Draft, 1=Confirmed, 2=Cancelled

    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
}

/// <summary>
/// Tag ca chụp (nhóm bệnh thường gặp)
/// </summary>
public class RadiologyTag : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; } // Hex color code

    public Guid? ParentId { get; set; } // Tag cha (cho phân cấp)
    public virtual RadiologyTag? Parent { get; set; }

    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public virtual ICollection<RadiologyTag> Children { get; set; } = new List<RadiologyTag>();
    public virtual ICollection<RadiologyRequestTag> RequestTags { get; set; } = new List<RadiologyRequestTag>();
}

/// <summary>
/// Liên kết Tag với ca chụp
/// </summary>
public class RadiologyRequestTag : BaseEntity
{
    public Guid RadiologyRequestId { get; set; }
    public virtual RadiologyRequest RadiologyRequest { get; set; } = null!;

    public Guid TagId { get; set; }
    public virtual RadiologyTag Tag { get; set; } = null!;

    public string? Note { get; set; }
    public Guid? AddedByUserId { get; set; }
    public virtual User? AddedByUser { get; set; }
}

/// <summary>
/// Log tích hợp HIS-RIS
/// </summary>
public class RadiologyIntegrationLog : BaseEntity
{
    public string LogCode { get; set; } = string.Empty; // Mã log
    public string Direction { get; set; } = string.Empty; // HIS_TO_RIS, RIS_TO_HIS
    public string MessageType { get; set; } = string.Empty; // ORDER, RESULT, CANCEL, etc.

    public Guid? RadiologyRequestId { get; set; }
    public virtual RadiologyRequest? RadiologyRequest { get; set; }

    public string? PatientCode { get; set; }
    public string? MedicalRecordCode { get; set; }
    public string? RequestCode { get; set; }

    public DateTime SentAt { get; set; }
    public string? RequestPayload { get; set; } // JSON/HL7 content gửi đi
    public string? ResponsePayload { get; set; } // JSON/HL7 content nhận về

    public int Status { get; set; } // 0=Pending, 1=Success, 2=Failed, 3=Retrying
    public string? ErrorMessage { get; set; }
    public int RetryCount { get; set; }
    public DateTime? LastRetryAt { get; set; }

    public string? SourceSystem { get; set; } // Hệ thống gửi
    public string? TargetSystem { get; set; } // Hệ thống nhận
    public string? TransactionId { get; set; } // ID giao dịch từ hệ thống đích
}

/// <summary>
/// Phân phòng thực hiện
/// </summary>
public class RadiologyRoomAssignment : BaseEntity
{
    public Guid RadiologyRequestId { get; set; }
    public virtual RadiologyRequest RadiologyRequest { get; set; } = null!;

    public Guid RoomId { get; set; }
    public virtual Room Room { get; set; } = null!;

    public Guid? ModalityId { get; set; }
    public virtual RadiologyModality? Modality { get; set; }

    public int QueueNumber { get; set; } // Số thứ tự
    public int Status { get; set; } // 0=Waiting, 1=Called, 2=InProgress, 3=Completed, 4=Skipped

    public DateTime AssignedAt { get; set; }
    public Guid? AssignedByUserId { get; set; }
    public virtual User? AssignedByUser { get; set; }

    public DateTime? CalledAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public string? Notes { get; set; }
}

/// <summary>
/// Cấu hình ký số
/// </summary>
public class RadiologyDigitalSignatureConfig : BaseEntity
{
    public string SignatureType { get; set; } = string.Empty; // NONE, DIGITAL, EKYC, SIGNSERVER, SMARTCA
    public string Name { get; set; } = string.Empty;

    public string? ProviderUrl { get; set; } // URL của nhà cung cấp
    public string? ApiKey { get; set; }
    public string? ApiSecret { get; set; }
    public string? CertificatePath { get; set; }
    public string? CertificatePassword { get; set; }

    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;

    public string? ConfigJson { get; set; } // Cấu hình bổ sung dạng JSON
}

/// <summary>
/// Lịch sử ký số kết quả
/// </summary>
public class RadiologySignatureHistory : BaseEntity
{
    public Guid RadiologyReportId { get; set; }
    public virtual RadiologyReport RadiologyReport { get; set; } = null!;

    public Guid SignedByUserId { get; set; }
    public virtual User SignedByUser { get; set; } = null!;

    public string SignatureType { get; set; } = string.Empty; // DIGITAL, EKYC, SIGNSERVER, SMARTCA
    public DateTime SignedAt { get; set; }

    public string? CertificateSerial { get; set; }
    public string? CertificateSubject { get; set; }
    public string? CertificateIssuer { get; set; }
    public DateTime? CertificateValidFrom { get; set; }
    public DateTime? CertificateValidTo { get; set; }

    public string? SignatureValue { get; set; } // Base64 của chữ ký
    public string? SignedDocumentPath { get; set; } // Đường dẫn file đã ký

    public int Status { get; set; } // 0=Pending, 1=Signed, 2=Rejected, 3=Cancelled
    public string? RejectReason { get; set; }

    public string? TransactionId { get; set; } // ID từ CA provider
}

/// <summary>
/// Nhãn dán ca chụp (Label)
/// </summary>
public class RadiologyLabelConfig : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public int LabelWidth { get; set; } = 70; // mm
    public int LabelHeight { get; set; } = 40; // mm

    public string? TemplateHtml { get; set; } // HTML template cho nhãn
    public string? TemplateZpl { get; set; } // ZPL template cho máy in Zebra

    public bool IncludeQRCode { get; set; } = true;
    public bool IncludeBarcode { get; set; } = true;
    public string? BarcodeFormat { get; set; } // CODE128, CODE39, QR, etc.

    public Guid? ServiceTypeId { get; set; } // Áp dụng cho loại dịch vụ
    public Guid? DepartmentId { get; set; } // Áp dụng cho khoa

    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
}

#region IV. Quản lý kết nối 2 chiều với thiết bị Capture

/// <summary>
/// Cấu hình thiết bị Capture (Siêu âm, Nội soi, etc.)
/// </summary>
public class RadiologyCaptureDevice : BaseEntity
{
    public string DeviceCode { get; set; } = string.Empty;
    public string DeviceName { get; set; } = string.Empty;
    public string DeviceType { get; set; } = string.Empty; // Ultrasound, Endoscopy, etc.
    public string? Manufacturer { get; set; }
    public string? Model { get; set; }
    public string? SerialNumber { get; set; }

    public Guid? RoomId { get; set; }
    public virtual Room? Room { get; set; }

    // Kết nối
    public string ConnectionType { get; set; } = "TCP"; // TCP, Serial, USB, File
    public string? IpAddress { get; set; }
    public int? Port { get; set; }
    public string? ComPort { get; set; }
    public int? BaudRate { get; set; }
    public string? FolderPath { get; set; } // Cho loại File-based

    // DICOM settings
    public string? AETitle { get; set; }
    public bool SupportsDicom { get; set; }
    public bool SupportsWorklist { get; set; }
    public bool SupportsMPPS { get; set; }

    // Capture settings
    public int MaxExamsPerDay { get; set; } = 100; // Giới hạn ca chụp/ngày
    public bool AutoSelectThumbnail { get; set; } = true;
    public bool SendOnlyThumbnail { get; set; } = false;
    public string? DefaultFrameFormat { get; set; } // Frame format
    public string? VideoFormat { get; set; } = "MP4";

    public int Status { get; set; } // 0=Offline, 1=Online, 2=Busy, 3=Error
    public bool IsActive { get; set; } = true;
    public DateTime? LastCommunication { get; set; }

    public string? ConfigJson { get; set; } // Cấu hình mở rộng
}

/// <summary>
/// Workstation cấu hình
/// </summary>
public class RadiologyWorkstation : BaseEntity
{
    public string WorkstationCode { get; set; } = string.Empty;
    public string WorkstationName { get; set; } = string.Empty;
    public string? ComputerName { get; set; }
    public string? IpAddress { get; set; }

    public Guid? RoomId { get; set; }
    public virtual Room? Room { get; set; }

    public Guid? DefaultDeviceId { get; set; }
    public virtual RadiologyCaptureDevice? DefaultDevice { get; set; }

    // Hotkeys config
    public string? HotkeysConfig { get; set; } // JSON config cho phím tắt

    // Display settings
    public int? BrightnessLevel { get; set; }
    public int? ContrastLevel { get; set; }

    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Session capture (phiên làm việc trên máy capture)
/// </summary>
public class RadiologyCaptureSession : BaseEntity
{
    public Guid DeviceId { get; set; }
    public virtual RadiologyCaptureDevice Device { get; set; } = null!;

    public Guid? WorkstationId { get; set; }
    public virtual RadiologyWorkstation? Workstation { get; set; }

    public Guid RadiologyRequestId { get; set; }
    public virtual RadiologyRequest RadiologyRequest { get; set; } = null!;

    public Guid? OperatorId { get; set; } // KTV thực hiện
    public virtual User? Operator { get; set; }

    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }

    public int Status { get; set; } // 0=Active, 1=Paused, 2=Completed, 3=Cancelled
    public int CapturedImageCount { get; set; }
    public int CapturedVideoCount { get; set; }

    public string? SessionData { get; set; } // JSON data phiên làm việc
}

/// <summary>
/// Hình ảnh/Video capture
/// </summary>
public class RadiologyCapturedMedia : BaseEntity
{
    public Guid SessionId { get; set; }
    public virtual RadiologyCaptureSession Session { get; set; } = null!;

    public string MediaType { get; set; } = "Image"; // Image, Video
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string? ThumbnailPath { get; set; }
    public long FileSize { get; set; }
    public string? MimeType { get; set; }

    public int SequenceNumber { get; set; }
    public bool IsThumbnail { get; set; } // Ảnh tiêu biểu
    public bool IsSentToPacs { get; set; }
    public DateTime? SentToPacsAt { get; set; }

    public string? DicomStudyUID { get; set; }
    public string? DicomSeriesUID { get; set; }
    public string? DicomInstanceUID { get; set; }

    public string? Annotations { get; set; } // JSON annotations on image
    public string? Notes { get; set; }
}

#endregion

#region V. Chức năng Hội chẩn ca chụp

/// <summary>
/// Phiên hội chẩn
/// </summary>
public class RadiologyConsultationSession : BaseEntity
{
    public string SessionCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public DateTime ScheduledStartTime { get; set; }
    public DateTime ScheduledEndTime { get; set; }
    public DateTime? ActualStartTime { get; set; }
    public DateTime? ActualEndTime { get; set; }

    // Người tổ chức
    public Guid OrganizerId { get; set; }
    public virtual User Organizer { get; set; } = null!;

    // Trưởng nhóm
    public Guid? LeaderId { get; set; }
    public virtual User? Leader { get; set; }

    // Thư ký
    public Guid? SecretaryId { get; set; }
    public virtual User? Secretary { get; set; }

    public int Status { get; set; } // 0=Draft, 1=Scheduled, 2=InProgress, 3=Completed, 4=Cancelled
    public string? MeetingUrl { get; set; } // URL phòng họp online
    public string? QRCodeData { get; set; } // QR code mời tham gia

    public string? RecordingPath { get; set; } // Đường dẫn file ghi âm/ghi hình
    public bool IsRecording { get; set; }

    public string? Notes { get; set; }

    // Navigation
    public virtual ICollection<RadiologyConsultationCase> Cases { get; set; } = new List<RadiologyConsultationCase>();
    public virtual ICollection<RadiologyConsultationParticipant> Participants { get; set; } = new List<RadiologyConsultationParticipant>();
    public virtual ICollection<RadiologyConsultationAttachment> Attachments { get; set; } = new List<RadiologyConsultationAttachment>();
    public virtual RadiologyConsultationMinutes? Minutes { get; set; }
}

/// <summary>
/// Ca chụp trong phiên hội chẩn
/// </summary>
public class RadiologyConsultationCase : BaseEntity
{
    public Guid SessionId { get; set; }
    public virtual RadiologyConsultationSession Session { get; set; } = null!;

    public Guid RadiologyRequestId { get; set; }
    public virtual RadiologyRequest RadiologyRequest { get; set; } = null!;

    public int OrderNumber { get; set; } // Thứ tự hội chẩn
    public string? Reason { get; set; } // Lý do đưa vào hội chẩn
    public string? PreliminaryDiagnosis { get; set; } // Chẩn đoán sơ bộ

    public int Status { get; set; } // 0=Pending, 1=Discussed, 2=Concluded
    public string? Conclusion { get; set; } // Kết luận hội chẩn
    public string? Recommendation { get; set; } // Đề xuất

    public string? Notes { get; set; }
}

/// <summary>
/// Người tham gia hội chẩn
/// </summary>
public class RadiologyConsultationParticipant : BaseEntity
{
    public Guid SessionId { get; set; }
    public virtual RadiologyConsultationSession Session { get; set; } = null!;

    public Guid UserId { get; set; }
    public virtual User User { get; set; } = null!;

    public string Role { get; set; } = "Participant"; // Leader, Secretary, Participant, Observer
    public int Status { get; set; } // 0=Invited, 1=Accepted, 2=Rejected, 3=Joined, 4=Left

    public DateTime? InvitedAt { get; set; }
    public DateTime? JoinedAt { get; set; }
    public DateTime? LeftAt { get; set; }

    public bool IsAudioEnabled { get; set; }
    public bool IsVideoEnabled { get; set; }
    public bool IsScreenSharing { get; set; }

    public string? Notes { get; set; }
}

/// <summary>
/// File đính kèm phiên hội chẩn
/// </summary>
public class RadiologyConsultationAttachment : BaseEntity
{
    public Guid SessionId { get; set; }
    public virtual RadiologyConsultationSession Session { get; set; } = null!;

    public Guid? CaseId { get; set; } // Gắn với ca cụ thể (optional)
    public virtual RadiologyConsultationCase? Case { get; set; }

    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty; // PDF, Image, DICOM, etc.
    public long FileSize { get; set; }

    public Guid UploadedByUserId { get; set; }
    public virtual User UploadedByUser { get; set; } = null!;
    public DateTime UploadedAt { get; set; }

    public string? Description { get; set; }
}

/// <summary>
/// Thảo luận trong hội chẩn
/// </summary>
public class RadiologyConsultationDiscussion : BaseEntity
{
    public Guid SessionId { get; set; }
    public virtual RadiologyConsultationSession Session { get; set; } = null!;

    public Guid? CaseId { get; set; }
    public virtual RadiologyConsultationCase? Case { get; set; }

    public Guid ParticipantId { get; set; }
    public virtual User Participant { get; set; } = null!;

    public string MessageType { get; set; } = "Text"; // Text, Image, Annotation
    public string Content { get; set; } = string.Empty;
    public string? AttachmentPath { get; set; }

    public DateTime PostedAt { get; set; }
    public bool IsDeleted { get; set; }
    public Guid? DeletedByUserId { get; set; }
}

/// <summary>
/// Ghi chú ảnh DICOM trong hội chẩn
/// </summary>
public class RadiologyConsultationImageNote : BaseEntity
{
    public Guid SessionId { get; set; }
    public virtual RadiologyConsultationSession Session { get; set; } = null!;

    public string StudyInstanceUID { get; set; } = string.Empty;
    public string? SeriesInstanceUID { get; set; }
    public string? SOPInstanceUID { get; set; }

    public Guid CreatedByUserId { get; set; }
    public virtual User CreatedByUser { get; set; } = null!;

    public string AnnotationType { get; set; } = string.Empty; // Arrow, Circle, Rectangle, Text, Measurement
    public string AnnotationData { get; set; } = string.Empty; // JSON data
    public string? Notes { get; set; }

    public bool IsShared { get; set; } = true; // Có chia sẻ với người tham gia khác
}

/// <summary>
/// Biên bản hội chẩn
/// </summary>
public class RadiologyConsultationMinutes : BaseEntity
{
    public Guid SessionId { get; set; }
    public virtual RadiologyConsultationSession Session { get; set; } = null!;

    public string MinutesCode { get; set; } = string.Empty;
    public string? TemplateUsed { get; set; } // Mẫu biên bản

    public string Content { get; set; } = string.Empty; // Nội dung biên bản
    public string? Conclusions { get; set; } // Các kết luận
    public string? Recommendations { get; set; } // Các đề xuất

    public Guid? CreatedByUserId { get; set; }
    public virtual User? CreatedByUser { get; set; }

    public int Status { get; set; } // 0=Draft, 1=Finalized, 2=Approved
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public string? PdfPath { get; set; } // Đường dẫn file PDF biên bản
}

#endregion

#region X. Tích hợp HL7 CDA

/// <summary>
/// Cấu hình HL7 CDA
/// </summary>
public class RadiologyHL7CDAConfig : BaseEntity
{
    public string ConfigName { get; set; } = string.Empty;
    public string HL7Version { get; set; } = "2.5"; // 2.3, 2.5, 2.5.1, etc.
    public string CDAVersion { get; set; } = "R2"; // R1, R2

    public string SendingApplication { get; set; } = string.Empty;
    public string SendingFacility { get; set; } = string.Empty;
    public string ReceivingApplication { get; set; } = string.Empty;
    public string ReceivingFacility { get; set; } = string.Empty;

    // Connection
    public string ConnectionType { get; set; } = "MLLP"; // MLLP, HTTP, File
    public string? ServerAddress { get; set; }
    public int? ServerPort { get; set; }
    public string? FilePath { get; set; }

    public bool IsActive { get; set; } = true;
    public string? ConfigJson { get; set; } // Additional config
}

/// <summary>
/// Message HL7 gửi/nhận
/// </summary>
public class RadiologyHL7Message : BaseEntity
{
    public string MessageControlId { get; set; } = string.Empty;
    public string MessageType { get; set; } = string.Empty; // ORM, ORU, ADT, etc.
    public string TriggerEvent { get; set; } = string.Empty; // O01, R01, A01, etc.
    public string Direction { get; set; } = string.Empty; // Inbound, Outbound

    public Guid? RadiologyRequestId { get; set; }
    public virtual RadiologyRequest? RadiologyRequest { get; set; }

    public string? PatientId { get; set; }
    public string? AccessionNumber { get; set; }

    public string RawMessage { get; set; } = string.Empty; // HL7 message content
    public string? ParsedData { get; set; } // JSON parsed data

    public DateTime MessageDateTime { get; set; }
    public int Status { get; set; } // 0=Received, 1=Processing, 2=Processed, 3=Error, 4=Acknowledged
    public string? AckCode { get; set; } // AA, AE, AR
    public string? ErrorMessage { get; set; }

    public int RetryCount { get; set; }
    public DateTime? LastRetryAt { get; set; }
}

/// <summary>
/// Tài liệu CDA
/// </summary>
public class RadiologyCDADocument : BaseEntity
{
    public string DocumentId { get; set; } = string.Empty;
    public string DocumentType { get; set; } = string.Empty; // DiagnosticImagingReport

    public Guid RadiologyReportId { get; set; }
    public virtual RadiologyReport RadiologyReport { get; set; } = null!;

    public string CDAContent { get; set; } = string.Empty; // XML content
    public string? PdfPath { get; set; } // Rendered PDF

    public bool IsSigned { get; set; }
    public string? SignatureType { get; set; } // None, Digital, Electronic
    public DateTime? SignedAt { get; set; }

    public int Status { get; set; } // 0=Draft, 1=Final, 2=Sent, 3=Acknowledged
    public DateTime? SentAt { get; set; }
    public string? AckStatus { get; set; }

    public string? Metadata { get; set; } // JSON metadata
}

#endregion

#region IX. Hướng dẫn sử dụng Online

/// <summary>
/// Danh mục hướng dẫn sử dụng
/// </summary>
public class RadiologyHelpCategory : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconClass { get; set; }

    public Guid? ParentId { get; set; }
    public virtual RadiologyHelpCategory? Parent { get; set; }

    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public virtual ICollection<RadiologyHelpCategory> Children { get; set; } = new List<RadiologyHelpCategory>();
    public virtual ICollection<RadiologyHelpArticle> Articles { get; set; } = new List<RadiologyHelpArticle>();
}

/// <summary>
/// Bài viết hướng dẫn
/// </summary>
public class RadiologyHelpArticle : BaseEntity
{
    public Guid CategoryId { get; set; }
    public virtual RadiologyHelpCategory Category { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string Content { get; set; } = string.Empty; // HTML content
    public string? VideoUrl { get; set; }

    public string ArticleType { get; set; } = "Guide"; // Guide, FAQ, Troubleshooting, Video

    public int SortOrder { get; set; }
    public int ViewCount { get; set; }
    public bool IsPublished { get; set; } = true;

    public Guid? CreatedByUserId { get; set; }
    public virtual User? CreatedByUser { get; set; }
    public DateTime? PublishedAt { get; set; }

    public string? Tags { get; set; } // Comma-separated tags
}

/// <summary>
/// Lỗi thường gặp và cách khắc phục
/// </summary>
public class RadiologyTroubleshooting : BaseEntity
{
    public string ErrorCode { get; set; } = string.Empty;
    public string ErrorTitle { get; set; } = string.Empty;
    public string? ErrorDescription { get; set; }
    public string? Symptoms { get; set; } // Triệu chứng
    public string? Causes { get; set; } // Nguyên nhân
    public string Solution { get; set; } = string.Empty; // Cách khắc phục

    public string? RelatedModule { get; set; } // RIS, PACS, Capture, etc.
    public int Severity { get; set; } // 1=Low, 2=Medium, 3=High, 4=Critical

    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

#endregion

#region VII. Màn hình Cận lâm sàng bổ sung

/// <summary>
/// Cấu hình màn hình CLS
/// </summary>
public class RadiologyCLSScreenConfig : BaseEntity
{
    public Guid UserId { get; set; }
    public virtual User User { get; set; } = null!;

    public string? DefaultFilters { get; set; } // JSON default filters
    public string? ColumnSettings { get; set; } // JSON column visibility/order
    public int PageSize { get; set; } = 20;

    public bool AutoLoadTemplate { get; set; } = true;
    public bool ShowPatientHistory { get; set; } = true;
    public bool EnableShortcuts { get; set; } = true;

    public string? CustomSettings { get; set; } // JSON other settings
}

/// <summary>
/// Mẫu mô tả dịch vụ
/// </summary>
public class RadiologyServiceDescriptionTemplate : BaseEntity
{
    public Guid ServiceId { get; set; }
    public virtual Service Service { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; } // Mô tả mẫu
    public string? Conclusion { get; set; } // Kết luận mẫu
    public string? Notes { get; set; } // Ghi chú mẫu

    public bool IsDefault { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public Guid? CreatedByUserId { get; set; }
    public virtual User? CreatedByUser { get; set; }
}

#endregion
