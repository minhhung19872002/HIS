namespace HIS.Core.Entities;

/// <summary>
/// Giao dịch cổng thanh toán - PaymentTransaction
/// Ghi log mọi giao dịch qua VNPay/MoMo/ZaloPay/Napas
/// </summary>
public class PaymentTransaction : BaseEntity
{
    public string TxnRef { get; set; } = string.Empty;
    public string? GatewayTxnRef { get; set; }

    public string Provider { get; set; } = string.Empty;

    public string OrderType { get; set; } = "other";
    public string OrderInfo { get; set; } = string.Empty;

    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public Guid? MedicalRecordId { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }

    public Guid? InvoiceSummaryId { get; set; }
    public virtual InvoiceSummary? InvoiceSummary { get; set; }

    public Guid? ReceiptId { get; set; }
    public virtual Receipt? Receipt { get; set; }

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "VND";

    public int Status { get; set; }
    public int? ResponseCode { get; set; }
    public string? ResponseMessage { get; set; }
    public string? BankCode { get; set; }
    public string? CardType { get; set; }
    public DateTime? PayDate { get; set; }

    public string PaymentUrl { get; set; } = string.Empty;
    public string? QrCodeData { get; set; }
    public string? SecureHash { get; set; }

    public string? RequestRaw { get; set; }
    public string? ResponseRaw { get; set; }
    public string? IpnRaw { get; set; }

    public string? IpAddress { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? RefundedAt { get; set; }
    public decimal RefundedAmount { get; set; }
    public string? RefundReason { get; set; }
}
