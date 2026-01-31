namespace HIS.Core.Entities;

/// <summary>
/// Phiếu thu - Receipt
/// </summary>
public class Receipt : BaseEntity
{
    public string ReceiptCode { get; set; } = string.Empty; // Số phiếu thu
    public DateTime ReceiptDate { get; set; }

    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public Guid? MedicalRecordId { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }

    public int ReceiptType { get; set; } // 1-Tạm ứng, 2-Thanh toán, 3-Hoàn trả
    public int PaymentMethod { get; set; } // 1-Tiền mặt, 2-Chuyển khoản, 3-Thẻ, 4-Ví điện tử

    public decimal Amount { get; set; }
    public decimal Discount { get; set; }
    public decimal FinalAmount { get; set; }

    public string? Note { get; set; }
    public int Status { get; set; } // 1-Đã thu, 2-Đã hủy

    // Nhân viên thu
    public Guid CashierId { get; set; }
    public virtual User Cashier { get; set; } = null!;

    // Sổ thu
    public Guid? CashBookId { get; set; }
    public virtual CashBook? CashBook { get; set; }

    // Navigation
    public virtual ICollection<ReceiptDetail> Details { get; set; } = new List<ReceiptDetail>();
}

/// <summary>
/// Chi tiết phiếu thu - ReceiptDetail
/// </summary>
public class ReceiptDetail : BaseEntity
{
    public Guid ReceiptId { get; set; }
    public virtual Receipt Receipt { get; set; } = null!;

    public Guid? ServiceRequestDetailId { get; set; }
    public virtual ServiceRequestDetail? ServiceRequestDetail { get; set; }

    public Guid? PrescriptionDetailId { get; set; }
    public virtual PrescriptionDetail? PrescriptionDetail { get; set; }

    public string? ItemCode { get; set; }
    public string? ItemName { get; set; }
    public int ItemType { get; set; } // 1-Dịch vụ, 2-Thuốc, 3-Vật tư

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public decimal Discount { get; set; }
    public decimal FinalAmount { get; set; }
}

/// <summary>
/// Bảng kê viện phí - InvoiceSummary
/// </summary>
public class InvoiceSummary : BaseEntity
{
    public string InvoiceCode { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }

    public Guid MedicalRecordId { get; set; }
    public virtual MedicalRecord MedicalRecord { get; set; } = null!;

    // Tổng chi phí
    public decimal TotalServiceAmount { get; set; } // Dịch vụ
    public decimal TotalMedicineAmount { get; set; } // Thuốc
    public decimal TotalSupplyAmount { get; set; } // Vật tư
    public decimal TotalBedAmount { get; set; } // Giường
    public decimal TotalAmount { get; set; }

    // BHYT chi trả
    public decimal InsuranceAmount { get; set; }
    public decimal PatientCoPayment { get; set; } // Đồng chi trả
    public decimal OutOfPocket { get; set; } // Ngoài BHYT

    // Bệnh nhân đã nộp
    public decimal DepositAmount { get; set; } // Tạm ứng
    public decimal PaidAmount { get; set; } // Đã thanh toán
    public decimal RefundAmount { get; set; } // Hoàn trả
    public decimal RemainingAmount { get; set; } // Còn nợ

    // Miễn giảm
    public decimal DiscountAmount { get; set; }
    public string? DiscountReason { get; set; }

    public int Status { get; set; } // 0-Chưa thanh toán, 1-Đã thanh toán, 2-Đã quyết toán
    public bool IsApprovedByAccountant { get; set; } // Đã duyệt kế toán
    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedBy { get; set; }
}

/// <summary>
/// Sổ thu tiền - CashBook
/// </summary>
public class CashBook : BaseEntity
{
    public string BookCode { get; set; } = string.Empty;
    public string BookName { get; set; } = string.Empty;
    public int BookType { get; set; } // 1-Thu tiền, 2-Tạm ứng
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    public Guid CashierId { get; set; }
    public virtual User Cashier { get; set; } = null!;

    public decimal OpeningBalance { get; set; }
    public decimal TotalReceipt { get; set; }
    public decimal TotalRefund { get; set; }
    public decimal ClosingBalance { get; set; }

    public bool IsClosed { get; set; }
    public DateTime? ClosedAt { get; set; }
    public string? Note { get; set; }

    // Navigation
    public virtual ICollection<Receipt> Receipts { get; set; } = new List<Receipt>();
}
