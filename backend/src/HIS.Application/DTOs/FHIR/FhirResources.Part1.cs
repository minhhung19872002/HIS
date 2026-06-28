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

