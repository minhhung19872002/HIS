namespace HIS.Core.Entities;

/// <summary>
/// Lịch sử backup cơ sở dữ liệu.
/// BackupType: 0=Manual, 1=Scheduled.
/// Status: 0=Running, 1=Success, 2=Failed.
/// Destination: "Local" | "NAS" | "Cloud" (tuỳ cấu hình Backup.Destination).
/// </summary>
public class BackupHistory : BaseEntity
{
    /// <summary>Tên file backup (ví dụ HIS_Full_20260616_143000.bak)</summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>Đường dẫn đầy đủ trên hệ thống file (null nếu Cloud-only)</summary>
    public string? FilePath { get; set; }

    /// <summary>Kích thước file tính bằng byte (0 nếu chưa hoàn thành)</summary>
    public long SizeBytes { get; set; }

    /// <summary>Loại backup: 0=Manual, 1=Scheduled</summary>
    public int BackupType { get; set; }

    /// <summary>Đích lưu trữ: "Local" | "NAS" | "Cloud"</summary>
    public string? Destination { get; set; }

    /// <summary>Trạng thái: 0=Running, 1=Success, 2=Failed</summary>
    public int Status { get; set; }

    /// <summary>Thời điểm bắt đầu backup (UTC)</summary>
    public DateTime StartedAt { get; set; }

    /// <summary>Thời điểm hoàn thành (null nếu đang chạy hoặc thất bại khi chưa kết thúc)</summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>Thông báo lỗi (null nếu thành công)</summary>
    public string? ErrorMessage { get; set; }
}
