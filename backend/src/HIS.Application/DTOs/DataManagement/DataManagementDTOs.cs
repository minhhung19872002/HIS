namespace HIS.Application.DTOs.DataManagement;

public class BackupInfoDto
{
    public Guid Id { get; set; }
    public string BackupType { get; set; } = string.Empty; // Full, Differential, Transaction Log
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // Completed, InProgress, Failed
    public List<string> Modules { get; set; } = new();
    public string? Remarks { get; set; }
}

public class DataExportRequestDto
{
    public List<string> Modules { get; set; } = new();
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public string Format { get; set; } = "SQL"; // SQL, JSON, CSV, XML
    public bool IncludeAttachments { get; set; }
    public string? Remarks { get; set; }
}

public class DataExportResultDto
{
    public Guid Id { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<string> Modules { get; set; } = new();
    public string Format { get; set; } = string.Empty;
    public long? FileSize { get; set; }
    public string? DownloadUrl { get; set; }
    public string? ErrorMessage { get; set; }
    public int RecordCount { get; set; }
}

public class DataHandoverDto
{
    public Guid Id { get; set; }
    public string HandoverCode { get; set; } = string.Empty;
    public DateTime HandoverDate { get; set; }
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientOrganization { get; set; } = string.Empty;
    public string RecipientEmail { get; set; } = string.Empty;
    public List<string> Modules { get; set; } = new();
    public int TotalRecords { get; set; }
    public long TotalFileSize { get; set; }
    public int Status { get; set; } // 0=Preparing, 1=Ready, 2=Delivered, 3=Confirmed
    public string StatusName => Status switch
    {
        0 => "Đang chuẩn bị",
        1 => "Sẵn sàng",
        2 => "Đã bàn giao",
        3 => "Đã xác nhận",
        _ => "Không xác định"
    };
    public DateTime? DeliveredAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public string? Remarks { get; set; }
}

public class DataStatsDto
{
    public int TotalPatients { get; set; }
    public int TotalExaminations { get; set; }
    public int TotalPrescriptions { get; set; }
    public int TotalLabResults { get; set; }
    public int TotalRadiologyResults { get; set; }
    public int TotalAdmissions { get; set; }
    public int TotalBillingRecords { get; set; }
    public int TotalAuditLogs { get; set; }
    public decimal DatabaseSizeMB { get; set; }
    public decimal AttachmentsSizeMB { get; set; }
    public DateTime? LastBackupDate { get; set; }
    public DateTime? LastExportDate { get; set; }
}

public class ModuleDataCountDto
{
    public string Module { get; set; } = string.Empty;
    public string ModuleName { get; set; } = string.Empty;
    public int RecordCount { get; set; }
    public DateTime? LastUpdated { get; set; }
}

public class CreateBackupRequest
{
    public string BackupType { get; set; } = "Full";
    public List<string>? Modules { get; set; }
}

public class CreateHandoverRequest
{
    public string? RecipientName { get; set; }
    public string? RecipientOrganization { get; set; }
    public string? RecipientEmail { get; set; }
    public List<string>? Modules { get; set; }
    public string? Remarks { get; set; }
}

// ==================== Backup History ====================

/// <summary>
/// DTO trả về lịch sử backup từ bảng BackupHistories.
/// Status: 0=Running, 1=Success, 2=Failed.
/// BackupType: 0=Manual, 1=Scheduled.
/// </summary>
public class BackupHistoryDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string? FilePath { get; set; }
    public long SizeBytes { get; set; }
    public int BackupType { get; set; }
    public string BackupTypeName => BackupType switch { 0 => "Thủ công", 1 => "Tự động", _ => "Không xác định" };
    public string? Destination { get; set; }
    public int Status { get; set; }
    public string StatusName => Status switch { 0 => "Đang chạy", 1 => "Thành công", 2 => "Thất bại", _ => "Không xác định" };
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? ErrorMessage { get; set; }
    public string? CreatedBy { get; set; }
}

/// <summary>
/// Request tạo backup thủ công.
/// </summary>
public class CreateBackupHistoryRequest
{
    /// <summary>"Full" | "Differential" | "TransactionLog"</summary>
    public string BackupLabel { get; set; } = "Full";
    public List<string>? Modules { get; set; }
    /// <summary>Đích lưu: "Local" | "NAS" | "Cloud". Null = dùng cấu hình hệ thống.</summary>
    public string? Destination { get; set; }
}

/// <summary>
/// Request restore từ một bản backup cụ thể.
/// QUAN TRỌNG: endpoint restore chỉ ghi nhận yêu cầu (Status=Pending) và trả
/// thông tin xác nhận — KHÔNG tự động thực thi RESTORE DATABASE lên production.
/// Admin phải xác nhận qua endpoint /confirm sau khi tắt các kết nối.
/// </summary>
public class RestoreBackupRequest
{
    public Guid BackupHistoryId { get; set; }
    /// <summary>Ghi chú lý do restore (bắt buộc để audit)</summary>
    public string Reason { get; set; } = string.Empty;
    /// <summary>
    /// Xác nhận hiểu rủi ro: admin phải gửi true.
    /// Nếu false → API trả 400, không ghi nhận yêu cầu.
    /// </summary>
    public bool ConfirmRisk { get; set; }
}

public class RestoreBackupResultDto
{
    public Guid RequestId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string? FilePath { get; set; }
    /// <summary>"Pending" = đã ghi nhận, chờ admin chạy thủ công; "Rejected" = điều kiện không hợp lệ</summary>
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    /// <summary>Hướng dẫn thực thi restore thủ công (câu lệnh T-SQL để admin chạy)</summary>
    public string? ManualRestoreScript { get; set; }
    public DateTime RequestedAt { get; set; }
}

// ==================== Backup Config ====================

/// <summary>
/// Cấu hình backup đích và lịch tự động.
/// Lưu vào SystemConfig với các key: Backup.Destination, Backup.NasPath,
/// Backup.CloudBucket, Backup.ScheduleCron, Backup.ScheduleEnabled.
/// </summary>
public class BackupConfigDto
{
    /// <summary>"Local" | "NAS" | "Cloud"</summary>
    public string Destination { get; set; } = "Local";
    /// <summary>Thư mục NAS (UNC path hoặc mount point)</summary>
    public string? NasPath { get; set; }
    /// <summary>Cloud bucket/container name (R2 / GCS / S3)</summary>
    public string? CloudBucket { get; set; }
    /// <summary>Cron expression (VD: "0 2 * * *" = 2 giờ sáng mỗi ngày). Null = dùng IntervalHours.</summary>
    public string? ScheduleCron { get; set; }
    /// <summary>Khoảng cách giờ giữa các lần backup tự động (nếu không dùng cron)</summary>
    public int? ScheduleIntervalHours { get; set; }
    /// <summary>Bật/tắt backup tự động</summary>
    public bool ScheduleEnabled { get; set; }
    /// <summary>Giữ tối đa N bản backup (cũ hơn sẽ bị xoá metadata)</summary>
    public int RetentionCount { get; set; } = 30;
}
