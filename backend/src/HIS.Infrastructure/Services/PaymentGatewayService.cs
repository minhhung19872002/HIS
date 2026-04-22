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
/// Implementation cho VNPay (mặc định), MoMo và ZaloPay.
/// Các hằng số response code và signing algorithm theo tài liệu chính thức.
/// </summary>
public class PaymentGatewayService : IPaymentGatewayService
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
            _ => throw new ArgumentException($"Provider không hỗ trợ: {provider}")
        };

        txn.PaymentUrl = paymentUrl;
        txn.QrCodeData = paymentUrl;

        _db.PaymentTransactions.Add(txn);
        await _db.SaveChangesAsync();

        return new PaymentUrlResponseDto
        {
            TransactionId = txn.Id,
            TxnRef = txn.TxnRef,
            PaymentUrl = paymentUrl,
            QrCodeDataUrl = paymentUrl,
            ExpiresAt = txn.ExpiresAt,
            Provider = provider,
            Amount = txn.Amount
        };
    }

    #region VNPay

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

    #endregion

    #region MoMo (v2 signature HMAC-SHA256)

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

    #endregion

    #region ZaloPay (HMAC-SHA256 v2)

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

    #endregion

    private static string HmacSha256(string key, string data)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        var sb = new StringBuilder(hash.Length * 2);
        foreach (var b in hash) sb.Append(b.ToString("x2"));
        return sb.ToString();
    }

    #region Query / Search / Refund

    public async Task<PaymentTransactionDto?> GetTransactionByRefAsync(string txnRef)
    {
        var txn = await _db.PaymentTransactions
            .Include(t => t.Patient)
            .FirstOrDefaultAsync(t => t.TxnRef == txnRef);
        return txn == null ? null : MapToDto(txn);
    }

    public async Task<PaymentTransactionDto?> GetTransactionByIdAsync(Guid id)
    {
        var txn = await _db.PaymentTransactions
            .Include(t => t.Patient)
            .FirstOrDefaultAsync(t => t.Id == id);
        return txn == null ? null : MapToDto(txn);
    }

    public async Task<PaymentSearchResultDto> SearchAsync(PaymentSearchDto dto)
    {
        var q = _db.PaymentTransactions.Include(t => t.Patient).AsQueryable();

        if (!string.IsNullOrWhiteSpace(dto.Keyword))
        {
            var kw = dto.Keyword.Trim();
            q = q.Where(t =>
                t.TxnRef.Contains(kw) ||
                (t.GatewayTxnRef != null && t.GatewayTxnRef.Contains(kw)) ||
                t.OrderInfo.Contains(kw) ||
                (t.Patient != null && t.Patient.FullName!.Contains(kw)));
        }
        if (!string.IsNullOrWhiteSpace(dto.Provider))
            q = q.Where(t => t.Provider == dto.Provider);
        if (dto.Status.HasValue)
            q = q.Where(t => t.Status == dto.Status.Value);
        if (dto.PatientId.HasValue)
            q = q.Where(t => t.PatientId == dto.PatientId.Value);
        if (dto.FromDate.HasValue)
            q = q.Where(t => t.CreatedAt >= dto.FromDate.Value);
        if (dto.ToDate.HasValue)
            q = q.Where(t => t.CreatedAt <= dto.ToDate.Value.AddDays(1));

        var total = await q.CountAsync();
        var totalAmount = await q.SumAsync(t => (decimal?)t.Amount) ?? 0;
        var totalSuccess = await q.Where(t => t.Status == 1).SumAsync(t => (decimal?)t.Amount) ?? 0;

        var items = await q
            .OrderByDescending(t => t.CreatedAt)
            .Skip((dto.PageIndex - 1) * dto.PageSize)
            .Take(dto.PageSize)
            .ToListAsync();

        return new PaymentSearchResultDto
        {
            Items = items.Select(MapToDto).ToList(),
            TotalCount = total,
            PageIndex = dto.PageIndex,
            PageSize = dto.PageSize,
            TotalAmount = totalAmount,
            TotalSuccessAmount = totalSuccess
        };
    }

    public async Task<PaymentTransactionDto> RefundAsync(PaymentRefundDto dto, Guid userId)
    {
        var txn = await _db.PaymentTransactions.FirstOrDefaultAsync(t => t.Id == dto.TransactionId);
        if (txn == null) throw new Exception("Giao dịch không tồn tại");
        if (txn.Status != 1) throw new Exception("Chỉ có thể hoàn tiền giao dịch đã thành công");

        var refundAmount = dto.Amount > 0 ? dto.Amount : txn.Amount;
        if (refundAmount > txn.Amount - txn.RefundedAmount)
            throw new Exception("Số tiền hoàn vượt quá số còn lại có thể hoàn");

        // Tích hợp thật với gateway refund API đòi hỏi merchant contract —
        // tạm ghi nhận soft-refund và kế toán có thể đối soát thủ công.
        txn.RefundedAmount += refundAmount;
        txn.RefundedAt = DateTime.UtcNow;
        txn.RefundReason = dto.Reason;
        txn.UpdatedAt = DateTime.UtcNow;
        txn.UpdatedBy = userId.ToString();

        if (txn.RefundedAmount >= txn.Amount)
            txn.Status = 3;

        await _db.SaveChangesAsync();
        return MapToDto(txn);
    }

    public async Task<PaymentStatsDto> GetStatsAsync(DateTime fromDate, DateTime toDate, string? provider)
    {
        var q = _db.PaymentTransactions.AsQueryable();
        q = q.Where(t => t.CreatedAt >= fromDate && t.CreatedAt <= toDate.AddDays(1));
        if (!string.IsNullOrWhiteSpace(provider))
            q = q.Where(t => t.Provider == provider);

        var all = await q.ToListAsync();
        var stats = new PaymentStatsDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalTransactions = all.Count,
            SuccessTransactions = all.Count(t => t.Status == 1),
            FailedTransactions = all.Count(t => t.Status == 2),
            PendingTransactions = all.Count(t => t.Status == 0),
            TotalAmount = all.Sum(t => t.Amount),
            TotalSuccessAmount = all.Where(t => t.Status == 1).Sum(t => t.Amount),
            TotalRefundedAmount = all.Sum(t => t.RefundedAmount)
        };

        stats.ByProvider = all
            .GroupBy(t => t.Provider)
            .Select(g => new ProviderStatDto
            {
                Provider = g.Key,
                Count = g.Count(),
                Amount = g.Sum(t => t.Amount)
            })
            .ToList();

        stats.ByDay = all
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new DailyStatDto
            {
                Date = g.Key,
                Count = g.Count(),
                Amount = g.Where(t => t.Status == 1).Sum(t => t.Amount)
            })
            .OrderBy(x => x.Date)
            .ToList();

        return stats;
    }

    public async Task<bool> MarkExpiredAsync()
    {
        var now = DateTime.UtcNow;
        var expired = await _db.PaymentTransactions
            .Where(t => t.Status == 0 && t.ExpiresAt < now)
            .ToListAsync();
        foreach (var t in expired)
        {
            t.Status = 4;
            t.UpdatedAt = now;
        }
        if (expired.Count > 0) await _db.SaveChangesAsync();
        return expired.Count > 0;
    }

    #endregion

    #region Helpers

    private async Task LinkReceiptAsync(PaymentTransaction txn)
    {
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
            CashierId = Guid.Empty,
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
        RefundedAmount = t.RefundedAmount
    };

    #endregion
}
