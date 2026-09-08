namespace HIS.PatientApp.Api.Entities;

/// <summary>
/// Thử thách một lần cho đăng nhập bằng sinh trắc học (HSMT I.2 #9).
///
/// Cách hoạt động: lúc bật sinh trắc, app sinh cặp khoá ECDSA P-256 và cất khoá riêng trong
/// Keychain/Keystore với điều kiện "chỉ mở được sau khi xác thực sinh trắc"; khoá công khai gửi lên
/// server. Khi đăng nhập, server phát một chuỗi ngẫu nhiên, app ký bằng khoá riêng — việc ký thành
/// công chứng minh chủ máy vừa quét mặt hoặc vân tay.
///
/// Vì sao không chỉ để app báo "đã xác thực xong": app bị sửa đổi có thể nói dối. Chữ ký thì không
/// giả được nếu không mở được khoá riêng.
/// </summary>
public class BiometricChallenge
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid DeviceId { get; set; }
    public AppDevice? Device { get; set; }

    /// <summary>Chuỗi ngẫu nhiên 32 byte, base64. Ký đúng chuỗi này mới được chấp nhận.</summary>
    public string Nonce { get; set; } = string.Empty;

    /// <summary>Sống rất ngắn: chỉ đủ cho một lần quét vân tay.</summary>
    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Khác null = đã dùng. Chống phát lại chữ ký đã bắt được.</summary>
    public DateTime? ConsumedAt { get; set; }

    public bool IsUsable(DateTime now) => ConsumedAt is null && ExpiresAt > now;
}
