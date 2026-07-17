using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.FHIR;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class FhirService
{
    // ==================== Encounter ====================

    public async Task<FhirBundle> SearchEncountersAsync(string baseUrl, Guid? patientId = null, string? status = null, string? dateFrom = null, string? dateTo = null, int count = 20, int offset = 0)
    {
        try
        {
            var entries = new List<FhirBundleEntry>();
            var total = 0;

            // Search Examinations (outpatient encounters)
            var examQuery = _context.Examinations.AsNoTracking()
                .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(e => e.Department)
                .Include(e => e.Room)
                .Include(e => e.Doctor)
                .Where(e => !e.IsDeleted)
                .AsQueryable();

            if (patientId.HasValue)
                examQuery = examQuery.Where(e => e.MedicalRecord.PatientId == patientId.Value);
            if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out var df))
                examQuery = examQuery.Where(e => e.CreatedAt >= df);
            if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out var dt))
                examQuery = examQuery.Where(e => e.CreatedAt <= dt.AddDays(1));
            if (!string.IsNullOrEmpty(status))
                examQuery = FilterExamByFhirStatus(examQuery, status);

            var examTotal = await examQuery.CountAsync();
            var exams = await examQuery.OrderByDescending(e => e.CreatedAt).Skip(offset).Take(count).ToListAsync();
            entries.AddRange(exams.Select(e => new FhirBundleEntry
            {
                FullUrl = $"{baseUrl}/api/fhir/Encounter/exam-{e.Id}",
                Resource = MapExamToEncounter(e),
                Search = new FhirBundleEntrySearch { Mode = "match" }
            }));

            // Search Admissions (inpatient encounters)
            var admQuery = _context.Admissions.AsNoTracking()
                .Include(a => a.Patient)
                .Include(a => a.Department)
                .Include(a => a.Room)
                .Include(a => a.AdmittingDoctor)
                .Where(a => !a.IsDeleted)
                .AsQueryable();

            if (patientId.HasValue)
                admQuery = admQuery.Where(a => a.PatientId == patientId.Value);
            if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out var adf))
                admQuery = admQuery.Where(a => a.AdmissionDate >= adf);
            if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out var adt))
                admQuery = admQuery.Where(a => a.AdmissionDate <= adt.AddDays(1));
            if (!string.IsNullOrEmpty(status))
                admQuery = FilterAdmissionByFhirStatus(admQuery, status);

            var admTotal = await admQuery.CountAsync();
            var admissions = await admQuery.OrderByDescending(a => a.AdmissionDate).Take(Math.Max(0, count - exams.Count)).ToListAsync();
            entries.AddRange(admissions.Select(a => new FhirBundleEntry
            {
                FullUrl = $"{baseUrl}/api/fhir/Encounter/adm-{a.Id}",
                Resource = MapAdmissionToEncounter(a),
                Search = new FhirBundleEntrySearch { Mode = "match" }
            }));

            total = examTotal + admTotal;

            return new FhirBundle
            {
                Type = "searchset",
                Total = total,
                Link = new List<FhirBundleLink>
                {
                    new() { Relation = "self", Url = $"{baseUrl}/api/fhir/Encounter?_count={count}&_offset={offset}" }
                },
                Entry = entries
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return EmptyBundle("searchset", baseUrl, "Encounter");
        }
    }

    public async Task<FhirEncounter?> GetEncounterAsync(Guid id, string type = "examination")
    {
        try
        {
            if (type == "admission")
            {
                var admission = await _context.Admissions.AsNoTracking()
                    .Include(a => a.Patient)
                    .Include(a => a.Department)
                    .Include(a => a.Room)
                    .Include(a => a.AdmittingDoctor)
                    .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
                return admission == null ? null : MapAdmissionToEncounter(admission);
            }
            else
            {
                var exam = await _context.Examinations.AsNoTracking()
                    .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
                    .Include(e => e.Department)
                    .Include(e => e.Room)
                    .Include(e => e.Doctor)
                    .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);
                return exam == null ? null : MapExamToEncounter(exam);
            }
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    private static FhirEncounter MapExamToEncounter(Examination e)
    {
        var patient = e.MedicalRecord?.Patient;
        return new FhirEncounter
        {
            Id = $"exam-{e.Id}",
            Meta = new FhirMeta
            {
                LastUpdated = (e.UpdatedAt ?? e.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ"),
                Profile = new List<string> { "http://hl7.org/fhir/StructureDefinition/Encounter" }
            },
            Identifier = new List<FhirIdentifier>
            {
                new() { System = $"{HIS_SYSTEM}/examination", Value = e.Id.ToString() }
            },
            Status = MapExamStatus(e.Status),
            Class = new FhirCoding
            {
                System = ENCOUNTER_CLASS_SYSTEM,
                Code = "AMB",
                Display = "ambulatory"
            },
            Type = new List<FhirCodeableConcept>
            {
                new()
                {
                    Coding = new List<FhirCoding>
                    {
                        new() { System = $"{HIS_SYSTEM}/exam-type", Code = e.ExaminationType.ToString(), Display = MapExamTypeName(e.ExaminationType) }
                    }
                }
            },
            Subject = patient != null ? new FhirReference { Reference = $"Patient/{patient.Id}", Display = patient.FullName } : null,
            Participant = e.Doctor != null ? new List<FhirEncounterParticipant>
            {
                new()
                {
                    Type = new List<FhirCodeableConcept>
                    {
                        new() { Coding = new List<FhirCoding> { new() { System = "http://terminology.hl7.org/CodeSystem/v3-ParticipationType", Code = "ATND", Display = "attender" } } }
                    },
                    Individual = new FhirReference { Reference = $"Practitioner/{e.DoctorId}", Display = e.Doctor.FullName }
                }
            } : null,
            Period = new FhirPeriod
            {
                Start = (e.StartTime ?? e.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ"),
                End = e.EndTime?.ToString("yyyy-MM-ddTHH:mm:ssZ")
            },
            ReasonCode = !string.IsNullOrEmpty(e.ChiefComplaint) ? new List<FhirCodeableConcept>
            {
                new() { Text = e.ChiefComplaint }
            } : null,
            Diagnosis = !string.IsNullOrEmpty(e.MainIcdCode) ? new List<FhirEncounterDiagnosis>
            {
                new()
                {
                    Condition = new FhirReference { Display = e.MainDiagnosis },
                    Use = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = "http://terminology.hl7.org/CodeSystem/diagnosis-role", Code = "AD", Display = "Admission diagnosis" } } },
                    Rank = 1
                }
            } : null,
            Location = new List<FhirEncounterLocation>
            {
                new()
                {
                    Location = new FhirReference
                    {
                        Reference = $"Location/{e.RoomId}",
                        Display = e.Room?.RoomName ?? $"Room {e.RoomId}"
                    },
                    Status = "active"
                }
            },
            ServiceProvider = e.Department != null ? new FhirReference { Display = e.Department.DepartmentName } : null
        };
    }

    private static FhirEncounter MapAdmissionToEncounter(Admission a)
    {
        return new FhirEncounter
        {
            Id = $"adm-{a.Id}",
            Meta = new FhirMeta
            {
                LastUpdated = (a.UpdatedAt ?? a.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ"),
                Profile = new List<string> { "http://hl7.org/fhir/StructureDefinition/Encounter" }
            },
            Identifier = new List<FhirIdentifier>
            {
                new() { System = $"{HIS_SYSTEM}/admission", Value = a.Id.ToString() }
            },
            Status = MapAdmissionStatus(a.Status),
            Class = new FhirCoding
            {
                System = ENCOUNTER_CLASS_SYSTEM,
                Code = a.AdmissionType == 1 ? "EMER" : "IMP",
                Display = a.AdmissionType == 1 ? "emergency" : "inpatient encounter"
            },
            Type = new List<FhirCodeableConcept>
            {
                new()
                {
                    Coding = new List<FhirCoding>
                    {
                        new() { System = $"{HIS_SYSTEM}/admission-type", Code = a.AdmissionType.ToString(), Display = MapAdmissionTypeName(a.AdmissionType) }
                    }
                }
            },
            Subject = new FhirReference { Reference = $"Patient/{a.PatientId}", Display = a.Patient?.FullName },
            Participant = a.AdmittingDoctor != null ? new List<FhirEncounterParticipant>
            {
                new()
                {
                    Type = new List<FhirCodeableConcept>
                    {
                        new() { Coding = new List<FhirCoding> { new() { System = "http://terminology.hl7.org/CodeSystem/v3-ParticipationType", Code = "ADM", Display = "admitter" } } }
                    },
                    Individual = new FhirReference { Reference = $"Practitioner/{a.AdmittingDoctorId}", Display = a.AdmittingDoctor.FullName }
                }
            } : null,
            Period = new FhirPeriod
            {
                Start = a.AdmissionDate.ToString("yyyy-MM-ddTHH:mm:ssZ")
            },
            ReasonCode = !string.IsNullOrEmpty(a.ReasonForAdmission) ? new List<FhirCodeableConcept>
            {
                new() { Text = a.ReasonForAdmission }
            } : null,
            Diagnosis = !string.IsNullOrEmpty(a.DiagnosisOnAdmission) ? new List<FhirEncounterDiagnosis>
            {
                new()
                {
                    Condition = new FhirReference { Display = a.DiagnosisOnAdmission },
                    Use = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = "http://terminology.hl7.org/CodeSystem/diagnosis-role", Code = "AD", Display = "Admission diagnosis" } } },
                    Rank = 1
                }
            } : null,
            Location = new List<FhirEncounterLocation>
            {
                new()
                {
                    Location = new FhirReference
                    {
                        Reference = $"Location/{a.RoomId}",
                        Display = a.Room?.RoomName ?? $"Room {a.RoomId}"
                    },
                    Status = "active"
                }
            },
            ServiceProvider = a.Department != null ? new FhirReference { Display = a.Department.DepartmentName } : null
        };
    }
}
