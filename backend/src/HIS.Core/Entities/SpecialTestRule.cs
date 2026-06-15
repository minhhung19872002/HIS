namespace HIS.Core.Entities;

/// <summary>
/// Cấu hình XN/CLS đặc biệt: khung thời gian cho phép chỉ định lại.
/// WindowType = 0 → per-episode (1 lần/đợt điều trị — so theo MedicalRecordId).
/// WindowType = 1 → N-ngày (WindowDays ngày kể từ lần chỉ định gần nhất).
/// Nếu một XN không có bản ghi nào trong bảng này, fallback 24h (Rule LAB-31 cũ).
/// </summary>
public class SpecialTestRule : BaseEntity
{
    /// <summary>ServiceId của dịch vụ XN (FK -> Services.Id)</summary>
    public Guid TestId { get; set; }
    public virtual Service Test { get; set; } = null!;

    /// <summary>
    /// 0 = per-episode (1 lần/đợt — dùng MedicalRecordId để gom).
    /// 1 = N-ngày (dùng WindowDays).
    /// </summary>
    public int WindowType { get; set; }

    /// <summary>Số ngày cấm chỉ định lại (chỉ dùng khi WindowType = 1).</summary>
    public int? WindowDays { get; set; }

    /// <summary>Ghi chú / căn cứ lâm sàng (VD: "TT 52/2017 phụ lục IV").</summary>
    public string? Note { get; set; }

    /// <summary>Có hiệu lực hay không (false = bỏ qua rule này).</summary>
    public bool IsActive { get; set; } = true;
}
