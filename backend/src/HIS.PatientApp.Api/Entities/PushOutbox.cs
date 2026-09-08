namespace HIS.PatientApp.Api.Entities;

/// <summary>
/// Hàng đợi đẩy push, theo mẫu outbox.
///
/// Lý do phải có bảng này thay vì gọi thẳng FCM: relay nằm trên VPS cloud (HSMT mục II) còn nơi sinh
/// thông báo nằm trong data center bệnh viện. Đường giữa hai nơi có lúc đứt. Ghi vào bảng cùng
/// transaction với <see cref="AppNotification"/> rồi mới gửi, thì mạng đứt chỉ làm thông báo đến muộn
/// chứ không làm mất.
/// </summary>
public class PushOutbox
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid NotificationId { get; set; }
    public AppNotification? Notification { get; set; }

    public Guid AccountId { get; set; }
    public Guid DeviceId { get; set; }

    /// <summary>Chụp lại token FCM tại thời điểm xếp hàng — thiết bị có thể xoay token sau đó.</summary>
    public string PushToken { get; set; } = string.Empty;

    /// <summary>Nội dung gửi FCM. Chỉ tiêu đề, tóm tắt và deep-link — KHÔNG có dữ liệu y tế.</summary>
    public string Payload { get; set; } = string.Empty;

    /// <summary>Xem <see cref="PushOutboxStatus"/>.</summary>
    public string Status { get; set; } = PushOutboxStatus.Pending;

    public int AttemptCount { get; set; }

    /// <summary>Mốc được phép thử lại — giãn cách tăng dần để không dội bom FCM khi nó đang lỗi.</summary>
    public DateTime NextAttemptAt { get; set; } = DateTime.UtcNow;

    public DateTime? SentAt { get; set; }
    public string? LastError { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public static class PushOutboxStatus
{
    public const string Pending = "pending";
    public const string Sent = "sent";

    /// <summary>Hết số lần thử. Thông báo vẫn còn trong inbox, chỉ là không đẩy được.</summary>
    public const string Failed = "failed";

    /// <summary>Token bị FCM báo không còn hợp lệ — thiết bị đã gỡ app hoặc xoay token.</summary>
    public const string TokenInvalid = "token_invalid";
}
