using HIS.Application.DTOs.Abbreviation;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

public class AbbreviationService : IAbbreviationService
{
    private readonly HISDbContext _db;
    public AbbreviationService(HISDbContext db) { _db = db; }

    public async Task<AbbreviationDto> SaveAsync(SaveAbbreviationDto dto, Guid userId)
    {
        Abbreviation entity;
        if (dto.Id.HasValue)
        {
            entity = await _db.Abbreviations.FirstOrDefaultAsync(a => a.Id == dto.Id.Value)
                ?? throw new KeyNotFoundException();
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId.ToString();
        }
        else
        {
            entity = new Abbreviation
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId.ToString()
            };
            _db.Abbreviations.Add(entity);
        }
        entity.Code = dto.Code.Trim().ToLower();
        entity.Expansion = dto.Expansion;
        entity.Scope = dto.Scope;
        entity.ScopeKey = dto.ScopeKey;
        entity.OwnerUserId = dto.OwnerOnly ? userId : null;
        entity.IsActive = true;
        entity.SortOrder = dto.SortOrder;
        await _db.SaveChangesAsync();
        return Map(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId)
    {
        var entity = await _db.Abbreviations.FirstOrDefaultAsync(a => a.Id == id)
            ?? throw new KeyNotFoundException();
        if (entity.OwnerUserId.HasValue && entity.OwnerUserId != userId)
            throw new UnauthorizedAccessException("Chỉ owner hoặc admin mới xoá được");
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<AbbreviationDto>> SearchAsync(int? scope, string? scopeKey, Guid userId)
    {
        var q = _db.Abbreviations.Where(a => a.IsActive);
        q = q.Where(a => a.OwnerUserId == null || a.OwnerUserId == userId);
        if (scope.HasValue) q = q.Where(a => a.Scope == scope.Value || a.Scope == 0);
        if (!string.IsNullOrWhiteSpace(scopeKey))
            q = q.Where(a => a.ScopeKey == null || a.ScopeKey == scopeKey);

        var list = await q
            .OrderBy(a => a.SortOrder)
            .ThenByDescending(a => a.UsageCount)
            .ThenBy(a => a.Code)
            .Take(500)
            .ToListAsync();
        return list.Select(Map).ToList();
    }

    public async Task<AbbreviationDto> IncrementUsageAsync(Guid id)
    {
        var e = await _db.Abbreviations.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException();
        e.UsageCount++;
        await _db.SaveChangesAsync();
        return Map(e);
    }

    private static AbbreviationDto Map(Abbreviation a) => new()
    {
        Id = a.Id,
        Code = a.Code,
        Expansion = a.Expansion,
        Scope = a.Scope,
        ScopeName = a.Scope switch
        {
            1 => "Ghi chú thuốc",
            2 => "Chẩn đoán/Triệu chứng",
            3 => "Kết quả XN",
            4 => "CĐHA",
            5 => "Ghi chú hẹn",
            _ => "Chung"
        },
        ScopeKey = a.ScopeKey,
        OwnerUserId = a.OwnerUserId,
        IsActive = a.IsActive,
        SortOrder = a.SortOrder,
        UsageCount = a.UsageCount
    };
}
