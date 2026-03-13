namespace HIS.Application.DTOs.Laboratory;

#region LIS Configuration DTOs

/// <summary>
/// DTO cho máy phân tích LIS
/// </summary>
public class LisAnalyzerDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Model { get; set; }
    public string? Manufacturer { get; set; }
    public string ConnectionType { get; set; } = "HL7"; // HL7, ASTM, Serial
    public string? IpAddress { get; set; }
    public int? Port { get; set; }
    public string? ComPort { get; set; }
    public int? BaudRate { get; set; }
    public string? ProtocolVersion { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastConnectionTime { get; set; }
    public string? ConnectionStatus { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO cho tạo/cập nhật máy phân tích
/// </summary>
public class CreateLisAnalyzerDto
{
    public string Name { get; set; } = string.Empty;
    public string? Model { get; set; }
    public string? Manufacturer { get; set; }
    public string ConnectionType { get; set; } = "HL7";
    public string? IpAddress { get; set; }
    public int? Port { get; set; }
    public string? ComPort { get; set; }
    public int? BaudRate { get; set; }
    public string? ProtocolVersion { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }
}

/// <summary>
/// DTO cho thông số xét nghiệm
/// </summary>
public class LisTestParameterDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal? ReferenceLow { get; set; }
    public decimal? ReferenceHigh { get; set; }
    public decimal? CriticalLow { get; set; }
    public decimal? CriticalHigh { get; set; }
    public string DataType { get; set; } = "Number"; // Number, Text, Enum
    public string? EnumValues { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO cho tạo/cập nhật thông số xét nghiệm
/// </summary>
public class CreateLisTestParameterDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal? ReferenceLow { get; set; }
    public decimal? ReferenceHigh { get; set; }
    public decimal? CriticalLow { get; set; }
    public decimal? CriticalHigh { get; set; }
    public string DataType { get; set; } = "Number";
    public string? EnumValues { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// DTO cho khoảng tham chiếu
/// </summary>
public class LisReferenceRangeDto
{
    public Guid Id { get; set; }
    public Guid TestParameterId { get; set; }
    public string? TestCode { get; set; }
    public string? TestName { get; set; }
    public string AgeGroup { get; set; } = "Adult"; // Newborn, Infant, Child, Adolescent, Adult, Elderly
    public string Gender { get; set; } = "Both"; // Male, Female, Both
    public decimal? Low { get; set; }
    public decimal? High { get; set; }
    public decimal? CriticalLow { get; set; }
    public decimal? CriticalHigh { get; set; }
    public string Unit { get; set; } = string.Empty;
}

/// <summary>
/// DTO cho tạo/cập nhật khoảng tham chiếu
/// </summary>
public class CreateLisReferenceRangeDto
{
    public Guid TestParameterId { get; set; }
    public string AgeGroup { get; set; } = "Adult";
    public string Gender { get; set; } = "Both";
    public decimal? Low { get; set; }
    public decimal? High { get; set; }
    public decimal? CriticalLow { get; set; }
    public decimal? CriticalHigh { get; set; }
    public string Unit { get; set; } = string.Empty;
}

/// <summary>
/// DTO cho mapping test máy phân tích
/// </summary>
public class LisAnalyzerMappingDto
{
    public Guid Id { get; set; }
    public Guid AnalyzerId { get; set; }
    public string? AnalyzerName { get; set; }
    public string AnalyzerTestCode { get; set; } = string.Empty;
    public Guid HisTestParameterId { get; set; }
    public string? HisTestCode { get; set; }
    public string? HisTestName { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO cho tạo/cập nhật mapping
/// </summary>
public class CreateLisAnalyzerMappingDto
{
    public Guid AnalyzerId { get; set; }
    public string AnalyzerTestCode { get; set; } = string.Empty;
    public Guid HisTestParameterId { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// DTO cho trạng thái Labconnect
/// </summary>
public class LisLabconnectStatusDto
{
    public bool IsConnected { get; set; }
    public DateTime? LastSyncTime { get; set; }
    public string? ServerUrl { get; set; }
    public string? Version { get; set; }
    public int PendingSendCount { get; set; }
    public int PendingReceiveCount { get; set; }
}

/// <summary>
/// DTO cho lịch sử đồng bộ Labconnect
/// </summary>
public class LisLabconnectSyncHistoryDto
{
    public Guid Id { get; set; }
    public DateTime SyncTime { get; set; }
    public string Direction { get; set; } = string.Empty; // Send, Receive, Both
    public int RecordCount { get; set; }
    public string Status { get; set; } = string.Empty; // Success, Failed, Partial
    public string? ErrorMessage { get; set; }
    public int? Duration { get; set; }
}

/// <summary>
/// DTO cho kết quả test kết nối
/// </summary>
public class LisConnectionTestResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// DTO cho kết quả auto-map
/// </summary>
public class LisAutoMapResultDto
{
    public int MappedCount { get; set; }
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// DTO cho yêu cầu đồng bộ Labconnect
/// </summary>
public class LisLabconnectSyncRequestDto
{
    public string? Direction { get; set; } // Send, Receive, Both
}

/// <summary>
/// DTO cho kết quả đồng bộ
/// </summary>
public class LisLabconnectSyncResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int? SyncedCount { get; set; }
}

/// <summary>
/// DTO cho kết quả retry
/// </summary>
public class LisLabconnectRetryResultDto
{
    public bool Success { get; set; }
    public int RetriedCount { get; set; }
}

#endregion
