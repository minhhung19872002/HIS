namespace HIS.Application.DTOs.Pharmacy;

/// <summary>
/// DTO lịch sử xuất nhập kho - Stock Movement History
/// </summary>
public class StockMovementDto
{
    public Guid Id { get; set; }

    // Loại: 1=Nhập, 2=Xuất, 3=Chuyển kho, 4=Điều chỉnh, 5=Hủy/Tiêu hủy
    public int MovementType { get; set; }
    public string? MovementTypeName => MovementType switch
    {
        1 => "Nhập kho",
        2 => "Xuất kho",
        3 => "Chuyển kho",
        4 => "Điều chỉnh",
        5 => "Hủy/Tiêu hủy",
        _ => ""
    };

    // Mã phiếu
    public string MovementCode { get; set; } = string.Empty;
    public DateTime MovementDate { get; set; }

    // Kho
    public Guid? FromWarehouseId { get; set; }
    public string? FromWarehouseName { get; set; }
    public Guid? ToWarehouseId { get; set; }
    public string? ToWarehouseName { get; set; }

    // Thuốc
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;

    // Lô
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    // Số lượng (+/-)
    public decimal Quantity { get; set; }
    public string? Unit { get; set; }

    // Giá
    public decimal UnitPrice { get; set; }
    public decimal TotalAmount { get; set; }

    // Tham chiếu nguồn (Đơn thuốc, Phiếu nhập, Phiếu xuất...)
    public string? ReferenceType { get; set; }
    public Guid? ReferenceId { get; set; }
    public string? ReferenceCode { get; set; }

    // Người thực hiện
    public Guid CreatedBy { get; set; }
    public string? CreatedByName { get; set; }

    // Ghi chú
    public string? Note { get; set; }
    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO tìm kiếm lịch sử xuất nhập
/// </summary>
public class StockMovementSearchDto
{
    public Guid? MedicineId { get; set; }
    public Guid? WarehouseId { get; set; }
    public int? MovementType { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Keyword { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

/// <summary>
/// DTO báo cáo xuất nhập tồn - Stock Card Report
/// </summary>
public class StockCardDto
{
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? Unit { get; set; }

    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    // Tồn đầu kỳ
    public decimal OpeningBalance { get; set; }

    // Trong kỳ
    public decimal TotalImport { get; set; }
    public decimal TotalExport { get; set; }
    public decimal TotalAdjustment { get; set; }

    // Tồn cuối kỳ
    public decimal ClosingBalance { get; set; }

    // Chi tiết theo ngày
    public List<StockCardDetailDto> Details { get; set; } = new();
}

/// <summary>
/// DTO chi tiết thẻ kho theo ngày
/// </summary>
public class StockCardDetailDto
{
    public DateTime Date { get; set; }
    public string MovementCode { get; set; } = string.Empty;
    public int MovementType { get; set; }
    public decimal ImportQuantity { get; set; }
    public decimal ExportQuantity { get; set; }
    public decimal Balance { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// DTO thống kê xuất nhập kho
/// </summary>
public class StockMovementStatisticsDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public decimal TotalImportQuantity { get; set; }
    public decimal TotalImportValue { get; set; }

    public decimal TotalExportQuantity { get; set; }
    public decimal TotalExportValue { get; set; }

    public int TotalImportTransactions { get; set; }
    public int TotalExportTransactions { get; set; }

    // Top thuốc xuất nhiều nhất
    public List<TopMedicineMovementDto> TopExportedMedicines { get; set; } = new();

    // Top thuốc nhập nhiều nhất
    public List<TopMedicineMovementDto> TopImportedMedicines { get; set; } = new();
}

/// <summary>
/// DTO thuốc xuất/nhập nhiều nhất
/// </summary>
public class TopMedicineMovementDto
{
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public decimal TotalQuantity { get; set; }
    public decimal TotalValue { get; set; }
    public int TransactionCount { get; set; }
}
