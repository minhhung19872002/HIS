using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class EmrManagementService : IEmrManagementService
{
    private readonly HISDbContext _context;
    private readonly IHttpContextAccessor _http;

    public EmrManagementService(HISDbContext context, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _http = httpContextAccessor;
    }

    private string? GetCurrentUserId() =>
        _http.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    private string? GetCurrentUserName() =>
        _http.HttpContext?.User?.FindFirst(ClaimTypes.Name)?.Value
        ?? _http.HttpContext?.User?.FindFirst("fullName")?.Value;

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
                }).ToListAsync();
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
                }).ToListAsync();
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

    // ============================================================
    // Spine (B.1.5)
    // ============================================================

    public async Task<List<EmrSpineDto>> GetSpinesAsync(string? keyword = null)
    {
        try
        {
            var query = _context.Set<EmrSpine>().AsNoTracking()
                .Include(s => s.Sections.Where(sec => !sec.IsDeleted))
                .Where(s => !s.IsDeleted);

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(s => s.Name.Contains(keyword) || s.Code.Contains(keyword));

            return await query.OrderBy(s => s.SortOrder).ThenBy(s => s.Code)
                .Select(s => new EmrSpineDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Code = s.Code,
                    SortOrder = s.SortOrder,
                    Description = s.Description,
                    IsDefault = s.IsDefault,
                    IsActive = s.IsActive,
                    Sections = s.Sections.OrderBy(sec => sec.SortOrder).Select(sec => new EmrSpineSectionDto
                    {
                        Id = sec.Id,
                        EmrSpineId = sec.EmrSpineId,
                        FormType = sec.FormType,
                        FormName = sec.FormName,
                        SortOrder = sec.SortOrder,
                        IsRequired = sec.IsRequired,
                        IsActive = sec.IsActive
                    }).ToList()
                }).ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<EmrSpineDto>();
        }
    }

    public async Task<EmrSpineDto> SaveSpineAsync(SaveEmrSpineDto dto)
    {
        var userId = GetCurrentUserId();
        EmrSpine entity;

        if (dto.Id.HasValue && dto.Id != Guid.Empty)
        {
            entity = await _context.Set<EmrSpine>()
                .Include(s => s.Sections)
                .FirstOrDefaultAsync(s => s.Id == dto.Id.Value && !s.IsDeleted)
                ?? throw new InvalidOperationException("Spine not found");

            entity.Name = dto.Name;
            entity.Code = dto.Code;
            entity.SortOrder = dto.SortOrder;
            entity.Description = dto.Description;
            entity.IsDefault = dto.IsDefault;
            entity.IsActive = dto.IsActive;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;

            // Remove old sections
            foreach (var sec in entity.Sections.ToList())
            {
                sec.IsDeleted = true;
                sec.UpdatedAt = DateTime.UtcNow;
                sec.UpdatedBy = userId;
            }
        }
        else
        {
            entity = new EmrSpine
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                Code = dto.Code,
                SortOrder = dto.SortOrder,
                Description = dto.Description,
                IsDefault = dto.IsDefault,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            _context.Set<EmrSpine>().Add(entity);
        }

        // If setting as default, unset other defaults
        if (dto.IsDefault)
        {
            var others = await _context.Set<EmrSpine>()
                .Where(s => s.IsDefault && s.Id != entity.Id && !s.IsDeleted)
                .ToListAsync();
            foreach (var o in others)
            {
                o.IsDefault = false;
                o.UpdatedAt = DateTime.UtcNow;
                o.UpdatedBy = userId;
            }
        }

        // Add new sections
        foreach (var secDto in dto.Sections)
        {
            var section = new EmrSpineSection
            {
                Id = Guid.NewGuid(),
                EmrSpineId = entity.Id,
                FormType = secDto.FormType,
                FormName = secDto.FormName,
                SortOrder = secDto.SortOrder,
                IsRequired = secDto.IsRequired,
                IsActive = secDto.IsActive,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            _context.Set<EmrSpineSection>().Add(section);
        }

        await _context.SaveChangesAsync();

        return new EmrSpineDto
        {
            Id = entity.Id,
            Name = entity.Name,
            Code = entity.Code,
            SortOrder = entity.SortOrder,
            Description = entity.Description,
            IsDefault = entity.IsDefault,
            IsActive = entity.IsActive,
            Sections = dto.Sections.Select((s, i) => new EmrSpineSectionDto
            {
                EmrSpineId = entity.Id,
                FormType = s.FormType,
                FormName = s.FormName,
                SortOrder = s.SortOrder,
                IsRequired = s.IsRequired,
                IsActive = s.IsActive
            }).ToList()
        };
    }

    public async Task<bool> DeleteSpineAsync(Guid id)
    {
        try
        {
            var entity = await _context.Set<EmrSpine>()
                .Include(s => s.Sections)
                .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
            if (entity == null) return false;

            entity.IsDeleted = true;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = GetCurrentUserId();
            foreach (var sec in entity.Sections)
            {
                sec.IsDeleted = true;
                sec.UpdatedAt = DateTime.UtcNow;
                sec.UpdatedBy = GetCurrentUserId();
            }
            await _context.SaveChangesAsync();
            return true;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return false;
        }
    }

    // ============================================================
    // Patient Signature (B.1.7)
    // ============================================================

    public async Task<List<PatientSignatureDto>> GetSignaturesAsync(Guid? patientId = null, Guid? examinationId = null)
    {
        try
        {
            var query = _context.Set<PatientSignature>().AsNoTracking()
                .Where(s => !s.IsDeleted);

            if (patientId.HasValue)
                query = query.Where(s => s.PatientId == patientId.Value);
            if (examinationId.HasValue)
                query = query.Where(s => s.ExaminationId == examinationId.Value);

            return await query.OrderByDescending(s => s.SignedAt)
                .Select(s => new PatientSignatureDto
                {
                    Id = s.Id,
                    PatientId = s.PatientId,
                    ExaminationId = s.ExaminationId,
                    DocumentType = s.DocumentType,
                    SignatureData = s.SignatureData,
                    SignedAt = s.SignedAt,
                    DeviceInfo = s.DeviceInfo,
                    IpAddress = s.IpAddress,
                    VerificationCode = s.VerificationCode,
                    IsVerified = s.IsVerified,
                    CreatedAt = s.CreatedAt
                }).ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<PatientSignatureDto>();
        }
    }

    public async Task<PatientSignatureDto> CreateSignatureAsync(CreatePatientSignatureDto dto)
    {
        var userId = GetCurrentUserId() ?? "system";

        // Generate verification code (6-digit numeric)
        var verificationCode = RandomNumberGenerator.GetInt32(100000, 999999).ToString();

        var entity = new PatientSignature
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            ExaminationId = dto.ExaminationId,
            DocumentType = dto.DocumentType,
            SignatureData = dto.SignatureData,
            SignedAt = DateTime.UtcNow,
            DeviceInfo = dto.DeviceInfo,
            IpAddress = dto.IpAddress ?? _http.HttpContext?.Connection.RemoteIpAddress?.ToString(),
            VerificationCode = verificationCode,
            IsVerified = false,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId
        };

        _context.Set<PatientSignature>().Add(entity);
        await _context.SaveChangesAsync();

        return new PatientSignatureDto
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            ExaminationId = entity.ExaminationId,
            DocumentType = entity.DocumentType,
            SignatureData = entity.SignatureData,
            SignedAt = entity.SignedAt,
            DeviceInfo = entity.DeviceInfo,
            IpAddress = entity.IpAddress,
            VerificationCode = entity.VerificationCode,
            IsVerified = entity.IsVerified,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<bool> VerifySignatureAsync(Guid signatureId, string verificationCode)
    {
        try
        {
            var entity = await _context.Set<PatientSignature>()
                .FirstOrDefaultAsync(s => s.Id == signatureId && !s.IsDeleted);
            if (entity == null) return false;

            if (entity.VerificationCode != verificationCode)
                return false;

            entity.IsVerified = true;
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

    // ============================================================
    // Data Tags (B.1.13)
    // ============================================================

    public async Task<List<EmrDataTagDto>> GetDataTagsAsync(string? keyword = null, string? category = null, string? formType = null)
    {
        try
        {
            var query = _context.Set<EmrDataTag>().AsNoTracking()
                .Where(t => !t.IsDeleted);

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(t => t.Code.Contains(keyword) || t.Name.Contains(keyword));
            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(t => t.Category == category);
            if (!string.IsNullOrWhiteSpace(formType))
                query = query.Where(t => t.FormType == formType);

            return await query.OrderBy(t => t.SortOrder).ThenBy(t => t.Code)
                .Select(t => new EmrDataTagDto
                {
                    Id = t.Id,
                    Code = t.Code,
                    Name = t.Name,
                    Description = t.Description,
                    DataType = t.DataType,
                    DefaultValue = t.DefaultValue,
                    Category = t.Category,
                    FormType = t.FormType,
                    SortOrder = t.SortOrder,
                    IsSystem = t.IsSystem,
                    IsActive = t.IsActive
                }).ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<EmrDataTagDto>();
        }
    }

    public async Task<EmrDataTagDto> SaveDataTagAsync(SaveEmrDataTagDto dto)
    {
        var userId = GetCurrentUserId();
        EmrDataTag entity;

        if (dto.Id.HasValue && dto.Id != Guid.Empty)
        {
            entity = await _context.Set<EmrDataTag>()
                .FirstOrDefaultAsync(t => t.Id == dto.Id.Value && !t.IsDeleted)
                ?? throw new InvalidOperationException("Data tag not found");

            // Cannot edit system tags
            if (entity.IsSystem)
                throw new InvalidOperationException("Cannot edit system data tag");

            entity.Code = dto.Code;
            entity.Name = dto.Name;
            entity.Description = dto.Description;
            entity.DataType = dto.DataType;
            entity.DefaultValue = dto.DefaultValue;
            entity.Category = dto.Category;
            entity.FormType = dto.FormType;
            entity.SortOrder = dto.SortOrder;
            entity.IsActive = dto.IsActive;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new EmrDataTag
            {
                Id = Guid.NewGuid(),
                Code = dto.Code,
                Name = dto.Name,
                Description = dto.Description,
                DataType = dto.DataType,
                DefaultValue = dto.DefaultValue,
                Category = dto.Category,
                FormType = dto.FormType,
                SortOrder = dto.SortOrder,
                IsSystem = dto.IsSystem,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            _context.Set<EmrDataTag>().Add(entity);
        }

        await _context.SaveChangesAsync();

        return new EmrDataTagDto
        {
            Id = entity.Id,
            Code = entity.Code,
            Name = entity.Name,
            Description = entity.Description,
            DataType = entity.DataType,
            DefaultValue = entity.DefaultValue,
            Category = entity.Category,
            FormType = entity.FormType,
            SortOrder = entity.SortOrder,
            IsSystem = entity.IsSystem,
            IsActive = entity.IsActive
        };
    }

    public async Task<bool> DeleteDataTagAsync(Guid id)
    {
        try
        {
            var entity = await _context.Set<EmrDataTag>()
                .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
            if (entity == null) return false;

            if (entity.IsSystem)
                throw new InvalidOperationException("Cannot delete system data tag");

            entity.IsDeleted = true;
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

    // ============================================================
    // Images (B.1.20)
    // ============================================================

    public async Task<List<EmrImageDto>> GetImagesAsync(string? keyword = null, string? category = null, Guid? departmentId = null)
    {
        try
        {
            var query = _context.Set<EmrImage>().AsNoTracking()
                .Where(i => !i.IsDeleted && i.IsActive);

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(i => i.Title.Contains(keyword) || (i.Tags != null && i.Tags.Contains(keyword)));
            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(i => i.Category == category);
            if (departmentId.HasValue)
                query = query.Where(i => i.DepartmentId == departmentId.Value || i.IsShared);

            return await query.OrderByDescending(i => i.CreatedAt)
                .Select(i => new EmrImageDto
                {
                    Id = i.Id,
                    Title = i.Title,
                    Description = i.Description,
                    ImageData = i.ImageData,
                    Category = i.Category,
                    DepartmentId = i.DepartmentId,
                    UploadedByUserId = i.UploadedByUserId,
                    Tags = i.Tags,
                    Annotations = i.Annotations,
                    IsShared = i.IsShared,
                    IsActive = i.IsActive,
                    CreatedAt = i.CreatedAt
                }).ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<EmrImageDto>();
        }
    }

    public async Task<EmrImageDto> SaveImageAsync(SaveEmrImageDto dto)
    {
        var userId = GetCurrentUserId() ?? "system";
        EmrImage entity;

        if (dto.Id.HasValue && dto.Id != Guid.Empty)
        {
            entity = await _context.Set<EmrImage>()
                .FirstOrDefaultAsync(i => i.Id == dto.Id.Value && !i.IsDeleted)
                ?? throw new InvalidOperationException("Image not found");

            entity.Title = dto.Title;
            entity.Description = dto.Description;
            entity.ImageData = dto.ImageData;
            entity.Category = dto.Category;
            entity.DepartmentId = dto.DepartmentId;
            entity.Tags = dto.Tags;
            entity.Annotations = dto.Annotations;
            entity.IsShared = dto.IsShared;
            entity.IsActive = dto.IsActive;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new EmrImage
            {
                Id = Guid.NewGuid(),
                Title = dto.Title,
                Description = dto.Description,
                ImageData = dto.ImageData,
                Category = dto.Category,
                DepartmentId = dto.DepartmentId,
                UploadedByUserId = userId,
                Tags = dto.Tags,
                Annotations = dto.Annotations,
                IsShared = dto.IsShared,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            _context.Set<EmrImage>().Add(entity);
        }

        await _context.SaveChangesAsync();

        return new EmrImageDto
        {
            Id = entity.Id,
            Title = entity.Title,
            Description = entity.Description,
            ImageData = entity.ImageData,
            Category = entity.Category,
            DepartmentId = entity.DepartmentId,
            UploadedByUserId = entity.UploadedByUserId,
            Tags = entity.Tags,
            Annotations = entity.Annotations,
            IsShared = entity.IsShared,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<bool> DeleteImageAsync(Guid id)
    {
        try
        {
            var entity = await _context.Set<EmrImage>()
                .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);
            if (entity == null) return false;

            entity.IsDeleted = true;
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

    // ============================================================
    // Shortcodes (B.1.22)
    // ============================================================

    public async Task<List<ShortcodeDto>> GetShortcodesAsync(string? keyword = null, string? category = null, Guid? departmentId = null, string? userId = null)
    {
        try
        {
            var query = _context.Set<Shortcode>().AsNoTracking()
                .Where(s => !s.IsDeleted && s.IsActive);

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(s => s.Code.Contains(keyword) || s.FullText.Contains(keyword));
            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(s => s.Category == category);
            if (departmentId.HasValue)
                query = query.Where(s => s.DepartmentId == departmentId.Value || s.IsGlobal);
            if (!string.IsNullOrWhiteSpace(userId))
                query = query.Where(s => s.UserId == userId || s.IsGlobal);

            return await query.OrderBy(s => s.SortOrder).ThenBy(s => s.Code)
                .Select(s => new ShortcodeDto
                {
                    Id = s.Id,
                    Code = s.Code,
                    FullText = s.FullText,
                    Category = s.Category,
                    DepartmentId = s.DepartmentId,
                    UserId = s.UserId,
                    IsGlobal = s.IsGlobal,
                    SortOrder = s.SortOrder,
                    IsActive = s.IsActive
                }).ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<ShortcodeDto>();
        }
    }

    public async Task<ShortcodeDto> SaveShortcodeAsync(SaveShortcodeDto dto)
    {
        var currentUserId = GetCurrentUserId();
        Shortcode entity;

        if (dto.Id.HasValue && dto.Id != Guid.Empty)
        {
            entity = await _context.Set<Shortcode>()
                .FirstOrDefaultAsync(s => s.Id == dto.Id.Value && !s.IsDeleted)
                ?? throw new InvalidOperationException("Shortcode not found");

            entity.Code = dto.Code;
            entity.FullText = dto.FullText;
            entity.Category = dto.Category;
            entity.DepartmentId = dto.DepartmentId;
            entity.UserId = dto.UserId;
            entity.IsGlobal = dto.IsGlobal;
            entity.SortOrder = dto.SortOrder;
            entity.IsActive = dto.IsActive;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = currentUserId;
        }
        else
        {
            entity = new Shortcode
            {
                Id = Guid.NewGuid(),
                Code = dto.Code,
                FullText = dto.FullText,
                Category = dto.Category,
                DepartmentId = dto.DepartmentId,
                UserId = dto.UserId ?? currentUserId,
                IsGlobal = dto.IsGlobal,
                SortOrder = dto.SortOrder,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = currentUserId
            };
            _context.Set<Shortcode>().Add(entity);
        }

        await _context.SaveChangesAsync();

        return new ShortcodeDto
        {
            Id = entity.Id,
            Code = entity.Code,
            FullText = entity.FullText,
            Category = entity.Category,
            DepartmentId = entity.DepartmentId,
            UserId = entity.UserId,
            IsGlobal = entity.IsGlobal,
            SortOrder = entity.SortOrder,
            IsActive = entity.IsActive
        };
    }

    public async Task<bool> DeleteShortcodeAsync(Guid id)
    {
        try
        {
            var entity = await _context.Set<Shortcode>()
                .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
            if (entity == null) return false;

            entity.IsDeleted = true;
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

    public async Task<string?> ExpandShortcodeAsync(string code, string? userId = null, Guid? departmentId = null)
    {
        try
        {
            // Support wildcard search by code prefix
            var query = _context.Set<Shortcode>().AsNoTracking()
                .Where(s => !s.IsDeleted && s.IsActive);

            // Exact match first
            var exact = await query
                .Where(s => s.Code == code)
                .Where(s => s.IsGlobal
                    || (userId != null && s.UserId == userId)
                    || (departmentId.HasValue && s.DepartmentId == departmentId.Value))
                .OrderByDescending(s => s.UserId != null ? 2 : s.DepartmentId != null ? 1 : 0) // User-specific > dept > global
                .Select(s => s.FullText)
                .FirstOrDefaultAsync();

            if (exact != null) return exact;

            // Prefix match (wildcard)
            return await query
                .Where(s => s.Code.StartsWith(code))
                .Where(s => s.IsGlobal
                    || (userId != null && s.UserId == userId)
                    || (departmentId.HasValue && s.DepartmentId == departmentId.Value))
                .OrderBy(s => s.Code.Length) // Shortest code match first
                .Select(s => s.FullText)
                .FirstOrDefaultAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    // ============================================================
    // Auto Check (B.1.25)
    // ============================================================

    public async Task<List<EmrAutoCheckRuleDto>> GetRulesAsync(string? ruleType = null)
    {
        try
        {
            var query = _context.Set<EmrAutoCheckRule>().AsNoTracking()
                .Where(r => !r.IsDeleted);

            if (!string.IsNullOrWhiteSpace(ruleType))
                query = query.Where(r => r.RuleType == ruleType);

            return await query.OrderBy(r => r.SortOrder).ThenBy(r => r.RuleName)
                .Select(r => new EmrAutoCheckRuleDto
                {
                    Id = r.Id,
                    RuleName = r.RuleName,
                    RuleType = r.RuleType,
                    FormType = r.FormType,
                    FieldName = r.FieldName,
                    ErrorMessage = r.ErrorMessage,
                    Severity = r.Severity,
                    IsActive = r.IsActive,
                    SortOrder = r.SortOrder
                }).ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<EmrAutoCheckRuleDto>();
        }
    }

    public async Task<EmrAutoCheckRuleDto> SaveRuleAsync(SaveEmrAutoCheckRuleDto dto)
    {
        var userId = GetCurrentUserId();
        EmrAutoCheckRule entity;

        if (dto.Id.HasValue && dto.Id != Guid.Empty)
        {
            entity = await _context.Set<EmrAutoCheckRule>()
                .FirstOrDefaultAsync(r => r.Id == dto.Id.Value && !r.IsDeleted)
                ?? throw new InvalidOperationException("Rule not found");

            entity.RuleName = dto.RuleName;
            entity.RuleType = dto.RuleType;
            entity.FormType = dto.FormType;
            entity.FieldName = dto.FieldName;
            entity.ErrorMessage = dto.ErrorMessage;
            entity.Severity = dto.Severity;
            entity.IsActive = dto.IsActive;
            entity.SortOrder = dto.SortOrder;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new EmrAutoCheckRule
            {
                Id = Guid.NewGuid(),
                RuleName = dto.RuleName,
                RuleType = dto.RuleType,
                FormType = dto.FormType,
                FieldName = dto.FieldName,
                ErrorMessage = dto.ErrorMessage,
                Severity = dto.Severity,
                IsActive = dto.IsActive,
                SortOrder = dto.SortOrder,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            _context.Set<EmrAutoCheckRule>().Add(entity);
        }

        await _context.SaveChangesAsync();

        return new EmrAutoCheckRuleDto
        {
            Id = entity.Id,
            RuleName = entity.RuleName,
            RuleType = entity.RuleType,
            FormType = entity.FormType,
            FieldName = entity.FieldName,
            ErrorMessage = entity.ErrorMessage,
            Severity = entity.Severity,
            IsActive = entity.IsActive,
            SortOrder = entity.SortOrder
        };
    }

    public async Task<bool> DeleteRuleAsync(Guid id)
    {
        try
        {
            var entity = await _context.Set<EmrAutoCheckRule>()
                .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
            if (entity == null) return false;

            entity.IsDeleted = true;
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

    public async Task<EmrAutoCheckResultDto> RunAutoCheckAsync(Guid examinationId)
    {
        var result = new EmrAutoCheckResultDto
        {
            ExaminationId = examinationId,
            CheckedAt = DateTime.UtcNow,
            Violations = new List<EmrAutoCheckViolationDto>()
        };

        try
        {
            // Load active rules
            var rules = await _context.Set<EmrAutoCheckRule>().AsNoTracking()
                .Where(r => !r.IsDeleted && r.IsActive)
                .OrderBy(r => r.SortOrder)
                .ToListAsync();

            result.TotalRules = rules.Count;

            // Load examination data for checking
            var examination = await _context.Examinations.AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == examinationId && !e.IsDeleted);

            if (examination == null)
            {
                result.Violations.Add(new EmrAutoCheckViolationDto
                {
                    RuleName = "Examination exists",
                    RuleType = "DataValidation",
                    ErrorMessage = "Examination record not found",
                    Severity = 2
                });
                result.ErrorCount = 1;
                return result;
            }

            foreach (var rule in rules)
            {
                bool passed = true;

                switch (rule.RuleType)
                {
                    case "RequiredForm":
                        passed = await CheckRequiredFormAsync(examinationId, rule.FormType);
                        break;

                    case "RequiredField":
                        passed = CheckRequiredField(examination, rule.FieldName);
                        break;

                    case "RequiredSignature":
                        passed = await CheckRequiredSignatureAsync(examinationId, rule.FormType);
                        break;

                    case "DataValidation":
                        passed = await CheckDataValidationAsync(examinationId, rule.FieldName);
                        break;
                }

                if (passed)
                {
                    result.PassedRules++;
                }
                else
                {
                    var violation = new EmrAutoCheckViolationDto
                    {
                        RuleId = rule.Id,
                        RuleName = rule.RuleName,
                        RuleType = rule.RuleType,
                        FormType = rule.FormType,
                        FieldName = rule.FieldName,
                        ErrorMessage = rule.ErrorMessage,
                        Severity = rule.Severity
                    };
                    result.Violations.Add(violation);

                    if (rule.Severity >= 2)
                        result.ErrorCount++;
                    else
                        result.WarningCount++;
                }
            }
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            // Tables not created yet - return empty result with no violations
            result.TotalRules = 0;
        }

        return result;
    }

    private async Task<bool> CheckRequiredFormAsync(Guid examinationId, string? formType)
    {
        if (string.IsNullOrEmpty(formType)) return true;

        try
        {
            return formType switch
            {
                "TreatmentSheet" => await _context.Set<TreatmentSheet>()
                    .AnyAsync(t => t.ExaminationId == examinationId && !t.IsDeleted),
                "ConsultationRecord" => await _context.Set<ConsultationRecord>()
                    .AnyAsync(c => c.ExaminationId == examinationId && !c.IsDeleted),
                "NursingCareSheet" => await _context.Set<NursingCareSheet>()
                    .AnyAsync(n => n.ExaminationId == examinationId && !n.IsDeleted),
                _ => true // Unknown form types pass by default
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return true; // If table doesn't exist, skip the check
        }
    }

    private bool CheckRequiredField(Examination examination, string? fieldName)
    {
        if (string.IsNullOrEmpty(fieldName)) return true;

        return fieldName switch
        {
            "MainIcdCode" => !string.IsNullOrEmpty(examination.MainIcdCode),
            "MainDiagnosis" => !string.IsNullOrEmpty(examination.MainDiagnosis),
            "ConclusionNote" => !string.IsNullOrEmpty(examination.ConclusionNote),
            "TreatmentPlan" => !string.IsNullOrEmpty(examination.TreatmentPlan),
            "ChiefComplaint" => !string.IsNullOrEmpty(examination.ChiefComplaint),
            "PresentIllness" => !string.IsNullOrEmpty(examination.PresentIllness),
            "PhysicalExamination" => !string.IsNullOrEmpty(examination.PhysicalExamination),
            _ => true
        };
    }

    private async Task<bool> CheckRequiredSignatureAsync(Guid examinationId, string? formType)
    {
        try
        {
            // Check if there is at least one approved signing request linked to this examination
            // SigningRequest uses DocumentId (which may be the examinationId) and DocumentType
            return await _context.Set<SigningRequest>()
                .AnyAsync(s => s.DocumentId == examinationId
                    && (formType == null || s.DocumentType == formType)
                    && s.Status == 1 // 1=Approved
                    && !s.IsDeleted);
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return true; // If table doesn't exist, skip the check
        }
    }

    private async Task<bool> CheckDataValidationAsync(Guid examinationId, string? fieldName)
    {
        if (string.IsNullOrEmpty(fieldName)) return true;

        try
        {
            return fieldName switch
            {
                "HasDiagnosis" => await _context.Examinations.AnyAsync(e =>
                    e.Id == examinationId && !e.IsDeleted && e.MainIcdCode != null && e.MainIcdCode != ""),
                "HasVitalSigns" => await _context.Examinations.AnyAsync(e =>
                    e.Id == examinationId && !e.IsDeleted
                    && (e.BloodPressureSystolic != null || e.Pulse != null || e.Temperature != null)),
                _ => true
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return true;
        }
    }

    // ============================================================
    // Close EMR (B.2.5)
    // ============================================================

    public async Task<EmrCloseValidationResultDto> CloseEmrAsync(CloseEmrDto dto)
    {
        // Run auto-check first
        var checkResult = await RunAutoCheckAsync(dto.ExaminationId);
        var validationResult = new EmrCloseValidationResultDto
        {
            ExaminationId = dto.ExaminationId,
            CanClose = checkResult.ErrorCount == 0, // Only close if no Error-severity violations
            WarningCount = checkResult.WarningCount,
            ErrorCount = checkResult.ErrorCount,
            Violations = checkResult.Violations
        };

        if (!validationResult.CanClose)
            return validationResult;

        try
        {
            var userId = GetCurrentUserId() ?? "system";

            // Log the close action
            var closeLog = new EmrCloseLog
            {
                Id = Guid.NewGuid(),
                ExaminationId = dto.ExaminationId,
                ClosedByUserId = userId,
                ClosedAt = DateTime.UtcNow,
                Status = 1, // Closed
                ValidationErrors = checkResult.WarningCount > 0
                    ? System.Text.Json.JsonSerializer.Serialize(checkResult.Violations.Where(v => v.Severity == 1))
                    : null,
                Note = dto.Note,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            _context.Set<EmrCloseLog>().Add(closeLog);

            // Update examination status to locked/closed (Status=5 for closed EMR)
            var examination = await _context.Examinations
                .FirstOrDefaultAsync(e => e.Id == dto.ExaminationId && !e.IsDeleted);
            if (examination != null)
            {
                examination.Status = 5; // Closed
                examination.UpdatedAt = DateTime.UtcNow;
                examination.UpdatedBy = userId;
            }

            await _context.SaveChangesAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            // Table doesn't exist yet, still return validation result
        }

        return validationResult;
    }

    public async Task<bool> ReopenEmrAsync(Guid examinationId, string? note = null)
    {
        try
        {
            var userId = GetCurrentUserId() ?? "system";

            // Log the reopen action
            var reopenLog = new EmrCloseLog
            {
                Id = Guid.NewGuid(),
                ExaminationId = examinationId,
                ClosedByUserId = userId,
                ClosedAt = DateTime.UtcNow,
                Status = 2, // Reopened
                Note = note,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            _context.Set<EmrCloseLog>().Add(reopenLog);

            // Update examination status back to in-progress (Status=3)
            var examination = await _context.Examinations
                .FirstOrDefaultAsync(e => e.Id == examinationId && !e.IsDeleted);
            if (examination != null)
            {
                examination.Status = 3; // In progress
                examination.UpdatedAt = DateTime.UtcNow;
                examination.UpdatedBy = userId;
            }

            await _context.SaveChangesAsync();
            return true;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return false;
        }
    }

    public async Task<List<EmrCloseLogDto>> GetCloseLogsAsync(Guid? examinationId = null)
    {
        try
        {
            var query = _context.Set<EmrCloseLog>().AsNoTracking()
                .Where(l => !l.IsDeleted);

            if (examinationId.HasValue)
                query = query.Where(l => l.ExaminationId == examinationId.Value);

            return await query.OrderByDescending(l => l.ClosedAt)
                .Select(l => new EmrCloseLogDto
                {
                    Id = l.Id,
                    ExaminationId = l.ExaminationId,
                    ClosedByUserId = l.ClosedByUserId,
                    ClosedAt = l.ClosedAt,
                    Status = l.Status,
                    ValidationErrors = l.ValidationErrors,
                    Note = l.Note
                }).ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<EmrCloseLogDto>();
        }
    }

    // ============================================================
    // Data Recovery (B.2.4)
    // ============================================================

    public async Task<List<DeletedRecordDto>> GetDeletedRecordsAsync(string entityType)
    {
        try
        {
            return entityType.ToLowerInvariant() switch
            {
                "treatmentsheet" => await _context.Set<TreatmentSheet>().IgnoreQueryFilters()
                    .Where(x => x.IsDeleted).OrderByDescending(x => x.UpdatedAt).Take(50)
                    .Select(x => new DeletedRecordDto
                    {
                        Id = x.Id, EntityType = "TreatmentSheet",
                        DisplayName = $"Phieu dieu tri - {x.CreatedAt:dd/MM/yyyy}",
                        DeletedAt = x.UpdatedAt, DeletedBy = x.UpdatedBy
                    }).ToListAsync(),
                "consultationrecord" => await _context.Set<ConsultationRecord>().IgnoreQueryFilters()
                    .Where(x => x.IsDeleted).OrderByDescending(x => x.UpdatedAt).Take(50)
                    .Select(x => new DeletedRecordDto
                    {
                        Id = x.Id, EntityType = "ConsultationRecord",
                        DisplayName = $"Bien ban hoi chan - {x.CreatedAt:dd/MM/yyyy}",
                        DeletedAt = x.UpdatedAt, DeletedBy = x.UpdatedBy
                    }).ToListAsync(),
                "nursingcaresheet" => await _context.Set<NursingCareSheet>().IgnoreQueryFilters()
                    .Where(x => x.IsDeleted).OrderByDescending(x => x.UpdatedAt).Take(50)
                    .Select(x => new DeletedRecordDto
                    {
                        Id = x.Id, EntityType = "NursingCareSheet",
                        DisplayName = $"Phieu cham soc - {x.CreatedAt:dd/MM/yyyy}",
                        DeletedAt = x.UpdatedAt, DeletedBy = x.UpdatedBy
                    }).ToListAsync(),
                "prescription" => await _context.Set<Prescription>().IgnoreQueryFilters()
                    .Where(x => x.IsDeleted).OrderByDescending(x => x.UpdatedAt).Take(50)
                    .Select(x => new DeletedRecordDto
                    {
                        Id = x.Id, EntityType = "Prescription",
                        DisplayName = $"Don thuoc - {x.CreatedAt:dd/MM/yyyy}",
                        DeletedAt = x.UpdatedAt, DeletedBy = x.UpdatedBy
                    }).ToListAsync(),
                _ => new List<DeletedRecordDto>()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<DeletedRecordDto>();
        }
    }

    public async Task<bool> RestoreRecordAsync(RestoreRecordDto dto)
    {
        try
        {
            return dto.EntityType.ToLowerInvariant() switch
            {
                "treatmentsheet" => await RestoreEntityAsync<TreatmentSheet>(dto.RecordId),
                "consultationrecord" => await RestoreEntityAsync<ConsultationRecord>(dto.RecordId),
                "nursingcaresheet" => await RestoreEntityAsync<NursingCareSheet>(dto.RecordId),
                "prescription" => await RestoreEntityAsync<Prescription>(dto.RecordId),
                _ => false
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return false;
        }
    }

    private async Task<bool> RestoreEntityAsync<T>(Guid id) where T : BaseEntity
    {
        var entity = await _context.Set<T>().IgnoreQueryFilters()
            .FirstOrDefaultAsync(x => x.Id == id && x.IsDeleted);
        if (entity == null) return false;
        entity.IsDeleted = false;
        entity.UpdatedBy = GetCurrentUserId();
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    // ============================================================
    // Helpers
    // ============================================================

    private static string GenerateAccessCode(int length)
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude ambiguous: 0/O, 1/I
        var bytes = RandomNumberGenerator.GetBytes(length);
        var result = new char[length];
        for (int i = 0; i < length; i++)
            result[i] = chars[bytes[i] % chars.Length];
        return new string(result);
    }
}
