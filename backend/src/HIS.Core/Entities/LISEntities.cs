namespace HIS.Core.Entities;

/// <summary>
/// Máy xét nghiệm
/// </summary>
public class LabAnalyzer : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Manufacturer { get; set; }
    public string? Model { get; set; }
    public string? SerialNumber { get; set; }
    public Guid? DepartmentId { get; set; }

    /// <summary>
    /// Loại kết nối: 1=Một chiều (nhận kết quả), 2=Hai chiều (gửi worklist + nhận kết quả)
    /// </summary>
    public int ConnectionType { get; set; } = 1;

    /// <summary>
    /// Giao thức: 1=HL7, 2=ASTM1381, 3=ASTM1394, 4=ASCII, 5=Advia, 6=Hitachi, 7=AU, 8=Rapidbind, 9=Custom
    /// </summary>
    public int Protocol { get; set; } = 1;

    /// <summary>
    /// Phương thức kết nối: 1=COM/RS232, 2=TCP/IP Server, 3=TCP/IP Client, 4=File
    /// </summary>
    public int ConnectionMethod { get; set; } = 2;

    // Serial connection settings
    public string? ComPort { get; set; }
    public int? BaudRate { get; set; }
    public int? DataBits { get; set; }
    public string? Parity { get; set; }
    public string? StopBits { get; set; }

    // TCP connection settings
    public string? IpAddress { get; set; }
    public int? Port { get; set; }

    // File connection settings
    public string? InputFilePath { get; set; }
    public string? OutputFilePath { get; set; }

    /// <summary>
    /// Trạng thái: 1=Hoạt động, 2=Tạm ngưng, 3=Bảo trì
    /// </summary>
    public int Status { get; set; } = 1;
    public bool IsActive { get; set; } = true;
    public DateTime? LastConnectedAt { get; set; }
    public DateTime? LastDataReceivedAt { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Department? Department { get; set; }
    public virtual ICollection<LabAnalyzerTestMapping> TestMappings { get; set; } = new List<LabAnalyzerTestMapping>();
    public virtual ICollection<LabConnectionLog> ConnectionLogs { get; set; } = new List<LabConnectionLog>();
    public virtual ICollection<LabWorklist> Worklists { get; set; } = new List<LabWorklist>();
}

/// <summary>
/// Mapping test code giữa HIS và máy xét nghiệm
/// </summary>
public class LabAnalyzerTestMapping : BaseEntity
{
    public Guid AnalyzerId { get; set; }
    public Guid? ServiceId { get; set; }
    public string HisTestCode { get; set; } = string.Empty;
    public string HisTestName { get; set; } = string.Empty;
    public string AnalyzerTestCode { get; set; } = string.Empty;
    public string? AnalyzerTestName { get; set; }
    public decimal? ConversionFactor { get; set; } = 1;
    public string? Unit { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public virtual LabAnalyzer? Analyzer { get; set; }
    public virtual Service? Service { get; set; }
}

/// <summary>
/// Log kết nối máy xét nghiệm
/// </summary>
public class LabConnectionLog : BaseEntity
{
    public Guid AnalyzerId { get; set; }
    public DateTime EventTime { get; set; }

    /// <summary>
    /// Loại sự kiện: 1=Connected, 2=Disconnected, 3=Error, 4=DataReceived, 5=DataSent, 6=ACK, 7=NAK
    /// </summary>
    public int EventType { get; set; }
    public string? EventDescription { get; set; }
    public string? RawData { get; set; }
    public string? ParsedData { get; set; }
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }

    // Navigation
    public virtual LabAnalyzer? Analyzer { get; set; }
}

/// <summary>
/// Worklist gửi đến máy xét nghiệm
/// </summary>
public class LabWorklist : BaseEntity
{
    public Guid AnalyzerId { get; set; }
    public Guid LabRequestItemId { get; set; }
    public string? SampleBarcode { get; set; }
    public string? TestCodes { get; set; } // Comma-separated
    public DateTime SentAt { get; set; }

    /// <summary>
    /// Trạng thái: 0=Pending, 1=Sent, 2=Acknowledged, 3=ResultReceived, 4=Failed
    /// </summary>
    public int Status { get; set; }
    public string? MessageControlId { get; set; }
    public string? RawMessage { get; set; }
    public string? AckMessage { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public DateTime? ResultReceivedAt { get; set; }
    public int RetryCount { get; set; }
    public string? ErrorMessage { get; set; }

    // Navigation
    public virtual LabAnalyzer? Analyzer { get; set; }
    public virtual LabRequestItem? LabRequestItem { get; set; }
}

/// <summary>
/// Dữ liệu thô nhận từ máy xét nghiệm (chưa được map)
/// </summary>
public class LabRawResult : BaseEntity
{
    public Guid AnalyzerId { get; set; }
    public string? SampleId { get; set; }
    public string? PatientId { get; set; }
    public string? TestCode { get; set; }
    public string? Result { get; set; }
    public string? Unit { get; set; }
    public string? Flag { get; set; }
    public DateTime? ResultTime { get; set; }
    public string? RawMessage { get; set; }

    /// <summary>
    /// Trạng thái: 0=Pending, 1=Matched, 2=ManualMapped, 3=Ignored
    /// </summary>
    public int Status { get; set; }
    public Guid? MappedToLabRequestItemId { get; set; }
    public DateTime? MappedAt { get; set; }
    public Guid? MappedBy { get; set; }

    // Navigation
    public virtual LabAnalyzer? Analyzer { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.ForeignKey("MappedToLabRequestItemId")]
    public virtual LabRequestItem? MappedLabRequestItem { get; set; }
}

/// <summary>
/// Cảnh báo giá trị nguy hiểm
/// </summary>
public class LabCriticalValueAlert : BaseEntity
{
    public Guid LabResultId { get; set; }
    public Guid PatientId { get; set; }
    public string TestCode { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public string? Result { get; set; }
    public decimal? NumericResult { get; set; }
    public string? Unit { get; set; }
    public decimal? CriticalLow { get; set; }
    public decimal? CriticalHigh { get; set; }

    /// <summary>
    /// Loại cảnh báo: 1=Critical Low, 2=Critical High, 3=Panic Low, 4=Panic High
    /// </summary>
    public int AlertType { get; set; }
    public DateTime AlertTime { get; set; }

    /// <summary>
    /// Trạng thái: 0=New, 1=Acknowledged, 2=Escalated, 3=Resolved
    /// </summary>
    public int Status { get; set; }
    public bool IsAcknowledged { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public Guid? AcknowledgedBy { get; set; }
    public string? NotifiedPerson { get; set; }
    public string? NotificationMethod { get; set; }
    public DateTime? NotificationTime { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual LabResult? LabResult { get; set; }
    public virtual Patient? Patient { get; set; }
    public virtual User? AcknowledgedByUser { get; set; }
}

/// <summary>
/// Cấu hình giá trị nguy hiểm cho test
/// </summary>
public class LabCriticalValueConfig : BaseEntity
{
    public Guid ServiceId { get; set; }
    public string TestCode { get; set; } = string.Empty;
    public string? Gender { get; set; } // Male, Female, Both
    public int? AgeFromDays { get; set; }
    public int? AgeToDays { get; set; }
    public decimal? CriticalLow { get; set; }
    public decimal? CriticalHigh { get; set; }
    public decimal? PanicLow { get; set; }
    public decimal? PanicHigh { get; set; }
    public bool RequireAcknowledgment { get; set; } = true;
    public int? AcknowledgmentTimeoutMinutes { get; set; } = 30;
    public string? NotificationMethod { get; set; } // Phone, SMS, Email, InPerson
    public bool IsActive { get; set; } = true;

    // Navigation
    public virtual Service? Service { get; set; }
}

/// <summary>
/// Giá trị tham chiếu cho test
/// </summary>
public class LabReferenceRange : BaseEntity
{
    public Guid ServiceId { get; set; }
    public string TestCode { get; set; } = string.Empty;
    public string? Gender { get; set; } // Male, Female, Both
    public int? AgeFromDays { get; set; }
    public int? AgeToDays { get; set; }
    public decimal? LowValue { get; set; }
    public decimal? HighValue { get; set; }
    public string? TextRange { get; set; }
    public string? Unit { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public virtual Service? Service { get; set; }
}

/// <summary>
/// Nhóm xét nghiệm
/// </summary>
public class LabTestGroup : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }
}

/// <summary>
/// Loại mẫu bệnh phẩm
/// </summary>
public class LabSampleType : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CollectionMethod { get; set; }
    public string? PreparationInstructions { get; set; }
    public int? StabilityHours { get; set; }
    public string? StorageConditions { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Loại ống nghiệm
/// </summary>
public class LabTubeType : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }
    public string? ColorHex { get; set; }
    public string? Additive { get; set; }
    public decimal? Volume { get; set; }
    public string? VolumeUnit { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Kết quả QC (Quality Control)
/// </summary>
public class LabQCResult : BaseEntity
{
    public Guid AnalyzerId { get; set; }
    public Guid ServiceId { get; set; }
    public string TestCode { get; set; } = string.Empty;
    public string QCLevel { get; set; } = string.Empty; // Level1, Level2, Level3
    public string? QCLotNumber { get; set; }
    public DateTime RunTime { get; set; }
    public decimal Value { get; set; }
    public decimal Mean { get; set; }
    public decimal SD { get; set; }
    public decimal CV { get; set; }
    public decimal ZScore { get; set; }
    public bool IsAccepted { get; set; }
    public string? WestgardRule { get; set; }
    public string? Violations { get; set; }
    public string? Notes { get; set; }
    public Guid? PerformedBy { get; set; }

    // Navigation
    public virtual LabAnalyzer? Analyzer { get; set; }
    public virtual Service? Service { get; set; }
    public virtual User? PerformedByUser { get; set; }
}

/// <summary>
/// Mẫu kết luận xét nghiệm
/// </summary>
public class LabConclusionTemplate : BaseEntity
{
    public Guid? ServiceId { get; set; }
    public string? TestCode { get; set; }
    public string TemplateCode { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;
    public string ConclusionText { get; set; } = string.Empty;
    public string? Condition { get; set; } // JSON condition
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public virtual Service? Service { get; set; }
}
