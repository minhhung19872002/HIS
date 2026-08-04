namespace HIS.Application.DTOs.Reception;

/// <summary>
/// NangCap26 — Liên thông XIX.1 #1: kết quả kiểm tra lạm dụng thẻ BHYT
/// (KCB nhiều lần trong thời gian ngắn). Chỉ CẢNH BÁO, không tự chặn tiếp nhận.
/// </summary>
public class CardAbuseCheckResultDto
{
    public string InsuranceNumber { get; set; } = string.Empty;

    /// <summary>0-Bình thường · 1-Cảnh báo (vàng) · 2-Nghi ngờ lạm dụng (đỏ)</summary>
    public int AlertLevel { get; set; }
    public string AlertLevelName => AlertLevel switch { 2 => "Nghi ngờ lạm dụng", 1 => "Cảnh báo", _ => "Bình thường" };

    /// <summary>Câu cảnh báo hiển thị cho nhân viên tiếp đón.</summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>Số lượt KCB trong ngày hôm nay.</summary>
    public int VisitsToday { get; set; }
    /// <summary>Số lượt KCB trong 30 ngày gần nhất.</summary>
    public int VisitsInPeriod { get; set; }
    /// <summary>Số cơ sở y tế khác nhau đã KCB trong kỳ.</summary>
    public int DistinctFacilities { get; set; }

    /// <summary>Ngưỡng đang áp dụng (đọc từ SystemConfig) — hiển thị để nhân viên hiểu vì sao cảnh báo.</summary>
    public int ThresholdPerDay { get; set; }
    public int ThresholdPerPeriod { get; set; }
    public int ThresholdFacilities { get; set; }
    public int PeriodDays { get; set; }

    public List<CardAbuseVisitDto> Visits { get; set; } = new();
}

/// <summary>Một lượt KCB trong danh sách đối chiếu.</summary>
public class CardAbuseVisitDto
{
    public DateTime VisitDate { get; set; }
    public string? FacilityCode { get; set; }
    public string? FacilityName { get; set; }
    public string? RecordCode { get; set; }
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    /// <summary>Nguồn dữ liệu: NoiBo · CongBHXH · LienThongTinh</summary>
    public string Source { get; set; } = "NoiBo";
}
