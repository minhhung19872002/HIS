namespace HIS.Core.Entities;

/// <summary>
/// Sổ biên lai / quyển hóa đơn khai báo — N1.13.
/// Mỗi sổ/quyển biên lai dùng để thu tiền phải được khai báo với cơ quan thuế
/// (số series, dải số bắt đầu/kết thúc, năm tài chính). Admin quản lý qua page này.
/// </summary>
public class ReceiptBook : BaseEntity
{
    public string BookCode { get; set; } = string.Empty;
    public string BookName { get; set; } = string.Empty;

    /// <summary>
    /// 1 = Biên lai thu tiền
    /// 2 = Biên lai hoàn trả
    /// 3 = HĐĐT sự nghiệp (BHYT + NSNN)
    /// 4 = HĐĐT dịch vụ
    /// 5 = Biên lai khác
    /// </summary>
    public int ReceiptType { get; set; }

    public string? Series { get; set; }        // Ký hiệu 1C22TAA...
    public string? TemplateCode { get; set; }  // Mẫu số

    public long StartNumber { get; set; }
    public long EndNumber { get; set; }
    /// <summary>Số kế tiếp sẽ cấp — tăng mỗi lần in phiếu mới</summary>
    public long CurrentNumber { get; set; }

    public int FiscalYear { get; set; }
    public DateTime IssueDate { get; set; } = DateTime.Today;
    public DateTime? RegisteredDate { get; set; }   // Ngày khai báo thuế
    public string? RegistrationNumber { get; set; } // Số văn bản TB

    /// <summary>
    /// 0 = Đã khai, chưa dùng
    /// 1 = Đang dùng
    /// 2 = Đã đóng (hết dải / cuối kỳ)
    /// 3 = Mất / hủy
    /// </summary>
    public int Status { get; set; } = 0;

    public DateTime? ClosedDate { get; set; }
    public string? ClosedReason { get; set; }

    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }

    public Guid? CashierId { get; set; } // Thủ quỹ được gán

    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
}
