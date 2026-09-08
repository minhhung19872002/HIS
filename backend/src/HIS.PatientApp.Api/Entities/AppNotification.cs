namespace HIS.PatientApp.Api.Entities;

/// <summary>
/// Hộp thư thông báo trong app (HSMT I.2 #9 inbox, I.3 #1 quản lý thông báo bệnh viện).
/// Bản ghi này là nguồn sự thật; việc đẩy push chỉ là cách báo cho người dùng biết có thư mới,
/// nên push hỏng không đồng nghĩa mất thông báo.
/// </summary>
public class AppNotification
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AccountId { get; set; }
    public AppAccount? Account { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    /// <summary>Xem <see cref="NotificationCategory"/> — dùng để lọc tab trong app.</summary>
    public string Category { get; set; } = NotificationCategory.System;

    /// <summary>Đường dẫn nội bộ app để chạm vào thông báo là mở đúng màn, ví dụ "/results/lab/123".</summary>
    public string? DeepLink { get; set; }

    /// <summary>
    /// Dữ liệu kèm theo dạng JSON. KHÔNG để kết quả y tế ở đây: payload này đi qua FCM và nằm lại
    /// trên VPS lẫn hạ tầng Google. Chỉ để id để app tự gọi API lấy nội dung.
    /// </summary>
    public string? DataJson { get; set; }

    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Id chiến dịch bên web quản trị, để thống kê đã gửi / đã đọc (HSMT I.3 #1).</summary>
    public Guid? CampaignId { get; set; }
}

public static class NotificationCategory
{
    public const string System = "system";
    public const string Result = "result";
    public const string Appointment = "appointment";
    public const string Queue = "queue";
    public const string Hospital = "hospital";
}
