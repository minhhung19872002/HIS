namespace HIS.Application.DTOs.Pharmacy;

/// <summary>
/// DTO cảnh báo thuốc gần hết hạn - Expiry Alert
/// </summary>
public class ExpiryAlertDto
{
    public Guid InventoryItemId { get; set; }

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

    // Lô hàng
    public string BatchNumber { get; set; } = string.Empty;
    public DateTime? ManufactureDate { get; set; }
    public DateTime ExpiryDate { get; set; }
    public int DaysUntilExpiry { get; set; }
    public int MonthsUntilExpiry { get; set; }

    // Số lượng
    public decimal Quantity { get; set; }
    public decimal AvailableQuantity { get; set; }
    public decimal ReservedQuantity { get; set; }

    // Giá trị
    public decimal UnitPrice { get; set; }
    public decimal TotalValue { get; set; }

    // Mức độ cảnh báo: 1=Nguy cấp (< 1 tháng), 2=Cảnh báo (1-3 tháng), 3=Lưu ý (3-6 tháng)
    public int AlertLevel { get; set; }
    public string? AlertLevelName => AlertLevel switch
    {
        1 => "Nguy cấp",
        2 => "Cảnh báo",
        3 => "Lưu ý",
        _ => ""
    };

    // Trạng thái: 0=Chưa xử lý, 1=Đã biết, 2=Đang xử lý, 3=Đã xuất hết, 4=Đã tiêu hủy
    public int Status { get; set; }
    public string? StatusName => Status switch
    {
        0 => "Chưa xử lý",
        1 => "Đã biết",
        2 => "Đang xử lý",
        3 => "Đã xuất hết",
        4 => "Đã tiêu hủy",
        _ => ""
    };

    public bool IsExpired { get; set; }
    public bool IsLocked { get; set; }

    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO tìm kiếm cảnh báo hết hạn
/// </summary>
public class ExpiryAlertSearchDto
{
    public Guid? WarehouseId { get; set; }
    public int? AlertLevel { get; set; }
    public int? Status { get; set; }
    public int? DaysBeforeExpiry { get; set; } // Cảnh báo trước bao nhiêu ngày
    public bool? IncludeExpired { get; set; } // Bao gồm đã hết hạn
    public string? Keyword { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

/// <summary>
/// DTO cập nhật trạng thái cảnh báo
/// </summary>
public class UpdateExpiryAlertStatusDto
{
    public Guid InventoryItemId { get; set; }
    public int Status { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// DTO thống kê thuốc gần hết hạn
/// </summary>
public class ExpiryAlertStatisticsDto
{
    public int TotalExpiredItems { get; set; }
    public decimal TotalExpiredValue { get; set; }

    public int CriticalAlerts { get; set; } // < 1 tháng
    public decimal CriticalAlertsValue { get; set; }

    public int WarningAlerts { get; set; } // 1-3 tháng
    public decimal WarningAlertsValue { get; set; }

    public int InfoAlerts { get; set; } // 3-6 tháng
    public decimal InfoAlertsValue { get; set; }

    // Theo kho
    public List<ExpiryAlertByWarehouseDto> ByWarehouse { get; set; } = new();
}

/// <summary>
/// DTO cảnh báo theo kho
/// </summary>
public class ExpiryAlertByWarehouseDto
{
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int TotalAlerts { get; set; }
    public int CriticalAlerts { get; set; }
    public int WarningAlerts { get; set; }
    public decimal TotalValue { get; set; }
}

/// <summary>
/// DTO báo cáo thuốc hết hạn cần tiêu hủy
/// </summary>
public class ExpiredMedicineReportDto
{
    public DateTime ReportDate { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    public List<ExpiryAlertDto> ExpiredItems { get; set; } = new();

    public int TotalItems { get; set; }
    public decimal TotalQuantity { get; set; }
    public decimal TotalValue { get; set; }

    public Guid PreparedBy { get; set; }
    public string? PreparedByName { get; set; }
}
