namespace HIS.Core.Entities;

/// <summary>
/// Kho ký gửi - Consignment stock
/// Hàng do nhà cung cấp gửi về kho, khi nào dùng mới thanh toán.
/// </summary>
public class ConsignmentStock : BaseEntity
{
    public Guid SupplierId { get; set; }
    public virtual Supplier? Supplier { get; set; }

    public Guid WarehouseId { get; set; }
    public virtual Warehouse? Warehouse { get; set; }

    public Guid? MedicineId { get; set; }
    public virtual Medicine? Medicine { get; set; }
    public Guid? SupplyId { get; set; }
    public virtual MedicalSupply? Supply { get; set; }

    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    public decimal Quantity { get; set; }
    public decimal UsedQuantity { get; set; }

    public decimal UnitPrice { get; set; }

    public DateTime ConsignmentDate { get; set; }
    public DateTime? ExpirationDate { get; set; } // Hạn ký gửi

    public string? Notes { get; set; }
}

/// <summary>
/// Cấu hình quy đổi IU (international units) cho thuốc.
/// VD: Insulin 100 IU/mL → BaseUnit = mL, IUPerBaseUnit = 100.
/// </summary>
public class IUMedicineConfig : BaseEntity
{
    public Guid MedicineId { get; set; }
    public virtual Medicine? Medicine { get; set; }

    public string BaseUnit { get; set; } = string.Empty;
    public decimal IUPerBaseUnit { get; set; }

    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
}

/// <summary>
/// Cấu hình cho phép xuất lẻ (split-package).
/// VD: 1 hộp = 10 vỉ × 10 viên = 100 viên; xuất lẻ theo Viên.
/// </summary>
public class SplitablePackageConfig : BaseEntity
{
    public Guid? MedicineId { get; set; }
    public virtual Medicine? Medicine { get; set; }
    public Guid? SupplyId { get; set; }
    public virtual MedicalSupply? Supply { get; set; }

    public string PackageUnit { get; set; } = string.Empty;
    public string SplitUnit { get; set; } = string.Empty;
    public decimal QuantityPerPackage { get; set; }
    public decimal PackagePricePerUnit { get; set; }

    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
}

/// <summary>
/// Cấu hình margin lợi nhuận theo từng nhóm thuốc / vật tư / kho.
/// </summary>
public class ProfitMarginConfig : BaseEntity
{
    public Guid? WarehouseId { get; set; }
    public virtual Warehouse? Warehouse { get; set; }

    public string? MedicineGroupCode { get; set; }
    public string? SupplyGroupCode { get; set; }

    public decimal MinPriceFrom { get; set; }
    public decimal MinPriceTo { get; set; }
    public decimal MarginPercent { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// Phieu kiem ke kho — StockTake (MQSoft: Kiểm kê tồn kho)
/// </summary>
public class StockTake : BaseEntity
{
    public string StockTakeCode { get; set; } = string.Empty;
    public DateTime StockTakeDate { get; set; }
    public Guid WarehouseId { get; set; }
    public virtual Warehouse? Warehouse { get; set; }
    public DateTime PeriodFrom { get; set; }
    public DateTime PeriodTo { get; set; }
    public int Status { get; set; } // 0-Mới tạo, 1-Đang kiểm, 2-Hoàn thành, 3-Đã điều chỉnh, 4-Hủy
    public string? CancelReason { get; set; }
    public string? Notes { get; set; }
    public virtual ICollection<StockTakeItem> Items { get; set; } = new List<StockTakeItem>();
}

/// <summary>
/// Chi tiet kiem ke — StockTakeItem
/// </summary>
public class StockTakeItem : BaseEntity
{
    public Guid StockTakeId { get; set; }
    public virtual StockTake StockTake { get; set; } = null!;
    public Guid InventoryItemId { get; set; }
    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public decimal BookQuantity { get; set; }
    public decimal ActualQuantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Notes { get; set; }
}
