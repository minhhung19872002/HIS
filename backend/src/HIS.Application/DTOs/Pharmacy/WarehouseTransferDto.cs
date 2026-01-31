namespace HIS.Application.DTOs.Pharmacy;

/// <summary>
/// DTO chuyển kho - Warehouse Transfer
/// </summary>
public class WarehouseTransferDto
{
    public Guid Id { get; set; }

    // Mã phiếu chuyển
    public string TransferCode { get; set; } = string.Empty;
    public DateTime TransferDate { get; set; }

    // Kho xuất
    public Guid FromWarehouseId { get; set; }
    public string FromWarehouseCode { get; set; } = string.Empty;
    public string FromWarehouseName { get; set; } = string.Empty;

    // Kho nhận
    public Guid ToWarehouseId { get; set; }
    public string ToWarehouseCode { get; set; } = string.Empty;
    public string ToWarehouseName { get; set; } = string.Empty;

    // Trạng thái: 0=Chờ duyệt, 1=Đã duyệt, 2=Đang chuyển, 3=Đã nhận, 4=Đã hủy
    public int Status { get; set; }
    public string? StatusName => Status switch
    {
        0 => "Chờ duyệt",
        1 => "Đã duyệt",
        2 => "Đang chuyển",
        3 => "Đã nhận",
        4 => "Đã hủy",
        _ => ""
    };

    // Chi tiết thuốc chuyển
    public List<WarehouseTransferItemDto> Items { get; set; } = new();

    // Tổng giá trị
    public decimal TotalAmount { get; set; }
    public int TotalItems { get; set; }

    // Lý do chuyển
    public string? Reason { get; set; }
    public string? Note { get; set; }

    // Người tạo phiếu
    public Guid CreatedBy { get; set; }
    public string? CreatedByName { get; set; }

    // Người duyệt
    public Guid? ApprovedBy { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }

    // Người giao
    public Guid? DeliveredBy { get; set; }
    public string? DeliveredByName { get; set; }
    public DateTime? DeliveredAt { get; set; }

    // Người nhận
    public Guid? ReceivedBy { get; set; }
    public string? ReceivedByName { get; set; }
    public DateTime? ReceivedAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// DTO chi tiết thuốc chuyển kho
/// </summary>
public class WarehouseTransferItemDto
{
    public Guid Id { get; set; }

    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? Unit { get; set; }

    // Lô hàng
    public Guid? InventoryItemId { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    // Số lượng
    public decimal RequestedQuantity { get; set; } // Số lượng yêu cầu
    public decimal TransferredQuantity { get; set; } // Số lượng thực chuyển
    public decimal ReceivedQuantity { get; set; } // Số lượng thực nhận

    // Giá
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }

    public string? Note { get; set; }
}

/// <summary>
/// DTO tạo phiếu chuyển kho
/// </summary>
public class CreateWarehouseTransferDto
{
    public Guid FromWarehouseId { get; set; }
    public Guid ToWarehouseId { get; set; }
    public DateTime TransferDate { get; set; }
    public string? Reason { get; set; }
    public string? Note { get; set; }

    public List<CreateWarehouseTransferItemDto> Items { get; set; } = new();
}

/// <summary>
/// DTO chi tiết thuốc khi tạo phiếu chuyển
/// </summary>
public class CreateWarehouseTransferItemDto
{
    public Guid MedicineId { get; set; }
    public Guid? InventoryItemId { get; set; } // Chọn lô cụ thể
    public string? BatchNumber { get; set; }
    public decimal Quantity { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// DTO cập nhật phiếu chuyển kho
/// </summary>
public class UpdateWarehouseTransferDto
{
    public DateTime? TransferDate { get; set; }
    public string? Reason { get; set; }
    public string? Note { get; set; }
    public List<CreateWarehouseTransferItemDto>? Items { get; set; }
}

/// <summary>
/// DTO duyệt phiếu chuyển kho
/// </summary>
public class ApproveWarehouseTransferDto
{
    public Guid TransferId { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// DTO xác nhận xuất kho
/// </summary>
public class DeliverWarehouseTransferDto
{
    public Guid TransferId { get; set; }
    public List<DeliverTransferItemDto> Items { get; set; } = new();
    public string? Note { get; set; }
}

/// <summary>
/// DTO chi tiết xuất kho thực tế
/// </summary>
public class DeliverTransferItemDto
{
    public Guid ItemId { get; set; }
    public decimal TransferredQuantity { get; set; } // Số lượng thực xuất
}

/// <summary>
/// DTO xác nhận nhận hàng
/// </summary>
public class ReceiveWarehouseTransferDto
{
    public Guid TransferId { get; set; }
    public List<ReceiveTransferItemDto> Items { get; set; } = new();
    public string? Note { get; set; }
}

/// <summary>
/// DTO chi tiết nhận hàng thực tế
/// </summary>
public class ReceiveTransferItemDto
{
    public Guid ItemId { get; set; }
    public decimal ReceivedQuantity { get; set; } // Số lượng thực nhận
    public string? Note { get; set; }
}

/// <summary>
/// DTO tìm kiếm phiếu chuyển kho
/// </summary>
public class WarehouseTransferSearchDto
{
    public string? Keyword { get; set; }
    public Guid? FromWarehouseId { get; set; }
    public Guid? ToWarehouseId { get; set; }
    public int? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
