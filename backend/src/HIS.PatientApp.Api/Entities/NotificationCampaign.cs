namespace HIS.PatientApp.Api.Entities;

/// <summary>
/// Một đợt gửi thông báo do bệnh viện soạn (HSMT I.3 #1.4).
///
/// <para>Tách khỏi <see cref="AppNotification"/> vì hai thứ trả lời hai câu hỏi khác nhau: bản ghi
/// thông báo trả lời "người này nhận được gì", còn chiến dịch trả lời "bệnh viện đã gửi gì, cho bao
/// nhiêu người, bao nhiêu người đã đọc".</para>
/// </summary>
public class NotificationCampaign
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Category { get; set; } = NotificationCategory.Hospital;
    public string? DeepLink { get; set; }

    /// <summary>Xem <see cref="CampaignAudience"/>.</summary>
    public string Audience { get; set; } = CampaignAudience.All;

    /// <summary>
    /// Danh sách id tài khoản (JSON) khi <see cref="Audience"/> = <c>selected</c>.
    /// Rỗng với các đối tượng khác.
    /// </summary>
    public string? TargetAccountIdsJson { get; set; }

    /// <summary>Thời điểm hẹn gửi (UTC). Null = gửi ngay.</summary>
    public DateTime? ScheduledAt { get; set; }

    public string Status { get; set; } = CampaignStatus.Draft;

    /// <summary>Số tài khoản đã được tạo thông báo. Điền khi gửi xong.</summary>
    public int RecipientCount { get; set; }

    public DateTime? SentAt { get; set; }
    public string? FailureReason { get; set; }

    /// <summary>Id tài khoản nhân viên bên HIS đã soạn — để truy trách nhiệm.</summary>
    public Guid CreatedByUserId { get; set; }
    public string CreatedByName { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public static class CampaignAudience
{
    /// <summary>Mọi tài khoản đang hoạt động.</summary>
    public const string All = "all";

    /// <summary>Chỉ những tài khoản đã liên kết hồ sơ bệnh án.</summary>
    public const string Linked = "linked";

    /// <summary>Những tài khoản có lịch hẹn trong 7 ngày tới.</summary>
    public const string UpcomingAppointment = "upcoming_appointment";

    /// <summary>Danh sách tài khoản chọn tay.</summary>
    public const string Selected = "selected";

    public static readonly string[] All_ = { All, Linked, UpcomingAppointment, Selected };

    public static bool IsValid(string? value) => value is not null && All_.Contains(value);

    public static string Describe(string value) => value switch
    {
        All => "Tất cả người dùng app",
        Linked => "Người đã liên kết hồ sơ bệnh án",
        UpcomingAppointment => "Người có lịch hẹn trong 7 ngày tới",
        Selected => "Danh sách chọn tay",
        _ => value,
    };
}

public static class CampaignStatus
{
    public const string Draft = "Draft";

    /// <summary>Đã hẹn giờ, worker sẽ gửi khi tới hạn.</summary>
    public const string Scheduled = "Scheduled";

    public const string Sent = "Sent";
    public const string Failed = "Failed";
    public const string Cancelled = "Cancelled";
}
