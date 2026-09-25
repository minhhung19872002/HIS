using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// QA-R12: everything the flag evaluation of ONE lab line needs about the patient and the configured ranges —
/// sex, age at sample time, the service's LabReferenceRanges (age/sex rows) and LabCriticalValueConfigs rows.
/// Loaded once per line and shared by the manual entry and both analyzer paths so they flag identically.
/// </summary>
public sealed class LabRangeContext
{
    public Guid? PatientId { get; init; }
    public int? Gender { get; init; }
    public int? AgeDays { get; init; }
    public bool SingleParameterService { get; init; }
    public List<LabReferenceRange> Ranges { get; init; } = new();
    public List<LabCriticalValueConfig> Criticals { get; init; } = new();

    public static async Task<LabRangeContext> LoadAsync(HISDbContext db, ServiceRequestDetail detail)
    {
        var patient = await db.ServiceRequests.AsNoTracking().Where(r => r.Id == detail.ServiceRequestId)
            .Select(r => new
            {
                r.MedicalRecord.PatientId,
                Gender = (int?)r.MedicalRecord.Patient.Gender,
                r.MedicalRecord.Patient.DateOfBirth,
                r.MedicalRecord.Patient.YearOfBirth,
            })
            .FirstOrDefaultAsync();
        var ranges = await db.LabReferenceRanges.AsNoTracking()
            .Where(r => r.ServiceId == detail.ServiceId && r.IsActive && !r.IsDeleted).ToListAsync();
        var criticals = await db.LabCriticalValueConfigs.AsNoTracking()
            .Where(c => c.ServiceId == detail.ServiceId && c.IsActive && !c.IsDeleted).ToListAsync();
        var parameterCount = await db.LisTestParameters
            .CountAsync(p => p.ServiceId == detail.ServiceId && p.IsActive && !p.IsDeleted);
        return new LabRangeContext
        {
            PatientId = patient?.PatientId,
            Gender = patient?.Gender,
            AgeDays = patient == null ? null
                : LabFlagEvaluator.AgeInDays(patient.DateOfBirth, patient.YearOfBirth, detail.SampleCollectedAt ?? DateTime.Now),
            SingleParameterService = parameterCount == 1, // 0 sub-parameters: rows must match by TestCode (a panel configured only in LabReferenceRanges)
            Ranges = ranges,
            Criticals = criticals,
        };
    }

    /// <summary>Reference range: matching age/sex row first, else the catalog range (previous behaviour).</summary>
    public (decimal? Min, decimal? Max) Range(LisTestParameter? cat, string? parameterCode, string? unit)
        => LabFlagEvaluator.ResolveRange(cat, Gender, Ranges, AgeDays, unit,
            new[] { parameterCode, cat?.Code, cat?.Hl7Code }, SingleParameterService);

    /// <summary>Critical thresholds: configured row bound by bound, else the given (catalog) values.</summary>
    public (decimal? Low, decimal? High) Critical(LisTestParameter? cat, string? parameterCode, decimal? catalogLow, decimal? catalogHigh)
        => LabFlagEvaluator.ResolveCritical(catalogLow, catalogHigh, Criticals,
            new[] { parameterCode, cat?.Code, cat?.Hl7Code }, SingleParameterService, Gender, AgeDays);
}
