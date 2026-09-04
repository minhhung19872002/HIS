namespace HIS.Core.Entities;

/// <summary>
/// Kho - Warehouse
/// </summary>
public class Warehouse : BaseEntity
{
    public string WarehouseCode { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public int WarehouseType { get; set; } // 1-Kho thuốc, 2-Kho vật tư, 3-Kho hóa chất, 4-Nhà thuốc, 5-Tủ trực
    public string? Location { get; set; }

    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }

    public Guid? ParentWarehouseId { get; set; } // Kho cha
    public virtual Warehouse? ParentWarehouse { get; set; }

    public bool IsPharmacy { get; set; } // Là nhà thuốc
    public bool IsCabinet { get; set; } // Là tủ trực
    public bool IsActive { get; set; } = true;

    // NangCap26 V.33 - Khóa kho: chặn xuất & luân chuyển (dùng khi kiểm kê / chốt sổ)
    public bool IsLocked { get; set; }
    public string? LockReason { get; set; }
    public Guid? LockedBy { get; set; }
    public DateTime? LockedAt { get; set; }

    // Navigation
    public virtual ICollection<Warehouse> ChildWarehouses { get; set; } = new List<Warehouse>();
    public virtual ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
}

/// <summary>
/// Tồn kho - InventoryItem
/// </summary>
public class InventoryItem : BaseEntity
{
    public Guid WarehouseId { get; set; }
    public virtual Warehouse Warehouse { get; set; } = null!;

    // Generic item reference
    public Guid? ItemId { get; set; } // ID chung (Medicine hoac Supply)
    public string ItemType { get; set; } = "Medicine"; // "Medicine" hoac "Supply"

    // Thuốc hoặc Vật tư
    public Guid? MedicineId { get; set; }
    public virtual Medicine? Medicine { get; set; }
    public Guid? SupplyId { get; set; }
    public virtual MedicalSupply? Supply { get; set; }

    // Lô
    public string? BatchNumber { get; set; } // Số lô
    public DateTime? ExpiryDate { get; set; } // Hạn sử dụng
    public DateTime? ManufactureDate { get; set; } // Ngày sản xuất

    // Số lượng
    public decimal Quantity { get; set; } // Số lượng hiện có
    public decimal ReservedQuantity { get; set; } // Số lượng đã đặt
    public decimal AvailableQuantity => Quantity - ReservedQuantity;

    // Giá
    public decimal ImportPrice { get; set; } // Giá nhập
    public decimal UnitPrice { get; set; } // Giá xuất

    // Trạng thái - NangCap26 V.31: khóa lô thuốc (thu hồi / nghi ngờ chất lượng)
    public bool IsLocked { get; set; } // Khóa xuất
    public string? LockReason { get; set; }
    public Guid? LockedBy { get; set; }
    public DateTime? LockedAt { get; set; }

    // Nguồn nhập
    public string? SourceType { get; set; } // NCC, Chuyển kho, Viện trợ...
    public string? SourceCode { get; set; }

    // #188: optimistic concurrency token — chống oversell/lost-update khi 2 phiếu xuất cùng trừ 1 lô đồng thời.
    // SQL Server tự quản (rowversion); EF tự thêm vào WHERE khi UPDATE → xung đột ném DbUpdateConcurrencyException → 409.
    public byte[]? RowVersion { get; set; }
}

/// <summary>
/// Phiếu nhập kho - ImportReceipt
/// </summary>
public class ImportReceipt : BaseEntity
{
    public string ReceiptCode { get; set; } = string.Empty;
    public DateTime ReceiptDate { get; set; }

    public Guid WarehouseId { get; set; }
    public virtual Warehouse Warehouse { get; set; } = null!;

    public int ImportType { get; set; } // 1-NCC, 2-Chuyển kho, 3-Hoàn trả khoa, 4-Kiểm kê tăng, 5-Viện trợ
    public string? SupplierCode { get; set; }
    public string? SupplierName { get; set; }
    public string? InvoiceNumber { get; set; } // Số hóa đơn
    public DateTime? InvoiceDate { get; set; }

    public decimal TotalAmount { get; set; }
    public decimal Discount { get; set; }
    public decimal Vat { get; set; }
    public decimal FinalAmount { get; set; }

    public string? Note { get; set; }
    public int Status { get; set; } // 0-Chờ duyệt, 1-Đã duyệt, 2-Đã hủy

    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }

    // Navigation
    public virtual ICollection<ImportReceiptDetail> Details { get; set; } = new List<ImportReceiptDetail>();
}

/// <summary>
/// Chi tiết phiếu nhập - ImportReceiptDetail
/// </summary>
public class ImportReceiptDetail : BaseEntity
{
    public Guid ImportReceiptId { get; set; }
    public virtual ImportReceipt ImportReceipt { get; set; } = null!;

    public Guid? MedicineId { get; set; }
    public virtual Medicine? Medicine { get; set; }
    public Guid? SupplyId { get; set; }
    public virtual MedicalSupply? Supply { get; set; }

    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public DateTime? ManufactureDate { get; set; }

    public decimal Quantity { get; set; }
    public string? Unit { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public decimal Vat { get; set; }
}

/// <summary>
/// Phiếu xuất kho - ExportReceipt
/// </summary>
public class ExportReceipt : BaseEntity
{
    public string ReceiptCode { get; set; } = string.Empty;
    public DateTime ReceiptDate { get; set; }

    public Guid WarehouseId { get; set; }
    public virtual Warehouse Warehouse { get; set; } = null!;

    public int ExportType { get; set; } // 1-BN ngoại trú, 2-BN nội trú, 3-Chuyển kho, 4-Trả NCC, 5-Hủy, 6-Kiểm kê giảm

    // Đối tượng nhận
    public Guid? PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public Guid? PrescriptionId { get; set; }
    public Guid? ToDepartmentId { get; set; } // Khoa nhận
    public Guid? ToWarehouseId { get; set; } // Kho nhận

    public decimal TotalAmount { get; set; }
    public string? Note { get; set; }
    public int Status { get; set; } // 0-Chờ, 1-Đã xuất, 2-Đã hủy

    // #17 (audit luồng nghiệp vụ): đã tạo billing thuốc cho phiếu xuất này chưa — guard idempotent
    // để auto-call CreateBillingAfterDispensingAsync không cộng tiền thuốc 2 lần vào InvoiceSummary.
    public bool IsBilled { get; set; }

    // Navigation
    public virtual ICollection<ExportReceiptDetail> Details { get; set; } = new List<ExportReceiptDetail>();
}

/// <summary>
/// Chi tiết phiếu xuất - ExportReceiptDetail
/// </summary>
public class ExportReceiptDetail : BaseEntity
{
    public Guid ExportReceiptId { get; set; }
    public virtual ExportReceipt ExportReceipt { get; set; } = null!;

    public Guid? MedicineId { get; set; }
    public virtual Medicine? Medicine { get; set; }
    public Guid? SupplyId { get; set; }
    public virtual MedicalSupply? Supply { get; set; }

    public Guid? InventoryItemId { get; set; }
    public virtual InventoryItem? InventoryItem { get; set; }

    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    public decimal Quantity { get; set; }
    public string? Unit { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
}

/// <summary>
/// Một HIỆN VẬT tái sử dụng cụ thể đang lưu hành (hai cái kìm cùng loại là hai dòng, đếm số lần
/// dùng riêng).
///
/// <para>#218/T3 (migration 181): trước đây không có bảng nào, và đường đọc `GetReusableSuppliesAsync`
/// **bịa ra cả sổ theo dõi từ hash của Id** dòng danh mục — số lần đã tái sử dụng, trạng thái, ngày
/// tiệt khuẩn gần nhất, tất cả đều là phép băm. Màn hình ấy là thứ nhân viên kiểm soát nhiễm khuẩn
/// đọc để biết dụng cụ nào đã tiệt khuẩn.</para>
/// </summary>
public class ReusableSupplyInstance : BaseEntity
{
    public string InstanceCode { get; set; } = string.Empty;

    public Guid SupplyId { get; set; }
    public virtual MedicalSupply Supply { get; set; } = null!;

    public Guid? WarehouseId { get; set; }

    /// <summary>Xem <see cref="HIS.Core.Constants.ReusableSupplyStatus"/>.</summary>
    public int Status { get; set; } = 1;

    /// <summary>Số lần được phép tái sử dụng. Giới hạn tồn tại vì dụng cụ xuống cấp.</summary>
    public int MaxReuseCount { get; set; } = 10;
    public int CurrentReuseCount { get; set; }

    public DateTime? LastSterilizationAt { get; set; }
    public DateTime? NextSterilizationDue { get; set; }

    public DateTime? RetiredAt { get; set; }
    public string? RetiredReason { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// Nhật ký từng mẻ tiệt khuẩn của một hiện vật — để truy vết ngược khi có sự cố nhiễm khuẩn.
/// </summary>
public class SterilizationLog : BaseEntity
{
    public Guid InstanceId { get; set; }
    public DateTime SterilizedAt { get; set; }

    /// <summary>
    /// Số lần tái sử dụng SAU mẻ này, chụp lại tại thời điểm ghi. Cố ý không đọc động từ hiện vật —
    /// cùng lý do với giấy nghỉ ốm chụp chẩn đoán ở migration 177.
    /// </summary>
    public int ReuseCountAfter { get; set; }

    public string? Method { get; set; }
    public Guid? PerformedById { get; set; }
    public string? Note { get; set; }
}
