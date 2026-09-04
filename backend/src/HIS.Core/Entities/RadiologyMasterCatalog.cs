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

    // #218/T3 (migration 180): cụm mẫu kết quả CĐHA trước đây là hardcode — bốn đường đọc trả cùng
    // một danh sách dựng trong mã, lưu không ghi, xoá trả `true` mà không xoá. Nối vào bảng này thì
    // thiếu đúng ba cột mà hai đường đọc "lọc theo dịch vụ" và "lọc theo giới tính" cần.

    public Guid? ServiceId { get; set; }
    public Guid? ServiceTypeId { get; set; }

    /// <summary>'Male' · 'Female' · 'Both'. Một số mẫu chỉ dùng cho một giới.</summary>
    public string? Gender { get; set; }

    public bool IsDefault { get; set; }
}

/// <summary>
/// Khai báo dịch vụ CĐHA có thể kết hợp tường trình PTTT (Prompt 8 Đợt 2).
/// Mapping: dịch vụ CĐHA → danh sách mẫu tường trình PTTT áp dụng.
/// </summary>
public class RisSurgeryServiceMapping : BaseEntity
{
    /// <summary>Id dịch vụ CĐHA (FK → Service)</summary>
    public Guid RadiologyServiceId { get; set; }

    /// <summary>Tên dịch vụ CĐHA — cache để tra cứu nhanh</summary>
    public string RadiologyServiceName { get; set; } = string.Empty;

    /// <summary>Id template tường trình PTTT (FK → SurgeryNarrativeTemplate, optional)</summary>
    public Guid? SurgeryNarrativeTemplateId { get; set; }

    /// <summary>Tên mẫu tường trình — cache hiển thị</summary>
    public string? SurgeryNarrativeTemplateName { get; set; }

    /// <summary>Ghi chú / mô tả mapping</summary>
    public string? Notes { get; set; }

    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Gán mẫu kết quả theo ICD (G-34c) — ICD code → RadiologyReportTemplate.
/// Cho phép hệ thống tự gợi ý template phù hợp khi BS nhập chẩn đoán sơ bộ.
/// </summary>
public class RisIcdTemplateMapping : BaseEntity
{
    /// <summary>Mã ICD-10 (vd A00, J18.9)</summary>
    public string IcdCode { get; set; } = string.Empty;

    /// <summary>Tên bệnh — cache để hiển thị nhanh</summary>
    public string? IcdName { get; set; }

    /// <summary>Template kết quả được gán</summary>
    public Guid TemplateId { get; set; }
    public virtual RadiologyReportTemplate? Template { get; set; }

    /// <summary>Lọc thêm theo modality (optional)</summary>
    public Guid? ModalityId { get; set; }
    public virtual RadiologyModality? Modality { get; set; }

    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
