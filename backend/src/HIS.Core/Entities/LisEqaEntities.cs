namespace HIS.Core.Entities;

/// <summary>
/// NangCap26 — LIS #29: danh mục xét nghiệm ngoại kiểm (EQA — External Quality Assessment).
/// Khác nội kiểm (IQC, xem <see cref="LabQCResult"/>): mẫu do đơn vị tổ chức ngoại kiểm gửi tới,
/// phòng XN chạy như mẫu thường rồi báo kết quả về đơn vị tổ chức.
/// </summary>
public class LabEqaTest : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    /// <summary>Dịch vụ XN tương ứng trong danh mục (để lấy đơn vị, khoảng tham chiếu).</summary>
    public Guid? ServiceId { get; set; }
    /// <summary>Đơn vị tổ chức ngoại kiểm (VD: Trung tâm Kiểm chuẩn TP.HCM).</summary>
    public string? ProviderName { get; set; }
    /// <summary>Chu kỳ: Monthly · Quarterly · Yearly</summary>
    public string? Cycle { get; set; }
    public string? Unit { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;

    public virtual Service? Service { get; set; }
}

/// <summary>
/// NangCap26 — LIS #29: một đợt (kỳ) ngoại kiểm — tiếp nhận bàn giao mẫu → chạy mẫu → báo kết quả.
/// Status: Received (đã nhận mẫu) · Running (đang chạy) · Reported (đã báo cáo) · Closed (đã có đánh giá).
/// </summary>
public class LabEqaBatch : BaseEntity
{
    public string BatchCode { get; set; } = string.Empty;
    public string? ProviderName { get; set; }
    /// <summary>Kỳ ngoại kiểm, VD "2026-Q3".</summary>
    public string? Period { get; set; }
    public DateTime ReceivedDate { get; set; }
    /// <summary>Hạn phải gửi kết quả về đơn vị tổ chức.</summary>
    public DateTime? DueDate { get; set; }
    /// <summary>Người bàn giao mẫu (bên gửi) và người nhận (KTV phòng XN).</summary>
    public string? HandoverBy { get; set; }
    public Guid? ReceivedBy { get; set; }
    public string Status { get; set; } = "Received";
    public string? Notes { get; set; }

    public virtual ICollection<LabEqaResult> Results { get; set; } = new List<LabEqaResult>();
}

/// <summary>
/// NangCap26 — LIS #29: kết quả chạy mẫu ngoại kiểm của 1 chỉ tiêu trong 1 đợt.
/// </summary>
public class LabEqaResult : BaseEntity
{
    public Guid BatchId { get; set; }
    public Guid EqaTestId { get; set; }
    /// <summary>Mã mẫu do đơn vị tổ chức đánh (VD S1, S2).</summary>
    public string? SampleCode { get; set; }
    public decimal? ResultValue { get; set; }
    public string? ResultText { get; set; }
    public DateTime? RunAt { get; set; }
    public Guid? RunBy { get; set; }
    /// <summary>Giá trị đích + Z-score do đơn vị tổ chức trả về sau khi tổng hợp.</summary>
    public decimal? TargetValue { get; set; }
    public decimal? ZScore { get; set; }
    /// <summary>Đánh giá: Satisfactory · Questionable · Unsatisfactory</summary>
    public string? Evaluation { get; set; }
    /// <summary>Hành động khắc phục khi không đạt.</summary>
    public string? CorrectiveAction { get; set; }
    public string? Notes { get; set; }

    public virtual LabEqaBatch? Batch { get; set; }
    public virtual LabEqaTest? EqaTest { get; set; }
}

/// <summary>
/// NangCap26 — LIS #15: đơn vị gửi mẫu (phòng khám vệ tinh, trạm y tế, đơn vị ngoài
/// gửi mẫu tới phòng xét nghiệm của CSYT).
/// </summary>
public class LabSendingUnit : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public string? ContactPerson { get; set; }
    public string? Email { get; set; }
    /// <summary>Mã cơ sở KCB (dùng khi liên thông/quyết toán).</summary>
    public string? FacilityCode { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
}
