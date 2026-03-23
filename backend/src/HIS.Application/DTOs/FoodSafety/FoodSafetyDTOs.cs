namespace HIS.Application.DTOs;

// ==================== FoodPoisoningIncident DTOs ====================

public class FoodIncidentSearchDto
{
    public string? Keyword { get; set; }
    public int? InvestigationStatus { get; set; }
    public int? SeverityLevel { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
}

public class FoodIncidentListDto
{
    public Guid Id { get; set; }
    public string ReportNumber { get; set; } = string.Empty;
    public string IncidentDate { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? FoodSource { get; set; }
    public string? FoodType { get; set; }
    public int AffectedCount { get; set; }
    public int HospitalizedCount { get; set; }
    public int DeathCount { get; set; }
    public string? SuspectedCause { get; set; }
    public int InvestigationStatus { get; set; }
    public int SeverityLevel { get; set; }
    public bool NotifiedAuthorities { get; set; }
    public int SampleCount { get; set; }
}

public class FoodIncidentCreateDto
{
    public string? ReportNumber { get; set; }
    public string IncidentDate { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? FoodSource { get; set; }
    public string? FoodType { get; set; }
    public int EstimatedExposed { get; set; }
    public int AffectedCount { get; set; }
    public int HospitalizedCount { get; set; }
    public int DeathCount { get; set; }
    public string? Symptoms { get; set; }
    public string? SuspectedCause { get; set; }
    public int SeverityLevel { get; set; } = 1;
    public string? ReportedBy { get; set; }
}

public class FoodIncidentUpdateDto
{
    public string? Location { get; set; }
    public string? FoodSource { get; set; }
    public string? FoodType { get; set; }
    public int? EstimatedExposed { get; set; }
    public int? AffectedCount { get; set; }
    public int? HospitalizedCount { get; set; }
    public int? DeathCount { get; set; }
    public string? Symptoms { get; set; }
    public string? SuspectedCause { get; set; }
    public int? InvestigationStatus { get; set; }
    public int? SeverityLevel { get; set; }
    public Guid? InvestigatorId { get; set; }
    public string? Conclusion { get; set; }
    public string? CorrectiveActions { get; set; }
    public bool? NotifiedAuthorities { get; set; }
}

public class FoodIncidentStatsDto
{
    public int TotalIncidents { get; set; }
    public int ActiveInvestigations { get; set; }
    public int TotalAffected { get; set; }
    public int TotalHospitalized { get; set; }
    public int TotalDeaths { get; set; }
    public List<FoodIncidentBySeverityDto> BySeverity { get; set; } = new();
    public List<FoodIncidentByMonthDto> ByMonth { get; set; } = new();
}

public class FoodIncidentBySeverityDto
{
    public int SeverityLevel { get; set; }
    public int Count { get; set; }
}

public class FoodIncidentByMonthDto
{
    public string Month { get; set; } = string.Empty;
    public int Count { get; set; }
    public int AffectedCount { get; set; }
}

// ==================== FoodSafetySample DTOs ====================

public class FoodSampleCreateDto
{
    public Guid IncidentId { get; set; }
    public string SampleType { get; set; } = string.Empty;
    public string? SampleCode { get; set; }
    public string? CollectedAt { get; set; }
    public string? CollectedBy { get; set; }
}

public class FoodSampleListDto
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public string SampleType { get; set; } = string.Empty;
    public string SampleCode { get; set; } = string.Empty;
    public string? CollectedAt { get; set; }
    public string? CollectedBy { get; set; }
    public string? LabSentAt { get; set; }
    public string? LabResult { get; set; }
    public string? LabResultDate { get; set; }
    public string? PathogensFound { get; set; }
    public bool? IsPositive { get; set; }
}

public class FoodSampleUpdateDto
{
    public string? LabResult { get; set; }
    public string? LabResultDate { get; set; }
    public string? PathogensFound { get; set; }
    public bool? IsPositive { get; set; }
    public string? LabSentAt { get; set; }
}

// ==================== FoodEstablishmentInspection DTOs ====================

public class FoodInspectionSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public string? ComplianceLevel { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
}

public class FoodInspectionListDto
{
    public Guid Id { get; set; }
    public string EstablishmentName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? LicenseNumber { get; set; }
    public string InspectionDate { get; set; } = string.Empty;
    public string? InspectorName { get; set; }
    public int OverallScore { get; set; }
    public string ComplianceLevel { get; set; } = "B";
    public string? ViolationsFound { get; set; }
    public string? CorrectiveDeadline { get; set; }
    public string? FollowUpDate { get; set; }
    public int Status { get; set; }
}

public class FoodInspectionCreateDto
{
    public string EstablishmentName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? LicenseNumber { get; set; }
    public string InspectionDate { get; set; } = string.Empty;
    public Guid? InspectorId { get; set; }
    public string? InspectorName { get; set; }
    public int OverallScore { get; set; }
    public string ComplianceLevel { get; set; } = "B";
    public string? ViolationsFound { get; set; }
    public string? CorrectiveDeadline { get; set; }
    public string? FollowUpDate { get; set; }
}

public class FoodInspectionUpdateDto
{
    public string? EstablishmentName { get; set; }
    public string? Address { get; set; }
    public string? LicenseNumber { get; set; }
    public int? OverallScore { get; set; }
    public string? ComplianceLevel { get; set; }
    public string? ViolationsFound { get; set; }
    public string? CorrectiveDeadline { get; set; }
    public string? FollowUpDate { get; set; }
    public int? Status { get; set; }
}

public class FoodInspectionStatsDto
{
    public int TotalInspections { get; set; }
    public int ScheduledCount { get; set; }
    public int CompletedCount { get; set; }
    public int FollowUpNeededCount { get; set; }
    public double AverageScore { get; set; }
    public List<FoodInspectionByComplianceDto> ByCompliance { get; set; } = new();
}

public class FoodInspectionByComplianceDto
{
    public string ComplianceLevel { get; set; } = string.Empty;
    public int Count { get; set; }
}
