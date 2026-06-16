namespace HIS.Application.DTOs.Adr;

/// <summary>
/// DTO đầy đủ cho tạo/sửa và hiển thị chi tiết phiếu ADR.
/// </summary>
public class AdrReportDto
{
    public Guid Id { get; set; }

    // Thông tin bệnh nhân
    public string PatientName { get; set; } = string.Empty;
    public string? PatientCode { get; set; }
    public string PatientAge { get; set; } = string.Empty;
    public int Gender { get; set; }
    public decimal? Weight { get; set; }

    // Liên kết đơn thuốc
    public Guid? PrescriptionId { get; set; }

    // Thuốc nghi ngờ
    public string DrugName { get; set; } = string.Empty;
    public string? DrugDose { get; set; }
    public string? DrugRoute { get; set; }

    // Phản ứng
    public string ReactionDescription { get; set; } = string.Empty;
    public DateTime ReactionStartDate { get; set; }

    /// <summary>1=Nhẹ, 2=Trung bình, 3=Nặng, 4=Nguy kịch/Tử vong.</summary>
    public int Severity { get; set; }
    public string? Outcome { get; set; }

    // Xử trí & đánh giá
    public string? ManagementTaken { get; set; }
    public string? Causality { get; set; }

    // Báo cáo
    public string? ReporterName { get; set; }
    public DateTime ReportDate { get; set; }
    public string? Notes { get; set; }

    // Read-only audit
    public DateTime? CreatedAt { get; set; }
}

/// <summary>
/// DTO tổng hợp báo cáo ADR theo severity trong khoảng thời gian.
/// </summary>
public class AdrReportSummaryDto
{
    public int TotalReports { get; set; }
    public int SeverityMild { get; set; }       // Severity = 1
    public int SeverityModerate { get; set; }   // Severity = 2
    public int SeveritySevere { get; set; }     // Severity = 3
    public int SeverityCritical { get; set; }   // Severity = 4
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}
