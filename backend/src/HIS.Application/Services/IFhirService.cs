using HIS.Application.DTOs.FHIR;

namespace HIS.Application.Services;

/// <summary>
/// HL7 FHIR R4 Service Interface
/// Provides FHIR-compliant resource mappings from HIS entities
/// </summary>
public interface IFhirService
{
    // ==================== Capability Statement ====================
    Task<FhirCapabilityStatement> GetCapabilityStatementAsync(string baseUrl);

    // ==================== Patient ====================
    Task<FhirBundle> SearchPatientsAsync(string baseUrl, string? name = null, string? identifier = null, string? phone = null, int count = 20, int offset = 0);
    Task<FhirPatient?> GetPatientAsync(Guid id);

    // ==================== Encounter ====================
    Task<FhirBundle> SearchEncountersAsync(string baseUrl, Guid? patientId = null, string? status = null, string? dateFrom = null, string? dateTo = null, int count = 20, int offset = 0);
    Task<FhirEncounter?> GetEncounterAsync(Guid id, string type = "examination");

    // ==================== Observation ====================
    Task<FhirBundle> SearchObservationsAsync(string baseUrl, Guid? patientId = null, string? category = null, string? code = null, string? dateFrom = null, string? dateTo = null, int count = 20, int offset = 0);
    Task<FhirObservation?> GetObservationAsync(string compositeId);

    // ==================== MedicationRequest ====================
    Task<FhirBundle> SearchMedicationRequestsAsync(string baseUrl, Guid? patientId = null, string? status = null, string? dateFrom = null, string? dateTo = null, int count = 20, int offset = 0);
    Task<FhirMedicationRequest?> GetMedicationRequestAsync(Guid id);

    // ==================== DiagnosticReport ====================
    Task<FhirBundle> SearchDiagnosticReportsAsync(string baseUrl, Guid? patientId = null, string? category = null, string? dateFrom = null, string? dateTo = null, int count = 20, int offset = 0);
    Task<FhirDiagnosticReport?> GetDiagnosticReportAsync(Guid id, string type = "lab");

    // ==================== Condition ====================
    Task<FhirBundle> SearchConditionsAsync(string baseUrl, Guid? patientId = null, string? code = null, int count = 20, int offset = 0);
    Task<FhirCondition?> GetConditionAsync(string compositeId);

    // ==================== AllergyIntolerance ====================
    Task<FhirBundle> SearchAllergyIntolerancesAsync(string baseUrl, Guid? patientId = null, int count = 20, int offset = 0);
    Task<FhirAllergyIntolerance?> GetAllergyIntoleranceAsync(Guid id);

    // ==================== Procedure ====================
    Task<FhirBundle> SearchProceduresAsync(string baseUrl, Guid? patientId = null, string? dateFrom = null, string? dateTo = null, int count = 20, int offset = 0);
    Task<FhirProcedure?> GetProcedureAsync(Guid id);
}

/// <summary>
/// FHIR Client Service for fetching data from external FHIR servers
/// </summary>
public interface IFhirClientService
{
    Task<FhirPatient?> FetchPatientAsync(string serverUrl, string patientId);
    Task<FhirBundle?> FetchEncountersAsync(string serverUrl, string patientId);
    Task<FhirBundle?> FetchObservationsAsync(string serverUrl, string patientId);
    Task<FhirCapabilityStatement?> FetchCapabilityStatementAsync(string serverUrl);
}
