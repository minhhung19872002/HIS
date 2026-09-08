using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace HIS.PatientApp.Api.Connector;

/// <summary>
/// Giữ access token của tài khoản dịch vụ mà connector dùng để gọi HIS.
///
/// Token của HIS sống 30 phút (<c>Jwt.ExpireMinutes</c>). Nếu mỗi request lại đăng nhập một lần thì
/// vừa chậm vừa làm HIS ghi đầy log đăng nhập, nên nhớ lại và chỉ lấy mới khi sắp hết hạn.
///
/// Dùng <see cref="SemaphoreSlim"/> để nhiều request đồng thời chỉ đăng nhập MỘT lần — đây là
/// single-flight, cùng lý do với interceptor phía app.
/// </summary>
public class HisServiceTokenProvider
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly HisConnectorOptions _options;
    private readonly ILogger<HisServiceTokenProvider> _logger;
    private readonly SemaphoreSlim _gate = new(1, 1);

    private string? _token;
    private DateTime _expiresAtUtc = DateTime.MinValue;

    /// <summary>Lấy token mới trước khi hết hạn để không có request nào rơi đúng khe hết hạn.</summary>
    private static readonly TimeSpan RenewBefore = TimeSpan.FromMinutes(2);

    public HisServiceTokenProvider(
        IHttpClientFactory httpFactory,
        IOptions<HisConnectorOptions> options,
        ILogger<HisServiceTokenProvider> logger)
    {
        _httpFactory = httpFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<string> GetTokenAsync(CancellationToken ct = default)
    {
        if (IsUsable()) return _token!;

        await _gate.WaitAsync(ct);
        try
        {
            // Kiểm lại sau khi qua cổng: có thể request khác vừa lấy token xong.
            if (IsUsable()) return _token!;
            await LoginAsync(ct);
            return _token!;
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>Vứt token đang giữ khi HIS trả 401 — lần gọi sau sẽ đăng nhập lại.</summary>
    public void Invalidate()
    {
        _token = null;
        _expiresAtUtc = DateTime.MinValue;
    }

    private bool IsUsable() =>
        _token is not null && DateTime.UtcNow < _expiresAtUtc - RenewBefore;

    private async Task LoginAsync(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_options.ServiceUsername))
        {
            throw new HisConnectorException(
                "Chưa cấu hình tài khoản dịch vụ HisConnector:ServiceUsername — BFF không gọi được HIS.");
        }

        var client = _httpFactory.CreateClient(HisRestConnector.HttpClientName);

        HttpResponseMessage response;
        try
        {
            response = await client.PostAsJsonAsync(
                "/api/auth/login",
                new { username = _options.ServiceUsername, password = _options.ServicePassword },
                ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new HisConnectorException("Không kết nối được tới HIS để đăng nhập tài khoản dịch vụ.", null, ex);
        }

        if (!response.IsSuccessStatusCode)
        {
            // KHÔNG log mật khẩu, kể cả khi sai — chỉ log mã lỗi.
            _logger.LogError("Đăng nhập tài khoản dịch vụ HIS thất bại: HTTP {Status}", (int)response.StatusCode);
            throw new HisConnectorException(
                "Tài khoản dịch vụ HIS đăng nhập không thành công.", (int)response.StatusCode);
        }

        var envelope = await response.Content.ReadFromJsonAsync<HisEnvelope<HisLoginResult>>(ct);
        var data = envelope?.Data;
        if (data is null || string.IsNullOrWhiteSpace(data.Token))
        {
            throw new HisConnectorException("HIS trả về phản hồi đăng nhập không hợp lệ.");
        }

        _token = data.Token;
        // HIS có thể trả ExpiresAt theo giờ địa phương hoặc bỏ trống; nếu vô lý thì tự đặt 25 phút
        // (token HIS sống 30 phút) để không rơi vào vòng đăng nhập lại liên tục.
        var expires = data.ExpiresAt.ToUniversalTime();
        _expiresAtUtc = expires > DateTime.UtcNow ? expires : DateTime.UtcNow.AddMinutes(25);

        _logger.LogInformation("Đã lấy token tài khoản dịch vụ HIS, hạn {Expires:u}", _expiresAtUtc);
    }
}
