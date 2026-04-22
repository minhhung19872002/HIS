namespace HIS.Application.DTOs.Payment;

public class CreatePaymentUrlDto
{
    public string Provider { get; set; } = "vnpay";
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public Guid? InvoiceSummaryId { get; set; }
    public decimal Amount { get; set; }
    public string OrderType { get; set; } = "billing";
    public string? OrderInfo { get; set; }
    public string? BankCode { get; set; }
    public string? Language { get; set; } = "vn";
}

public class PaymentUrlResponseDto
{
    public Guid TransactionId { get; set; }
    public string TxnRef { get; set; } = string.Empty;
    public string PaymentUrl { get; set; } = string.Empty;
    public string QrCodeDataUrl { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public string Provider { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class PaymentTransactionDto
{
    public Guid Id { get; set; }
    public string TxnRef { get; set; } = string.Empty;
    public string? GatewayTxnRef { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string OrderType { get; set; } = string.Empty;
    public string OrderInfo { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public Guid? InvoiceSummaryId { get; set; }
    public Guid? ReceiptId { get; set; }
    public decimal Amount { get; set; }
    public int Status { get; set; }
    public string StatusText { get; set; } = string.Empty;
    public int? ResponseCode { get; set; }
    public string? ResponseMessage { get; set; }
    public string? BankCode { get; set; }
    public string? CardType { get; set; }
    public DateTime? PayDate { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public decimal RefundedAmount { get; set; }
}

public class PaymentSearchDto
{
    public string? Keyword { get; set; }
    public string? Provider { get; set; }
    public int? Status { get; set; }
    public Guid? PatientId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int PageIndex { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class PaymentSearchResultDto
{
    public List<PaymentTransactionDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalSuccessAmount { get; set; }
}

public class VnPayIpnResultDto
{
    public string RspCode { get; set; } = "00";
    public string Message { get; set; } = "Confirm Success";
}

public class PaymentRefundDto
{
    public Guid TransactionId { get; set; }
    public decimal Amount { get; set; }
    public string? Reason { get; set; }
    public string RefundType { get; set; } = "02";
}

public class PaymentStatsDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public int TotalTransactions { get; set; }
    public int SuccessTransactions { get; set; }
    public int FailedTransactions { get; set; }
    public int PendingTransactions { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalSuccessAmount { get; set; }
    public decimal TotalRefundedAmount { get; set; }
    public List<ProviderStatDto> ByProvider { get; set; } = new();
    public List<DailyStatDto> ByDay { get; set; } = new();
}

public class ProviderStatDto
{
    public string Provider { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Amount { get; set; }
}

public class DailyStatDto
{
    public DateTime Date { get; set; }
    public int Count { get; set; }
    public decimal Amount { get; set; }
}
