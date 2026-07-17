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
}
