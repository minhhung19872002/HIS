using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// TT46: "bản cũ" snapshot of a medical record at lock time — main content + document counts + active digital
/// signatures, enough to compare against later amendments (per-document snapshot = later phase).
/// Shared by every door that locks a record (EmrAdminService.FinalizeRecordAsync, EmrManagementService.CloseEmrAsync)
/// so each lock writes the same EmrAmendments version row.
/// </summary>
internal static class EmrSnapshotBuilder
{
    public static async Task<string> BuildJsonAsync(HISDbContext db, MedicalRecord record)
    {
        var examIds = await db.Examinations.AsNoTracking()
            .Where(e => e.MedicalRecordId == record.Id && !e.IsDeleted)
            .Select(e => e.Id).ToListAsync();
        var prescriptionIds = await db.Prescriptions.AsNoTracking()
            .Where(p => p.MedicalRecordId == record.Id && !p.IsDeleted)
            .Select(p => p.Id).ToListAsync();
        var serviceRequestCount = await db.ServiceRequests.AsNoTracking()
            .CountAsync(s => s.MedicalRecordId == record.Id && !s.IsDeleted);
        var progressCount = await db.DailyProgresses.AsNoTracking()
            .CountAsync(d => !d.IsDeleted && db.Admissions
                .Any(ad => ad.Id == d.AdmissionId && ad.MedicalRecordId == record.Id));

        var docIds = examIds.Concat(prescriptionIds).Append(record.Id).ToList();
        var signatures = await db.DocumentSignatures.AsNoTracking()
            .Where(ds => ds.Status == 0 && docIds.Contains(ds.DocumentId))
            .Select(ds => new
            {
                ds.DocumentId,
                ds.DocumentType,
                ds.DocumentCode,
                SignerName = ds.SignedByUser != null ? ds.SignedByUser.FullName : null,
                ds.SignedAt,
            })
            .ToListAsync();

        return System.Text.Json.JsonSerializer.Serialize(new
        {
            snapshotAt = DateTime.UtcNow,
            record.MedicalRecordCode,
            record.MainDiagnosis,
            record.MainIcdCode,
            record.SubDiagnosis,
            record.TreatmentResult,
            record.DischargeType,
            record.AdmissionDate,
            record.DischargeDate,
            counts = new
            {
                examinations = examIds.Count,
                prescriptions = prescriptionIds.Count,
                serviceRequests = serviceRequestCount,
                dailyProgresses = progressCount,
            },
            activeSignatures = signatures,
        });
    }
}
