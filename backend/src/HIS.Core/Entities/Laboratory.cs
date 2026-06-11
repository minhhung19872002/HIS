namespace HIS.Core.Entities;

// #14e (2026-06-11): LabRequest/LabRequestItem/LabResult (model 2 CLS — chết trong luồng thật, chỉ seed ghi)
// đã GỠ cùng 3 bảng tương ứng (mig 91). Nguồn-sự-thật KQ XN = ServiceRequest/ServiceRequestDetail
// (+ ServiceRequestDetailParameter per-parameter, R1).

/// <summary>
/// Mẫu đặt trước thuốc/vật tư
/// </summary>
public class StockReservation : BaseEntity
{
    public Guid MedicineId { get; set; }
    public Guid WarehouseId { get; set; }
    public Guid? BatchId { get; set; }
    public decimal Quantity { get; set; }
    public string ReferenceType { get; set; } = string.Empty; // Prescription, LabRequest, etc.
    public Guid ReferenceId { get; set; }
    public DateTime ExpiresAt { get; set; }
    public int Status { get; set; } // 0=Active, 1=Used, 2=Released, 3=Expired
    public string? Notes { get; set; }

    // Navigation
    public virtual Medicine? Medicine { get; set; }
    public virtual Warehouse? Warehouse { get; set; }
    public virtual InventoryItem? Batch { get; set; }
}

/// <summary>
/// Cảnh báo thuốc hết hạn
/// </summary>
public class ExpiryAlert : BaseEntity
{
    public Guid MedicineId { get; set; }
    public Guid WarehouseId { get; set; }
    public Guid InventoryItemId { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public DateTime ExpiryDate { get; set; }
    public decimal Quantity { get; set; }
    public int AlertLevel { get; set; } // 1=Critical (<1 month), 2=Warning (1-3 months), 3=Info (3-6 months)
    public int Status { get; set; } // 0=New, 1=Acknowledged, 2=Resolved, 3=Ignored
    public DateTime? AcknowledgedAt { get; set; }
    public Guid? AcknowledgedBy { get; set; }
    public string? ActionTaken { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Medicine? Medicine { get; set; }
    public virtual Warehouse? Warehouse { get; set; }
    public virtual InventoryItem? InventoryItem { get; set; }
}

/// <summary>
/// Cảnh báo tồn kho thấp
/// </summary>
public class LowStockAlert : BaseEntity
{
    public Guid MedicineId { get; set; }
    public Guid WarehouseId { get; set; }
    public decimal CurrentQuantity { get; set; }
    public decimal MinimumQuantity { get; set; }
    public decimal ReorderPoint { get; set; }
    public decimal SuggestedOrderQuantity { get; set; }
    public int AlertLevel { get; set; } // 1=Critical, 2=Warning, 3=Info
    public int Status { get; set; } // 0=New, 1=Acknowledged, 2=Ordered, 3=Resolved
    public DateTime? AcknowledgedAt { get; set; }
    public Guid? AcknowledgedBy { get; set; }
    public string? ActionTaken { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Medicine? Medicine { get; set; }
    public virtual Warehouse? Warehouse { get; set; }
}

/// <summary>
/// Phiếu chuyển kho
/// </summary>
public class WarehouseTransfer : BaseEntity
{
    public string TransferCode { get; set; } = string.Empty;
    public Guid FromWarehouseId { get; set; }
    public Guid ToWarehouseId { get; set; }
    public DateTime TransferDate { get; set; }
    public int Status { get; set; } // 0=Pending, 1=Approved, 2=InTransit, 3=Received, 4=Cancelled
    public decimal TotalAmount { get; set; }
    public string? RequestedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public Guid? DeliveredBy { get; set; }
    public DateTime? ReceivedAt { get; set; }
    public Guid? ReceivedBy { get; set; }
    public string? Notes { get; set; }
    public string? CancellationReason { get; set; }

    // Navigation
    public virtual Warehouse? FromWarehouse { get; set; }
    public virtual Warehouse? ToWarehouse { get; set; }
    public virtual ICollection<WarehouseTransferItem> Items { get; set; } = new List<WarehouseTransferItem>();
}

/// <summary>
/// Chi tiết phiếu chuyển kho
/// </summary>
public class WarehouseTransferItem : BaseEntity
{
    public Guid WarehouseTransferId { get; set; }
    public Guid MedicineId { get; set; }
    public Guid? InventoryItemId { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public decimal RequestedQuantity { get; set; }
    public decimal? DeliveredQuantity { get; set; }
    public decimal? ReceivedQuantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual WarehouseTransfer? WarehouseTransfer { get; set; }
    public virtual Medicine? Medicine { get; set; }
    public virtual InventoryItem? InventoryItem { get; set; }
}

/// <summary>
/// Phiếu điều chỉnh tồn kho
/// </summary>
public class StockAdjustment : BaseEntity
{
    public string AdjustmentCode { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateTime AdjustmentDate { get; set; }
    public int AdjustmentType { get; set; } // 1=Inventory, 2=Damage, 3=Expired, 4=Error, 5=Other
    public int Status { get; set; } // 0=Pending, 1=Approved, 2=Cancelled
    public string? Reason { get; set; }
    public decimal TotalDifferenceAmount { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedBy { get; set; }
    public string? ApprovalNotes { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Warehouse? Warehouse { get; set; }
    public virtual ICollection<StockAdjustmentItem> Items { get; set; } = new List<StockAdjustmentItem>();
}

/// <summary>
/// Chi tiết phiếu điều chỉnh
/// </summary>
public class StockAdjustmentItem : BaseEntity
{
    public Guid StockAdjustmentId { get; set; }
    public Guid MedicineId { get; set; }
    public Guid? InventoryItemId { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public decimal SystemQuantity { get; set; }
    public decimal ActualQuantity { get; set; }
    public decimal DifferenceQuantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DifferenceAmount { get; set; }
    public string? Reason { get; set; }

    // Navigation
    public virtual StockAdjustment? StockAdjustment { get; set; }
    public virtual Medicine? Medicine { get; set; }
    public virtual InventoryItem? InventoryItem { get; set; }
}

/// <summary>
/// Lịch sử xuất nhập kho
/// </summary>
public class StockMovement : BaseEntity
{
    public Guid MedicineId { get; set; }
    public Guid WarehouseId { get; set; }
    public Guid? InventoryItemId { get; set; }
    public string? BatchNumber { get; set; }
    public int MovementType { get; set; } // 1=Import, 2=Export, 3=Transfer, 4=Adjust, 5=Return
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public decimal BalanceBefore { get; set; }
    public decimal BalanceAfter { get; set; }
    public string? ReferenceType { get; set; } // ImportReceipt, ExportReceipt, Transfer, Adjustment
    public Guid? ReferenceId { get; set; }
    public string? ReferenceCode { get; set; }
    public DateTime MovementDate { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Medicine? Medicine { get; set; }
    public virtual Warehouse? Warehouse { get; set; }
    public virtual InventoryItem? InventoryItem { get; set; }
}

/// <summary>
/// Cài đặt ngưỡng tồn kho
/// </summary>
public class StockThreshold : BaseEntity
{
    public Guid MedicineId { get; set; }
    public Guid? WarehouseId { get; set; }
    public decimal MinimumQuantity { get; set; }
    public decimal MaximumQuantity { get; set; }
    public decimal ReorderPoint { get; set; }
    public decimal ReorderQuantity { get; set; }
    public bool IsActive { get; set; }

    // Navigation
    public virtual Medicine? Medicine { get; set; }
    public virtual Warehouse? Warehouse { get; set; }
}

/// <summary>
/// Yêu cầu cấp phát thuốc
/// </summary>
public class DispenseRequest : BaseEntity
{
    public string RequestCode { get; set; } = string.Empty;
    public Guid PrescriptionId { get; set; }
    public Guid PatientId { get; set; }
    public Guid WarehouseId { get; set; }
    public DateTime RequestDate { get; set; }
    public int Status { get; set; } // 0=Pending, 1=Processing, 2=Dispensed, 3=PartialDispensed, 4=Cancelled
    public decimal TotalAmount { get; set; }
    public bool IsPaid { get; set; }
    public Guid? DispensedBy { get; set; }
    public DateTime? DispensedAt { get; set; }
    public string? Notes { get; set; }
    public string? CancellationReason { get; set; }

    // Navigation
    public virtual Prescription? Prescription { get; set; }
    public virtual Patient? Patient { get; set; }
    public virtual Warehouse? Warehouse { get; set; }
    public virtual User? DispensedByUser { get; set; }
    public virtual ICollection<DispenseRequestItem> Items { get; set; } = new List<DispenseRequestItem>();
}

/// <summary>
/// Chi tiết cấp phát thuốc
/// </summary>
public class DispenseRequestItem : BaseEntity
{
    public Guid DispenseRequestId { get; set; }
    public Guid PrescriptionDetailId { get; set; }
    public Guid MedicineId { get; set; }
    public Guid? InventoryItemId { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public decimal OrderedQuantity { get; set; }
    public decimal DispensedQuantity { get; set; }
    public decimal? ReturnedQuantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public int Status { get; set; } // 0=Pending, 1=Dispensed, 2=PartialDispensed, 3=OutOfStock, 4=Returned
    public string? Notes { get; set; }

    // Navigation
    public virtual DispenseRequest? DispenseRequest { get; set; }
    public virtual PrescriptionDetail? PrescriptionDetail { get; set; }
    public virtual Medicine? Medicine { get; set; }
    public virtual InventoryItem? InventoryItem { get; set; }
}
