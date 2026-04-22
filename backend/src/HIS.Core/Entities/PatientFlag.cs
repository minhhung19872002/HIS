namespace HIS.Core.Entities;

/// <summary>
/// Cảnh báo bệnh nhân (red flag) — Sprint 3 Item 2.3.
/// Banner nhắc nhở nhân viên y tế các lưu ý đặc biệt về BN:
/// dị ứng nặng, nợ viện phí, lạm dụng BHYT, BN VIP, nguy cơ tự tử...
/// </summary>
public class PatientFlag : BaseEntity
{
    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    /// <summary>
    /// 1 = Dị ứng nặng
    /// 2 = Nợ viện phí
    /// 3 = Lạm dụng BHYT
    /// 4 = VIP
    /// 5 = Nguy cơ tự tử/bạo hành
    /// 6 = Bệnh truyền nhiễm
    /// 7 = Cảnh báo khác
    /// </summary>
    public int FlagType { get; set; }

    /// <summary>ANT color: red / orange / gold / blue / green / purple / cyan</summary>
    public string Color { get; set; } = "red";

    public string Note { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
    public DateTime? ExpiresAt { get; set; }

    public Guid? CreatedByUserId { get; set; }
    public virtual User? CreatedByUser { get; set; }
}
