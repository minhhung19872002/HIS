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
