namespace HIS.Application.DTOs.Security;

/// <summary>
/// Role-permission matrix for Level 6 compliance audit.
/// Shows each role with its assigned permissions grouped by module.
/// </summary>
public class AccessControlMatrixDto
{
    public Guid RoleId { get; set; }
    public string RoleCode { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int UserCount { get; set; }
    public List<ModulePermissionGroup> ModulePermissions { get; set; } = new();
}

public class ModulePermissionGroup
{
    public string Module { get; set; } = string.Empty;
    public List<PermissionEntry> Permissions { get; set; } = new();
}

public class PermissionEntry
{
    public Guid PermissionId { get; set; }
    public string PermissionCode { get; set; } = string.Empty;
    public string PermissionName { get; set; } = string.Empty;
    public string? Description { get; set; }
}

/// <summary>
/// Report of users who accessed sensitive patient data (GET requests to patient/EMR endpoints).
/// Used for Level 6 security review and auditing.
/// </summary>
public class SensitiveDataAccessReportDto
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string? UserFullName { get; set; }
    public int TotalAccesses { get; set; }
    public List<SensitiveAccessEntry> RecentAccesses { get; set; } = new();
}

public class SensitiveAccessEntry
{
    public DateTime Timestamp { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string RequestPath { get; set; } = string.Empty;
    public string? Module { get; set; }
}

/// <summary>
/// Overall security compliance summary for Level 6 certification.
/// Aggregates key security metrics across the system.
/// </summary>
public class ComplianceSummaryDto
{
    public int TotalRoles { get; set; }
    public int TotalPermissions { get; set; }
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int UsersWithTwoFactor { get; set; }
    public bool TdeEnabled { get; set; }
    public bool ColumnEncryptionEnabled { get; set; }
    public DateTime? LastBackupDate { get; set; }
    public int AuditLogsLast30Days { get; set; }
    public int SensitiveAccessLast30Days { get; set; }
}
