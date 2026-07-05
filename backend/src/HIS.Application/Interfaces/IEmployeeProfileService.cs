using HIS.Application.Common;
using HIS.Core.Entities;

namespace HIS.Application.Interfaces;

/// <summary>
/// HR Employee Profile — logic tách khỏi EmployeeProfileController (#202 thin-controller).
/// Mỗi method tương ứng 1 action; trả ServiceOutcome để controller map về IActionResult
/// giữ nguyên status code + body (behavior-preserving).
/// </summary>
public interface IEmployeeProfileService
{
    // ===== Assets =====
    Task<ServiceOutcome> ListAssetsAsync(Guid userId);
    Task<ServiceOutcome> SaveAssetAsync(Guid userId, EmployeeAsset dto);
    Task<ServiceOutcome> DeleteAssetAsync(Guid id);

    // ===== Allowances =====
    Task<ServiceOutcome> ListAllowancesAsync(Guid userId);
    Task<ServiceOutcome> SaveAllowanceAsync(Guid userId, EmployeeAllowance dto);
    Task<ServiceOutcome> DeleteAllowanceAsync(Guid id);

    // ===== Career History =====
    Task<ServiceOutcome> ListCareerAsync(Guid userId);
    Task<ServiceOutcome> SaveCareerAsync(Guid userId, EmployeeCareerHistory dto);
    Task<ServiceOutcome> DeleteCareerAsync(Guid id);

    // ===== Education =====
    Task<ServiceOutcome> ListEducationAsync(Guid userId);
    Task<ServiceOutcome> SaveEducationAsync(Guid userId, EmployeeEducation dto);
    Task<ServiceOutcome> DeleteEducationAsync(Guid id);

    // ===== Family =====
    Task<ServiceOutcome> ListFamilyAsync(Guid userId);
    Task<ServiceOutcome> SaveFamilyAsync(Guid userId, EmployeeFamily dto);
    Task<ServiceOutcome> DeleteFamilyAsync(Guid id);

    // ===== Rewards / Discipline =====
    Task<ServiceOutcome> ListRewardsAsync(Guid userId);
    Task<ServiceOutcome> SaveRewardAsync(Guid userId, EmployeeRewardDiscipline dto);
    Task<ServiceOutcome> DeleteRewardAsync(Guid id);

    // ===== Bank Accounts =====
    Task<ServiceOutcome> ListBanksAsync(Guid userId);
    Task<ServiceOutcome> SaveBankAsync(Guid userId, EmployeeBankAccount dto);
    Task<ServiceOutcome> DeleteBankAsync(Guid id);

    // ===== Contracts =====
    Task<ServiceOutcome> ListContractsAsync(Guid userId);
    Task<ServiceOutcome> SaveContractAsync(Guid userId, EmployeeContract dto);
    Task<ServiceOutcome> DeleteContractAsync(Guid id);

    // ===== Union Membership (Đoàn thể) =====
    Task<ServiceOutcome> ListUnionAsync(Guid userId);
    Task<ServiceOutcome> SaveUnionAsync(Guid userId, EmployeeUnionMembership dto);
    Task<ServiceOutcome> DeleteUnionAsync(Guid id);

    // ===== Insurance =====
    Task<ServiceOutcome> GetInsuranceAsync(Guid userId);
    Task<ServiceOutcome> SaveInsuranceAsync(Guid userId, EmployeeInsuranceInfo dto);
}
