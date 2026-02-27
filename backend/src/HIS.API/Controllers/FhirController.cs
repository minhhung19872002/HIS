using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.FHIR;
using HIS.Application.Services;

namespace HIS.API.Controllers;

/// <summary>
/// HL7 FHIR R4 REST API Controller
/// Implements FHIR-compliant endpoints for health information exchange
/// Conforms to TT 54/2017, TT 32/2023, TT 13/2025 Level 6 requirements
/// </summary>
[ApiController]
[Route("api/fhir")]
[Produces("application/fhir+json")]
public class FhirController : ControllerBase
{
    private readonly IFhirService _fhirService;
    private readonly IFhirClientService _fhirClientService;

    public FhirController(IFhirService fhirService, IFhirClientService fhirClientService)
    {
        _fhirService = fhirService;
        _fhirClientService = fhirClientService;
    }

    private string GetBaseUrl() => $"{Request.Scheme}://{Request.Host}";

    // ==================== Capability Statement ====================

    /// <summary>
    /// GET /api/fhir/metadata - FHIR Capability Statement
    /// Returns what this FHIR server supports
    /// </summary>
    [HttpGet("metadata")]
    [AllowAnonymous]
    public async Task<IActionResult> GetMetadata()
    {
        var statement = await _fhirService.GetCapabilityStatementAsync(GetBaseUrl());
        return FhirResult(statement);
    }

    // ==================== Patient ====================

    /// <summary>
    /// GET /api/fhir/Patient - Search patients
    /// </summary>
    [Authorize]
    [HttpGet("Patient")]
    public async Task<IActionResult> SearchPatients(
        [FromQuery] string? name = null,
        [FromQuery] string? identifier = null,
        [FromQuery] string? phone = null,
        [FromQuery(Name = "_count")] int count = 20,
        [FromQuery(Name = "_offset")] int offset = 0)
    {
        var bundle = await _fhirService.SearchPatientsAsync(GetBaseUrl(), name, identifier, phone, count, offset);
        return FhirResult(bundle);
    }

    /// <summary>
    /// GET /api/fhir/Patient/{id} - Read patient by ID
    /// </summary>
    [Authorize]
    [HttpGet("Patient/{id}")]
    public async Task<IActionResult> GetPatient(Guid id)
    {
        var patient = await _fhirService.GetPatientAsync(id);
        if (patient == null)
            return FhirNotFound("Patient", id.ToString());
        return FhirResult(patient);
    }

    // ==================== Encounter ====================

    /// <summary>
    /// GET /api/fhir/Encounter - Search encounters (examinations + admissions)
    /// </summary>
    [Authorize]
    [HttpGet("Encounter")]
    public async Task<IActionResult> SearchEncounters(
        [FromQuery] Guid? patient = null,
        [FromQuery] string? status = null,
        [FromQuery] string? date = null,
        [FromQuery(Name = "_count")] int count = 20,
        [FromQuery(Name = "_offset")] int offset = 0)
    {
        // Parse date range: "ge2024-01-01" or "le2024-12-31" or just "2024-01-01"
        string? dateFrom = null, dateTo = null;
        if (!string.IsNullOrEmpty(date))
        {
            if (date.StartsWith("ge")) dateFrom = date[2..];
            else if (date.StartsWith("le")) dateTo = date[2..];
            else { dateFrom = date; dateTo = date; }
        }

        var bundle = await _fhirService.SearchEncountersAsync(GetBaseUrl(), patient, status, dateFrom, dateTo, count, offset);
        return FhirResult(bundle);
    }

    /// <summary>
    /// GET /api/fhir/Encounter/{id} - Read encounter by composite ID
    /// Format: exam-{guid} or adm-{guid}
    /// </summary>
    [Authorize]
    [HttpGet("Encounter/{id}")]
    public async Task<IActionResult> GetEncounter(string id)
    {
        if (id.StartsWith("adm-") && Guid.TryParse(id[4..], out var admId))
        {
            var encounter = await _fhirService.GetEncounterAsync(admId, "admission");
            if (encounter == null) return FhirNotFound("Encounter", id);
            return FhirResult(encounter);
        }
        else if (id.StartsWith("exam-") && Guid.TryParse(id[5..], out var examId))
        {
            var encounter = await _fhirService.GetEncounterAsync(examId, "examination");
            if (encounter == null) return FhirNotFound("Encounter", id);
            return FhirResult(encounter);
        }
        else if (Guid.TryParse(id, out var rawId))
        {
            // Try examination first, then admission
            var encounter = await _fhirService.GetEncounterAsync(rawId, "examination");
            if (encounter == null)
                encounter = await _fhirService.GetEncounterAsync(rawId, "admission");
            if (encounter == null) return FhirNotFound("Encounter", id);
            return FhirResult(encounter);
        }

        return FhirNotFound("Encounter", id);
    }

    // ==================== Observation ====================

    /// <summary>
    /// GET /api/fhir/Observation - Search observations (vital signs + lab results)
    /// </summary>
    [Authorize]
    [HttpGet("Observation")]
    public async Task<IActionResult> SearchObservations(
        [FromQuery] Guid? patient = null,
        [FromQuery] string? category = null,
        [FromQuery] string? code = null,
        [FromQuery] string? date = null,
        [FromQuery(Name = "_count")] int count = 20,
        [FromQuery(Name = "_offset")] int offset = 0)
    {
        string? dateFrom = null, dateTo = null;
        if (!string.IsNullOrEmpty(date))
        {
            if (date.StartsWith("ge")) dateFrom = date[2..];
            else if (date.StartsWith("le")) dateTo = date[2..];
            else { dateFrom = date; dateTo = date; }
        }

        var bundle = await _fhirService.SearchObservationsAsync(GetBaseUrl(), patient, category, code, dateFrom, dateTo, count, offset);
        return FhirResult(bundle);
    }

    /// <summary>
    /// GET /api/fhir/Observation/{id} - Read observation
    /// Format: vs-{guid} or lab-{guid}
    /// </summary>
    [Authorize]
    [HttpGet("Observation/{id}")]
    public async Task<IActionResult> GetObservation(string id)
    {
        var observation = await _fhirService.GetObservationAsync(id);
        if (observation == null) return FhirNotFound("Observation", id);
        return FhirResult(observation);
    }

    // ==================== MedicationRequest ====================

    /// <summary>
    /// GET /api/fhir/MedicationRequest - Search medication requests (prescriptions)
    /// </summary>
    [Authorize]
    [HttpGet("MedicationRequest")]
    public async Task<IActionResult> SearchMedicationRequests(
        [FromQuery] Guid? patient = null,
        [FromQuery] string? status = null,
        [FromQuery] string? authoredon = null,
        [FromQuery(Name = "_count")] int count = 20,
        [FromQuery(Name = "_offset")] int offset = 0)
    {
        string? dateFrom = null, dateTo = null;
        if (!string.IsNullOrEmpty(authoredon))
        {
            if (authoredon.StartsWith("ge")) dateFrom = authoredon[2..];
            else if (authoredon.StartsWith("le")) dateTo = authoredon[2..];
            else { dateFrom = authoredon; dateTo = authoredon; }
        }

        var bundle = await _fhirService.SearchMedicationRequestsAsync(GetBaseUrl(), patient, status, dateFrom, dateTo, count, offset);
        return FhirResult(bundle);
    }

    /// <summary>
    /// GET /api/fhir/MedicationRequest/{id} - Read medication request
    /// </summary>
    [Authorize]
    [HttpGet("MedicationRequest/{id}")]
    public async Task<IActionResult> GetMedicationRequest(Guid id)
    {
        var medRequest = await _fhirService.GetMedicationRequestAsync(id);
        if (medRequest == null) return FhirNotFound("MedicationRequest", id.ToString());
        return FhirResult(medRequest);
    }

    // ==================== DiagnosticReport ====================

    /// <summary>
    /// GET /api/fhir/DiagnosticReport - Search diagnostic reports (lab + radiology)
    /// </summary>
    [Authorize]
    [HttpGet("DiagnosticReport")]
    public async Task<IActionResult> SearchDiagnosticReports(
        [FromQuery] Guid? patient = null,
        [FromQuery] string? category = null,
        [FromQuery] string? date = null,
        [FromQuery(Name = "_count")] int count = 20,
        [FromQuery(Name = "_offset")] int offset = 0)
    {
        string? dateFrom = null, dateTo = null;
        if (!string.IsNullOrEmpty(date))
        {
            if (date.StartsWith("ge")) dateFrom = date[2..];
            else if (date.StartsWith("le")) dateTo = date[2..];
            else { dateFrom = date; dateTo = date; }
        }

        var bundle = await _fhirService.SearchDiagnosticReportsAsync(GetBaseUrl(), patient, category, dateFrom, dateTo, count, offset);
        return FhirResult(bundle);
    }

    /// <summary>
    /// GET /api/fhir/DiagnosticReport/{id} - Read diagnostic report
    /// Format: lab-{guid} or rad-{guid}
    /// </summary>
    [Authorize]
    [HttpGet("DiagnosticReport/{id}")]
    public async Task<IActionResult> GetDiagnosticReport(string id)
    {
        if (id.StartsWith("rad-") && Guid.TryParse(id[4..], out var radId))
        {
            var report = await _fhirService.GetDiagnosticReportAsync(radId, "rad");
            if (report == null) return FhirNotFound("DiagnosticReport", id);
            return FhirResult(report);
        }
        else if (id.StartsWith("lab-") && Guid.TryParse(id[4..], out var labId))
        {
            var report = await _fhirService.GetDiagnosticReportAsync(labId, "lab");
            if (report == null) return FhirNotFound("DiagnosticReport", id);
            return FhirResult(report);
        }
        else if (Guid.TryParse(id, out var rawId))
        {
            var report = await _fhirService.GetDiagnosticReportAsync(rawId, "lab");
            if (report == null)
                report = await _fhirService.GetDiagnosticReportAsync(rawId, "rad");
            if (report == null) return FhirNotFound("DiagnosticReport", id);
            return FhirResult(report);
        }

        return FhirNotFound("DiagnosticReport", id);
    }

    // ==================== Condition ====================

    /// <summary>
    /// GET /api/fhir/Condition - Search conditions (diagnoses)
    /// </summary>
    [Authorize]
    [HttpGet("Condition")]
    public async Task<IActionResult> SearchConditions(
        [FromQuery] Guid? patient = null,
        [FromQuery] string? code = null,
        [FromQuery(Name = "_count")] int count = 20,
        [FromQuery(Name = "_offset")] int offset = 0)
    {
        var bundle = await _fhirService.SearchConditionsAsync(GetBaseUrl(), patient, code, count, offset);
        return FhirResult(bundle);
    }

    /// <summary>
    /// GET /api/fhir/Condition/{id} - Read condition
    /// Format: exam-{guid}
    /// </summary>
    [Authorize]
    [HttpGet("Condition/{id}")]
    public async Task<IActionResult> GetCondition(string id)
    {
        var condition = await _fhirService.GetConditionAsync(id);
        if (condition == null) return FhirNotFound("Condition", id);
        return FhirResult(condition);
    }

    // ==================== AllergyIntolerance ====================

    /// <summary>
    /// GET /api/fhir/AllergyIntolerance - Search allergies
    /// </summary>
    [Authorize]
    [HttpGet("AllergyIntolerance")]
    public async Task<IActionResult> SearchAllergyIntolerances(
        [FromQuery] Guid? patient = null,
        [FromQuery(Name = "_count")] int count = 20,
        [FromQuery(Name = "_offset")] int offset = 0)
    {
        var bundle = await _fhirService.SearchAllergyIntolerancesAsync(GetBaseUrl(), patient, count, offset);
        return FhirResult(bundle);
    }

    /// <summary>
    /// GET /api/fhir/AllergyIntolerance/{id} - Read allergy
    /// </summary>
    [Authorize]
    [HttpGet("AllergyIntolerance/{id}")]
    public async Task<IActionResult> GetAllergyIntolerance(Guid id)
    {
        var allergy = await _fhirService.GetAllergyIntoleranceAsync(id);
        if (allergy == null) return FhirNotFound("AllergyIntolerance", id.ToString());
        return FhirResult(allergy);
    }

    // ==================== Procedure ====================

    /// <summary>
    /// GET /api/fhir/Procedure - Search procedures (surgeries)
    /// </summary>
    [Authorize]
    [HttpGet("Procedure")]
    public async Task<IActionResult> SearchProcedures(
        [FromQuery] Guid? patient = null,
        [FromQuery] string? date = null,
        [FromQuery(Name = "_count")] int count = 20,
        [FromQuery(Name = "_offset")] int offset = 0)
    {
        string? dateFrom = null, dateTo = null;
        if (!string.IsNullOrEmpty(date))
        {
            if (date.StartsWith("ge")) dateFrom = date[2..];
            else if (date.StartsWith("le")) dateTo = date[2..];
            else { dateFrom = date; dateTo = date; }
        }

        var bundle = await _fhirService.SearchProceduresAsync(GetBaseUrl(), patient, dateFrom, dateTo, count, offset);
        return FhirResult(bundle);
    }

    /// <summary>
    /// GET /api/fhir/Procedure/{id} - Read procedure
    /// </summary>
    [Authorize]
    [HttpGet("Procedure/{id}")]
    public async Task<IActionResult> GetProcedure(Guid id)
    {
        var procedure = await _fhirService.GetProcedureAsync(id);
        if (procedure == null) return FhirNotFound("Procedure", id.ToString());
        return FhirResult(procedure);
    }

    // ==================== External FHIR Client Endpoints ====================

    /// <summary>
    /// GET /api/fhir/external/metadata?serverUrl=... - Test external FHIR server
    /// </summary>
    [Authorize]
    [HttpGet("external/metadata")]
    public async Task<IActionResult> FetchExternalMetadata([FromQuery] string serverUrl)
    {
        if (string.IsNullOrEmpty(serverUrl))
            return BadRequest(new FhirOperationOutcome
            {
                Issue = new List<FhirOperationOutcomeIssue> { new() { Severity = "error", Code = "required", Diagnostics = "serverUrl is required" } }
            });

        var statement = await _fhirClientService.FetchCapabilityStatementAsync(serverUrl);
        if (statement == null)
            return FhirNotFound("CapabilityStatement", serverUrl);
        return FhirResult(statement);
    }

    /// <summary>
    /// GET /api/fhir/external/Patient/{patientId}?serverUrl=... - Fetch patient from external server
    /// </summary>
    [Authorize]
    [HttpGet("external/Patient/{patientId}")]
    public async Task<IActionResult> FetchExternalPatient(string patientId, [FromQuery] string serverUrl)
    {
        if (string.IsNullOrEmpty(serverUrl))
            return BadRequest(new FhirOperationOutcome
            {
                Issue = new List<FhirOperationOutcomeIssue> { new() { Severity = "error", Code = "required", Diagnostics = "serverUrl is required" } }
            });

        var patient = await _fhirClientService.FetchPatientAsync(serverUrl, patientId);
        if (patient == null)
            return FhirNotFound("Patient", patientId);
        return FhirResult(patient);
    }

    /// <summary>
    /// GET /api/fhir/external/Encounter?patient={patientId}&serverUrl=... - Fetch encounters from external server
    /// </summary>
    [Authorize]
    [HttpGet("external/Encounter")]
    public async Task<IActionResult> FetchExternalEncounters([FromQuery] string patient, [FromQuery] string serverUrl)
    {
        if (string.IsNullOrEmpty(serverUrl) || string.IsNullOrEmpty(patient))
            return BadRequest(new FhirOperationOutcome
            {
                Issue = new List<FhirOperationOutcomeIssue> { new() { Severity = "error", Code = "required", Diagnostics = "serverUrl and patient are required" } }
            });

        var bundle = await _fhirClientService.FetchEncountersAsync(serverUrl, patient);
        if (bundle == null)
            return FhirNotFound("Encounter", $"patient={patient}");
        return FhirResult(bundle);
    }

    // ==================== Helper Methods ====================

    private ContentResult FhirResult(FhirResource resource)
    {
        var json = System.Text.Json.JsonSerializer.Serialize<object>(resource, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
            WriteIndented = true
        });

        return new ContentResult
        {
            Content = json,
            ContentType = "application/fhir+json; charset=utf-8",
            StatusCode = 200
        };
    }

    private ContentResult FhirNotFound(string resourceType, string id)
    {
        var outcome = new FhirOperationOutcome
        {
            Issue = new List<FhirOperationOutcomeIssue>
            {
                new()
                {
                    Severity = "error",
                    Code = "not-found",
                    Diagnostics = $"{resourceType}/{id} not found"
                }
            }
        };

        var json = System.Text.Json.JsonSerializer.Serialize<object>(outcome, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
            WriteIndented = true
        });

        return new ContentResult
        {
            Content = json,
            ContentType = "application/fhir+json; charset=utf-8",
            StatusCode = 404
        };
    }
}
