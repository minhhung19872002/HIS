using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.FHIR;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class FhirService
{
    // ==================== MedicationRequest ====================

    public async Task<FhirBundle> SearchMedicationRequestsAsync(string baseUrl, Guid? patientId = null, string? status = null, string? dateFrom = null, string? dateTo = null, int count = 20, int offset = 0)
    {
        try
        {
            var query = _context.PrescriptionDetails.AsNoTracking()
                .Include(d => d.Prescription)
                    .ThenInclude(p => p.MedicalRecord)
                    .ThenInclude(m => m.Patient)
                .Include(d => d.Prescription)
                    .ThenInclude(p => p.Doctor)
                .Include(d => d.Medicine)
                .Where(d => !d.IsDeleted)
                .AsQueryable();

            if (patientId.HasValue)
                query = query.Where(d => d.Prescription.MedicalRecord.PatientId == patientId.Value);
            if (!string.IsNullOrEmpty(status))
                query = FilterMedRequestByFhirStatus(query, status);
            if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out var mdf))
                query = query.Where(d => d.Prescription.PrescriptionDate >= mdf);
            if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out var mdt))
                query = query.Where(d => d.Prescription.PrescriptionDate <= mdt.AddDays(1));

            var total = await query.CountAsync();
            var details = await query.OrderByDescending(d => d.Prescription.PrescriptionDate).Skip(offset).Take(count).ToListAsync();

            return new FhirBundle
            {
                Type = "searchset",
                Total = total,
                Link = new List<FhirBundleLink> { new() { Relation = "self", Url = $"{baseUrl}/api/fhir/MedicationRequest?_count={count}&_offset={offset}" } },
                Entry = details.Select(d => new FhirBundleEntry
                {
                    FullUrl = $"{baseUrl}/api/fhir/MedicationRequest/{d.Id}",
                    Resource = MapMedicationRequest(d),
                    Search = new FhirBundleEntrySearch { Mode = "match" }
                }).ToList()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return EmptyBundle("searchset", baseUrl, "MedicationRequest");
        }
    }

    public async Task<FhirMedicationRequest?> GetMedicationRequestAsync(Guid id)
    {
        try
        {
            var detail = await _context.PrescriptionDetails.AsNoTracking()
                .Include(d => d.Prescription)
                    .ThenInclude(p => p.MedicalRecord)
                    .ThenInclude(m => m.Patient)
                .Include(d => d.Prescription)
                    .ThenInclude(p => p.Doctor)
                .Include(d => d.Medicine)
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
            return detail == null ? null : MapMedicationRequest(detail);
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    private static FhirMedicationRequest MapMedicationRequest(PrescriptionDetail d)
    {
        var prescription = d.Prescription;
        var patient = prescription?.MedicalRecord?.Patient;
        var medicine = d.Medicine;

        return new FhirMedicationRequest
        {
            Id = d.Id.ToString(),
            Meta = new FhirMeta { LastUpdated = (d.UpdatedAt ?? d.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ") },
            Identifier = new List<FhirIdentifier>
            {
                new() { System = $"{HIS_SYSTEM}/prescription", Value = prescription?.PrescriptionCode }
            },
            Status = d.Status switch { 0 => "active", 1 => "active", 2 => "completed", 3 => "cancelled", _ => "unknown" },
            Intent = "order",
            Category = new List<FhirCodeableConcept>
            {
                new()
                {
                    Coding = new List<FhirCoding>
                    {
                        new() { System = "http://terminology.hl7.org/CodeSystem/medicationrequest-category",
                                Code = prescription?.PrescriptionType == 2 ? "inpatient" : "outpatient",
                                Display = prescription?.PrescriptionType == 2 ? "Inpatient" : "Outpatient" }
                    }
                }
            },
            MedicationCodeableConcept = new FhirCodeableConcept
            {
                Coding = medicine != null ? new List<FhirCoding>
                {
                    new() { System = $"{HIS_SYSTEM}/medicine", Code = medicine.MedicineCode, Display = medicine.MedicineName }
                } : null,
                Text = medicine?.MedicineName
            },
            Subject = patient != null ? new FhirReference { Reference = $"Patient/{patient.Id}", Display = patient.FullName } : null,
            Encounter = prescription?.ExaminationId != null ? new FhirReference { Reference = $"Encounter/exam-{prescription.ExaminationId}" } : null,
            AuthoredOn = prescription?.PrescriptionDate.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            Requester = prescription?.Doctor != null ? new FhirReference { Reference = $"Practitioner/{prescription.DoctorId}", Display = prescription.Doctor.FullName } : null,
            ReasonCode = !string.IsNullOrEmpty(prescription?.Diagnosis) ? new List<FhirCodeableConcept>
            {
                new()
                {
                    Coding = !string.IsNullOrEmpty(prescription?.IcdCode) ? new List<FhirCoding>
                    {
                        new() { System = ICD10_SYSTEM, Code = prescription.IcdCode, Display = prescription.Diagnosis }
                    } : null,
                    Text = prescription?.Diagnosis
                }
            } : null,
            Note = !string.IsNullOrEmpty(d.Note) ? new List<FhirAnnotation> { new() { Text = d.Note } } : null,
            DosageInstruction = new List<FhirDosage>
            {
                new()
                {
                    Text = d.UsageInstructions ?? d.Usage ?? $"{d.Dosage} {d.Frequency} {d.Route}".Trim(),
                    Route = !string.IsNullOrEmpty(d.Route) ? new FhirCodeableConcept { Text = d.Route } : null,
                    DoseAndRate = d.Quantity > 0 ? new List<FhirDoseAndRate>
                    {
                        new()
                        {
                            DoseQuantity = new FhirQuantity { Value = d.Quantity, Unit = d.Unit ?? medicine?.Unit }
                        }
                    } : null
                }
            },
            DispenseRequest = new FhirMedicationDispenseRequest
            {
                Quantity = new FhirQuantity { Value = d.Quantity, Unit = d.Unit ?? medicine?.Unit },
                ExpectedSupplyDuration = d.Days > 0 ? new FhirQuantity { Value = d.Days, Unit = "d", System = "http://unitsofmeasure.org", Code = "d" } : null
            }
        };
    }
}
