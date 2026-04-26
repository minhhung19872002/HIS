namespace HIS.Core.Entities;

/// <summary>
/// Nhật ký hoạt động BHYT — log mọi giao dịch với cổng BHXH.
/// </summary>
public class InsuranceActivityLog : BaseEntity
{
    public string MaLk { get; set; } = string.Empty;
    public DateTime ActivityTime { get; set; }
    public string ActivityType { get; set; } = string.Empty; // SUBMIT, APPROVE, REJECT, RESUBMIT, ...
    public string? Description { get; set; }
    public string? RequestPayload { get; set; }
    public string? ResponsePayload { get; set; }
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
}

/// <summary>
/// Mapping ICD-10 với danh mục BHYT (Thông tư 35) — đánh dấu mã nào hợp lệ.
/// </summary>
public class IcdInsuranceMap : BaseEntity
{
    public string IcdCode { get; set; } = string.Empty;
    public string IcdName { get; set; } = string.Empty;
    public bool IsCovered { get; set; }
    public string? CoverageRule { get; set; } // Free text: điều kiện áp dụng
    public string? RestrictionLevel { get; set; } // 1-Toàn dân, 2-Cận nghèo, 3-Tre em, ...
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public bool IsActive { get; set; } = true;
}
