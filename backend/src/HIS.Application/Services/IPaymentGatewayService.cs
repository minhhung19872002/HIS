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
}
