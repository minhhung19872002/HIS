namespace HIS.Core.Entities;

/// <summary>
/// Thuốc dùng trong ca PTTT (F1 — audit FLOW-FINAL 2026-06-06). Trước đây kê thuốc PTTT chỉ
/// in-memory (SurgeryPrescriptionServiceImpl stub) → mất dữ liệu, không vào viện phí, không trừ kho.
/// </summary>
public class SurgeryMedicineItem : BaseEntity
{
    public Guid SurgeryId { get; set; }
    public Guid MedicineId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }

    public int PaymentObject { get; set; } // 1-BHYT, 2-Thu phí, 3-Hao phí (không thu)
    public Guid? WarehouseId { get; set; }
    public string? BatchNumber { get; set; }
    public bool IsInPackage { get; set; }   // nằm trong gói PTTT (không thu riêng)
    public string? UsageInstruction { get; set; }

    public bool IsStockDeducted { get; set; } // đã trừ kho chưa (idempotent)
    public bool IsBilled { get; set; }         // đã đưa vào viện phí chưa (idempotent)
}

/// <summary>
/// Vật tư dùng trong ca PTTT (F1). Tương tự <see cref="SurgeryMedicineItem"/> nhưng cho vật tư y tế.
/// </summary>
public class SurgerySupplyItem : BaseEntity
{
    public Guid SurgeryId { get; set; }
    public Guid SupplyId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }

    public int PaymentObject { get; set; } // 1-BHYT, 2-Thu phí, 3-Hao phí
    public Guid? WarehouseId { get; set; }
    public string? BatchNumber { get; set; }
    public bool IsInPackage { get; set; }
    public string? Notes { get; set; }

    public bool IsStockDeducted { get; set; }
    public bool IsBilled { get; set; }
}
