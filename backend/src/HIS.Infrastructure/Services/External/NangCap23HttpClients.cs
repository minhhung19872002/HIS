using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using HIS.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services.External;

// ============================================================================
// Shared HTTP helper — retry + timeout + error mapping for Vietnamese national
// gateways. Each gateway has its own typed HttpClient (registered via
// IHttpClientFactory in DependencyInjection.cs) so timeout/headers are isolated.
//
// Production semantics:
//  - HttpRequestException / TaskCanceledException → return Acknowledged=false
//    with ErrorCode="NETWORK_ERROR" / "TIMEOUT" so caller can surface to user.
//  - Non-2xx HTTP → return Acknowledged=false with ErrorCode=status code.
//  - Up to N attempts (config NationalGateway:RetryCount, default 3) with
//    1s/2s/4s exponential backoff between retries.
// ============================================================================

internal static class GatewayHttpHelper
{
    /// <summary>
    /// POST with retry. <paramref name="contentFactory"/> được gọi MỖI attempt để tạo
    /// HttpContent mới — fix bug HttpContent bị dispose sau attempt 1 (HttpClient.PostAsync
    /// dispose HttpRequestMessage kèm Content khi hoàn tất). <paramref name="idempotencyKey"/>
    /// được gửi qua header X-Idempotency-Key để gateway phía nhận có thể dedupe nếu
    /// hỗ trợ (mọi attempt cùng key = cùng business operation).
    /// </summary>
    public static async Task<GatewaySubmissionResult> PostWithRetryAsync(
        HttpClient http,
        string relativeUrl,
        Func<HttpContent> contentFactory,
        int maxAttempts,
        string? idempotencyKey,
        ILogger logger,
        CancellationToken ct)
    {
        if (maxAttempts < 1) maxAttempts = 1;
        Exception? last = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            ct.ThrowIfCancellationRequested();
            // CRITICAL FIX: tạo content MỚI mỗi attempt — content cũ bị HttpClient dispose
            using var content = contentFactory();
            if (!string.IsNullOrEmpty(idempotencyKey))
                content.Headers.TryAddWithoutValidation("X-Idempotency-Key", idempotencyKey);

            try
            {
                using var resp = await http.PostAsync(relativeUrl, content, ct);
                var body = await resp.Content.ReadAsStringAsync(ct);
                if (resp.IsSuccessStatusCode)
                {
                    string? txnId = null;
                    try
                    {
                        using var doc = JsonDocument.Parse(body);
                        if (doc.RootElement.TryGetProperty("transactionId", out var t)) txnId = t.GetString();
                        else if (doc.RootElement.TryGetProperty("ticketNumber", out var tn)) txnId = tn.GetString();
                        else if (doc.RootElement.TryGetProperty("submissionId", out var s)) txnId = s.GetString();
                        else if (doc.RootElement.TryGetProperty("messageId", out var m)) txnId = m.GetString();
                    }
                    catch (JsonException) { /* not JSON, use first 40 chars */ }
                    txnId ??= body.Length > 40 ? body.Substring(0, 40) : body;
                    return new GatewaySubmissionResult
                    {
                        Acknowledged = true,
                        TransactionId = txnId,
                        RawResponse = TruncateForStorage(body)
                    };
                }
                // 4xx — gateway từ chối nội dung, KHÔNG retry
                if ((int)resp.StatusCode >= 400 && (int)resp.StatusCode < 500)
                {
                    return new GatewaySubmissionResult
                    {
                        Acknowledged = false,
                        ErrorCode = $"HTTP_{(int)resp.StatusCode}",
                        ErrorMessage = TruncateForMessage(body),
                        RawResponse = TruncateForStorage(body)
                    };
                }
                // 5xx — retry
                last = new HttpRequestException($"HTTP {(int)resp.StatusCode}");
                logger.LogWarning("Gateway POST {Url} attempt {Attempt} returned {Status}",
                    relativeUrl, attempt, resp.StatusCode);
            }
            catch (TaskCanceledException) when (ct.IsCancellationRequested)
            {
                // User hủy request → bubble up, KHÔNG retry
                throw;
            }
            catch (TaskCanceledException tex)
            {
                last = tex;
                logger.LogWarning("Gateway POST {Url} timeout attempt {Attempt}", relativeUrl, attempt);
            }
            catch (HttpRequestException hex)
            {
                last = hex;
                logger.LogWarning("Gateway POST {Url} network error attempt {Attempt}: {Msg}",
                    relativeUrl, attempt, SanitizeForLog(hex.Message));
            }
            catch (Polly.CircuitBreaker.BrokenCircuitException bex)
            {
                // Circuit-breaker mở → fast-fail toàn bộ retry còn lại, trả NETWORK_ERROR
                logger.LogWarning("Gateway POST {Url} circuit open — fast fail: {Msg}",
                    relativeUrl, bex.Message);
                return new GatewaySubmissionResult
                {
                    Acknowledged = false,
                    ErrorCode = "CIRCUIT_OPEN",
                    ErrorMessage = "Cổng QG đang gặp sự cố. Đã tự động ngắt mạch để bảo vệ hệ thống. Thử lại sau 30 giây.",
                    RawResponse = string.Empty
                };
            }
            // Exponential backoff (1s, 2s, 4s) — chỉ giữa các attempt, không sau attempt cuối
            if (attempt < maxAttempts)
            {
                try { await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt - 1)), ct); }
                catch (TaskCanceledException) when (ct.IsCancellationRequested) { throw; }
            }
        }
        var code = last is TaskCanceledException ? "TIMEOUT" : "NETWORK_ERROR";
        return new GatewaySubmissionResult
        {
            Acknowledged = false,
            ErrorCode = code,
            ErrorMessage = "Không liên lạc được với cổng QG sau " + maxAttempts + " lần thử.",
            RawResponse = string.Empty
        };
    }

    // Hạn chế dung lượng ResponseJson lưu DB (PayloadJson trong cùng row đã đủ trace).
    private const int MaxStoreLen = 4000;
    private const int MaxMsgLen = 500;
    private static string TruncateForStorage(string s) => s.Length <= MaxStoreLen ? s : s[..MaxStoreLen];
    private static string TruncateForMessage(string s) => s.Length <= MaxMsgLen ? s : s[..MaxMsgLen];

    // Loại bỏ Authorization/access_token/api-key khỏi exception message khi log
    private static string SanitizeForLog(string s)
    {
        if (string.IsNullOrEmpty(s)) return s;
        return System.Text.RegularExpressions.Regex.Replace(s,
            @"(access_token|Authorization|api[_-]?key|X-API-Key|password|secret)\s*[:=]\s*\S+",
            "$1=***", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
    }
}

// ============================================================================
// 1. National Prescription Gateway (donthuocquocgia.vn)
// ============================================================================

public sealed class HttpNationalPrescriptionGatewayClient : INationalPrescriptionGatewayClient
{
    private readonly HttpClient _http;
    private readonly IConfiguration _cfg;
    private readonly ILogger<HttpNationalPrescriptionGatewayClient> _log;
    public HttpNationalPrescriptionGatewayClient(HttpClient http, IConfiguration cfg, ILogger<HttpNationalPrescriptionGatewayClient> log)
    { _http = http; _cfg = cfg; _log = log; }

    public Task<GatewaySubmissionResult> SubmitAsync(string payloadJson, CancellationToken ct = default)
    {
        var apiKey = _cfg["NationalGateway:Prescription:ApiKey"];
        var maxAttempts = _cfg.GetValue<int>("NationalGateway:RetryCount", 3);
        // Derive Idempotency-Key từ payload (SubmissionCode đã unique mỗi submission)
        var idempotencyKey = ExtractSubmissionCode(payloadJson);
        return GatewayHttpHelper.PostWithRetryAsync(_http, "/api/prescription/submit",
            () =>
            {
                var c = new StringContent(payloadJson, Encoding.UTF8, "application/json");
                if (!string.IsNullOrEmpty(apiKey)) c.Headers.TryAddWithoutValidation("X-API-Key", apiKey);
                return c;
            },
            maxAttempts, idempotencyKey, _log, ct);
    }

    public async Task<bool> PingAsync(CancellationToken ct = default)
    {
        try
        {
            using var resp = await _http.GetAsync("/health", ct);
            return resp.IsSuccessStatusCode;
        }
        catch { return false; }
    }

    private static string? ExtractSubmissionCode(string payloadJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            return doc.RootElement.TryGetProperty("submissionCode", out var v) ? v.GetString() : null;
        }
        catch (JsonException) { return null; }
    }
}

// ============================================================================
// 2. National Pharmacy Gateway (duocquocgia.com.vn)
// ============================================================================

public sealed class HttpNationalPharmacyGatewayClient : INationalPharmacyGatewayClient
{
    private readonly HttpClient _http;
    private readonly IConfiguration _cfg;
    private readonly ILogger<HttpNationalPharmacyGatewayClient> _log;
    public HttpNationalPharmacyGatewayClient(HttpClient http, IConfiguration cfg, ILogger<HttpNationalPharmacyGatewayClient> log)
    { _http = http; _cfg = cfg; _log = log; }

    public Task<GatewaySubmissionResult> SubmitReportAsync(string payloadXml, string reportType, CancellationToken ct = default)
    {
        var apiKey = _cfg["NationalGateway:Pharmacy:ApiKey"];
        var maxAttempts = _cfg.GetValue<int>("NationalGateway:RetryCount", 3);
        var idempotencyKey = ExtractReportCode(payloadXml);
        return GatewayHttpHelper.PostWithRetryAsync(_http, "/api/reports/upload",
            () =>
            {
                var c = new StringContent(payloadXml, Encoding.UTF8, "application/xml");
                c.Headers.TryAddWithoutValidation("X-Report-Type", reportType);
                if (!string.IsNullOrEmpty(apiKey)) c.Headers.TryAddWithoutValidation("X-API-Key", apiKey);
                return c;
            },
            maxAttempts, idempotencyKey, _log, ct);
    }

    private static string? ExtractReportCode(string payloadXml)
    {
        // Simple regex extract <ReportCode>...</ReportCode> — đủ idempotency
        var m = System.Text.RegularExpressions.Regex.Match(payloadXml, @"<ReportCode>([^<]+)</ReportCode>");
        return m.Success ? m.Groups[1].Value : null;
    }

    public async Task<bool> PingAsync(CancellationToken ct = default)
    {
        try
        {
            using var resp = await _http.GetAsync("/health", ct);
            return resp.IsSuccessStatusCode;
        }
        catch { return false; }
    }
}

// ============================================================================
// 3. Đề án 06 — gdbhyt.baohiemxahoi.gov.vn (Birth / Death / Driving License)
// ============================================================================

public sealed class HttpDeAn06GatewayClient : IDeAn06GatewayClient
{
    private readonly HttpClient _http;
    private readonly IConfiguration _cfg;
    private readonly ILogger<HttpDeAn06GatewayClient> _log;
    public HttpDeAn06GatewayClient(HttpClient http, IConfiguration cfg, ILogger<HttpDeAn06GatewayClient> log)
    { _http = http; _cfg = cfg; _log = log; }

    private Task<GatewaySubmissionResult> PostJson(string url, string json, CancellationToken ct)
    {
        var token = _cfg["DeAn06:AccessToken"];
        var maxAttempts = _cfg.GetValue<int>("NationalGateway:RetryCount", 3);
        var idempotencyKey = ExtractCertNumber(json);
        return GatewayHttpHelper.PostWithRetryAsync(_http, url,
            () =>
            {
                var c = new StringContent(json, Encoding.UTF8, "application/json");
                if (!string.IsNullOrEmpty(token)) c.Headers.TryAddWithoutValidation("Authorization", $"Bearer {token}");
                return c;
            },
            maxAttempts, idempotencyKey, _log, ct);
    }

    private static string? ExtractCertNumber(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.TryGetProperty("certificateNumber", out var v) ? v.GetString() : null;
        }
        catch (JsonException) { return null; }
    }

    public Task<GatewaySubmissionResult> SubmitBirthCertificateAsync(string payloadJson, CancellationToken ct = default)
        => PostJson("/api/v1/birth-certificates", payloadJson, ct);

    public Task<GatewaySubmissionResult> SubmitDeathCertificateAsync(string payloadJson, CancellationToken ct = default)
        => PostJson("/api/v1/death-certificates", payloadJson, ct);

    public Task<GatewaySubmissionResult> SubmitDrivingLicenseCheckAsync(string payloadJson, CancellationToken ct = default)
        => PostJson("/api/v1/driving-license-health-checks", payloadJson, ct);
}

// ============================================================================
// 4. Zalo OA — business.openapi.zalo.me/message/template
// ============================================================================

public sealed class HttpZaloOaClient : IZaloOaClient
{
    private readonly HttpClient _http;
    private readonly IConfiguration _cfg;
    private readonly ILogger<HttpZaloOaClient> _log;
    public HttpZaloOaClient(HttpClient http, IConfiguration cfg, ILogger<HttpZaloOaClient> log)
    { _http = http; _cfg = cfg; _log = log; }

    public Task<GatewaySubmissionResult> SendTemplateMessageAsync(string targetPhone, string templateId, string payloadJson, CancellationToken ct = default)
    {
        var token = _cfg["Zalo:AccessToken"];
        if (string.IsNullOrEmpty(token))
        {
            return Task.FromResult(new GatewaySubmissionResult
            {
                Acknowledged = false,
                ErrorCode = "MISSING_ACCESS_TOKEN",
                ErrorMessage = "Zalo OA access token chưa được cấu hình (env var Zalo__AccessToken)."
            });
        }

        // Parse payloadJson 1 lần để fail-fast khi malformed (caller tránh hứng JsonException tại retry)
        JsonElement templateData;
        try
        {
            using var probe = JsonDocument.Parse(payloadJson);
            templateData = probe.RootElement.Clone();
        }
        catch (JsonException)
        {
            return Task.FromResult(new GatewaySubmissionResult
            {
                Acknowledged = false,
                ErrorCode = "INVALID_PAYLOAD",
                ErrorMessage = "payloadJson không phải JSON hợp lệ."
            });
        }

        var bodyJson = JsonSerializer.Serialize(new
        {
            phone = targetPhone,
            template_id = templateId,
            template_data = templateData
        });
        var maxAttempts = _cfg.GetValue<int>("Zalo:RetryCount", 3);
        // Idempotency key per phone+template+payload hash (Zalo không hỗ trợ nhưng giúp log/trace)
        var idempotencyKey = $"zns:{targetPhone}:{templateId}:{System.Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(payloadJson)))[..16]}";
        return GatewayHttpHelper.PostWithRetryAsync(_http, "/message/template",
            () =>
            {
                var c = new StringContent(bodyJson, Encoding.UTF8, "application/json");
                c.Headers.TryAddWithoutValidation("access_token", token);
                return c;
            },
            maxAttempts, idempotencyKey, _log, ct);
    }

    public async Task<bool> PingAsync(CancellationToken ct = default)
    {
        try
        {
            // Zalo OA không có /health public — dùng GET oa info kèm token
            var token = _cfg["Zalo:AccessToken"];
            if (string.IsNullOrEmpty(token)) return false;
            using var req = new HttpRequestMessage(HttpMethod.Get, "/oa/getoa");
            req.Headers.Add("access_token", token);
            using var resp = await _http.SendAsync(req, ct);
            return resp.IsSuccessStatusCode;
        }
        catch { return false; }
    }
}

// ============================================================================
// InMemory fakes — bound when MockMode=true (Development + early Staging).
// Mỗi method trả về acknowledged=true với ID prefix "MOCK-" để dễ phân biệt
// với production traffic. Tuyệt đối KHÔNG bind vào DI khi MockMode=false.
// ============================================================================

public sealed class InMemoryNationalPrescriptionGatewayClient : INationalPrescriptionGatewayClient
{
    public Task<GatewaySubmissionResult> SubmitAsync(string payloadJson, CancellationToken ct = default)
        => Task.FromResult(new GatewaySubmissionResult
        {
            Acknowledged = true,
            TransactionId = $"MOCK-RX-{Guid.NewGuid():N}".Substring(0, 18),
            RawResponse = "{\"ack\":true,\"mode\":\"mock\"}"
        });
    public Task<bool> PingAsync(CancellationToken ct = default) => Task.FromResult(true);
}

public sealed class InMemoryNationalPharmacyGatewayClient : INationalPharmacyGatewayClient
{
    public Task<GatewaySubmissionResult> SubmitReportAsync(string payloadXml, string reportType, CancellationToken ct = default)
        => Task.FromResult(new GatewaySubmissionResult
        {
            Acknowledged = true,
            TransactionId = $"MOCK-PH-{Guid.NewGuid():N}".Substring(0, 18),
            RawResponse = "<ack mode=\"mock\"/>"
        });
    public Task<bool> PingAsync(CancellationToken ct = default) => Task.FromResult(true);
}

public sealed class InMemoryDeAn06GatewayClient : IDeAn06GatewayClient
{
    private static GatewaySubmissionResult Ok(string prefix) => new()
    {
        Acknowledged = true,
        TransactionId = $"MOCK-{prefix}-{Guid.NewGuid():N}".Substring(0, 22),
        RawResponse = "{\"ack\":true,\"mode\":\"mock\"}"
    };
    public Task<GatewaySubmissionResult> SubmitBirthCertificateAsync(string payloadJson, CancellationToken ct = default) => Task.FromResult(Ok("GCS"));
    public Task<GatewaySubmissionResult> SubmitDeathCertificateAsync(string payloadJson, CancellationToken ct = default) => Task.FromResult(Ok("GBT"));
    public Task<GatewaySubmissionResult> SubmitDrivingLicenseCheckAsync(string payloadJson, CancellationToken ct = default) => Task.FromResult(Ok("DLHC"));
}

public sealed class InMemoryZaloOaClient : IZaloOaClient
{
    public Task<GatewaySubmissionResult> SendTemplateMessageAsync(string targetPhone, string templateId, string payloadJson, CancellationToken ct = default)
        => Task.FromResult(new GatewaySubmissionResult
        {
            Acknowledged = true,
            TransactionId = $"MOCK-ZL-{Guid.NewGuid():N}".Substring(0, 18),
            RawResponse = "{\"ack\":true,\"mode\":\"mock\"}"
        });
    public Task<bool> PingAsync(CancellationToken ct = default) => Task.FromResult(true);
}
