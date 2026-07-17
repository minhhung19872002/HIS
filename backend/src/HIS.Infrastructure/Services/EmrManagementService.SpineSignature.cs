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
                }).ToBoundedListAsync("EmrManagement.GetSignatures");
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
            // QW3.9
            IsProxySignature = dto.IsProxySignature,
            ProxySignerName = dto.ProxySignerName,
            ProxySignerCccd = dto.ProxySignerCccd,
            ProxySignerRelation = dto.ProxySignerRelation,
            ProxyReason = dto.ProxyReason,
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
            IsProxySignature = entity.IsProxySignature,
            ProxySignerName = entity.ProxySignerName,
            ProxySignerCccd = entity.ProxySignerCccd,
            ProxySignerRelation = entity.ProxySignerRelation,
            ProxyReason = entity.ProxyReason,
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
}
