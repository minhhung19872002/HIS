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
public partial class FhirService : IFhirService
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
