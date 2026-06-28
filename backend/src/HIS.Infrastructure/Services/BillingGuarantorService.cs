using HIS.Application.DTOs.Billing;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Bảo lãnh viện phí: CRUD SponsorOrg + BillingGuarantor + báo cáo công nợ.
/// Soft-delete via IsDeleted. CreatedBy/UpdatedBy = string (NVARCHAR, không cần ValueConverter).
/// Materialize ToListAsync rồi map in-memory — KHÔNG dùng method C# trong EF .Select().
/// </summary>
public class BillingGuarantorService : IBillingGuarantorService
{
    private readonly HISDbContext _db;

    public BillingGuarantorService(HISDbContext db) => _db = db;

    // ─── SponsorOrg ──────────────────────────────────────────────────────────

    public async Task<List<SponsorOrgDto>> GetSponsorOrgsAsync(string? keyword)
    {
        var q = _db.SponsorOrgs.Where(o => !o.IsDeleted);
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(o => o.Name.Contains(keyword) || o.Code.Contains(keyword));

        var list = await q.OrderBy(o => o.Code).ToBoundedListAsync("BillingGuarantorService.GetSponsorOrgsAsync");
        return list.Select(o => new SponsorOrgDto
        {
            Id            = o.Id,
            Code          = o.Code,
            Name          = o.Name,
            TaxCode       = o.TaxCode,
            Address       = o.Address,
            ContactPerson = o.ContactPerson,
            Phone         = o.Phone,
            IsActive      = o.IsActive,
        }).ToList();
    }

    public async Task<SponsorOrgDto> SaveSponsorOrgAsync(SponsorOrgDto dto, string? userId)
    {
        SponsorOrg entity;
        if (dto.Id == Guid.Empty)
        {
            entity = new SponsorOrg { CreatedAt = DateTime.UtcNow, CreatedBy = userId };
            _db.SponsorOrgs.Add(entity);
        }
        else
        {
            entity = await _db.SponsorOrgs.FirstAsync(o => o.Id == dto.Id);
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }

        entity.Code          = dto.Code;
        entity.Name          = dto.Name;
        entity.TaxCode       = dto.TaxCode;
        entity.Address       = dto.Address;
        entity.ContactPerson = dto.ContactPerson;
        entity.Phone         = dto.Phone;
        entity.IsActive      = dto.IsActive;

        await _db.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteSponsorOrgAsync(Guid id)
    {
        var entity = await _db.SponsorOrgs.FirstOrDefaultAsync(o => o.Id == id);
        if (entity == null) return false;
        entity.IsDeleted  = true;
        entity.UpdatedAt  = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    // ─── BillingGuarantor ────────────────────────────────────────────────────

    public async Task<List<BillingGuarantorDto>> GetGuarantorsAsync(
        Guid? patientId, Guid? medicalRecordId, string? keyword)
    {
        var q = _db.BillingGuarantors.Where(g => !g.IsDeleted);
        if (patientId.HasValue)       q = q.Where(g => g.PatientId == patientId.Value);
        if (medicalRecordId.HasValue) q = q.Where(g => g.MedicalRecordId == medicalRecordId.Value);

        var list  = await q.OrderByDescending(g => g.CreatedAt).ToBoundedListAsync("BillingGuarantorService.GetGuarantorsAsync");
        var orgIds = list.Select(g => g.SponsorOrgId).Distinct().ToList();
        var orgs  = await _db.SponsorOrgs
            .Where(o => orgIds.Contains(o.Id))
            .ToListAsync();
        var orgMap = orgs.ToDictionary(o => o.Id, o => o.Name);

        var result = list.Select(g => new BillingGuarantorDto
        {
            Id              = g.Id,
            SponsorOrgId    = g.SponsorOrgId,
            SponsorOrgName  = orgMap.TryGetValue(g.SponsorOrgId, out var n) ? n : null,
            PatientId       = g.PatientId,
            MedicalRecordId = g.MedicalRecordId,
            GuaranteeNo     = g.GuaranteeNo,
            GuaranteeRate   = g.GuaranteeRate,
            GuaranteeAmount = g.GuaranteeAmount,
            FromDate        = g.FromDate,
            ToDate          = g.ToDate,
            Status          = g.Status,
            Notes           = g.Notes,
        }).ToList();

        // keyword filter in-memory (vì GuaranteeNo / SponsorOrgName cần join)
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.ToLower();
            result = result.Where(g =>
                (g.GuaranteeNo   != null && g.GuaranteeNo.ToLower().Contains(kw))   ||
                (g.SponsorOrgName != null && g.SponsorOrgName.ToLower().Contains(kw))
            ).ToList();
        }

        return result;
    }

    public async Task<BillingGuarantorDto> SaveGuarantorAsync(BillingGuarantorDto dto, string? userId)
    {
        if (dto.SponsorOrgId == Guid.Empty)
            throw new ArgumentException("SponsorOrgId là bắt buộc.");
        if (dto.GuaranteeRate < 0 || dto.GuaranteeRate > 100)
            throw new ArgumentException("GuaranteeRate phải trong khoảng 0-100.");

        BillingGuarantor entity;
        if (dto.Id == Guid.Empty)
        {
            entity = new BillingGuarantor { CreatedAt = DateTime.UtcNow, CreatedBy = userId };
            _db.BillingGuarantors.Add(entity);
        }
        else
        {
            entity = await _db.BillingGuarantors.FirstAsync(g => g.Id == dto.Id);
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }

        entity.SponsorOrgId    = dto.SponsorOrgId;
        entity.PatientId       = dto.PatientId;
        entity.MedicalRecordId = dto.MedicalRecordId;
        entity.GuaranteeNo     = dto.GuaranteeNo;
        entity.GuaranteeRate   = dto.GuaranteeRate;
        entity.GuaranteeAmount = dto.GuaranteeAmount;
        entity.FromDate        = dto.FromDate;
        entity.ToDate          = dto.ToDate;
        entity.Status          = dto.Status;
        entity.Notes           = dto.Notes;

        await _db.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteGuarantorAsync(Guid id)
    {
        var entity = await _db.BillingGuarantors.FirstOrDefaultAsync(g => g.Id == id);
        if (entity == null) return false;
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    // ─── Reports ─────────────────────────────────────────────────────────────

    public async Task<List<GuarantorDebtReportDto>> GetDebtByOrgAsync(DateTime? from, DateTime? to)
    {
        var q = _db.BillingGuarantors.Where(g => !g.IsDeleted && g.Status != 2 /* không tính hủy */);
        if (from.HasValue) q = q.Where(g => g.FromDate == null || g.FromDate >= from.Value);
        if (to.HasValue)   q = q.Where(g => g.ToDate   == null || g.ToDate   <= to.Value);

        var list = await q.ToListAsync();
        var orgIds = list.Select(g => g.SponsorOrgId).Distinct().ToList();
        var orgs   = await _db.SponsorOrgs
            .Where(o => orgIds.Contains(o.Id))
            .ToListAsync();
        var orgMap = orgs.ToDictionary(o => o.Id, o => o.Name);

        return list
            .GroupBy(g => g.SponsorOrgId)
            .Select(grp => new GuarantorDebtReportDto
            {
                SponsorOrgId    = grp.Key,
                SponsorOrgName  = orgMap.TryGetValue(grp.Key, out var n) ? n : grp.Key.ToString(),
                TotalGuaranteed = grp.Sum(g => g.GuaranteeAmount ?? 0),
                Count           = grp.Count(),
            })
            .OrderByDescending(r => r.TotalGuaranteed)
            .ToList();
    }
}
