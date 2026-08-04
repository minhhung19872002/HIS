namespace HIS.Application.DTOs.Warehouse;

/// <summary>
/// NangCap26 V.31 / V.33 — payload khóa lô thuốc hoặc khóa kho.
/// </summary>
public class LockRequestDto
{
    /// <summary>Lý do khóa (bắt buộc khi khóa, để lại vết cho hội đồng/lãnh đạo).</summary>
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// Thông tin một lô đang bị khóa — phục vụ màn hình "Lô đang khóa".
/// </summary>
public class LockedBatchDto
{
    public Guid InventoryItemId { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public Guid? MedicineId { get; set; }
    public Guid? SupplyId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public decimal Quantity { get; set; }
    public string? LockReason { get; set; }
    public Guid? LockedBy { get; set; }
    public string? LockedByName { get; set; }
    public DateTime? LockedAt { get; set; }
}

/// <summary>
/// Trạng thái khóa của một kho.
/// </summary>
public class WarehouseLockStatusDto
{
    public Guid WarehouseId { get; set; }
    public string WarehouseCode { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public bool IsLocked { get; set; }
    public string? LockReason { get; set; }
    public Guid? LockedBy { get; set; }
    public string? LockedByName { get; set; }
    public DateTime? LockedAt { get; set; }
}
