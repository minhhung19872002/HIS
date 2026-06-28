using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

public partial class SystemCompleteService
{

    public async Task<List<HospitalBranchDto>> GetBranchesAsync(string? keyword = null, bool? isActive = null)
    {
        try
        {
            var query = _context.HospitalBranches
                .Where(b => !b.IsDeleted);

            if (!string.IsNullOrEmpty(keyword))
                query = query.Where(b => b.BranchCode.Contains(keyword) || b.BranchName.Contains(keyword));

            if (isActive.HasValue)
                query = query.Where(b => b.IsActive == isActive.Value);

            var branches = await query
                .OrderBy(b => b.BranchCode)
                .ToListAsync();

            var allBranches = branches.ToList();
            return allBranches.Select(b => new HospitalBranchDto
            {
                Id = b.Id,
                BranchCode = b.BranchCode,
                BranchName = b.BranchName,
                Address = b.Address,
                PhoneNumber = b.PhoneNumber,
                Email = b.Email,
                ParentBranchId = b.ParentBranchId,
                ParentBranchName = b.ParentBranchId.HasValue
                    ? allBranches.FirstOrDefault(p => p.Id == b.ParentBranchId)?.BranchName
                    : null,
                IsActive = b.IsActive,
                IsHeadquarters = b.IsHeadquarters,
                ChildCount = allBranches.Count(c => c.ParentBranchId == b.Id),
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "HospitalBranches table may not exist, returning empty list");
            return new List<HospitalBranchDto>();
        }
    }

    public async Task<HospitalBranchDto> SaveBranchAsync(HospitalBranchDto dto)
    {
        HospitalBranch entity;
        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            entity = await _context.HospitalBranches.FindAsync(dto.Id.Value)
                ?? throw new KeyNotFoundException($"Branch {dto.Id} not found");
            entity.BranchCode = dto.BranchCode;
            entity.BranchName = dto.BranchName;
            entity.Address = dto.Address;
            entity.PhoneNumber = dto.PhoneNumber;
            entity.Email = dto.Email;
            entity.ParentBranchId = dto.ParentBranchId;
            entity.IsActive = dto.IsActive;
            entity.IsHeadquarters = dto.IsHeadquarters;
            _context.HospitalBranches.Update(entity);
        }
        else
        {
            entity = new HospitalBranch
            {
                Id = Guid.NewGuid(),
                BranchCode = dto.BranchCode,
                BranchName = dto.BranchName,
                Address = dto.Address,
                PhoneNumber = dto.PhoneNumber,
                Email = dto.Email,
                ParentBranchId = dto.ParentBranchId,
                IsActive = dto.IsActive,
                IsHeadquarters = dto.IsHeadquarters,
            };
            await _context.HospitalBranches.AddAsync(entity);
        }
        await _context.SaveChangesAsync();

        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteBranchAsync(Guid branchId)
    {
        var entity = await _context.HospitalBranches.FindAsync(branchId);
        if (entity == null) return false;

        // Soft delete
        entity.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

}
