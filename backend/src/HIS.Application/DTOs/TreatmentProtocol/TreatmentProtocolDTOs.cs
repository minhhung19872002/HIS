namespace HIS.Application.DTOs;

public class TreatmentProtocolSearchDto
{
    public string? Keyword { get; set; }
    public string? IcdCode { get; set; }
    public string? DiseaseGroup { get; set; }
    public string? Department { get; set; }
    public int? Status { get; set; }
    public int PageIndex { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class TreatmentProtocolDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IcdCode { get; set; }
    public string? IcdName { get; set; }
    public string? DiseaseGroup { get; set; }
    public int Version { get; set; }
    public int Status { get; set; }
    public string? StatusName { get; set; }
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedDate { get; set; }
    public DateTime? EffectiveDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string? Department { get; set; }
    public string? References { get; set; }
    public string? Notes { get; set; }
    public int StepCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<TreatmentProtocolStepDto> Steps { get; set; } = new();
}

public class TreatmentProtocolStepDto
{
    public Guid Id { get; set; }
    public int StepOrder { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ActivityType { get; set; }
    public string? MedicationName { get; set; }
    public string? MedicationDose { get; set; }
    public string? MedicationRoute { get; set; }
    public string? MedicationFrequency { get; set; }
    public int? DurationDays { get; set; }
    public string? ServiceCode { get; set; }
    public string? ServiceName { get; set; }
    public string? Conditions { get; set; }
    public string? ExpectedOutcome { get; set; }
    public string? Notes { get; set; }
    public bool IsOptional { get; set; }
}

public class SaveTreatmentProtocolDto
{
    public Guid? Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IcdCode { get; set; }
    public string? IcdName { get; set; }
    public string? DiseaseGroup { get; set; }
    public string? Department { get; set; }
    public string? References { get; set; }
    public string? Notes { get; set; }
    public List<TreatmentProtocolStepDto> Steps { get; set; } = new();
}

public class TreatmentProtocolPagedResult
{
    public List<TreatmentProtocolDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

public class ProtocolEvaluationDto
{
    public Guid ProtocolId { get; set; }
    public string ProtocolName { get; set; } = string.Empty;
    public int TotalSteps { get; set; }
    public int CompletedSteps { get; set; }
    public int PendingSteps { get; set; }
    public double ComplianceRate { get; set; }
    public List<ProtocolStepEvaluationDto> StepEvaluations { get; set; } = new();
}

public class ProtocolStepEvaluationDto
{
    public int StepOrder { get; set; }
    public string StepName { get; set; } = string.Empty;
    public string ActivityType { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public string? CompletedNote { get; set; }
}
