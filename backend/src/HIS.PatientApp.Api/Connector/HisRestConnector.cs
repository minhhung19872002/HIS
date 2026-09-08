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

    private readonly HisConnectorOptions _options;

    public HisRestConnector(
        IHttpClientFactory httpFactory,
        HisServiceTokenProvider tokenProvider,
        IOptions<HisConnectorOptions> options,
        ILogger<HisRestConnector> logger)
    {
        _httpFactory = httpFactory;
        _tokenProvider = tokenProvider;
        _options = options.Value;
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

    // ------------------------------------------------------------ danh mục

    public async Task<IReadOnlyList<HisDepartment>> GetDepartmentsAsync(CancellationToken ct = default)
        => await GetCachedAsync("departments", TimeSpan.FromMinutes(_options.CatalogCacheMinutes),
            async () => await SendAsync<List<HisDepartment>>(
                () => new HttpRequestMessage(HttpMethod.Get, "/api/booking/departments"), ct)
                ?? new List<HisDepartment>(), ct);

    public async Task<IReadOnlyList<HisDoctor>> GetDoctorsAsync(
        Guid? departmentId, CancellationToken ct = default)
    {
        var path = departmentId.HasValue
            ? $"/api/booking/doctors?departmentId={departmentId}"
            : "/api/booking/doctors";

        return await GetCachedAsync($"doctors:{departmentId}",
            TimeSpan.FromMinutes(_options.CatalogCacheMinutes),
            async () => await SendAsync<List<HisDoctor>>(
                () => new HttpRequestMessage(HttpMethod.Get, path), ct) ?? new List<HisDoctor>(), ct);
    }

    public async Task<IReadOnlyList<HisRoom>> GetRoomsAsync(
        Guid? departmentId, CancellationToken ct = default)
    {
        var envelope = await SendAsync<HisEnvelope<List<HisRoom>>>(
            () => new HttpRequestMessage(HttpMethod.Get, "/api/reception/rooms/overview"), ct);

        var rooms = envelope?.Data ?? new List<HisRoom>();
        return departmentId.HasValue
            ? rooms.Where(r => r.DepartmentId == departmentId).ToList()
            : rooms;
    }

    // ---------------------------------------------------------- số thứ tự

    public async Task<HisQueueTicket> TakeQueueNumberAsync(
        string phoneNumber, string? patientName, Guid roomId, int queueType,
        int? priorityReason, CancellationToken ct = default)
    {
        var ticket = await SendAsync<HisQueueTicket>(
            () => new HttpRequestMessage(HttpMethod.Post, "/api/reception/queue/issue-mobile")
            {
                Content = JsonContent.Create(new
                {
                    patientPhone = phoneNumber,
                    patientName,
                    roomId,
                    queueType,
                    priorityReason,
                }),
            }, ct);

        return ticket ?? throw new HisConnectorException("HIS không trả về vé xếp hàng.");
    }

    public Task<HisQueueTicketStatus?> GetQueueTicketStatusAsync(
        Guid ticketId, CancellationToken ct = default)
        => SendAsync<HisQueueTicketStatus>(
            () => new HttpRequestMessage(
                HttpMethod.Get, $"/api/reception/queue/ticket/{ticketId}/status"),
            ct, allowNotFound: true);

    // ------------------------------------------------------------ đặt khám

    public async Task<HisSlotResult> GetSlotsAsync(
        DateTime date, Guid? departmentId, Guid? doctorId, CancellationToken ct = default)
    {
        var query = $"?date={date:yyyy-MM-dd}";
        if (departmentId.HasValue) query += $"&departmentId={departmentId}";
        if (doctorId.HasValue) query += $"&doctorId={doctorId}";

        return await SendAsync<HisSlotResult>(
            () => new HttpRequestMessage(HttpMethod.Get, "/api/booking/slots" + query), ct)
            ?? new HisSlotResult { Date = date };
    }

    public async Task<HisBookingResult> BookAppointmentAsync(object payload, CancellationToken ct = default)
    {
        var result = await SendAsync<HisBookingResult>(
            () => new HttpRequestMessage(HttpMethod.Post, "/api/booking/book")
            {
                Content = JsonContent.Create(payload),
            }, ct);

        return result ?? throw new HisConnectorException("HIS không trả về kết quả đặt lịch.");
    }

    public async Task<IReadOnlyList<HisBookingStatus>> LookupAppointmentsAsync(
        string phoneNumber, CancellationToken ct = default)
        => await SendAsync<List<HisBookingStatus>>(
            () => new HttpRequestMessage(
                HttpMethod.Get, $"/api/booking/lookup?phone={Uri.EscapeDataString(phoneNumber)}"), ct)
            ?? new List<HisBookingStatus>();

    public async Task<HisBookingStatus> CancelAppointmentAsync(
        string appointmentCode, string phoneNumber, string? reason, CancellationToken ct = default)
    {
        var result = await SendAsync<HisBookingStatus>(
            () => new HttpRequestMessage(
                HttpMethod.Put, $"/api/booking/{Uri.EscapeDataString(appointmentCode)}/cancel")
            {
                Content = JsonContent.Create(new { phoneNumber, reason }),
            }, ct);

        return result ?? throw new HisConnectorException("HIS không trả về kết quả huỷ lịch.");
    }

    public async Task<HisBookingStatus> RescheduleAppointmentAsync(
        string appointmentCode, string phoneNumber, DateTime newDate, TimeSpan? newTime,
        Guid? newDoctorId, string? reason, CancellationToken ct = default)
    {
        var result = await SendAsync<HisBookingStatus>(
            () => new HttpRequestMessage(
                HttpMethod.Put, $"/api/booking/{Uri.EscapeDataString(appointmentCode)}/reschedule")
            {
                Content = JsonContent.Create(new
                {
                    phoneNumber,
                    newAppointmentDate = newDate,
                    newAppointmentTime = newTime,
                    newDoctorId,
                    reason,
                }),
            }, ct);

        return result ?? throw new HisConnectorException("HIS không trả về kết quả đổi lịch.");
    }

    /// <summary>
    /// Nhớ tạm danh mục ít đổi (khoa, bác sĩ) để đỡ đập vào HIS mỗi lần app mở màn đặt khám.
    /// Bộ nhớ dùng chung toàn tiến trình nên phải khoá khi ghi.
    /// </summary>
    private static readonly Dictionary<string, (object Value, DateTime ExpiresAt)> CatalogCache = new();
    private static readonly SemaphoreSlim CacheGate = new(1, 1);

    private async Task<T> GetCachedAsync<T>(
        string key, TimeSpan lifetime, Func<Task<T>> factory, CancellationToken ct) where T : class
    {
        await CacheGate.WaitAsync(ct);
        try
        {
            if (CatalogCache.TryGetValue(key, out var hit) && hit.ExpiresAt > DateTime.UtcNow)
                return (T)hit.Value;
        }
        finally
        {
            CacheGate.Release();
        }

        var value = await factory();

        await CacheGate.WaitAsync(ct);
        try
        {
            CatalogCache[key] = (value, DateTime.UtcNow.Add(lifetime));
        }
        finally
        {
            CacheGate.Release();
        }

        return value;
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
