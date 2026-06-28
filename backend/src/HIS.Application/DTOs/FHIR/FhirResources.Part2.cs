using System.Text.Json.Serialization;

namespace HIS.Application.DTOs.FHIR;
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
