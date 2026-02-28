using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using HIS.Application.DTOs.Insurance;
using HIS.Application.Services;
using HIS.Infrastructure.Configuration;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Real HTTP implementation of IBhxhGatewayClient.
/// Connects to BHXH portal (gdbhyt.baohiemxahoi.gov.vn) via JSON REST API.
/// Manages token lifecycle with proactive refresh.
/// </summary>
public class BhxhGatewayClient : IBhxhGatewayClient
{
    private readonly HttpClient _httpClient;
    private readonly BhxhGatewayOptions _options;
    private readonly ILogger<BhxhGatewayClient> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    private string? _token;
    private DateTime _tokenExpiry = DateTime.MinValue;
    private readonly SemaphoreSlim _tokenLock = new(1, 1);

    public BhxhGatewayClient(
        HttpClient httpClient,
        IOptions<BhxhGatewayOptions> options,
        ILogger<BhxhGatewayClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
    }

    /// <summary>
    /// Ensure a valid token is available. Refresh proactively when less than 5 minutes remain.
    /// Thread-safe via SemaphoreSlim.
    /// </summary>
    private async Task EnsureTokenAsync(CancellationToken ct)
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
            var response = await GetTokenAsync(ct);
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

    public async Task<BhxhTokenResponse> GetTokenAsync(CancellationToken ct = default)
    {
        _logger.LogDebug("BHXH Gateway: Requesting token from {BaseUrl}", _options.BaseUrl);

        var request = new
        {
            username = _options.Username,
            password = _options.Password
        };

        var response = await _httpClient.PostAsJsonAsync("/api/token", request, _jsonOptions, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<TokenApiResponse>(_jsonOptions, ct);

        return new BhxhTokenResponse
        {
            Token = result?.APIKey?.Token ?? result?.Token ?? "",
            ExpiresAt = result?.APIKey?.ExpiresAt ?? DateTime.UtcNow.AddHours(1)
        };
    }

    public async Task<BhxhCardVerifyResponse> VerifyCardAsync(BhxhCardVerifyRequest request, CancellationToken ct = default)
    {
        await EnsureTokenAsync(ct);
        _logger.LogDebug("BHXH Gateway: Verifying card {MaThe} for patient {HoTen}", request.MaThe, request.HoTen);

        var payload = new
        {
            maThe = request.MaThe,
            hoTen = request.HoTen,
            ngaySinh = BhxhDateHelper.ToBhxhDateOnly(request.NgaySinh),
            maCsKcb = request.MaCsKcb
        };

        var response = await _httpClient.PostAsJsonAsync("/api/egw/nhanHoSo", payload, _jsonOptions, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<BhxhCardVerifyResponse>(_jsonOptions, ct);

        _logger.LogDebug("BHXH Gateway: Card verification result - DuDkKcb={DuDkKcb}", result?.DuDkKcb);
        return result ?? new BhxhCardVerifyResponse { DuDkKcb = false, LyDoKhongDuDk = "Empty gateway response" };
    }

    public async Task<BhxhTreatmentHistoryResponse> GetTreatmentHistoryAsync(BhxhTreatmentHistoryRequest request, CancellationToken ct = default)
    {
        await EnsureTokenAsync(ct);
        _logger.LogDebug("BHXH Gateway: Getting treatment history for {MaThe}", request.MaThe);

        var payload = new
        {
            maThe = request.MaThe,
            otp = request.Otp ?? "",
            tuNgay = BhxhDateHelper.ToBhxhDateOnly(request.FromDate),
            denNgay = BhxhDateHelper.ToBhxhDateOnly(request.ToDate)
        };

        var response = await _httpClient.PostAsJsonAsync("/api/egw/lichSuKcb", payload, _jsonOptions, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<BhxhTreatmentHistoryResponse>(_jsonOptions, ct);

        _logger.LogDebug("BHXH Gateway: Treatment history returned {Count} visits", result?.Visits?.Count ?? 0);
        return result ?? new BhxhTreatmentHistoryResponse { MaThe = request.MaThe };
    }

    public async Task<BhxhSubmitResponse> SubmitCostDataAsync(BhxhSubmitRequest request, CancellationToken ct = default)
    {
        await EnsureTokenAsync(ct);
        _logger.LogDebug("BHXH Gateway: Submitting cost data batch {BatchCode}", request.BatchCode);

        var payload = new
        {
            xmlBase64 = request.XmlBase64,
            batchCode = request.BatchCode,
            maCsKcb = request.FacilityCode
        };

        var response = await _httpClient.PostAsJsonAsync("/api/egw/guiHoSo", payload, _jsonOptions, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<BhxhSubmitResponse>(_jsonOptions, ct);

        _logger.LogDebug("BHXH Gateway: Submit result - TransactionId={TransactionId}, Status={Status}",
            result?.TransactionId, result?.Status);
        return result ?? new BhxhSubmitResponse { Status = 3, Message = "Empty gateway response" };
    }

    public async Task<BhxhAssessmentResponse> GetAssessmentResultAsync(string transactionId, CancellationToken ct = default)
    {
        await EnsureTokenAsync(ct);
        _logger.LogDebug("BHXH Gateway: Getting assessment result for {TransactionId}", transactionId);

        var response = await _httpClient.GetAsync($"/api/egw/ketQuaGiamDinh/{transactionId}", ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<BhxhAssessmentResponse>(_jsonOptions, ct);

        _logger.LogDebug("BHXH Gateway: Assessment result - Status={Status}, Accepted={Accepted}, Rejected={Rejected}",
            result?.Status, result?.AcceptedRecords, result?.RejectedRecords);
        return result ?? new BhxhAssessmentResponse
        {
            TransactionId = transactionId,
            Status = 2,
            Message = "Empty gateway response"
        };
    }

    public async Task<bool> TestConnectionAsync(CancellationToken ct = default)
    {
        try
        {
            _logger.LogDebug("BHXH Gateway: Testing connection to {BaseUrl}", _options.BaseUrl);
            var tokenResponse = await GetTokenAsync(ct);
            var isConnected = !string.IsNullOrEmpty(tokenResponse.Token);
            _logger.LogDebug("BHXH Gateway: Connection test result - {Result}", isConnected ? "Connected" : "Failed");
            return isConnected;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH Gateway: Connection test failed");
            return false;
        }
    }

    public async Task<BhxhCheckInResponse> CheckInPatientAsync(BhxhCheckInRequest request, CancellationToken ct = default)
    {
        await EnsureTokenAsync(ct);
        _logger.LogDebug("BHXH Gateway: Checking in patient {HoTen} with card {MaThe}", request.HoTen, request.MaThe);

        var payload = new
        {
            maThe = request.MaThe,
            hoTen = request.HoTen,
            ngaySinh = BhxhDateHelper.ToBhxhDateOnly(request.NgaySinh),
            maCsKcb = request.MaCsKcb,
            ngayVao = BhxhDateHelper.ToBhxhDate(request.NgayVao)
        };

        var response = await _httpClient.PostAsJsonAsync("/api/egw/checkIn", payload, _jsonOptions, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<BhxhCheckInResponse>(_jsonOptions, ct);

        _logger.LogDebug("BHXH Gateway: Check-in result - MaLk={MaLk}, Status={Status}", result?.MaLk, result?.Status);
        return result ?? new BhxhCheckInResponse { Status = 3, Message = "Empty gateway response" };
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
