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
