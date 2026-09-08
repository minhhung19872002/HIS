namespace HIS.PatientApp.Api.Entities;

/// <summary>
/// Refresh token cho phép "giữ đăng nhập" (HSMT I.2 #2) mà access token vẫn ngắn hạn.
///
/// Lưu BĂM chứ không lưu token thật: người đọc được CSDL cũng không mạo danh được ai.
/// Mỗi lần làm mới thì token cũ bị thu hồi và sinh token mới (rotation); nếu một token đã thu hồi
/// bị dùng lại thì gần như chắc chắn nó đã bị đánh cắp — khi đó thu hồi toàn bộ phiên của tài khoản.
/// </summary>
public class AppRefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AccountId { get; set; }
    public AppAccount? Account { get; set; }

    /// <summary>Gắn với thiết bị để đăng xuất từ xa một máy không làm rụng phiên các máy khác.</summary>
    public Guid DeviceId { get; set; }
    public AppDevice? Device { get; set; }

    /// <summary>SHA-256 của token, dạng hex thường.</summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedByIp { get; set; }

    public DateTime? RevokedAt { get; set; }

    /// <summary>Băm của token thay thế — dựng lại được chuỗi rotation khi điều tra sự cố.</summary>
    public string? ReplacedByTokenHash { get; set; }

    /// <summary>Khác null = token đã thu hồi này bị dùng lại, dấu hiệu bị đánh cắp.</summary>
    public DateTime? ReuseDetectedAt { get; set; }

    public bool IsActive(DateTime now) => RevokedAt is null && ExpiresAt > now;
}
