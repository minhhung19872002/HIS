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

    /// <summary>
    /// Upsert shared by the 8 profile tabs. The old <c>Update(dto)</c> replaced the whole row with the body:
    /// CreatedAt/CreatedBy were wiped on every edit, and posting another employee's record id under a
    /// different userId silently moved that record to the other employee.
    /// </summary>
    private async Task<ServiceOutcome> UpsertAsync<T>(DbSet<T> set, Guid userId, T dto) where T : BaseEntity
    {
        var existing = dto.Id == Guid.Empty ? null : await set.FirstOrDefaultAsync(e => e.Id == dto.Id);
        if (existing == null)
        {
            dto.Id = Guid.NewGuid();
            dto.IsDeleted = false;
            dto.UpdatedAt = null; dto.UpdatedBy = null;
            set.Add(dto);
            await _db.SaveChangesAsync();
            return ServiceOutcome.Ok(dto);
        }
        if (!Equals(_db.Entry(existing).Property("UserId").CurrentValue, userId))
            return ServiceOutcome.NotFound("Không tìm thấy bản ghi của nhân viên này");

        var entry = _db.Entry(existing);
        var createdAt = existing.CreatedAt; var createdBy = existing.CreatedBy;
        entry.CurrentValues.SetValues(dto);
        existing.Id = dto.Id; existing.CreatedAt = createdAt; existing.CreatedBy = createdBy;
        existing.IsDeleted = false;
        entry.Property("UserId").CurrentValue = userId;
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(existing);
    }

    // ===== Assets =====
    public async Task<ServiceOutcome> ListAssetsAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeAssets.Where(a => a.UserId == userId).ToListAsync());

    public async Task<ServiceOutcome> SaveAssetAsync(Guid userId, EmployeeAsset dto)
    {
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeAssets, userId, dto);
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
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeAllowances, userId, dto);
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
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeCareerHistories, userId, dto);
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
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeEducations, userId, dto);
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
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeFamilies, userId, dto);
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
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeRewardDisciplines, userId, dto);
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
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeBankAccounts, userId, dto);
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
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeContracts, userId, dto);
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
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeUnionMemberships, userId, dto);
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
