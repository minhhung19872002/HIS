using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace HIS.PatientApp.Api.Push;

/// <summary>
/// Gửi push bằng cách chuyển tiếp qua relay đặt trên VPS cloud (HSMT mục II).
///
/// Chiều kết nối là DC → VPS, không bao giờ ngược lại: data center bệnh viện chỉ mở đường ra, không
/// mở đường vào. Relay giữ khoá FCM và không lưu dữ liệu y tế.
/// </summary>
public class RelayPushSender : IPushSender
{
    public const string HttpClientName = "push-relay";

    private readonly IHttpClientFactory _httpFactory;
    private readonly PushRelayOptions _options;
    private readonly ILogger<RelayPushSender> _logger;

    public RelayPushSender(
        IHttpClientFactory httpFactory,
        IOptions<PushRelayOptions> options,
        ILogger<RelayPushSender> logger)
    {
        _httpFactory = httpFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<PushResult> SendAsync(
        string pushToken, string payloadJson, CancellationToken ct = default)
    {
        var client = _httpFactory.CreateClient(HttpClientName);

        HttpResponseMessage response;
        try
        {
            response = await client.PostAsJsonAsync("/push", new
            {
                token = pushToken,
                payload = JsonSerializer.Deserialize<JsonElement>(payloadJson),
            }, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            // Không gọi được relay là lỗi tạm thời: đường DC → VPS chớp là chuyện thường.
            _logger.LogWarning(ex, "Không gọi được relay push, sẽ thử lại.");
            return PushResult.RetryLater;
        }

        using (response)
        {
            if (response.IsSuccessStatusCode) return PushResult.Sent;

            // 404/410 theo quy ước của FCM nghĩa là token đã chết. Thử lại chỉ tốn công.
            if (response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone)
                return PushResult.TokenInvalid;

            if ((int)response.StatusCode >= 500 || response.StatusCode == HttpStatusCode.TooManyRequests)
                return PushResult.RetryLater;

            var body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError(
                "Relay push từ chối: HTTP {Status} {Body}", (int)response.StatusCode, Truncate(body));
            return PushResult.PermanentFailure;
        }
    }

    private static string Truncate(string value) =>
        value.Length <= 300 ? value : value[..300] + "…";
}

/// <summary>
/// Bản không làm gì, dùng khi chưa cấu hình relay.
///
/// Ghi log mức cảnh báo chứ không im lặng: "app không nhận được thông báo" là một trong những lỗi
/// khó truy nhất nếu hệ thống không nói gì.
/// </summary>
public class DisabledPushSender : IPushSender
{
    private readonly ILogger<DisabledPushSender> _logger;
    public DisabledPushSender(ILogger<DisabledPushSender> logger) => _logger = logger;

    public Task<PushResult> SendAsync(string pushToken, string payloadJson, CancellationToken ct = default)
    {
        _logger.LogWarning(
            "Chưa cấu hình PushRelay:BaseUrl — bỏ qua việc đẩy thông báo. "
            + "Thông báo vẫn nằm trong hộp thư của người bệnh.");
        return Task.FromResult(PushResult.PermanentFailure);
    }
}
