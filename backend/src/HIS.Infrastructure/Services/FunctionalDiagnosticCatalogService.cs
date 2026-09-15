using HIS.Application.DTOs.FunctionalDiagnostic;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// CRUD danh mục thăm dò chức năng: Loại TDCN + Mẫu kết quả.
/// Soft-delete via IsDeleted. CreatedBy/UpdatedBy = NVARCHAR(450) — không cần ValueConverter.
/// </summary>
public class FunctionalDiagnosticCatalogService : IFunctionalDiagnosticCatalogService
{
    private readonly HISDbContext _db;

    public FunctionalDiagnosticCatalogService(HISDbContext db) => _db = db;

    // ─── TestType ─────────────────────────────────────────────────────────────

    public async Task<List<FunctionalDiagnosticTestTypeDto>> GetTestTypesAsync(string? keyword)
    {
        var q = _db.Set<FunctionalDiagnosticTestType>().Where(t => !t.IsDeleted);
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(t => t.Name.Contains(keyword) || t.Code.Contains(keyword));
        var list = await q.OrderBy(t => t.Code).ToBoundedListAsync("FunctionalDiagnosticCatalogService.GetTestTypesAsync");
        return list.Select(t => new FunctionalDiagnosticTestTypeDto
        {
            Id = t.Id, Code = t.Code, Name = t.Name,
            Description = t.Description, IsActive = t.IsActive
        }).ToList();
    }

    public async Task<FunctionalDiagnosticTestTypeDto> SaveTestTypeAsync(
        SaveFunctionalDiagnosticTestTypeDto dto, string? userId)
    {
        if (string.IsNullOrWhiteSpace(dto.Code) || string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Mã và tên loại thăm dò chức năng là bắt buộc");
        FunctionalDiagnosticTestType entity;
        if (dto.Id == Guid.Empty)
        {
            entity = new FunctionalDiagnosticTestType
            {
                CreatedAt = DateTime.UtcNow, CreatedBy = userId
            };
            _db.Set<FunctionalDiagnosticTestType>().Add(entity);
        }
        else
        {
            entity = await _db.Set<FunctionalDiagnosticTestType>()
                .FirstOrDefaultAsync(t => t.Id == dto.Id)
                ?? throw new KeyNotFoundException("Không tìm thấy loại thăm dò chức năng");
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        entity.Code = dto.Code;
        entity.Name = dto.Name;
        entity.Description = dto.Description;
        entity.IsActive = dto.IsActive;
        await _db.SaveChangesAsync();
        dto.Id = entity.Id;
        return new FunctionalDiagnosticTestTypeDto
        {
            Id = entity.Id, Code = entity.Code, Name = entity.Name,
            Description = entity.Description, IsActive = entity.IsActive
        };
    }

    public async Task<bool> DeleteTestTypeAsync(Guid id)
    {
        var e = await _db.Set<FunctionalDiagnosticTestType>()
            .FirstOrDefaultAsync(t => t.Id == id);
        if (e == null) return false;
        e.IsDeleted = true;
        e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    // ─── Template ─────────────────────────────────────────────────────────────

    public async Task<List<FunctionalDiagnosticTemplateDto>> GetTemplatesAsync(
        Guid? testTypeId, string? keyword)
    {
        var q = _db.Set<FunctionalDiagnosticTemplate>()
            .Include(t => t.TestType)
            .Where(t => !t.IsDeleted);
        if (testTypeId.HasValue)
            q = q.Where(t => t.TestTypeId == testTypeId.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(t => t.Name.Contains(keyword) || t.Code.Contains(keyword));
        var list = await q.OrderBy(t => t.Code).ToBoundedListAsync("FunctionalDiagnosticCatalogService.GetTemplatesAsync");
        return list.Select(t => new FunctionalDiagnosticTemplateDto
        {
            Id = t.Id, Code = t.Code, Name = t.Name,
            TestTypeId = t.TestTypeId, TestTypeName = t.TestType?.Name,
            Content = t.Content, IsActive = t.IsActive
        }).ToList();
    }

    public async Task<FunctionalDiagnosticTemplateDto> SaveTemplateAsync(
        SaveFunctionalDiagnosticTemplateDto dto, string? userId)
    {
        if (string.IsNullOrWhiteSpace(dto.Code) || string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Mã và tên mẫu kết quả là bắt buộc");
        // Unknown TestTypeId used to surface as a raw FK 500.
        if (!await _db.Set<FunctionalDiagnosticTestType>().AnyAsync(t => t.Id == dto.TestTypeId && !t.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy loại thăm dò chức năng của mẫu");
        FunctionalDiagnosticTemplate entity;
        if (dto.Id == Guid.Empty)
        {
            entity = new FunctionalDiagnosticTemplate
            {
                CreatedAt = DateTime.UtcNow, CreatedBy = userId
            };
            _db.Set<FunctionalDiagnosticTemplate>().Add(entity);
        }
        else
        {
            entity = await _db.Set<FunctionalDiagnosticTemplate>()
                .FirstOrDefaultAsync(t => t.Id == dto.Id)
                ?? throw new KeyNotFoundException("Không tìm thấy mẫu kết quả");
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        entity.Code = dto.Code;
        entity.Name = dto.Name;
        entity.TestTypeId = dto.TestTypeId;
        entity.Content = dto.Content;
        entity.IsActive = dto.IsActive;
        await _db.SaveChangesAsync();

        var typeName = await _db.Set<FunctionalDiagnosticTestType>()
            .Where(t => t.Id == entity.TestTypeId)
            .Select(t => t.Name)
            .FirstOrDefaultAsync();
        return new FunctionalDiagnosticTemplateDto
        {
            Id = entity.Id, Code = entity.Code, Name = entity.Name,
            TestTypeId = entity.TestTypeId, TestTypeName = typeName,
            Content = entity.Content, IsActive = entity.IsActive
        };
    }

    public async Task<bool> DeleteTemplateAsync(Guid id)
    {
        var e = await _db.Set<FunctionalDiagnosticTemplate>()
            .FirstOrDefaultAsync(t => t.Id == id);
        if (e == null) return false;
        e.IsDeleted = true;
        e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }
}
