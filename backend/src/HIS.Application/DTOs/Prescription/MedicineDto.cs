namespace HIS.Application.DTOs.Prescription;

/// <summary>
/// DTO tìm kiếm thuốc
/// </summary>
public class MedicineSearchDto
{
    public string? Keyword { get; set; } // Tìm theo mã, tên, hoạt chất
    public string? MedicineCode { get; set; }
    public string? MedicineName { get; set; }
    public string? ActiveIngredient { get; set; }
    public int? MedicineType { get; set; } // 1-Tân dược, 2-YHCT, 3-Vắc xin, 4-Sinh phẩm
    public string? MedicineGroupCode { get; set; }
    public bool? IsInsuranceCovered { get; set; }
    public bool? IsAntibiotic { get; set; }
    public bool? IsNarcotic { get; set; }
    public bool? IsPsychotropic { get; set; }
    public bool? IsActive { get; set; } = true;
    public Guid? WarehouseId { get; set; } // Lọc thuốc có tồn kho
    public bool OnlyInStock { get; set; } = false; // Chỉ lấy thuốc còn tồn
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

/// <summary>
/// DTO thông tin thuốc cơ bản
/// </summary>
public class MedicineDto
{
    public Guid Id { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; }
    public string? Concentration { get; set; }
    public string? Unit { get; set; }
    public string? PackageUnit { get; set; }
    public decimal ConversionRate { get; set; }
    public string? RouteCode { get; set; }
    public string? RouteName { get; set; }
    public string? Manufacturer { get; set; }
    public string? ManufacturerCountry { get; set; }

    // Giá
    public decimal UnitPrice { get; set; }
    public decimal InsurancePrice { get; set; }
    public decimal ServicePrice { get; set; }

    // BHYT
    public bool IsInsuranceCovered { get; set; }
    public int InsurancePaymentRate { get; set; }

    // Phân loại
    public int MedicineType { get; set; }
    public string? MedicineTypeName => MedicineType switch
    {
        1 => "Tân dược",
        2 => "YHCT",
        3 => "Vắc xin",
        4 => "Sinh phẩm",
        _ => ""
    };
    public string? MedicineGroupCode { get; set; }
    public bool IsNarcotic { get; set; }
    public bool IsPsychotropic { get; set; }
    public bool IsAntibiotic { get; set; }
    public bool IsControlled { get; set; }

    // Hướng dẫn mặc định
    public string? DefaultDosage { get; set; }
    public string? DefaultUsage { get; set; }

    // Cảnh báo
    public string? Contraindications { get; set; }
    public string? SideEffects { get; set; }
    public string? DrugInteractions { get; set; }
    public string? Warning { get; set; }

    public bool IsActive { get; set; }

    // Thông tin tồn kho (nếu có)
    public decimal? AvailableQuantity { get; set; }
    public List<MedicineStockDto>? StockInfo { get; set; }
}

/// <summary>
/// DTO thông tin tồn kho thuốc theo lô
/// </summary>
public class MedicineStockDto
{
    public Guid InventoryItemId { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;

    // Kho
    public Guid WarehouseId { get; set; }
    public string WarehouseCode { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public int WarehouseType { get; set; }
    public string? WarehouseTypeName => WarehouseType switch
    {
        1 => "Kho thuốc",
        2 => "Kho vật tư",
        3 => "Kho hóa chất",
        4 => "Nhà thuốc",
        5 => "Tủ trực",
        _ => ""
    };

    // Lô thuốc
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public DateTime? ManufactureDate { get; set; }
    public int? DaysToExpiry => ExpiryDate.HasValue ? (int)(ExpiryDate.Value - DateTime.Now).TotalDays : null;
    public bool IsNearExpiry => DaysToExpiry.HasValue && DaysToExpiry.Value <= 90 && DaysToExpiry.Value > 0;
    public bool IsExpired => DaysToExpiry.HasValue && DaysToExpiry.Value <= 0;

    // Số lượng
    public decimal Quantity { get; set; }
    public decimal ReservedQuantity { get; set; }
    public decimal AvailableQuantity { get; set; }
    public string? Unit { get; set; }

    // Giá
    public decimal ImportPrice { get; set; }
    public decimal UnitPrice { get; set; }

    // Trạng thái
    public bool IsLocked { get; set; }
    public string? LockReason { get; set; }

    // Ưu tiên xuất (FIFO)
    public int Priority { get; set; } // Tính toán dựa trên ngày hết hạn
}

/// <summary>
/// DTO tương tác thuốc
/// </summary>
public class DrugInteractionDto
{
    public Guid Medicine1Id { get; set; }
    public string Medicine1Code { get; set; } = string.Empty;
    public string Medicine1Name { get; set; } = string.Empty;

    public Guid Medicine2Id { get; set; }
    public string Medicine2Code { get; set; } = string.Empty;
    public string Medicine2Name { get; set; } = string.Empty;

    public int Severity { get; set; } // 1-Nhẹ, 2-Trung bình, 3-Nghiêm trọng
    public string? SeverityName => Severity switch
    {
        1 => "Nhẹ",
        2 => "Trung bình",
        3 => "Nghiêm trọng",
        _ => ""
    };
    public string? SeverityColor => Severity switch
    {
        1 => "warning",
        2 => "orange",
        3 => "error",
        _ => ""
    };

    public string Description { get; set; } = string.Empty;
    public string? ClinicalEffects { get; set; }
    public string? Mechanism { get; set; }
    public string? Management { get; set; } // Khuyến nghị xử lý
    public bool RequireAction { get; set; } // Cần can thiệp
}

/// <summary>
/// DTO kiểm tra tương tác thuốc
/// </summary>
public class CheckDrugInteractionDto
{
    public List<Guid> MedicineIds { get; set; } = new();
}

/// <summary>
/// DTO kết quả kiểm tra tương tác thuốc
/// </summary>
public class DrugInteractionResultDto
{
    public bool HasInteractions { get; set; }
    public int TotalInteractions { get; set; }
    public int SevereInteractions { get; set; }
    public int ModerateInteractions { get; set; }
    public int MildInteractions { get; set; }
    public List<DrugInteractionDto> Interactions { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
}

/// <summary>
/// DTO tính toán liều lượng tự động
/// </summary>
public class CalculateDosageDto
{
    public Guid MedicineId { get; set; }
    public int DaysSupply { get; set; }
    public decimal? MorningDose { get; set; }
    public decimal? NoonDose { get; set; }
    public decimal? EveningDose { get; set; }
    public decimal? NightDose { get; set; }
    public string? Frequency { get; set; }
}

/// <summary>
/// DTO kết quả tính toán liều lượng
/// </summary>
public class DosageCalculationResultDto
{
    public decimal TotalQuantity { get; set; }
    public decimal DailyDose { get; set; }
    public string? Unit { get; set; }
    public string? UsageInstruction { get; set; }
    public List<string> Warnings { get; set; } = new();
}
