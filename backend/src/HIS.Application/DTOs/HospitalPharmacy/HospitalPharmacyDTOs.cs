namespace HIS.Application.DTOs;

public class RetailSaleSearchDto
{
    public string? Keyword { get; set; }
    public string? Status { get; set; } // Draft, Completed, Cancelled
    public string? PaymentMethod { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public Guid? CashierId { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 50;
}

public class RetailSaleListDto
{
    public Guid Id { get; set; }
    public string SaleCode { get; set; } = string.Empty;
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public string? PhoneNumber { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? CashierName { get; set; }
    public int ItemCount { get; set; }
    public string? CreatedAt { get; set; }
}

public class RetailSaleDetailDto : RetailSaleListDto
{
    public Guid? PatientId { get; set; }
    public Guid CashierId { get; set; }
    public string? Notes { get; set; }
    public string? PaymentReference { get; set; }
    public string? CancellationReason { get; set; }
    public string? CancelledAt { get; set; }
    public List<RetailSaleItemDto> Items { get; set; } = new();
}

public class RetailSaleItemDto
{
    public Guid Id { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? BatchNumber { get; set; }
    public string? ExpiryDate { get; set; }
}

public class CreateRetailSaleDto
{
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PhoneNumber { get; set; }
    public string PaymentMethod { get; set; } = "Cash";
    public string? PaymentReference { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? Notes { get; set; }
    public List<CreateRetailSaleItemDto> Items { get; set; } = new();
}

public class CreateRetailSaleItemDto
{
    public Guid MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? BatchNumber { get; set; }
    public string? ExpiryDate { get; set; }
    public Guid? WarehouseId { get; set; }
}

public class RetailSaleStatsDto
{
    public int TotalSales { get; set; }
    public int CompletedSales { get; set; }
    public int CancelledSales { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal TotalDiscount { get; set; }
    public decimal TodayRevenue { get; set; }
    public int TodaySalesCount { get; set; }
    public List<RetailSalePaymentBreakdownDto> PaymentBreakdown { get; set; } = new();
}

public class RetailSalePaymentBreakdownDto
{
    public string PaymentMethod { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Amount { get; set; }
}

public class MedicineForSaleDto
{
    public Guid Id { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; }
    public string? Unit { get; set; }
    public decimal RetailPrice { get; set; }
    public decimal AvailableStock { get; set; }
    public string? BatchNumber { get; set; }
    public string? ExpiryDate { get; set; }
}
