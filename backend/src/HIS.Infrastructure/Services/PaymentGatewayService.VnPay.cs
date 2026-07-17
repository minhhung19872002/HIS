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

public partial class PaymentGatewayService
{
    private string BuildVnPayUrl(PaymentTransaction txn, CreatePaymentUrlDto dto, string ipAddress)
    {
        var cfg = _config.GetSection("PaymentGateway:VnPay");
        var tmnCode = cfg["TmnCode"] ?? "TEST2024";
        var hashSecret = cfg["HashSecret"] ?? "SANDBOXSECRET00000000000000000000";
        var baseUrl = cfg["PaymentUrl"] ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
        var returnUrl = cfg["ReturnUrl"] ?? "http://localhost:3001/payment/vnpay-return";

        var vnpParams = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Version"] = "2.1.0",
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = tmnCode,
            ["vnp_Amount"] = ((long)(txn.Amount * 100)).ToString(CultureInfo.InvariantCulture),
            ["vnp_CreateDate"] = DateTime.Now.ToString("yyyyMMddHHmmss"),
            ["vnp_CurrCode"] = "VND",
            ["vnp_IpAddr"] = string.IsNullOrWhiteSpace(ipAddress) ? "127.0.0.1" : ipAddress,
            ["vnp_Locale"] = dto.Language == "en" ? "en" : "vn",
            ["vnp_OrderInfo"] = SanitizeOrderInfo(txn.OrderInfo),
            ["vnp_OrderType"] = MapVnPayOrderType(txn.OrderType),
            ["vnp_ReturnUrl"] = returnUrl,
            ["vnp_TxnRef"] = txn.TxnRef,
            ["vnp_ExpireDate"] = txn.ExpiresAt.ToLocalTime().ToString("yyyyMMddHHmmss")
        };

        if (!string.IsNullOrWhiteSpace(dto.BankCode))
            vnpParams["vnp_BankCode"] = dto.BankCode!;

        var queryString = string.Join("&",
            vnpParams.Select(kv =>
                $"{WebUtility.UrlEncode(kv.Key)}={WebUtility.UrlEncode(kv.Value)}"));

        var secureHash = HmacSha512(hashSecret, queryString);

        return $"{baseUrl}?{queryString}&vnp_SecureHash={secureHash}";
    }

    public async Task<VnPayIpnResultDto> HandleVnPayIpnAsync(Dictionary<string, string> queryParams)
    {
        var cfg = _config.GetSection("PaymentGateway:VnPay");
        var hashSecret = cfg["HashSecret"] ?? "SANDBOXSECRET00000000000000000000";

        if (!queryParams.TryGetValue("vnp_TxnRef", out var txnRef) ||
            !queryParams.TryGetValue("vnp_SecureHash", out var secureHash))
        {
            return new VnPayIpnResultDto { RspCode = "99", Message = "Input required" };
        }

        if (!VerifyVnPaySignature(queryParams, hashSecret, secureHash))
        {
            _logger.LogWarning("VNPay IPN invalid signature for txnRef={TxnRef}", txnRef);
            return new VnPayIpnResultDto { RspCode = "97", Message = "Invalid signature" };
        }

        var txn = await _db.PaymentTransactions.FirstOrDefaultAsync(t => t.TxnRef == txnRef);
        if (txn == null)
            return new VnPayIpnResultDto { RspCode = "01", Message = "Order not found" };

        if (txn.Status == 1)
            return new VnPayIpnResultDto { RspCode = "02", Message = "Order already confirmed" };

        var amountParam = queryParams.GetValueOrDefault("vnp_Amount", "0");
        var amountLong = long.TryParse(amountParam, out var a) ? a : 0;
        var expectedAmount = (long)(txn.Amount * 100);
        if (amountLong != expectedAmount)
            return new VnPayIpnResultDto { RspCode = "04", Message = "Amount mismatch" };

        var responseCode = queryParams.GetValueOrDefault("vnp_ResponseCode", "99");
        var transactionStatus = queryParams.GetValueOrDefault("vnp_TransactionStatus", "99");
        var payDateStr = queryParams.GetValueOrDefault("vnp_PayDate", "");

        txn.ResponseCode = int.TryParse(responseCode, out var rc) ? rc : (int?)null;
        txn.ResponseMessage = MapVnPayResponseCode(responseCode);
        txn.BankCode = queryParams.GetValueOrDefault("vnp_BankCode");
        txn.CardType = queryParams.GetValueOrDefault("vnp_CardType");
        txn.GatewayTxnRef = queryParams.GetValueOrDefault("vnp_TransactionNo");
        txn.SecureHash = secureHash;
        txn.IpnRaw = string.Join("&", queryParams.Select(kv => $"{kv.Key}={kv.Value}"));

        if (responseCode == "00" && transactionStatus == "00")
        {
            txn.Status = 1;
            txn.CompletedAt = DateTime.UtcNow;
            txn.PayDate = ParseVnPayDate(payDateStr);
            await LinkReceiptAsync(txn);
        }
        else
        {
            txn.Status = 2;
        }
        txn.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return new VnPayIpnResultDto { RspCode = "00", Message = "Confirm Success" };
    }

    public async Task<PaymentTransactionDto?> HandleVnPayReturnAsync(Dictionary<string, string> queryParams)
    {
        if (!queryParams.TryGetValue("vnp_TxnRef", out var txnRef))
            return null;

        var cfg = _config.GetSection("PaymentGateway:VnPay");
        var hashSecret = cfg["HashSecret"] ?? "SANDBOXSECRET00000000000000000000";
        var secureHash = queryParams.GetValueOrDefault("vnp_SecureHash", "");

        if (!VerifyVnPaySignature(queryParams, hashSecret, secureHash))
        {
            _logger.LogWarning("VNPay Return invalid signature for txnRef={TxnRef}", txnRef);
        }

        var txn = await _db.PaymentTransactions
            .Include(t => t.Patient)
            .FirstOrDefaultAsync(t => t.TxnRef == txnRef);
        return txn == null ? null : MapToDto(txn);
    }

    private static bool VerifyVnPaySignature(
        IDictionary<string, string> queryParams,
        string hashSecret,
        string receivedHash)
    {
        var filtered = new SortedDictionary<string, string>(StringComparer.Ordinal);
        foreach (var kv in queryParams)
        {
            if (kv.Key.StartsWith("vnp_") && kv.Key != "vnp_SecureHash" && kv.Key != "vnp_SecureHashType")
                filtered[kv.Key] = kv.Value;
        }

        var queryString = string.Join("&",
            filtered.Select(kv =>
                $"{WebUtility.UrlEncode(kv.Key)}={WebUtility.UrlEncode(kv.Value)}"));

        var computed = HmacSha512(hashSecret, queryString);
        return string.Equals(computed, receivedHash, StringComparison.OrdinalIgnoreCase);
    }

    private static DateTime? ParseVnPayDate(string raw)
    {
        if (DateTime.TryParseExact(raw, "yyyyMMddHHmmss",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
            return dt;
        return null;
    }

}
