using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace HIS.PatientApp.Api.Connector;

/// <summary>
/// Cài đặt <see cref="IHisConnector"/> bằng cách gọi REST API của HIS Core.
///
/// Mọi lời gọi đều mang token của tài khoản dịch vụ. Gặp 401 thì vứt token và thử lại ĐÚNG MỘT lần —
/// đủ để vượt qua trường hợp token vừa hết hạn, mà không tạo vòng lặp khi mật khẩu tài khoản dịch vụ
/// thật sự sai.
/// </summary>
public class HisRestConnector : IHisConnector
{
    public const string HttpClientName = "his-core";

    private readonly IHttpClientFactory _httpFactory;
    private readonly HisServiceTokenProvider _tokenProvider;
    private readonly ILogger<HisRestConnector> _logger;

    public HisRestConnector(
        IHttpClientFactory httpFactory,
        HisServiceTokenProvider tokenProvider,
        IOptions<HisConnectorOptions> options,
        ILogger<HisRestConnector> logger)
    {
        _httpFactory = httpFactory;
        _tokenProvider = tokenProvider;
        _logger = logger;
    }

    public Task<HisPatient?> GetPatientByIdAsync(Guid patientId, CancellationToken ct = default) =>
        GetOrNullAsync<HisPatient>($"/api/patients/{patientId}", ct);

    public Task<HisPatient?> GetPatientByCodeAsync(string patientCode, CancellationToken ct = default) =>
        GetOrNullAsync<HisPatient>($"/api/patients/by-code/{Uri.EscapeDataString(patientCode)}", ct);

    public Task<HisPatient?> GetPatientByIdentityAsync(string identityNumber, CancellationToken ct = default) =>
        GetOrNullAsync<HisPatient>($"/api/patients/by-identity/{Uri.EscapeDataString(identityNumber)}", ct);

    public async Task<IReadOnlyList<HisPatient>> FindPatientsByPhoneAsync(
        string phoneNumber, CancellationToken ct = default)
    {
        var envelope = await SendAsync<HisEnvelope<HisPagedResult<HisPatient>>>(
            () => new HttpRequestMessage(HttpMethod.Post, "/api/patients/search")
            {
                Content = JsonContent.Create(new { keyword = phoneNumber, pageIndex = 1, pageSize = 20 }),
            }, ct);

        var items = envelope?.Data?.Items ?? new List<HisPatient>();

        // Search của HIS khớp mờ trên nhiều trường (tên, mã, CCCD, BHYT, SĐT). Không lọc lại đúng số
        // điện thoại thì rất dễ trả về người khác — và ở đây "trả nhầm người" nghĩa là gắn tài khoản
        // app vào sai hồ sơ bệnh án.
        var normalized = PhoneNumbers.Normalize(phoneNumber);
        return items
            .Where(p => PhoneNumbers.Normalize(p.PhoneNumber) == normalized)
            .ToList();
    }

    public async Task<bool> PingAsync(CancellationToken ct = default)
    {
        try
        {
            var client = _httpFactory.CreateClient(HttpClientName);
            var response = await client.GetAsync("/health", ct);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return false;
        }
    }

    /// <summary>GET trả null khi HIS báo 404, ném khi lỗi khác.</summary>
    private async Task<T?> GetOrNullAsync<T>(string path, CancellationToken ct) where T : class
    {
        var envelope = await SendAsync<HisEnvelope<T>>(
            () => new HttpRequestMessage(HttpMethod.Get, path), ct, allowNotFound: true);
        return envelope?.Data;
    }

    private async Task<TResponse?> SendAsync<TResponse>(
        Func<HttpRequestMessage> requestFactory,
        CancellationToken ct,
        bool allowNotFound = false) where TResponse : class
    {
        var response = await SendOnceAsync(requestFactory, ct);

        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            // Token có thể vừa hết hạn hoặc bị thu hồi (HIS xoay SecurityStamp). Thử lại một lần.
            _logger.LogInformation("HIS trả 401, lấy lại token tài khoản dịch vụ và thử lại một lần.");
            _tokenProvider.Invalidate();
            response.Dispose();
            response = await SendOnceAsync(requestFactory, ct);
        }

        using (response)
        {
            if (allowNotFound && response.StatusCode == HttpStatusCode.NotFound) return null;

            if (!response.IsSuccessStatusCode)
            {
                throw new HisConnectorException(
                    $"HIS trả về HTTP {(int)response.StatusCode} cho {response.RequestMessage?.RequestUri?.PathAndQuery}.",
                    (int)response.StatusCode);
            }

            return await response.Content.ReadFromJsonAsync<TResponse>(cancellationToken: ct);
        }
    }

    private async Task<HttpResponseMessage> SendOnceAsync(
        Func<HttpRequestMessage> requestFactory, CancellationToken ct)
    {
        // Tạo request MỚI mỗi lần: HttpRequestMessage không gửi lại được sau khi đã dùng.
        var request = requestFactory();
        request.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", await _tokenProvider.GetTokenAsync(ct));

        var client = _httpFactory.CreateClient(HttpClientName);
        try
        {
            return await client.SendAsync(request, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new HisConnectorException("Không kết nối được tới HIS.", null, ex);
        }
    }
}
