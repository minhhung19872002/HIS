using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Insurance;
using HIS.Application.Services;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Real HTTP implementation of IBhxhGatewayClient.
/// Connects to BHXH portal (gdbhyt.baohiemxahoi.gov.vn) via JSON REST API.
/// Manages token lifecycle with proactive refresh.
///
/// Endpoint and credentials come from <see cref="IBhxhGatewaySettingsProvider"/> per call, so the
/// values saved in the "Cấu hình BHXH" admin screen apply without a redeploy. Requests therefore
/// use absolute URLs rather than the HttpClient BaseAddress, which is fixed at startup.
/// </summary>
public class BhxhGatewayClient : IBhxhGatewayClient
{
    private readonly HttpClient _httpClient;
    private readonly IBhxhGatewaySettingsProvider _settingsProvider;
    private readonly ILogger<BhxhGatewayClient> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    private string? _token;
    private DateTime _tokenExpiry = DateTime.MinValue;
    private readonly SemaphoreSlim _tokenLock = new(1, 1);

    public BhxhGatewayClient(
        HttpClient httpClient,
        IBhxhGatewaySettingsProvider settingsProvider,
        ILogger<BhxhGatewayClient> logger)
    {
        _httpClient = httpClient;
        _settingsProvider = settingsProvider;
        _logger = logger;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
    }

    /// <summary>
    /// Resolve the settings in force and open a cancellation scope bounded by the configured timeout.
    /// The caller disposes the source.
    /// </summary>
    private async Task<(BhxhGatewaySettings Settings, CancellationTokenSource Scope)> BeginCallAsync(CancellationToken ct)
    {
        var settings = await _settingsProvider.GetAsync(ct);
        var scope = CancellationTokenSource.CreateLinkedTokenSource(ct);
        scope.CancelAfter(TimeSpan.FromSeconds(settings.TimeoutSeconds));
        return (settings, scope);
    }

    private static string Endpoint(BhxhGatewaySettings settings, string path) =>
        settings.BaseUrl.TrimEnd('/') + path;

    /// <summary>
    /// Ensure a valid token is available. Refresh proactively when less than 5 minutes remain.
    /// Thread-safe via SemaphoreSlim.
    /// </summary>
    private async Task EnsureTokenAsync(BhxhGatewaySettings settings, CancellationToken ct)
    {
        if (_token != null && DateTime.UtcNow < _tokenExpiry.AddMinutes(-5))
            return;

        await _tokenLock.WaitAsync(ct);
        try
        {
            // Double-check after acquiring lock
            if (_token != null && DateTime.UtcNow < _tokenExpiry.AddMinutes(-5))
                return;

            _logger.LogDebug("BHXH Gateway: Refreshing authentication token");
            var response = await RequestTokenAsync(settings, ct);
            _token = response.Token;
            _tokenExpiry = response.ExpiresAt;

            _httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _token);

            _logger.LogDebug("BHXH Gateway: Token refreshed, expires at {ExpiresAt}", _tokenExpiry);
        }
        finally
        {
            _tokenLock.Release();
        }
    }

    private async Task<BhxhTokenResponse> RequestTokenAsync(BhxhGatewaySettings settings, CancellationToken ct)
    {
        var tokenUrl = string.IsNullOrWhiteSpace(settings.TokenUrl)
            ? Endpoint(settings, "/api/token")
            : settings.TokenUrl!;

        _logger.LogDebug("BHXH Gateway: Requesting token from {TokenUrl}", tokenUrl);

        var request = new
        {
            username = settings.Username,
            password = settings.Password
        };

        var response = await _httpClient.PostAsJsonAsync(tokenUrl, request, _jsonOptions, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<TokenApiResponse>(_jsonOptions, ct);

        return new BhxhTokenResponse
        {
            Token = result?.APIKey?.Token ?? result?.Token ?? "",
            ExpiresAt = result?.APIKey?.ExpiresAt ?? DateTime.UtcNow.AddHours(1)
        };
    }

    public async Task<BhxhTokenResponse> GetTokenAsync(CancellationToken ct = default)
    {
        var (settings, scope) = await BeginCallAsync(ct);
        using (scope)
        {
            return await RequestTokenAsync(settings, scope.Token);
        }
    }

    public async Task<BhxhCardVerifyResponse> VerifyCardAsync(BhxhCardVerifyRequest request, CancellationToken ct = default)
    {
        var (settings, scope) = await BeginCallAsync(ct);
        using (scope)
        {
            await EnsureTokenAsync(settings, scope.Token);
            _logger.LogDebug("BHXH Gateway: Verifying card {MaThe} for patient {HoTen}", request.MaThe, request.HoTen);

            var payload = new
            {
                maThe = request.MaThe,
                hoTen = request.HoTen,
                ngaySinh = BhxhDateHelper.ToBhxhDateOnly(request.NgaySinh),
                maCsKcb = string.IsNullOrWhiteSpace(request.MaCsKcb) ? settings.FacilityCode : request.MaCsKcb
            };

            var response = await _httpClient.PostAsJsonAsync(Endpoint(settings, "/api/egw/nhanHoSo"), payload, _jsonOptions, scope.Token);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<BhxhCardVerifyResponse>(_jsonOptions, scope.Token);

            _logger.LogDebug("BHXH Gateway: Card verification result - DuDkKcb={DuDkKcb}", result?.DuDkKcb);
            return result ?? new BhxhCardVerifyResponse { DuDkKcb = false, LyDoKhongDuDk = "Empty gateway response" };
        }
    }

    public async Task<BhxhTreatmentHistoryResponse> GetTreatmentHistoryAsync(BhxhTreatmentHistoryRequest request, CancellationToken ct = default)
    {
        var (settings, scope) = await BeginCallAsync(ct);
        using (scope)
        {
            await EnsureTokenAsync(settings, scope.Token);
            _logger.LogDebug("BHXH Gateway: Getting treatment history for {MaThe}", request.MaThe);

            var payload = new
            {
                maThe = request.MaThe,
                otp = request.Otp ?? "",
                tuNgay = BhxhDateHelper.ToBhxhDateOnly(request.FromDate),
                denNgay = BhxhDateHelper.ToBhxhDateOnly(request.ToDate)
            };

            var response = await _httpClient.PostAsJsonAsync(Endpoint(settings, "/api/egw/lichSuKcb"), payload, _jsonOptions, scope.Token);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<BhxhTreatmentHistoryResponse>(_jsonOptions, scope.Token);

            _logger.LogDebug("BHXH Gateway: Treatment history returned {Count} visits", result?.Visits?.Count ?? 0);
            return result ?? new BhxhTreatmentHistoryResponse { MaThe = request.MaThe };
        }
    }

    public async Task<BhxhSubmitResponse> SubmitCostDataAsync(BhxhSubmitRequest request, CancellationToken ct = default)
    {
        var (settings, scope) = await BeginCallAsync(ct);
        using (scope)
        {
            await EnsureTokenAsync(settings, scope.Token);
            _logger.LogDebug("BHXH Gateway: Submitting cost data batch {BatchCode}", request.BatchCode);

            var payload = new
            {
                xmlBase64 = request.XmlBase64,
                batchCode = request.BatchCode,
                maCsKcb = string.IsNullOrWhiteSpace(request.FacilityCode) ? settings.FacilityCode : request.FacilityCode
            };

            var response = await _httpClient.PostAsJsonAsync(Endpoint(settings, "/api/egw/guiHoSo"), payload, _jsonOptions, scope.Token);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<BhxhSubmitResponse>(_jsonOptions, scope.Token);

            _logger.LogDebug("BHXH Gateway: Submit result - TransactionId={TransactionId}, Status={Status}",
                result?.TransactionId, result?.Status);
            return result ?? new BhxhSubmitResponse { Status = 3, Message = "Empty gateway response" };
        }
    }

    public async Task<BhxhAssessmentResponse> GetAssessmentResultAsync(string transactionId, CancellationToken ct = default)
    {
        var (settings, scope) = await BeginCallAsync(ct);
        using (scope)
        {
            await EnsureTokenAsync(settings, scope.Token);
            _logger.LogDebug("BHXH Gateway: Getting assessment result for {TransactionId}", transactionId);

            var response = await _httpClient.GetAsync(Endpoint(settings, $"/api/egw/ketQuaGiamDinh/{transactionId}"), scope.Token);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<BhxhAssessmentResponse>(_jsonOptions, scope.Token);

            _logger.LogDebug("BHXH Gateway: Assessment result - Status={Status}, Accepted={Accepted}, Rejected={Rejected}",
                result?.Status, result?.AcceptedRecords, result?.RejectedRecords);
            return result ?? new BhxhAssessmentResponse
            {
                TransactionId = transactionId,
                Status = 2,
                Message = "Empty gateway response"
            };
        }
    }

    public async Task<bool> TestConnectionAsync(CancellationToken ct = default)
    {
        try
        {
            var (settings, scope) = await BeginCallAsync(ct);
            using (scope)
            {
                _logger.LogDebug("BHXH Gateway: Testing connection to {BaseUrl}", settings.BaseUrl);
                var tokenResponse = await RequestTokenAsync(settings, scope.Token);
                var isConnected = !string.IsNullOrEmpty(tokenResponse.Token);
                _logger.LogDebug("BHXH Gateway: Connection test result - {Result}", isConnected ? "Connected" : "Failed");
                return isConnected;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH Gateway: Connection test failed");
            return false;
        }
    }

    public async Task<BhxhCheckInResponse> CheckInPatientAsync(BhxhCheckInRequest request, CancellationToken ct = default)
    {
        var (settings, scope) = await BeginCallAsync(ct);
        using (scope)
        {
            await EnsureTokenAsync(settings, scope.Token);
            _logger.LogDebug("BHXH Gateway: Checking in patient {HoTen} with card {MaThe}", request.HoTen, request.MaThe);

            var payload = new
            {
                maThe = request.MaThe,
                hoTen = request.HoTen,
                ngaySinh = BhxhDateHelper.ToBhxhDateOnly(request.NgaySinh),
                maCsKcb = string.IsNullOrWhiteSpace(request.MaCsKcb) ? settings.FacilityCode : request.MaCsKcb,
                ngayVao = BhxhDateHelper.ToBhxhDate(request.NgayVao)
            };

            var response = await _httpClient.PostAsJsonAsync(Endpoint(settings, "/api/egw/checkIn"), payload, _jsonOptions, scope.Token);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<BhxhCheckInResponse>(_jsonOptions, scope.Token);

            _logger.LogDebug("BHXH Gateway: Check-in result - MaLk={MaLk}, Status={Status}", result?.MaLk, result?.Status);
            return result ?? new BhxhCheckInResponse { Status = 3, Message = "Empty gateway response" };
        }
    }

    // Internal DTO for token API response (BHXH format may nest token inside APIKey object)
    private class TokenApiResponse
    {
        public string? Token { get; set; }
        public TokenApiKey? APIKey { get; set; }
    }

    private class TokenApiKey
    {
        public string? Token { get; set; }
        public DateTime ExpiresAt { get; set; }
    }
}
