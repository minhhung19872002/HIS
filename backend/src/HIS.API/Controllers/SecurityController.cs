using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs.Security;

namespace HIS.API.Controllers;

/// <summary>
/// Security compliance controller for Level 6 certification.
/// Provides access control matrix, sensitive data access reports, and compliance summary.
/// All endpoints require authentication (admin-only in production).
/// </summary>
[ApiController]
[Route("api/security")]
[Authorize]
public class SecurityController : ControllerBase
{
    private readonly ISecurityService _securityService;

    public SecurityController(ISecurityService securityService)
    {
        _securityService = securityService;
    }

    /// <summary>
    /// Get the full role-permission matrix.
    /// Shows each role with its assigned permissions grouped by module.
    /// Used for access control review per Decree 85/2016 and Level 6 compliance audit.
    /// </summary>
    [HttpGet("compliance/access-matrix")]
    public async Task<ActionResult<List<AccessControlMatrixDto>>> GetAccessControlMatrix()
    {
        var result = await _securityService.GetAccessControlMatrixAsync();
        return Ok(result);
    }

    /// <summary>
    /// Get report of users who accessed sensitive patient data via GET requests.
    /// Shows who accessed what patient data and when, within the given date range.
    /// Covers: patients, examinations, EMR, inpatient, prescriptions.
    /// </summary>
    [HttpGet("compliance/sensitive-access")]
    public async Task<ActionResult<List<SensitiveDataAccessReportDto>>> GetSensitiveDataAccess(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int limit = 50)
    {
        var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
        var toDate = to ?? DateTime.UtcNow;
        var result = await _securityService.GetSensitiveDataAccessReportAsync(fromDate, toDate, limit);
        return Ok(result);
    }

    /// <summary>
    /// Get overall security compliance summary.
    /// Includes: user counts, 2FA adoption, TDE status, last backup date, audit volume.
    /// </summary>
    [HttpGet("compliance/summary")]
    public async Task<ActionResult<ComplianceSummaryDto>> GetComplianceSummary()
    {
        var result = await _securityService.GetComplianceSummaryAsync();
        return Ok(result);
    }
}
