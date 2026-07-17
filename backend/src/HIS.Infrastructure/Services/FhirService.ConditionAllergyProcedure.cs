using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.FHIR;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class FhirService
{
    // ==================== Condition ====================

    public async Task<FhirBundle> SearchConditionsAsync(string baseUrl, Guid? patientId = null, string? code = null, int count = 20, int offset = 0)
    {
        try
        {
            var query = _context.Examinations.AsNoTracking()
                .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(e => e.Doctor)
                .Where(e => !e.IsDeleted && !string.IsNullOrEmpty(e.MainIcdCode))
                .AsQueryable();

            if (patientId.HasValue)
                query = query.Where(e => e.MedicalRecord.PatientId == patientId.Value);
            if (!string.IsNullOrEmpty(code))
                query = query.Where(e => e.MainIcdCode == code);

            var total = await query.CountAsync();
            var exams = await query.OrderByDescending(e => e.CreatedAt).Skip(offset).Take(count).ToListAsync();

            return new FhirBundle
            {
                Type = "searchset",
                Total = total,
                Link = new List<FhirBundleLink> { new() { Relation = "self", Url = $"{baseUrl}/api/fhir/Condition?_count={count}&_offset={offset}" } },
                Entry = exams.Select(e => new FhirBundleEntry
                {
                    FullUrl = $"{baseUrl}/api/fhir/Condition/exam-{e.Id}",
                    Resource = MapCondition(e),
                    Search = new FhirBundleEntrySearch { Mode = "match" }
                }).ToList()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return EmptyBundle("searchset", baseUrl, "Condition");
        }
    }

    public async Task<FhirCondition?> GetConditionAsync(string compositeId)
    {
        try
        {
            if (compositeId.StartsWith("exam-") && Guid.TryParse(compositeId[5..], out var examId))
            {
                var exam = await _context.Examinations.AsNoTracking()
                    .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
                    .Include(e => e.Doctor)
                    .FirstOrDefaultAsync(e => e.Id == examId && !e.IsDeleted);
                return exam == null || string.IsNullOrEmpty(exam.MainIcdCode) ? null : MapCondition(exam);
            }
            return null;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    private static FhirCondition MapCondition(Examination e)
    {
        var patient = e.MedicalRecord?.Patient;
        return new FhirCondition
        {
            Id = $"exam-{e.Id}",
            Meta = new FhirMeta { LastUpdated = (e.UpdatedAt ?? e.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ") },
            ClinicalStatus = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding> { new() { System = CONDITION_CLINICAL_SYSTEM, Code = "active", Display = "Active" } }
            },
            VerificationStatus = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding>
                {
                    new() { System = CONDITION_VERIFICATION_SYSTEM, Code = e.Status >= 4 ? "confirmed" : "provisional", Display = e.Status >= 4 ? "Confirmed" : "Provisional" }
                }
            },
            Category = new List<FhirCodeableConcept>
            {
                new() { Coding = new List<FhirCoding> { new() { System = CONDITION_CATEGORY_SYSTEM, Code = "encounter-diagnosis", Display = "Encounter Diagnosis" } } }
            },
            Code = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding>
                {
                    new() { System = ICD10_SYSTEM, Code = e.MainIcdCode, Display = e.MainDiagnosis }
                },
                Text = e.MainDiagnosis
            },
            Subject = patient != null ? new FhirReference { Reference = $"Patient/{patient.Id}", Display = patient.FullName } : null,
            Encounter = new FhirReference { Reference = $"Encounter/exam-{e.Id}" },
            RecordedDate = e.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            Recorder = e.Doctor != null ? new FhirReference { Reference = $"Practitioner/{e.DoctorId}", Display = e.Doctor.FullName } : null,
            Note = !string.IsNullOrEmpty(e.SubDiagnosis) ? new List<FhirAnnotation>
            {
                new() { Text = $"Sub-diagnosis: {e.SubDiagnosis}" }
            } : null
        };
    }

    // ==================== AllergyIntolerance ====================

    public async Task<FhirBundle> SearchAllergyIntolerancesAsync(string baseUrl, Guid? patientId = null, int count = 20, int offset = 0)
    {
        try
        {
            var query = _context.Allergies.AsNoTracking()
                .Include(a => a.Patient)
                .Include(a => a.RecordedBy)
                .Where(a => !a.IsDeleted && a.IsActive)
                .AsQueryable();

            if (patientId.HasValue)
                query = query.Where(a => a.PatientId == patientId.Value);

            var total = await query.CountAsync();
            var allergies = await query.OrderByDescending(a => a.CreatedAt).Skip(offset).Take(count).ToListAsync();

            return new FhirBundle
            {
                Type = "searchset",
                Total = total,
                Link = new List<FhirBundleLink> { new() { Relation = "self", Url = $"{baseUrl}/api/fhir/AllergyIntolerance?_count={count}&_offset={offset}" } },
                Entry = allergies.Select(a => new FhirBundleEntry
                {
                    FullUrl = $"{baseUrl}/api/fhir/AllergyIntolerance/{a.Id}",
                    Resource = MapAllergyIntolerance(a),
                    Search = new FhirBundleEntrySearch { Mode = "match" }
                }).ToList()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return EmptyBundle("searchset", baseUrl, "AllergyIntolerance");
        }
    }

    public async Task<FhirAllergyIntolerance?> GetAllergyIntoleranceAsync(Guid id)
    {
        try
        {
            var allergy = await _context.Allergies.AsNoTracking()
                .Include(a => a.Patient)
                .Include(a => a.RecordedBy)
                .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
            return allergy == null ? null : MapAllergyIntolerance(allergy);
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    private static FhirAllergyIntolerance MapAllergyIntolerance(Allergy a)
    {
        return new FhirAllergyIntolerance
        {
            Id = a.Id.ToString(),
            Meta = new FhirMeta { LastUpdated = (a.UpdatedAt ?? a.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ") },
            ClinicalStatus = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding> { new() { System = ALLERGY_CLINICAL_SYSTEM, Code = a.IsActive ? "active" : "inactive" } }
            },
            VerificationStatus = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding> { new() { System = ALLERGY_VERIFICATION_SYSTEM, Code = "confirmed" } }
            },
            Type = a.AllergyType == 1 ? "allergy" : "intolerance",
            Category = new List<string> { a.AllergyType switch { 1 => "medication", 2 => "food", _ => "environment" } },
            Criticality = a.Severity switch { 3 => "high", 2 => "high", 1 => "low", _ => "unable-to-assess" },
            Code = new FhirCodeableConcept
            {
                Coding = !string.IsNullOrEmpty(a.AllergenCode) ? new List<FhirCoding>
                {
                    new() { System = $"{HIS_SYSTEM}/allergen", Code = a.AllergenCode, Display = a.AllergenName }
                } : null,
                Text = a.AllergenName
            },
            Patient = new FhirReference { Reference = $"Patient/{a.PatientId}", Display = a.Patient?.FullName },
            OnsetDateTime = a.OnsetDate?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            RecordedDate = a.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            Recorder = a.RecordedBy != null ? new FhirReference { Reference = $"Practitioner/{a.RecordedByUserId}", Display = a.RecordedBy.FullName } : null,
            Note = !string.IsNullOrEmpty(a.Notes) ? new List<FhirAnnotation> { new() { Text = a.Notes } } : null,
            Reaction = !string.IsNullOrEmpty(a.Reaction) ? new List<FhirAllergyReaction>
            {
                new()
                {
                    Manifestation = new List<FhirCodeableConcept> { new() { Text = a.Reaction } },
                    Severity = a.Severity switch { 3 => "severe", 2 => "moderate", _ => "mild" },
                    Description = a.Reaction
                }
            } : null
        };
    }

    // ==================== Procedure ====================

    public async Task<FhirBundle> SearchProceduresAsync(string baseUrl, Guid? patientId = null, string? dateFrom = null, string? dateTo = null, int count = 20, int offset = 0)
    {
        try
        {
            var query = _context.SurgeryRecords.AsNoTracking()
                .Include(sr => sr.SurgerySchedule)
                    .ThenInclude(ss => ss.SurgeryRequest)
                    .ThenInclude(req => req.Patient)
                .Include(sr => sr.SurgerySchedule)
                    .ThenInclude(ss => ss.Surgeon)
                .Include(sr => sr.TeamMembers)
                    .ThenInclude(tm => tm.User)
                .Where(sr => !sr.IsDeleted)
                .AsQueryable();

            if (patientId.HasValue)
                query = query.Where(sr => sr.SurgerySchedule.SurgeryRequest.PatientId == patientId.Value);
            if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out var pdf))
                query = query.Where(sr => sr.ActualStartTime >= pdf);
            if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out var pdt))
                query = query.Where(sr => sr.ActualStartTime <= pdt.AddDays(1));

            var total = await query.CountAsync();
            var records = await query.OrderByDescending(sr => sr.ActualStartTime ?? sr.CreatedAt).Skip(offset).Take(count).ToListAsync();

            return new FhirBundle
            {
                Type = "searchset",
                Total = total,
                Link = new List<FhirBundleLink> { new() { Relation = "self", Url = $"{baseUrl}/api/fhir/Procedure?_count={count}&_offset={offset}" } },
                Entry = records.Select(sr => new FhirBundleEntry
                {
                    FullUrl = $"{baseUrl}/api/fhir/Procedure/{sr.Id}",
                    Resource = MapProcedure(sr),
                    Search = new FhirBundleEntrySearch { Mode = "match" }
                }).ToList()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return EmptyBundle("searchset", baseUrl, "Procedure");
        }
    }

    public async Task<FhirProcedure?> GetProcedureAsync(Guid id)
    {
        try
        {
            var record = await _context.SurgeryRecords.AsNoTracking()
                .Include(sr => sr.SurgerySchedule)
                    .ThenInclude(ss => ss.SurgeryRequest)
                    .ThenInclude(req => req.Patient)
                .Include(sr => sr.SurgerySchedule)
                    .ThenInclude(ss => ss.Surgeon)
                .Include(sr => sr.TeamMembers)
                    .ThenInclude(tm => tm.User)
                .FirstOrDefaultAsync(sr => sr.Id == id && !sr.IsDeleted);
            return record == null ? null : MapProcedure(record);
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    private static FhirProcedure MapProcedure(SurgeryRecord sr)
    {
        var schedule = sr.SurgerySchedule;
        var request = schedule?.SurgeryRequest;
        var patient = request?.Patient;

        var performers = new List<FhirProcedurePerformer>();
        if (schedule?.Surgeon != null)
        {
            performers.Add(new FhirProcedurePerformer
            {
                Function = new FhirCodeableConcept { Text = "Primary Surgeon" },
                Actor = new FhirReference { Reference = $"Practitioner/{schedule.SurgeonId}", Display = schedule.Surgeon.FullName }
            });
        }
        if (sr.TeamMembers != null)
        {
            foreach (var member in sr.TeamMembers)
            {
                performers.Add(new FhirProcedurePerformer
                {
                    Function = new FhirCodeableConcept { Text = member.RoleName ?? MapSurgeryRole(member.Role) },
                    Actor = new FhirReference { Reference = $"Practitioner/{member.UserId}", Display = member.User?.FullName }
                });
            }
        }

        return new FhirProcedure
        {
            Id = sr.Id.ToString(),
            Meta = new FhirMeta { LastUpdated = (sr.UpdatedAt ?? sr.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ") },
            Identifier = new List<FhirIdentifier>
            {
                new() { System = $"{HIS_SYSTEM}/surgery-record", Value = sr.Id.ToString() }
            },
            Status = sr.Result.HasValue ? "completed" : (sr.ActualStartTime.HasValue ? "in-progress" : "preparation"),
            Code = new FhirCodeableConcept
            {
                Coding = !string.IsNullOrEmpty(sr.ProcedureCode) ? new List<FhirCoding>
                {
                    new() { System = $"{HIS_SYSTEM}/procedure", Code = sr.ProcedureCode, Display = sr.ProcedurePerformed }
                } : null,
                Text = sr.ProcedurePerformed ?? request?.PlannedProcedure
            },
            Subject = patient != null ? new FhirReference { Reference = $"Patient/{patient.Id}", Display = patient.FullName } : null,
            Encounter = request?.ExaminationId.HasValue == true
                ? new FhirReference { Reference = $"Encounter/exam-{request.ExaminationId}" }
                : null,
            PerformedPeriod = new FhirPeriod
            {
                Start = sr.ActualStartTime?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                End = sr.ActualEndTime?.ToString("yyyy-MM-ddTHH:mm:ssZ")
            },
            Performer = performers.Count > 0 ? performers : null,
            ReasonCode = !string.IsNullOrEmpty(request?.PreOpDiagnosis) ? new List<FhirCodeableConcept>
            {
                new()
                {
                    Coding = !string.IsNullOrEmpty(request?.PreOpIcdCode) ? new List<FhirCoding>
                    {
                        new() { System = ICD10_SYSTEM, Code = request.PreOpIcdCode, Display = request.PreOpDiagnosis }
                    } : null,
                    Text = request?.PreOpDiagnosis
                }
            } : null,
            Outcome = sr.Result.HasValue ? new FhirCodeableConcept
            {
                Text = sr.Result switch { 1 => "Successful", 2 => "Complicated", 3 => "Deceased", _ => "Unknown" }
            } : null,
            Complication = !string.IsNullOrEmpty(sr.Complications) ? new List<FhirCodeableConcept>
            {
                new() { Text = sr.Complications }
            } : null,
            Note = !string.IsNullOrEmpty(sr.Findings) ? new List<FhirAnnotation>
            {
                new() { Text = sr.Findings }
            } : null
        };
    }
}
