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

// ====== NangCap17 Module C: Enhanced Pharmacy DTOs ======

// --- Customer ---
public class PharmacyCustomerSearchDto
{
    public string? Keyword { get; set; }
    public int? CustomerType { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 50;
}

public class PharmacyCustomerListDto
{
    public Guid Id { get; set; }
    public string CustomerCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public int CustomerType { get; set; }
    public string? CardNumber { get; set; }
    public int TotalPoints { get; set; }
    public decimal TotalPurchaseAmount { get; set; }
    public int TotalPurchaseCount { get; set; }
    public string? LastPurchaseDate { get; set; }
}

public class PharmacyCustomerDetailDto : PharmacyCustomerListDto
{
    public string? Address { get; set; }
    public string? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public string? Notes { get; set; }
}

public class SavePharmacyCustomerDto
{
    public Guid? Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public int CustomerType { get; set; } = 1;
    public string? CardNumber { get; set; }
    public string? Notes { get; set; }
}

// --- Point Transaction ---
public class PharmacyPointTransactionDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public int TransactionType { get; set; }
    public int Points { get; set; }
    public Guid? SaleId { get; set; }
    public string? Description { get; set; }
    public string? CreatedAt { get; set; }
}

public class AddPointsDto
{
    public Guid CustomerId { get; set; }
    public int Points { get; set; }
    public Guid? SaleId { get; set; }
    public string? Description { get; set; }
}

public class RedeemPointsDto
{
    public Guid CustomerId { get; set; }
    public int Points { get; set; }
    public string? Description { get; set; }
}

// --- Shift ---
public class PharmacyShiftSearchDto
{
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public Guid? CashierId { get; set; }
    public int? Status { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 50;
}

public class PharmacyShiftListDto
{
    public Guid Id { get; set; }
    public string ShiftCode { get; set; } = string.Empty;
    public Guid CashierId { get; set; }
    public string? CashierName { get; set; }
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public decimal OpeningCash { get; set; }
    public decimal ClosingCash { get; set; }
    public decimal TotalSales { get; set; }
    public decimal TotalRefunds { get; set; }
    public int Status { get; set; }
    public string? Notes { get; set; }
}

public class OpenShiftDto
{
    public decimal OpeningCash { get; set; }
    public string? Notes { get; set; }
}

public class CloseShiftDto
{
    public Guid ShiftId { get; set; }
    public decimal ClosingCash { get; set; }
    public string? Notes { get; set; }
}

// --- GPP Record ---
public class PharmacyGppRecordSearchDto
{
    public string? Keyword { get; set; }
    public int? RecordType { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 50;
}

public class PharmacyGppRecordListDto
{
    public Guid Id { get; set; }
    public int RecordType { get; set; }
    public string? RecordDate { get; set; }
    public string? Description { get; set; }
    public string? MedicineName { get; set; }
    public string? BatchNumber { get; set; }
    public decimal? Temperature { get; set; }
    public decimal? Humidity { get; set; }
    public string? ActionTaken { get; set; }
    public string? RecordedByName { get; set; }
}

public class SavePharmacyGppRecordDto
{
    public Guid? Id { get; set; }
    public int RecordType { get; set; }
    public string? RecordDate { get; set; }
    public string? Description { get; set; }
    public string? MedicineName { get; set; }
    public string? BatchNumber { get; set; }
    public decimal? Temperature { get; set; }
    public decimal? Humidity { get; set; }
    public string? ActionTaken { get; set; }
}

// --- Commission ---
public class PharmacyCommissionSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 50;
}

public class PharmacyCommissionListDto
{
    public Guid Id { get; set; }
    public string? DoctorName { get; set; }
    public string? SaleDate { get; set; }
    public string? MedicineName { get; set; }
    public decimal Quantity { get; set; }
    public decimal SaleAmount { get; set; }
    public decimal CommissionRate { get; set; }
    public decimal CommissionAmount { get; set; }
    public int Status { get; set; }
    public string? PaidDate { get; set; }
}

public class SavePharmacyCommissionDto
{
    public Guid? Id { get; set; }
    public Guid? DoctorId { get; set; }
    public string? DoctorName { get; set; }
    public Guid? SaleId { get; set; }
    public string? SaleDate { get; set; }
    public string? MedicineName { get; set; }
    public decimal Quantity { get; set; }
    public decimal SaleAmount { get; set; }
    public decimal CommissionRate { get; set; }
}

public class PayCommissionDto
{
    public List<Guid> CommissionIds { get; set; } = new();
}

// --- Enhanced Dashboard ---
public class PharmacyEnhancedDashboardDto
{
    public decimal TodayRevenue { get; set; }
    public int TodaySaleCount { get; set; }
    public int LowStockCount { get; set; }
    public int TotalCustomers { get; set; }
    public int VipCustomers { get; set; }
    public int OpenShiftCount { get; set; }
    public int TodayGppRecords { get; set; }
    public decimal PendingCommission { get; set; }
}
