using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public partial class PublicHealthService
{
    // =====================================================================
    // VACCINATION
    // =====================================================================

    public async Task<List<VaccinationRecordDto>> GetVaccinationRecordsAsync(VaccinationSearchDto? filter = null)
    {
        var query = _context.VaccinationRecords
            .Include(v => v.Patient)
            .Where(v => !v.IsDeleted)
            .AsQueryable();

        if (filter != null)
        {
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(v =>
                    v.VaccineName.ToLower().Contains(kw) ||
                    (v.Patient != null && (v.Patient.FullName.ToLower().Contains(kw) || v.Patient.PatientCode.ToLower().Contains(kw)))
                );
            }
            if (filter.Status.HasValue)
                query = query.Where(v => v.Status == filter.Status.Value);
            if (!string.IsNullOrEmpty(filter.VaccineName))
                query = query.Where(v => v.VaccineName == filter.VaccineName);
            if (!string.IsNullOrEmpty(filter.CampaignCode))
                query = query.Where(v => v.CampaignCode == filter.CampaignCode);
            if (filter.IsEPI.HasValue)
                query = query.Where(v => v.IsEPI == filter.IsEPI.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(v => v.VaccinationDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(v => v.VaccinationDate <= to.AddDays(1));
        }

        var pageSize = filter?.PageSize > 0 ? filter.PageSize : 20;
        var skip = filter?.PageIndex > 0 ? filter.PageIndex * pageSize : 0;

        return await query
            .OrderByDescending(v => v.VaccinationDate)
            .Skip(skip)
            .Take(pageSize)
            .Select(v => MapVaccinationDto(v))
            .ToListAsync();
    }

    public async Task<VaccinationRecordDto?> GetVaccinationRecordByIdAsync(Guid id)
    {
        var v = await _context.VaccinationRecords
            .Include(v => v.Patient)
            .FirstOrDefaultAsync(v => v.Id == id && !v.IsDeleted);
        return v == null ? null : MapVaccinationDto(v);
    }

    public async Task<VaccinationRecordDto> RecordVaccinationAsync(CreateVaccinationRecordDto dto, string? userId)
    {
        var entity = new VaccinationRecord
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            VaccineName = dto.VaccineName,
            VaccineCode = dto.VaccineCode,
            LotNumber = dto.LotNumber,
            Manufacturer = dto.Manufacturer,
            VaccinationDate = !string.IsNullOrEmpty(dto.VaccinationDate) && DateTime.TryParse(dto.VaccinationDate, out var vd) ? vd : DateTime.UtcNow,
            DoseNumber = dto.DoseNumber,
            InjectionSite = dto.InjectionSite,
            Route = dto.Route,
            DoseMl = dto.DoseMl,
            AdministeredBy = dto.AdministeredBy,
            FacilityName = dto.FacilityName,
            Status = 1, // Completed
            NextDoseDate = !string.IsNullOrEmpty(dto.NextDoseDate) && DateTime.TryParse(dto.NextDoseDate, out var nd) ? nd : null,
            CampaignCode = dto.CampaignCode,
            IsEPI = dto.IsEPI,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };
        _context.VaccinationRecords.Add(entity);

        // Update campaign completed count if linked
        if (!string.IsNullOrEmpty(dto.CampaignCode))
        {
            var campaign = await _context.VaccinationCampaigns
                .FirstOrDefaultAsync(c => c.CampaignCode == dto.CampaignCode && !c.IsDeleted);
            if (campaign != null)
            {
                campaign.CompletedCount++;
                campaign.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();
        return MapVaccinationDto(entity);
    }

    public async Task<VaccinationRecordDto> UpdateVaccinationRecordAsync(Guid id, UpdateVaccinationRecordDto dto)
    {
        var v = await _context.VaccinationRecords.Include(x => x.Patient).FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Vaccination record not found");
        if (dto.Status.HasValue) v.Status = dto.Status.Value;
        if (dto.AefiReport != null) v.AefiReport = dto.AefiReport;
        if (dto.AefiSeverity.HasValue) v.AefiSeverity = dto.AefiSeverity.Value;
        if (!string.IsNullOrEmpty(dto.NextDoseDate) && DateTime.TryParse(dto.NextDoseDate, out var nd))
            v.NextDoseDate = nd;
        if (dto.Notes != null) v.Notes = dto.Notes;
        v.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return MapVaccinationDto(v);
    }

    public async Task DeleteVaccinationRecordAsync(Guid id)
    {
        var v = await _context.VaccinationRecords.FindAsync(id)
            ?? throw new InvalidOperationException("Vaccination record not found");
        v.IsDeleted = true;
        v.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<List<VaccinationScheduleDto>> GetVaccinationScheduleAsync(Guid patientId)
    {
        return await _context.VaccinationRecords
            .Include(v => v.Patient)
            .Where(v => v.PatientId == patientId && !v.IsDeleted && v.Status == 0 && v.NextDoseDate != null)
            .OrderBy(v => v.NextDoseDate)
            .Select(v => new VaccinationScheduleDto
            {
                PatientId = v.PatientId,
                PatientName = v.Patient != null ? v.Patient.FullName : "",
                VaccineName = v.VaccineName,
                DoseNumber = v.DoseNumber + 1,
                ScheduledDate = v.NextDoseDate!.Value.ToString("yyyy-MM-dd"),
                Status = v.NextDoseDate.Value < DateTime.UtcNow ? 2 : 0,
            })
            .ToBoundedListAsync("PublicHealthService.GetVaccinationSchedule");
    }

    public async Task<List<VaccinationCampaignDto>> GetVaccinationCampaignsAsync()
    {
        return await _context.VaccinationCampaigns
            .Where(c => !c.IsDeleted)
            .OrderByDescending(c => c.StartDate)
            .Select(c => new VaccinationCampaignDto
            {
                Id = c.Id,
                CampaignCode = c.CampaignCode,
                CampaignName = c.CampaignName,
                VaccineName = c.VaccineName,
                StartDate = c.StartDate.ToString("yyyy-MM-dd"),
                EndDate = c.EndDate.ToString("yyyy-MM-dd"),
                TargetGroup = c.TargetGroup,
                TargetCount = c.TargetCount,
                CompletedCount = c.CompletedCount,
                Status = c.Status,
                Description = c.Description,
                Areas = c.Areas,
            })
            .ToBoundedListAsync("PublicHealth.GetVaccinationCampaigns");
    }

    public async Task<VaccinationCampaignDto> CreateVaccinationCampaignAsync(CreateVaccinationCampaignDto dto, string? userId)
    {
        var entity = new VaccinationCampaign
        {
            Id = Guid.NewGuid(),
            CampaignCode = dto.CampaignCode,
            CampaignName = dto.CampaignName,
            VaccineName = dto.VaccineName,
            StartDate = !string.IsNullOrEmpty(dto.StartDate) && DateTime.TryParse(dto.StartDate, out var sd) ? sd : DateTime.UtcNow,
            EndDate = !string.IsNullOrEmpty(dto.EndDate) && DateTime.TryParse(dto.EndDate, out var ed) ? ed : DateTime.UtcNow.AddMonths(3),
            TargetGroup = dto.TargetGroup,
            TargetCount = dto.TargetCount,
            CompletedCount = 0,
            Status = 0, // Planning
            Description = dto.Description,
            Areas = dto.Areas,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };
        _context.VaccinationCampaigns.Add(entity);
        await _context.SaveChangesAsync();

        return new VaccinationCampaignDto
        {
            Id = entity.Id,
            CampaignCode = entity.CampaignCode,
            CampaignName = entity.CampaignName,
            VaccineName = entity.VaccineName,
            StartDate = entity.StartDate.ToString("yyyy-MM-dd"),
            EndDate = entity.EndDate.ToString("yyyy-MM-dd"),
            TargetGroup = entity.TargetGroup,
            TargetCount = entity.TargetCount,
            CompletedCount = entity.CompletedCount,
            Status = entity.Status,
            Description = entity.Description,
            Areas = entity.Areas,
        };
    }

    public async Task<VaccinationStatsDto> GetVaccinationStatsAsync()
    {
        var records = await _context.VaccinationRecords.Where(v => !v.IsDeleted).ToListAsync();
        var campaigns = await _context.VaccinationCampaigns.Where(c => !c.IsDeleted && c.Status == 1).CountAsync();

        return new VaccinationStatsDto
        {
            TotalRecords = records.Count,
            CompletedCount = records.Count(v => v.Status == 1),
            ScheduledCount = records.Count(v => v.Status == 0),
            MissedCount = records.Count(v => v.Status == 2),
            AefiCount = records.Count(v => v.AefiSeverity.HasValue && v.AefiSeverity.Value > 0),
            EPICount = records.Count(v => v.IsEPI),
            ActiveCampaigns = campaigns,
            VaccineBreakdown = records.GroupBy(v => v.VaccineName).Select(g => new VaccineBreakdownDto { VaccineName = g.Key, Count = g.Count() }).OrderByDescending(x => x.Count).Take(10).ToList(),
        };
    }

    // =====================================================================
    // PRIVATE HELPERS
    // =====================================================================

    private static VaccinationRecordDto MapVaccinationDto(VaccinationRecord v) => new()
    {
        Id = v.Id,
        PatientId = v.PatientId,
        PatientName = v.Patient?.FullName ?? "",
        PatientCode = v.Patient?.PatientCode ?? "",
        VaccineName = v.VaccineName,
        VaccineCode = v.VaccineCode,
        LotNumber = v.LotNumber,
        Manufacturer = v.Manufacturer,
        VaccinationDate = v.VaccinationDate.ToString("yyyy-MM-dd"),
        DoseNumber = v.DoseNumber,
        InjectionSite = v.InjectionSite,
        Route = v.Route,
        DoseMl = v.DoseMl,
        AdministeredBy = v.AdministeredBy,
        FacilityName = v.FacilityName,
        Status = v.Status,
        AefiReport = v.AefiReport,
        AefiSeverity = v.AefiSeverity,
        NextDoseDate = v.NextDoseDate?.ToString("yyyy-MM-dd"),
        CampaignCode = v.CampaignCode,
        Notes = v.Notes,
        IsEPI = v.IsEPI,
    };
}
