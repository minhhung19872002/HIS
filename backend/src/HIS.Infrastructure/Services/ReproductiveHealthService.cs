using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class ReproductiveHealthService : IReproductiveHealthService
{
    private readonly HISDbContext _context;

    public ReproductiveHealthService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<PrenatalRecordDto>> SearchPrenatalAsync(PrenatalSearchDto? filter = null)
    {
        try
        {
            var query = _context.PrenatalRecords.Where(r => !r.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(r =>
                        r.RecordCode.ToLower().Contains(kw) ||
                        r.PatientName.ToLower().Contains(kw));
                }
                if (!string.IsNullOrEmpty(filter.RiskLevel))
                    query = query.Where(r => r.RiskLevel == filter.RiskLevel);
                if (filter.Status.HasValue)
                    query = query.Where(r => r.Status == filter.Status.Value);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(r => r.CreatedAt >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(r => r.CreatedAt <= to.AddDays(1));
            }

            return await query
                .OrderByDescending(r => r.CreatedAt)
                .Take(200)
                .Select(r => new PrenatalRecordDto
                {
                    Id = r.Id,
                    RecordCode = r.RecordCode,
                    PatientId = r.PatientId,
                    PatientName = r.PatientName,
                    DateOfBirth = r.DateOfBirth.HasValue ? r.DateOfBirth.Value.ToString("yyyy-MM-dd") : null,
                    Gravida = r.Gravida,
                    Para = r.Para,
                    GestationalAge = r.GestationalAge,
                    ExpectedDeliveryDate = r.ExpectedDeliveryDate.HasValue ? r.ExpectedDeliveryDate.Value.ToString("yyyy-MM-dd") : null,
                    BloodType = r.BloodType,
                    RhFactor = r.RhFactor,
                    CurrentWeight = r.CurrentWeight,
                    BloodPressureSystolic = r.BloodPressureSystolic,
                    BloodPressureDiastolic = r.BloodPressureDiastolic,
                    FetalHeartRate = r.FetalHeartRate,
                    FundalHeight = r.FundalHeight,
                    RiskLevel = r.RiskLevel,
                    RiskFactors = r.RiskFactors,
                    NextAppointment = r.NextAppointment.HasValue ? r.NextAppointment.Value.ToString("yyyy-MM-dd") : null,
                    Status = r.Status,
                    Notes = r.Notes,
                })
                .ToListAsync();
        }
        catch { return new List<PrenatalRecordDto>(); }
    }

    public async Task<PrenatalRecordDetailDto?> GetPrenatalByIdAsync(Guid id)
    {
        try
        {
            var r = await _context.PrenatalRecords.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
            if (r == null) return null;

            return new PrenatalRecordDetailDto
            {
                Id = r.Id,
                RecordCode = r.RecordCode,
                PatientId = r.PatientId,
                PatientName = r.PatientName,
                DateOfBirth = r.DateOfBirth?.ToString("yyyy-MM-dd"),
                Gravida = r.Gravida,
                Para = r.Para,
                GestationalAge = r.GestationalAge,
                ExpectedDeliveryDate = r.ExpectedDeliveryDate?.ToString("yyyy-MM-dd"),
                LastMenstrualPeriod = r.LastMenstrualPeriod?.ToString("yyyy-MM-dd"),
                BloodType = r.BloodType,
                RhFactor = r.RhFactor,
                CurrentWeight = r.CurrentWeight,
                PrePregnancyWeight = r.PrePregnancyWeight,
                BloodPressureSystolic = r.BloodPressureSystolic,
                BloodPressureDiastolic = r.BloodPressureDiastolic,
                FetalHeartRate = r.FetalHeartRate,
                FundalHeight = r.FundalHeight,
                RiskLevel = r.RiskLevel,
                RiskFactors = r.RiskFactors,
                ScreeningResults = r.ScreeningResults,
                NextAppointment = r.NextAppointment?.ToString("yyyy-MM-dd"),
                Status = r.Status,
                Notes = r.Notes,
            };
        }
        catch { return null; }
    }

    public async Task<PrenatalRecordDto> CreatePrenatalAsync(CreatePrenatalRecordDto dto)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _context.PrenatalRecords.CountAsync(r => r.CreatedAt.Year == year) + 1;

        var entity = new PrenatalRecord
        {
            Id = Guid.NewGuid(),
            RecordCode = $"TS-{year}-{count:D4}",
            PatientId = dto.PatientId ?? Guid.Empty,
            PatientName = dto.PatientName ?? "",
            DateOfBirth = DateTime.TryParse(dto.DateOfBirth, out var dob) ? dob : null,
            Gravida = dto.Gravida ?? 1,
            Para = dto.Para ?? 0,
            GestationalAge = dto.GestationalAge ?? 0,
            ExpectedDeliveryDate = DateTime.TryParse(dto.ExpectedDeliveryDate, out var edd) ? edd : null,
            LastMenstrualPeriod = DateTime.TryParse(dto.LastMenstrualPeriod, out var lmp) ? lmp : null,
            BloodType = dto.BloodType,
            RhFactor = dto.RhFactor,
            CurrentWeight = dto.CurrentWeight,
            PrePregnancyWeight = dto.PrePregnancyWeight,
            BloodPressureSystolic = dto.BloodPressureSystolic,
            BloodPressureDiastolic = dto.BloodPressureDiastolic,
            FetalHeartRate = dto.FetalHeartRate,
            FundalHeight = dto.FundalHeight,
            RiskLevel = dto.RiskLevel ?? "low",
            RiskFactors = dto.RiskFactors,
            NextAppointment = DateTime.TryParse(dto.NextAppointment, out var na) ? na : null,
            Status = 0,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.PrenatalRecords.Add(entity);
        await _context.SaveChangesAsync();

        return new PrenatalRecordDto { Id = entity.Id, RecordCode = entity.RecordCode, PatientName = entity.PatientName, Status = entity.Status, RiskLevel = entity.RiskLevel };
    }

    public async Task<PrenatalRecordDto> UpdatePrenatalAsync(Guid id, CreatePrenatalRecordDto dto)
    {
        var entity = await _context.PrenatalRecords.FindAsync(id)
            ?? throw new InvalidOperationException("Prenatal record not found");

        if (dto.GestationalAge.HasValue) entity.GestationalAge = dto.GestationalAge.Value;
        if (dto.CurrentWeight.HasValue) entity.CurrentWeight = dto.CurrentWeight.Value;
        if (dto.BloodPressureSystolic.HasValue) entity.BloodPressureSystolic = dto.BloodPressureSystolic.Value;
        if (dto.BloodPressureDiastolic.HasValue) entity.BloodPressureDiastolic = dto.BloodPressureDiastolic.Value;
        if (dto.FetalHeartRate.HasValue) entity.FetalHeartRate = dto.FetalHeartRate.Value;
        if (dto.FundalHeight.HasValue) entity.FundalHeight = dto.FundalHeight.Value;
        if (dto.RiskLevel != null) entity.RiskLevel = dto.RiskLevel;
        if (dto.RiskFactors != null) entity.RiskFactors = dto.RiskFactors;
        if (DateTime.TryParse(dto.NextAppointment, out var na)) entity.NextAppointment = na;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new PrenatalRecordDto { Id = entity.Id, RecordCode = entity.RecordCode, PatientName = entity.PatientName, Status = entity.Status, RiskLevel = entity.RiskLevel };
    }

    public async Task<List<FamilyPlanningRecordDto>> SearchFamilyPlanningAsync(FamilyPlanningSearchDto? filter = null)
    {
        try
        {
            var query = _context.FamilyPlanningRecords.Where(r => !r.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(r => r.RecordCode.ToLower().Contains(kw) || r.PatientName.ToLower().Contains(kw));
                }
                if (!string.IsNullOrEmpty(filter.Method))
                    query = query.Where(r => r.Method == filter.Method);
                if (filter.Status.HasValue)
                    query = query.Where(r => r.Status == filter.Status.Value);
            }

            return await query
                .OrderByDescending(r => r.CreatedAt)
                .Take(200)
                .Select(r => new FamilyPlanningRecordDto
                {
                    Id = r.Id,
                    RecordCode = r.RecordCode,
                    PatientId = r.PatientId,
                    PatientName = r.PatientName,
                    DateOfBirth = r.DateOfBirth.HasValue ? r.DateOfBirth.Value.ToString("yyyy-MM-dd") : null,
                    Gender = r.Gender,
                    Method = r.Method,
                    StartDate = r.StartDate.HasValue ? r.StartDate.Value.ToString("yyyy-MM-dd") : null,
                    ExpiryDate = r.ExpiryDate.HasValue ? r.ExpiryDate.Value.ToString("yyyy-MM-dd") : null,
                    FollowUpDate = r.FollowUpDate.HasValue ? r.FollowUpDate.Value.ToString("yyyy-MM-dd") : null,
                    Provider = r.Provider,
                    FacilityName = r.FacilityName,
                    SideEffects = r.SideEffects,
                    Status = r.Status,
                    Notes = r.Notes,
                })
                .ToListAsync();
        }
        catch { return new List<FamilyPlanningRecordDto>(); }
    }

    public async Task<FamilyPlanningRecordDto> CreateFamilyPlanningAsync(CreateFamilyPlanningRecordDto dto)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _context.FamilyPlanningRecords.CountAsync(r => r.CreatedAt.Year == year) + 1;

        var entity = new FamilyPlanningRecord
        {
            Id = Guid.NewGuid(),
            RecordCode = $"KHHGD-{year}-{count:D4}",
            PatientId = dto.PatientId ?? Guid.Empty,
            PatientName = dto.PatientName ?? "",
            DateOfBirth = DateTime.TryParse(dto.DateOfBirth, out var dob) ? dob : null,
            Gender = dto.Gender,
            Method = dto.Method ?? "none",
            StartDate = DateTime.TryParse(dto.StartDate, out var sd) ? sd : DateTime.UtcNow,
            ExpiryDate = DateTime.TryParse(dto.ExpiryDate, out var ed) ? ed : null,
            FollowUpDate = DateTime.TryParse(dto.FollowUpDate, out var fd) ? fd : null,
            Provider = dto.Provider,
            FacilityName = dto.FacilityName,
            Status = 0,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.FamilyPlanningRecords.Add(entity);
        await _context.SaveChangesAsync();

        return new FamilyPlanningRecordDto { Id = entity.Id, RecordCode = entity.RecordCode, PatientName = entity.PatientName, Method = entity.Method, Status = entity.Status };
    }

    public async Task<FamilyPlanningRecordDto> UpdateFamilyPlanningAsync(Guid id, CreateFamilyPlanningRecordDto dto)
    {
        var entity = await _context.FamilyPlanningRecords.FindAsync(id)
            ?? throw new InvalidOperationException("Family planning record not found");

        if (dto.Method != null) entity.Method = dto.Method;
        if (DateTime.TryParse(dto.ExpiryDate, out var ed)) entity.ExpiryDate = ed;
        if (DateTime.TryParse(dto.FollowUpDate, out var fd)) entity.FollowUpDate = fd;
        if (dto.Provider != null) entity.Provider = dto.Provider;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new FamilyPlanningRecordDto { Id = entity.Id, RecordCode = entity.RecordCode, PatientName = entity.PatientName, Method = entity.Method, Status = entity.Status };
    }

    public async Task<ReproductiveHealthStatsDto> GetStatsAsync()
    {
        try
        {
            var prenatal = await _context.PrenatalRecords.Where(r => !r.IsDeleted).ToListAsync();
            var fp = await _context.FamilyPlanningRecords.Where(r => !r.IsDeleted).ToListAsync();

            return new ReproductiveHealthStatsDto
            {
                TotalPrenatal = prenatal.Count,
                ActivePrenatal = prenatal.Count(r => r.Status == 0),
                HighRiskPrenatal = prenatal.Count(r => r.RiskLevel == "high"),
                TotalFamilyPlanning = fp.Count,
                ActiveFamilyPlanning = fp.Count(r => r.Status == 0),
                MethodBreakdown = fp.GroupBy(r => r.Method)
                    .Select(g => new MethodBreakdownDto { Method = g.Key, Count = g.Count() })
                    .ToList(),
            };
        }
        catch { return new ReproductiveHealthStatsDto(); }
    }

    public async Task<List<PrenatalRecordDto>> GetHighRiskPregnanciesAsync()
    {
        try
        {
            return await _context.PrenatalRecords
                .Where(r => !r.IsDeleted && r.Status == 0 && r.RiskLevel == "high")
                .OrderByDescending(r => r.CreatedAt)
                .Take(100)
                .Select(r => new PrenatalRecordDto
                {
                    Id = r.Id,
                    RecordCode = r.RecordCode,
                    PatientId = r.PatientId,
                    PatientName = r.PatientName,
                    GestationalAge = r.GestationalAge,
                    RiskLevel = r.RiskLevel,
                    RiskFactors = r.RiskFactors,
                    Status = r.Status,
                })
                .ToListAsync();
        }
        catch { return new List<PrenatalRecordDto>(); }
    }
}
