namespace HIS.Core.Entities;

/// <summary>
/// Hóa đơn điện tử (HĐĐT) đa NCC — VNPT / Viettel / MISA. Issue #24.
/// Bảng EInvoices (migration 135). KHÔNG FK cứng tới Receipts (tránh schema-drift).
/// </summary>
public class EInvoice : BaseEntity
{
    /// <summary>Liên kết phiếu thu (nullable — không FK cứng).</summary>
    public Guid? ReceiptId { get; set; }

    /// <summary>Nhà cung cấp: VNPT / Viettel / MISA.</summary>
    public string Provider { get; set; } = string.Empty;

    /// <summary>Số hóa đơn NCC cấp.</summary>
    public string? InvoiceNo { get; set; }

    /// <summary>Mã CQT (cơ quan thuế).</summary>
    public string? InvoiceCode { get; set; }

    /// <summary>Mẫu số hóa đơn.</summary>
    public string? TemplateCode { get; set; }

    /// <summary>Ký hiệu hóa đơn.</summary>
    public string? SerialNo { get; set; }

    /// <summary>0=draft, 1=issued, 2=signed, 3=cancelled, 4=failed.</summary>
    public int Status { get; set; }

    /// <summary>Tổng tiền hóa đơn (lấy từ Receipt.FinalAmount khi phát hành).</summary>
    public decimal TotalAmount { get; set; }

    /// <summary>Tiền thuế (nếu có).</summary>
    public decimal? TaxAmount { get; set; }

    /// <summary>Thời điểm phát hành.</summary>
    public DateTime? IssuedAt { get; set; }

    /// <summary>Raw response JSON từ NCC (giữ nguyên bản gốc).</summary>
    public string? PortalResponse { get; set; }

    /// <summary>Thông báo lỗi khi Status=4.</summary>
    public string? ErrorMessage { get; set; }
}
