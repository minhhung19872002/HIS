using System.ComponentModel.DataAnnotations;

namespace HIS.Application.DTOs.Pharmacy;

/// <summary>#214 [SAFE-3] Cấu hình ngưỡng liều thuốc.</summary>
public class MedicineDoseRangeDto
{
    public Guid Id { get; set; }
    public Guid MedicineId { get; set; }
    public string? MedicineCode { get; set; }
    public string? MedicineName { get; set; }
    public string? RouteCode { get; set; }
    public int AgeGroup { get; set; }
    public string AgeGroupName => AgeGroup switch
    {
        1 => "Trẻ em (<12)",
        2 => "Người lớn",
        3 => "Người cao tuổi (≥65)",
        _ => "Mọi lứa tuổi"
    };
    public bool IsRenalAdjusted { get; set; }
    public decimal? MaxSingleDose { get; set; }
    public decimal? MaxDailyDose { get; set; }
    /// <summary>Liều tối thiểu/tối đa mỗi ngày theo cân nặng (Unit/kg/ngày).</summary>
    public decimal? MinDosePerKg { get; set; }
    public decimal? MaxDosePerKg { get; set; }
    public string? Unit { get; set; }
    public decimal SevereMultiplier { get; set; }
    public string? Note { get; set; }
    public bool IsActive { get; set; }
}

public class CreateMedicineDoseRangeDto
{
    [Required]
    public Guid MedicineId { get; set; }
    public string? RouteCode { get; set; }
    [Range(0, 3)]
    public int AgeGroup { get; set; }
    public bool IsRenalAdjusted { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Liều tối đa không được âm")]
    public decimal? MaxSingleDose { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Liều tối đa không được âm")]
    public decimal? MaxDailyDose { get; set; }
    /// <summary>Liều tối thiểu mỗi ngày theo cân nặng (Unit/kg/ngày).</summary>
    [Range(0, double.MaxValue, ErrorMessage = "Liều theo cân nặng không được âm")]
    public decimal? MinDosePerKg { get; set; }
    /// <summary>Liều tối đa mỗi ngày theo cân nặng (Unit/kg/ngày).</summary>
    [Range(0, double.MaxValue, ErrorMessage = "Liều theo cân nặng không được âm")]
    public decimal? MaxDosePerKg { get; set; }
    public string? Unit { get; set; }
    [Range(1.0, 10.0, ErrorMessage = "Hệ số quá liều nặng phải ≥ 1")]
    public decimal SevereMultiplier { get; set; } = 1.5m;
    public string? Note { get; set; }
    public bool IsActive { get; set; } = true;
}

// ===== Kiểm tra liều lúc kê đơn =====

public class DoseCheckItemDto
{
    public Guid MedicineId { get; set; }
    /// <summary>Liều 1 lần (theo Unit của range)</summary>
    public decimal? SingleDose { get; set; }
    /// <summary>Liều/ngày; nếu null BE tự tính từ Morning+Noon+Evening+Night</summary>
    public decimal? DailyDose { get; set; }
    public decimal? MorningDose { get; set; }
    public decimal? NoonDose { get; set; }
    public decimal? EveningDose { get; set; }
    public decimal? NightDose { get; set; }
    public string? RouteCode { get; set; }
}

public class DoseCheckRequestDto
{
    public List<DoseCheckItemDto> Items { get; set; } = new();
    /// <summary>Tuổi BN (năm) để chọn nhóm tuổi phù hợp; null = mọi lứa tuổi</summary>
    public int? PatientAge { get; set; }
    /// <summary>BN suy thận → ưu tiên range renal-adjusted nếu có</summary>
    public bool IsRenalImpaired { get; set; }
    /// <summary>BN — để lấy cân nặng mới nhất (sinh hiệu ngoại trú/nội trú) và tuổi khi FE không gửi.</summary>
    public Guid? PatientId { get; set; }
    /// <summary>Nội trú chỉ biết lượt nhập viện → BE tự suy ra BN.</summary>
    public Guid? AdmissionId { get; set; }
    /// <summary>Cân nặng (kg) FE đang có; null → lấy cân nặng mới nhất đã ghi của BN.</summary>
    public decimal? WeightKg { get; set; }
}

/// <summary>Cảnh báo liều — advisory (Severity: 1-nhắc, 2-vượt ngưỡng, 3-quá liều nặng).</summary>
public class DoseWarningDto
{
    public Guid MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public string WarningType { get; set; } = "DoseRange";
    public int Severity { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
}
