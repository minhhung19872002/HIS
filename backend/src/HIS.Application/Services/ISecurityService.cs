using HIS.Application.DTOs.Security;

namespace HIS.Application.Services;

/// <summary>
/// Security compliance service for Level 6 certification.
/// Provides access control matrix, sensitive data access reports, and compliance summary.
/// </summary>
public interface ISecurityService
{
    /// <summary>
    /// Get the full role-permission matrix showing what each role can access, grouped by module.
    /// Used for access control review per Decree 85/2016.
    /// </summary>
    Task<List<AccessControlMatrixDto>> GetAccessControlMatrixAsync();

    /// <summary>
    /// Get report of users who accessed sensitive patient data (GET requests to patient/EMR/examination endpoints).
    /// Shows who accessed what patient data and when, within the given date range.
    /// </summary>
    Task<List<SensitiveDataAccessReportDto>> GetSensitiveDataAccessReportAsync(
        DateTime from, DateTime to, int limit = 50);

    /// <summary>
    /// Get overall compliance summary: user counts, 2FA adoption, encryption status, backup status, audit volume.
    /// </summary>
    Task<ComplianceSummaryDto> GetComplianceSummaryAsync();
}
