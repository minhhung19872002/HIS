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

/// <summary>
/// Khach hang nha thuoc (NangCap17 - Module C)
/// </summary>
public class PharmacyCustomer : BaseEntity
{
    public string CustomerCode { get; set; } = string.Empty; // KH-NNNN
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public int? Gender { get; set; } // 0=Female, 1=Male
    public int CustomerType { get; set; } = 1; // 1=Regular, 2=VIP, 3=Staff
    public string? CardNumber { get; set; }
    public int TotalPoints { get; set; }
    public decimal TotalPurchaseAmount { get; set; }
    public int TotalPurchaseCount { get; set; }
    public DateTime? LastPurchaseDate { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual ICollection<PharmacyPointTransaction> PointTransactions { get; set; } = new List<PharmacyPointTransaction>();
}

/// <summary>
/// Giao dich diem tich luy khach hang
/// </summary>
public class PharmacyPointTransaction : BaseEntity
{
    public Guid CustomerId { get; set; }
    public int TransactionType { get; set; } // 1=Earn, 2=Redeem
    public int Points { get; set; }
    public Guid? SaleId { get; set; }
    public string? Description { get; set; }

    // Navigation
    public virtual PharmacyCustomer? Customer { get; set; }
    public virtual RetailSale? Sale { get; set; }
}

/// <summary>
/// Ca lam viec nha thuoc
/// </summary>
public class PharmacyShift : BaseEntity
{
    public string ShiftCode { get; set; } = string.Empty; // CA-YYYYMMDD-N
    public Guid CashierId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public decimal OpeningCash { get; set; }
    public decimal ClosingCash { get; set; }
    public decimal TotalSales { get; set; }
    public decimal TotalRefunds { get; set; }
    public int Status { get; set; } = 1; // 1=Open, 2=Closed
    public string? Notes { get; set; }

    // Navigation
    public virtual User? Cashier { get; set; }
}

/// <summary>
/// So theo doi GPP (ADR, dinh chi thuoc, nhiet do, do am)
/// </summary>
public class PharmacyGppRecord : BaseEntity
{
    public int RecordType { get; set; } // 1=ADR, 2=DrugSuspension, 3=Temperature, 4=Humidity
    public DateTime RecordDate { get; set; }
    public string? Description { get; set; }
    public string? MedicineName { get; set; }
    public string? BatchNumber { get; set; }
    public decimal? Temperature { get; set; }
    public decimal? Humidity { get; set; }
    public string? ActionTaken { get; set; }
    public Guid? RecordedById { get; set; }

    // Navigation
    public virtual User? RecordedBy { get; set; }
}

/// <summary>
/// Hoa hong bac si ke don nha thuoc
/// </summary>
public class PharmacyCommission : BaseEntity
{
    public Guid? DoctorId { get; set; }
    public string? DoctorName { get; set; }
    public Guid? SaleId { get; set; }
    public DateTime SaleDate { get; set; }
    public string? MedicineName { get; set; }
    public decimal Quantity { get; set; }
    public decimal SaleAmount { get; set; }
    public decimal CommissionRate { get; set; } // %
    public decimal CommissionAmount { get; set; }
    public int Status { get; set; } = 1; // 1=Pending, 2=Paid
    public DateTime? PaidDate { get; set; }

    // Navigation
    public virtual User? Doctor { get; set; }
    public virtual RetailSale? Sale { get; set; }
}
