namespace HIS.Application.DTOs;

// ========================
// Module 5: Quản lý môi trường y tế (Environmental Health)
// ========================

public class WasteRecordSearchDto
{
    public string? Keyword { get; set; }
    public string? WasteType { get; set; }
    public int? Status { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
}

public class WasteRecordDto
{
    public Guid Id { get; set; }
    public string RecordCode { get; set; } = string.Empty;
    public string? RecordDate { get; set; }
    public string WasteType { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string? DisposalMethod { get; set; }
    public string? DisposalDate { get; set; }
    public string? DisposedBy { get; set; }
    public string? CollectorName { get; set; }
    public string? CollectorLicense { get; set; }
    public string? DepartmentName { get; set; }
    public string? Notes { get; set; }
    public int Status { get; set; }
}

public class CreateWasteRecordDto
{
    public string? RecordDate { get; set; }
    public string? WasteType { get; set; }
    public decimal? Quantity { get; set; }
    public string? DisposalMethod { get; set; }
    public string? CollectorName { get; set; }
    public string? CollectorLicense { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? Notes { get; set; }
}

public class EnvironmentalMonitoringSearchDto
{
    public string? Keyword { get; set; }
    public string? MonitoringType { get; set; }
    public bool? IsCompliant { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
}

public class EnvironmentalMonitoringDto
{
    public Guid Id { get; set; }
    public string MonitoringCode { get; set; } = string.Empty;
    public string? MonitoringDate { get; set; }
    public string MonitoringType { get; set; } = string.Empty;
    public string? Location { get; set; }
    public decimal MeasuredValue { get; set; }
    public string? Unit { get; set; }
    public decimal? StandardLimit { get; set; }
    public bool IsCompliant { get; set; }
    public string? InstrumentUsed { get; set; }
    public string? MeasuredBy { get; set; }
    public string? Notes { get; set; }
}

public class CreateEnvironmentalMonitoringDto
{
    public string? MonitoringDate { get; set; }
    public string? MonitoringType { get; set; }
    public string? Location { get; set; }
    public decimal? MeasuredValue { get; set; }
    public string? Unit { get; set; }
    public decimal? StandardLimit { get; set; }
    public string? InstrumentUsed { get; set; }
    public string? MeasuredBy { get; set; }
    public string? Notes { get; set; }
}

public class WasteStatsDto
{
    public int TotalRecords { get; set; }
    public decimal TotalQuantityKg { get; set; }
    public int PendingDisposal { get; set; }
    public int DisposedCount { get; set; }
    public List<WasteTypeBreakdownDto> WasteTypeBreakdown { get; set; } = new();
}

public class WasteTypeBreakdownDto
{
    public string WasteType { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal TotalKg { get; set; }
}

public class MonitoringStatsDto
{
    public int TotalMeasurements { get; set; }
    public int CompliantCount { get; set; }
    public int NonCompliantCount { get; set; }
    public double ComplianceRate { get; set; }
    public List<MonitoringTypeBreakdownDto> MonitoringTypeBreakdown { get; set; } = new();
}

public class MonitoringTypeBreakdownDto
{
    public string MonitoringType { get; set; } = string.Empty;
    public int Count { get; set; }
    public int CompliantCount { get; set; }
}

public class BiosafetyStatusDto
{
    public double WasteComplianceRate { get; set; }
    public double EnvironmentalComplianceRate { get; set; }
    public int PendingWasteDisposal { get; set; }
    public int NonCompliantMonitoring { get; set; }
    public string OverallStatus { get; set; } = string.Empty; // good/warning/critical
}
