namespace HIS.Core.Entities;

/// <summary>
/// Đồng đọc (co-reader) / hội chẩn kết quả CĐHA.
/// Lưu Guid không dùng FK cứng để tránh cascade khi xóa report.
/// </summary>
public class RadiologyReportCoReader : BaseEntity
{
    /// <summary>Id của RadiologyReport liên quan (soft-ref, không FK).</summary>
    public Guid RadiologyReportId { get; set; }

    /// <summary>Id user BS đồng đọc.</summary>
    public Guid ReaderId { get; set; }

    /// <summary>Tên hiển thị tại thời điểm ghi (snapshot — không join lại sau).</summary>
    public string? ReaderName { get; set; }

    /// <summary>
    /// Vai trò trong ca đọc.
    /// Ví dụ: "CoReader" (đồng đọc), "Consultant" (hội chẩn), "Supervisor" (giám sát).
    /// </summary>
    public string? Role { get; set; }

    /// <summary>Ý kiến / nhận xét của BS đồng đọc (có thể null khi mới thêm, điền sau).</summary>
    public string? Opinion { get; set; }

    /// <summary>
    /// Kết quả copy từ report nguồn (copy-from workflow).
    /// Lưu RadiologyReportId của report nguồn dưới dạng string JSON hay plain Guid text.
    /// </summary>
    public Guid? CopiedFromReportId { get; set; }

    // CreatedAt / CreatedBy / IsDeleted kế thừa từ BaseEntity
}
