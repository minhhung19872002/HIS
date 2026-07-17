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
    // ============ Awards & Discipline ============

    public async Task<List<StaffAwardDto>> GetStaffAwardsAsync(Guid? staffId = null)
    {
        try
        {
            var query = _context.StaffAwards.Include(x => x.Staff).AsQueryable();
            if (staffId.HasValue) query = query.Where(x => x.StaffId == staffId);
            var list = await query.OrderByDescending(x => x.AwardDate).ToBoundedListAsync("MedicalHR.GetStaffAwards");
            return list.Select(e => new StaffAwardDto
            {
                Id = e.Id, StaffId = e.StaffId, StaffName = e.Staff?.FullName ?? "", StaffCode = e.Staff?.StaffCode ?? "",
                AwardType = e.AwardType, Title = e.Title, AwardDate = e.AwardDate,
                DecisionNumber = e.DecisionNumber ?? "", Description = e.Description ?? "", IssuedBy = e.IssuedBy ?? ""
            }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<StaffAwardDto>();
        }
    }

    public async Task<StaffAwardDto> SaveAwardAsync(SaveStaffAwardDto dto)
    {
        var entity = dto.Id.HasValue ? await _context.StaffAwards.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new StaffAward { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            _context.StaffAwards.Add(entity);
        }
        entity.StaffId = dto.StaffId; entity.AwardType = dto.AwardType; entity.Title = dto.Title;
        entity.AwardDate = dto.AwardDate; entity.DecisionNumber = dto.DecisionNumber;
        entity.Description = dto.Description; entity.IssuedBy = dto.IssuedBy; entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new StaffAwardDto
        {
            Id = entity.Id, StaffId = entity.StaffId, AwardType = entity.AwardType, Title = entity.Title,
            AwardDate = entity.AwardDate, DecisionNumber = entity.DecisionNumber ?? "",
            Description = entity.Description ?? "", IssuedBy = entity.IssuedBy ?? ""
        };
    }

    public async Task<List<StaffDisciplineDto>> GetStaffDisciplinesAsync(Guid? staffId = null)
    {
        try
        {
            var query = _context.StaffDisciplines.Include(x => x.Staff).AsQueryable();
            if (staffId.HasValue) query = query.Where(x => x.StaffId == staffId);
            var list = await query.OrderByDescending(x => x.DisciplineDate).ToBoundedListAsync("MedicalHR.GetStaffDisciplines");
            return list.Select(e => new StaffDisciplineDto
            {
                Id = e.Id, StaffId = e.StaffId, StaffName = e.Staff?.FullName ?? "", StaffCode = e.Staff?.StaffCode ?? "",
                DisciplineType = e.DisciplineType, Title = e.Title, DisciplineDate = e.DisciplineDate,
                ExpiryDate = e.ExpiryDate, DecisionNumber = e.DecisionNumber ?? "", Description = e.Description ?? "",
                IsExpired = e.ExpiryDate.HasValue && e.ExpiryDate.Value < DateTime.Today
            }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<StaffDisciplineDto>();
        }
    }

    public async Task<StaffDisciplineDto> SaveDisciplineAsync(SaveStaffDisciplineDto dto)
    {
        var entity = dto.Id.HasValue ? await _context.StaffDisciplines.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new StaffDiscipline { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            _context.StaffDisciplines.Add(entity);
        }
        entity.StaffId = dto.StaffId; entity.DisciplineType = dto.DisciplineType; entity.Title = dto.Title;
        entity.DisciplineDate = dto.DisciplineDate; entity.ExpiryDate = dto.ExpiryDate;
        entity.DecisionNumber = dto.DecisionNumber; entity.Description = dto.Description; entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new StaffDisciplineDto
        {
            Id = entity.Id, StaffId = entity.StaffId, DisciplineType = entity.DisciplineType, Title = entity.Title,
            DisciplineDate = entity.DisciplineDate, ExpiryDate = entity.ExpiryDate,
            DecisionNumber = entity.DecisionNumber ?? "", Description = entity.Description ?? "",
            IsExpired = entity.ExpiryDate.HasValue && entity.ExpiryDate.Value < DateTime.Today
        };
    }
}
