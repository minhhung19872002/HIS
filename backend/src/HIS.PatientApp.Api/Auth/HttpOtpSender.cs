using System.Text;
using Microsoft.Extensions.Options;

namespace HIS.PatientApp.Api.Auth;

/// <summary>
/// Gửi OTP qua cổng SMS của bệnh viện — bản THẬT, dùng ở môi trường chạy thật.
///
/// Vì sao là một bản HTTP theo khuôn mẫu chứ không phải một bản riêng cho từng nhà mạng: mọi cổng
/// SMS brandname ở Việt Nam (VNPT, Viettel, eSMS, SpeedSMS, Infobip…) đều là "POST một JSON hoặc
/// một form tới một URL, kèm một header xác thực". Khác nhau chỉ ở tên trường và cách xác thực.
/// Chọn một nhà cung cấp cụ thể để viết cứng vào mã nghĩa là bệnh viện đổi nhà cung cấp thì phải
/// sửa mã và phát hành lại; khai bằng cấu hình thì đổi nhà cung cấp chỉ là sửa `appsettings`.
///
/// Cấu hình mẫu cho vài cổng thông dụng: `docs/features/patient-app/external-services-setup.md` §1.
/// </summary>
public class HttpOtpSender : IOtpSender
{
    public const string HttpClientName = "otp-sms";

    private readonly IHttpClientFactory _httpFactory;
    private readonly OtpSenderOptions _options;
    private readonly ILogger<HttpOtpSender> _logger;

    public HttpOtpSender(
        IHttpClientFactory httpFactory,
        IOptions<OtpSenderOptions> options,
        ILogger<HttpOtpSender> logger)
    {
        _httpFactory = httpFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(
        string phoneNumber, string code, string purpose, CancellationToken ct = default)
    {
        var message = _options.MessageTemplate
            .Replace("{code}", code, StringComparison.Ordinal)
            .Replace("{minutes}", _options.CodeLifetimeMinutes.ToString(), StringComparison.Ordinal);

        // Nhiều cổng SMS trong nước chỉ nhận số dạng 84… hoặc 0…, không nhận "+84".
        var phone = PhoneNumbers.Normalize(phoneNumber);
        var phoneForGateway = _options.PhoneFormat switch
        {
            OtpPhoneFormat.Local => "0" + phone[3..],          // +84912345678 → 0912345678
            OtpPhoneFormat.NoPlus => phone.TrimStart('+'),      // +84912345678 → 84912345678
            _ => phone,                                         // giữ nguyên +84…
        };

        var body = _options.BodyTemplate
            .Replace("{phone}", phoneForGateway, StringComparison.Ordinal)
            .Replace("{message}", JsonEscape(message), StringComparison.Ordinal);

        var client = _httpFactory.CreateClient(HttpClientName);
        using var request = new HttpRequestMessage(new HttpMethod(_options.Method), _options.Url)
        {
            Content = new StringContent(body, Encoding.UTF8, _options.ContentType),
        };

        foreach (var (name, value) in _options.Headers)
        {
            request.Headers.TryAddWithoutValidation(name, value);
        }

        HttpResponseMessage response;
        try
        {
            response = await client.SendAsync(request, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            // Ném lại để `OtpService` không ghi nhận là đã gửi: người bệnh phải thấy lỗi và bấm gửi
            // lại, thay vì ngồi chờ một tin nhắn không bao giờ tới.
            _logger.LogError(ex, "Không gọi được cổng SMS khi gửi OTP cho {Phone}.",
                PhoneNumbers.Mask(phoneNumber));
            throw new OtpSendFailedException("Không gửi được mã xác minh. Vui lòng thử lại.", ex);
        }

        using (response)
        {
            var payload = await response.Content.ReadAsStringAsync(ct);

            // Một số cổng trả HTTP 200 kèm mã lỗi trong thân phản hồi. Không kiểm thì hệ thống tưởng
            // đã gửi, còn người bệnh thì không nhận được gì và không ai biết vì sao.
            var ok = response.IsSuccessStatusCode
                     && (string.IsNullOrEmpty(_options.SuccessContains)
                         || payload.Contains(_options.SuccessContains, StringComparison.OrdinalIgnoreCase));

            if (!ok)
            {
                _logger.LogError(
                    "Cổng SMS từ chối gửi OTP cho {Phone}: HTTP {Status} {Body}",
                    PhoneNumbers.Mask(phoneNumber), (int)response.StatusCode,
                    payload.Length > 300 ? payload[..300] : payload);
                throw new OtpSendFailedException("Không gửi được mã xác minh. Vui lòng thử lại.");
            }

            // KHÔNG ghi mã OTP vào log — đó là cả điểm của việc thay bản in-log bằng bản này.
            _logger.LogInformation("Đã gửi OTP ({Purpose}) tới {Phone}.",
                purpose, PhoneNumbers.Mask(phoneNumber));
        }
    }

    /// <summary>Thoát ký tự để nội dung tin nhắn không phá vỡ JSON của khuôn mẫu.</summary>
    private static string JsonEscape(string value) => value
        .Replace("\\", "\\\\", StringComparison.Ordinal)
        .Replace("\"", "\\\"", StringComparison.Ordinal)
        .Replace("\n", "\\n", StringComparison.Ordinal)
        .Replace("\r", string.Empty, StringComparison.Ordinal);
}

/// <summary>Gửi OTP hỏng. Tách riêng để tầng trên trả đúng thông điệp cho người bệnh.</summary>
public class OtpSendFailedException : Exception
{
    public OtpSendFailedException(string message, Exception? inner = null) : base(message, inner) { }
}

public enum OtpPhoneFormat
{
    /// <summary>Giữ nguyên <c>+84912345678</c>.</summary>
    E164 = 0,

    /// <summary><c>84912345678</c> — dạng nhiều cổng trong nước dùng.</summary>
    NoPlus = 1,

    /// <summary><c>0912345678</c>.</summary>
    Local = 2,
}

public class OtpSenderOptions
{
    public const string SectionName = "OtpSender";

    /// <summary><c>fake</c> (in ra log, chỉ cho môi trường phát triển) hoặc <c>http</c>.</summary>
    public string Provider { get; set; } = "fake";

    public string Url { get; set; } = string.Empty;
    public string Method { get; set; } = "POST";
    public string ContentType { get; set; } = "application/json";

    /// <summary>Header xác thực của cổng SMS, ví dụ <c>Authorization: Bearer …</c>.</summary>
    public Dictionary<string, string> Headers { get; set; } = new();

    /// <summary>
    /// Thân yêu cầu, với hai chỗ thay: <c>{phone}</c> và <c>{message}</c>.
    /// Ví dụ: <c>{"to":"{phone}","content":"{message}","brandname":"BENHVIEN"}</c>
    /// </summary>
    public string BodyTemplate { get; set; } = string.Empty;

    /// <summary>Chuỗi phải xuất hiện trong phản hồi mới coi là gửi thành công. Để trống thì chỉ xét mã HTTP.</summary>
    public string SuccessContains { get; set; } = string.Empty;

    public OtpPhoneFormat PhoneFormat { get; set; } = OtpPhoneFormat.NoPlus;

    /// <summary>Nội dung tin nhắn, với hai chỗ thay: <c>{code}</c> và <c>{minutes}</c>.</summary>
    public string MessageTemplate { get; set; } =
        "Ma xac minh cua ban la {code}, het han sau {minutes} phut. Khong chia se ma nay cho bat ky ai.";

    public int CodeLifetimeMinutes { get; set; } = 5;

    public int TimeoutSeconds { get; set; } = 15;
}
