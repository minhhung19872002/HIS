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

    private string BuildZaloPayUrl(PaymentTransaction txn, CreatePaymentUrlDto dto)
    {
        var cfg = _config.GetSection("PaymentGateway:ZaloPay");
        var appId = cfg["AppId"] ?? "2553";
        var key1 = cfg["Key1"] ?? "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL";
        var endpoint = cfg["Endpoint"] ?? "https://sb-openapi.zalopay.vn/v2/create";
        var callbackUrl = cfg["CallbackUrl"] ?? "http://localhost:5106/api/payment/zalopay/callback";

        // app_trans_id format: yyMMdd_xxxxxx (ZaloPay required)
        var tzVn = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        var nowVn = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tzVn);
        var appTransId = $"{nowVn:yyMMdd}_{txn.TxnRef[^6..]}";

        var embedData = System.Text.Json.JsonSerializer.Serialize(new { redirecturl = dto.OrderInfo ?? "HIS" });
        var item = "[]";
        var amount = ((long)txn.Amount).ToString();
        var appUser = txn.PatientId.ToString();
        var appTime = ((DateTimeOffset)DateTime.UtcNow).ToUnixTimeMilliseconds().ToString();
        var description = SanitizeOrderInfo(txn.OrderInfo);

        // MAC: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
        var rawSignature = $"{appId}|{appTransId}|{appUser}|{amount}|{appTime}|{embedData}|{item}";
        var mac = HmacSha256(key1, rawSignature);

        var formData = new Dictionary<string, string>
        {
            ["app_id"] = appId,
            ["app_user"] = appUser,
            ["app_time"] = appTime,
            ["amount"] = amount,
            ["app_trans_id"] = appTransId,
            ["embed_data"] = embedData,
            ["item"] = item,
            ["description"] = description,
            ["bank_code"] = "",
            ["callback_url"] = callbackUrl,
            ["mac"] = mac,
        };
        txn.RequestRaw = string.Join("&", formData.Select(kv => $"{kv.Key}={kv.Value}"));

        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
        var resp = http.PostAsync(endpoint, new FormUrlEncodedContent(formData))
            .GetAwaiter().GetResult();
        var body = resp.Content.ReadAsStringAsync().GetAwaiter().GetResult();
        txn.ResponseRaw = body;

        try
        {
            var doc = System.Text.Json.JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("order_url", out var orderUrl))
                return orderUrl.GetString() ?? endpoint;
        }
        catch { /* fallback */ }
        return endpoint;
    }

    public async Task<VnPayIpnResultDto> HandleZaloPayCallbackAsync(Dictionary<string, object> body)
    {
        var cfg = _config.GetSection("PaymentGateway:ZaloPay");
        var key2 = cfg["Key2"] ?? "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz";

        var data = body.GetValueOrDefault("data")?.ToString();
        var mac = body.GetValueOrDefault("mac")?.ToString();
        if (string.IsNullOrEmpty(data) || string.IsNullOrEmpty(mac))
            return new VnPayIpnResultDto { RspCode = "99", Message = "data/mac required" };

        var computed = HmacSha256(key2, data);
        if (computed != mac)
        {
            _logger.LogWarning("ZaloPay callback invalid MAC");
            return new VnPayIpnResultDto { RspCode = "97", Message = "Invalid MAC" };
        }

        var dataJson = System.Text.Json.JsonDocument.Parse(data);
        var appTransId = dataJson.RootElement.GetProperty("app_trans_id").GetString();
        var zpTransId = dataJson.RootElement.GetProperty("zp_trans_id").GetInt64().ToString();

        // app_trans_id format: yyMMdd_xxxxxx → match txn via last 6 chars against our TxnRef
        if (string.IsNullOrEmpty(appTransId)) return new VnPayIpnResultDto { RspCode = "01", Message = "Not found" };
        var suffix = appTransId.Split('_').LastOrDefault();
        if (suffix == null) return new VnPayIpnResultDto { RspCode = "01", Message = "Invalid format" };

        var txn = await _db.PaymentTransactions.FirstOrDefaultAsync(t => t.TxnRef.EndsWith(suffix));
        if (txn == null) return new VnPayIpnResultDto { RspCode = "01", Message = "Order not found" };
        if (txn.Status == 1) return new VnPayIpnResultDto { RspCode = "02", Message = "Already confirmed" };

        txn.GatewayTxnRef = zpTransId;
        txn.IpnRaw = System.Text.Json.JsonSerializer.Serialize(body);
        txn.Status = 1;
        txn.CompletedAt = DateTime.UtcNow;
        txn.PayDate = DateTime.UtcNow;
        txn.UpdatedAt = DateTime.UtcNow;

        await LinkReceiptAsync(txn);
        await _db.SaveChangesAsync();
        return new VnPayIpnResultDto { RspCode = "00", Message = "Confirm Success" };
    }

}
