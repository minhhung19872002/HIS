using HIS.Application.DTOs.Payment;

namespace HIS.Application.Services;

/// <summary>
/// Payment gateway service cho VNPay, MoMo, ZaloPay.
/// Tạo QR động, xử lý IPN webhook, hoàn tiền, báo cáo.
/// </summary>
public interface IPaymentGatewayService
{
    Task<PaymentUrlResponseDto> CreatePaymentUrlAsync(
        CreatePaymentUrlDto dto,
        string ipAddress,
        Guid userId);

    Task<VnPayIpnResultDto> HandleVnPayIpnAsync(Dictionary<string, string> queryParams);

    Task<PaymentTransactionDto?> HandleVnPayReturnAsync(Dictionary<string, string> queryParams);

    Task<VnPayIpnResultDto> HandleMoMoIpnAsync(Dictionary<string, object> body);

    Task<VnPayIpnResultDto> HandleZaloPayCallbackAsync(Dictionary<string, object> body);

    Task<PaymentTransactionDto?> GetTransactionByRefAsync(string txnRef);

    Task<PaymentTransactionDto?> GetTransactionByIdAsync(Guid id);

    Task<PaymentSearchResultDto> SearchAsync(PaymentSearchDto dto);

    Task<PaymentTransactionDto> RefundAsync(PaymentRefundDto dto, Guid userId);

    Task<PaymentStatsDto> GetStatsAsync(DateTime fromDate, DateTime toDate, string? provider);

    Task<bool> MarkExpiredAsync();

    /// <summary>
    /// Xác nhận thủ công giao dịch bank-VietQR (BIDV/VCB/Agribank/Vietinbank/MSB).
    /// Dùng cho BV chưa có merchant API contract — kế toán đối soát sao kê và confirm.
    /// </summary>
    Task<PaymentTransactionDto> ConfirmBankTransferAsync(BankConfirmDto dto, Guid userId);

    // ===== NangCap25: QR động theo ngữ cảnh nghiệp vụ =====

    /// <summary>
    /// Sinh QR động gắn nguồn nghiệp vụ (chỉ định CLS / đơn thuốc / bán lẻ quầy thuốc /
    /// tạm ứng nội trú / thanh toán ra viện). Số tiền tính ở BE; khi paid tự cập nhật nguồn.
    /// </summary>
    Task<PaymentUrlResponseDto> CreateDynamicQrAsync(DynamicQrRequestDto dto, string ipAddress, Guid userId);

    /// <summary>Kiosk tự phục vụ: tra khoản chờ thanh toán theo mã BN + ngày sinh, sinh QR gộp.</summary>
    Task<KioskQrResponseDto> CreateKioskQrAsync(KioskQrRequestDto dto, string ipAddress);

    /// <summary>
    /// Block HTML nhúng QR thanh toán vào phiếu in (đơn thuốc / phiếu chỉ định / tạm ứng / ra viện).
    /// KHÔNG bao giờ throw — nguồn đã thanh toán / không còn nợ / lỗi → trả chuỗi rỗng (phiếu in bình thường).
    /// </summary>
    Task<string> BuildPrintQrBlockHtmlAsync(DynamicQrRequestDto dto, Guid userId);

    /// <summary>VI.1 — Báo cáo tài chính giao dịch QR ngân hàng, ghi rõ người tạo mã QR.</summary>
    Task<QrFinanceReportDto> GetQrFinanceReportAsync(DateTime fromDate, DateTime toDate);

    /// <summary>VI.2 — Báo cáo đối soát giao dịch QR với ngân hàng.</summary>
    Task<BankReconciliationReportDto> GetBankReconciliationAsync(DateTime fromDate, DateTime toDate, string? bankCode);
}
