namespace HIS.Application.Services;

/// <summary>
/// Một dòng hàng hóa/dịch vụ trên hóa đơn điện tử (HĐĐT).
/// Map từ <c>ElectronicInvoice.ItemsJson</c> / receipt details — KHÔNG bịa field.
/// </summary>
public sealed class EInvoiceItem
{
    public string Name { get; init; } = string.Empty;   // Tên hàng hóa/dịch vụ
    public string Unit { get; init; } = "Lần";          // Đơn vị tính
    public decimal Quantity { get; init; } = 1;          // Số lượng
    public decimal UnitPrice { get; init; }              // Đơn giá (chưa thuế)
    public decimal Amount { get; init; }                 // Thành tiền (chưa thuế)
    public decimal VatRate { get; init; } = 8;           // % thuế GTGT
}

/// <summary>
/// Yêu cầu phát hành HĐĐT gửi tới nhà cung cấp (NCC) — chỉ chứa field có thật
/// trên entity <see cref="HIS.Core.Entities.ElectronicInvoice"/>.
/// </summary>
public sealed class EInvoiceRequest
{
    public Guid EInvoiceId { get; init; }                 // Mã hóa đơn nội bộ (Id entity)
    public string InvoiceSeries { get; init; } = string.Empty; // Ký hiệu (vd "1C24TAA")
    public string InvoiceNumber { get; init; } = string.Empty; // Số hóa đơn nội bộ (NCC có thể cấp lại)
    public DateTime InvoiceDate { get; init; }

    public string BuyerName { get; init; } = string.Empty; // Tên người mua
    public string? BuyerAddress { get; init; }
    public string? BuyerTaxCode { get; init; }             // MST người mua (nếu có)
    public string? BuyerEmail { get; init; }
    public string PaymentMethod { get; init; } = "TM";     // TM/CK/TM-CK

    public decimal SubTotal { get; init; }                 // Tiền hàng trước thuế
    public decimal VatRate { get; init; } = 8;
    public decimal VatAmount { get; init; }
    public decimal DiscountAmount { get; init; }
    public decimal TotalAmount { get; init; }              // Tổng tiền thanh toán

    public IReadOnlyList<EInvoiceItem> Items { get; init; } = Array.Empty<EInvoiceItem>();
}

/// <summary>
/// Kết quả phát hành HĐĐT trả về từ NCC.
/// </summary>
public sealed class EInvoiceResult
{
    public bool Success { get; init; }
    /// <summary>NCC chưa bật/đủ thông tin cấu hình → caller fallback an toàn (không vỡ luồng).</summary>
    public bool NotConfigured { get; init; }

    public string? ProviderInvoiceId { get; init; }  // ID hóa đơn do NCC cấp
    public string? InvoiceNumber { get; init; }      // Số hóa đơn chính thức (nếu NCC cấp lại)
    public string? TaxAuthorityCode { get; init; }   // Mã CQT (mã cơ quan thuế cấp)
    public string? LookupCode { get; init; }         // Mã tra cứu
    public string? LookupUrl { get; init; }          // URL tra cứu

    public string? ErrorCode { get; init; }
    public string? ErrorMessage { get; init; }
    public string RawResponse { get; init; } = string.Empty;

    public static EInvoiceResult Disabled() => new()
    {
        Success = false,
        NotConfigured = true,
        ErrorCode = "EINVOICE_NOT_CONFIGURED",
        ErrorMessage = "HĐĐT chưa cấu hình nhà cung cấp (EInvoice). Cần điền endpoint/tài khoản/ký hiệu qua env."
    };
}

/// <summary>
/// Provider HĐĐT cắm-thay-được. Mỗi NCC (VNPT/Viettel/Misa/...) cài 1 implementation,
/// bind qua DI. Service layer chỉ phụ thuộc interface này — không biết NCC cụ thể.
/// Cấu hình đọc từ <c>IConfiguration</c> section "EInvoice:*" (KHÔNG hardcode secret).
/// </summary>
public interface IElectronicInvoiceProvider
{
    /// <summary>Đã bật + đủ thông tin cấu hình để gọi NCC thật chưa.</summary>
    bool IsConfigured { get; }

    /// <summary>Phát hành 1 HĐĐT qua NCC. Trả <see cref="EInvoiceResult"/> (không throw cho lỗi nghiệp vụ/cấu hình).</summary>
    Task<EInvoiceResult> IssueAsync(EInvoiceRequest req, CancellationToken ct = default);
}
