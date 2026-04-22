using HIS.Application.DTOs.Clinical;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

public class ClinicalTemplateService : IClinicalTemplateService
{
    private readonly HISDbContext _db;
    public ClinicalTemplateService(HISDbContext db) { _db = db; }

    public async Task<ClinicalTemplateDto> SaveAsync(SaveClinicalTemplateDto dto, Guid userId)
    {
        ClinicalTemplate entity;
        if (dto.Id.HasValue)
        {
            entity = await _db.ClinicalTemplates.FirstOrDefaultAsync(t => t.Id == dto.Id.Value)
                ?? throw new KeyNotFoundException("Template không tồn tại");
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId.ToString();
        }
        else
        {
            entity = new ClinicalTemplate
            {
                Id = Guid.NewGuid(),
                TemplateCode = $"TPL{DateTime.Now:yyyyMMddHHmmssfff}",
                OwnerUserId = userId,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId.ToString(),
            };
            _db.ClinicalTemplates.Add(entity);
        }
        entity.TemplateName = dto.TemplateName;
        entity.TemplateType = dto.TemplateType;
        entity.IcdCode = dto.IcdCode;
        entity.IcdName = dto.IcdName;
        entity.DepartmentId = dto.DepartmentId;
        entity.Gender = dto.Gender;
        entity.MinAgeYears = dto.MinAgeYears;
        entity.MaxAgeYears = dto.MaxAgeYears;
        entity.Content = dto.Content ?? string.Empty;
        entity.DefaultMembersJson = dto.DefaultMembersJson;
        entity.IsPublic = dto.IsPublic;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = true;
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(entity.Id))!;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId)
    {
        var entity = await _db.ClinicalTemplates.FirstOrDefaultAsync(t => t.Id == id)
            ?? throw new KeyNotFoundException();
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<ClinicalTemplateDto?> GetByIdAsync(Guid id)
    {
        var t = await _db.ClinicalTemplates
            .Include(x => x.Department)
            .Include(x => x.OwnerUser)
            .FirstOrDefaultAsync(x => x.Id == id);
        return t == null ? null : MapToDto(t);
    }

    public async Task<List<ClinicalTemplateDto>> SearchAsync(ClinicalTemplateSearchDto dto)
    {
        var q = _db.ClinicalTemplates
            .Include(t => t.Department)
            .Include(t => t.OwnerUser)
            .AsQueryable();

        if (dto.OnlyActive ?? true) q = q.Where(t => t.IsActive);
        if (dto.TemplateType.HasValue) q = q.Where(t => t.TemplateType == dto.TemplateType.Value);
        if (!string.IsNullOrWhiteSpace(dto.IcdCode))
            q = q.Where(t => t.IcdCode == dto.IcdCode || string.IsNullOrEmpty(t.IcdCode));
        if (dto.DepartmentId.HasValue)
            q = q.Where(t => t.DepartmentId == dto.DepartmentId || t.DepartmentId == null);
        if (dto.Gender.HasValue && dto.Gender.Value > 0)
            q = q.Where(t => t.Gender == 0 || t.Gender == dto.Gender.Value);
        if (dto.AgeYears.HasValue)
        {
            var age = dto.AgeYears.Value;
            q = q.Where(t => (t.MinAgeYears == null || t.MinAgeYears <= age)
                && (t.MaxAgeYears == null || t.MaxAgeYears >= age));
        }
        if (!string.IsNullOrWhiteSpace(dto.Keyword))
        {
            var kw = dto.Keyword.Trim();
            q = q.Where(t => t.TemplateName.Contains(kw) || t.TemplateCode.Contains(kw)
                || (t.IcdName != null && t.IcdName.Contains(kw)));
        }

        var list = await q
            .OrderBy(t => t.SortOrder)
            .ThenByDescending(t => t.UsageCount)
            .ThenBy(t => t.TemplateName)
            .Take(dto.PageSize)
            .ToListAsync();
        return list.Select(MapToDto).ToList();
    }

    public async Task<ClinicalTemplateDto> IncrementUsageAsync(Guid id)
    {
        var t = await _db.ClinicalTemplates.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException();
        t.UsageCount++;
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(id))!;
    }

    private static ClinicalTemplateDto MapToDto(ClinicalTemplate t) => new()
    {
        Id = t.Id,
        TemplateCode = t.TemplateCode,
        TemplateName = t.TemplateName,
        TemplateType = t.TemplateType,
        TemplateTypeName = MapTypeName(t.TemplateType),
        IcdCode = t.IcdCode,
        IcdName = t.IcdName,
        DepartmentId = t.DepartmentId,
        DepartmentName = t.Department?.DepartmentName,
        Gender = t.Gender,
        MinAgeYears = t.MinAgeYears,
        MaxAgeYears = t.MaxAgeYears,
        Content = t.Content,
        DefaultMembersJson = t.DefaultMembersJson,
        IsPublic = t.IsPublic,
        OwnerUserId = t.OwnerUserId,
        OwnerName = t.OwnerUser?.FullName,
        IsActive = t.IsActive,
        UsageCount = t.UsageCount,
        SortOrder = t.SortOrder,
        CreatedAt = t.CreatedAt
    };

    private static string MapTypeName(int type) => type switch
    {
        1 => "HSBA ngoại trú mẫu",
        2 => "Tường trình PTTT mẫu",
        3 => "Kết luận khám mẫu",
        4 => "Diễn biến bệnh mẫu",
        5 => "Hội chẩn mẫu",
        6 => "Cam kết mẫu",
        7 => "Giấy chứng nhận mẫu",
        _ => "Khác"
    };
}
