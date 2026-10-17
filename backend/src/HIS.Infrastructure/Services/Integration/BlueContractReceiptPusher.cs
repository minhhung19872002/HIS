using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using HIS.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services.Integration;

/// <summary>
/// Đẩy phiếu nhập NCC sang BlueContract ngay khi duyệt: POST {BaseUrl}/api/integration/his/warehouse-receipts, ký
/// HMAC-SHA256 theo BlueContract docs/HIS_INTEGRATION.md §1 (X-Api-Key, X-Timestamp, X-Signature).
///
/// Best-effort, trong bộ nhớ: phiếu đẩy hỏng (mất mạng, cổng bảo trì, HIS khởi động lại giữa chừng) KHÔNG mất, vì cổng
/// còn kéo định kỳ GET /api/integration/bluecontract/warehouse-receipts — cổng idempotent theo hisReceiptId nên đẩy
/// + kéo trùng nhau vô hại. Lỗi 4xx (dữ liệu sai, phiếu đã ký bên cổng) không thử lại.
///
/// Cấu hình (env BlueContract__*): BaseUrl (rỗng = tắt), ApiKey, Secret.
/// </summary>
public sealed class BlueContractReceiptPusher : BackgroundService, IBlueContractReceiptPushQueue
{
    public const string HttpClientName = "bluecontract";
    private const string ReceiptsPath = "/api/integration/his/warehouse-receipts";
    private static readonly TimeSpan[] RetryDelays = { TimeSpan.FromSeconds(10), TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(5) };
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly Channel<Guid> _queue = Channel.CreateBounded<Guid>(new BoundedChannelOptions(1000) { FullMode = BoundedChannelFullMode.DropOldest });
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<BlueContractReceiptPusher> _logger;
    private readonly Uri? _endpoint;
    private readonly string _apiKey;
    private readonly byte[] _secret;

    public BlueContractReceiptPusher(IServiceScopeFactory scopeFactory, IHttpClientFactory httpFactory, IConfiguration config,
        ILogger<BlueContractReceiptPusher> logger)
    {
        _scopeFactory = scopeFactory;
        _httpFactory = httpFactory;
        _logger = logger;
        var baseUrl = config["BlueContract:BaseUrl"];
        _apiKey = config["BlueContract:ApiKey"] ?? string.Empty;
        _secret = Encoding.UTF8.GetBytes(config["BlueContract:Secret"] ?? string.Empty);
        if (!string.IsNullOrWhiteSpace(baseUrl) && _apiKey.Length > 0 && _secret.Length > 0)
            _endpoint = new Uri(new Uri(baseUrl.TrimEnd('/') + "/"), ReceiptsPath.TrimStart('/'));
    }

    public bool Enabled => _endpoint != null;

    public void Enqueue(Guid receiptId)
    {
        if (Enabled && !_queue.Writer.TryWrite(receiptId))
            _logger.LogWarning("BlueContract push queue full, receipt {ReceiptId} left to the portal's pull", receiptId);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!Enabled)
        {
            _logger.LogInformation("BlueContract receipt push disabled (set BlueContract:BaseUrl, ApiKey, Secret to enable)");
            return;
        }

        await foreach (var receiptId in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await PushWithRetryAsync(receiptId, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "BlueContract push of receipt {ReceiptId} failed", receiptId);
            }
        }
    }

    private async Task PushWithRetryAsync(Guid receiptId, CancellationToken ct)
    {
        byte[] body;
        using (var scope = _scopeFactory.CreateScope())
        {
            var payload = await scope.ServiceProvider.GetRequiredService<IBlueContractIntegrationService>().BuildReceiptPayloadAsync(receiptId);
            if (payload == null)
            {
                _logger.LogInformation("Receipt {ReceiptId} not pushed to BlueContract (not an approved supplier receipt, or the supplier has no tax code)", receiptId);
                return;
            }

            body = JsonSerializer.SerializeToUtf8Bytes(payload, Json);
        }

        for (var attempt = 0; ; attempt++)
        {
            var (status, text) = await SendAsync(body, ct);
            if (status is >= HttpStatusCode.OK and < HttpStatusCode.MultipleChoices)
            {
                _logger.LogInformation("Receipt {ReceiptId} pushed to BlueContract: {Response}", receiptId, Truncate(text));
                return;
            }

            var retriable = status is null or HttpStatusCode.TooManyRequests or HttpStatusCode.RequestTimeout or >= HttpStatusCode.InternalServerError;
            if (!retriable || attempt >= RetryDelays.Length)
            {
                _logger.LogWarning("BlueContract rejected receipt {ReceiptId} ({Status}): {Response}", receiptId, (int?)status, Truncate(text));
                return;
            }

            await Task.Delay(RetryDelays[attempt], ct);
        }
    }

    private async Task<(HttpStatusCode? Status, string Text)> SendAsync(byte[] body, CancellationToken ct)
    {
        // Signed per attempt: the portal rejects a replayed signature and a timestamp older than ±5 minutes.
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
        var canonical = string.Join('\n', "POST", _endpoint!.PathAndQuery, timestamp, Convert.ToHexStringLower(SHA256.HashData(body)));
        var signature = Convert.ToHexStringLower(HMACSHA256.HashData(_secret, Encoding.UTF8.GetBytes(canonical)));

        using var request = new HttpRequestMessage(HttpMethod.Post, _endpoint) { Content = new ByteArrayContent(body) };
        request.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
        request.Headers.Add("X-Api-Key", _apiKey);
        request.Headers.Add("X-Timestamp", timestamp);
        request.Headers.Add("X-Signature", signature);
        try
        {
            using var response = await _httpFactory.CreateClient(HttpClientName).SendAsync(request, ct);
            return (response.StatusCode, await response.Content.ReadAsStringAsync(ct));
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            return (null, ex.Message);
        }
    }

    private static string Truncate(string text) => text.Length <= 500 ? text : text[..500];
}
