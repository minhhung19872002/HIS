namespace HIS.Core.Entities;

/// <summary>
/// Bán lẻ thuốc nhà thuốc bệnh viện (NangCap14 - Module 16)
/// </summary>
public class RetailSale : BaseEntity
{
    public string SaleCode { get; set; } = string.Empty; // NT-YYYYMMDD-NNNN
    public Guid? PatientId { get; set; } // Nullable for walk-in customers
    public string? PatientName { get; set; }
    public string? PhoneNumber { get; set; }

    // Amounts
    public decimal TotalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal PaidAmount { get; set; }

    // Payment
    public string PaymentMethod { get; set; } = "Cash"; // Cash, Card, Transfer, Mixed
    public string? PaymentReference { get; set; }

    // Status: Draft, Completed, Cancelled
    public string Status { get; set; } = "Draft";

    public Guid CashierId { get; set; }
    public string? Notes { get; set; }

    // Prescription reference (if selling by prescription)
    public Guid? PrescriptionId { get; set; }

    // Cancellation
    public string? CancelledBy { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual User? Cashier { get; set; }
    public virtual ICollection<RetailSaleItem> Items { get; set; } = new List<RetailSaleItem>();
}

/// <summary>
/// Chi tiết bán lẻ thuốc
/// </summary>
public class RetailSaleItem : BaseEntity
{
    public Guid RetailSaleId { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public decimal DiscountAmount { get; set; }

    // Batch tracking
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public Guid? WarehouseId { get; set; }

    // Navigation
    public virtual RetailSale? RetailSale { get; set; }
    public virtual Medicine? Medicine { get; set; }
}
