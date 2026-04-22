namespace HIS.Core.Entities;

/// <summary>
/// Vị trí chụp (Body Part) — N1.11.
/// </summary>
public class RadiologyBodyPart : BaseEntity
{
    public string BodyPartCode { get; set; } = string.Empty;
    public string BodyPartName { get; set; } = string.Empty;
    public string? EnglishName { get; set; }

    /// <summary>DICOM Body Part code (ANATOMY_CODE).</summary>
    public string? DicomCode { get; set; }

    /// <summary>Nhóm: HEAD / NECK / CHEST / ABDOMEN / PELVIS / SPINE / EXTREMITY...</summary>
    public string? Region { get; set; }

    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Giao thức chụp (Protocol) — N1.11.
/// </summary>
public class RadiologyProtocol : BaseEntity
{
    public string ProtocolCode { get; set; } = string.Empty;
    public string ProtocolName { get; set; } = string.Empty;

    public Guid? ModalityId { get; set; }
    public virtual RadiologyModality? Modality { get; set; }

    public Guid? BodyPartId { get; set; }
    public virtual RadiologyBodyPart? BodyPart { get; set; }

    public bool UseContrast { get; set; }
    public string? ContrastAgent { get; set; }
    public string? ContrastDose { get; set; }

    /// <summary>kVp (X-Quang/CT)</summary>
    public decimal? Kvp { get; set; }
    /// <summary>mAs (X-Quang/CT)</summary>
    public decimal? Mas { get; set; }
    /// <summary>Slice thickness mm (CT/MRI)</summary>
    public decimal? SliceThickness { get; set; }

    /// <summary>Tư thế BN — Standing / Supine / Prone / Decubitus / Lateral</summary>
    public string? Position { get; set; }

    public string? Instructions { get; set; }
    public string? Notes { get; set; }

    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Mẫu báo cáo BS đọc phim — N1.11.
/// </summary>
public class RadiologyReportTemplate : BaseEntity
{
    public string TemplateCode { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;

    public Guid? ModalityId { get; set; }
    public virtual RadiologyModality? Modality { get; set; }

    public Guid? BodyPartId { get; set; }
    public virtual RadiologyBodyPart? BodyPart { get; set; }

    /// <summary>Nội dung template — phần mô tả kỹ thuật</summary>
    public string? TechniqueText { get; set; }

    /// <summary>Nội dung template — phần findings (JSON of sections)</summary>
    public string? FindingsTemplate { get; set; }

    /// <summary>Nội dung template — phần kết luận mẫu</summary>
    public string? ImpressionTemplate { get; set; }

    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
