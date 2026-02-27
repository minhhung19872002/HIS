using System.Text.Json.Serialization;

namespace HIS.Application.DTOs.FHIR;

// ==================== FHIR R4 Base Types ====================

/// <summary>
/// FHIR R4 Resource base class
/// </summary>
public abstract class FhirResource
{
    [JsonPropertyName("resourceType")]
    public abstract string ResourceType { get; }

    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("meta")]
    public FhirMeta? Meta { get; set; }

    [JsonPropertyName("text")]
    public FhirNarrative? Text { get; set; }
}

public class FhirMeta
{
    [JsonPropertyName("versionId")]
    public string? VersionId { get; set; }

    [JsonPropertyName("lastUpdated")]
    public string? LastUpdated { get; set; }

    [JsonPropertyName("profile")]
    public List<string>? Profile { get; set; }
}

public class FhirNarrative
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "generated";

    [JsonPropertyName("div")]
    public string Div { get; set; } = string.Empty;
}

public class FhirCoding
{
    [JsonPropertyName("system")]
    public string? System { get; set; }

    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("display")]
    public string? Display { get; set; }
}

public class FhirCodeableConcept
{
    [JsonPropertyName("coding")]
    public List<FhirCoding>? Coding { get; set; }

    [JsonPropertyName("text")]
    public string? Text { get; set; }
}

public class FhirIdentifier
{
    [JsonPropertyName("use")]
    public string? Use { get; set; }

    [JsonPropertyName("type")]
    public FhirCodeableConcept? Type { get; set; }

    [JsonPropertyName("system")]
    public string? System { get; set; }

    [JsonPropertyName("value")]
    public string? Value { get; set; }
}

public class FhirReference
{
    [JsonPropertyName("reference")]
    public string? Reference { get; set; }

    [JsonPropertyName("display")]
    public string? Display { get; set; }
}

public class FhirPeriod
{
    [JsonPropertyName("start")]
    public string? Start { get; set; }

    [JsonPropertyName("end")]
    public string? End { get; set; }
}

public class FhirQuantity
{
    [JsonPropertyName("value")]
    public decimal? Value { get; set; }

    [JsonPropertyName("unit")]
    public string? Unit { get; set; }

    [JsonPropertyName("system")]
    public string? System { get; set; }

    [JsonPropertyName("code")]
    public string? Code { get; set; }
}

public class FhirAnnotation
{
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("time")]
    public string? Time { get; set; }

    [JsonPropertyName("authorReference")]
    public FhirReference? AuthorReference { get; set; }
}

public class FhirDosage
{
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("timing")]
    public FhirTiming? Timing { get; set; }

    [JsonPropertyName("route")]
    public FhirCodeableConcept? Route { get; set; }

    [JsonPropertyName("doseAndRate")]
    public List<FhirDoseAndRate>? DoseAndRate { get; set; }
}

public class FhirTiming
{
    [JsonPropertyName("repeat")]
    public FhirTimingRepeat? Repeat { get; set; }

    [JsonPropertyName("code")]
    public FhirCodeableConcept? Code { get; set; }
}

public class FhirTimingRepeat
{
    [JsonPropertyName("frequency")]
    public int? Frequency { get; set; }

    [JsonPropertyName("period")]
    public decimal? Period { get; set; }

    [JsonPropertyName("periodUnit")]
    public string? PeriodUnit { get; set; }

    [JsonPropertyName("duration")]
    public decimal? Duration { get; set; }

    [JsonPropertyName("durationUnit")]
    public string? DurationUnit { get; set; }
}

public class FhirDoseAndRate
{
    [JsonPropertyName("type")]
    public FhirCodeableConcept? Type { get; set; }

    [JsonPropertyName("doseQuantity")]
    public FhirQuantity? DoseQuantity { get; set; }
}

public class FhirReferenceRange
{
    [JsonPropertyName("low")]
    public FhirQuantity? Low { get; set; }

    [JsonPropertyName("high")]
    public FhirQuantity? High { get; set; }

    [JsonPropertyName("text")]
    public string? Text { get; set; }
}

// ==================== FHIR Bundle ====================

public class FhirBundle : FhirResource
{
    [JsonPropertyName("resourceType")]
    public override string ResourceType => "Bundle";

    [JsonPropertyName("type")]
    public string Type { get; set; } = "searchset";

    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("link")]
    public List<FhirBundleLink>? Link { get; set; }

    [JsonPropertyName("entry")]
    public List<FhirBundleEntry>? Entry { get; set; }
}

public class FhirBundleLink
{
    [JsonPropertyName("relation")]
    public string Relation { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;
}

public class FhirBundleEntry
{
    [JsonPropertyName("fullUrl")]
    public string? FullUrl { get; set; }

    [JsonPropertyName("resource")]
    public FhirResource? Resource { get; set; }

    [JsonPropertyName("search")]
    public FhirBundleEntrySearch? Search { get; set; }
}

public class FhirBundleEntrySearch
{
    [JsonPropertyName("mode")]
    public string Mode { get; set; } = "match";
}

// ==================== FHIR Patient ====================

public class FhirPatient : FhirResource
{
    [JsonPropertyName("resourceType")]
    public override string ResourceType => "Patient";

    [JsonPropertyName("identifier")]
    public List<FhirIdentifier>? Identifier { get; set; }

    [JsonPropertyName("active")]
    public bool Active { get; set; } = true;

    [JsonPropertyName("name")]
    public List<FhirHumanName>? Name { get; set; }

    [JsonPropertyName("telecom")]
    public List<FhirContactPoint>? Telecom { get; set; }

    [JsonPropertyName("gender")]
    public string? Gender { get; set; }

    [JsonPropertyName("birthDate")]
    public string? BirthDate { get; set; }

    [JsonPropertyName("address")]
    public List<FhirAddress>? Address { get; set; }

    [JsonPropertyName("contact")]
    public List<FhirPatientContact>? Contact { get; set; }

    [JsonPropertyName("communication")]
    public List<FhirPatientCommunication>? Communication { get; set; }
}

public class FhirHumanName
{
    [JsonPropertyName("use")]
    public string? Use { get; set; }

    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("family")]
    public string? Family { get; set; }

    [JsonPropertyName("given")]
    public List<string>? Given { get; set; }
}

public class FhirContactPoint
{
    [JsonPropertyName("system")]
    public string? System { get; set; }

    [JsonPropertyName("value")]
    public string? Value { get; set; }

    [JsonPropertyName("use")]
    public string? Use { get; set; }
}

public class FhirAddress
{
    [JsonPropertyName("use")]
    public string? Use { get; set; }

    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("line")]
    public List<string>? Line { get; set; }

    [JsonPropertyName("city")]
    public string? City { get; set; }

    [JsonPropertyName("district")]
    public string? District { get; set; }

    [JsonPropertyName("state")]
    public string? State { get; set; }

    [JsonPropertyName("country")]
    public string? Country { get; set; }
}

public class FhirPatientContact
{
    [JsonPropertyName("relationship")]
    public List<FhirCodeableConcept>? Relationship { get; set; }

    [JsonPropertyName("name")]
    public FhirHumanName? Name { get; set; }

    [JsonPropertyName("telecom")]
    public List<FhirContactPoint>? Telecom { get; set; }
}

public class FhirPatientCommunication
{
    [JsonPropertyName("language")]
    public FhirCodeableConcept? Language { get; set; }

    [JsonPropertyName("preferred")]
    public bool? Preferred { get; set; }
}

// ==================== FHIR Encounter ====================

public class FhirEncounter : FhirResource
{
    [JsonPropertyName("resourceType")]
    public override string ResourceType => "Encounter";

    [JsonPropertyName("identifier")]
    public List<FhirIdentifier>? Identifier { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("class")]
    public FhirCoding? Class { get; set; }

    [JsonPropertyName("type")]
    public List<FhirCodeableConcept>? Type { get; set; }

    [JsonPropertyName("subject")]
    public FhirReference? Subject { get; set; }

    [JsonPropertyName("participant")]
    public List<FhirEncounterParticipant>? Participant { get; set; }

    [JsonPropertyName("period")]
    public FhirPeriod? Period { get; set; }

    [JsonPropertyName("reasonCode")]
    public List<FhirCodeableConcept>? ReasonCode { get; set; }

    [JsonPropertyName("diagnosis")]
    public List<FhirEncounterDiagnosis>? Diagnosis { get; set; }

    [JsonPropertyName("location")]
    public List<FhirEncounterLocation>? Location { get; set; }

    [JsonPropertyName("serviceProvider")]
    public FhirReference? ServiceProvider { get; set; }
}

public class FhirEncounterParticipant
{
    [JsonPropertyName("type")]
    public List<FhirCodeableConcept>? Type { get; set; }

    [JsonPropertyName("individual")]
    public FhirReference? Individual { get; set; }

    [JsonPropertyName("period")]
    public FhirPeriod? Period { get; set; }
}

public class FhirEncounterDiagnosis
{
    [JsonPropertyName("condition")]
    public FhirReference? Condition { get; set; }

    [JsonPropertyName("use")]
    public FhirCodeableConcept? Use { get; set; }

    [JsonPropertyName("rank")]
    public int? Rank { get; set; }
}

public class FhirEncounterLocation
{
    [JsonPropertyName("location")]
    public FhirReference? Location { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("period")]
    public FhirPeriod? Period { get; set; }
}

// ==================== FHIR Observation ====================

public class FhirObservation : FhirResource
{
    [JsonPropertyName("resourceType")]
    public override string ResourceType => "Observation";

    [JsonPropertyName("identifier")]
    public List<FhirIdentifier>? Identifier { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("category")]
    public List<FhirCodeableConcept>? Category { get; set; }

    [JsonPropertyName("code")]
    public FhirCodeableConcept? Code { get; set; }

    [JsonPropertyName("subject")]
    public FhirReference? Subject { get; set; }

    [JsonPropertyName("encounter")]
    public FhirReference? Encounter { get; set; }

    [JsonPropertyName("effectiveDateTime")]
    public string? EffectiveDateTime { get; set; }

    [JsonPropertyName("issued")]
    public string? Issued { get; set; }

    [JsonPropertyName("performer")]
    public List<FhirReference>? Performer { get; set; }

    [JsonPropertyName("valueQuantity")]
    public FhirQuantity? ValueQuantity { get; set; }

    [JsonPropertyName("valueString")]
    public string? ValueString { get; set; }

    [JsonPropertyName("interpretation")]
    public List<FhirCodeableConcept>? Interpretation { get; set; }

    [JsonPropertyName("referenceRange")]
    public List<FhirReferenceRange>? ReferenceRange { get; set; }

    [JsonPropertyName("component")]
    public List<FhirObservationComponent>? Component { get; set; }
}

public class FhirObservationComponent
{
    [JsonPropertyName("code")]
    public FhirCodeableConcept? Code { get; set; }

    [JsonPropertyName("valueQuantity")]
    public FhirQuantity? ValueQuantity { get; set; }

    [JsonPropertyName("valueString")]
    public string? ValueString { get; set; }

    [JsonPropertyName("interpretation")]
    public List<FhirCodeableConcept>? Interpretation { get; set; }

    [JsonPropertyName("referenceRange")]
    public List<FhirReferenceRange>? ReferenceRange { get; set; }
}

// ==================== FHIR MedicationRequest ====================

public class FhirMedicationRequest : FhirResource
{
    [JsonPropertyName("resourceType")]
    public override string ResourceType => "MedicationRequest";

    [JsonPropertyName("identifier")]
    public List<FhirIdentifier>? Identifier { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("intent")]
    public string Intent { get; set; } = "order";

    [JsonPropertyName("category")]
    public List<FhirCodeableConcept>? Category { get; set; }

    [JsonPropertyName("medicationCodeableConcept")]
    public FhirCodeableConcept? MedicationCodeableConcept { get; set; }

    [JsonPropertyName("subject")]
    public FhirReference? Subject { get; set; }

    [JsonPropertyName("encounter")]
    public FhirReference? Encounter { get; set; }

    [JsonPropertyName("authoredOn")]
    public string? AuthoredOn { get; set; }

    [JsonPropertyName("requester")]
    public FhirReference? Requester { get; set; }

    [JsonPropertyName("reasonCode")]
    public List<FhirCodeableConcept>? ReasonCode { get; set; }

    [JsonPropertyName("note")]
    public List<FhirAnnotation>? Note { get; set; }

    [JsonPropertyName("dosageInstruction")]
    public List<FhirDosage>? DosageInstruction { get; set; }

    [JsonPropertyName("dispenseRequest")]
    public FhirMedicationDispenseRequest? DispenseRequest { get; set; }
}

public class FhirMedicationDispenseRequest
{
    [JsonPropertyName("validityPeriod")]
    public FhirPeriod? ValidityPeriod { get; set; }

    [JsonPropertyName("numberOfRepeatsAllowed")]
    public int? NumberOfRepeatsAllowed { get; set; }

    [JsonPropertyName("quantity")]
    public FhirQuantity? Quantity { get; set; }

    [JsonPropertyName("expectedSupplyDuration")]
    public FhirQuantity? ExpectedSupplyDuration { get; set; }
}

// ==================== FHIR DiagnosticReport ====================

public class FhirDiagnosticReport : FhirResource
{
    [JsonPropertyName("resourceType")]
    public override string ResourceType => "DiagnosticReport";

    [JsonPropertyName("identifier")]
    public List<FhirIdentifier>? Identifier { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("category")]
    public List<FhirCodeableConcept>? Category { get; set; }

    [JsonPropertyName("code")]
    public FhirCodeableConcept? Code { get; set; }

    [JsonPropertyName("subject")]
    public FhirReference? Subject { get; set; }

    [JsonPropertyName("encounter")]
    public FhirReference? Encounter { get; set; }

    [JsonPropertyName("effectiveDateTime")]
    public string? EffectiveDateTime { get; set; }

    [JsonPropertyName("issued")]
    public string? Issued { get; set; }

    [JsonPropertyName("performer")]
    public List<FhirReference>? Performer { get; set; }

    [JsonPropertyName("result")]
    public List<FhirReference>? Result { get; set; }

    [JsonPropertyName("conclusion")]
    public string? Conclusion { get; set; }

    [JsonPropertyName("conclusionCode")]
    public List<FhirCodeableConcept>? ConclusionCode { get; set; }
}

// ==================== FHIR Condition ====================

public class FhirCondition : FhirResource
{
    [JsonPropertyName("resourceType")]
    public override string ResourceType => "Condition";

    [JsonPropertyName("identifier")]
    public List<FhirIdentifier>? Identifier { get; set; }

    [JsonPropertyName("clinicalStatus")]
    public FhirCodeableConcept? ClinicalStatus { get; set; }

    [JsonPropertyName("verificationStatus")]
    public FhirCodeableConcept? VerificationStatus { get; set; }

    [JsonPropertyName("category")]
    public List<FhirCodeableConcept>? Category { get; set; }

    [JsonPropertyName("severity")]
    public FhirCodeableConcept? Severity { get; set; }

    [JsonPropertyName("code")]
    public FhirCodeableConcept? Code { get; set; }

    [JsonPropertyName("subject")]
    public FhirReference? Subject { get; set; }

    [JsonPropertyName("encounter")]
    public FhirReference? Encounter { get; set; }

    [JsonPropertyName("onsetDateTime")]
    public string? OnsetDateTime { get; set; }

    [JsonPropertyName("recordedDate")]
    public string? RecordedDate { get; set; }

    [JsonPropertyName("recorder")]
    public FhirReference? Recorder { get; set; }

    [JsonPropertyName("note")]
    public List<FhirAnnotation>? Note { get; set; }
}

// ==================== FHIR AllergyIntolerance ====================

public class FhirAllergyIntolerance : FhirResource
{
    [JsonPropertyName("resourceType")]
    public override string ResourceType => "AllergyIntolerance";

    [JsonPropertyName("identifier")]
    public List<FhirIdentifier>? Identifier { get; set; }

    [JsonPropertyName("clinicalStatus")]
    public FhirCodeableConcept? ClinicalStatus { get; set; }

    [JsonPropertyName("verificationStatus")]
    public FhirCodeableConcept? VerificationStatus { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("category")]
    public List<string>? Category { get; set; }

    [JsonPropertyName("criticality")]
    public string? Criticality { get; set; }

    [JsonPropertyName("code")]
    public FhirCodeableConcept? Code { get; set; }

    [JsonPropertyName("patient")]
    public FhirReference? Patient { get; set; }

    [JsonPropertyName("onsetDateTime")]
    public string? OnsetDateTime { get; set; }

    [JsonPropertyName("recordedDate")]
    public string? RecordedDate { get; set; }

    [JsonPropertyName("recorder")]
    public FhirReference? Recorder { get; set; }

    [JsonPropertyName("note")]
    public List<FhirAnnotation>? Note { get; set; }

    [JsonPropertyName("reaction")]
    public List<FhirAllergyReaction>? Reaction { get; set; }
}

public class FhirAllergyReaction
{
    [JsonPropertyName("substance")]
    public FhirCodeableConcept? Substance { get; set; }

    [JsonPropertyName("manifestation")]
    public List<FhirCodeableConcept>? Manifestation { get; set; }

    [JsonPropertyName("severity")]
    public string? Severity { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

// ==================== FHIR Procedure ====================

public class FhirProcedure : FhirResource
{
    [JsonPropertyName("resourceType")]
    public override string ResourceType => "Procedure";

    [JsonPropertyName("identifier")]
    public List<FhirIdentifier>? Identifier { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("category")]
    public FhirCodeableConcept? Category { get; set; }

    [JsonPropertyName("code")]
    public FhirCodeableConcept? Code { get; set; }

    [JsonPropertyName("subject")]
    public FhirReference? Subject { get; set; }

    [JsonPropertyName("encounter")]
    public FhirReference? Encounter { get; set; }

    [JsonPropertyName("performedPeriod")]
    public FhirPeriod? PerformedPeriod { get; set; }

    [JsonPropertyName("performer")]
    public List<FhirProcedurePerformer>? Performer { get; set; }

    [JsonPropertyName("reasonCode")]
    public List<FhirCodeableConcept>? ReasonCode { get; set; }

    [JsonPropertyName("bodySite")]
    public List<FhirCodeableConcept>? BodySite { get; set; }

    [JsonPropertyName("outcome")]
    public FhirCodeableConcept? Outcome { get; set; }

    [JsonPropertyName("complication")]
    public List<FhirCodeableConcept>? Complication { get; set; }

    [JsonPropertyName("note")]
    public List<FhirAnnotation>? Note { get; set; }
}

public class FhirProcedurePerformer
{
    [JsonPropertyName("function")]
    public FhirCodeableConcept? Function { get; set; }

    [JsonPropertyName("actor")]
    public FhirReference? Actor { get; set; }
}

// ==================== FHIR CapabilityStatement ====================

public class FhirCapabilityStatement : FhirResource
{
    [JsonPropertyName("resourceType")]
    public override string ResourceType => "CapabilityStatement";

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("version")]
    public string? Version { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "active";

    [JsonPropertyName("date")]
    public string? Date { get; set; }

    [JsonPropertyName("publisher")]
    public string? Publisher { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("kind")]
    public string Kind { get; set; } = "instance";

    [JsonPropertyName("software")]
    public FhirCapabilitySoftware? Software { get; set; }

    [JsonPropertyName("fhirVersion")]
    public string FhirVersion { get; set; } = "4.0.1";

    [JsonPropertyName("format")]
    public List<string> Format { get; set; } = new() { "json" };

    [JsonPropertyName("rest")]
    public List<FhirCapabilityRest>? Rest { get; set; }
}

public class FhirCapabilitySoftware
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("version")]
    public string? Version { get; set; }
}

public class FhirCapabilityRest
{
    [JsonPropertyName("mode")]
    public string Mode { get; set; } = "server";

    [JsonPropertyName("resource")]
    public List<FhirCapabilityRestResource>? Resource { get; set; }
}

public class FhirCapabilityRestResource
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("interaction")]
    public List<FhirCapabilityInteraction>? Interaction { get; set; }

    [JsonPropertyName("searchParam")]
    public List<FhirCapabilitySearchParam>? SearchParam { get; set; }
}

public class FhirCapabilityInteraction
{
    [JsonPropertyName("code")]
    public string? Code { get; set; }
}

public class FhirCapabilitySearchParam
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }
}

// ==================== FHIR OperationOutcome ====================

public class FhirOperationOutcome : FhirResource
{
    [JsonPropertyName("resourceType")]
    public override string ResourceType => "OperationOutcome";

    [JsonPropertyName("issue")]
    public List<FhirOperationOutcomeIssue>? Issue { get; set; }
}

public class FhirOperationOutcomeIssue
{
    [JsonPropertyName("severity")]
    public string? Severity { get; set; }

    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("diagnostics")]
    public string? Diagnostics { get; set; }
}
