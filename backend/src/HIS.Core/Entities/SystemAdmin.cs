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
    public string? Module { get; set; } // Module nguồn: Lab, Radiology, Pharmacy, etc.
    public string? ActionUrl { get; set; } // URL hành động khi click
    public Guid? TargetUserId { get; set; } // Người nhận (nếu gửi cho 1 người)
    public virtual User? TargetUser { get; set; }
    public Guid? TargetRoleId { get; set; } // Vai trò nhận (nếu gửi cho vai trò)
    public virtual Role? TargetRole { get; set; }
    public bool IsRead { get; set; } = false; // Đã đọc chưa
    public DateTime? ReadAt { get; set; } // Thời gian đọc
}

/// <summary>
/// Nhật ký SMS - SMS Log
/// </summary>
public class SmsLog : BaseEntity
{
    public string PhoneNumber { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string MessageType { get; set; } = string.Empty; // OTP, Result, Booking, Reminder, Critical, Test, Queue, General
    public string Provider { get; set; } = string.Empty; // esms, speedsms, dev
    public int Status { get; set; } // 0: Sent, 1: Failed, 2: DevMode
    public string? ErrorMessage { get; set; }
    public string? ProviderResponse { get; set; } // Raw JSON from provider
    public string? PatientName { get; set; } // For tracking context
    public string? RelatedEntityType { get; set; } // LabResult, Appointment, QueueTicket, etc.
    public Guid? RelatedEntityId { get; set; }
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

/// <summary>
/// Mẫu khảo sát hài lòng - Satisfaction Survey Template
/// </summary>
public class SatisfactionSurveyTemplate : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; } // OPD, IPD, Emergency, Surgery
    public string? Questions { get; set; } // JSON array of questions
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

/// <summary>
/// Kết quả khảo sát hài lòng - Satisfaction Survey Result
/// </summary>
public class SatisfactionSurveyResult : BaseEntity
{
    public Guid? TemplateId { get; set; }
    public string? TemplateName { get; set; }
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public double OverallScore { get; set; }
    public string? Answers { get; set; } // JSON
    public string? Comment { get; set; }
}

/// <summary>
/// Biên bản bàn giao ca trực điều dưỡng - Nurse Shift Handover
/// </summary>
public class NurseShiftHandover : BaseEntity
{
    public Guid DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string ShiftType { get; set; } = string.Empty; // Morning, Afternoon, Night
    public DateTime ShiftDate { get; set; }
    public Guid HandoverFromUserId { get; set; }
    public string? HandoverFromName { get; set; }
    public Guid? HandoverToUserId { get; set; }
    public string? HandoverToName { get; set; }
    public int TotalPatients { get; set; }
    public int CriticalPatients { get; set; }
    public int NewAdmissions { get; set; }
    public int Discharges { get; set; }
    public string? PendingOrders { get; set; } // JSON: pending medications, labs, etc.
    public string? SpecialNotes { get; set; } // Free text notes
    public string? IncidentNotes { get; set; } // Incidents during shift
    public bool IsAcknowledged { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public int Status { get; set; } // 0: Draft, 1: Submitted, 2: Acknowledged
}

/// <summary>
/// Chi nhánh / Cơ sở bệnh viện - Hospital Branch (NangCap15 1.21)
/// </summary>
public class HospitalBranch : BaseEntity
{
    public string BranchCode { get; set; } = string.Empty; // Mã chi nhánh
    public string BranchName { get; set; } = string.Empty; // Tên chi nhánh
    public string? Address { get; set; } // Địa chỉ
    public string? PhoneNumber { get; set; } // Số điện thoại
    public string? Email { get; set; } // Email
    public Guid? ParentBranchId { get; set; } // Chi nhánh cha (null = gốc)
    public bool IsActive { get; set; } = true;
    public bool IsHeadquarters { get; set; } = false; // Là trụ sở chính
    public virtual HospitalBranch? ParentBranch { get; set; }
    public virtual ICollection<HospitalBranch> ChildBranches { get; set; } = new List<HospitalBranch>();
}

/// <summary>
/// PACS Server từ xa - Remote PACS Server (NangCap15 PACS 3/4)
/// </summary>
public class RemotePacsServer : BaseEntity
{
    public string Name { get; set; } = string.Empty; // Tên server
    public string AeTitle { get; set; } = string.Empty; // AE Title (DICOM Application Entity)
    public string Host { get; set; } = string.Empty; // Hostname hoặc IP
    public int Port { get; set; } = 4242; // DICOM port (default 4242)
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}
