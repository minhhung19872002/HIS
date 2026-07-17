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

public partial class EmrManagementService
{
    // ============================================================
    // Document Lock (B.1.11)
    // ============================================================

    public async Task<DocumentLockDto?> AcquireLockAsync(AcquireLockDto dto)
    {
        try
        {
            var userId = GetCurrentUserId() ?? "system";
            var userName = GetCurrentUserName() ?? "System";
            var lockMinutes = dto.LockDurationMinutes ?? 10;
            var now = DateTime.UtcNow;

            // Check for existing active lock (auto-expire stale locks)
            var existing = await _context.Set<DocumentLock>()
                .Where(l =>
                    l.DocumentType == dto.DocumentType
                    && l.DocumentId == dto.DocumentId
                    && l.IsActive
                    && !l.IsDeleted)
                .Select(l => new
                {
                    l.Id,
                    l.DocumentType,
                    l.DocumentId,
                    l.LockedByUserId,
                    l.LockedByUserName,
                    l.LockedAt,
                    l.ExpiresAt
                })
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                // Auto-expire if past expiry time
                if (now > existing.ExpiresAt)
                {
                    await _context.Set<DocumentLock>()
                        .Where(l => l.Id == existing.Id)
                        .ExecuteUpdateAsync(setters => setters
                            .SetProperty(l => l.IsActive, false)
                            .SetProperty(l => l.UpdatedAt, now)
                            .SetProperty(l => l.UpdatedBy, userId));
                }
                else if (existing.LockedByUserId != userId)
                {
                    // Locked by someone else, return their lock info
                    return new DocumentLockDto
                    {
                        Id = existing.Id,
                        DocumentType = existing.DocumentType,
                        DocumentId = existing.DocumentId,
                        LockedByUserId = existing.LockedByUserId,
                        LockedByUserName = existing.LockedByUserName,
                        LockedAt = existing.LockedAt,
                        ExpiresAt = existing.ExpiresAt,
                        IsActive = true
                    };
                }
                else
                {
                    // Same user - extend lock
                    var newExpiry = now.AddMinutes(lockMinutes);
                    await _context.Set<DocumentLock>()
                        .Where(l => l.Id == existing.Id)
                        .ExecuteUpdateAsync(setters => setters
                            .SetProperty(l => l.ExpiresAt, newExpiry)
                            .SetProperty(l => l.UpdatedAt, now)
                            .SetProperty(l => l.UpdatedBy, userId));

                    return new DocumentLockDto
                    {
                        Id = existing.Id,
                        DocumentType = existing.DocumentType,
                        DocumentId = existing.DocumentId,
                        LockedByUserId = existing.LockedByUserId,
                        LockedByUserName = existing.LockedByUserName,
                        LockedAt = existing.LockedAt,
                        ExpiresAt = newExpiry,
                        IsActive = true
                    };
                }
            }

            // Create new lock
            var entity = new DocumentLock
            {
                Id = Guid.NewGuid(),
                DocumentType = dto.DocumentType,
                DocumentId = dto.DocumentId,
                LockedByUserId = userId,
                LockedByUserName = userName,
                LockedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(lockMinutes),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };

            _context.Set<DocumentLock>().Add(entity);
            await _context.SaveChangesAsync();

            return new DocumentLockDto
            {
                Id = entity.Id,
                DocumentType = entity.DocumentType,
                DocumentId = entity.DocumentId,
                LockedByUserId = entity.LockedByUserId,
                LockedByUserName = entity.LockedByUserName,
                LockedAt = entity.LockedAt,
                ExpiresAt = entity.ExpiresAt,
                IsActive = true
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    public async Task<bool> ReleaseLockAsync(Guid lockId)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId)) return false;

            var ownedLock = await _context.Set<DocumentLock>()
                .Where(l => l.Id == lockId && !l.IsDeleted)
                .Select(l => new { l.Id, l.LockedByUserId })
                .FirstOrDefaultAsync();
            if (ownedLock == null || ownedLock.LockedByUserId != userId) return false; // Only lock owner can release

            await _context.Set<DocumentLock>()
                .Where(l => l.Id == lockId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(l => l.IsActive, false)
                    .SetProperty(l => l.UpdatedAt, DateTime.UtcNow)
                    .SetProperty(l => l.UpdatedBy, userId));
            return true;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return false;
        }
    }

    public async Task<DocumentLockDto?> GetLockStatusAsync(string documentType, Guid documentId)
    {
        try
        {
            var entity = await _context.Set<DocumentLock>().AsNoTracking()
                .Where(l =>
                    l.DocumentType == documentType
                    && l.DocumentId == documentId
                    && l.IsActive
                    && !l.IsDeleted)
                .Select(l => new
                {
                    l.Id,
                    l.DocumentType,
                    l.DocumentId,
                    l.LockedByUserId,
                    l.LockedByUserName,
                    l.LockedAt,
                    l.ExpiresAt
                })
                .FirstOrDefaultAsync();

            if (entity == null) return null;

            // Auto-expired check
            if (DateTime.UtcNow > entity.ExpiresAt)
                return null;

            return new DocumentLockDto
            {
                Id = entity.Id,
                DocumentType = entity.DocumentType,
                DocumentId = entity.DocumentId,
                LockedByUserId = entity.LockedByUserId,
                LockedByUserName = entity.LockedByUserName,
                LockedAt = entity.LockedAt,
                ExpiresAt = entity.ExpiresAt,
                IsActive = true
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    public async Task<bool> ForceReleaseLockAsync(Guid lockId)
    {
        try
        {
            var affected = await _context.Set<DocumentLock>()
                .Where(l => l.Id == lockId && !l.IsDeleted)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(l => l.IsActive, false)
                    .SetProperty(l => l.UpdatedAt, DateTime.UtcNow)
                    .SetProperty(l => l.UpdatedBy, GetCurrentUserId()));
            return affected > 0;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return false;
        }
    }
}
