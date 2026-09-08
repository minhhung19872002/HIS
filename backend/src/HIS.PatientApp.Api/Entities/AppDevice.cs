namespace HIS.PatientApp.Api.Entities;

/// <summary>
/// Một thiết bị đã đăng nhập. Phục vụ đúng dòng HSMT I.2 #9 "Quản lý tất cả thiết bị đăng nhập":
/// người bệnh xem được danh sách máy đang có phiên và đăng xuất từ xa từng máy.
/// </summary>
public class AppDevice
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AccountId { get; set; }
    public AppAccount? Account { get; set; }

    /// <summary>
    /// Khoá thiết bị do app sinh và giữ trong Keychain/Keystore. Cùng một máy đăng nhập lại phải ra
    /// cùng giá trị, nếu không danh sách thiết bị sẽ đẻ thêm dòng mới mỗi lần đăng nhập.
    /// </summary>
    public string DeviceKey { get; set; } = string.Empty;

    /// <summary>Tên máy hiển thị cho người dùng, ví dụ "iPhone 13 của Hùng".</summary>
    public string DeviceName { get; set; } = string.Empty;

    /// <summary>ios | android</summary>
    public string Platform { get; set; } = string.Empty;

    public string? OsVersion { get; set; }
    public string? AppVersion { get; set; }

    /// <summary>Token FCM để đẩy thông báo. Null khi người dùng từ chối quyền thông báo.</summary>
    public string? PushToken { get; set; }

    /// <summary>
    /// Khoá công khai của cặp khoá sinh trắc trên máy. Máy ký challenge bằng khoá riêng vốn chỉ mở
    /// được sau khi xác thực FaceID/vân tay — server nhờ đó tin được rằng đúng chủ máy vừa xác thực,
    /// chứ không chỉ tin lời app nói.
    /// </summary>
    public string? BiometricPublicKey { get; set; }

    public DateTime? BiometricEnabledAt { get; set; }

    public string? LastIp { get; set; }
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Khác null = đã bị đăng xuất từ xa. Giữ lại bản ghi để còn hiện trong lịch sử đăng nhập.</summary>
    public DateTime? RevokedAt { get; set; }

    public bool IsActive => RevokedAt is null;
}
