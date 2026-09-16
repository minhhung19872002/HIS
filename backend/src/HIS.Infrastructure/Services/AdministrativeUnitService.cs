using HIS.Application.DTOs.AdministrativeUnit;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// F10.1 #94: CRUD danh mục địa danh hành chính — Tỉnh / Huyện / Xã.
/// Soft-delete via IsDeleted. CreatedBy/UpdatedBy = string (NVARCHAR, không cần ValueConverter).
/// </summary>
public class AdministrativeUnitService : IAdministrativeUnitService
{
    private readonly HISDbContext _db;

    public AdministrativeUnitService(HISDbContext db) => _db = db;

    // ─── Province ────────────────────────────────────────────────────────────

    public async Task<List<ProvinceDto>> GetProvincesAsync(string? keyword)
    {
        var q = _db.Provinces.Where(p => !p.IsDeleted);
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(p => p.Name.Contains(keyword) || p.Code.Contains(keyword));
        return await q.OrderBy(p => p.Code)
            .Select(p => new ProvinceDto
            {
                Id = p.Id, Code = p.Code, Name = p.Name, IsActive = p.IsActive
            }).ToBoundedListAsync("AdministrativeUnitService.GetProvincesAsync");
    }

    public async Task<ProvinceDto> SaveProvinceAsync(ProvinceDto dto, string? userId)
    {
        // QA-R4: `{}` used to create a blank province; an unknown Id threw (500) instead of 404.
        var (code, name) = CatalogGuard.RequireCodeName(dto.Code, dto.Name, "tỉnh/thành phố");
        if (await _db.Provinces.AnyAsync(p => !p.IsDeleted && p.Id != dto.Id && p.Code == code))
            throw CatalogGuard.Duplicate(code, "danh mục tỉnh/thành phố");
        Province entity;
        if (dto.Id == Guid.Empty)
        {
            entity = new Province { CreatedAt = DateTime.UtcNow, CreatedBy = userId };
            _db.Provinces.Add(entity);
        }
        else
        {
            entity = await _db.Provinces.FirstOrDefaultAsync(p => p.Id == dto.Id && !p.IsDeleted)
                ?? throw CatalogGuard.NotFound("tỉnh/thành phố");
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        entity.Code = code;
        entity.Name = name;
        entity.IsActive = dto.IsActive;
        await _db.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteProvinceAsync(Guid id)
    {
        var e = await _db.Provinces.FirstOrDefaultAsync(p => p.Id == id);
        if (e == null) return false;
        // Deleting a province silently orphaned its districts/wards (still listed under a deleted parent).
        if (await _db.Districts.AnyAsync(d => d.ProvinceId == id && !d.IsDeleted))
            throw new InvalidOperationException("Tỉnh/thành phố còn quận/huyện trực thuộc — xóa quận/huyện trước.");
        e.IsDeleted = true;
        e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    // ─── District ────────────────────────────────────────────────────────────

    public async Task<List<DistrictDto>> GetDistrictsAsync(Guid? provinceId, string? keyword)
    {
        var q = _db.Districts.Include(d => d.Province).Where(d => !d.IsDeleted);
        if (provinceId.HasValue)
            q = q.Where(d => d.ProvinceId == provinceId.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(d => d.Name.Contains(keyword) || d.Code.Contains(keyword));
        return await q.OrderBy(d => d.Code)
            .Select(d => new DistrictDto
            {
                Id = d.Id, Code = d.Code, Name = d.Name,
                ProvinceId = d.ProvinceId, ProvinceName = d.Province.Name,
                IsActive = d.IsActive
            }).ToBoundedListAsync("AdministrativeUnitService.GetDistrictsAsync");
    }

    public async Task<DistrictDto> SaveDistrictAsync(DistrictDto dto, string? userId)
    {
        var (code, name) = CatalogGuard.RequireCodeName(dto.Code, dto.Name, "quận/huyện");
        // A zero/unknown ProvinceId hit the FK and surfaced as a 500.
        if (!await _db.Provinces.AnyAsync(p => p.Id == dto.ProvinceId && !p.IsDeleted))
            throw CatalogGuard.NotFound("tỉnh/thành phố của quận/huyện");
        if (await _db.Districts.AnyAsync(d => !d.IsDeleted && d.Id != dto.Id && d.Code == code))
            throw CatalogGuard.Duplicate(code, "danh mục quận/huyện");
        District entity;
        if (dto.Id == Guid.Empty)
        {
            entity = new District { CreatedAt = DateTime.UtcNow, CreatedBy = userId };
            _db.Districts.Add(entity);
        }
        else
        {
            entity = await _db.Districts.FirstOrDefaultAsync(d => d.Id == dto.Id && !d.IsDeleted)
                ?? throw CatalogGuard.NotFound("quận/huyện");
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        entity.Code = code;
        entity.Name = name;
        entity.ProvinceId = dto.ProvinceId;
        entity.IsActive = dto.IsActive;
        await _db.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteDistrictAsync(Guid id)
    {
        var e = await _db.Districts.FirstOrDefaultAsync(d => d.Id == id);
        if (e == null) return false;
        if (await _db.Wards.AnyAsync(w => w.DistrictId == id && !w.IsDeleted))
            throw new InvalidOperationException("Quận/huyện còn phường/xã trực thuộc — xóa phường/xã trước.");
        e.IsDeleted = true;
        e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    // ─── Ward ────────────────────────────────────────────────────────────────

    public async Task<List<WardDto>> GetWardsAsync(Guid? districtId, string? keyword)
    {
        var q = _db.Wards.Include(w => w.District).Where(w => !w.IsDeleted);
        if (districtId.HasValue)
            q = q.Where(w => w.DistrictId == districtId.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(w => w.Name.Contains(keyword) || w.Code.Contains(keyword));
        return await q.OrderBy(w => w.Code)
            .Select(w => new WardDto
            {
                Id = w.Id, Code = w.Code, Name = w.Name,
                DistrictId = w.DistrictId, DistrictName = w.District.Name,
                IsActive = w.IsActive
            }).ToBoundedListAsync("AdministrativeUnitService.GetWardsAsync");
    }

    public async Task<WardDto> SaveWardAsync(WardDto dto, string? userId)
    {
        var (code, name) = CatalogGuard.RequireCodeName(dto.Code, dto.Name, "phường/xã");
        if (!await _db.Districts.AnyAsync(d => d.Id == dto.DistrictId && !d.IsDeleted))
            throw CatalogGuard.NotFound("quận/huyện của phường/xã");
        if (await _db.Wards.AnyAsync(w => !w.IsDeleted && w.Id != dto.Id && w.Code == code))
            throw CatalogGuard.Duplicate(code, "danh mục phường/xã");
        Ward entity;
        if (dto.Id == Guid.Empty)
        {
            entity = new Ward { CreatedAt = DateTime.UtcNow, CreatedBy = userId };
            _db.Wards.Add(entity);
        }
        else
        {
            entity = await _db.Wards.FirstOrDefaultAsync(w => w.Id == dto.Id && !w.IsDeleted)
                ?? throw CatalogGuard.NotFound("phường/xã");
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        entity.Code = code;
        entity.Name = name;
        entity.DistrictId = dto.DistrictId;
        entity.IsActive = dto.IsActive;
        await _db.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteWardAsync(Guid id)
    {
        var e = await _db.Wards.FirstOrDefaultAsync(w => w.Id == id);
        if (e == null) return false;
        e.IsDeleted = true;
        e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }
}
