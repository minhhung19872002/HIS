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
        // QA-R4: a zero/unknown userId wrote orphan rows (UserId = 00000000-…) or hit the FK as a 500.
        if (userId == Guid.Empty || !await _db.Users.AnyAsync(u => u.Id == userId))
            throw new KeyNotFoundException("Không tìm thấy nhân viên.");
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

    /// <summary>QA-R4: DELETE of a zero/unknown id answered 200 (silent no-op); every tab now answers 404.</summary>
    private async Task<ServiceOutcome> SoftDeleteAsync<T>(DbSet<T> set, Guid id) where T : BaseEntity
    {
        var e = await set.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (e == null) return ServiceOutcome.NotFound("Không tìm thấy bản ghi hồ sơ nhân viên");
        e.IsDeleted = true; e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    private static string Required(string? value, string label)
    {
        var v = value?.Trim();
        if (string.IsNullOrEmpty(v)) throw new ArgumentException($"{label} là bắt buộc.");
        return v;
    }

    // ===== Assets =====
    public async Task<ServiceOutcome> ListAssetsAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeAssets.Where(a => a.UserId == userId).ToListAsync());

    public async Task<ServiceOutcome> SaveAssetAsync(Guid userId, EmployeeAsset dto)
    {
        dto.AssetType = Required(dto.AssetType, "Loại tài sản");
        dto.AssetName = Required(dto.AssetName, "Tên tài sản");
        if (dto.Value < 0) throw new ArgumentException("Giá trị tài sản không được âm.");
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeAssets, userId, dto);
    }
    public Task<ServiceOutcome> DeleteAssetAsync(Guid id) => SoftDeleteAsync(_db.EmployeeAssets, id);

    // ===== Allowances =====
    public async Task<ServiceOutcome> ListAllowancesAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeAllowances.Where(a => a.UserId == userId).ToListAsync());

    public async Task<ServiceOutcome> SaveAllowanceAsync(Guid userId, EmployeeAllowance dto)
    {
        dto.AllowanceType = Required(dto.AllowanceType, "Loại phụ cấp");
        dto.PaymentMethod = Required(dto.PaymentMethod, "Cách thức chi trả");
        if (dto.Amount < 0 || dto.Rate < 0) throw new ArgumentException("Số tiền/hệ số phụ cấp không được âm.");
        if (dto.EffectiveFrom == default) throw new ArgumentException("Ngày hiệu lực phụ cấp là bắt buộc.");
        if (dto.EffectiveTo.HasValue && dto.EffectiveTo.Value.Date < dto.EffectiveFrom.Date)
            throw new ArgumentException("Ngày hết hiệu lực phụ cấp phải sau ngày bắt đầu.");
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeAllowances, userId, dto);
    }
    public Task<ServiceOutcome> DeleteAllowanceAsync(Guid id) => SoftDeleteAsync(_db.EmployeeAllowances, id);

    // ===== Career History =====
    public async Task<ServiceOutcome> ListCareerAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeCareerHistories
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.TransferDate).ToListAsync());

    public async Task<ServiceOutcome> SaveCareerAsync(Guid userId, EmployeeCareerHistory dto)
    {
        if (dto.TransferDate == default) throw new ArgumentException("Ngày chuyển công tác là bắt buộc.");
        if (string.IsNullOrWhiteSpace(dto.ToDepartmentName) && dto.ToDepartmentId is null)
            throw new ArgumentException("Khoa/phòng chuyển đến là bắt buộc.");
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeCareerHistories, userId, dto);
    }
    public Task<ServiceOutcome> DeleteCareerAsync(Guid id) => SoftDeleteAsync(_db.EmployeeCareerHistories, id);

    // ===== Education =====
    public async Task<ServiceOutcome> ListEducationAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeEducations.Where(a => a.UserId == userId).ToListAsync());

    public async Task<ServiceOutcome> SaveEducationAsync(Guid userId, EmployeeEducation dto)
    {
        dto.Degree = Required(dto.Degree, "Bằng cấp/học vị");
        dto.Major = Required(dto.Major, "Chuyên ngành");
        if (dto.GraduatedAt.HasValue && dto.GraduatedAt.Value.Date > DateTime.Today.AddDays(1))
            throw new ArgumentException("Ngày tốt nghiệp không được ở tương lai.");
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeEducations, userId, dto);
    }
    public Task<ServiceOutcome> DeleteEducationAsync(Guid id) => SoftDeleteAsync(_db.EmployeeEducations, id);

    // ===== Family =====
    public async Task<ServiceOutcome> ListFamilyAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeFamilies.Where(a => a.UserId == userId).ToListAsync());

    public async Task<ServiceOutcome> SaveFamilyAsync(Guid userId, EmployeeFamily dto)
    {
        dto.Relation = Required(dto.Relation, "Quan hệ");
        dto.FullName = Required(dto.FullName, "Họ tên thân nhân");
        if (dto.DateOfBirth.HasValue && dto.DateOfBirth.Value.Date > DateTime.Today)
            throw new ArgumentException("Ngày sinh thân nhân không được ở tương lai.");
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeFamilies, userId, dto);
    }
    public Task<ServiceOutcome> DeleteFamilyAsync(Guid id) => SoftDeleteAsync(_db.EmployeeFamilies, id);

    // ===== Rewards / Discipline =====
    public async Task<ServiceOutcome> ListRewardsAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeRewardDisciplines
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.DecisionDate).ToListAsync());

    public async Task<ServiceOutcome> SaveRewardAsync(Guid userId, EmployeeRewardDiscipline dto)
    {
        dto.Title = Required(dto.Title, "Nội dung khen thưởng/kỷ luật");
        dto.Type = (dto.Type ?? "").Trim().ToLowerInvariant();
        if (dto.Type is not ("reward" or "discipline"))
            throw new ArgumentException("Loại phải là khen thưởng (reward) hoặc kỷ luật (discipline).");
        if (dto.DecisionDate == default) throw new ArgumentException("Ngày quyết định là bắt buộc.");
        if (dto.Amount < 0) throw new ArgumentException("Số tiền thưởng không được âm.");
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeRewardDisciplines, userId, dto);
    }
    public Task<ServiceOutcome> DeleteRewardAsync(Guid id) => SoftDeleteAsync(_db.EmployeeRewardDisciplines, id);

    // ===== Bank Accounts =====
    public async Task<ServiceOutcome> ListBanksAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeBankAccounts.Where(a => a.UserId == userId).ToListAsync());

    public async Task<ServiceOutcome> SaveBankAsync(Guid userId, EmployeeBankAccount dto)
    {
        dto.BankName = Required(dto.BankName, "Ngân hàng");
        dto.AccountNumber = Required(dto.AccountNumber, "Số tài khoản");
        dto.AccountHolder = Required(dto.AccountHolder, "Chủ tài khoản");
        dto.UserId = userId;
        var outcome = await UpsertAsync(_db.EmployeeBankAccounts, userId, dto);
        // Only one salary account may be primary — a second "Tài khoản chính" used to leave payroll ambiguous.
        if (dto.IsPrimary)
        {
            var others = await _db.EmployeeBankAccounts
                .Where(b => b.UserId == userId && b.Id != dto.Id && b.IsPrimary && !b.IsDeleted).ToListAsync();
            if (others.Count > 0) { others.ForEach(b => b.IsPrimary = false); await _db.SaveChangesAsync(); }
        }
        return outcome;
    }
    public Task<ServiceOutcome> DeleteBankAsync(Guid id) => SoftDeleteAsync(_db.EmployeeBankAccounts, id);

    // ===== Contracts =====
    public async Task<ServiceOutcome> ListContractsAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeContracts
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.StartDate).ToListAsync());

    public async Task<ServiceOutcome> SaveContractAsync(Guid userId, EmployeeContract dto)
    {
        dto.ContractNumber = Required(dto.ContractNumber, "Số hợp đồng");
        dto.ContractType = Required(dto.ContractType, "Loại hợp đồng");
        if (dto.StartDate == default) throw new ArgumentException("Ngày bắt đầu hợp đồng là bắt buộc.");
        if (dto.EndDate.HasValue && dto.EndDate.Value.Date < dto.StartDate.Date)
            throw new ArgumentException("Ngày kết thúc hợp đồng phải sau ngày bắt đầu.");
        if (dto.BaseSalary < 0 || dto.SalaryGrade < 0 || dto.SalaryCoefficient < 0)
            throw new ArgumentException("Lương/bậc/hệ số lương không được âm.");
        var number = dto.ContractNumber;
        if (await _db.EmployeeContracts.AnyAsync(c => !c.IsDeleted && c.Id != dto.Id && c.ContractNumber == number))
            throw new InvalidOperationException($"Số hợp đồng {number} đã tồn tại.");
        // Two contracts of the same employee may not overlap in time (an open-ended one runs forever).
        var start = dto.StartDate.Date;
        var end = dto.EndDate?.Date ?? DateTime.MaxValue.Date;
        var overlap = await _db.EmployeeContracts
            .Where(c => !c.IsDeleted && c.UserId == userId && c.Id != dto.Id && c.StartDate <= end
                && (c.EndDate == null || c.EndDate >= start))
            .Select(c => c.ContractNumber).FirstOrDefaultAsync();
        if (overlap != null)
            throw new InvalidOperationException($"Khoảng thời gian trùng với hợp đồng {overlap} đang có hiệu lực.");
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeContracts, userId, dto);
    }
    public Task<ServiceOutcome> DeleteContractAsync(Guid id) => SoftDeleteAsync(_db.EmployeeContracts, id);

    // ===== Union Membership (Đoàn thể) =====
    public async Task<ServiceOutcome> ListUnionAsync(Guid userId)
        => ServiceOutcome.Ok(await _db.EmployeeUnionMemberships.Where(a => a.UserId == userId).ToListAsync());

    public async Task<ServiceOutcome> SaveUnionAsync(Guid userId, EmployeeUnionMembership dto)
    {
        dto.OrganizationType = Required(dto.OrganizationType, "Tổ chức đoàn thể");
        if (dto.MonthlyFee < 0) throw new ArgumentException("Đoàn phí không được âm.");
        dto.UserId = userId;
        return await UpsertAsync(_db.EmployeeUnionMemberships, userId, dto);
    }

    public Task<ServiceOutcome> DeleteUnionAsync(Guid id) => SoftDeleteAsync(_db.EmployeeUnionMemberships, id);

    // ===== Insurance =====
    public async Task<ServiceOutcome> GetInsuranceAsync(Guid userId)
    {
        var info = await _db.EmployeeInsuranceInfos.FirstOrDefaultAsync(a => a.UserId == userId);
        return ServiceOutcome.Ok(info);
    }

    public async Task<ServiceOutcome> SaveInsuranceAsync(Guid userId, EmployeeInsuranceInfo dto)
    {
        if (userId == Guid.Empty || !await _db.Users.AnyAsync(u => u.Id == userId))
            throw new KeyNotFoundException("Không tìm thấy nhân viên.");
        if (dto.MonthlyEmployeeContribution < 0 || dto.MonthlyEmployerContribution < 0)
            throw new ArgumentException("Mức đóng bảo hiểm không được âm.");
        if (dto.HealthInsuranceEndDate.HasValue && dto.HealthInsuranceStartDate.HasValue
            && dto.HealthInsuranceEndDate.Value.Date < dto.HealthInsuranceStartDate.Value.Date)
            throw new ArgumentException("Ngày hết hạn BHYT phải sau ngày bắt đầu.");
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
