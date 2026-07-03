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

    // NangCap25: QR động gắn nguồn nghiệp vụ — khi paid sẽ tự cập nhật nguồn
    // (service-request | prescription | retail-sale | deposit | discharge | kiosk)
    public string? ReferenceType { get; set; }
    public Guid? ReferenceId { get; set; }
    /// <summary>Snapshot JSON phụ trợ (vd danh sách ServiceRequestId gộp trong QR kiosk)</summary>
    public string? ReferenceData { get; set; }
}

/// <summary>
/// NangCap25 IV: Chi hộ hoàn tiền thừa cho bệnh nhân qua tài khoản ngân hàng BV (Vietcombank).
/// Chưa có API giải ngân thật từ VCB → chạy MockMode; khi có merchant contract thì wire API thật.
/// </summary>
public class RefundDisbursement : BaseEntity
{
    public string DisbursementCode { get; set; } = string.Empty; // CH-yyyyMMdd-xxxx

    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public Guid? MedicalRecordId { get; set; }
    /// <summary>Giao dịch thanh toán gốc phát sinh tiền thừa (nếu có)</summary>
    public Guid? PaymentTransactionId { get; set; }

    public decimal Amount { get; set; }

    // Tài khoản nhận của bệnh nhân
    public string BankBin { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountHolder { get; set; } = string.Empty;

    public string? Reason { get; set; }

    /// <summary>0-Chờ duyệt, 1-Đã duyệt, 2-Đã chi (hoàn tất), 3-Thất bại, 4-Hủy</summary>
    public int Status { get; set; }

    public string? TransferRef { get; set; }       // Mã lệnh chi từ ngân hàng
    public DateTime? TransferredAt { get; set; }
    public string? FailureReason { get; set; }
    public string? ResponseRaw { get; set; }

    public Guid RequestedBy { get; set; }
    public Guid? ApprovedBy { get; set; }
}
