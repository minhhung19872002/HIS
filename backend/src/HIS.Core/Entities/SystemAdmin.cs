namespace HIS.Core.Entities;

/// <summary>
/// Cấu hình hệ thống - System Configuration
/// </summary>
public class SystemConfig : BaseEntity
{
    public string ConfigKey { get; set; } = string.Empty; // Khóa cấu hình
    public string ConfigValue { get; set; } = string.Empty; // Giá trị cấu hình
    public string ConfigType { get; set; } = string.Empty; // Loại: String, Number, Boolean, JSON
    public string? Description { get; set; } // Mô tả
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Phiên đăng nhập - User Session
/// </summary>
public class UserSession : BaseEntity
{
    public Guid UserId { get; set; }
    public virtual User User { get; set; } = null!;

    public string SessionToken { get; set; } = string.Empty; // Token phiên đăng nhập
    public DateTime LoginTime { get; set; } // Thời gian đăng nhập
    public DateTime? LogoutTime { get; set; } // Thời gian đăng xuất
    public string? IPAddress { get; set; } // Địa chỉ IP
    public string? UserAgent { get; set; } // Thông tin trình duyệt
    public int Status { get; set; } // 0: Active, 1: Expired, 2: Logged out
}

/// <summary>
/// Nhật ký hệ thống - System Log
/// </summary>
public class SystemLog : BaseEntity
{
    public string LogType { get; set; } = string.Empty; // Info, Warning, Error, Critical
    public string LogLevel { get; set; } = string.Empty; // Level: 1-5
    public string Message { get; set; } = string.Empty; // Thông điệp
    public string? Exception { get; set; } // Chi tiết lỗi (nếu có)
    public Guid? UserId { get; set; } // Người dùng liên quan
    public virtual User? User { get; set; }
    public string? IPAddress { get; set; } // Địa chỉ IP
}

/// <summary>
/// Thông báo - Notification
/// </summary>
public class Notification : BaseEntity
{
    public string Title { get; set; } = string.Empty; // Tiêu đề
    public string Content { get; set; } = string.Empty; // Nội dung
    public string NotificationType { get; set; } = string.Empty; // Info, Warning, Error, Success
    public Guid? TargetUserId { get; set; } // Người nhận (nếu gửi cho 1 người)
    public virtual User? TargetUser { get; set; }
    public Guid? TargetRoleId { get; set; } // Vai trò nhận (nếu gửi cho vai trò)
    public virtual Role? TargetRole { get; set; }
    public bool IsRead { get; set; } = false; // Đã đọc chưa
    public DateTime? ReadAt { get; set; } // Thời gian đọc
}

/// <summary>
/// Tác vụ định kỳ - Scheduled Task
/// </summary>
public class ScheduledTask : BaseEntity
{
    public string TaskName { get; set; } = string.Empty; // Tên tác vụ
    public string TaskType { get; set; } = string.Empty; // Loại tác vụ
    public string CronExpression { get; set; } = string.Empty; // Biểu thức cron
    public DateTime? LastRunTime { get; set; } // Lần chạy cuối
    public DateTime? NextRunTime { get; set; } // Lần chạy tiếp theo
    public int Status { get; set; } // 0: Enabled, 1: Disabled, 2: Running
    public string? Parameters { get; set; } // Tham số (JSON)
}
