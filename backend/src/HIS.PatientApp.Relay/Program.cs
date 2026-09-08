using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Google.Apis.Auth.OAuth2;

// =============================================================================
// Relay day thong bao — HSMT muc II (he thong truyen tai du lieu nguoi dung, VPS Cloud).
//
// Vai tro duy nhat: nhan yeu cau tu BFF trong data center benh vien roi chuyen tiep sang
// Firebase Cloud Messaging.
//
// Nhung dieu dich vu nay CO Y KHONG lam:
//   - Khong luu du lieu y te. Khong co CSDL. Payload di qua roi thoi.
//   - Khong mo duong tu Internet vao data center. Chieu ket noi luon la DC -> VPS.
//   - Khong biet benh nhan la ai: chi thay token thiet bi, tieu de va tom tat.
// =============================================================================

var builder = WebApplication.CreateSlimBuilder(args);

builder.Services.AddHttpClient("fcm");

var app = builder.Build();

var config = app.Configuration;
var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("relay");

// Khoa dung chung voi BFF. Khong co no thi ai biet dia chi relay cung gui duoc thong bao
// gia mao toi nguoi benh — nen tu choi khoi dong thay vi chay khong bao ve.
var relayKey = config["Relay:ApiKey"];
if (string.IsNullOrWhiteSpace(relayKey) || relayKey.Length < 24)
{
    throw new InvalidOperationException(
        "Relay:ApiKey phai duoc dat va dai toi thieu 24 ky tu.");
}

var projectId = config["Fcm:ProjectId"];
var credentialsPath = config["Fcm:CredentialsPath"];
if (string.IsNullOrWhiteSpace(projectId) || string.IsNullOrWhiteSpace(credentialsPath))
{
    throw new InvalidOperationException(
        "Fcm:ProjectId va Fcm:CredentialsPath la bat buoc — relay khong gui duoc gi neu thieu.");
}

// Nap khoa tai khoan dich vu MOT lan luc khoi dong: thieu hay sai thi bao ngay, thay vi
// den luc co thong bao dau tien moi lo.
var googleCredential = (await GoogleCredential.FromFileAsync(credentialsPath, CancellationToken.None))
    .CreateScoped("https://www.googleapis.com/auth/firebase.messaging");

app.MapGet("/health", () => Results.Ok(new { status = "ok", utc = DateTime.UtcNow }));

app.MapPost("/push", async (
    HttpContext http,
    IHttpClientFactory httpFactory,
    CancellationToken ct) =>
{
    if (!http.Request.Headers.TryGetValue("X-Relay-Key", out var providedKey) ||
        !CryptographicEquals(providedKey.ToString(), relayKey))
    {
        // Khong noi ro sai o dau.
        return Results.StatusCode(StatusCodes.Status401Unauthorized);
    }

    PushRequest? request;
    try
    {
        request = await http.Request.ReadFromJsonAsync<PushRequest>(ct);
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { error = "Noi dung khong phai JSON hop le." });
    }

    if (request is null || string.IsNullOrWhiteSpace(request.Token))
    {
        return Results.BadRequest(new { error = "Thieu token thiet bi." });
    }

    var accessToken = await googleCredential.UnderlyingCredential
        .GetAccessTokenForRequestAsync(cancellationToken: ct);

    var payload = request.Payload;
    var title = ReadString(payload, "title") ?? "Thong bao";
    var body = ReadString(payload, "body") ?? string.Empty;

    // Gui KEM ca notification lan data: notification de he dieu hanh hien duoc khi app dang tat,
    // data de app mo dung man khi nguoi dung cham vao.
    var message = new
    {
        message = new
        {
            token = request.Token,
            notification = new { title, body },
            data = new
            {
                notificationId = ReadString(payload, "notificationId") ?? string.Empty,
                category = ReadString(payload, "category") ?? string.Empty,
                deepLink = ReadString(payload, "deepLink") ?? string.Empty,
            },
            android = new { priority = "HIGH" },
            apns = new
            {
                headers = new Dictionary<string, string> { ["apns-priority"] = "10" },
                // content-available de iOS danh thuc app chay ngam (HSMT I.2 #2).
                payload = new { aps = new { contentAvailable = 1 } },
            },
        },
    };

    var client = httpFactory.CreateClient("fcm");
    using var fcmRequest = new HttpRequestMessage(
        HttpMethod.Post, $"https://fcm.googleapis.com/v1/projects/{projectId}/messages:send")
    {
        Content = JsonContent.Create(message),
    };
    fcmRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

    HttpResponseMessage fcmResponse;
    try
    {
        fcmResponse = await client.SendAsync(fcmRequest, ct);
    }
    catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
    {
        logger.LogWarning(ex, "Khong goi duoc FCM.");
        // 503 de BFF hieu la loi tam thoi va xep lai hang cho.
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }

    using (fcmResponse)
    {
        if (fcmResponse.IsSuccessStatusCode) return Results.Ok(new { sent = true });

        // FCM tra 404 khi token khong con ton tai. Chuyen nguyen ma de BFF don token chet
        // thay vi thu lai vo ich.
        if (fcmResponse.StatusCode == HttpStatusCode.NotFound)
        {
            return Results.StatusCode(StatusCodes.Status404NotFound);
        }

        var errorBody = await fcmResponse.Content.ReadAsStringAsync(ct);
        logger.LogError(
            "FCM tu choi: HTTP {Status} {Body}",
            (int)fcmResponse.StatusCode,
            errorBody.Length > 300 ? errorBody[..300] : errorBody);

        return Results.StatusCode((int)fcmResponse.StatusCode);
    }
});

app.Run();

/// <summary>So sanh khoa theo thoi gian hang so de khong ro ri thong tin qua thoi gian phan hoi.</summary>
static bool CryptographicEquals(string a, string b)
{
    if (a.Length != b.Length) return false;
    var diff = 0;
    for (var i = 0; i < a.Length; i++) diff |= a[i] ^ b[i];
    return diff == 0;
}

static string? ReadString(JsonElement element, string property) =>
    element.ValueKind == JsonValueKind.Object &&
    element.TryGetProperty(property, out var value) &&
    value.ValueKind == JsonValueKind.String
        ? value.GetString()
        : null;

/// <summary>Yeu cau day mot thong bao toi mot thiet bi.</summary>
record PushRequest(string Token, JsonElement Payload);
