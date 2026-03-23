using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class TraditionalMedicineService : ITraditionalMedicineService
{
    private readonly HISDbContext _context;

    public TraditionalMedicineService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<TraditionalMedicineTreatmentDto>> SearchTreatmentsAsync(TraditionalMedicineSearchDto? filter = null)
    {
        try
        {
            var query = _context.TraditionalMedicineTreatments.Where(t => !t.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(t =>
                        t.TreatmentCode.ToLower().Contains(kw) ||
                        t.PatientName.ToLower().Contains(kw) ||
                        (t.DiagnosisTCM != null && t.DiagnosisTCM.ToLower().Contains(kw)));
                }
                if (!string.IsNullOrEmpty(filter.TreatmentType))
                    query = query.Where(t => t.TreatmentType == filter.TreatmentType);
                if (filter.Status.HasValue)
                    query = query.Where(t => t.Status == filter.Status.Value);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(t => t.StartDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(t => t.StartDate <= to.AddDays(1));
            }

            return await query
                .OrderByDescending(t => t.CreatedAt)
                .Take(200)
                .Select(t => new TraditionalMedicineTreatmentDto
                {
                    Id = t.Id,
                    TreatmentCode = t.TreatmentCode,
                    PatientName = t.PatientName,
                    PatientId = t.PatientId,
                    TreatmentType = t.TreatmentType,
                    DiagnosisTCM = t.DiagnosisTCM,
                    DiagnosisWestern = t.DiagnosisWestern,
                    SessionNumber = t.SessionNumber,
                    TreatmentPlan = t.TreatmentPlan,
                    Practitioner = t.Practitioner,
                    Status = t.Status,
                    StartDate = t.StartDate.HasValue ? t.StartDate.Value.ToString("yyyy-MM-dd") : null,
                    EndDate = t.EndDate.HasValue ? t.EndDate.Value.ToString("yyyy-MM-dd") : null,
                    Notes = t.Notes,
                })
                .ToListAsync();
        }
        catch { return new List<TraditionalMedicineTreatmentDto>(); }
    }

    public async Task<TraditionalMedicineTreatmentDetailDto?> GetByIdAsync(Guid id)
    {
        try
        {
            var t = await _context.TraditionalMedicineTreatments
                .Include(x => x.HerbalPrescriptions.Where(h => !h.IsDeleted))
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
            if (t == null) return null;

            return new TraditionalMedicineTreatmentDetailDto
            {
                Id = t.Id,
                TreatmentCode = t.TreatmentCode,
                PatientName = t.PatientName,
                PatientId = t.PatientId,
                TreatmentType = t.TreatmentType,
                DiagnosisTCM = t.DiagnosisTCM,
                DiagnosisWestern = t.DiagnosisWestern,
                SessionNumber = t.SessionNumber,
                TreatmentPlan = t.TreatmentPlan,
                Practitioner = t.Practitioner,
                Status = t.Status,
                StartDate = t.StartDate?.ToString("yyyy-MM-dd"),
                EndDate = t.EndDate?.ToString("yyyy-MM-dd"),
                Notes = t.Notes,
                HerbalPrescriptions = t.HerbalPrescriptions.Select(h => new HerbalPrescriptionDto
                {
                    Id = h.Id,
                    TreatmentId = h.TreatmentId,
                    PrescriptionCode = h.PrescriptionCode,
                    HerbalFormula = h.HerbalFormula,
                    Ingredients = h.Ingredients,
                    Dosage = h.Dosage,
                    Instructions = h.Instructions,
                    Duration = h.Duration,
                    Quantity = h.Quantity,
                    Notes = h.Notes,
                }).ToList(),
            };
        }
        catch { return null; }
    }

    public async Task<TraditionalMedicineTreatmentDto> CreateTreatmentAsync(CreateTraditionalMedicineTreatmentDto dto)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _context.TraditionalMedicineTreatments.CountAsync(t => t.CreatedAt.Year == year) + 1;

        var entity = new TraditionalMedicineTreatment
        {
            Id = Guid.NewGuid(),
            TreatmentCode = $"YHCT-{year}-{count:D4}",
            PatientId = dto.PatientId ?? Guid.Empty,
            PatientName = dto.PatientName ?? "",
            TreatmentType = dto.TreatmentType ?? "combined",
            DiagnosisTCM = dto.DiagnosisTCM,
            DiagnosisWestern = dto.DiagnosisWestern,
            SessionNumber = dto.SessionNumber ?? 1,
            TreatmentPlan = dto.TreatmentPlan,
            Practitioner = dto.Practitioner,
            Status = 0,
            StartDate = DateTime.TryParse(dto.StartDate, out var sd) ? sd : DateTime.UtcNow,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.TraditionalMedicineTreatments.Add(entity);
        await _context.SaveChangesAsync();

        return new TraditionalMedicineTreatmentDto
        {
            Id = entity.Id,
            TreatmentCode = entity.TreatmentCode,
            PatientName = entity.PatientName,
            PatientId = entity.PatientId,
            TreatmentType = entity.TreatmentType,
            Status = entity.Status,
        };
    }

    public async Task<TraditionalMedicineTreatmentDto> UpdateTreatmentAsync(Guid id, CreateTraditionalMedicineTreatmentDto dto)
    {
        var entity = await _context.TraditionalMedicineTreatments.FindAsync(id)
            ?? throw new InvalidOperationException("Treatment not found");

        if (dto.TreatmentType != null) entity.TreatmentType = dto.TreatmentType;
        if (dto.DiagnosisTCM != null) entity.DiagnosisTCM = dto.DiagnosisTCM;
        if (dto.DiagnosisWestern != null) entity.DiagnosisWestern = dto.DiagnosisWestern;
        if (dto.SessionNumber.HasValue) entity.SessionNumber = dto.SessionNumber.Value;
        if (dto.TreatmentPlan != null) entity.TreatmentPlan = dto.TreatmentPlan;
        if (dto.Practitioner != null) entity.Practitioner = dto.Practitioner;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new TraditionalMedicineTreatmentDto
        {
            Id = entity.Id,
            TreatmentCode = entity.TreatmentCode,
            PatientName = entity.PatientName,
            PatientId = entity.PatientId,
            TreatmentType = entity.TreatmentType,
            Status = entity.Status,
        };
    }

    public async Task<HerbalPrescriptionDto> CreateHerbalPrescriptionAsync(CreateHerbalPrescriptionDto dto)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _context.HerbalPrescriptions.CountAsync(h => h.CreatedAt.Year == year) + 1;

        var entity = new HerbalPrescription
        {
            Id = Guid.NewGuid(),
            TreatmentId = dto.TreatmentId ?? Guid.Empty,
            PrescriptionCode = $"BT-{year}-{count:D4}",
            HerbalFormula = dto.HerbalFormula,
            Ingredients = dto.Ingredients,
            Dosage = dto.Dosage,
            Instructions = dto.Instructions,
            Duration = dto.Duration ?? 7,
            Quantity = dto.Quantity ?? 1,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.HerbalPrescriptions.Add(entity);
        await _context.SaveChangesAsync();

        return new HerbalPrescriptionDto
        {
            Id = entity.Id,
            TreatmentId = entity.TreatmentId,
            PrescriptionCode = entity.PrescriptionCode,
            HerbalFormula = entity.HerbalFormula,
            Ingredients = entity.Ingredients,
            Dosage = entity.Dosage,
            Instructions = entity.Instructions,
            Duration = entity.Duration,
            Quantity = entity.Quantity,
            Notes = entity.Notes,
        };
    }

    public async Task<List<HerbalPrescriptionDto>> GetHerbalPrescriptionsAsync(Guid treatmentId)
    {
        try
        {
            return await _context.HerbalPrescriptions
                .Where(h => h.TreatmentId == treatmentId && !h.IsDeleted)
                .OrderByDescending(h => h.CreatedAt)
                .Select(h => new HerbalPrescriptionDto
                {
                    Id = h.Id,
                    TreatmentId = h.TreatmentId,
                    PrescriptionCode = h.PrescriptionCode,
                    HerbalFormula = h.HerbalFormula,
                    Ingredients = h.Ingredients,
                    Dosage = h.Dosage,
                    Instructions = h.Instructions,
                    Duration = h.Duration,
                    Quantity = h.Quantity,
                    Notes = h.Notes,
                })
                .ToListAsync();
        }
        catch { return new List<HerbalPrescriptionDto>(); }
    }

    public async Task<TraditionalMedicineStatsDto> GetStatsAsync()
    {
        try
        {
            var treatments = await _context.TraditionalMedicineTreatments.Where(t => !t.IsDeleted).ToListAsync();
            return new TraditionalMedicineStatsDto
            {
                TotalTreatments = treatments.Count,
                ActiveCount = treatments.Count(t => t.Status == 0),
                CompletedCount = treatments.Count(t => t.Status == 1),
                TreatmentTypeBreakdown = treatments.GroupBy(t => t.TreatmentType)
                    .Select(g => new TreatmentTypeBreakdownDto { TreatmentType = g.Key, Count = g.Count() })
                    .ToList(),
            };
        }
        catch { return new TraditionalMedicineStatsDto(); }
    }

    public async Task<TraditionalMedicineTreatmentDto> CompleteTreatmentAsync(Guid id)
    {
        var entity = await _context.TraditionalMedicineTreatments.FindAsync(id)
            ?? throw new InvalidOperationException("Treatment not found");

        entity.Status = 1; // completed
        entity.EndDate = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new TraditionalMedicineTreatmentDto
        {
            Id = entity.Id,
            TreatmentCode = entity.TreatmentCode,
            PatientName = entity.PatientName,
            PatientId = entity.PatientId,
            TreatmentType = entity.TreatmentType,
            Status = entity.Status,
        };
    }
}
