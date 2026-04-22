namespace HIS.Core.Entities;

/// <summary>
/// Viết tắt text expander — Sprint 3 Item 2.2.
/// Khi BS gõ code trong textarea rồi bấm F2, UI sẽ thay thế bằng Expansion.
/// </summary>
public class Abbreviation : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Expansion { get; set; } = string.Empty;

    /// <summary>
    /// 0 = chung, 1 = Prescription (ghi chú thuốc),
    /// 2 = Diagnosis (chẩn đoán/triệu chứng),
    /// 3 = Lab (kết quả XN),
    /// 4 = Radiology (mô tả/kết luận/đề nghị CĐHA),
    /// 5 = Appointment (ghi chú hẹn)
    /// </summary>
    public int Scope { get; set; }

    /// <summary>Tùy chọn: lọc theo kỹ thuật (CT, MRI, XQ, nội soi...) cho Radiology scope</summary>
    public string? ScopeKey { get; set; }

    /// <summary>Nếu có, chỉ user này dùng được. Null = mọi người dùng.</summary>
    public Guid? OwnerUserId { get; set; }
    public virtual User? OwnerUser { get; set; }

    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public int UsageCount { get; set; }
}
