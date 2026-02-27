using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
        }
        catch (Exception ex)
        {
            // Never let audit logging fail the main request
            _logger.LogWarning(ex, "Failed to write audit log: {Action} {EntityType} {EntityId}", action, entityType, entityId);
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
}
