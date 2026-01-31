namespace HIS.Application.DTOs.Pharmacy;

/// <summary>
/// DTO tồn kho thuốc - Medicine Inventory/Stock
/// </summary>
public class InventoryDto
{
    // Thông tin kho
    public Guid WarehouseId { get; set; }
    public string WarehouseCode { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public int WarehouseType { get; set; }

    // Thông tin thuốc
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; }
    public string? Concentration { get; set; }
    public string? Unit { get; set; }

    // Phân loại
    public int MedicineType { get; set; }
    public bool IsNarcotic { get; set; } // Gây nghiện
    public bool IsAntibiotic { get; set; } // Kháng sinh
    public bool IsControlled { get; set; } // Thuốc kiểm soát đặc biệt

    // Số lượng tổng hợp
    public decimal TotalQuantity { get; set; } // Tổng tồn kho
    public decimal AvailableQuantity { get; set; } // Khả dụng (chưa đặt)
    public decimal ReservedQuantity { get; set; } // Đã đặt trước
    public decimal MinimumStock { get; set; } // Mức tồn tối thiểu
    public decimal MaximumStock { get; set; } // Mức tồn tối đa

    // Giá trung bình
    public decimal AverageImportPrice { get; set; }
    public decimal AverageUnitPrice { get; set; }
    public decimal TotalValue { get; set; }

    // Trạng thái cảnh báo
    public bool IsLowStock { get; set; } // Tồn kho thấp
    public bool HasNearExpiry { get; set; } // Có thuốc gần hết hạn
    public bool HasExpired { get; set; } // Có thuốc hết hạn

    // Danh sách theo lô
    public List<BatchDto> Batches { get; set; } = new();

    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// DTO thông tin lô thuốc - Batch Information
/// </summary>
public class BatchDto
{
    public Guid InventoryItemId { get; set; }

    public string BatchNumber { get; set; } = string.Empty;
    public DateTime? ManufactureDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public int? DaysUntilExpiry { get; set; }

    public decimal Quantity { get; set; }
    public decimal ReservedQuantity { get; set; }
    public decimal AvailableQuantity => Quantity - ReservedQuantity;

    public decimal ImportPrice { get; set; }
    public decimal UnitPrice { get; set; }

    public bool IsLocked { get; set; }
    public string? LockReason { get; set; }

    public bool IsExpiringSoon { get; set; } // Gần hết hạn (< 3 tháng)
    public bool IsExpired { get; set; } // Đã hết hạn

    // Nguồn nhập
    public string? SourceType { get; set; }
    public string? SourceCode { get; set; }

    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO tìm kiếm tồn kho
/// </summary>
public class InventorySearchDto
{
    public string? Keyword { get; set; } // Tìm theo mã, tên thuốc
    public Guid? WarehouseId { get; set; }
    public int? MedicineType { get; set; }
    public bool? IsLowStock { get; set; }
    public bool? HasNearExpiry { get; set; }
    public bool? HasExpired { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

/// <summary>
/// DTO tồn kho theo thuốc ở nhiều kho
/// </summary>
public class MedicineStockSummaryDto
{
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? Unit { get; set; }

    public decimal TotalQuantity { get; set; }
    public decimal TotalAvailableQuantity { get; set; }
    public decimal TotalReservedQuantity { get; set; }

    // Tồn kho theo từng kho
    public List<WarehouseStockDto> WarehouseStocks { get; set; } = new();
}

/// <summary>
/// DTO tồn kho theo kho
/// </summary>
public class WarehouseStockDto
{
    public Guid WarehouseId { get; set; }
    public string WarehouseCode { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;

    public decimal Quantity { get; set; }
    public decimal AvailableQuantity { get; set; }
    public decimal ReservedQuantity { get; set; }

    public int TotalBatches { get; set; }
    public DateTime? EarliestExpiryDate { get; set; }
}

/// <summary>
/// DTO đặt thuốc trước - Reserve Stock
/// </summary>
public class StockReservationDto
{
    public Guid Id { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    public decimal ReservedQuantity { get; set; }

    // Tham chiếu
    public string ReferenceType { get; set; } = string.Empty; // Prescription, Order...
    public Guid ReferenceId { get; set; }
    public string? ReferenceCode { get; set; }

    public DateTime ReservedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }

    public Guid ReservedBy { get; set; }
    public string? ReserverName { get; set; }

    public int Status { get; set; } // 0=Active, 1=Released, 2=Expired, 3=Fulfilled
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO tạo đặt thuốc trước
/// </summary>
public class CreateStockReservationDto
{
    public Guid MedicineId { get; set; }
    public Guid WarehouseId { get; set; }
    public decimal Quantity { get; set; }
    public string ReferenceType { get; set; } = string.Empty;
    public Guid ReferenceId { get; set; }
    public int? ExpiresInMinutes { get; set; } = 60; // Mặc định hết hạn sau 1 giờ
}
