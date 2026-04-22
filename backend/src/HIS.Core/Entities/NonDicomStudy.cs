namespace HIS.Core.Entities;

/// <summary>
/// Ca chụp NON-DICOM — Sprint 5 Item 2.17.
/// Dùng cho thiết bị analog hoặc webcam: nội soi, nhãn khoa, da liễu, RHM...
/// Ảnh/video lưu ngoài PACS, attach vào ServiceRequestDetail.
/// </summary>
public class NonDicomStudy : BaseEntity
{
    public Guid ServiceRequestDetailId { get; set; }
    public virtual ServiceRequestDetail? ServiceRequestDetail { get; set; }

    public Guid PatientId { get; set; }
    public virtual Patient? Patient { get; set; }

    /// <summary>Loại thiết bị: Endoscopy, Dermatology, Ophthalmology, Dental, Pathology, Other</summary>
    public string DeviceType { get; set; } = "Other";

    public string? DeviceName { get; set; }

    /// <summary>Phòng thực hiện</summary>
    public Guid? RoomId { get; set; }
    public virtual Room? Room { get; set; }

    public Guid? PerformedByUserId { get; set; }
    public virtual User? PerformedByUser { get; set; }

    public DateTime CapturedAt { get; set; }

    public int Status { get; set; }

    public string? Description { get; set; }
    public string? Conclusion { get; set; }
    public string? Findings { get; set; }

    public virtual ICollection<NonDicomImage> Images { get; set; } = new List<NonDicomImage>();
}

public class NonDicomImage : BaseEntity
{
    public Guid NonDicomStudyId { get; set; }
    public virtual NonDicomStudy? NonDicomStudy { get; set; }

    /// <summary>Loại: image | video | pdf | other</summary>
    public string MediaType { get; set; } = "image";

    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string? MimeType { get; set; }

    public int Width { get; set; }
    public int Height { get; set; }
    public double DurationSeconds { get; set; }

    /// <summary>Base64 thumbnail nhỏ (≤200×200) để render nhanh trong worklist</summary>
    public string? ThumbnailBase64 { get; set; }

    public int SortOrder { get; set; }
    public string? Annotation { get; set; }
    public bool IncludeInReport { get; set; } = true;
}
