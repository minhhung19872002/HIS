using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using HIS.Application.DTOs.Payment;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation cho VNPay, MoMo, ZaloPay + 5 ngân hàng VN qua VietQR (BIDV/VCB/Agribank/Vietinbank/MSB).
/// Các hằng số response code và signing algorithm theo tài liệu chính thức.
/// VietQR cho NH dùng partial class PaymentGatewayService.VietQR.cs.
/// </summary>
public partial class PaymentGatewayService : IPaymentGatewayService
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<PaymentGatewayService> _logger;

    public PaymentGatewayService(
        HISDbContext db,
        IConfiguration config,
        ILogger<PaymentGatewayService> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    public async Task<PaymentUrlResponseDto> CreatePaymentUrlAsync(
        CreatePaymentUrlDto dto,
        string ipAddress,
        Guid userId)
    {
        if (dto.Amount <= 0)
            throw new ArgumentException("Số tiền phải lớn hơn 0");

        var provider = (dto.Provider ?? "vnpay").ToLowerInvariant();

        var txnRef = BuildTxnRef();
        var expiresAt = DateTime.UtcNow.AddMinutes(15);

        var txn = new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            TxnRef = txnRef,
            Provider = provider,
            OrderType = dto.OrderType,
            OrderInfo = string.IsNullOrWhiteSpace(dto.OrderInfo)
                ? $"Thanh toan HIS {txnRef}"
                : dto.OrderInfo!,
            PatientId = dto.PatientId,
            MedicalRecordId = dto.MedicalRecordId,
            InvoiceSummaryId = dto.InvoiceSummaryId,
            Amount = dto.Amount,
            Currency = "VND",
            Status = 0,
            IpAddress = ipAddress,
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };

        string paymentUrl = provider switch
        {
            "vnpay" => BuildVnPayUrl(txn, dto, ipAddress),
            "momo" => BuildMoMoUrl(txn, dto),
            "zalopay" => BuildZaloPayUrl(txn, dto),
            "bidv" or "vcb" or "vietcombank" or "agribank" or "vietinbank" or "msb"
                => BuildBankVietQrUrl(txn, dto, provider),
            _ => throw new ArgumentException($"Provider không hỗ trợ: {provider}")
        };

        txn.PaymentUrl = paymentUrl;
        // Bank VietQR: BuildBankVietQrUrl đã set QrCodeData = chuỗi EMVCo — KHÔNG ghi đè
        // (trước đây bị clobber bằng image URL → FE không render QR offline được)
        if (string.IsNullOrEmpty(txn.QrCodeData))
            txn.QrCodeData = paymentUrl;

        _db.PaymentTransactions.Add(txn);
        await _db.SaveChangesAsync();

        return new PaymentUrlResponseDto
        {
            TransactionId = txn.Id,
            TxnRef = txn.TxnRef,
            PaymentUrl = paymentUrl,
            QrCodeDataUrl = paymentUrl,
            QrCodeContent = txn.QrCodeData,
            ExpiresAt = txn.ExpiresAt,
            Provider = provider,
            Amount = txn.Amount
        };
    }

    #region Helpers

    private async Task LinkReceiptAsync(PaymentTransaction txn, Guid cashierId = default)
    {
        // Receipts.CashierId là FK non-null tới Users.Id. Guid.Empty (hoặc id không
        // tồn tại trong Users) vi phạm FK_Receipts_Users_Cashier → INSERT fail → 500.
        // Resolve về user xác nhận (kế toán); nếu không có context (IPN online) thì
        // fallback về tài khoản admin / user hệ thống đầu tiên.
        var validCashierId = cashierId;
        if (validCashierId == Guid.Empty || !await _db.Users.AnyAsync(u => u.Id == validCashierId))
        {
            validCashierId = await _db.Users
                .Where(u => u.Username == "admin").Select(u => u.Id).FirstOrDefaultAsync();
            if (validCashierId == Guid.Empty)
                validCashierId = await _db.Users.Select(u => u.Id).FirstOrDefaultAsync();
        }

        var receipt = new Receipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"PT{DateTime.Now:yyyyMMddHHmmss}{txn.TxnRef[^4..]}",
            ReceiptDate = DateTime.Now,
            PatientId = txn.PatientId,
            MedicalRecordId = txn.MedicalRecordId,
            ReceiptType = 2,
            PaymentMethod = MapProviderToPaymentMethod(txn.Provider),
            Amount = txn.Amount,
            Discount = 0,
            FinalAmount = txn.Amount,
            Status = 1,
            CashierId = validCashierId,
            Note = $"Thanh toán qua {txn.Provider.ToUpper()} — mã GD: {txn.GatewayTxnRef ?? txn.TxnRef}",
            CreatedAt = DateTime.UtcNow
        };

        _db.Receipts.Add(receipt);
        txn.ReceiptId = receipt.Id;

        if (txn.InvoiceSummaryId.HasValue)
        {
            var invoice = await _db.InvoiceSummaries.FirstOrDefaultAsync(i => i.Id == txn.InvoiceSummaryId.Value);
            if (invoice != null)
            {
                invoice.PaidAmount += txn.Amount;
                invoice.RemainingAmount = Math.Max(0, invoice.RemainingAmount - txn.Amount);
                if (invoice.RemainingAmount <= 0) invoice.Status = 1;
            }
        }

        // N1.01 — Auto-issue E-invoice (HDDT) sau payment success
        await AutoIssueElectronicInvoiceAsync(txn, receipt);

        // NangCap25 — cập nhật ngược bản ghi nguồn của QR động (chỉ định/tạm ứng/kiosk...)
        await ApplyPaidReferenceAsync(txn, validCashierId);
    }

    private async Task AutoIssueElectronicInvoiceAsync(PaymentTransaction txn, Receipt receipt)
    {
        try
        {
            var patient = await _db.Patients.FirstOrDefaultAsync(p => p.Id == txn.PatientId);
            if (patient == null) return;

            // Sinh mã HĐĐT chuẩn theo pattern nhà cung cấp (VNInvoice/Misa)
            var year = DateTime.Now.Year.ToString("yy");
            var lastInvoice = await _db.ElectronicInvoices
                .Where(i => i.InvoiceSeries.StartsWith(year))
                .OrderByDescending(i => i.InvoiceNumber)
                .FirstOrDefaultAsync();
            var nextNo = 1;
            if (lastInvoice != null && int.TryParse(lastInvoice.InvoiceNumber, out var n)) nextNo = n + 1;

            // Items JSON: 1 dòng tổng hợp (có thể bổ sung chi tiết từ InvoiceSummary sau)
            var itemsJson = System.Text.Json.JsonSerializer.Serialize(new[]
            {
                new
                {
                    name = txn.OrderInfo,
                    unit = "Lượt",
                    qty = 1,
                    price = (double)(txn.Amount / 1.08m),
                    amount = (double)(txn.Amount / 1.08m),
                    vatRate = 8,
                    vatAmount = (double)(txn.Amount - txn.Amount / 1.08m),
                }
            });

            var vatRate = 8m;
            var subTotal = Math.Round(txn.Amount / (1 + vatRate / 100), 0);
            var vatAmount = txn.Amount - subTotal;

            var eInvoice = new ElectronicInvoice
            {
                Id = Guid.NewGuid(),
                InvoiceSeries = $"{year}HIS",
                InvoiceNumber = nextNo.ToString("D7"),
                InvoiceDate = DateTime.Now,
                InvoiceSummaryId = txn.InvoiceSummaryId,
                PatientId = txn.PatientId,
                MedicalRecordId = txn.MedicalRecordId,
                PatientName = patient.FullName ?? "N/A",
                PatientAddress = patient.Address,
                BuyerName = patient.FullName,
                PaymentMethod = MapProviderToInvoicePaymentMethod(txn.Provider),
                SubTotal = subTotal,
                VatRate = vatRate,
                VatAmount = vatAmount,
                TotalAmount = txn.Amount,
                DiscountAmount = 0,
                ItemsJson = itemsJson,
                Status = 1, // Issued
                ProviderName = "HIS-Auto",
                ProviderInvoiceId = $"AUTO-{txn.TxnRef}",
                LookupCode = txn.TxnRef[^8..].ToUpper(),
                LookupUrl = $"/tra-cuu-hddt/{txn.TxnRef}",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = txn.CreatedBy
            };
            _db.ElectronicInvoices.Add(eInvoice);
            _logger.LogInformation("Auto-issued e-invoice {Series}-{No} for txn {TxnRef}",
                eInvoice.InvoiceSeries, eInvoice.InvoiceNumber, txn.TxnRef);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to auto-issue e-invoice for txn {TxnRef}", txn.TxnRef);
        }
    }

    private static string MapProviderToInvoicePaymentMethod(string provider) => provider switch
    {
        "vnpay" => "CK",
        "momo" or "zalopay" => "CK",
        _ => "TM"
    };

    private static int MapProviderToPaymentMethod(string provider) => provider switch
    {
        "vnpay" => 2,
        "momo" => 4,
        "zalopay" => 4,
        _ => 2
    };

    private static string MapVnPayOrderType(string orderType) => orderType.ToLower() switch
    {
        "billing" or "invoice" => "170000",
        "deposit" or "advance" => "250000",
        _ => "other"
    };

    private static string SanitizeOrderInfo(string info)
    {
        // VNPay yêu cầu ASCII-only cho một số field (nhất là khi dùng sandbox).
        return string.IsNullOrWhiteSpace(info) ? "Thanh toan HIS" : info.Replace("&", "").Replace("?", "");
    }

    private static string BuildTxnRef()
    {
        var t = DateTime.UtcNow;
        var rnd = Random.Shared.Next(1000, 9999);
        return $"HIS{t:yyyyMMddHHmmss}{rnd}";
    }

    private static string HmacSha512(string key, string data)
    {
        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        var sb = new StringBuilder(hash.Length * 2);
        foreach (var b in hash) sb.Append(b.ToString("x2"));
        return sb.ToString();
    }

    private static string MapVnPayResponseCode(string code) => code switch
    {
        "00" => "Giao dịch thành công",
        "07" => "Trừ tiền thành công. Giao dịch bị nghi ngờ (gian lận / bất thường)",
        "09" => "Thẻ/Tài khoản chưa đăng ký InternetBanking",
        "10" => "Xác thực sai quá 3 lần",
        "11" => "Đã hết hạn chờ thanh toán",
        "12" => "Thẻ/Tài khoản bị khóa",
        "13" => "Sai mật khẩu OTP",
        "24" => "Khách hàng hủy giao dịch",
        "51" => "Tài khoản không đủ số dư",
        "65" => "Vượt hạn mức giao dịch trong ngày",
        "75" => "Ngân hàng thanh toán đang bảo trì",
        "79" => "Sai mật khẩu thanh toán quá số lần quy định",
        "99" => "Lỗi khác",
        _ => $"Mã lỗi: {code}"
    };

    private static PaymentTransactionDto MapToDto(PaymentTransaction t) => new()
    {
        Id = t.Id,
        TxnRef = t.TxnRef,
        GatewayTxnRef = t.GatewayTxnRef,
        Provider = t.Provider,
        OrderType = t.OrderType,
        OrderInfo = t.OrderInfo,
        PatientId = t.PatientId,
        PatientName = t.Patient?.FullName,
        PatientCode = t.Patient?.PatientCode,
        InvoiceSummaryId = t.InvoiceSummaryId,
        ReceiptId = t.ReceiptId,
        Amount = t.Amount,
        Status = t.Status,
        StatusText = t.Status switch
        {
            0 => "Chờ thanh toán",
            1 => "Đã thanh toán",
            2 => "Thất bại",
            3 => "Đã hoàn tiền",
            4 => "Hết hạn",
            _ => "Không xác định"
        },
        ResponseCode = t.ResponseCode,
        ResponseMessage = t.ResponseMessage,
        BankCode = t.BankCode,
        CardType = t.CardType,
        PayDate = t.PayDate,
        ExpiresAt = t.ExpiresAt,
        CompletedAt = t.CompletedAt,
        CreatedAt = t.CreatedAt,
        RefundedAmount = t.RefundedAmount,
        QrCodeContent = t.QrCodeData,
        ReferenceType = t.ReferenceType,
        ReferenceId = t.ReferenceId
    };

    #endregion
}
