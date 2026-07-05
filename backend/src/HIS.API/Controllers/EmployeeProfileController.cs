using HIS.Application.Interfaces;
using HIS.API.Extensions;
using HIS.Core.Constants;
using HIS.Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// HR Employee Profile — Sprint 6 Item 2.13.
/// 9 endpoint nhóm cho 9 tab hồ sơ NV.
/// </summary>
[ApiController]
[Route("api/employee-profile")]
[Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.QuanTriHeThong)] // B3 RBAC: hồ sơ nhân sự/tài sản NV chỉ admin/HR
public class EmployeeProfileController : ControllerBase
{
    private readonly IEmployeeProfileService _svc;
    public EmployeeProfileController(IEmployeeProfileService svc) { _svc = svc; }

    // ===== Assets =====
    [HttpGet("{userId:guid}/assets")]
    public async Task<IActionResult> ListAssets(Guid userId)
        => (await _svc.ListAssetsAsync(userId)).ToActionResult();

    [HttpPost("{userId:guid}/assets")]
    public async Task<IActionResult> SaveAsset(Guid userId, [FromBody] EmployeeAsset dto)
        => (await _svc.SaveAssetAsync(userId, dto)).ToActionResult();

    [HttpDelete("assets/{id:guid}")]
    public async Task<IActionResult> DeleteAsset(Guid id)
        => (await _svc.DeleteAssetAsync(id)).ToActionResult();

    // ===== Allowances =====
    [HttpGet("{userId:guid}/allowances")]
    public async Task<IActionResult> ListAllowances(Guid userId)
        => (await _svc.ListAllowancesAsync(userId)).ToActionResult();

    [HttpPost("{userId:guid}/allowances")]
    public async Task<IActionResult> SaveAllowance(Guid userId, [FromBody] EmployeeAllowance dto)
        => (await _svc.SaveAllowanceAsync(userId, dto)).ToActionResult();

    [HttpDelete("allowances/{id:guid}")]
    public async Task<IActionResult> DeleteAllowance(Guid id)
        => (await _svc.DeleteAllowanceAsync(id)).ToActionResult();

    // ===== Career History =====
    [HttpGet("{userId:guid}/career")]
    public async Task<IActionResult> ListCareer(Guid userId)
        => (await _svc.ListCareerAsync(userId)).ToActionResult();

    [HttpPost("{userId:guid}/career")]
    public async Task<IActionResult> SaveCareer(Guid userId, [FromBody] EmployeeCareerHistory dto)
        => (await _svc.SaveCareerAsync(userId, dto)).ToActionResult();

    [HttpDelete("career/{id:guid}")]
    public async Task<IActionResult> DeleteCareer(Guid id)
        => (await _svc.DeleteCareerAsync(id)).ToActionResult();

    // ===== Education =====
    [HttpGet("{userId:guid}/educations")]
    public async Task<IActionResult> ListEducation(Guid userId)
        => (await _svc.ListEducationAsync(userId)).ToActionResult();

    [HttpPost("{userId:guid}/educations")]
    public async Task<IActionResult> SaveEducation(Guid userId, [FromBody] EmployeeEducation dto)
        => (await _svc.SaveEducationAsync(userId, dto)).ToActionResult();

    [HttpDelete("educations/{id:guid}")]
    public async Task<IActionResult> DeleteEducation(Guid id)
        => (await _svc.DeleteEducationAsync(id)).ToActionResult();

    // ===== Family =====
    [HttpGet("{userId:guid}/families")]
    public async Task<IActionResult> ListFamily(Guid userId)
        => (await _svc.ListFamilyAsync(userId)).ToActionResult();

    [HttpPost("{userId:guid}/families")]
    public async Task<IActionResult> SaveFamily(Guid userId, [FromBody] EmployeeFamily dto)
        => (await _svc.SaveFamilyAsync(userId, dto)).ToActionResult();

    [HttpDelete("families/{id:guid}")]
    public async Task<IActionResult> DeleteFamily(Guid id)
        => (await _svc.DeleteFamilyAsync(id)).ToActionResult();

    // ===== Rewards / Discipline =====
    [HttpGet("{userId:guid}/rewards")]
    public async Task<IActionResult> ListRewards(Guid userId)
        => (await _svc.ListRewardsAsync(userId)).ToActionResult();

    [HttpPost("{userId:guid}/rewards")]
    public async Task<IActionResult> SaveReward(Guid userId, [FromBody] EmployeeRewardDiscipline dto)
        => (await _svc.SaveRewardAsync(userId, dto)).ToActionResult();

    [HttpDelete("rewards/{id:guid}")]
    public async Task<IActionResult> DeleteReward(Guid id)
        => (await _svc.DeleteRewardAsync(id)).ToActionResult();

    // ===== Bank Accounts =====
    [HttpGet("{userId:guid}/banks")]
    public async Task<IActionResult> ListBanks(Guid userId)
        => (await _svc.ListBanksAsync(userId)).ToActionResult();

    [HttpPost("{userId:guid}/banks")]
    public async Task<IActionResult> SaveBank(Guid userId, [FromBody] EmployeeBankAccount dto)
        => (await _svc.SaveBankAsync(userId, dto)).ToActionResult();

    [HttpDelete("banks/{id:guid}")]
    public async Task<IActionResult> DeleteBank(Guid id)
        => (await _svc.DeleteBankAsync(id)).ToActionResult();

    // ===== Contracts =====
    [HttpGet("{userId:guid}/contracts")]
    public async Task<IActionResult> ListContracts(Guid userId)
        => (await _svc.ListContractsAsync(userId)).ToActionResult();

    [HttpPost("{userId:guid}/contracts")]
    public async Task<IActionResult> SaveContract(Guid userId, [FromBody] EmployeeContract dto)
        => (await _svc.SaveContractAsync(userId, dto)).ToActionResult();

    [HttpDelete("contracts/{id:guid}")]
    public async Task<IActionResult> DeleteContract(Guid id)
        => (await _svc.DeleteContractAsync(id)).ToActionResult();

    // ===== Union Membership (Đoàn thể) =====
    [HttpGet("{userId:guid}/union")]
    public async Task<IActionResult> ListUnion(Guid userId)
        => (await _svc.ListUnionAsync(userId)).ToActionResult();

    [HttpPost("{userId:guid}/union")]
    public async Task<IActionResult> SaveUnion(Guid userId, [FromBody] EmployeeUnionMembership dto)
        => (await _svc.SaveUnionAsync(userId, dto)).ToActionResult();

    [HttpDelete("union/{id:guid}")]
    public async Task<IActionResult> DeleteUnion(Guid id)
        => (await _svc.DeleteUnionAsync(id)).ToActionResult();

    // ===== Insurance =====
    [HttpGet("{userId:guid}/insurance")]
    public async Task<IActionResult> GetInsurance(Guid userId)
        => (await _svc.GetInsuranceAsync(userId)).ToActionResult();

    [HttpPost("{userId:guid}/insurance")]
    public async Task<IActionResult> SaveInsurance(Guid userId, [FromBody] EmployeeInsuranceInfo dto)
        => (await _svc.SaveInsuranceAsync(userId, dto)).ToActionResult();
}
