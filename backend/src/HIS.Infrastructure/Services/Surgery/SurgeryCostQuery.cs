using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services.Surgery;

/// <summary>Billed cost of one surgery: service lines (with their BHYT split) + medicines/supplies used.</summary>
internal sealed record SurgeryCost(decimal ServiceAmount, decimal ServiceInsurance, decimal ServicePatient, decimal MedicineAmount);

/// <summary>
/// QA-R11: one place that prices a surgery — used by GET service-cost (one case) and by the surgery list
/// (a whole page in a fixed number of grouped queries, no N+1). Rules:
///  - service lines = non-cancelled ServiceRequestDetails of requests tagged with the SurgeryRequestId,
///    plus the PTTT fee itself (ordered on the record when the request was created, not tagged): the first
///    non-cancelled line of SurgeryServiceId on the record from RequestDate − 5 min on;
///  - medicines/supplies = billed SurgeryMedicineItems / SurgerySupplyItems (not "hao phí" = PaymentObject 3,
///    not inside a PTTT package).
/// </summary>
internal static class SurgeryCostQuery
{
    public static async Task<Dictionary<Guid, SurgeryCost>> GetAsync(HISDbContext context, IReadOnlyCollection<Guid> surgeryIds)
    {
        var result = new Dictionary<Guid, SurgeryCost>();
        if (surgeryIds.Count == 0) return result;
        var ids = surgeryIds.Distinct().ToList();

        var tagged = await context.ServiceRequestDetails.AsNoTracking()
            .Where(d => !d.IsDeleted && d.Status != 3 && d.ServiceRequest.SurgeryRequestId != null
                        && ids.Contains(d.ServiceRequest.SurgeryRequestId.Value)
                        && d.ServiceRequest.Status != 4 && !d.ServiceRequest.IsDeleted)
            .GroupBy(d => d.ServiceRequest.SurgeryRequestId!.Value)
            .Select(g => new { Id = g.Key, Amount = g.Sum(x => x.Amount), Ins = g.Sum(x => x.InsuranceAmount), Pat = g.Sum(x => x.PatientAmount) })
            .ToListAsync();

        var surgeries = await context.SurgeryRequests.AsNoTracking()
            .Where(r => ids.Contains(r.Id) && r.SurgeryServiceId != null && r.MedicalRecordId != null)
            .Select(r => new { r.Id, ServiceId = r.SurgeryServiceId!.Value, RecordId = r.MedicalRecordId!.Value, r.RequestDate })
            .ToListAsync();
        var feeServiceIds = surgeries.Select(s => s.ServiceId).Distinct().ToList();
        var feeRecordIds = surgeries.Select(s => s.RecordId).Distinct().ToList();
        var feeCandidates = await context.ServiceRequestDetails.AsNoTracking()
            .Where(d => !d.IsDeleted && d.Status != 3 && feeServiceIds.Contains(d.ServiceId)
                        && feeRecordIds.Contains(d.ServiceRequest.MedicalRecordId) && d.ServiceRequest.SurgeryRequestId == null
                        && d.ServiceRequest.Status != 4 && !d.ServiceRequest.IsDeleted)
            .Select(d => new { d.ServiceId, d.ServiceRequest.MedicalRecordId, d.ServiceRequest.RequestDate, d.Amount, d.InsuranceAmount, d.PatientAmount })
            .ToListAsync();

        var meds = await context.SurgeryMedicineItems.AsNoTracking()
            .Where(m => ids.Contains(m.SurgeryId) && !m.IsDeleted && m.PaymentObject != 3 && !m.IsInPackage)
            .GroupBy(m => m.SurgeryId).Select(g => new { Id = g.Key, Amount = g.Sum(x => x.Amount) })
            .ToListAsync();
        var sups = await context.SurgerySupplyItems.AsNoTracking()
            .Where(s => ids.Contains(s.SurgeryId) && !s.IsDeleted && s.PaymentObject != 3 && !s.IsInPackage)
            .GroupBy(s => s.SurgeryId).Select(g => new { Id = g.Key, Amount = g.Sum(x => x.Amount) })
            .ToListAsync();

        foreach (var id in ids)
        {
            var t = tagged.FirstOrDefault(x => x.Id == id);
            decimal amount = t?.Amount ?? 0, ins = t?.Ins ?? 0, pat = t?.Pat ?? 0;
            var s = surgeries.FirstOrDefault(x => x.Id == id);
            if (s != null)
            {
                var from = s.RequestDate.AddMinutes(-5);
                var fee = feeCandidates
                    .Where(c => c.ServiceId == s.ServiceId && c.MedicalRecordId == s.RecordId && c.RequestDate >= from)
                    .OrderBy(c => c.RequestDate)
                    .FirstOrDefault();
                if (fee != null) { amount += fee.Amount; ins += fee.InsuranceAmount; pat += fee.PatientAmount; }
            }
            var medicine = (meds.FirstOrDefault(x => x.Id == id)?.Amount ?? 0) + (sups.FirstOrDefault(x => x.Id == id)?.Amount ?? 0);
            result[id] = new SurgeryCost(amount, ins, pat, medicine);
        }
        return result;
    }
}
