using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.Common;
using HIS.Application.DTOs.Audit;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

// Resolve ambiguity with legacy AuditLogSearchDto in ISystemCompleteService
using AuditSearchDto = HIS.Application.DTOs.Audit.AuditLogSearchDto;
using AuditResultDto = HIS.Application.DTOs.Audit.AuditLogDto;
using AuditPagedResult = HIS.Application.DTOs.Audit.AuditLogPagedResult;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Audit log service implementation using EF Core.
/// Provides fire-and-forget logging and query capabilities for Level 6 compliance.
/// </summary>
public class AuditLogService : IAuditLogService
{
    private readonly HISDbContext _context;
    private readonly ILogger<AuditLogService> _logger;

    public AuditLogService(HISDbContext context, ILogger<AuditLogService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task LogAsync(
        string userId,
        string userName,
        string action,
        string entityType,
        string entityId,
        string? details,
        string? ipAddress,
        string? userAgent,
        string? module,
        string? requestPath = null,
        string? requestMethod = null,
        int? responseStatusCode = null)
    {
        try
        {
            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid(),
                UserId = Guid.TryParse(userId, out var uid) ? uid : null,
                Username = userName,
                UserFullName = userName,
                Action = action,
                TableName = entityType,      // Legacy field compatibility
                EntityType = entityType,
                RecordId = Guid.TryParse(entityId, out var rid) ? rid : Guid.Empty,
                EntityId = entityId,
                Details = details,
                IpAddress = ipAddress,
                UserAgent = userAgent?.Length > 500 ? userAgent[..500] : userAgent,
                Timestamp = DateTime.UtcNow,
                Module = module,
                RequestPath = requestPath?.Length > 500 ? requestPath[..500] : requestPath,
                RequestMethod = requestMethod,
                ResponseStatusCode = responseStatusCode,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                IsDeleted = false
            };

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
            AuditWriteMetrics.RecordSuccess();
        }
        catch (Exception ex)
        {
            // Never let audit logging fail the main request
            AuditWriteMetrics.RecordFailure(ex);
            _logger.LogWarning(ex, "Failed to write audit log: {Action} {EntityType} {EntityId}", action, entityType, entityId);
        }
    }

    public async Task WriteAsync(AuditLog entry)
    {
        try
        {
            _context.AuditLogs.Add(entry);
            await _context.SaveChangesAsync();
            AuditWriteMetrics.RecordSuccess();
        }
        catch (Exception ex)
        {
            // Never let audit logging fail the main request
            AuditWriteMetrics.RecordFailure(ex);
            _logger.LogWarning(ex, "Failed to write audit log entry: {Action} {EntityType}", entry.Action, entry.EntityType ?? entry.TableName);
        }
    }

    public async Task WriteManyAsync(IEnumerable<AuditLog> entries)
    {
        var list = entries as ICollection<AuditLog> ?? entries.ToList();
        if (list.Count == 0) return;
        try
        {
            _context.AuditLogs.AddRange(list);
            await _context.SaveChangesAsync();
            AuditWriteMetrics.RecordSuccess(list.Count);
        }
        catch (Exception ex)
        {
            // Never let audit logging fail the main request
            AuditWriteMetrics.RecordFailure(ex);
            _logger.LogWarning(ex, "Failed to write {Count} audit log entries", list.Count);
        }
    }

    public async Task<AuditPagedResult> GetLogsAsync(AuditSearchDto dto)
    {
        try
        {
            var query = _context.AuditLogs
                .IgnoreQueryFilters() // Include soft-deleted entries for audit trail completeness
                .AsNoTracking()
                .AsQueryable();

            // Apply filters
            if (!string.IsNullOrWhiteSpace(dto.UserId))
            {
                if (Guid.TryParse(dto.UserId, out var uid))
                    query = query.Where(l => l.UserId == uid);
                else
                    query = query.Where(l => l.Username != null && l.Username.Contains(dto.UserId));
            }

            if (!string.IsNullOrWhiteSpace(dto.Action))
                query = query.Where(l => l.Action == dto.Action);

            if (!string.IsNullOrWhiteSpace(dto.EntityType))
                query = query.Where(l => l.EntityType == dto.EntityType || l.TableName == dto.EntityType);

            if (!string.IsNullOrWhiteSpace(dto.Module))
                query = query.Where(l => l.Module == dto.Module);

            if (dto.FromDate.HasValue)
                query = query.Where(l => l.Timestamp >= dto.FromDate.Value || l.CreatedAt >= dto.FromDate.Value);

            if (dto.ToDate.HasValue)
            {
                var toDateEnd = dto.ToDate.Value.Date.AddDays(1);
                query = query.Where(l => l.Timestamp < toDateEnd || l.CreatedAt < toDateEnd);
            }

            if (!string.IsNullOrWhiteSpace(dto.Keyword))
            {
                var kw = dto.Keyword.ToLower();
                query = query.Where(l =>
                    (l.Username != null && l.Username.ToLower().Contains(kw)) ||
                    (l.UserFullName != null && l.UserFullName.ToLower().Contains(kw)) ||
                    (l.EntityId != null && l.EntityId.Contains(kw)) ||
                    (l.Details != null && l.Details.ToLower().Contains(kw)) ||
                    (l.RequestPath != null && l.RequestPath.ToLower().Contains(kw)));
            }

            // Get total count
            var totalCount = await query.CountAsync();

            // Order and paginate
            var items = await query
                .OrderByDescending(l => l.Timestamp == default ? l.CreatedAt : l.Timestamp)
                .Skip(dto.PageIndex * dto.PageSize)
                .Take(dto.PageSize)
                .Select(l => new AuditResultDto
                {
                    Id = l.Id,
                    UserId = l.UserId.HasValue ? l.UserId.Value.ToString() : null,
                    UserName = l.Username,
                    UserFullName = l.UserFullName ?? l.Username,
                    Action = l.Action,
                    EntityType = l.EntityType ?? l.TableName,
                    EntityId = l.EntityId ?? l.RecordId.ToString(),
                    Details = l.Details,
                    IpAddress = l.IpAddress,
                    UserAgent = l.UserAgent,
                    Timestamp = l.Timestamp == default ? l.CreatedAt : l.Timestamp,
                    Module = l.Module,
                    RequestPath = l.RequestPath,
                    RequestMethod = l.RequestMethod,
                    ResponseStatusCode = l.ResponseStatusCode,
                    OldValues = l.OldValues,
                    NewValues = l.NewValues
                })
                .ToListAsync();

            return new AuditPagedResult
            {
                Items = items,
                TotalCount = totalCount,
                PageIndex = dto.PageIndex,
                PageSize = dto.PageSize
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error in GetLogsAsync");
            return new AuditPagedResult
            {
                Items = new List<AuditResultDto>(),
                TotalCount = 0,
                PageIndex = dto.PageIndex,
                PageSize = dto.PageSize
            };
        }
    }

    public async Task<List<AuditResultDto>> GetUserActivityAsync(string userId, DateTime from, DateTime to)
    {
        try
        {
            var toEnd = to.Date.AddDays(1);
            var query = _context.AuditLogs
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(l => (l.Timestamp >= from && l.Timestamp < toEnd) ||
                            (l.CreatedAt >= from && l.CreatedAt < toEnd));

            if (Guid.TryParse(userId, out var uid))
                query = query.Where(l => l.UserId == uid);
            else
                query = query.Where(l => l.Username == userId);

            return await query
                .OrderByDescending(l => l.Timestamp == default ? l.CreatedAt : l.Timestamp)
                .Take(500)
                .Select(l => new AuditResultDto
                {
                    Id = l.Id,
                    UserId = l.UserId.HasValue ? l.UserId.Value.ToString() : null,
                    UserName = l.Username,
                    UserFullName = l.UserFullName ?? l.Username,
                    Action = l.Action,
                    EntityType = l.EntityType ?? l.TableName,
                    EntityId = l.EntityId ?? l.RecordId.ToString(),
                    Details = l.Details,
                    IpAddress = l.IpAddress,
                    UserAgent = l.UserAgent,
                    Timestamp = l.Timestamp == default ? l.CreatedAt : l.Timestamp,
                    Module = l.Module,
                    RequestPath = l.RequestPath,
                    RequestMethod = l.RequestMethod,
                    ResponseStatusCode = l.ResponseStatusCode,
                    OldValues = l.OldValues,
                    NewValues = l.NewValues
                })
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error in GetUserActivityAsync for user {UserId}", userId);
            return new List<AuditResultDto>();
        }
    }

    // AUTHZ-5 (#371) increment-3: báo cáo truy vết thay đổi phân quyền — read-only, fail-safe (lỗi → rỗng).
    public async Task<PermissionChangePagedResult> GetPermissionChangeHistoryAsync(PermissionChangeSearchDto dto)
    {
        try
        {
            var pageSize = dto.PageSize is > 0 and <= 500 ? dto.PageSize : 50;
            var pageIndex = dto.PageIndex < 0 ? 0 : dto.PageIndex;

            var query = _context.PermissionChangeHistories
                .IgnoreQueryFilters() // include soft-deleted for audit completeness
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(dto.TargetUserId) && Guid.TryParse(dto.TargetUserId, out var tuid))
                query = query.Where(h => h.TargetUserId == tuid);

            if (!string.IsNullOrWhiteSpace(dto.ChangeType))
                query = query.Where(h => h.ChangeType == dto.ChangeType);

            if (!string.IsNullOrWhiteSpace(dto.Action))
                query = query.Where(h => h.Action == dto.Action);

            if (!string.IsNullOrWhiteSpace(dto.ChangedBy))
                query = query.Where(h => h.ChangedBy != null && h.ChangedBy.Contains(dto.ChangedBy!));

            if (dto.FromDate.HasValue)
                query = query.Where(h => h.ChangedAt >= dto.FromDate.Value);

            if (dto.ToDate.HasValue)
            {
                var toEnd = dto.ToDate.Value.Date.AddDays(1);
                query = query.Where(h => h.ChangedAt < toEnd);
            }

            var totalCount = await query.CountAsync();

            var rows = await query
                .OrderByDescending(h => h.ChangedAt)
                .Skip(pageIndex * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Resolve tên user/role trong bộ nhớ (né correlated-subquery; IgnoreQueryFilters đọc cả bản ghi đã xoá mềm).
            var userIds = rows.Where(r => r.TargetUserId.HasValue).Select(r => r.TargetUserId!.Value).Distinct().ToList();
            var roleIds = rows.Where(r => r.TargetRoleId.HasValue).Select(r => r.TargetRoleId!.Value).Distinct().ToList();

            var userNames = userIds.Count == 0 ? new Dictionary<Guid, string>() :
                await _context.Users.IgnoreQueryFilters().AsNoTracking()
                    .Where(u => userIds.Contains(u.Id))
                    .Select(u => new { u.Id, Name = u.FullName != "" ? u.FullName : u.Username })
                    .ToDictionaryAsync(x => x.Id, x => x.Name);

            var roleNames = roleIds.Count == 0 ? new Dictionary<Guid, string>() :
                await _context.Roles.IgnoreQueryFilters().AsNoTracking()
                    .Where(r => roleIds.Contains(r.Id))
                    .Select(r => new { r.Id, r.RoleName })
                    .ToDictionaryAsync(x => x.Id, x => x.RoleName);

            var items = rows.Select(h => new PermissionChangeHistoryDto
            {
                Id = h.Id,
                ChangeType = h.ChangeType,
                TargetUserId = h.TargetUserId,
                TargetUserName = h.TargetUserId.HasValue && userNames.TryGetValue(h.TargetUserId.Value, out var un) ? un : null,
                TargetRoleId = h.TargetRoleId,
                TargetRoleName = h.TargetRoleId.HasValue && roleNames.TryGetValue(h.TargetRoleId.Value, out var rn) ? rn : null,
                PermissionCode = h.PermissionCode,
                Action = h.Action,
                OldValueJson = h.OldValueJson,
                NewValueJson = h.NewValueJson,
                Reason = h.Reason,
                ChangedBy = h.ChangedBy,
                ChangedAt = h.ChangedAt
            }).ToList();

            return new PermissionChangePagedResult
            {
                Items = items,
                TotalCount = totalCount,
                PageIndex = pageIndex,
                PageSize = pageSize
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error in GetPermissionChangeHistoryAsync");
            return new PermissionChangePagedResult { Items = new(), TotalCount = 0, PageIndex = dto.PageIndex, PageSize = dto.PageSize };
        }
    }

    // AUTHZ-5 (#371) increment-3: báo cáo tổng hợp hoạt động audit (đếm theo action/module/top-user) — read-only, fail-safe.
    public async Task<AuditSummaryDto> GetAuditSummaryAsync(DateTime from, DateTime to)
    {
        try
        {
            var toEnd = to.Date.AddDays(1);
            var baseQuery = _context.AuditLogs
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(l => (l.Timestamp >= from && l.Timestamp < toEnd) || (l.CreatedAt >= from && l.CreatedAt < toEnd));

            var totalEvents = await baseQuery.CountAsync();

            var byActionRaw = await baseQuery
                .GroupBy(l => l.Action)
                .Select(g => new { g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count).Take(20).ToListAsync();

            var byModuleRaw = await baseQuery
                .GroupBy(l => l.Module)
                .Select(g => new { g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count).Take(20).ToListAsync();

            var topUsersRaw = await baseQuery
                .GroupBy(l => l.Username)
                .Select(g => new { g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count).Take(20).ToListAsync();

            return new AuditSummaryDto
            {
                FromDate = from,
                ToDate = to,
                TotalEvents = totalEvents,
                ByAction = byActionRaw.Select(x => new AuditCountItem { Key = string.IsNullOrEmpty(x.Key) ? "(none)" : x.Key, Count = x.Count }).ToList(),
                ByModule = byModuleRaw.Select(x => new AuditCountItem { Key = string.IsNullOrEmpty(x.Key) ? "(none)" : x.Key!, Count = x.Count }).ToList(),
                TopUsers = topUsersRaw.Select(x => new AuditCountItem { Key = string.IsNullOrEmpty(x.Key) ? "(none)" : x.Key!, Count = x.Count }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error in GetAuditSummaryAsync");
            return new AuditSummaryDto { FromDate = from, ToDate = to, TotalEvents = 0 };
        }
    }

    public async Task<byte[]> ExportLogsAsync(AuditSearchDto dto)
    {
        try
        {
            var exportDto = new AuditSearchDto
            {
                UserId = dto.UserId,
                Action = dto.Action,
                EntityType = dto.EntityType,
                Module = dto.Module,
                FromDate = dto.FromDate,
                ToDate = dto.ToDate,
                Keyword = dto.Keyword,
                PageIndex = 0,
                PageSize = 5000
            };

            var result = await GetLogsAsync(exportDto);

            var headers = new[] { "Thời gian", "Người dùng", "Phân hệ", "Hành động", "Loại đối tượng", "IP", "Mã HTTP", "Chi tiết" };
            var rows = result.Items.Select(l => new[]
            {
                l.Timestamp.ToString("dd/MM/yyyy HH:mm:ss"),
                l.UserFullName ?? l.UserName ?? "",
                l.Module ?? "",
                l.Action,
                l.EntityType ?? "",
                l.IpAddress ?? "",
                l.ResponseStatusCode?.ToString() ?? "",
                l.Details ?? ""
            }).ToList();

            var fromStr = dto.FromDate.HasValue ? dto.FromDate.Value.ToString("dd/MM/yyyy") : "";
            var toStr = dto.ToDate.HasValue ? dto.ToDate.Value.ToString("dd/MM/yyyy") : "";
            var subtitle = fromStr != "" ? $"Từ {fromStr} đến {toStr} — {result.TotalCount} bản ghi" : $"{result.TotalCount} bản ghi";

            var html = PdfTemplateHelper.BuildTableReport("NHẬT KÝ KIỂM TOÁN HỆ THỐNG", subtitle, DateTime.Now, headers, rows, "Quản trị hệ thống");
            return Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error in ExportLogsAsync");
            return Array.Empty<byte>();
        }
    }

    public async Task<RecertificationReportDto> GetRecertificationAsync(DateTime asOf)
    {
        try
        {
            // Query active UserRoles at asOf: ValidTo==null (permanent) or ValidTo>=asOf
            var assignments = await (
                from ur in _context.UserRoles
                    .AsNoTracking()
                    .Where(u => !u.IsDeleted && (u.ValidTo == null || u.ValidTo >= asOf))
                join u in _context.Users.AsNoTracking() on ur.UserId equals u.Id
                join r in _context.Roles.AsNoTracking() on ur.RoleId equals r.Id
                where !u.IsDeleted && !r.IsDeleted
                orderby ur.ScopeType, u.FullName ?? u.Username
                select new UserRoleRecordDto
                {
                    UserId = ur.UserId.ToString(),
                    Username = u.Username,
                    FullName = !string.IsNullOrEmpty(u.FullName) ? u.FullName : u.Username,
                    RoleCode = r.RoleCode,
                    RoleName = !string.IsNullOrEmpty(r.RoleName) ? r.RoleName : r.RoleCode,
                    ScopeType = ur.ScopeType,
                    ValidFrom = ur.ValidFrom,
                    ValidTo = ur.ValidTo,
                    GrantedBy = ur.GrantedBy
                }).ToListAsync();

            var groups = assignments
                .GroupBy(a => a.ScopeType)
                .Select(g => new RecertificationGroupDto
                {
                    ScopeType = g.Key,
                    ScopeLabel = g.Key switch
                    {
                        "ORG" => "Toàn viện",
                        "BRANCH" => "Cơ sở",
                        "DEPT" => "Khoa/Phòng",
                        "OWN" => "Cá nhân",
                        _ => g.Key
                    },
                    TotalAssignments = g.Count(),
                    TotalUniqueUsers = g.Select(a => a.UserId).Distinct().Count(),
                    Assignments = g.ToList()
                })
                .OrderBy(g => g.ScopeType)
                .ToList();

            return new RecertificationReportDto
            {
                AsOf = asOf,
                TotalActiveAssignments = assignments.Count,
                TotalUsers = assignments.Select(a => a.UserId).Distinct().Count(),
                Groups = groups
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error in GetRecertificationAsync");
            return new RecertificationReportDto { AsOf = asOf, TotalActiveAssignments = 0, TotalUsers = 0 };
        }
    }
}
