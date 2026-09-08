namespace HIS.PatientApp.Api.Push;

/// <summary>Kết quả gửi một thông báo tới một thiết bị.</summary>
public enum PushResult
{
    Sent,

    /// <summary>Lỗi tạm thời (mạng, relay bận). Nên thử lại.</summary>
    RetryLater,

    /// <summary>Token không còn hợp lệ — thiết bị đã gỡ app hoặc xoay token. Đừng thử lại.</summary>
    TokenInvalid,

    /// <summary>Lỗi vĩnh viễn khác (payload sai…). Đừng thử lại.</summary>
    PermanentFailure,
}

/// <summary>
/// Kênh đẩy thông báo tới thiết bị.
///
/// Tách interface vì nơi gửi thật nằm trên VPS cloud (HSMT mục II) chứ không nằm trong data center:
/// máy chủ trong bệnh viện không nên mở đường ra Internet để gọi thẳng FCM.
/// </summary>
public interface IPushSender
{
    Task<PushResult> SendAsync(
        string pushToken, string payloadJson, CancellationToken ct = default);
}

public class PushRelayOptions
{
    public const string SectionName = "PushRelay";

    /// <summary>Địa chỉ relay trên VPS. Để trống = tắt hẳn việc đẩy push.</summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// Khoá dùng chung giữa DC và relay. Relay chỉ nhận yêu cầu có khoá này — nếu không, bất kỳ ai
    /// biết địa chỉ relay đều gửi được thông báo giả mạo tới người bệnh.
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    public int TimeoutSeconds { get; set; } = 15;

    /// <summary>Số lần thử một thông báo trước khi bỏ cuộc.</summary>
    public int MaxAttempts { get; set; } = 5;

    /// <summary>Chu kỳ quét hàng đợi.</summary>
    public int PollIntervalSeconds { get; set; } = 10;

    /// <summary>Số bản ghi xử lý mỗi vòng.</summary>
    public int BatchSize { get; set; } = 50;
}
