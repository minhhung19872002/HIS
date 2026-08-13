using HIS.Application.DTOs.NangCap27;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services.NangCap27;

/// <summary>
/// NangCap27 G8 — Danh mục công ty (HSMT 17.1) + Hợp đồng khám sức khỏe theo đoàn (HSMT 17.2).
/// Đợt khám / import Excel / gói dịch vụ dùng lại module Khám sức khỏe sẵn có (api/health-checkup).
/// </summary>
public class CheckupContractService : ICheckupContractService
{
    private readonly HISDbContext _db;

    public CheckupContractService(HISDbContext db) => _db = db;

    private static string ContractStatusName(int status) => status switch
    {
        0 => "Nháp",
        1 => "Hiệu lực",
        2 => "Hoàn thành",
        3 => "Đã thanh lý",
        _ => "Không xác định"
    };

    // ───────────────── Công ty ─────────────────

    public async Task<List<CheckupCompanyDto>> GetCompaniesAsync(string? keyword, bool? isActive)
    {
        var q = _db.CheckupCompanies.AsNoTracking().Where(c => !c.IsDeleted);
        if (isActive.HasValue) q = q.Where(c => c.IsActive == isActive.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(c => c.Name.Contains(kw) || c.Code.Contains(kw)
                || (c.TaxCode != null && c.TaxCode.Contains(kw)));
        }

        var companies = await q.OrderBy(c => c.Name).ToListAsync();
        var ids = companies.Select(c => c.Id).ToList();
        var counts = await _db.CheckupContracts.AsNoTracking()
            .Where(k => !k.IsDeleted && ids.Contains(k.CheckupCompanyId))
            .GroupBy(k => k.CheckupCompanyId)
            .Select(g => new { CompanyId = g.Key, Count = g.Count() })
            .ToListAsync();

        return companies.Select(c => new CheckupCompanyDto
        {
            Id = c.Id,
            Code = c.Code,
            Name = c.Name,
            TaxCode = c.TaxCode,
            Address = c.Address,
            Phone = c.Phone,
            Email = c.Email,
            ContactPerson = c.ContactPerson,
            ContactPhone = c.ContactPhone,
            Note = c.Note,
            IsActive = c.IsActive,
            ContractCount = counts.FirstOrDefault(x => x.CompanyId == c.Id)?.Count ?? 0
        }).ToList();
    }

    public async Task<CheckupCompanyDto> SaveCompanyAsync(CheckupCompanyDto dto, string? userId)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new InvalidOperationException("Phải nhập tên công ty.");

        CheckupCompany entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _db.CheckupCompanies.FirstOrDefaultAsync(c => c.Id == dto.Id && !c.IsDeleted)
                ?? throw new InvalidOperationException("Công ty không tồn tại.");
            entity.UpdatedBy = userId;
            entity.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            entity = new CheckupCompany
            {
                Id = Guid.NewGuid(),
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };
            _db.CheckupCompanies.Add(entity);
        }

        var code = string.IsNullOrWhiteSpace(dto.Code)
            ? $"CTY{DateTime.Now:yyMMddHHmmss}"
            : dto.Code.Trim();
        var codeTaken = await _db.CheckupCompanies
            .AnyAsync(c => !c.IsDeleted && c.Code == code && c.Id != entity.Id);
        if (codeTaken)
            throw new InvalidOperationException($"Mã công ty '{code}' đã tồn tại.");

        entity.Code = code;
        entity.Name = dto.Name.Trim();
        entity.TaxCode = dto.TaxCode;
        entity.Address = dto.Address;
        entity.Phone = dto.Phone;
        entity.Email = dto.Email;
        entity.ContactPerson = dto.ContactPerson;
        entity.ContactPhone = dto.ContactPhone;
        entity.Note = dto.Note;
        entity.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();

        dto.Id = entity.Id;
        dto.Code = entity.Code;
        return dto;
    }

    public async Task<bool> DeleteCompanyAsync(Guid id, string? userId)
    {
        var entity = await _db.CheckupCompanies.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
        if (entity == null) return false;

        var hasContract = await _db.CheckupContracts
            .AnyAsync(k => !k.IsDeleted && k.CheckupCompanyId == id);
        if (hasContract)
            throw new InvalidOperationException("Công ty đang có hợp đồng, không xóa được. Hãy chuyển sang Ngừng hoạt động.");

        entity.IsDeleted = true;
        entity.UpdatedBy = userId;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    // ───────────────── Hợp đồng ─────────────────

    public async Task<List<CheckupContractDto>> GetContractsAsync(CheckupContractFilterDto filter)
    {
        var q = _db.CheckupContracts.AsNoTracking().Where(k => !k.IsDeleted);

        if (filter.CheckupCompanyId.HasValue) q = q.Where(k => k.CheckupCompanyId == filter.CheckupCompanyId);
        if (filter.Status.HasValue) q = q.Where(k => k.Status == filter.Status);
        if (filter.FromDate.HasValue) q = q.Where(k => k.ContractDate >= filter.FromDate.Value.Date);
        if (filter.ToDate.HasValue) q = q.Where(k => k.ContractDate < filter.ToDate.Value.Date.AddDays(1));
        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim();
            q = q.Where(k => k.ContractCode.Contains(kw)
                || (k.PackageName != null && k.PackageName.Contains(kw)));
        }

        var contracts = await q.OrderByDescending(k => k.ContractDate).Take(500).ToListAsync();
        return await ProjectAsync(contracts);
    }

    public async Task<CheckupContractDto?> GetContractAsync(Guid id)
    {
        var entity = await _db.CheckupContracts.AsNoTracking()
            .FirstOrDefaultAsync(k => k.Id == id && !k.IsDeleted);
        if (entity == null) return null;
        return (await ProjectAsync(new List<CheckupContract> { entity })).FirstOrDefault();
    }

    public async Task<CheckupContractDto> SaveContractAsync(SaveCheckupContractDto dto, string? userId)
    {
        var companyExists = await _db.CheckupCompanies
            .AnyAsync(c => c.Id == dto.CheckupCompanyId && !c.IsDeleted);
        if (!companyExists)
            throw new InvalidOperationException("Công ty không tồn tại.");
        if (dto.UnitPrice < 0 || dto.ExpectedHeadcount < 0)
            throw new InvalidOperationException("Đơn giá và số người dự kiến không được âm.");
        if (dto.EffectiveFrom.HasValue && dto.EffectiveTo.HasValue && dto.EffectiveTo < dto.EffectiveFrom)
            throw new InvalidOperationException("Ngày hết hiệu lực phải sau ngày bắt đầu hiệu lực.");

        CheckupContract entity;
        if (dto.Id.HasValue && dto.Id != Guid.Empty)
        {
            entity = await _db.CheckupContracts.FirstOrDefaultAsync(k => k.Id == dto.Id && !k.IsDeleted)
                ?? throw new InvalidOperationException("Hợp đồng không tồn tại.");
            entity.UpdatedBy = userId;
            entity.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            entity = new CheckupContract
            {
                Id = Guid.NewGuid(),
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };
            _db.CheckupContracts.Add(entity);
        }

        var code = string.IsNullOrWhiteSpace(dto.ContractCode)
            ? $"HDKSK{DateTime.Now:yyMMddHHmmss}"
            : dto.ContractCode.Trim();
        var codeTaken = await _db.CheckupContracts
            .AnyAsync(k => !k.IsDeleted && k.ContractCode == code && k.Id != entity.Id);
        if (codeTaken)
            throw new InvalidOperationException($"Số hợp đồng '{code}' đã tồn tại.");

        entity.ContractCode = code;
        entity.CheckupCompanyId = dto.CheckupCompanyId;
        entity.CampaignId = dto.CampaignId;
        entity.ContractDate = dto.ContractDate ?? DateTime.UtcNow;
        entity.EffectiveFrom = dto.EffectiveFrom;
        entity.EffectiveTo = dto.EffectiveTo;
        entity.PackageName = dto.PackageName;
        entity.UnitPrice = dto.UnitPrice;
        entity.ExpectedHeadcount = dto.ExpectedHeadcount;
        entity.TotalAmount = Math.Round(dto.UnitPrice * dto.ExpectedHeadcount, 2);
        entity.Status = dto.Status;
        entity.Note = dto.Note;

        await _db.SaveChangesAsync();
        return (await ProjectAsync(new List<CheckupContract> { entity })).First();
    }

    public async Task<bool> DeleteContractAsync(Guid id, string? userId)
    {
        var entity = await _db.CheckupContracts.FirstOrDefaultAsync(k => k.Id == id && !k.IsDeleted);
        if (entity == null) return false;
        if (entity.Status != 0)
            throw new InvalidOperationException("Chỉ xóa được hợp đồng ở trạng thái Nháp.");

        entity.IsDeleted = true;
        entity.UpdatedBy = userId;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    private async Task<List<CheckupContractDto>> ProjectAsync(List<CheckupContract> contracts)
    {
        if (contracts.Count == 0) return new List<CheckupContractDto>();

        var companyIds = contracts.Select(k => k.CheckupCompanyId).Distinct().ToList();
        var companies = await _db.CheckupCompanies.AsNoTracking()
            .Where(c => companyIds.Contains(c.Id))
            .Select(c => new { c.Id, c.Name }).ToListAsync();

        return contracts.Select(k => new CheckupContractDto
        {
            Id = k.Id,
            ContractCode = k.ContractCode,
            CheckupCompanyId = k.CheckupCompanyId,
            CompanyName = companies.FirstOrDefault(c => c.Id == k.CheckupCompanyId)?.Name,
            CampaignId = k.CampaignId,
            ContractDate = k.ContractDate,
            EffectiveFrom = k.EffectiveFrom,
            EffectiveTo = k.EffectiveTo,
            PackageName = k.PackageName,
            UnitPrice = k.UnitPrice,
            ExpectedHeadcount = k.ExpectedHeadcount,
            TotalAmount = k.TotalAmount,
            Status = k.Status,
            StatusName = ContractStatusName(k.Status),
            Note = k.Note,
            CreatedAt = k.CreatedAt
        }).ToList();
    }
}
