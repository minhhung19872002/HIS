using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
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
        var page = await SendAsync<HisPagedResult<HisPatient>>(
            () => new HttpRequestMessage(HttpMethod.Post, "/api/patients/search")
            {
                Content = JsonContent.Create(new { keyword = phoneNumber, pageIndex = 1, pageSize = 20 }),
            }, ct);

        var items = page?.Items ?? new List<HisPatient>();

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
        Guid? departmentId, CancellationToken ct = default, int? roomType = null)
    {
        var rooms = await SendAsync<List<HisRoom>>(
            () => new HttpRequestMessage(HttpMethod.Get, "/api/reception/rooms/overview"), ct)
            ?? new List<HisRoom>();

        IEnumerable<HisRoom> result = rooms;

        if (departmentId.HasValue)
            result = result.Where(r => r.DepartmentId == departmentId);

        // Lọc theo loại phòng: app lấy số chỉ được chọn QUẦY TIẾP ĐÓN, không chọn thẳng phòng khám.
        if (roomType.HasValue)
            result = result.Where(r => r.RoomType == roomType.Value);

        return result.ToList();
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

    // ------------------------------------------- kết quả ngoại trú (I.2 #5)

    public async Task<IReadOnlyList<HisVisitSummary>> GetVisitsAsync(
        Guid patientId, int limit = 20, CancellationToken ct = default)
        => await SendAsync<List<HisVisitSummary>>(
            () => new HttpRequestMessage(
                HttpMethod.Get, $"/api/portal/visits?patientId={patientId}&limit={limit}"), ct)
            ?? new List<HisVisitSummary>();

    public async Task<IReadOnlyList<HisLabResult>> GetLabResultsAsync(
        Guid patientId, Guid? visitId = null, Guid? admissionId = null, CancellationToken ct = default)
        => await SendAsync<List<HisLabResult>>(
            () => new HttpRequestMessage(
                HttpMethod.Get,
                $"/api/portal/lab-results?patientId={patientId}{Scope(visitId, admissionId)}"), ct)
            ?? new List<HisLabResult>();

    public Task<HisLabResult?> GetLabResultAsync(Guid patientId, Guid resultId, CancellationToken ct = default)
        => SendAsync<HisLabResult>(
            () => new HttpRequestMessage(
                HttpMethod.Get, $"/api/portal/lab-results/{resultId}?patientId={patientId}"),
            ct, allowNotFound: true);

    public Task<HisImageBytes?> GetLabResultReportAsync(
        Guid patientId, Guid resultId, CancellationToken ct = default)
        => GetBinaryAsync(
            $"/api/portal/lab-results/{resultId}/report?patientId={patientId}", ct);

    public async Task<IReadOnlyList<HisImagingResult>> GetImagingResultsAsync(
        Guid patientId, Guid? visitId = null, Guid? admissionId = null, CancellationToken ct = default)
        => await SendAsync<List<HisImagingResult>>(
            () => new HttpRequestMessage(
                HttpMethod.Get,
                $"/api/portal/imaging-results?patientId={patientId}{Scope(visitId, admissionId)}"), ct)
            ?? new List<HisImagingResult>();

    public Task<HisImagingResult?> GetImagingResultAsync(Guid patientId, Guid resultId, CancellationToken ct = default)
        => SendAsync<HisImagingResult>(
            () => new HttpRequestMessage(
                HttpMethod.Get, $"/api/portal/imaging-results/{resultId}?patientId={patientId}"),
            ct, allowNotFound: true);

    public async Task<IReadOnlyList<HisImagingInstance>> GetImagingInstancesAsync(
        Guid patientId, Guid resultId, CancellationToken ct = default)
        => await SendAsync<List<HisImagingInstance>>(
            () => new HttpRequestMessage(
                HttpMethod.Get,
                $"/api/portal/imaging-results/{resultId}/instances?patientId={patientId}"), ct)
            ?? new List<HisImagingInstance>();

    /// <summary>
    /// Ảnh là dữ liệu nhị phân nên không đi qua <see cref="SendAsync"/> (hàm đó chỉ đọc JSON).
    /// Vẫn giữ nguyên cách thử lại một lần khi token hết hạn.
    /// </summary>
    public Task<HisImageBytes?> GetImagingInstanceImageAsync(
        Guid patientId, Guid resultId, string instanceId, int width, CancellationToken ct = default)
        => GetBinaryAsync(
            $"/api/portal/imaging-results/{resultId}/instances/"
            + $"{Uri.EscapeDataString(instanceId)}/rendered?width={width}&patientId={patientId}", ct);

    /// <summary>
    /// Tải một tài nguyên nhị phân (ảnh, bản in). Không đi qua <see cref="SendAsync"/> vì hàm đó chỉ
    /// đọc JSON, nhưng vẫn giữ nguyên cách thử lại một lần khi token hết hạn.
    /// </summary>
    private async Task<HisImageBytes?> GetBinaryAsync(string path, CancellationToken ct)
    {
        var response = await SendOnceAsync(() => new HttpRequestMessage(HttpMethod.Get, path), ct);

        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            _tokenProvider.Invalidate();
            response.Dispose();
            response = await SendOnceAsync(() => new HttpRequestMessage(HttpMethod.Get, path), ct);
        }

        using (response)
        {
            if (response.StatusCode == HttpStatusCode.NotFound) return null;

            if (!response.IsSuccessStatusCode)
                throw new HisConnectorException(
                    $"HIS trả về HTTP {(int)response.StatusCode} cho {path}.", (int)response.StatusCode);

            return new HisImageBytes(
                await response.Content.ReadAsByteArrayAsync(ct),
                response.Content.Headers.ContentType?.ToString() ?? "application/octet-stream");
        }
    }

    public async Task<IReadOnlyList<HisFunctionalResult>> GetFunctionalResultsAsync(
        Guid patientId, Guid? visitId = null, Guid? admissionId = null, CancellationToken ct = default)
        => await SendAsync<List<HisFunctionalResult>>(
            () => new HttpRequestMessage(
                HttpMethod.Get,
                $"/api/portal/functional-results?patientId={patientId}{Scope(visitId, admissionId)}"), ct)
            ?? new List<HisFunctionalResult>();

    public Task<HisFunctionalResult?> GetFunctionalResultAsync(Guid patientId, Guid resultId, CancellationToken ct = default)
        => SendAsync<HisFunctionalResult>(
            () => new HttpRequestMessage(
                HttpMethod.Get, $"/api/portal/functional-results/{resultId}?patientId={patientId}"),
            ct, allowNotFound: true);

    public async Task<IReadOnlyList<HisHealthCheckup>> GetHealthCheckupsAsync(
        Guid patientId, CancellationToken ct = default)
        => await SendAsync<List<HisHealthCheckup>>(
            () => new HttpRequestMessage(
                HttpMethod.Get, $"/api/portal/health-checkups?patientId={patientId}"), ct)
            ?? new List<HisHealthCheckup>();

    public async Task<IReadOnlyList<HisPrescription>> GetPrescriptionsAsync(
        Guid patientId, bool activeOnly, CancellationToken ct = default)
        => await SendAsync<List<HisPrescription>>(
            () => new HttpRequestMessage(
                HttpMethod.Get,
                $"/api/portal/prescriptions?patientId={patientId}&activeOnly={activeOnly.ToString().ToLowerInvariant()}"),
            ct)
            ?? new List<HisPrescription>();

    /// <summary>Phạm vi lọc kết quả: theo lượt khám ngoại trú hoặc theo đợt nằm viện.</summary>
    private static string Scope(Guid? visitId, Guid? admissionId) =>
        (visitId.HasValue ? $"&visitId={visitId}" : "")
        + (admissionId.HasValue ? $"&admissionId={admissionId}" : "");

    // ------------------------------------------------------------- nội trú

    public async Task<IReadOnlyList<HisAdmission>> GetAdmissionsAsync(
        Guid patientId, CancellationToken ct = default)
        => await SendAsync<List<HisAdmission>>(
            () => new HttpRequestMessage(
                HttpMethod.Get, $"/api/portal/admissions?patientId={patientId}"), ct)
            ?? new List<HisAdmission>();

    public Task<HisMedicineDisclosure?> GetMedicineDisclosureAsync(
        Guid patientId, Guid admissionId, CancellationToken ct = default)
        => SendAsync<HisMedicineDisclosure>(
            () => new HttpRequestMessage(
                HttpMethod.Get,
                $"/api/portal/admissions/{admissionId}/medicine-disclosure?patientId={patientId}"),
            ct, allowNotFound: true);

    public async Task<IReadOnlyList<HisServiceOrder>> GetServiceOrdersAsync(
        Guid patientId, Guid admissionId, CancellationToken ct = default)
        => await SendAsync<List<HisServiceOrder>>(
            () => new HttpRequestMessage(
                HttpMethod.Get,
                $"/api/portal/admissions/{admissionId}/service-orders?patientId={patientId}"), ct)
            ?? new List<HisServiceOrder>();

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
    private Task<T?> GetOrNullAsync<T>(string path, CancellationToken ct) where T : class
        => SendAsync<T>(() => new HttpRequestMessage(HttpMethod.Get, path), ct, allowNotFound: true);

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

            return await ReadPayloadAsync<TResponse>(response, ct);
        }
    }

    private static readonly JsonSerializerOptions PayloadJson =
        new(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };

    /// <summary>
    /// Bóc kết quả thật ra khỏi lớp vỏ <c>{success, data, message, errors, meta}</c> mà HIS.API bọc
    /// quanh mọi phản hồi.
    ///
    /// Chịu được CẢ HAI dạng — có vỏ và không vỏ — vì HIS không bọc đồng nhất (ví dụ <c>/health</c>
    /// trả thẳng). Đoán sai lớp vỏ không làm request lỗi mà làm mọi trường về giá trị mặc định:
    /// vé xếp hàng mã rỗng, danh sách khoa trống. Đó là kiểu hỏng âm thầm, nguy hiểm hơn 500.
    /// </summary>
    private static async Task<T?> ReadPayloadAsync<T>(HttpResponseMessage response, CancellationToken ct)
        where T : class
    {
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

        var root = document.RootElement;
        var body = root.ValueKind == JsonValueKind.Object
                   && root.TryGetProperty("success", out _)
                   && root.TryGetProperty("data", out var data)
            ? data
            : root;

        return body.ValueKind == JsonValueKind.Null ? null : body.Deserialize<T>(PayloadJson);
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
