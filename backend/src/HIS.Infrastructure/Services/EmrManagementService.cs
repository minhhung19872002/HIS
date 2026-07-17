using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Common;
using HIS.Application.DTOs;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public partial class EmrManagementService : IEmrManagementService
{
    private readonly HISDbContext _context;
    private readonly IHttpContextAccessor _http;
    private readonly ICurrentUserAccessor _currentUser;

    public EmrManagementService(HISDbContext context, IHttpContextAccessor httpContextAccessor, ICurrentUserAccessor currentUser)
    {
        _context = context;
        _http = httpContextAccessor;
        _currentUser = currentUser;
    }

    // Đọc người dùng hiện tại qua ICurrentUserAccessor (canonical claim) — #200 REFAC-1
    private string? GetCurrentUserId() => _currentUser.UserId;
    private string? GetCurrentUserName() => _currentUser.UserName;

    // ============================================================
    // Sharing (B.1.2)
    // ============================================================

    public async Task<List<EmrShareDto>> GetSharesAsync(Guid? examinationId = null, string? userId = null)
    {
        try
        {
            var query = _context.Set<EmrShare>().AsNoTracking()
                .Where(s => !s.IsDeleted && !s.IsRevoked);

            if (examinationId.HasValue)
                query = query.Where(s => s.ExaminationId == examinationId.Value);
            if (!string.IsNullOrEmpty(userId))
                query = query.Where(s => s.SharedByUserId == userId || s.SharedToUserId == userId);

            return await query.OrderByDescending(s => s.CreatedAt)
                .Select(s => new EmrShareDto
                {
                    Id = s.Id,
                    ExaminationId = s.ExaminationId,
                    SharedByUserId = s.SharedByUserId,
                    SharedToUserId = s.SharedToUserId,
                    SharedToDepartmentId = s.SharedToDepartmentId,
                    ShareType = s.ShareType,
                    FormType = s.FormType,
                    ExpiresAt = s.ExpiresAt,
                    AccessCount = s.AccessCount,
                    IsRevoked = s.IsRevoked,
                    Note = s.Note,
                    CreatedAt = s.CreatedAt
                }).ToBoundedListAsync("EmrManagement.GetShares");
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<EmrShareDto>();
        }
    }

    public async Task<EmrShareDto> CreateShareAsync(CreateEmrShareDto dto)
    {
        var userId = GetCurrentUserId() ?? "system";
        var entity = new EmrShare
        {
            Id = Guid.NewGuid(),
            ExaminationId = dto.ExaminationId,
            SharedByUserId = userId,
            SharedToUserId = dto.SharedToUserId,
            SharedToDepartmentId = dto.SharedToDepartmentId,
            ShareType = dto.ShareType,
            FormType = dto.FormType,
            ExpiresAt = dto.ExpiresAt,
            AccessCount = 0,
            IsRevoked = false,
            Note = dto.Note,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId
        };

        _context.Set<EmrShare>().Add(entity);
        await _context.SaveChangesAsync();

        return new EmrShareDto
        {
            Id = entity.Id,
            ExaminationId = entity.ExaminationId,
            SharedByUserId = entity.SharedByUserId,
            SharedToUserId = entity.SharedToUserId,
            SharedToDepartmentId = entity.SharedToDepartmentId,
            ShareType = entity.ShareType,
            FormType = entity.FormType,
            ExpiresAt = entity.ExpiresAt,
            AccessCount = entity.AccessCount,
            IsRevoked = entity.IsRevoked,
            Note = entity.Note,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<bool> RevokeShareAsync(Guid shareId)
    {
        try
        {
            var entity = await _context.Set<EmrShare>().FindAsync(shareId);
            if (entity == null || entity.IsDeleted) return false;

            entity.IsRevoked = true;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = GetCurrentUserId();
            await _context.SaveChangesAsync();
            return true;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return false;
        }
    }

    public async Task<List<EmrShareAccessLogDto>> GetShareAccessLogsAsync(Guid shareId)
    {
        try
        {
            return await _context.Set<EmrShareAccessLog>().AsNoTracking()
                .Where(l => l.EmrShareId == shareId && !l.IsDeleted)
                .OrderByDescending(l => l.AccessedAt)
                .Select(l => new EmrShareAccessLogDto
                {
                    Id = l.Id,
                    EmrShareId = l.EmrShareId,
                    AccessedByUserId = l.AccessedByUserId,
                    AccessedAt = l.AccessedAt,
                    Action = l.Action
                }).ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<EmrShareAccessLogDto>();
        }
    }

    public async Task<bool> ValidateShareAccessAsync(Guid shareId, string userId)
    {
        try
        {
            var share = await _context.Set<EmrShare>()
                .FirstOrDefaultAsync(s => s.Id == shareId && !s.IsDeleted && !s.IsRevoked);
            if (share == null) return false;

            // Check expiry
            if (share.ExpiresAt.HasValue && DateTime.UtcNow > share.ExpiresAt.Value)
                return false;

            // Check user/department access
            bool hasAccess = share.SharedToUserId == userId
                || share.SharedToUserId == null; // shared to department or all

            if (!hasAccess) return false;

            // Increment access count and log
            share.AccessCount++;
            share.UpdatedAt = DateTime.UtcNow;

            var log = new EmrShareAccessLog
            {
                Id = Guid.NewGuid(),
                EmrShareId = shareId,
                AccessedByUserId = userId,
                AccessedAt = DateTime.UtcNow,
                Action = "View",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            _context.Set<EmrShareAccessLog>().Add(log);

            await _context.SaveChangesAsync();
            return true;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return false;
        }
    }

    // ============================================================
    // Extract (B.1.3)
    // ============================================================

    public async Task<List<EmrExtractDto>> GetExtractsAsync(Guid? examinationId = null, string? userId = null)
    {
        try
        {
            var query = _context.Set<EmrExtract>().AsNoTracking()
                .Where(e => !e.IsDeleted && !e.IsRevoked);

            if (examinationId.HasValue)
                query = query.Where(e => e.ExaminationId == examinationId.Value);
            if (!string.IsNullOrEmpty(userId))
                query = query.Where(e => e.ExtractedByUserId == userId);

            return await query.OrderByDescending(e => e.CreatedAt)
                .Select(e => new EmrExtractDto
                {
                    Id = e.Id,
                    ExaminationId = e.ExaminationId,
                    ExtractedByUserId = e.ExtractedByUserId,
                    ExtractType = e.ExtractType,
                    FormTypes = e.FormTypes,
                    WatermarkText = e.WatermarkText,
                    AccessCode = e.AccessCode,
                    ExpiresAt = e.ExpiresAt,
                    AccessCount = e.AccessCount,
                    MaxAccessCount = e.MaxAccessCount,
                    IsRevoked = e.IsRevoked,
                    Note = e.Note,
                    CreatedAt = e.CreatedAt
                }).ToBoundedListAsync("EmrManagement.GetExtracts");
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<EmrExtractDto>();
        }
    }

    public async Task<EmrExtractDto> CreateExtractAsync(CreateEmrExtractDto dto)
    {
        var userId = GetCurrentUserId() ?? "system";
        var userName = GetCurrentUserName() ?? "System";

        // Generate random access code (8 alphanumeric chars)
        var accessCode = GenerateAccessCode(8);

        // Create watermark with user+date
        var watermark = $"Trich luc boi {userName} ngay {DateTime.Now:dd/MM/yyyy HH:mm} - Ma: {accessCode}";

        var entity = new EmrExtract
        {
            Id = Guid.NewGuid(),
            ExaminationId = dto.ExaminationId,
            ExtractedByUserId = userId,
            ExtractType = dto.ExtractType,
            FormTypes = dto.FormTypes,
            WatermarkText = watermark,
            AccessCode = accessCode,
            ExpiresAt = dto.ExpiresAt ?? DateTime.UtcNow.AddDays(7),
            AccessCount = 0,
            MaxAccessCount = dto.MaxAccessCount > 0 ? dto.MaxAccessCount : 5,
            IsRevoked = false,
            Note = dto.Note,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId
        };

        _context.Set<EmrExtract>().Add(entity);
        await _context.SaveChangesAsync();

        return new EmrExtractDto
        {
            Id = entity.Id,
            ExaminationId = entity.ExaminationId,
            ExtractedByUserId = entity.ExtractedByUserId,
            ExtractType = entity.ExtractType,
            FormTypes = entity.FormTypes,
            WatermarkText = entity.WatermarkText,
            AccessCode = entity.AccessCode,
            ExpiresAt = entity.ExpiresAt,
            AccessCount = entity.AccessCount,
            MaxAccessCount = entity.MaxAccessCount,
            IsRevoked = entity.IsRevoked,
            Note = entity.Note,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<bool> RevokeExtractAsync(Guid extractId)
    {
        try
        {
            var entity = await _context.Set<EmrExtract>().FindAsync(extractId);
            if (entity == null || entity.IsDeleted) return false;

            entity.IsRevoked = true;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = GetCurrentUserId();
            await _context.SaveChangesAsync();
            return true;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return false;
        }
    }

    public async Task<bool> ValidateExtractAccessAsync(string accessCode)
    {
        try
        {
            var extract = await _context.Set<EmrExtract>()
                .FirstOrDefaultAsync(e => e.AccessCode == accessCode && !e.IsDeleted && !e.IsRevoked);
            if (extract == null) return false;

            // Check expiry
            if (extract.ExpiresAt.HasValue && DateTime.UtcNow > extract.ExpiresAt.Value)
                return false;

            // Check max access count
            if (extract.AccessCount >= extract.MaxAccessCount)
                return false;

            // Increment access count
            extract.AccessCount++;
            extract.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return true;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return false;
        }
    }
}
