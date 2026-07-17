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
    // DISEASE SURVEILLANCE
    // =====================================================================

    public async Task<List<DiseaseReportDto>> GetDiseaseReportsAsync(DiseaseReportSearchDto? filter = null)
    {
        var query = _context.DiseaseReports
            .Where(d => !d.IsDeleted)
            .AsQueryable();

        if (filter != null)
        {
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(d =>
                    d.PatientName.ToLower().Contains(kw) ||
                    d.DiseaseName.ToLower().Contains(kw) ||
                    d.DiseaseCode.ToLower().Contains(kw)
                );
            }
            if (filter.Status.HasValue)
                query = query.Where(d => d.Status == filter.Status.Value);
            if (!string.IsNullOrEmpty(filter.DiseaseGroup))
                query = query.Where(d => d.DiseaseGroup == filter.DiseaseGroup);
            if (filter.IsNotifiable.HasValue)
                query = query.Where(d => d.IsNotifiable == filter.IsNotifiable.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(d => d.ReportDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(d => d.ReportDate <= to.AddDays(1));
        }

        var pageSize = filter?.PageSize > 0 ? filter.PageSize : 20;
        var skip = filter?.PageIndex > 0 ? filter.PageIndex * pageSize : 0;

        return await query
            .OrderByDescending(d => d.ReportDate)
            .Skip(skip)
            .Take(pageSize)
            .Select(d => new DiseaseReportDto
            {
                Id = d.Id,
                PatientId = d.PatientId,
                PatientName = d.PatientName,
                PatientAge = d.PatientAge,
                PatientGender = d.PatientGender,
                PatientAddress = d.PatientAddress,
                DiseaseCode = d.DiseaseCode,
                DiseaseName = d.DiseaseName,
                DiseaseGroup = d.DiseaseGroup,
                OnsetDate = d.OnsetDate.ToString("yyyy-MM-dd"),
                ReportDate = d.ReportDate.ToString("yyyy-MM-dd"),
                DiagnosisDate = d.DiagnosisDate.HasValue ? d.DiagnosisDate.Value.ToString("yyyy-MM-dd") : null,
                ReportedBy = d.ReportedBy,
                FacilityName = d.FacilityName,
                Status = d.Status,
                IsNotifiable = d.IsNotifiable,
                Outcome = d.Outcome,
                QuarantineStatus = d.QuarantineStatus,
                ContactCount = d.ContactCount,
                Notes = d.Notes,
            })
            .ToListAsync();
    }

    public async Task<DiseaseReportDetailDto?> GetDiseaseReportByIdAsync(Guid id)
    {
        var d = await _context.DiseaseReports.FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
        if (d == null) return null;

        return new DiseaseReportDetailDto
        {
            Id = d.Id,
            PatientId = d.PatientId,
            PatientName = d.PatientName,
            PatientAge = d.PatientAge,
            PatientGender = d.PatientGender,
            PatientAddress = d.PatientAddress,
            DiseaseCode = d.DiseaseCode,
            DiseaseName = d.DiseaseName,
            DiseaseGroup = d.DiseaseGroup,
            OnsetDate = d.OnsetDate.ToString("yyyy-MM-dd"),
            ReportDate = d.ReportDate.ToString("yyyy-MM-dd"),
            DiagnosisDate = d.DiagnosisDate?.ToString("yyyy-MM-dd"),
            ReportedBy = d.ReportedBy,
            FacilityName = d.FacilityName,
            Status = d.Status,
            IsNotifiable = d.IsNotifiable,
            Outcome = d.Outcome,
            QuarantineStatus = d.QuarantineStatus,
            ContactCount = d.ContactCount,
            ContactTracingNotes = d.ContactTracingNotes,
            TravelHistory = d.TravelHistory,
            ExposureSource = d.ExposureSource,
            LabConfirmation = d.LabConfirmation,
            Notes = d.Notes,
        };
    }

    public async Task<DiseaseReportDto> ReportDiseaseAsync(CreateDiseaseReportDto dto, string? userId)
    {
        var entity = new DiseaseReport
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            PatientName = dto.PatientName,
            PatientAge = dto.PatientAge,
            PatientGender = dto.PatientGender,
            PatientAddress = dto.PatientAddress,
            DiseaseCode = dto.DiseaseCode,
            DiseaseName = dto.DiseaseName,
            DiseaseGroup = dto.DiseaseGroup,
            OnsetDate = !string.IsNullOrEmpty(dto.OnsetDate) && DateTime.TryParse(dto.OnsetDate, out var od) ? od : DateTime.UtcNow,
            ReportDate = DateTime.UtcNow,
            IsNotifiable = dto.IsNotifiable,
            ReportedBy = dto.ReportedBy,
            FacilityName = dto.FacilityName,
            Status = 0, // Reported
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };
        _context.DiseaseReports.Add(entity);
        await _context.SaveChangesAsync();

        return new DiseaseReportDto
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            PatientName = entity.PatientName,
            DiseaseCode = entity.DiseaseCode,
            DiseaseName = entity.DiseaseName,
            DiseaseGroup = entity.DiseaseGroup,
            OnsetDate = entity.OnsetDate.ToString("yyyy-MM-dd"),
            ReportDate = entity.ReportDate.ToString("yyyy-MM-dd"),
            Status = entity.Status,
            IsNotifiable = entity.IsNotifiable,
        };
    }

    public async Task<DiseaseReportDto> UpdateDiseaseReportAsync(Guid id, UpdateDiseaseReportDto dto)
    {
        var d = await _context.DiseaseReports.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Disease report not found");
        if (dto.Status.HasValue) d.Status = dto.Status.Value;
        if (dto.Outcome != null) d.Outcome = dto.Outcome;
        if (dto.QuarantineStatus != null) d.QuarantineStatus = dto.QuarantineStatus;
        if (dto.ContactTracingNotes != null) d.ContactTracingNotes = dto.ContactTracingNotes;
        if (dto.ContactCount.HasValue) d.ContactCount = dto.ContactCount.Value;
        if (dto.TravelHistory != null) d.TravelHistory = dto.TravelHistory;
        if (dto.ExposureSource != null) d.ExposureSource = dto.ExposureSource;
        if (dto.LabConfirmation != null) d.LabConfirmation = dto.LabConfirmation;
        if (!string.IsNullOrEmpty(dto.DiagnosisDate) && DateTime.TryParse(dto.DiagnosisDate, out var dd))
            d.DiagnosisDate = dd;
        if (dto.Notes != null) d.Notes = dto.Notes;
        d.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new DiseaseReportDto
        {
            Id = d.Id,
            PatientName = d.PatientName,
            DiseaseCode = d.DiseaseCode,
            DiseaseName = d.DiseaseName,
            DiseaseGroup = d.DiseaseGroup,
            OnsetDate = d.OnsetDate.ToString("yyyy-MM-dd"),
            ReportDate = d.ReportDate.ToString("yyyy-MM-dd"),
            Status = d.Status,
            IsNotifiable = d.IsNotifiable,
            Outcome = d.Outcome,
        };
    }

    public async Task DeleteDiseaseReportAsync(Guid id)
    {
        var d = await _context.DiseaseReports.FindAsync(id)
            ?? throw new InvalidOperationException("Disease report not found");
        d.IsDeleted = true;
        d.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<List<OutbreakEventDto>> GetOutbreakEventsAsync()
    {
        return await _context.OutbreakEvents
            .Where(o => !o.IsDeleted)
            .OrderByDescending(o => o.DetectedDate)
            .Select(o => new OutbreakEventDto
            {
                Id = o.Id,
                OutbreakCode = o.OutbreakCode,
                DiseaseName = o.DiseaseName,
                DiseaseCode = o.DiseaseCode,
                DetectedDate = o.DetectedDate.ToString("yyyy-MM-dd"),
                ResolvedDate = o.ResolvedDate.HasValue ? o.ResolvedDate.Value.ToString("yyyy-MM-dd") : null,
                Location = o.Location,
                AffectedArea = o.AffectedArea,
                CaseCount = o.CaseCount,
                DeathCount = o.DeathCount,
                Status = o.Status,
                ResponseActions = o.ResponseActions,
                RiskLevel = o.RiskLevel,
                Notes = o.Notes,
            })
            .ToBoundedListAsync("PublicHealth.GetOutbreakEvents");
    }

    public async Task<OutbreakEventDto> CreateOutbreakEventAsync(CreateOutbreakEventDto dto, string? userId)
    {
        var entity = new OutbreakEvent
        {
            Id = Guid.NewGuid(),
            OutbreakCode = dto.OutbreakCode,
            DiseaseName = dto.DiseaseName,
            DiseaseCode = dto.DiseaseCode,
            DetectedDate = !string.IsNullOrEmpty(dto.DetectedDate) && DateTime.TryParse(dto.DetectedDate, out var dd) ? dd : DateTime.UtcNow,
            Location = dto.Location,
            AffectedArea = dto.AffectedArea,
            RiskLevel = dto.RiskLevel,
            Status = 0, // Detected
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };
        _context.OutbreakEvents.Add(entity);
        await _context.SaveChangesAsync();

        return new OutbreakEventDto
        {
            Id = entity.Id,
            OutbreakCode = entity.OutbreakCode,
            DiseaseName = entity.DiseaseName,
            DiseaseCode = entity.DiseaseCode,
            DetectedDate = entity.DetectedDate.ToString("yyyy-MM-dd"),
            Location = entity.Location,
            Status = entity.Status,
            RiskLevel = entity.RiskLevel,
        };
    }

    public async Task<OutbreakEventDto> UpdateOutbreakEventAsync(Guid id, UpdateOutbreakEventDto dto)
    {
        var o = await _context.OutbreakEvents.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Outbreak event not found");
        if (dto.Status.HasValue) o.Status = dto.Status.Value;
        if (dto.CaseCount.HasValue) o.CaseCount = dto.CaseCount.Value;
        if (dto.DeathCount.HasValue) o.DeathCount = dto.DeathCount.Value;
        if (dto.ResponseActions != null) o.ResponseActions = dto.ResponseActions;
        if (dto.RiskLevel != null) o.RiskLevel = dto.RiskLevel;
        if (!string.IsNullOrEmpty(dto.ResolvedDate) && DateTime.TryParse(dto.ResolvedDate, out var rd))
            o.ResolvedDate = rd;
        if (dto.Notes != null) o.Notes = dto.Notes;
        o.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new OutbreakEventDto
        {
            Id = o.Id,
            OutbreakCode = o.OutbreakCode,
            DiseaseName = o.DiseaseName,
            DiseaseCode = o.DiseaseCode,
            DetectedDate = o.DetectedDate.ToString("yyyy-MM-dd"),
            ResolvedDate = o.ResolvedDate?.ToString("yyyy-MM-dd"),
            Location = o.Location,
            AffectedArea = o.AffectedArea,
            CaseCount = o.CaseCount,
            DeathCount = o.DeathCount,
            Status = o.Status,
            ResponseActions = o.ResponseActions,
            RiskLevel = o.RiskLevel,
            Notes = o.Notes,
        };
    }

    public async Task<DiseaseStatsDto> GetDiseaseStatsAsync()
    {
        var reports = await _context.DiseaseReports.Where(d => !d.IsDeleted).ToListAsync();
        var outbreaks = await _context.OutbreakEvents.Where(o => !o.IsDeleted && o.Status < 3).CountAsync();

        return new DiseaseStatsDto
        {
            TotalReports = reports.Count,
            ActiveInvestigations = reports.Count(d => d.Status == 1),
            ConfirmedCases = reports.Count(d => d.Status == 2),
            NotifiableCases = reports.Count(d => d.IsNotifiable),
            ActiveOutbreaks = outbreaks,
            TotalDeaths = reports.Count(d => d.Outcome == "Deceased"),
            GroupBreakdown = reports.Where(d => !string.IsNullOrEmpty(d.DiseaseGroup)).GroupBy(d => d.DiseaseGroup!).Select(g => new DiseaseGroupBreakdownDto { Group = g.Key, Count = g.Count() }).ToList(),
        };
    }
}
