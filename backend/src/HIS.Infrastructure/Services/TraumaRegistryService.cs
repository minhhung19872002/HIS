using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class TraumaRegistryService : ITraumaRegistryService
{
    private readonly HISDbContext _context;

    public TraumaRegistryService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<TraumaCaseDto>> SearchCasesAsync(TraumaCaseSearchDto? filter = null)
    {
        try
        {
            var query = _context.TraumaCases.Where(c => !c.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(c =>
                        c.CaseCode.ToLower().Contains(kw) ||
                        c.PatientName.ToLower().Contains(kw));
                }
                if (!string.IsNullOrEmpty(filter.InjuryType))
                    query = query.Where(c => c.InjuryType == filter.InjuryType);
                if (!string.IsNullOrEmpty(filter.TriageCategory))
                    query = query.Where(c => c.TriageCategory == filter.TriageCategory);
                if (!string.IsNullOrEmpty(filter.Outcome))
                    query = query.Where(c => c.Outcome == filter.Outcome);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(c => c.InjuryDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(c => c.InjuryDate <= to.AddDays(1));
            }

            return await query
                .OrderByDescending(c => c.CreatedAt)
                .Take(200)
                .Select(c => MapToDto(c))
                .ToListAsync();
        }
        catch { return new List<TraumaCaseDto>(); }
    }

    public async Task<TraumaCaseDto?> GetByIdAsync(Guid id)
    {
        try
        {
            var c = await _context.TraumaCases.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
            if (c == null) return null;
            return MapToDto(c);
        }
        catch { return null; }
    }

    public async Task<TraumaCaseDto> CreateCaseAsync(CreateTraumaCaseDto dto)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _context.TraumaCases.CountAsync(c => c.CreatedAt.Year == year) + 1;

        var entity = new TraumaCase
        {
            Id = Guid.NewGuid(),
            CaseCode = $"CT-{year}-{count:D4}",
            PatientId = dto.PatientId ?? Guid.Empty,
            PatientName = dto.PatientName ?? "",
            DateOfBirth = DateTime.TryParse(dto.DateOfBirth, out var dob) ? dob : null,
            Gender = dto.Gender,
            AdmissionDate = DateTime.TryParse(dto.AdmissionDate, out var ad) ? ad : DateTime.UtcNow,
            InjuryDate = DateTime.TryParse(dto.InjuryDate, out var id2) ? id2 : DateTime.UtcNow,
            InjuryType = dto.InjuryType ?? "other",
            InjuryMechanism = dto.InjuryMechanism,
            InjuryLocation = dto.InjuryLocation,
            InjurySeverityScore = dto.InjurySeverityScore,
            RevisedTraumaScore = dto.RevisedTraumaScore,
            GlasgowComaScale = dto.GlasgowComaScale,
            TriageCategory = dto.TriageCategory,
            Intentionality = dto.Intentionality,
            AlcoholInvolved = dto.AlcoholInvolved ?? false,
            TransportMode = dto.TransportMode,
            PreHospitalTime = dto.PreHospitalTime,
            SurgeryRequired = dto.SurgeryRequired ?? false,
            IcuAdmission = dto.IcuAdmission ?? false,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.TraumaCases.Add(entity);
        await _context.SaveChangesAsync();

        return MapToDto(entity);
    }

    public async Task<TraumaCaseDto> UpdateCaseAsync(Guid id, CreateTraumaCaseDto dto)
    {
        var entity = await _context.TraumaCases.FindAsync(id)
            ?? throw new InvalidOperationException("Trauma case not found");

        if (dto.InjuryType != null) entity.InjuryType = dto.InjuryType;
        if (dto.InjuryMechanism != null) entity.InjuryMechanism = dto.InjuryMechanism;
        if (dto.InjuryLocation != null) entity.InjuryLocation = dto.InjuryLocation;
        if (dto.InjurySeverityScore.HasValue) entity.InjurySeverityScore = dto.InjurySeverityScore.Value;
        if (dto.RevisedTraumaScore.HasValue) entity.RevisedTraumaScore = dto.RevisedTraumaScore.Value;
        if (dto.GlasgowComaScale.HasValue) entity.GlasgowComaScale = dto.GlasgowComaScale.Value;
        if (dto.TriageCategory != null) entity.TriageCategory = dto.TriageCategory;
        if (dto.SurgeryRequired.HasValue) entity.SurgeryRequired = dto.SurgeryRequired.Value;
        if (dto.IcuAdmission.HasValue) entity.IcuAdmission = dto.IcuAdmission.Value;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToDto(entity);
    }

    public async Task<TraumaStatsDto> GetStatsAsync()
    {
        try
        {
            var cases = await _context.TraumaCases.Where(c => !c.IsDeleted).ToListAsync();
            var total = cases.Count;
            var died = cases.Count(c => c.Outcome == "died");
            var withLos = cases.Where(c => c.LengthOfStay.HasValue).Select(c => c.LengthOfStay!.Value).ToList();

            return new TraumaStatsDto
            {
                TotalCases = total,
                SurgeryCount = cases.Count(c => c.SurgeryRequired),
                IcuCount = cases.Count(c => c.IcuAdmission),
                MortalityRate = total > 0 ? Math.Round((double)died / total * 100, 1) : 0,
                AvgLengthOfStay = withLos.Count > 0 ? Math.Round(withLos.Average(), 1) : 0,
                InjuryTypeBreakdown = cases.GroupBy(c => c.InjuryType)
                    .Select(g => new InjuryTypeBreakdownDto { InjuryType = g.Key, Count = g.Count() })
                    .ToList(),
                TriageCategoryBreakdown = cases.Where(c => c.TriageCategory != null).GroupBy(c => c.TriageCategory!)
                    .Select(g => new TriageCategoryBreakdownDto { Category = g.Key, Count = g.Count() })
                    .ToList(),
            };
        }
        catch { return new TraumaStatsDto(); }
    }

    public async Task<TraumaOutcomeReportDto> GetOutcomeReportAsync()
    {
        try
        {
            var cases = await _context.TraumaCases.Where(c => !c.IsDeleted && c.Outcome != null).ToListAsync();
            var withIss = cases.Where(c => c.InjurySeverityScore.HasValue).Select(c => (double)c.InjurySeverityScore!.Value).ToList();
            var withGcs = cases.Where(c => c.GlasgowComaScale.HasValue).Select(c => (double)c.GlasgowComaScale!.Value).ToList();
            var withPht = cases.Where(c => c.PreHospitalTime.HasValue).Select(c => (double)c.PreHospitalTime!.Value).ToList();

            return new TraumaOutcomeReportDto
            {
                TotalCases = cases.Count,
                DischargedCount = cases.Count(c => c.Outcome == "discharged"),
                TransferredCount = cases.Count(c => c.Outcome == "transferred"),
                DiedCount = cases.Count(c => c.Outcome == "died"),
                AbscondedCount = cases.Count(c => c.Outcome == "absconded"),
                AvgIss = withIss.Count > 0 ? Math.Round(withIss.Average(), 1) : 0,
                AvgGcs = withGcs.Count > 0 ? Math.Round(withGcs.Average(), 1) : 0,
                AvgPreHospitalTime = withPht.Count > 0 ? Math.Round(withPht.Average(), 1) : 0,
            };
        }
        catch { return new TraumaOutcomeReportDto(); }
    }

    private static TraumaCaseDto MapToDto(TraumaCase c) => new()
    {
        Id = c.Id,
        CaseCode = c.CaseCode,
        PatientId = c.PatientId,
        PatientName = c.PatientName,
        DateOfBirth = c.DateOfBirth?.ToString("yyyy-MM-dd"),
        Gender = c.Gender,
        AdmissionDate = c.AdmissionDate?.ToString("yyyy-MM-ddTHH:mm:ss"),
        InjuryDate = c.InjuryDate?.ToString("yyyy-MM-ddTHH:mm:ss"),
        InjuryType = c.InjuryType,
        InjuryMechanism = c.InjuryMechanism,
        InjuryLocation = c.InjuryLocation,
        InjurySeverityScore = c.InjurySeverityScore,
        RevisedTraumaScore = c.RevisedTraumaScore,
        GlasgowComaScale = c.GlasgowComaScale,
        TriageCategory = c.TriageCategory,
        Intentionality = c.Intentionality,
        AlcoholInvolved = c.AlcoholInvolved,
        TransportMode = c.TransportMode,
        PreHospitalTime = c.PreHospitalTime,
        SurgeryRequired = c.SurgeryRequired,
        IcuAdmission = c.IcuAdmission,
        VentilatorDays = c.VentilatorDays,
        LengthOfStay = c.LengthOfStay,
        Outcome = c.Outcome,
        DischargeDate = c.DischargeDate?.ToString("yyyy-MM-dd"),
        Notes = c.Notes,
    };
}
