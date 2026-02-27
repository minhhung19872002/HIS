using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using AuditDtos = HIS.Application.DTOs.Audit;

namespace HIS.API.Controllers;

/// <summary>
/// Admin controller for audit log queries.
/// Provides Level 6 security audit trail access for administrators.
/// </summary>
[ApiController]
[Route("api/audit")]
[Authorize]
public class AuditController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    /// <summary>
    /// Search audit logs with filters (date, user, action, module, entity type).
    /// Returns paginated results.
    /// </summary>
    [HttpGet("logs")]
    public async Task<ActionResult<AuditDtos.AuditLogPagedResult>> GetLogs([FromQuery] AuditDtos.AuditLogSearchDto search)
    {
        var result = await _auditLogService.GetLogsAsync(search);
        return Ok(result);
    }

    /// <summary>
    /// Get activity logs for a specific user within a date range.
    /// Useful for user access reviews and security investigations.
    /// </summary>
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<AuditDtos.AuditLogDto>>> GetUserActivity(
        string userId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
        var toDate = to ?? DateTime.UtcNow;
        var result = await _auditLogService.GetUserActivityAsync(userId, fromDate, toDate);
        return Ok(result);
    }
}
