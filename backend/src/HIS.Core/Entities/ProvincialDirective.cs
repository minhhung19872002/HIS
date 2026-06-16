namespace HIS.Core.Entities;

/// <summary>
/// Bản ghi Chỉ đạo tuyến từ Sở Y tế / tuyến trên.
/// Dùng NVARCHAR(450) cho CreatedBy/UpdatedBy (tránh ValueConverter Guid/String).
/// </summary>
public class ProvincialDirective : BaseEntity
{
    /// <summary>Tiêu đề chỉ đạo</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Số văn bản (ví dụ: 1234/SYT-NVY)</summary>
    public string? DirectiveNo { get; set; }

    /// <summary>Nội dung chi tiết</summary>
    public string? Content { get; set; }

    /// <summary>Ngày ban hành</summary>
    public DateTime IssueDate { get; set; }

    /// <summary>Đơn vị/tuyến ban hành (ví dụ: Sở Y tế, Bộ Y tế)</summary>
    public string? FromLevel { get; set; }

    /// <summary>Đơn vị/tuyến nhận (ví dụ: Bệnh viện đa khoa)</summary>
    public string? ToLevel { get; set; }

    /// <summary>Trạng thái: 0=Mới, 1=Đang thực hiện, 2=Hoàn thành, 3=Hết hiệu lực</summary>
    public int Status { get; set; } = 0;

    /// <summary>Ghi chú thêm</summary>
    public string? Notes { get; set; }
}
