namespace HIS.Application.DTOs;

public class EndpointDeviceDto
{
    public Guid Id { get; set; }
    public string Hostname { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public string? MacAddress { get; set; }
    public string? OperatingSystem { get; set; }
    public string? OsVersion { get; set; }
    public string? AntivirusName { get; set; }
    public string? AntivirusStatus { get; set; }
    public DateTime? AntivirusLastUpdate { get; set; }
    public string? DepartmentName { get; set; }
    public string? AssignedUser { get; set; }
    public int Status { get; set; }
    public string StatusText => Status switch { 0 => "Offline", 1 => "Online", 2 => "Warning", 3 => "Critical", _ => "Unknown" };
    public DateTime? LastSeenAt { get; set; }
    public string? AgentVersion { get; set; }
    public bool IsCompliant { get; set; }
    public string? ComplianceNotes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RegisterDeviceDto
{
    public string Hostname { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public string? MacAddress { get; set; }
    public string? OperatingSystem { get; set; }
    public string? OsVersion { get; set; }
    public string? AntivirusName { get; set; }
    public string? AntivirusStatus { get; set; }
    public string? DepartmentName { get; set; }
    public string? AssignedUser { get; set; }
    public string? AgentVersion { get; set; }
}

public class UpdateDeviceStatusDto
{
    public int Status { get; set; }
    public string? AntivirusStatus { get; set; }
    public DateTime? AntivirusLastUpdate { get; set; }
    public string? AgentVersion { get; set; }
    public bool? IsCompliant { get; set; }
    public string? ComplianceNotes { get; set; }
}

public class SecurityIncidentDto
{
    public Guid Id { get; set; }
    public string IncidentCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Severity { get; set; }
    public string SeverityText => Severity switch { 1 => "Critical", 2 => "High", 3 => "Medium", 4 => "Low", _ => "Unknown" };
    public int Status { get; set; }
    public string StatusText => Status switch { 0 => "Open", 1 => "Investigating", 2 => "Contained", 3 => "Resolved", 4 => "Closed", _ => "Unknown" };
    public string? Category { get; set; }
    public Guid? DeviceId { get; set; }
    public string? DeviceHostname { get; set; }
    public string? AffectedSystem { get; set; }
    public string? ReportedByName { get; set; }
    public string? AssignedToName { get; set; }
    public string? Resolution { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? RootCause { get; set; }
    public string? CorrectiveAction { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateIncidentDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Severity { get; set; } = 3;
    public string? Category { get; set; }
    public Guid? DeviceId { get; set; }
    public string? AffectedSystem { get; set; }
    public string? ReportedByName { get; set; }
}

public class UpdateIncidentDto
{
    public int? Status { get; set; }
    public string? AssignedToName { get; set; }
    public Guid? AssignedToId { get; set; }
    public string? Resolution { get; set; }
    public string? RootCause { get; set; }
    public string? CorrectiveAction { get; set; }
}

public class InstalledSoftwareDto
{
    public Guid Id { get; set; }
    public Guid DeviceId { get; set; }
    public string SoftwareName { get; set; } = string.Empty;
    public string? Version { get; set; }
    public string? Publisher { get; set; }
    public DateTime? InstallDate { get; set; }
    public bool IsAuthorized { get; set; }
    public string? Category { get; set; }
    public string? Notes { get; set; }
}

public class EndpointSecurityDashboardDto
{
    public int TotalDevices { get; set; }
    public int OnlineDevices { get; set; }
    public int OfflineDevices { get; set; }
    public int WarningDevices { get; set; }
    public int CriticalDevices { get; set; }
    public int CompliantDevices { get; set; }
    public decimal CompliancePercent { get; set; }
    public int OpenIncidents { get; set; }
    public int CriticalIncidents { get; set; }
    public int TotalSoftware { get; set; }
    public int UnauthorizedSoftware { get; set; }
    public List<IncidentByCategoryDto> IncidentsByCategory { get; set; } = new();
    public List<DeviceByStatusDto> DevicesByStatus { get; set; } = new();
}

public class IncidentByCategoryDto
{
    public string Category { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class DeviceByStatusDto
{
    public string Status { get; set; } = string.Empty;
    public int Count { get; set; }
}
