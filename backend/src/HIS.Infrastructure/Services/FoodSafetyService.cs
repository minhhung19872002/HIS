using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class FoodSafetyService : IFoodSafetyService
{
    private readonly HISDbContext _context;

    public FoodSafetyService(HISDbContext context)
    {
        _context = context;
    }

    // ==================== Incidents ====================

    public async Task<List<FoodIncidentListDto>> SearchIncidentsAsync(FoodIncidentSearchDto? filter = null)
    {
        try
        {
            var query = _context.FoodPoisoningIncidents
                .Include(i => i.Samples)
                .Where(i => !i.IsDeleted)
                .AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(i =>
                        i.ReportNumber.ToLower().Contains(kw) ||
                        i.Location.ToLower().Contains(kw) ||
                        (i.FoodSource != null && i.FoodSource.ToLower().Contains(kw)) ||
                        (i.SuspectedCause != null && i.SuspectedCause.ToLower().Contains(kw))
                    );
                }
                if (filter.InvestigationStatus.HasValue)
                    query = query.Where(i => i.InvestigationStatus == filter.InvestigationStatus.Value);
                if (filter.SeverityLevel.HasValue)
                    query = query.Where(i => i.SeverityLevel == filter.SeverityLevel.Value);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(i => i.IncidentDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(i => i.IncidentDate <= to.AddDays(1));
            }

            return await query
                .OrderByDescending(i => i.IncidentDate)
                .Take(200)
                .Select(i => new FoodIncidentListDto
                {
                    Id = i.Id,
                    ReportNumber = i.ReportNumber,
                    IncidentDate = i.IncidentDate.ToString("yyyy-MM-dd"),
                    Location = i.Location,
                    FoodSource = i.FoodSource,
                    FoodType = i.FoodType,
                    AffectedCount = i.AffectedCount,
                    HospitalizedCount = i.HospitalizedCount,
                    DeathCount = i.DeathCount,
                    SuspectedCause = i.SuspectedCause,
                    InvestigationStatus = i.InvestigationStatus,
                    SeverityLevel = i.SeverityLevel,
                    NotifiedAuthorities = i.NotifiedAuthorities,
                    SampleCount = i.Samples.Count(s => !s.IsDeleted),
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<FoodIncidentListDto>();
        }
    }

    public async Task<FoodIncidentListDto?> GetIncidentByIdAsync(Guid id)
    {
        var i = await _context.FoodPoisoningIncidents
            .Include(x => x.Samples)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (i == null) return null;

        return new FoodIncidentListDto
        {
            Id = i.Id,
            ReportNumber = i.ReportNumber,
            IncidentDate = i.IncidentDate.ToString("yyyy-MM-dd"),
            Location = i.Location,
            FoodSource = i.FoodSource,
            FoodType = i.FoodType,
            AffectedCount = i.AffectedCount,
            HospitalizedCount = i.HospitalizedCount,
            DeathCount = i.DeathCount,
            SuspectedCause = i.SuspectedCause,
            InvestigationStatus = i.InvestigationStatus,
            SeverityLevel = i.SeverityLevel,
            NotifiedAuthorities = i.NotifiedAuthorities,
            SampleCount = i.Samples.Count(s => !s.IsDeleted),
        };
    }

    public async Task<FoodIncidentListDto> CreateIncidentAsync(FoodIncidentCreateDto dto)
    {
        var reportNumber = dto.ReportNumber;
        if (string.IsNullOrEmpty(reportNumber))
        {
            var count = await _context.FoodPoisoningIncidents.CountAsync() + 1;
            reportNumber = $"FS-{DateTime.UtcNow:yyyy}-{count:D4}";
        }

        var entity = new FoodPoisoningIncident
        {
            Id = Guid.NewGuid(),
            ReportNumber = reportNumber,
            IncidentDate = DateTime.TryParse(dto.IncidentDate, out var d) ? d : DateTime.UtcNow,
            Location = dto.Location,
            FoodSource = dto.FoodSource,
            FoodType = dto.FoodType,
            EstimatedExposed = dto.EstimatedExposed,
            AffectedCount = dto.AffectedCount,
            HospitalizedCount = dto.HospitalizedCount,
            DeathCount = dto.DeathCount,
            Symptoms = dto.Symptoms,
            SuspectedCause = dto.SuspectedCause,
            InvestigationStatus = 0, // Reported
            SeverityLevel = dto.SeverityLevel,
            ReportedBy = dto.ReportedBy,
            ReportedAt = DateTime.UtcNow,
            NotifiedAuthorities = false,
        };

        _context.FoodPoisoningIncidents.Add(entity);
        await _context.SaveChangesAsync();

        return new FoodIncidentListDto
        {
            Id = entity.Id,
            ReportNumber = entity.ReportNumber,
            IncidentDate = entity.IncidentDate.ToString("yyyy-MM-dd"),
            Location = entity.Location,
            FoodSource = entity.FoodSource,
            FoodType = entity.FoodType,
            AffectedCount = entity.AffectedCount,
            HospitalizedCount = entity.HospitalizedCount,
            DeathCount = entity.DeathCount,
            SuspectedCause = entity.SuspectedCause,
            InvestigationStatus = entity.InvestigationStatus,
            SeverityLevel = entity.SeverityLevel,
            NotifiedAuthorities = entity.NotifiedAuthorities,
            SampleCount = 0,
        };
    }

    public async Task<FoodIncidentListDto> UpdateIncidentAsync(Guid id, FoodIncidentUpdateDto dto)
    {
        var entity = await _context.FoodPoisoningIncidents
            .Include(i => i.Samples)
            .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted)
            ?? throw new InvalidOperationException("Incident not found");

        if (dto.Location != null) entity.Location = dto.Location;
        if (dto.FoodSource != null) entity.FoodSource = dto.FoodSource;
        if (dto.FoodType != null) entity.FoodType = dto.FoodType;
        if (dto.EstimatedExposed.HasValue) entity.EstimatedExposed = dto.EstimatedExposed.Value;
        if (dto.AffectedCount.HasValue) entity.AffectedCount = dto.AffectedCount.Value;
        if (dto.HospitalizedCount.HasValue) entity.HospitalizedCount = dto.HospitalizedCount.Value;
        if (dto.DeathCount.HasValue) entity.DeathCount = dto.DeathCount.Value;
        if (dto.Symptoms != null) entity.Symptoms = dto.Symptoms;
        if (dto.SuspectedCause != null) entity.SuspectedCause = dto.SuspectedCause;
        if (dto.InvestigationStatus.HasValue)
        {
            entity.InvestigationStatus = dto.InvestigationStatus.Value;
            if (dto.InvestigationStatus.Value == 1 && !entity.InvestigationStartedAt.HasValue)
                entity.InvestigationStartedAt = DateTime.UtcNow;
            if (dto.InvestigationStatus.Value >= 3 && !entity.InvestigationCompletedAt.HasValue)
                entity.InvestigationCompletedAt = DateTime.UtcNow;
        }
        if (dto.SeverityLevel.HasValue) entity.SeverityLevel = dto.SeverityLevel.Value;
        if (dto.InvestigatorId.HasValue) entity.InvestigatorId = dto.InvestigatorId.Value;
        if (dto.Conclusion != null) entity.Conclusion = dto.Conclusion;
        if (dto.CorrectiveActions != null) entity.CorrectiveActions = dto.CorrectiveActions;
        if (dto.NotifiedAuthorities.HasValue) entity.NotifiedAuthorities = dto.NotifiedAuthorities.Value;

        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new FoodIncidentListDto
        {
            Id = entity.Id,
            ReportNumber = entity.ReportNumber,
            IncidentDate = entity.IncidentDate.ToString("yyyy-MM-dd"),
            Location = entity.Location,
            FoodSource = entity.FoodSource,
            FoodType = entity.FoodType,
            AffectedCount = entity.AffectedCount,
            HospitalizedCount = entity.HospitalizedCount,
            DeathCount = entity.DeathCount,
            SuspectedCause = entity.SuspectedCause,
            InvestigationStatus = entity.InvestigationStatus,
            SeverityLevel = entity.SeverityLevel,
            NotifiedAuthorities = entity.NotifiedAuthorities,
            SampleCount = entity.Samples.Count(s => !s.IsDeleted),
        };
    }

    public async Task<FoodIncidentStatsDto> GetIncidentStatsAsync()
    {
        try
        {
            var incidents = await _context.FoodPoisoningIncidents
                .Where(i => !i.IsDeleted)
                .ToListAsync();

            var bySeverity = incidents
                .GroupBy(i => i.SeverityLevel)
                .Select(g => new FoodIncidentBySeverityDto { SeverityLevel = g.Key, Count = g.Count() })
                .ToList();

            var byMonth = incidents
                .GroupBy(i => i.IncidentDate.ToString("yyyy-MM"))
                .OrderByDescending(g => g.Key)
                .Take(12)
                .Select(g => new FoodIncidentByMonthDto
                {
                    Month = g.Key,
                    Count = g.Count(),
                    AffectedCount = g.Sum(i => i.AffectedCount),
                })
                .ToList();

            return new FoodIncidentStatsDto
            {
                TotalIncidents = incidents.Count,
                ActiveInvestigations = incidents.Count(i => i.InvestigationStatus == 1),
                TotalAffected = incidents.Sum(i => i.AffectedCount),
                TotalHospitalized = incidents.Sum(i => i.HospitalizedCount),
                TotalDeaths = incidents.Sum(i => i.DeathCount),
                BySeverity = bySeverity,
                ByMonth = byMonth,
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new FoodIncidentStatsDto();
        }
    }

    // ==================== Samples ====================

    public async Task<FoodSampleListDto> AddSampleAsync(FoodSampleCreateDto dto)
    {
        var sampleCode = dto.SampleCode;
        if (string.IsNullOrEmpty(sampleCode))
        {
            var count = await _context.FoodSafetySamples.CountAsync() + 1;
            sampleCode = $"SM-{DateTime.UtcNow:yyyyMMdd}-{count:D4}";
        }

        var entity = new FoodSafetySample
        {
            Id = Guid.NewGuid(),
            IncidentId = dto.IncidentId,
            SampleType = dto.SampleType,
            SampleCode = sampleCode,
            CollectedAt = DateTime.TryParse(dto.CollectedAt, out var ca) ? ca : DateTime.UtcNow,
            CollectedBy = dto.CollectedBy,
        };

        _context.FoodSafetySamples.Add(entity);
        await _context.SaveChangesAsync();

        return MapSampleDto(entity);
    }

    public async Task<FoodSampleListDto> UpdateSampleAsync(Guid id, FoodSampleUpdateDto dto)
    {
        var entity = await _context.FoodSafetySamples.FindAsync(id)
            ?? throw new InvalidOperationException("Sample not found");

        if (dto.LabResult != null) entity.LabResult = dto.LabResult;
        if (!string.IsNullOrEmpty(dto.LabResultDate) && DateTime.TryParse(dto.LabResultDate, out var lrd))
            entity.LabResultDate = lrd;
        if (dto.PathogensFound != null) entity.PathogensFound = dto.PathogensFound;
        if (dto.IsPositive.HasValue) entity.IsPositive = dto.IsPositive.Value;
        if (!string.IsNullOrEmpty(dto.LabSentAt) && DateTime.TryParse(dto.LabSentAt, out var lsa))
            entity.LabSentAt = lsa;

        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapSampleDto(entity);
    }

    public async Task<List<FoodSampleListDto>> GetSamplesByIncidentAsync(Guid incidentId)
    {
        try
        {
            return await _context.FoodSafetySamples
                .Where(s => s.IncidentId == incidentId && !s.IsDeleted)
                .OrderBy(s => s.CollectedAt)
                .Select(s => new FoodSampleListDto
                {
                    Id = s.Id,
                    IncidentId = s.IncidentId,
                    SampleType = s.SampleType,
                    SampleCode = s.SampleCode,
                    CollectedAt = s.CollectedAt.ToString("yyyy-MM-ddTHH:mm:ss"),
                    CollectedBy = s.CollectedBy,
                    LabSentAt = s.LabSentAt.HasValue ? s.LabSentAt.Value.ToString("yyyy-MM-ddTHH:mm:ss") : null,
                    LabResult = s.LabResult,
                    LabResultDate = s.LabResultDate.HasValue ? s.LabResultDate.Value.ToString("yyyy-MM-dd") : null,
                    PathogensFound = s.PathogensFound,
                    IsPositive = s.IsPositive,
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<FoodSampleListDto>();
        }
    }

    // ==================== Inspections ====================

    public async Task<List<FoodInspectionListDto>> SearchInspectionsAsync(FoodInspectionSearchDto? filter = null)
    {
        try
        {
            var query = _context.FoodEstablishmentInspections
                .Where(i => !i.IsDeleted)
                .AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(i =>
                        i.EstablishmentName.ToLower().Contains(kw) ||
                        (i.Address != null && i.Address.ToLower().Contains(kw)) ||
                        (i.LicenseNumber != null && i.LicenseNumber.ToLower().Contains(kw))
                    );
                }
                if (filter.Status.HasValue)
                    query = query.Where(i => i.Status == filter.Status.Value);
                if (!string.IsNullOrEmpty(filter.ComplianceLevel))
                    query = query.Where(i => i.ComplianceLevel == filter.ComplianceLevel);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(i => i.InspectionDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(i => i.InspectionDate <= to.AddDays(1));
            }

            return await query
                .OrderByDescending(i => i.InspectionDate)
                .Take(200)
                .Select(i => new FoodInspectionListDto
                {
                    Id = i.Id,
                    EstablishmentName = i.EstablishmentName,
                    Address = i.Address,
                    LicenseNumber = i.LicenseNumber,
                    InspectionDate = i.InspectionDate.ToString("yyyy-MM-dd"),
                    InspectorName = i.InspectorName,
                    OverallScore = i.OverallScore,
                    ComplianceLevel = i.ComplianceLevel,
                    ViolationsFound = i.ViolationsFound,
                    CorrectiveDeadline = i.CorrectiveDeadline.HasValue ? i.CorrectiveDeadline.Value.ToString("yyyy-MM-dd") : null,
                    FollowUpDate = i.FollowUpDate.HasValue ? i.FollowUpDate.Value.ToString("yyyy-MM-dd") : null,
                    Status = i.Status,
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<FoodInspectionListDto>();
        }
    }

    public async Task<FoodInspectionListDto> CreateInspectionAsync(FoodInspectionCreateDto dto)
    {
        var entity = new FoodEstablishmentInspection
        {
            Id = Guid.NewGuid(),
            EstablishmentName = dto.EstablishmentName,
            Address = dto.Address,
            LicenseNumber = dto.LicenseNumber,
            InspectionDate = DateTime.TryParse(dto.InspectionDate, out var d) ? d : DateTime.UtcNow,
            InspectorId = dto.InspectorId,
            InspectorName = dto.InspectorName,
            OverallScore = dto.OverallScore,
            ComplianceLevel = dto.ComplianceLevel,
            ViolationsFound = dto.ViolationsFound,
            CorrectiveDeadline = DateTime.TryParse(dto.CorrectiveDeadline, out var cd) ? cd : null,
            FollowUpDate = DateTime.TryParse(dto.FollowUpDate, out var fd) ? fd : null,
            Status = 0, // Scheduled
        };

        _context.FoodEstablishmentInspections.Add(entity);
        await _context.SaveChangesAsync();

        return new FoodInspectionListDto
        {
            Id = entity.Id,
            EstablishmentName = entity.EstablishmentName,
            Address = entity.Address,
            LicenseNumber = entity.LicenseNumber,
            InspectionDate = entity.InspectionDate.ToString("yyyy-MM-dd"),
            InspectorName = entity.InspectorName,
            OverallScore = entity.OverallScore,
            ComplianceLevel = entity.ComplianceLevel,
            ViolationsFound = entity.ViolationsFound,
            CorrectiveDeadline = entity.CorrectiveDeadline?.ToString("yyyy-MM-dd"),
            FollowUpDate = entity.FollowUpDate?.ToString("yyyy-MM-dd"),
            Status = entity.Status,
        };
    }

    public async Task<FoodInspectionListDto> UpdateInspectionAsync(Guid id, FoodInspectionUpdateDto dto)
    {
        var entity = await _context.FoodEstablishmentInspections.FindAsync(id)
            ?? throw new InvalidOperationException("Inspection not found");

        if (dto.EstablishmentName != null) entity.EstablishmentName = dto.EstablishmentName;
        if (dto.Address != null) entity.Address = dto.Address;
        if (dto.LicenseNumber != null) entity.LicenseNumber = dto.LicenseNumber;
        if (dto.OverallScore.HasValue) entity.OverallScore = dto.OverallScore.Value;
        if (dto.ComplianceLevel != null) entity.ComplianceLevel = dto.ComplianceLevel;
        if (dto.ViolationsFound != null) entity.ViolationsFound = dto.ViolationsFound;
        if (!string.IsNullOrEmpty(dto.CorrectiveDeadline) && DateTime.TryParse(dto.CorrectiveDeadline, out var cd))
            entity.CorrectiveDeadline = cd;
        if (!string.IsNullOrEmpty(dto.FollowUpDate) && DateTime.TryParse(dto.FollowUpDate, out var fd))
            entity.FollowUpDate = fd;
        if (dto.Status.HasValue) entity.Status = dto.Status.Value;

        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new FoodInspectionListDto
        {
            Id = entity.Id,
            EstablishmentName = entity.EstablishmentName,
            Address = entity.Address,
            LicenseNumber = entity.LicenseNumber,
            InspectionDate = entity.InspectionDate.ToString("yyyy-MM-dd"),
            InspectorName = entity.InspectorName,
            OverallScore = entity.OverallScore,
            ComplianceLevel = entity.ComplianceLevel,
            ViolationsFound = entity.ViolationsFound,
            CorrectiveDeadline = entity.CorrectiveDeadline?.ToString("yyyy-MM-dd"),
            FollowUpDate = entity.FollowUpDate?.ToString("yyyy-MM-dd"),
            Status = entity.Status,
        };
    }

    public async Task<FoodInspectionStatsDto> GetInspectionStatsAsync()
    {
        try
        {
            var inspections = await _context.FoodEstablishmentInspections
                .Where(i => !i.IsDeleted)
                .ToListAsync();

            var byCompliance = inspections
                .GroupBy(i => i.ComplianceLevel)
                .Select(g => new FoodInspectionByComplianceDto { ComplianceLevel = g.Key, Count = g.Count() })
                .ToList();

            return new FoodInspectionStatsDto
            {
                TotalInspections = inspections.Count,
                ScheduledCount = inspections.Count(i => i.Status == 0),
                CompletedCount = inspections.Count(i => i.Status == 2),
                FollowUpNeededCount = inspections.Count(i => i.Status == 3),
                AverageScore = inspections.Count > 0 ? Math.Round(inspections.Average(i => i.OverallScore), 1) : 0,
                ByCompliance = byCompliance,
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new FoodInspectionStatsDto();
        }
    }

    // ==================== Helpers ====================

    private static FoodSampleListDto MapSampleDto(FoodSafetySample s)
    {
        return new FoodSampleListDto
        {
            Id = s.Id,
            IncidentId = s.IncidentId,
            SampleType = s.SampleType,
            SampleCode = s.SampleCode,
            CollectedAt = s.CollectedAt.ToString("yyyy-MM-ddTHH:mm:ss"),
            CollectedBy = s.CollectedBy,
            LabSentAt = s.LabSentAt?.ToString("yyyy-MM-ddTHH:mm:ss"),
            LabResult = s.LabResult,
            LabResultDate = s.LabResultDate?.ToString("yyyy-MM-dd"),
            PathogensFound = s.PathogensFound,
            IsPositive = s.IsPositive,
        };
    }
}
