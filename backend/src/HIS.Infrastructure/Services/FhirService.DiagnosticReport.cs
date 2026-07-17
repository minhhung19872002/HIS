using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.FHIR;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class FhirService
{
    // ==================== DiagnosticReport ====================

    public async Task<FhirBundle> SearchDiagnosticReportsAsync(string baseUrl, Guid? patientId = null, string? category = null, string? dateFrom = null, string? dateTo = null, int count = 20, int offset = 0)
    {
        try
        {
            var entries = new List<FhirBundleEntry>();
            var total = 0;
            var isLab = string.IsNullOrEmpty(category) || category == "LAB";
            var isRad = string.IsNullOrEmpty(category) || category == "RAD";

            // Lab DiagnosticReports
            if (isLab)
            {
                // #14b: model 1 ServiceRequests (RequestType=1, Status=3 Có KQ); model 2 LabRequests chết
                var labQuery = _context.ServiceRequests.AsNoTracking()
                    .Include(lr => lr.MedicalRecord).ThenInclude(m => m.Patient)
                    .Include(lr => lr.Doctor)
                    .Include(lr => lr.Details.Where(d => !d.IsDeleted && d.Status != 3)).ThenInclude(d => d.Service)
                    .Where(lr => !lr.IsDeleted && lr.RequestType == 1 && lr.Status != 4
                        && (lr.Status == 3 || lr.Details.Any(d => !d.IsDeleted && d.Status != 3 && (d.Result != null || d.ResultDate != null))))
                    .AsQueryable();

                if (patientId.HasValue)
                    labQuery = labQuery.Where(lr => lr.MedicalRecord.PatientId == patientId.Value);
                if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out var ldf))
                    labQuery = labQuery.Where(lr => lr.RequestDate >= ldf);
                if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out var ldt))
                    labQuery = labQuery.Where(lr => lr.RequestDate <= ldt.AddDays(1));

                var labTotal = await labQuery.CountAsync();
                total += labTotal;
                var labReqs = await labQuery.OrderByDescending(lr => lr.RequestDate).Skip(offset).Take(count).ToListAsync();

                entries.AddRange(labReqs.Select(lr => new FhirBundleEntry
                {
                    FullUrl = $"{baseUrl}/api/fhir/DiagnosticReport/lab-{lr.Id}",
                    Resource = MapLabDiagnosticReport(lr),
                    Search = new FhirBundleEntrySearch { Mode = "match" }
                }));
            }

            // Radiology DiagnosticReports
            if (isRad)
            {
                var radQuery = _context.RadiologyRequests.AsNoTracking()
                    .Include(rr => rr.Patient)
                    .Include(rr => rr.RequestingDoctor)
                    .Include(rr => rr.Service)
                    .Where(rr => !rr.IsDeleted && rr.Status >= 4) // Reported+
                    .AsQueryable();

                if (patientId.HasValue)
                    radQuery = radQuery.Where(rr => rr.PatientId == patientId.Value);
                if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out var rdf))
                    radQuery = radQuery.Where(rr => rr.RequestDate >= rdf);
                if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out var rdt))
                    radQuery = radQuery.Where(rr => rr.RequestDate <= rdt.AddDays(1));

                var radTotal = await radQuery.CountAsync();
                total += radTotal;
                var remaining = Math.Max(0, count - entries.Count);
                var radReqs = await radQuery.OrderByDescending(rr => rr.RequestDate).Take(remaining).ToListAsync();

                entries.AddRange(radReqs.Select(rr => new FhirBundleEntry
                {
                    FullUrl = $"{baseUrl}/api/fhir/DiagnosticReport/rad-{rr.Id}",
                    Resource = MapRadiologyDiagnosticReport(rr),
                    Search = new FhirBundleEntrySearch { Mode = "match" }
                }));
            }

            return new FhirBundle
            {
                Type = "searchset",
                Total = total,
                Link = new List<FhirBundleLink> { new() { Relation = "self", Url = $"{baseUrl}/api/fhir/DiagnosticReport?_count={count}&_offset={offset}" } },
                Entry = entries
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return EmptyBundle("searchset", baseUrl, "DiagnosticReport");
        }
    }

    public async Task<FhirDiagnosticReport?> GetDiagnosticReportAsync(Guid id, string type = "lab")
    {
        try
        {
            if (type == "rad")
            {
                var rr = await _context.RadiologyRequests.AsNoTracking()
                    .Include(r => r.Patient)
                    .Include(r => r.RequestingDoctor)
                    .Include(r => r.Service)
                    .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
                return rr == null ? null : MapRadiologyDiagnosticReport(rr);
            }
            else
            {
                // #14b: model 1 ServiceRequest (RequestType=1)
                var lr = await _context.ServiceRequests.AsNoTracking()
                    .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
                    .Include(r => r.Doctor)
                    .Include(r => r.Details.Where(d => !d.IsDeleted && d.Status != 3)).ThenInclude(d => d.Service)
                    .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted && r.RequestType == 1);
                return lr == null ? null : MapLabDiagnosticReport(lr);
            }
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    // #14b: DiagnosticReport từ ServiceRequest model 1 (Result refs → Observation lab-{srdId})
    private static FhirDiagnosticReport MapLabDiagnosticReport(ServiceRequest lr)
    {
        var patient = lr.MedicalRecord?.Patient;
        var issued = lr.Details?
            .Select(d => d.ReviewedAt)
            .Where(x => x.HasValue)
            .OrderByDescending(x => x)
            .FirstOrDefault();

        return new FhirDiagnosticReport
        {
            Id = $"lab-{lr.Id}",
            Meta = new FhirMeta { LastUpdated = (lr.UpdatedAt ?? lr.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ") },
            Identifier = new List<FhirIdentifier>
            {
                new() { System = $"{HIS_SYSTEM}/lab-request", Value = lr.RequestCode }
            },
            Status = lr.Status switch { 2 => "preliminary", 3 => "final", 4 => "cancelled", _ => "registered" },
            Category = new List<FhirCodeableConcept>
            {
                new() { Coding = new List<FhirCoding> { new() { System = DIAGNOSTIC_SERVICE_SYSTEM, Code = "LAB", Display = "Laboratory" } } }
            },
            Code = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding> { new() { System = $"{HIS_SYSTEM}/lab-panel", Code = lr.RequestCode, Display = $"Lab Panel {lr.RequestCode}" } },
                Text = $"Laboratory Panel - {lr.RequestCode}"
            },
            Subject = new FhirReference { Reference = $"Patient/{lr.MedicalRecord?.PatientId}", Display = patient?.FullName },
            Encounter = lr.ExaminationId.HasValue ? new FhirReference { Reference = $"Encounter/exam-{lr.ExaminationId}" } : null,
            EffectiveDateTime = lr.RequestDate.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            Issued = issued?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            Performer = lr.Doctor != null ? new List<FhirReference>
            {
                new() { Reference = $"Practitioner/{lr.DoctorId}", Display = lr.Doctor.FullName }
            } : null,
            Result = lr.Details?.Select(d => new FhirReference
            {
                Reference = $"Observation/lab-{d.Id}",
                Display = d.Service?.ServiceName
            }).ToList(),
            Conclusion = lr.Diagnosis
        };
    }

    private static FhirDiagnosticReport MapRadiologyDiagnosticReport(RadiologyRequest rr)
    {
        return new FhirDiagnosticReport
        {
            Id = $"rad-{rr.Id}",
            Meta = new FhirMeta { LastUpdated = (rr.UpdatedAt ?? rr.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ") },
            Identifier = new List<FhirIdentifier>
            {
                new() { System = $"{HIS_SYSTEM}/radiology-request", Value = rr.RequestCode }
            },
            Status = rr.Status switch { 4 => "preliminary", 5 => "final", 6 => "cancelled", _ => "registered" },
            Category = new List<FhirCodeableConcept>
            {
                new() { Coding = new List<FhirCoding> { new() { System = DIAGNOSTIC_SERVICE_SYSTEM, Code = "RAD", Display = "Radiology" } } }
            },
            Code = new FhirCodeableConcept
            {
                Coding = rr.Service != null ? new List<FhirCoding>
                {
                    new() { System = $"{HIS_SYSTEM}/radiology-service", Code = rr.Service.ServiceCode, Display = rr.Service.ServiceName }
                } : null,
                Text = rr.Service?.ServiceName ?? rr.RequestCode
            },
            Subject = new FhirReference { Reference = $"Patient/{rr.PatientId}", Display = rr.Patient?.FullName },
            Encounter = rr.ExaminationId.HasValue ? new FhirReference { Reference = $"Encounter/exam-{rr.ExaminationId}" } : null,
            EffectiveDateTime = rr.RequestDate.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            Performer = rr.RequestingDoctor != null ? new List<FhirReference>
            {
                new() { Reference = $"Practitioner/{rr.RequestingDoctorId}", Display = rr.RequestingDoctor.FullName }
            } : null,
            Conclusion = rr.ClinicalInfo
        };
    }
}
