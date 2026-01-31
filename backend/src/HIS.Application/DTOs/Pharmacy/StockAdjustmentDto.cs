namespace HIS.Application.DTOs.Pharmacy;

/// <summary>
/// DTO điều chỉnh tồn kho - Stock Adjustment
/// </summary>
public class StockAdjustmentDto
{
    public Guid Id { get; set; }

    // Mã phiếu điều chỉnh
    public string AdjustmentCode { get; set; } = string.Empty;
    public DateTime AdjustmentDate { get; set; }

    // Kho
    public Guid WarehouseId { get; set; }
    public string WarehouseCode { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;

    // Loại điều chỉnh: 1=Kiểm kê, 2=Hỏng/Mất, 3=Hết hạn, 4=Sai sót nhập liệu, 5=Khác
    public int AdjustmentType { get; set; }
    public string? AdjustmentTypeName => AdjustmentType switch
    {
        1 => "Kiểm kê",
        2 => "Hỏng/Mất",
        3 => "Hết hạn",
        4 => "Sai sót nhập liệu",
        5 => "Khác",
        _ => ""
    };

    // Trạng thái: 0=Chờ duyệt, 1=Đã duyệt, 2=Đã hủy
    public int Status { get; set; }
    public string? StatusName => Status switch
    {
        0 => "Chờ duyệt",
        1 => "Đã duyệt",
        2 => "Đã hủy",
        _ => ""
    };

    // Chi tiết điều chỉnh
    public List<StockAdjustmentItemDto> Items { get; set; } = new();

    // Tổng số lượng điều chỉnh
    public int TotalItems { get; set; }
    public decimal TotalIncreaseValue { get; set; } // Giá trị tăng
    public decimal TotalDecreaseValue { get; set; } // Giá trị giảm
    public decimal NetAdjustmentValue { get; set; } // Giá trị ròng

    // Lý do
    public string Reason { get; set; } = string.Empty;
    public string? Note { get; set; }

    // Người tạo
    public Guid CreatedBy { get; set; }
    public string? CreatedByName { get; set; }

    // Người duyệt
    public Guid? ApprovedBy { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// DTO chi tiết điều chỉnh tồn kho
/// </summary>
public class StockAdjustmentItemDto
{
    public Guid Id { get; set; }

    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? Unit { get; set; }

    // Lô
    public Guid? InventoryItemId { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    // Số lượng
    public decimal SystemQuantity { get; set; } // Số lượng trên hệ thống
    public decimal ActualQuantity { get; set; } // Số lượng thực tế kiểm kê
    public decimal AdjustmentQuantity { get; set; } // Chênh lệch (+/-)

    // Giá
    public decimal UnitPrice { get; set; }
    public decimal AdjustmentValue { get; set; } // Giá trị chênh lệch

    public string? Note { get; set; }
}

/// <summary>
/// DTO tạo phiếu điều chỉnh
/// </summary>
public class CreateStockAdjustmentDto
{
    public Guid WarehouseId { get; set; }
    public DateTime AdjustmentDate { get; set; }
    public int AdjustmentType { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Note { get; set; }

    public List<CreateStockAdjustmentItemDto> Items { get; set; } = new();
}

/// <summary>
/// DTO chi tiết thuốc khi tạo phiếu điều chỉnh
/// </summary>
public class CreateStockAdjustmentItemDto
{
    public Guid MedicineId { get; set; }
    public Guid? InventoryItemId { get; set; }
    public string? BatchNumber { get; set; }
    public decimal SystemQuantity { get; set; }
    public decimal ActualQuantity { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// DTO duyệt phiếu điều chỉnh
/// </summary>
public class ApproveStockAdjustmentDto
{
    public Guid AdjustmentId { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// DTO tìm kiếm phiếu điều chỉnh
/// </summary>
public class StockAdjustmentSearchDto
{
    public string? Keyword { get; set; }
    public Guid? WarehouseId { get; set; }
    public int? AdjustmentType { get; set; }
    public int? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

/// <summary>
/// DTO kiểm kê tồn kho - Physical Inventory
/// </summary>
public class PhysicalInventoryDto
{
    public Guid Id { get; set; }
    public string InventoryCode { get; set; } = string.Empty;
    public DateTime InventoryDate { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    // 0=Đang kiểm kê, 1=Hoàn thành, 2=Đã tạo phiếu điều chỉnh
    public int Status { get; set; }

    public List<PhysicalInventoryItemDto> Items { get; set; } = new();

    public int TotalItems { get; set; }
    public int CompletedItems { get; set; }
    public int ItemsWithDifference { get; set; }

    public Guid CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO chi tiết kiểm kê
/// </summary>
public class PhysicalInventoryItemDto
{
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? BatchNumber { get; set; }
    public decimal SystemQuantity { get; set; }
    public decimal? CountedQuantity { get; set; }
    public decimal? Difference { get; set; }
    public bool IsCounted { get; set; }
    public string? Note { get; set; }
}
