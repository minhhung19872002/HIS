using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Security;
using HIS.Application.Services;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of ISecurityService for Level 6 security compliance.
/// Provides access control matrix, sensitive data access auditing, and compliance metrics.
/// </summary>
public class SecurityService : ISecurityService
{
    private readonly HISDbContext _context;
    private readonly ILogger<SecurityService> _logger;

    // Same sensitive paths used by AuditLogMiddleware for GET logging
    private static readonly string[] SensitivePathPrefixes = new[]
    {
        "/api/patients/",
        "/api/examination/",
        "/api/emr/",
        "/api/inpatient/",
        "/api/prescription/",
        "/api/reception/patient"
    };

    public SecurityService(HISDbContext context, ILogger<SecurityService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<AccessControlMatrixDto>> GetAccessControlMatrixAsync()
    {
        try
        {
            var roles = await _context.Roles
                .Include(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
                .Include(r => r.UserRoles)
                .AsNoTracking()
                .OrderBy(r => r.RoleCode)
                .ToListAsync();

            return roles.Select(role => new AccessControlMatrixDto
            {
                RoleId = role.Id,
                RoleCode = role.RoleCode,
                RoleName = role.RoleName,
                Description = role.Description,
                UserCount = role.UserRoles.Count,
                ModulePermissions = role.RolePermissions
                    .Where(rp => rp.Permission != null)
                    .GroupBy(rp => rp.Permission.Module ?? "General")
                    .OrderBy(g => g.Key)
                    .Select(g => new ModulePermissionGroup
                    {
                        Module = g.Key,
                        Permissions = g.Select(rp => new PermissionEntry
                        {
                            PermissionId = rp.Permission.Id,
                            PermissionCode = rp.Permission.PermissionCode,
                            PermissionName = rp.Permission.PermissionName,
                            Description = rp.Permission.Description
                        })
                        .OrderBy(p => p.PermissionCode)
                        .ToList()
                    })
                    .ToList()
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving access control matrix");
            return new List<AccessControlMatrixDto>();
        }
    }

    public async Task<List<SensitiveDataAccessReportDto>> GetSensitiveDataAccessReportAsync(
        DateTime from, DateTime to, int limit = 50)
    {
        try
        {
            // Query audit logs for GET requests to sensitive patient data endpoints
            var sensitiveAccessLogs = await _context.AuditLogs
                .AsNoTracking()
                .Where(a => a.RequestMethod == "GET"
                    && a.Timestamp >= from
                    && a.Timestamp <= to
                    && a.RequestPath != null
                    && SensitivePathPrefixes.Any(prefix =>
                        a.RequestPath.StartsWith(prefix)))
                .OrderByDescending(a => a.Timestamp)
                .ToListAsync();

            // Group by user and aggregate
            var grouped = sensitiveAccessLogs
                .GroupBy(a => new { a.UserId, Username = a.Username ?? "unknown" })
                .Select(g => new SensitiveDataAccessReportDto
                {
                    UserId = g.Key.UserId?.ToString() ?? string.Empty,
                    UserName = g.Key.Username,
                    UserFullName = g.FirstOrDefault()?.UserFullName,
                    TotalAccesses = g.Count(),
                    RecentAccesses = g
                        .OrderByDescending(a => a.Timestamp)
                        .Take(20)
                        .Select(a => new SensitiveAccessEntry
                        {
                            Timestamp = a.Timestamp,
                            EntityType = a.EntityType ?? "Unknown",
                            EntityId = a.EntityId,
                            RequestPath = a.RequestPath ?? string.Empty,
                            Module = a.Module
                        })
                        .ToList()
                })
                .OrderByDescending(u => u.TotalAccesses)
                .Take(limit)
                .ToList();

            return grouped;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving sensitive data access report");
            return new List<SensitiveDataAccessReportDto>();
        }
    }

    public async Task<ComplianceSummaryDto> GetComplianceSummaryAsync()
    {
        var summary = new ComplianceSummaryDto();

        try
        {
            // Role and permission counts
            summary.TotalRoles = await _context.Roles.CountAsync();
            summary.TotalPermissions = await _context.Permissions.CountAsync();

            // User counts
            summary.TotalUsers = await _context.Users.CountAsync();
            summary.ActiveUsers = await _context.Users.CountAsync(u => u.IsActive);
            summary.UsersWithTwoFactor = await _context.Users.CountAsync(u => u.IsTwoFactorEnabled);

            // Audit log counts (last 30 days)
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
            summary.AuditLogsLast30Days = await _context.AuditLogs
                .CountAsync(a => a.Timestamp >= thirtyDaysAgo);

            // Sensitive GET access count (last 30 days)
            summary.SensitiveAccessLast30Days = await _context.AuditLogs
                .CountAsync(a => a.RequestMethod == "GET"
                    && a.Timestamp >= thirtyDaysAgo
                    && a.RequestPath != null
                    && SensitivePathPrefixes.Any(prefix =>
                        a.RequestPath.StartsWith(prefix)));

            // Check TDE (Transparent Data Encryption) status
            summary.TdeEnabled = await CheckTdeStatusAsync();

            // Column encryption - check if Always Encrypted is configured
            // This is informational; Always Encrypted is a connection-level feature
            summary.ColumnEncryptionEnabled = false;

            // Last backup date from msdb
            summary.LastBackupDate = await GetLastBackupDateAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating compliance summary");
        }

        return summary;
    }

    private async Task<bool> CheckTdeStatusAsync()
    {
        try
        {
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT COUNT(*)
                FROM sys.dm_database_encryption_keys
                WHERE database_id = DB_ID()
                  AND encryption_state = 3"; // 3 = Encrypted

            var result = await command.ExecuteScalarAsync();
            return Convert.ToInt32(result) > 0;
        }
        catch (Exception ex)
        {
            // dm_database_encryption_keys may require VIEW SERVER STATE permission
            _logger.LogWarning(ex, "Cannot check TDE status (may require elevated permissions)");
            return false;
        }
    }

    private async Task<DateTime?> GetLastBackupDateAsync()
    {
        try
        {
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT TOP 1 bs.backup_finish_date
                FROM msdb.dbo.backupset bs
                WHERE bs.database_name = DB_NAME()
                ORDER BY bs.backup_finish_date DESC";

            var result = await command.ExecuteScalarAsync();
            if (result != null && result != DBNull.Value)
                return (DateTime)result;

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cannot query backup history (may require msdb access)");
            return null;
        }
    }
}
