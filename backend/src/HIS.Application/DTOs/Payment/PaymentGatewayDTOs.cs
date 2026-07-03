using System.ComponentModel.DataAnnotations;
using HIS.Application.Common;

namespace HIS.Application.DTOs.Payment;

public class CreatePaymentUrlDto
{
    public string Provider { get; set; } = "vnpay";
    [NotEmptyGuid]
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public Guid? InvoiceSummaryId { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Số tiền không được âm")]
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
    /// <summary>Nội dung QR để render local (bank = chuỗi EMVCo VietQR; cổng ví = payment URL)</summary>
    public string? QrCodeContent { get; set; }
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
    public string? QrCodeContent { get; set; }
    public string? ReferenceType { get; set; }
    public Guid? ReferenceId { get; set; }
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
    [NotEmptyGuid]
    public Guid TransactionId { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Số tiền hoàn không được âm")]
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

public class BankConfirmDto
{
    public Guid TransactionId { get; set; }
    public string? BankReference { get; set; }     // Số ref từ sao kê bank
    public DateTime? PaidAt { get; set; }
    public string? Note { get; set; }
}

// ===== NangCap25: QR động theo ngữ cảnh nghiệp vụ =====

public class DynamicQrRequestDto
{
    /// <summary>service-request | prescription | retail-sale | deposit | discharge</summary>
    [Required]
    public string ReferenceType { get; set; } = string.Empty;
    [NotEmptyGuid]
    public Guid ReferenceId { get; set; }
    /// <summary>Chỉ dùng cho deposit (số tiền tạm ứng chỉ định); các loại khác BE tự tính</summary>
    [Range(0, double.MaxValue, ErrorMessage = "Số tiền không được âm")]
    public decimal? Amount { get; set; }
    /// <summary>Mặc định lấy PaymentGateway:DefaultBankProvider (vietcombank)</summary>
    public string? Provider { get; set; }
    public string? OrderInfo { get; set; }
}

public class KioskQrRequestDto
{
    [Required]
    public string PatientCode { get; set; } = string.Empty;
    [Required]
    public DateTime DateOfBirth { get; set; }
    public string? Provider { get; set; }
}

public class KioskPendingItemDto
{
    public Guid ServiceRequestId { get; set; }
    public string RequestCode { get; set; } = string.Empty;
    public DateTime RequestDate { get; set; }
    public decimal Amount { get; set; }
}

public class KioskQrResponseDto
{
    public string PatientName { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public int PendingCount { get; set; }
    public decimal TotalAmount { get; set; }
    public List<KioskPendingItemDto> Items { get; set; } = new();
    /// <summary>Null khi không có khoản chờ thanh toán</summary>
    public PaymentUrlResponseDto? Qr { get; set; }
}

// ===== NangCap25 IV: Chi hộ hoàn tiền thừa =====

public class CreateRefundDisbursementDto
{
    [NotEmptyGuid]
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public Guid? PaymentTransactionId { get; set; }
    [Range(1, double.MaxValue, ErrorMessage = "Số tiền chi hộ phải lớn hơn 0")]
    public decimal Amount { get; set; }
    [Required]
    public string BankBin { get; set; } = string.Empty;
    [Required]
    public string BankName { get; set; } = string.Empty;
    [Required]
    public string AccountNumber { get; set; } = string.Empty;
    [Required]
    public string AccountHolder { get; set; } = string.Empty;
    public string? Reason { get; set; }
}

public class RefundDisbursementDto
{
    public Guid Id { get; set; }
    public string DisbursementCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public Guid? PaymentTransactionId { get; set; }
    public decimal Amount { get; set; }
    public string BankBin { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountHolder { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public int Status { get; set; }
    public string StatusText { get; set; } = string.Empty;
    public string? TransferRef { get; set; }
    public DateTime? TransferredAt { get; set; }
    public string? FailureReason { get; set; }
    public string? RequestedByName { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RefundDisbursementSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int PageIndex { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class CancelDisbursementDto
{
    public string? Reason { get; set; }
}

public class RefundDisbursementSearchResultDto
{
    public List<RefundDisbursementDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TransferredAmount { get; set; }
}

// ===== NangCap25 VI: Báo cáo =====

/// <summary>VI.1 — Báo cáo tài chính giao dịch QR, ghi rõ người tạo mã QR</summary>
public class QrFinanceReportDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public int TotalCount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public List<QrCreatorStatDto> ByCreator { get; set; } = new();
    public List<QrFinanceItemDto> Items { get; set; } = new();
}

public class QrCreatorStatDto
{
    public string CreatorName { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
}

public class QrFinanceItemDto
{
    public Guid Id { get; set; }
    public string TxnRef { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public string? ReferenceType { get; set; }
    public string OrderInfo { get; set; } = string.Empty;
    public string? PatientName { get; set; }
    public decimal Amount { get; set; }
    public int Status { get; set; }
    public string StatusText { get; set; } = string.Empty;
    public string CreatorName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? PayDate { get; set; }
}

/// <summary>VI.2 — Báo cáo đối soát giao dịch QR ngân hàng với sao kê</summary>
public class BankReconciliationReportDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public string? BankCode { get; set; }
    public int TotalCount { get; set; }
    public decimal TotalAmount { get; set; }
    public int PaidCount { get; set; }
    public decimal PaidAmount { get; set; }
    public int PendingCount { get; set; }
    public decimal PendingAmount { get; set; }
    public int ExpiredCount { get; set; }
    public int FailedCount { get; set; }
    /// <summary>Đã paid + có mã tham chiếu ngân hàng (GatewayTxnRef)</summary>
    public int MatchedCount { get; set; }
    /// <summary>Đã paid nhưng THIẾU mã tham chiếu ngân hàng — cần đối soát lại</summary>
    public List<QrFinanceItemDto> UnmatchedPaid { get; set; } = new();
    public List<DailyStatDto> ByDay { get; set; } = new();
    public List<QrFinanceItemDto> Items { get; set; } = new();
}
