using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.API.Authorization;
using AuditDtos = HIS.Application.DTOs.Audit;

namespace HIS.API.Controllers;

/// <summary>
/// Admin controller for audit log queries.
/// Provides Level 6 security audit trail access for administrators.
/// </summary>
[ApiController]
[Route("api/audit")]
[RequirePermission(PermissionCatalog.AuditLog.Read)] // AUTHZ-1 pilot (cũ: Admin/Manager/Director/QuanTriHeThong — đều sinh từ RoleCode ADMIN → matrix: chỉ ADMIN, preserve)
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

    /// <summary>
    /// AUTHZ-5 (#371): báo cáo truy vết thay đổi phân quyền (ai gán/thu-hồi role/quyền cho ai, old→new, khi nào).
    /// Read-only compliance report over PermissionChangeHistory — lọc theo user/loại/hành động/người-đổi + ngày, phân trang.
    /// </summary>
    [HttpGet("permission-changes")]
    public async Task<ActionResult<AuditDtos.PermissionChangePagedResult>> GetPermissionChanges(
        [FromQuery] AuditDtos.PermissionChangeSearchDto search)
    {
        var result = await _auditLogService.GetPermissionChangeHistoryAsync(search);
        return Ok(result);
    }

    /// <summary>
    /// AUTHZ-5 (#371): báo cáo tổng hợp hoạt động audit trong khoảng thời gian (đếm theo action/module/top-user).
    /// </summary>
    [HttpGet("summary")]
    public async Task<ActionResult<AuditDtos.AuditSummaryDto>> GetSummary(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
        var toDate = to ?? DateTime.UtcNow;
        var result = await _auditLogService.GetAuditSummaryAsync(fromDate, toDate);
        return Ok(result);
    }
}
