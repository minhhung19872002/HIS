using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class ClinicalGuidanceService : IClinicalGuidanceService
{
    private readonly HISDbContext _context;

    public ClinicalGuidanceService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<ClinicalGuidanceBatchListDto>> SearchBatchesAsync(ClinicalGuidanceSearchDto filter)
    {
        try
        {
            var query = _context.ClinicalGuidanceBatches
                .Include(b => b.LeadDoctor)
                .Include(b => b.Activities)
                .Where(b => !b.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(b =>
                    b.Code.ToLower().Contains(kw) ||
                    b.Title.ToLower().Contains(kw) ||
                    b.TargetFacility.ToLower().Contains(kw)
                );
            }
            if (!string.IsNullOrEmpty(filter.Status))
                query = query.Where(b => b.Status == filter.Status);
            if (!string.IsNullOrEmpty(filter.GuidanceType))
                query = query.Where(b => b.GuidanceType == filter.GuidanceType);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(b => b.StartDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(b => b.StartDate <= to.AddDays(1));

            var skip = filter.PageIndex * filter.PageSize;

            return await query
                .OrderByDescending(b => b.StartDate)
                .Skip(skip)
                .Take(filter.PageSize)
                .Select(b => new ClinicalGuidanceBatchListDto
                {
                    Id = b.Id,
                    Code = b.Code,
                    Title = b.Title,
                    TargetFacility = b.TargetFacility,
                    GuidanceType = b.GuidanceType,
                    StartDate = b.StartDate.ToString("yyyy-MM-dd"),
                    EndDate = b.EndDate.HasValue ? b.EndDate.Value.ToString("yyyy-MM-dd") : null,
                    Status = b.Status,
                    LeadDoctorName = b.LeadDoctor != null ? b.LeadDoctor.FullName : null,
                    Budget = b.Budget,
                    ActualCost = b.ActualCost,
                    PatientsExamined = b.PatientsExamined,
                    TraineesCount = b.TraineesCount,
                    ActivityCount = b.Activities.Count(a => !a.IsDeleted),
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<ClinicalGuidanceBatchListDto>();
        }
    }

    public async Task<ClinicalGuidanceBatchDetailDto?> GetBatchByIdAsync(Guid id)
    {
        try
        {
            var b = await _context.ClinicalGuidanceBatches
                .Include(b => b.LeadDoctor)
                .Include(b => b.Activities.Where(a => !a.IsDeleted))
                .FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted);

            if (b == null) return null;

            return new ClinicalGuidanceBatchDetailDto
            {
                Id = b.Id,
                Code = b.Code,
                Title = b.Title,
                TargetFacility = b.TargetFacility,
                TargetFacilityCode = b.TargetFacilityCode,
                GuidanceType = b.GuidanceType,
                StartDate = b.StartDate.ToString("yyyy-MM-dd"),
                EndDate = b.EndDate?.ToString("yyyy-MM-dd"),
                Status = b.Status,
                LeadDoctorId = b.LeadDoctorId,
                LeadDoctorName = b.LeadDoctor?.FullName,
                TeamMembers = b.TeamMembers,
                Budget = b.Budget,
                ActualCost = b.ActualCost,
                Summary = b.Summary,
                Results = b.Results,
                Recommendations = b.Recommendations,
                PatientsExamined = b.PatientsExamined,
                TraineesCount = b.TraineesCount,
                TechniquesTransferred = b.TechniquesTransferred,
                ActivityCount = b.Activities.Count,
                CreatedAt = b.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss"),
                Activities = b.Activities.OrderByDescending(a => a.ActivityDate).Select(a => new ClinicalGuidanceActivityDto
                {
                    Id = a.Id,
                    BatchId = a.BatchId,
                    ActivityDate = a.ActivityDate.ToString("yyyy-MM-dd"),
                    ActivityType = a.ActivityType,
                    Description = a.Description,
                    Performer = a.Performer,
                    Location = a.Location,
                    Notes = a.Notes,
                    PatientCount = a.PatientCount,
                    TraineeCount = a.TraineeCount,
                }).ToList(),
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    public async Task<ClinicalGuidanceBatchDetailDto> CreateBatchAsync(CreateClinicalGuidanceBatchDto dto)
    {
        // Auto-generate code: CDT-YYYYMM-NNNN
        var now = DateTime.UtcNow;
        var monthStr = now.ToString("yyyyMM");
        var monthCount = await _context.ClinicalGuidanceBatches
            .Where(b => b.Code.StartsWith($"CDT-{monthStr}"))
            .CountAsync();
        var code = $"CDT-{monthStr}-{(monthCount + 1):D4}";

        var batch = new ClinicalGuidanceBatch
        {
            Id = Guid.NewGuid(),
            Code = code,
            Title = dto.Title,
            TargetFacility = dto.TargetFacility,
            TargetFacilityCode = dto.TargetFacilityCode,
            GuidanceType = dto.GuidanceType,
            StartDate = DateTime.TryParse(dto.StartDate, out var sd) ? sd : now,
            EndDate = DateTime.TryParse(dto.EndDate, out var ed) ? ed : null,
            Status = "Planning",
            LeadDoctorId = dto.LeadDoctorId,
            TeamMembers = dto.TeamMembers,
            Budget = dto.Budget,
            CreatedAt = DateTime.UtcNow,
        };

        _context.ClinicalGuidanceBatches.Add(batch);
        await _context.SaveChangesAsync();

        return (await GetBatchByIdAsync(batch.Id))!;
    }

    public async Task<ClinicalGuidanceBatchDetailDto> UpdateBatchAsync(Guid id, UpdateClinicalGuidanceBatchDto dto)
    {
        var batch = await _context.ClinicalGuidanceBatches.FindAsync(id)
            ?? throw new InvalidOperationException("Batch not found");

        if (dto.Title != null) batch.Title = dto.Title;
        if (dto.TargetFacility != null) batch.TargetFacility = dto.TargetFacility;
        if (dto.TargetFacilityCode != null) batch.TargetFacilityCode = dto.TargetFacilityCode;
        if (dto.GuidanceType != null) batch.GuidanceType = dto.GuidanceType;
        if (dto.StartDate != null && DateTime.TryParse(dto.StartDate, out var sd)) batch.StartDate = sd;
        if (dto.EndDate != null && DateTime.TryParse(dto.EndDate, out var ed)) batch.EndDate = ed;
        if (dto.LeadDoctorId.HasValue) batch.LeadDoctorId = dto.LeadDoctorId.Value;
        if (dto.TeamMembers != null) batch.TeamMembers = dto.TeamMembers;
        if (dto.Budget.HasValue) batch.Budget = dto.Budget.Value;
        if (dto.ActualCost.HasValue) batch.ActualCost = dto.ActualCost.Value;
        if (dto.Summary != null) batch.Summary = dto.Summary;
        if (dto.Results != null) batch.Results = dto.Results;
        if (dto.Recommendations != null) batch.Recommendations = dto.Recommendations;
        if (dto.PatientsExamined.HasValue) batch.PatientsExamined = dto.PatientsExamined.Value;
        if (dto.TraineesCount.HasValue) batch.TraineesCount = dto.TraineesCount.Value;
        if (dto.TechniquesTransferred.HasValue) batch.TechniquesTransferred = dto.TechniquesTransferred.Value;
        batch.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return (await GetBatchByIdAsync(id))!;
    }

    public async Task<bool> CompleteBatchAsync(Guid id, CompleteClinicalGuidanceBatchDto dto)
    {
        var batch = await _context.ClinicalGuidanceBatches.FindAsync(id);
        if (batch == null || batch.IsDeleted) return false;

        batch.Status = "Completed";
        batch.EndDate ??= DateTime.UtcNow;
        if (dto.Summary != null) batch.Summary = dto.Summary;
        if (dto.Results != null) batch.Results = dto.Results;
        if (dto.Recommendations != null) batch.Recommendations = dto.Recommendations;
        if (dto.ActualCost.HasValue) batch.ActualCost = dto.ActualCost.Value;
        if (dto.PatientsExamined.HasValue) batch.PatientsExamined = dto.PatientsExamined.Value;
        if (dto.TraineesCount.HasValue) batch.TraineesCount = dto.TraineesCount.Value;
        if (dto.TechniquesTransferred.HasValue) batch.TechniquesTransferred = dto.TechniquesTransferred.Value;
        batch.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CancelBatchAsync(Guid id)
    {
        var batch = await _context.ClinicalGuidanceBatches.FindAsync(id);
        if (batch == null || batch.IsDeleted) return false;

        batch.Status = "Cancelled";
        batch.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<ClinicalGuidanceActivityDto>> GetActivitiesAsync(Guid batchId)
    {
        try
        {
            return await _context.ClinicalGuidanceActivities
                .Where(a => a.BatchId == batchId && !a.IsDeleted)
                .OrderByDescending(a => a.ActivityDate)
                .Select(a => new ClinicalGuidanceActivityDto
                {
                    Id = a.Id,
                    BatchId = a.BatchId,
                    ActivityDate = a.ActivityDate.ToString("yyyy-MM-dd"),
                    ActivityType = a.ActivityType,
                    Description = a.Description,
                    Performer = a.Performer,
                    Location = a.Location,
                    Notes = a.Notes,
                    PatientCount = a.PatientCount,
                    TraineeCount = a.TraineeCount,
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<ClinicalGuidanceActivityDto>();
        }
    }

    public async Task<ClinicalGuidanceActivityDto> CreateActivityAsync(Guid batchId, CreateClinicalGuidanceActivityDto dto)
    {
        var batch = await _context.ClinicalGuidanceBatches.FindAsync(batchId)
            ?? throw new InvalidOperationException("Batch not found");

        // Auto-set status to InProgress if still Planning
        if (batch.Status == "Planning")
        {
            batch.Status = "InProgress";
            batch.UpdatedAt = DateTime.UtcNow;
        }

        var activity = new ClinicalGuidanceActivity
        {
            Id = Guid.NewGuid(),
            BatchId = batchId,
            ActivityDate = DateTime.TryParse(dto.ActivityDate, out var ad) ? ad : DateTime.UtcNow,
            ActivityType = dto.ActivityType,
            Description = dto.Description,
            Performer = dto.Performer,
            Location = dto.Location,
            Notes = dto.Notes,
            PatientCount = dto.PatientCount,
            TraineeCount = dto.TraineeCount,
            CreatedAt = DateTime.UtcNow,
        };

        _context.ClinicalGuidanceActivities.Add(activity);
        await _context.SaveChangesAsync();

        return new ClinicalGuidanceActivityDto
        {
            Id = activity.Id,
            BatchId = activity.BatchId,
            ActivityDate = activity.ActivityDate.ToString("yyyy-MM-dd"),
            ActivityType = activity.ActivityType,
            Description = activity.Description,
            Performer = activity.Performer,
            Location = activity.Location,
            Notes = activity.Notes,
            PatientCount = activity.PatientCount,
            TraineeCount = activity.TraineeCount,
        };
    }

    public async Task<ClinicalGuidanceStatsDto> GetStatisticsAsync()
    {
        try
        {
            var batches = await _context.ClinicalGuidanceBatches
                .Where(b => !b.IsDeleted)
                .ToListAsync();

            var typeBreakdown = batches
                .GroupBy(b => b.GuidanceType)
                .Select(g => new ClinicalGuidanceTypeBreakdownDto
                {
                    GuidanceType = g.Key,
                    Count = g.Count(),
                    PatientsExamined = g.Sum(b => b.PatientsExamined),
                })
                .ToList();

            return new ClinicalGuidanceStatsDto
            {
                TotalBatches = batches.Count,
                PlanningCount = batches.Count(b => b.Status == "Planning"),
                InProgressCount = batches.Count(b => b.Status == "InProgress"),
                CompletedCount = batches.Count(b => b.Status == "Completed"),
                CancelledCount = batches.Count(b => b.Status == "Cancelled"),
                TotalPatientsExamined = batches.Sum(b => b.PatientsExamined),
                TotalTrainees = batches.Sum(b => b.TraineesCount),
                TotalTechniquesTransferred = batches.Sum(b => b.TechniquesTransferred),
                TotalBudget = batches.Sum(b => b.Budget),
                TotalActualCost = batches.Sum(b => b.ActualCost),
                TypeBreakdown = typeBreakdown,
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new ClinicalGuidanceStatsDto();
        }
    }
}
