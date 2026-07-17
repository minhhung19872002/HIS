using HIS.Application.DTOs.MedicalHR;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

public partial class MedicalHRServiceImpl
{
    // ============ HR Catalogs ============

    public async Task<List<HRCatalogDto>> GetCatalogsAsync(string? catalogType = null)
    {
        try
        {
            var query = _context.HRCatalogs.AsQueryable();
            if (!string.IsNullOrEmpty(catalogType)) query = query.Where(x => x.CatalogType == catalogType);
            var list = await query.OrderBy(x => x.CatalogType).ThenBy(x => x.SortOrder).ThenBy(x => x.Name).ToListAsync();
            return list.Select(e => new HRCatalogDto
            {
                Id = e.Id, CatalogType = e.CatalogType, Code = e.Code, Name = e.Name,
                Description = e.Description ?? "", SortOrder = e.SortOrder, IsActive = e.IsActive
            }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<HRCatalogDto>();
        }
    }

    public async Task<HRCatalogDto> SaveCatalogAsync(SaveHRCatalogDto dto)
    {
        var entity = dto.Id.HasValue ? await _context.HRCatalogs.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new HRCatalog { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            _context.HRCatalogs.Add(entity);
        }
        entity.CatalogType = dto.CatalogType; entity.Code = dto.Code; entity.Name = dto.Name;
        entity.Description = dto.Description; entity.SortOrder = dto.SortOrder; entity.IsActive = dto.IsActive;
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new HRCatalogDto { Id = entity.Id, CatalogType = entity.CatalogType, Code = entity.Code, Name = entity.Name, Description = entity.Description ?? "", SortOrder = entity.SortOrder, IsActive = entity.IsActive };
    }

    public async Task<bool> DeleteCatalogAsync(Guid id)
    {
        var entity = await _context.HRCatalogs.FindAsync(id);
        if (entity == null) return false;
        _context.HRCatalogs.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    // ============ Staff Contracts ============

    public async Task<List<StaffContractDto>> GetStaffContractsAsync(Guid? staffId = null, string? contractType = null)
    {
        try
        {
            var query = _context.StaffContracts.Include(x => x.Staff).AsQueryable();
            if (staffId.HasValue) query = query.Where(x => x.StaffId == staffId);
            if (!string.IsNullOrEmpty(contractType)) query = query.Where(x => x.ContractType == contractType);
            var list = await query.OrderByDescending(x => x.StartDate).ToBoundedListAsync("MedicalHR.GetStaffContracts");
            return list.Select(MapToContractDto).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<StaffContractDto>();
        }
    }

    public async Task<StaffContractDto> SaveContractAsync(SaveStaffContractDto dto)
    {
        var entity = dto.Id.HasValue ? await _context.StaffContracts.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new StaffContract { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            _context.StaffContracts.Add(entity);
        }
        entity.StaffId = dto.StaffId; entity.ContractType = dto.ContractType; entity.ContractNumber = dto.ContractNumber;
        entity.StartDate = dto.StartDate; entity.EndDate = dto.EndDate; entity.Terms = dto.Terms; entity.Notes = dto.Notes;
        entity.Status = entity.EndDate.HasValue && entity.EndDate.Value < DateTime.Today ? 1 : 0;
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return (await GetStaffContractsAsync(entity.StaffId)).FirstOrDefault(x => x.Id == entity.Id)!;
    }

    public async Task<List<StaffContractDto>> GetExpiringContractsAsync(int daysAhead = 90)
    {
        try
        {
            var expiryDate = DateTime.Today.AddDays(daysAhead);
            var list = await _context.StaffContracts.Include(x => x.Staff)
                .Where(x => x.Status == 0 && x.EndDate != null && x.EndDate <= expiryDate && x.EndDate >= DateTime.Today)
                .OrderBy(x => x.EndDate).ToBoundedListAsync("MedicalHR.GetExpiringContracts");
            return list.Select(MapToContractDto).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<StaffContractDto>();
        }
    }

    private static StaffContractDto MapToContractDto(StaffContract e)
    {
        var statusNames = new[] { "Đang hiệu lực", "Đã hết hạn", "Đã chấm dứt", "Đã gia hạn" };
        return new StaffContractDto
        {
            Id = e.Id, StaffId = e.StaffId, StaffName = e.Staff?.FullName ?? "", StaffCode = e.Staff?.StaffCode ?? "",
            ContractType = e.ContractType, ContractNumber = e.ContractNumber, StartDate = e.StartDate, EndDate = e.EndDate,
            Terms = e.Terms ?? "", Status = e.Status, StatusName = e.Status >= 0 && e.Status < statusNames.Length ? statusNames[e.Status] : "Không rõ",
            Notes = e.Notes ?? "", DaysUntilExpiry = e.EndDate.HasValue ? (int)(e.EndDate.Value - DateTime.Today).TotalDays : null
        };
    }
}
