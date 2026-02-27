using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.FHIR;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// HL7 FHIR R4 Service Implementation
/// Maps HIS database entities to FHIR R4 resources
/// </summary>
public class FhirService : IFhirService
{
    private readonly HISDbContext _context;
    private const string HIS_SYSTEM = "urn:oid:2.16.840.1.113883.2.24.1.1"; // Vietnam MOH OID
    private const string ICD10_SYSTEM = "urn:oid:2.16.840.1.113883.6.3"; // ICD-10 WHO
    private const string LOINC_SYSTEM = "http://loinc.org";
    private const string SNOMED_SYSTEM = "http://snomed.info/sct";
    private const string GENDER_SYSTEM = "http://hl7.org/fhir/administrative-gender";
    private const string ENCOUNTER_CLASS_SYSTEM = "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    private const string OBSERVATION_CATEGORY_SYSTEM = "http://terminology.hl7.org/CodeSystem/observation-category";
    private const string CONDITION_CATEGORY_SYSTEM = "http://terminology.hl7.org/CodeSystem/condition-category";
    private const string CONDITION_CLINICAL_SYSTEM = "http://terminology.hl7.org/CodeSystem/condition-clinical";
    private const string CONDITION_VERIFICATION_SYSTEM = "http://terminology.hl7.org/CodeSystem/condition-ver-status";
    private const string ALLERGY_CLINICAL_SYSTEM = "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical";
    private const string ALLERGY_VERIFICATION_SYSTEM = "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification";
    private const string DIAGNOSTIC_SERVICE_SYSTEM = "http://terminology.hl7.org/CodeSystem/v2-0074";

    public FhirService(HISDbContext context)
    {
        _context = context;
    }

    // ==================== Capability Statement ====================

    public Task<FhirCapabilityStatement> GetCapabilityStatementAsync(string baseUrl)
    {
        var statement = new FhirCapabilityStatement
        {
            Id = "his-fhir-server",
            Url = $"{baseUrl}/api/fhir/metadata",
            Version = "1.0.0",
            Name = "HIS_FHIR_Server",
            Title = "HIS Hospital Information System FHIR Server",
            Status = "active",
            Date = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            Publisher = "HIS Hospital System",
            Description = "HL7 FHIR R4 Server for Vietnam Hospital Information System (TT 54/2017, TT 32/2023, TT 13/2025 Level 6)",
            Kind = "instance",
            Software = new FhirCapabilitySoftware
            {
                Name = "HIS FHIR Server",
                Version = "1.0.0"
            },
            FhirVersion = "4.0.1",
            Format = new List<string> { "json" },
            Rest = new List<FhirCapabilityRest>
            {
                new()
                {
                    Mode = "server",
                    Resource = new List<FhirCapabilityRestResource>
                    {
                        BuildResourceCapability("Patient", new[] { "read", "search-type" },
                            new Dictionary<string, string> { { "name", "string" }, { "identifier", "token" }, { "phone", "token" }, { "_count", "number" } }),
                        BuildResourceCapability("Encounter", new[] { "read", "search-type" },
                            new Dictionary<string, string> { { "patient", "reference" }, { "status", "token" }, { "date", "date" } }),
                        BuildResourceCapability("Observation", new[] { "read", "search-type" },
                            new Dictionary<string, string> { { "patient", "reference" }, { "category", "token" }, { "code", "token" }, { "date", "date" } }),
                        BuildResourceCapability("MedicationRequest", new[] { "read", "search-type" },
                            new Dictionary<string, string> { { "patient", "reference" }, { "status", "token" }, { "authoredon", "date" } }),
                        BuildResourceCapability("DiagnosticReport", new[] { "read", "search-type" },
                            new Dictionary<string, string> { { "patient", "reference" }, { "category", "token" }, { "date", "date" } }),
                        BuildResourceCapability("Condition", new[] { "read", "search-type" },
                            new Dictionary<string, string> { { "patient", "reference" }, { "code", "token" } }),
                        BuildResourceCapability("AllergyIntolerance", new[] { "read", "search-type" },
                            new Dictionary<string, string> { { "patient", "reference" } }),
                        BuildResourceCapability("Procedure", new[] { "read", "search-type" },
                            new Dictionary<string, string> { { "patient", "reference" }, { "date", "date" } }),
                    }
                }
            }
        };

        return Task.FromResult(statement);
    }

    private static FhirCapabilityRestResource BuildResourceCapability(string type, string[] interactions, Dictionary<string, string> searchParams)
    {
        return new FhirCapabilityRestResource
        {
            Type = type,
            Interaction = interactions.Select(i => new FhirCapabilityInteraction { Code = i }).ToList(),
            SearchParam = searchParams.Select(kvp => new FhirCapabilitySearchParam { Name = kvp.Key, Type = kvp.Value }).ToList()
        };
    }

    // ==================== Patient ====================

    public async Task<FhirBundle> SearchPatientsAsync(string baseUrl, string? name = null, string? identifier = null, string? phone = null, int count = 20, int offset = 0)
    {
        try
        {
            var query = _context.Patients.Where(p => !p.IsDeleted).AsQueryable();

            if (!string.IsNullOrEmpty(name))
                query = query.Where(p => p.FullName.Contains(name));
            if (!string.IsNullOrEmpty(identifier))
                query = query.Where(p => p.PatientCode == identifier || p.IdentityNumber == identifier || p.InsuranceNumber == identifier);
            if (!string.IsNullOrEmpty(phone))
                query = query.Where(p => p.PhoneNumber != null && p.PhoneNumber.Contains(phone));

            var total = await query.CountAsync();
            var patients = await query.OrderByDescending(p => p.CreatedAt).Skip(offset).Take(count).ToListAsync();

            return new FhirBundle
            {
                Type = "searchset",
                Total = total,
                Link = new List<FhirBundleLink>
                {
                    new() { Relation = "self", Url = $"{baseUrl}/api/fhir/Patient?_count={count}&_offset={offset}" }
                },
                Entry = patients.Select(p => new FhirBundleEntry
                {
                    FullUrl = $"{baseUrl}/api/fhir/Patient/{p.Id}",
                    Resource = MapPatient(p),
                    Search = new FhirBundleEntrySearch { Mode = "match" }
                }).ToList()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return EmptyBundle("searchset", baseUrl, "Patient");
        }
    }

    public async Task<FhirPatient?> GetPatientAsync(Guid id)
    {
        try
        {
            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
            return patient == null ? null : MapPatient(patient);
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    private static FhirPatient MapPatient(Patient p)
    {
        var identifiers = new List<FhirIdentifier>
        {
            new() { Use = "official", System = $"{HIS_SYSTEM}/patient-code", Value = p.PatientCode }
        };
        if (!string.IsNullOrEmpty(p.IdentityNumber))
            identifiers.Add(new FhirIdentifier { Use = "secondary", System = $"{HIS_SYSTEM}/cccd", Value = p.IdentityNumber });
        if (!string.IsNullOrEmpty(p.InsuranceNumber))
            identifiers.Add(new FhirIdentifier { Use = "secondary", System = $"{HIS_SYSTEM}/bhyt", Value = p.InsuranceNumber });

        var nameParts = (p.FullName ?? "").Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var family = nameParts.Length > 0 ? nameParts[0] : "";
        var given = nameParts.Length > 1 ? nameParts.Skip(1).ToList() : new List<string>();

        var telecoms = new List<FhirContactPoint>();
        if (!string.IsNullOrEmpty(p.PhoneNumber))
            telecoms.Add(new FhirContactPoint { System = "phone", Value = p.PhoneNumber, Use = "mobile" });
        if (!string.IsNullOrEmpty(p.Email))
            telecoms.Add(new FhirContactPoint { System = "email", Value = p.Email });

        var addresses = new List<FhirAddress>();
        if (!string.IsNullOrEmpty(p.Address) || !string.IsNullOrEmpty(p.ProvinceName))
        {
            addresses.Add(new FhirAddress
            {
                Use = "home",
                Text = BuildAddressText(p.Address, p.WardName, p.DistrictName, p.ProvinceName),
                Line = !string.IsNullOrEmpty(p.Address) ? new List<string> { p.Address } : null,
                City = p.DistrictName,
                District = p.WardName,
                State = p.ProvinceName,
                Country = "VN"
            });
        }

        var contacts = new List<FhirPatientContact>();
        if (!string.IsNullOrEmpty(p.GuardianName))
        {
            contacts.Add(new FhirPatientContact
            {
                Relationship = new List<FhirCodeableConcept>
                {
                    new() { Text = p.GuardianRelationship ?? "Guardian" }
                },
                Name = new FhirHumanName { Text = p.GuardianName },
                Telecom = !string.IsNullOrEmpty(p.GuardianPhone)
                    ? new List<FhirContactPoint> { new() { System = "phone", Value = p.GuardianPhone } }
                    : null
            });
        }

        return new FhirPatient
        {
            Id = p.Id.ToString(),
            Meta = new FhirMeta
            {
                VersionId = "1",
                LastUpdated = (p.UpdatedAt ?? p.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ"),
                Profile = new List<string> { "http://hl7.org/fhir/StructureDefinition/Patient" }
            },
            Identifier = identifiers,
            Active = !p.IsDeleted,
            Name = new List<FhirHumanName>
            {
                new() { Use = "official", Text = p.FullName, Family = family, Given = given.Count > 0 ? given : null }
            },
            Telecom = telecoms.Count > 0 ? telecoms : null,
            Gender = MapGender(p.Gender),
            BirthDate = p.DateOfBirth?.ToString("yyyy-MM-dd") ?? (p.YearOfBirth.HasValue ? $"{p.YearOfBirth}" : null),
            Address = addresses.Count > 0 ? addresses : null,
            Contact = contacts.Count > 0 ? contacts : null,
            Communication = new List<FhirPatientCommunication>
            {
                new()
                {
                    Language = new FhirCodeableConcept
                    {
                        Coding = new List<FhirCoding> { new() { System = "urn:ietf:bcp:47", Code = "vi", Display = "Vietnamese" } }
                    },
                    Preferred = true
                }
            }
        };
    }

    // ==================== Encounter ====================

    public async Task<FhirBundle> SearchEncountersAsync(string baseUrl, Guid? patientId = null, string? status = null, string? dateFrom = null, string? dateTo = null, int count = 20, int offset = 0)
    {
        try
        {
            var entries = new List<FhirBundleEntry>();
            var total = 0;

            // Search Examinations (outpatient encounters)
            var examQuery = _context.Examinations
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
            var admQuery = _context.Admissions
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
                var admission = await _context.Admissions
                    .Include(a => a.Patient)
                    .Include(a => a.Department)
                    .Include(a => a.Room)
                    .Include(a => a.AdmittingDoctor)
                    .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
                return admission == null ? null : MapAdmissionToEncounter(admission);
            }
            else
            {
                var exam = await _context.Examinations
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

    // ==================== Observation ====================

    public async Task<FhirBundle> SearchObservationsAsync(string baseUrl, Guid? patientId = null, string? category = null, string? code = null, string? dateFrom = null, string? dateTo = null, int count = 20, int offset = 0)
    {
        try
        {
            var entries = new List<FhirBundleEntry>();
            var total = 0;
            var isVitalSigns = string.IsNullOrEmpty(category) || category == "vital-signs";
            var isLab = string.IsNullOrEmpty(category) || category == "laboratory";

            // Vital signs from Examinations
            if (isVitalSigns)
            {
                var vsQuery = _context.Examinations
                    .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
                    .Include(e => e.Doctor)
                    .Where(e => !e.IsDeleted && (e.Temperature != null || e.Pulse != null || e.BloodPressureSystolic != null))
                    .AsQueryable();

                if (patientId.HasValue)
                    vsQuery = vsQuery.Where(e => e.MedicalRecord.PatientId == patientId.Value);
                if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out var vdf))
                    vsQuery = vsQuery.Where(e => e.CreatedAt >= vdf);
                if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out var vdt))
                    vsQuery = vsQuery.Where(e => e.CreatedAt <= vdt.AddDays(1));

                var vsTotal = await vsQuery.CountAsync();
                total += vsTotal;
                var vsExams = await vsQuery.OrderByDescending(e => e.CreatedAt).Skip(offset).Take(count).ToListAsync();

                foreach (var exam in vsExams)
                {
                    var obs = MapVitalSignsObservation(exam);
                    entries.Add(new FhirBundleEntry
                    {
                        FullUrl = $"{baseUrl}/api/fhir/Observation/vs-{exam.Id}",
                        Resource = obs,
                        Search = new FhirBundleEntrySearch { Mode = "match" }
                    });
                }
            }

            // Lab results
            if (isLab)
            {
                var labQuery = _context.LabResults
                    .Include(r => r.LabRequestItem!)
                        .ThenInclude(i => i.LabRequest!)
                        .ThenInclude(lr => lr.Patient)
                    .Where(r => !r.IsDeleted && r.Status >= 1)
                    .AsQueryable();

                if (patientId.HasValue)
                    labQuery = labQuery.Where(r => r.LabRequestItem!.LabRequest!.PatientId == patientId.Value);
                if (!string.IsNullOrEmpty(code))
                    labQuery = labQuery.Where(r => r.ParameterCode == code);
                if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out var ldf))
                    labQuery = labQuery.Where(r => r.CreatedAt >= ldf);
                if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out var ldt))
                    labQuery = labQuery.Where(r => r.CreatedAt <= ldt.AddDays(1));

                var labTotal = await labQuery.CountAsync();
                total += labTotal;
                var remainingCount = Math.Max(0, count - entries.Count);
                var labResults = await labQuery.OrderByDescending(r => r.CreatedAt).Take(remainingCount).ToListAsync();

                foreach (var result in labResults)
                {
                    var obs = MapLabResultObservation(result);
                    entries.Add(new FhirBundleEntry
                    {
                        FullUrl = $"{baseUrl}/api/fhir/Observation/lab-{result.Id}",
                        Resource = obs,
                        Search = new FhirBundleEntrySearch { Mode = "match" }
                    });
                }
            }

            return new FhirBundle
            {
                Type = "searchset",
                Total = total,
                Link = new List<FhirBundleLink> { new() { Relation = "self", Url = $"{baseUrl}/api/fhir/Observation?_count={count}&_offset={offset}" } },
                Entry = entries
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return EmptyBundle("searchset", baseUrl, "Observation");
        }
    }

    public async Task<FhirObservation?> GetObservationAsync(string compositeId)
    {
        try
        {
            if (compositeId.StartsWith("vs-") && Guid.TryParse(compositeId[3..], out var vsId))
            {
                var exam = await _context.Examinations
                    .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
                    .Include(e => e.Doctor)
                    .FirstOrDefaultAsync(e => e.Id == vsId && !e.IsDeleted);
                return exam == null ? null : MapVitalSignsObservation(exam);
            }
            else if (compositeId.StartsWith("lab-") && Guid.TryParse(compositeId[4..], out var labId))
            {
                var result = await _context.LabResults
                    .Include(r => r.LabRequestItem!)
                        .ThenInclude(i => i.LabRequest!)
                        .ThenInclude(lr => lr.Patient)
                    .FirstOrDefaultAsync(r => r.Id == labId && !r.IsDeleted);
                return result == null ? null : MapLabResultObservation(result);
            }
            return null;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    private static FhirObservation MapVitalSignsObservation(Examination exam)
    {
        var patient = exam.MedicalRecord?.Patient;
        var components = new List<FhirObservationComponent>();

        if (exam.Temperature.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "8310-5", Display = "Body temperature" } } },
                ValueQuantity = new FhirQuantity { Value = exam.Temperature, Unit = "Cel", System = "http://unitsofmeasure.org", Code = "Cel" }
            });
        if (exam.Pulse.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "8867-4", Display = "Heart rate" } } },
                ValueQuantity = new FhirQuantity { Value = exam.Pulse, Unit = "/min", System = "http://unitsofmeasure.org", Code = "/min" }
            });
        if (exam.BloodPressureSystolic.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "8480-6", Display = "Systolic blood pressure" } } },
                ValueQuantity = new FhirQuantity { Value = exam.BloodPressureSystolic, Unit = "mmHg", System = "http://unitsofmeasure.org", Code = "mm[Hg]" }
            });
        if (exam.BloodPressureDiastolic.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "8462-4", Display = "Diastolic blood pressure" } } },
                ValueQuantity = new FhirQuantity { Value = exam.BloodPressureDiastolic, Unit = "mmHg", System = "http://unitsofmeasure.org", Code = "mm[Hg]" }
            });
        if (exam.RespiratoryRate.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "9279-1", Display = "Respiratory rate" } } },
                ValueQuantity = new FhirQuantity { Value = exam.RespiratoryRate, Unit = "/min", System = "http://unitsofmeasure.org", Code = "/min" }
            });
        if (exam.SpO2.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "2708-6", Display = "Oxygen saturation" } } },
                ValueQuantity = new FhirQuantity { Value = exam.SpO2, Unit = "%", System = "http://unitsofmeasure.org", Code = "%" }
            });
        if (exam.Height.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "8302-2", Display = "Body height" } } },
                ValueQuantity = new FhirQuantity { Value = exam.Height, Unit = "cm", System = "http://unitsofmeasure.org", Code = "cm" }
            });
        if (exam.Weight.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "29463-7", Display = "Body weight" } } },
                ValueQuantity = new FhirQuantity { Value = exam.Weight, Unit = "kg", System = "http://unitsofmeasure.org", Code = "kg" }
            });
        if (exam.BMI.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "39156-5", Display = "Body mass index" } } },
                ValueQuantity = new FhirQuantity { Value = exam.BMI, Unit = "kg/m2", System = "http://unitsofmeasure.org", Code = "kg/m2" }
            });

        return new FhirObservation
        {
            Id = $"vs-{exam.Id}",
            Meta = new FhirMeta { LastUpdated = (exam.UpdatedAt ?? exam.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ") },
            Status = exam.Status >= 3 ? "final" : "preliminary",
            Category = new List<FhirCodeableConcept>
            {
                new() { Coding = new List<FhirCoding> { new() { System = OBSERVATION_CATEGORY_SYSTEM, Code = "vital-signs", Display = "Vital Signs" } } }
            },
            Code = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "85353-1", Display = "Vital signs, weight, height, head circumference, oxygen saturation and BMI panel" } },
                Text = "Vital Signs Panel"
            },
            Subject = patient != null ? new FhirReference { Reference = $"Patient/{patient.Id}", Display = patient.FullName } : null,
            Encounter = new FhirReference { Reference = $"Encounter/exam-{exam.Id}" },
            EffectiveDateTime = (exam.StartTime ?? exam.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ"),
            Performer = exam.Doctor != null ? new List<FhirReference> { new() { Reference = $"Practitioner/{exam.DoctorId}", Display = exam.Doctor.FullName } } : null,
            Component = components.Count > 0 ? components : null
        };
    }

    private static FhirObservation MapLabResultObservation(LabResult result)
    {
        var labRequest = result.LabRequestItem?.LabRequest;
        var patient = labRequest?.Patient;

        var interpretation = new List<FhirCodeableConcept>();
        if (result.IsAbnormal)
        {
            var interpCode = result.AbnormalType switch
            {
                1 => ("H", "High"),
                2 => ("L", "Low"),
                3 => ("HH", "Critical high"),
                _ => ("A", "Abnormal")
            };
            interpretation.Add(new FhirCodeableConcept
            {
                Coding = new List<FhirCoding>
                {
                    new() { System = "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", Code = interpCode.Item1, Display = interpCode.Item2 }
                }
            });
        }

        var referenceRanges = new List<FhirReferenceRange>();
        if (result.ReferenceMin.HasValue || result.ReferenceMax.HasValue || !string.IsNullOrEmpty(result.ReferenceRange))
        {
            referenceRanges.Add(new FhirReferenceRange
            {
                Low = result.ReferenceMin.HasValue ? new FhirQuantity { Value = result.ReferenceMin, Unit = result.Unit } : null,
                High = result.ReferenceMax.HasValue ? new FhirQuantity { Value = result.ReferenceMax, Unit = result.Unit } : null,
                Text = result.ReferenceRange ?? result.ReferenceText
            });
        }

        return new FhirObservation
        {
            Id = $"lab-{result.Id}",
            Meta = new FhirMeta { LastUpdated = (result.UpdatedAt ?? result.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ") },
            Status = result.Status switch { 0 => "registered", 1 => "preliminary", 2 => "final", _ => "unknown" },
            Category = new List<FhirCodeableConcept>
            {
                new() { Coding = new List<FhirCoding> { new() { System = OBSERVATION_CATEGORY_SYSTEM, Code = "laboratory", Display = "Laboratory" } } }
            },
            Code = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = result.ParameterCode, Display = result.ParameterName } },
                Text = result.ParameterName
            },
            Subject = patient != null ? new FhirReference { Reference = $"Patient/{patient.Id}", Display = patient.FullName } : null,
            EffectiveDateTime = (result.ResultedAt ?? result.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ"),
            Issued = result.ApprovedAt?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            ValueQuantity = result.NumericResult.HasValue ? new FhirQuantity { Value = result.NumericResult, Unit = result.Unit } : null,
            ValueString = result.NumericResult.HasValue ? null : (result.TextResult ?? result.Result ?? result.ResultValue),
            Interpretation = interpretation.Count > 0 ? interpretation : null,
            ReferenceRange = referenceRanges.Count > 0 ? referenceRanges : null
        };
    }

    // ==================== MedicationRequest ====================

    public async Task<FhirBundle> SearchMedicationRequestsAsync(string baseUrl, Guid? patientId = null, string? status = null, string? dateFrom = null, string? dateTo = null, int count = 20, int offset = 0)
    {
        try
        {
            var query = _context.PrescriptionDetails
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
            var detail = await _context.PrescriptionDetails
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
                var labQuery = _context.LabRequests
                    .Include(lr => lr.Patient)
                    .Include(lr => lr.RequestingDoctor)
                    .Include(lr => lr.Items)
                    .Where(lr => !lr.IsDeleted && lr.Status >= 3) // Completed+
                    .AsQueryable();

                if (patientId.HasValue)
                    labQuery = labQuery.Where(lr => lr.PatientId == patientId.Value);
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
                var radQuery = _context.RadiologyRequests
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
                var rr = await _context.RadiologyRequests
                    .Include(r => r.Patient)
                    .Include(r => r.RequestingDoctor)
                    .Include(r => r.Service)
                    .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
                return rr == null ? null : MapRadiologyDiagnosticReport(rr);
            }
            else
            {
                var lr = await _context.LabRequests
                    .Include(r => r.Patient)
                    .Include(r => r.RequestingDoctor)
                    .Include(r => r.Items)
                    .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
                return lr == null ? null : MapLabDiagnosticReport(lr);
            }
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    private static FhirDiagnosticReport MapLabDiagnosticReport(LabRequest lr)
    {
        return new FhirDiagnosticReport
        {
            Id = $"lab-{lr.Id}",
            Meta = new FhirMeta { LastUpdated = (lr.UpdatedAt ?? lr.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ") },
            Identifier = new List<FhirIdentifier>
            {
                new() { System = $"{HIS_SYSTEM}/lab-request", Value = lr.RequestCode }
            },
            Status = lr.Status switch { 3 => "preliminary", 4 => "final", 5 => "cancelled", _ => "registered" },
            Category = new List<FhirCodeableConcept>
            {
                new() { Coding = new List<FhirCoding> { new() { System = DIAGNOSTIC_SERVICE_SYSTEM, Code = "LAB", Display = "Laboratory" } } }
            },
            Code = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding> { new() { System = $"{HIS_SYSTEM}/lab-panel", Code = lr.RequestCode, Display = $"Lab Panel {lr.RequestCode}" } },
                Text = $"Laboratory Panel - {lr.RequestCode}"
            },
            Subject = new FhirReference { Reference = $"Patient/{lr.PatientId}", Display = lr.Patient?.FullName },
            Encounter = lr.ExaminationId.HasValue ? new FhirReference { Reference = $"Encounter/exam-{lr.ExaminationId}" } : null,
            EffectiveDateTime = lr.RequestDate.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            Issued = lr.ApprovedAt?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            Performer = lr.RequestingDoctor != null ? new List<FhirReference>
            {
                new() { Reference = $"Practitioner/{lr.RequestingDoctorId}", Display = lr.RequestingDoctor.FullName }
            } : null,
            Result = lr.Items?.Select(item => new FhirReference
            {
                Reference = $"Observation/lab-{item.Id}",
                Display = item.TestName
            }).ToList(),
            Conclusion = lr.DiagnosisName
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

    // ==================== Condition ====================

    public async Task<FhirBundle> SearchConditionsAsync(string baseUrl, Guid? patientId = null, string? code = null, int count = 20, int offset = 0)
    {
        try
        {
            var query = _context.Examinations
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
                var exam = await _context.Examinations
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
            var query = _context.Allergies
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
            var allergy = await _context.Allergies
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
            var query = _context.SurgeryRecords
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
            var record = await _context.SurgeryRecords
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

    // ==================== Helper Methods ====================

    private static string MapGender(int gender) => gender switch
    {
        1 => "male",
        2 => "female",
        _ => "other"
    };

    private static string MapExamStatus(int status) => status switch
    {
        0 => "planned",
        1 => "in-progress",
        2 => "in-progress",
        3 => "in-progress",
        4 => "finished",
        _ => "unknown"
    };

    private static string MapAdmissionStatus(int status) => status switch
    {
        0 => "in-progress",
        1 => "in-progress",
        2 => "finished",
        3 => "finished",
        4 => "cancelled",
        _ => "unknown"
    };

    private static string MapExamTypeName(int type) => type switch
    {
        1 => "Primary examination",
        2 => "Additional examination",
        3 => "Combined examination",
        _ => "Other"
    };

    private static string MapAdmissionTypeName(int type) => type switch
    {
        1 => "Emergency",
        2 => "Referral",
        3 => "Treatment",
        4 => "Other",
        _ => "Unknown"
    };

    private static string MapSurgeryRole(int role) => role switch
    {
        1 => "Primary Surgeon",
        2 => "Assistant Surgeon",
        3 => "Anesthesiologist",
        4 => "Nurse",
        5 => "Technician",
        _ => "Other"
    };

    private static string? BuildAddressText(string? address, string? ward, string? district, string? province)
    {
        var parts = new List<string>();
        if (!string.IsNullOrEmpty(address)) parts.Add(address);
        if (!string.IsNullOrEmpty(ward)) parts.Add(ward);
        if (!string.IsNullOrEmpty(district)) parts.Add(district);
        if (!string.IsNullOrEmpty(province)) parts.Add(province);
        return parts.Count > 0 ? string.Join(", ", parts) : null;
    }

    private static IQueryable<Examination> FilterExamByFhirStatus(IQueryable<Examination> query, string status) => status switch
    {
        "planned" => query.Where(e => e.Status == 0),
        "in-progress" => query.Where(e => e.Status >= 1 && e.Status <= 3),
        "finished" => query.Where(e => e.Status == 4),
        _ => query
    };

    private static IQueryable<Admission> FilterAdmissionByFhirStatus(IQueryable<Admission> query, string status) => status switch
    {
        "in-progress" => query.Where(a => a.Status == 0 || a.Status == 1),
        "finished" => query.Where(a => a.Status == 2 || a.Status == 3),
        "cancelled" => query.Where(a => a.Status == 4),
        _ => query
    };

    private static IQueryable<PrescriptionDetail> FilterMedRequestByFhirStatus(IQueryable<PrescriptionDetail> query, string status) => status switch
    {
        "active" => query.Where(d => d.Status == 0 || d.Status == 1),
        "completed" => query.Where(d => d.Status == 2),
        "cancelled" => query.Where(d => d.Status == 3),
        _ => query
    };

    private static FhirBundle EmptyBundle(string type, string baseUrl, string resourceType)
    {
        return new FhirBundle
        {
            Type = type,
            Total = 0,
            Link = new List<FhirBundleLink> { new() { Relation = "self", Url = $"{baseUrl}/api/fhir/{resourceType}" } },
            Entry = new List<FhirBundleEntry>()
        };
    }
}
