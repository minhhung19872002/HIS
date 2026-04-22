using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// HR Employee Profile — Sprint 6 Item 2.13.
/// 9 endpoint nhóm cho 9 tab hồ sơ NV.
/// </summary>
[ApiController]
[Route("api/employee-profile")]
[Authorize]
public class EmployeeProfileController : ControllerBase
{
    private readonly HISDbContext _db;
    public EmployeeProfileController(HISDbContext db) { _db = db; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    // ===== Assets =====
    [HttpGet("{userId:guid}/assets")]
    public async Task<IActionResult> ListAssets(Guid userId)
        => Ok(await _db.EmployeeAssets.Where(a => a.UserId == userId).ToListAsync());

    [HttpPost("{userId:guid}/assets")]
    public async Task<IActionResult> SaveAsset(Guid userId, [FromBody] EmployeeAsset dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeAssets.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeAssets.Update(dto);
        else _db.EmployeeAssets.Add(dto);
        await _db.SaveChangesAsync();
        return Ok(dto);
    }
    [HttpDelete("assets/{id:guid}")]
    public async Task<IActionResult> DeleteAsset(Guid id)
    {
        var e = await _db.EmployeeAssets.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return Ok(new { success = true });
    }

    // ===== Allowances =====
    [HttpGet("{userId:guid}/allowances")]
    public async Task<IActionResult> ListAllowances(Guid userId)
        => Ok(await _db.EmployeeAllowances.Where(a => a.UserId == userId).ToListAsync());

    [HttpPost("{userId:guid}/allowances")]
    public async Task<IActionResult> SaveAllowance(Guid userId, [FromBody] EmployeeAllowance dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeAllowances.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeAllowances.Update(dto);
        else _db.EmployeeAllowances.Add(dto);
        await _db.SaveChangesAsync();
        return Ok(dto);
    }
    [HttpDelete("allowances/{id:guid}")]
    public async Task<IActionResult> DeleteAllowance(Guid id)
    {
        var e = await _db.EmployeeAllowances.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return Ok(new { success = true });
    }

    // ===== Career History =====
    [HttpGet("{userId:guid}/career")]
    public async Task<IActionResult> ListCareer(Guid userId)
        => Ok(await _db.EmployeeCareerHistories
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.TransferDate).ToListAsync());

    [HttpPost("{userId:guid}/career")]
    public async Task<IActionResult> SaveCareer(Guid userId, [FromBody] EmployeeCareerHistory dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeCareerHistories.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeCareerHistories.Update(dto);
        else _db.EmployeeCareerHistories.Add(dto);
        await _db.SaveChangesAsync();
        return Ok(dto);
    }
    [HttpDelete("career/{id:guid}")]
    public async Task<IActionResult> DeleteCareer(Guid id)
    {
        var e = await _db.EmployeeCareerHistories.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return Ok(new { success = true });
    }

    // ===== Education =====
    [HttpGet("{userId:guid}/educations")]
    public async Task<IActionResult> ListEducation(Guid userId)
        => Ok(await _db.EmployeeEducations.Where(a => a.UserId == userId).ToListAsync());

    [HttpPost("{userId:guid}/educations")]
    public async Task<IActionResult> SaveEducation(Guid userId, [FromBody] EmployeeEducation dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeEducations.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeEducations.Update(dto);
        else _db.EmployeeEducations.Add(dto);
        await _db.SaveChangesAsync();
        return Ok(dto);
    }
    [HttpDelete("educations/{id:guid}")]
    public async Task<IActionResult> DeleteEducation(Guid id)
    {
        var e = await _db.EmployeeEducations.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return Ok(new { success = true });
    }

    // ===== Family =====
    [HttpGet("{userId:guid}/families")]
    public async Task<IActionResult> ListFamily(Guid userId)
        => Ok(await _db.EmployeeFamilies.Where(a => a.UserId == userId).ToListAsync());

    [HttpPost("{userId:guid}/families")]
    public async Task<IActionResult> SaveFamily(Guid userId, [FromBody] EmployeeFamily dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeFamilies.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeFamilies.Update(dto);
        else _db.EmployeeFamilies.Add(dto);
        await _db.SaveChangesAsync();
        return Ok(dto);
    }
    [HttpDelete("families/{id:guid}")]
    public async Task<IActionResult> DeleteFamily(Guid id)
    {
        var e = await _db.EmployeeFamilies.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return Ok(new { success = true });
    }

    // ===== Rewards / Discipline =====
    [HttpGet("{userId:guid}/rewards")]
    public async Task<IActionResult> ListRewards(Guid userId)
        => Ok(await _db.EmployeeRewardDisciplines
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.DecisionDate).ToListAsync());

    [HttpPost("{userId:guid}/rewards")]
    public async Task<IActionResult> SaveReward(Guid userId, [FromBody] EmployeeRewardDiscipline dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeRewardDisciplines.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeRewardDisciplines.Update(dto);
        else _db.EmployeeRewardDisciplines.Add(dto);
        await _db.SaveChangesAsync();
        return Ok(dto);
    }
    [HttpDelete("rewards/{id:guid}")]
    public async Task<IActionResult> DeleteReward(Guid id)
    {
        var e = await _db.EmployeeRewardDisciplines.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return Ok(new { success = true });
    }

    // ===== Bank Accounts =====
    [HttpGet("{userId:guid}/banks")]
    public async Task<IActionResult> ListBanks(Guid userId)
        => Ok(await _db.EmployeeBankAccounts.Where(a => a.UserId == userId).ToListAsync());

    [HttpPost("{userId:guid}/banks")]
    public async Task<IActionResult> SaveBank(Guid userId, [FromBody] EmployeeBankAccount dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeBankAccounts.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeBankAccounts.Update(dto);
        else _db.EmployeeBankAccounts.Add(dto);
        await _db.SaveChangesAsync();
        return Ok(dto);
    }
    [HttpDelete("banks/{id:guid}")]
    public async Task<IActionResult> DeleteBank(Guid id)
    {
        var e = await _db.EmployeeBankAccounts.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return Ok(new { success = true });
    }

    // ===== Contracts =====
    [HttpGet("{userId:guid}/contracts")]
    public async Task<IActionResult> ListContracts(Guid userId)
        => Ok(await _db.EmployeeContracts
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.StartDate).ToListAsync());

    [HttpPost("{userId:guid}/contracts")]
    public async Task<IActionResult> SaveContract(Guid userId, [FromBody] EmployeeContract dto)
    {
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        dto.UserId = userId;
        if (await _db.EmployeeContracts.AnyAsync(a => a.Id == dto.Id))
            _db.EmployeeContracts.Update(dto);
        else _db.EmployeeContracts.Add(dto);
        await _db.SaveChangesAsync();
        return Ok(dto);
    }
    [HttpDelete("contracts/{id:guid}")]
    public async Task<IActionResult> DeleteContract(Guid id)
    {
        var e = await _db.EmployeeContracts.FindAsync(id);
        if (e != null) { e.IsDeleted = true; await _db.SaveChangesAsync(); }
        return Ok(new { success = true });
    }

    // ===== Insurance =====
    [HttpGet("{userId:guid}/insurance")]
    public async Task<IActionResult> GetInsurance(Guid userId)
    {
        var info = await _db.EmployeeInsuranceInfos.FirstOrDefaultAsync(a => a.UserId == userId);
        return Ok(info);
    }

    [HttpPost("{userId:guid}/insurance")]
    public async Task<IActionResult> SaveInsurance(Guid userId, [FromBody] EmployeeInsuranceInfo dto)
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
            dto.UserId = userId;
            dto.CreatedAt = DateTime.UtcNow;
            _db.EmployeeInsuranceInfos.Add(dto);
        }
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }
}
