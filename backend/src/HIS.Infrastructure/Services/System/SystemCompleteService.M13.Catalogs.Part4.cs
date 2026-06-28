using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

public partial class SystemCompleteService
{
    // 13.18 Dong bo danh muc BHXH
    public async Task<SyncResultDto> SyncBHXHMedicinesAsync()
    {
        _logger.LogWarning("SyncBHXHMedicinesAsync: External integration not implemented");
        return new SyncResultDto
        {
            IsSuccess = false,
            TotalRecords = 0,
            InsertedRecords = 0,
            UpdatedRecords = 0,
            FailedRecords = 0,
            Errors = new List<string> { "BHXH integration not configured" },
            SyncDate = DateTime.UtcNow
        };
    }

    public async Task<SyncResultDto> SyncBHXHServicesAsync()
    {
        _logger.LogWarning("SyncBHXHServicesAsync: External integration not implemented");
        return new SyncResultDto
        {
            IsSuccess = false,
            TotalRecords = 0,
            InsertedRecords = 0,
            UpdatedRecords = 0,
            FailedRecords = 0,
            Errors = new List<string> { "BHXH integration not configured" },
            SyncDate = DateTime.UtcNow
        };
    }

    public async Task<SyncResultDto> SyncBHXHICD10Async()
    {
        _logger.LogWarning("SyncBHXHICD10Async: External integration not implemented");
        return new SyncResultDto
        {
            IsSuccess = false,
            TotalRecords = 0,
            InsertedRecords = 0,
            UpdatedRecords = 0,
            FailedRecords = 0,
            Errors = new List<string> { "BHXH integration not configured" },
            SyncDate = DateTime.UtcNow
        };
    }

    public async Task<DateTime?> GetLastSyncDateAsync(string syncType)
    {
        return null;
    }

    // 13.20 Nghe nghiep (Occupation)
    public async Task<List<OccupationCatalogDto>> GetOccupationsAsync(string? keyword = null, bool? isActive = null)
    {
        var query = _context.Occupations.AsQueryable();
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(o => o.Code.Contains(keyword) || o.Name.Contains(keyword));
        if (isActive.HasValue)
            query = query.Where(o => o.IsActive == isActive.Value);

        return await query.OrderBy(o => o.SortOrder).ThenBy(o => o.Name)
            .Select(o => new OccupationCatalogDto
            {
                Id = o.Id,
                Code = o.Code,
                Name = o.Name,
                SortOrder = o.SortOrder,
                IsActive = o.IsActive,
            }).ToBoundedListAsync("SystemCompleteService.GetOccupationsAsync");
    }

    public async Task<OccupationCatalogDto> SaveOccupationAsync(OccupationCatalogDto dto)
    {
        Occupation entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _context.Occupations.FindAsync(dto.Id);
            if (entity == null) throw new KeyNotFoundException($"Occupation {dto.Id} not found");
        }
        else
        {
            entity = new Occupation { Id = Guid.NewGuid() };
            _context.Occupations.Add(entity);
        }
        entity.Code = dto.Code;
        entity.Name = dto.Name;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteOccupationAsync(Guid occupationId)
    {
        var entity = await _context.Occupations.FindAsync(occupationId);
        if (entity == null) return false;
        _context.Occupations.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    // 13.21 Gioi tinh (Gender)
    public async Task<List<GenderCatalogDto>> GetGendersAsync(string? keyword = null, bool? isActive = null)
    {
        var query = _context.Genders.AsQueryable();
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(g => g.Code.Contains(keyword) || g.Name.Contains(keyword));
        if (isActive.HasValue)
            query = query.Where(g => g.IsActive == isActive.Value);

        return await query.OrderBy(g => g.SortOrder).ThenBy(g => g.Name)
            .Select(g => new GenderCatalogDto
            {
                Id = g.Id,
                Code = g.Code,
                Name = g.Name,
                SortOrder = g.SortOrder,
                IsActive = g.IsActive,
            }).ToBoundedListAsync("SystemCompleteService.GetGendersAsync");
    }

    public async Task<GenderCatalogDto> SaveGenderAsync(GenderCatalogDto dto)
    {
        Gender entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _context.Genders.FindAsync(dto.Id);
            if (entity == null) throw new KeyNotFoundException($"Gender {dto.Id} not found");
        }
        else
        {
            entity = new Gender { Id = Guid.NewGuid() };
            _context.Genders.Add(entity);
        }
        entity.Code = dto.Code;
        entity.Name = dto.Name;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteGenderAsync(Guid genderId)
    {
        var entity = await _context.Genders.FindAsync(genderId);
        if (entity == null) return false;
        _context.Genders.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    // 13.22 Don vi hanh chinh (Administrative Division)
    public async Task<List<AdministrativeDivisionCatalogDto>> GetAdministrativeDivisionsAsync(string? keyword = null, int? level = null, string? parentCode = null, bool? isActive = null)
    {
        var query = _context.AdministrativeDivisions.AsQueryable();
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(d => d.Code.Contains(keyword) || d.Name.Contains(keyword));
        if (level.HasValue)
            query = query.Where(d => d.Level == level.Value);
        if (!string.IsNullOrEmpty(parentCode))
            query = query.Where(d => d.ParentCode == parentCode);
        if (isActive.HasValue)
            query = query.Where(d => d.IsActive == isActive.Value);

        var divisions = await query.OrderBy(d => d.Level).ThenBy(d => d.SortOrder).ThenBy(d => d.Name).ToListAsync();

        // Resolve parent names for Level 2 and 3
        var parentCodes = divisions.Where(d => d.ParentCode != null).Select(d => d.ParentCode).Distinct().ToList();
        var parentMap = await _context.AdministrativeDivisions
            .Where(d => parentCodes.Contains(d.Code))
            .ToDictionaryAsync(d => d.Code, d => d.Name);

        return divisions.Select(d => new AdministrativeDivisionCatalogDto
        {
            Id = d.Id,
            Code = d.Code,
            Name = d.Name,
            Level = d.Level,
            ParentCode = d.ParentCode,
            ParentName = d.ParentCode != null && parentMap.ContainsKey(d.ParentCode) ? parentMap[d.ParentCode] : null,
            SortOrder = d.SortOrder,
            IsActive = d.IsActive,
        }).ToList();
    }

    public async Task<AdministrativeDivisionCatalogDto> SaveAdministrativeDivisionAsync(AdministrativeDivisionCatalogDto dto)
    {
        AdministrativeDivision entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _context.AdministrativeDivisions.FindAsync(dto.Id);
            if (entity == null) throw new KeyNotFoundException($"AdministrativeDivision {dto.Id} not found");
        }
        else
        {
            entity = new AdministrativeDivision { Id = Guid.NewGuid() };
            _context.AdministrativeDivisions.Add(entity);
        }
        entity.Code = dto.Code;
        entity.Name = dto.Name;
        entity.Level = dto.Level;
        entity.ParentCode = dto.ParentCode;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteAdministrativeDivisionAsync(Guid divisionId)
    {
        var entity = await _context.AdministrativeDivisions.FindAsync(divisionId);
        if (entity == null) return false;
        _context.AdministrativeDivisions.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    // 13.23 Quoc gia (Country)
    public async Task<List<CountryCatalogDto>> GetCountriesAsync(string? keyword = null, bool? isActive = null)
    {
        var query = _context.Countries.AsQueryable();
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(c => c.Code.Contains(keyword) || c.Name.Contains(keyword) || (c.NationalityName != null && c.NationalityName.Contains(keyword)));
        if (isActive.HasValue)
            query = query.Where(c => c.IsActive == isActive.Value);

        return await query.OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(c => new CountryCatalogDto
            {
                Id = c.Id,
                Code = c.Code,
                Name = c.Name,
                NationalityName = c.NationalityName,
                SortOrder = c.SortOrder,
                IsActive = c.IsActive,
            }).ToBoundedListAsync("SystemCompleteService.GetCountriesAsync");
    }

    public async Task<CountryCatalogDto> SaveCountryAsync(CountryCatalogDto dto)
    {
        Country entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _context.Countries.FindAsync(dto.Id);
            if (entity == null) throw new KeyNotFoundException($"Country {dto.Id} not found");
        }
        else
        {
            entity = new Country { Id = Guid.NewGuid() };
            _context.Countries.Add(entity);
        }
        entity.Code = dto.Code;
        entity.Name = dto.Name;
        entity.NationalityName = dto.NationalityName;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteCountryAsync(Guid countryId)
    {
        var entity = await _context.Countries.FindAsync(countryId);
        if (entity == null) return false;
        _context.Countries.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    // 13.24 Co so KCB (Healthcare Facility)
    public async Task<List<HealthcareFacilityCatalogDto>> GetHealthcareFacilitiesAsync(string? keyword = null, string? level = null, string? provinceCode = null, bool? isActive = null)
    {
        var query = _context.HealthcareFacilities.AsQueryable();
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(f => f.Code.Contains(keyword) || f.Name.Contains(keyword));
        if (!string.IsNullOrEmpty(level))
            query = query.Where(f => f.Level == level);
        if (!string.IsNullOrEmpty(provinceCode))
            query = query.Where(f => f.ProvinceCode == provinceCode);
        if (isActive.HasValue)
            query = query.Where(f => f.IsActive == isActive.Value);

        return await query.OrderBy(f => f.SortOrder).ThenBy(f => f.Name)
            .Select(f => new HealthcareFacilityCatalogDto
            {
                Id = f.Id,
                Code = f.Code,
                Name = f.Name,
                Address = f.Address,
                Level = f.Level,
                ProvinceCode = f.ProvinceCode,
                SortOrder = f.SortOrder,
                IsActive = f.IsActive,
            }).ToBoundedListAsync("SystemCompleteService.GetHealthcareFacilitiesAsync");
    }

    public async Task<HealthcareFacilityCatalogDto> SaveHealthcareFacilityAsync(HealthcareFacilityCatalogDto dto)
    {
        HealthcareFacility entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _context.HealthcareFacilities.FindAsync(dto.Id);
            if (entity == null) throw new KeyNotFoundException($"HealthcareFacility {dto.Id} not found");
        }
        else
        {
            entity = new HealthcareFacility { Id = Guid.NewGuid() };
            _context.HealthcareFacilities.Add(entity);
        }
        entity.Code = dto.Code;
        entity.Name = dto.Name;
        entity.Address = dto.Address;
        entity.Level = dto.Level;
        entity.ProvinceCode = dto.ProvinceCode;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteHealthcareFacilityAsync(Guid facilityId)
    {
        var entity = await _context.HealthcareFacilities.FindAsync(facilityId);
        if (entity == null) return false;
        _context.HealthcareFacilities.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

}
