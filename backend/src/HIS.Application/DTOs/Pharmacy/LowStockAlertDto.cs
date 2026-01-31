namespace HIS.Application.DTOs.Pharmacy;

/// <summary>
/// DTO cảnh báo tồn kho thấp - Low Stock Alert
/// </summary>
public class LowStockAlertDto
{
    public Guid Id { get; set; }

    // Thông tin kho
    public Guid WarehouseId { get; set; }
    public string WarehouseCode { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;

    // Thông tin thuốc
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; }
    public string? Concentration { get; set; }
    public string? Unit { get; set; }

    // Phân loại quan trọng
    public int MedicineType { get; set; }
    public bool IsNarcotic { get; set; }
    public bool IsAntibiotic { get; set; }
    public bool IsControlled { get; set; }
    public bool IsEssential { get; set; } // Thuốc thiết yếu

    // Số lượng
    public decimal CurrentQuantity { get; set; }
    public decimal AvailableQuantity { get; set; }
    public decimal ReservedQuantity { get; set; }

    // Ngưỡng cảnh báo
    public decimal MinimumStock { get; set; }
    public decimal MaximumStock { get; set; }
    public decimal ReorderPoint { get; set; } // Điểm đặt hàng lại
    public decimal ReorderQuantity { get; set; } // Số lượng đặt hàng đề xuất

    // Tỷ lệ tồn kho
    public decimal StockPercentage { get; set; } // % so với mức tối thiểu

    // Mức độ cảnh báo: 1=Hết hàng, 2=Nguy cấp (< 25%), 3=Thấp (25-50%), 4=Gần hết (50-75%)
    public int AlertLevel { get; set; }
    public string? AlertLevelName => AlertLevel switch
    {
        1 => "Hết hàng",
        2 => "Nguy cấp",
        3 => "Thấp",
        4 => "Gần hết",
        _ => ""
    };

    // Thống kê sử dụng
    public decimal AverageDailyUsage { get; set; } // Tiêu thụ trung bình/ngày
    public int DaysOfStockRemaining { get; set; } // Số ngày còn đủ dùng

    // Giá trị
    public decimal UnitPrice { get; set; }
    public decimal TotalValue { get; set; }
    public decimal EstimatedReorderValue { get; set; }

    // Trạng thái: 0=Chưa xử lý, 1=Đã biết, 2=Đã đặt hàng, 3=Đã giải quyết
    public int Status { get; set; }
    public string? StatusName => Status switch
    {
        0 => "Chưa xử lý",
        1 => "Đã biết",
        2 => "Đã đặt hàng",
        3 => "Đã giải quyết",
        _ => ""
    };

    // Nhà cung cấp đề xuất
    public string? PreferredSupplier { get; set; }
    public DateTime? LastPurchaseDate { get; set; }
    public decimal? LastPurchasePrice { get; set; }

    public string? Note { get; set; }
    public DateTime AlertDate { get; set; }
    public DateTime? ResolvedAt { get; set; }
}

/// <summary>
/// DTO tìm kiếm cảnh báo tồn kho thấp
/// </summary>
public class LowStockAlertSearchDto
{
    public Guid? WarehouseId { get; set; }
    public int? AlertLevel { get; set; }
    public int? Status { get; set; }
    public int? MedicineType { get; set; }
    public bool? IsEssential { get; set; }
    public bool? IsNarcotic { get; set; }
    public string? Keyword { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

/// <summary>
/// DTO cập nhật trạng thái cảnh báo tồn kho
/// </summary>
public class UpdateLowStockAlertStatusDto
{
    public Guid AlertId { get; set; }
    public int Status { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// DTO cài đặt ngưỡng tồn kho
/// </summary>
public class StockThresholdSettingDto
{
    public Guid Id { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public Guid? WarehouseId { get; set; }
    public string? WarehouseName { get; set; }

    public decimal MinimumStock { get; set; }
    public decimal MaximumStock { get; set; }
    public decimal ReorderPoint { get; set; }
    public decimal ReorderQuantity { get; set; }

    public int LeadTimeDays { get; set; } // Thời gian giao hàng (ngày)
    public bool AutoCreatePurchaseOrder { get; set; } // Tự động tạo đơn đặt hàng

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// DTO tạo/cập nhật ngưỡng tồn kho
/// </summary>
public class CreateStockThresholdDto
{
    public Guid MedicineId { get; set; }
    public Guid? WarehouseId { get; set; }
    public decimal MinimumStock { get; set; }
    public decimal MaximumStock { get; set; }
    public decimal ReorderPoint { get; set; }
    public decimal ReorderQuantity { get; set; }
    public int LeadTimeDays { get; set; }
    public bool AutoCreatePurchaseOrder { get; set; }
}

/// <summary>
/// DTO thống kê cảnh báo tồn kho thấp
/// </summary>
public class LowStockAlertStatisticsDto
{
    public int TotalOutOfStock { get; set; } // Hết hàng hoàn toàn
    public int CriticalAlerts { get; set; } // < 25%
    public int LowAlerts { get; set; } // 25-50%
    public int NearLowAlerts { get; set; } // 50-75%

    public decimal TotalStockValue { get; set; }
    public decimal EstimatedReorderValue { get; set; }

    public int EssentialMedicinesLow { get; set; }
    public int NarcoticMedicinesLow { get; set; }
    public int AntibioticsLow { get; set; }

    // Theo kho
    public List<LowStockAlertByWarehouseDto> ByWarehouse { get; set; } = new();

    // Top thuốc cần đặt hàng gấp
    public List<LowStockAlertDto> UrgentReorders { get; set; } = new();
}

/// <summary>
/// DTO cảnh báo tồn kho thấp theo kho
/// </summary>
public class LowStockAlertByWarehouseDto
{
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int TotalAlerts { get; set; }
    public int OutOfStock { get; set; }
    public int CriticalAlerts { get; set; }
    public int LowAlerts { get; set; }
    public decimal TotalValue { get; set; }
}

/// <summary>
/// DTO đề xuất đặt hàng - Purchase Order Suggestion
/// </summary>
public class PurchaseOrderSuggestionDto
{
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;

    public decimal CurrentStock { get; set; }
    public decimal MinimumStock { get; set; }
    public decimal SuggestedOrderQuantity { get; set; }

    public decimal AverageDailyUsage { get; set; }
    public int LeadTimeDays { get; set; }

    public string? PreferredSupplier { get; set; }
    public decimal? EstimatedUnitPrice { get; set; }
    public decimal? EstimatedTotalCost { get; set; }

    public int Priority { get; set; } // 1=Urgent, 2=High, 3=Medium, 4=Low
}
