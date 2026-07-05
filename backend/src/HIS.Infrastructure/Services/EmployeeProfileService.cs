using HIS.Application.Common;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// HR Employee Profile — logic tách khỏi EmployeeProfileController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape giữ nguyên, copy nguyên văn từ
/// controller cũ; return Ok(x) → ServiceOutcome.Ok(x), return Ok() → ServiceOutcome.OkEmpty().
/// </summary>
public class EmployeeProfileService : IEmployeeProfileService
{
    private readonly HISDbContext _db;
    public EmployeeProfileService(HISDbContext db) { _db = db; }

    // ===== Assets =====
    public async Task<ServiceOutcome> ListAssetsAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeAssets.Where(a => a.UserId == userId).ToListAsync());

    public async Task<ServiceOutcome> SaveAssetAsync(Guid userId, EmployeeAsset dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeAssets.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeAssets.Update(dto);
        else { dto.Id = Guid.NewGuid(); dto.IsDeleted = false; _db.EmployeeAssets.Add(dto); }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(dto);
    }
    public async Task<ServiceOutcome> DeleteAssetAsync(Guid id)
    {
        var e = await _db.EmployeeAssets.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return ServiceOutcome.OkEmpty();
    }

    // ===== Allowances =====
    public async Task<ServiceOutcome> ListAllowancesAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeAllowances.Where(a => a.UserId == userId).ToListAsync());

    public async Task<ServiceOutcome> SaveAllowanceAsync(Guid userId, EmployeeAllowance dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeAllowances.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeAllowances.Update(dto);
        else { dto.Id = Guid.NewGuid(); dto.IsDeleted = false; _db.EmployeeAllowances.Add(dto); }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(dto);
    }
    public async Task<ServiceOutcome> DeleteAllowanceAsync(Guid id)
    {
        var e = await _db.EmployeeAllowances.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return ServiceOutcome.OkEmpty();
    }

    // ===== Career History =====
    public async Task<ServiceOutcome> ListCareerAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeCareerHistories
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.TransferDate).ToListAsync());

    public async Task<ServiceOutcome> SaveCareerAsync(Guid userId, EmployeeCareerHistory dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeCareerHistories.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeCareerHistories.Update(dto);
        else { dto.Id = Guid.NewGuid(); dto.IsDeleted = false; _db.EmployeeCareerHistories.Add(dto); }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(dto);
    }
    public async Task<ServiceOutcome> DeleteCareerAsync(Guid id)
    {
        var e = await _db.EmployeeCareerHistories.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return ServiceOutcome.OkEmpty();
    }

    // ===== Education =====
    public async Task<ServiceOutcome> ListEducationAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeEducations.Where(a => a.UserId == userId).ToListAsync());

    public async Task<ServiceOutcome> SaveEducationAsync(Guid userId, EmployeeEducation dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeEducations.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeEducations.Update(dto);
        else { dto.Id = Guid.NewGuid(); dto.IsDeleted = false; _db.EmployeeEducations.Add(dto); }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(dto);
    }
    public async Task<ServiceOutcome> DeleteEducationAsync(Guid id)
    {
        var e = await _db.EmployeeEducations.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return ServiceOutcome.OkEmpty();
    }

    // ===== Family =====
    public async Task<ServiceOutcome> ListFamilyAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeFamilies.Where(a => a.UserId == userId).ToListAsync());

    public async Task<ServiceOutcome> SaveFamilyAsync(Guid userId, EmployeeFamily dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeFamilies.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeFamilies.Update(dto);
        else { dto.Id = Guid.NewGuid(); dto.IsDeleted = false; _db.EmployeeFamilies.Add(dto); }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(dto);
    }
    public async Task<ServiceOutcome> DeleteFamilyAsync(Guid id)
    {
        var e = await _db.EmployeeFamilies.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return ServiceOutcome.OkEmpty();
    }

    // ===== Rewards / Discipline =====
    public async Task<ServiceOutcome> ListRewardsAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeRewardDisciplines
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.DecisionDate).ToListAsync());

    public async Task<ServiceOutcome> SaveRewardAsync(Guid userId, EmployeeRewardDiscipline dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeRewardDisciplines.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeRewardDisciplines.Update(dto);
        else { dto.Id = Guid.NewGuid(); dto.IsDeleted = false; _db.EmployeeRewardDisciplines.Add(dto); }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(dto);
    }
    public async Task<ServiceOutcome> DeleteRewardAsync(Guid id)
    {
        var e = await _db.EmployeeRewardDisciplines.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return ServiceOutcome.OkEmpty();
    }

    // ===== Bank Accounts =====
    public async Task<ServiceOutcome> ListBanksAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeBankAccounts.Where(a => a.UserId == userId).ToListAsync());

    public async Task<ServiceOutcome> SaveBankAsync(Guid userId, EmployeeBankAccount dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeBankAccounts.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeBankAccounts.Update(dto);
        else { dto.Id = Guid.NewGuid(); dto.IsDeleted = false; _db.EmployeeBankAccounts.Add(dto); }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(dto);
    }
    public async Task<ServiceOutcome> DeleteBankAsync(Guid id)
    {
        var e = await _db.EmployeeBankAccounts.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return ServiceOutcome.OkEmpty();
    }

    // ===== Contracts =====
    public async Task<ServiceOutcome> ListContractsAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeContracts
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.StartDate).ToListAsync());

    public async Task<ServiceOutcome> SaveContractAsync(Guid userId, EmployeeContract dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeContracts.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeContracts.Update(dto);
        else { dto.Id = Guid.NewGuid(); dto.IsDeleted = false; _db.EmployeeContracts.Add(dto); }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(dto);
    }
    public async Task<ServiceOutcome> DeleteContractAsync(Guid id)
    {
        var e = await _db.EmployeeContracts.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return ServiceOutcome.OkEmpty();
    }

    // ===== Union Membership (Đoàn thể) =====
    public async Task<ServiceOutcome> ListUnionAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeUnionMemberships.Where(a => a.UserId == userId).ToListAsync());

    public async Task<ServiceOutcome> SaveUnionAsync(Guid userId, EmployeeUnionMembership dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeUnionMemberships.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeUnionMemberships.Update(dto);
        else { dto.Id = Guid.NewGuid(); dto.IsDeleted = false; _db.EmployeeUnionMemberships.Add(dto); }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(dto);
    }

    public async Task<ServiceOutcome> DeleteUnionAsync(Guid id)
    {
        var e = await _db.EmployeeUnionMemberships.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return ServiceOutcome.OkEmpty();
    }

    // ===== Insurance =====
    public async Task<ServiceOutcome> GetInsuranceAsync(Guid userId)
    {
        var info = await _db.EmployeeInsuranceInfos.FirstOrDefaultAsync(a => a.UserId == userId);
        return ServiceOutcome.Ok(info);
    }

    public async Task<ServiceOutcome> SaveInsuranceAsync(Guid userId, EmployeeInsuranceInfo dto)
    {
        var existing = await _db.EmployeeInsuranceInfos.FirstOrDefaultAsync(a => a.UserId == userId);
        if (existing != null)
        {
            existing.SocialInsuranceNumber = dto.SocialInsuranceNumber;
            existing.SocialInsuranceStartDate = dto.SocialInsuranceStartDate;
            existing.HealthInsuranceNumber = dto.HealthInsuranceNumber;
            existing.HealthInsuranceStartDate = dto.HealthInsuranceStartDate;
            existing.HealthInsuranceEndDate = dto.HealthInsuranceEndDate;
            existing.HealthInsuranceFacilityCode = dto.HealthInsuranceFacilityCode;
            existing.MonthlyEmployeeContribution = dto.MonthlyEmployeeContribution;
            existing.MonthlyEmployerContribution = dto.MonthlyEmployerContribution;
            existing.Note = dto.Note;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            dto.Id = Guid.NewGuid();
            dto.IsDeleted = false;
            dto.UserId = userId;
            dto.CreatedAt = DateTime.UtcNow;
            _db.EmployeeInsuranceInfos.Add(dto);
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }
}
