namespace HIS.Core.Entities;

/// <summary>
/// Phiếu báo cáo phản ứng có hại của thuốc (ADR) — Thông tư 51/2017/TT-BYT.
/// Module #5 #55 #56 #57 #58 #59.
/// Không FK cứng vào Patient/Prescription để tránh cascade; chỉ lưu Guid tùy chọn.
/// </summary>
public class AdrReport : BaseEntity
{
    // ─── Thông tin bệnh nhân ────────────────────────────────────────────────

    /// <summary>Tên bệnh nhân (free-text, không bắt buộc link Patient).</summary>
    public string PatientName { get; set; } = string.Empty;

    /// <summary>Mã bệnh nhân (tuỳ chọn).</summary>
    public string? PatientCode { get; set; }

    /// <summary>Tuổi bệnh nhân (năm hoặc tháng — ghi tự do).</summary>
    public string PatientAge { get; set; } = string.Empty;

    /// <summary>Giới tính: 1=Nam, 2=Nữ, 0=Không rõ.</summary>
    public int Gender { get; set; }

    /// <summary>Cân nặng (kg), tuỳ chọn.</summary>
    public decimal? Weight { get; set; }

    // ─── Liên kết đơn thuốc (tuỳ chọn, không FK navigation) ────────────────

    /// <summary>Id đơn thuốc liên quan (tuỳ chọn, không FK cứng).</summary>
    public Guid? PrescriptionId { get; set; }

    // ─── Thông tin thuốc nghi ngờ ───────────────────────────────────────────

    /// <summary>Tên thuốc nghi ngờ gây phản ứng (bắt buộc).</summary>
    public string DrugName { get; set; } = string.Empty;

    /// <summary>Liều dùng (VD: "500mg x 3 lần/ngày").</summary>
    public string? DrugDose { get; set; }

    /// <summary>Đường dùng (VD: "uống", "tiêm tĩnh mạch").</summary>
    public string? DrugRoute { get; set; }

    // ─── Mô tả phản ứng ─────────────────────────────────────────────────────

    /// <summary>Mô tả chi tiết phản ứng có hại (bắt buộc).</summary>
    public string ReactionDescription { get; set; } = string.Empty;

    /// <summary>Ngày/giờ khởi phát phản ứng.</summary>
    public DateTime ReactionStartDate { get; set; }

    /// <summary>Mức độ nghiêm trọng: 1=Nhẹ, 2=Trung bình, 3=Nặng, 4=Nguy kịch/Tử vong.</summary>
    public int Severity { get; set; }

    /// <summary>Kết quả/hậu quả (hồi phục hoàn toàn, di chứng, tử vong,...).</summary>
    public string? Outcome { get; set; }

    // ─── Xử trí & đánh giá ──────────────────────────────────────────────────

    /// <summary>Xử trí đã thực hiện (ngừng thuốc, điều trị hỗ trợ,...).</summary>
    public string? ManagementTaken { get; set; }

    /// <summary>Đánh giá quan hệ nhân quả (chắc chắn, có khả năng, có thể, không chắc).</summary>
    public string? Causality { get; set; }

    // ─── Thông tin báo cáo ──────────────────────────────────────────────────

    /// <summary>Tên người báo cáo.</summary>
    public string? ReporterName { get; set; }

    /// <summary>Ngày báo cáo.</summary>
    public DateTime ReportDate { get; set; }

    /// <summary>Ghi chú bổ sung.</summary>
    public string? Notes { get; set; }
}
