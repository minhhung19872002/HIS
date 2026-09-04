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

    private string BuildMoMoUrl(PaymentTransaction txn, CreatePaymentUrlDto dto)
    {
        var cfg = _config.GetSection("PaymentGateway:MoMo");
        var partnerCode = cfg["PartnerCode"] ?? "MOMOSANDBOX";
        var accessKey = cfg["AccessKey"] ?? "F8BBA842ECF85";
        var secretKey = cfg["SecretKey"] ?? "K951B6PE1waDMi640xX08PD3vg6EkVlz";
        var endpoint = cfg["Endpoint"] ?? "https://test-payment.momo.vn/v2/gateway/api/create";
        var returnUrl = cfg["ReturnUrl"] ?? "http://localhost:3001/payment/momo-return";
        var ipnUrl = cfg["IpnUrl"] ?? "http://localhost:5106/api/payment/momo/ipn";

        var requestId = Guid.NewGuid().ToString();
        var orderInfo = SanitizeOrderInfo(txn.OrderInfo);
        var amount = ((long)txn.Amount).ToString();
        var requestType = "captureWallet";
        var extraData = "";

        // rawSignature theo MoMo v2 spec
        var rawSignature = $"accessKey={accessKey}&amount={amount}&extraData={extraData}" +
                          $"&ipnUrl={ipnUrl}&orderId={txn.TxnRef}&orderInfo={orderInfo}" +
                          $"&partnerCode={partnerCode}&redirectUrl={returnUrl}" +
                          $"&requestId={requestId}&requestType={requestType}";
        var signature = HmacSha256(secretKey, rawSignature);

        var payload = System.Text.Json.JsonSerializer.Serialize(new
        {
            partnerCode,
            partnerName = "HIS Hospital",
            storeId = "HIS",
            requestId,
            amount,
            orderId = txn.TxnRef,
            orderInfo,
            redirectUrl = returnUrl,
            ipnUrl,
            lang = "vi",
            extraData,
            requestType,
            signature,
        });

        txn.RequestRaw = payload;

        // Gọi MoMo API đồng bộ để lấy payUrl
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
        var resp = http.PostAsync(endpoint, new StringContent(payload, Encoding.UTF8, "application/json"))
            .GetAwaiter().GetResult();
        var body = resp.Content.ReadAsStringAsync().GetAwaiter().GetResult();
        txn.ResponseRaw = body;

        try
        {
            var doc = System.Text.Json.JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("payUrl", out var payUrl))
                return payUrl.GetString() ?? endpoint;
        }
        catch { /* swallow — return fallback URL */ }
        return endpoint;
    }

    public async Task<VnPayIpnResultDto> HandleMoMoIpnAsync(Dictionary<string, object> body)
    {
        var cfg = _config.GetSection("PaymentGateway:MoMo");
        var accessKey = cfg["AccessKey"] ?? "F8BBA842ECF85";
        var secretKey = cfg["SecretKey"] ?? "K951B6PE1waDMi640xX08PD3vg6EkVlz";

        var orderId = body.GetValueOrDefault("orderId")?.ToString();
        var signature = body.GetValueOrDefault("signature")?.ToString();
        var resultCode = body.GetValueOrDefault("resultCode")?.ToString();
        var amount = body.GetValueOrDefault("amount")?.ToString();
        var transId = body.GetValueOrDefault("transId")?.ToString();

        if (string.IsNullOrEmpty(orderId)) return new VnPayIpnResultDto { RspCode = "99", Message = "orderId required" };

        var txn = await _db.PaymentTransactions.FirstOrDefaultAsync(t => t.TxnRef == orderId);
        if (txn == null) return new VnPayIpnResultDto { RspCode = "01", Message = "Order not found" };

        // Verify signature
        var partnerCode = body.GetValueOrDefault("partnerCode")?.ToString() ?? "";
        var requestId = body.GetValueOrDefault("requestId")?.ToString() ?? "";
        var orderInfo = body.GetValueOrDefault("orderInfo")?.ToString() ?? "";
        var orderType = body.GetValueOrDefault("orderType")?.ToString() ?? "";
        var payType = body.GetValueOrDefault("payType")?.ToString() ?? "";
        var responseTime = body.GetValueOrDefault("responseTime")?.ToString() ?? "";
        var extraData = body.GetValueOrDefault("extraData")?.ToString() ?? "";
        var message = body.GetValueOrDefault("message")?.ToString() ?? "";

        var rawSignature = $"accessKey={accessKey}&amount={amount}&extraData={extraData}" +
                          $"&message={message}&orderId={orderId}&orderInfo={orderInfo}" +
                          $"&orderType={orderType}&partnerCode={partnerCode}" +
                          $"&payType={payType}&requestId={requestId}&responseTime={responseTime}" +
                          $"&resultCode={resultCode}&transId={transId}";
        var computed = HmacSha256(secretKey, rawSignature);
        if (computed != signature)
        {
            _logger.LogWarning("MoMo IPN invalid signature for {OrderId}", orderId);
            return new VnPayIpnResultDto { RspCode = "97", Message = "Invalid signature" };
        }

        if (txn.Status == 1) return new VnPayIpnResultDto { RspCode = "02", Message = "Already confirmed" };

        // #218/T3: đối chiếu SỐ TIỀN, đúng như nhánh VNPay vẫn làm. Thiếu bước này thì một IPN
        // hợp lệ chữ ký nhưng khai `amount=1000` cho đơn 1.000.000đ vẫn được ghi nhận, và
        // `LinkReceiptAsync` lập phiếu thu theo `txn.Amount` (số của ĐƠN, không phải số đã trả)
        // nên sổ quỹ ghi đủ 1.000.000đ trong khi bệnh viện chỉ nhận 1.000đ. Đo được ở
        // evidence/cross/t3/t3_payment_gateway.json. Khác VNPay: MoMo gửi VND thẳng, không nhân 100.
        if (!long.TryParse(amount, out var momoAmount) || momoAmount != (long)txn.Amount)
        {
            _logger.LogWarning("MoMo IPN sai số tiền cho {OrderId}: báo {Reported}, đơn {Expected}",
                orderId, amount, txn.Amount);
            return new VnPayIpnResultDto { RspCode = "04", Message = "Amount mismatch" };
        }

        txn.GatewayTxnRef = transId;
        txn.ResponseCode = int.TryParse(resultCode, out var rc) ? rc : null;
        txn.ResponseMessage = message;
        txn.IpnRaw = System.Text.Json.JsonSerializer.Serialize(body);

        if (resultCode == "0")
        {
            txn.Status = 1;
            txn.CompletedAt = DateTime.UtcNow;
            txn.PayDate = DateTime.UtcNow;
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

}
