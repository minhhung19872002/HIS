namespace HIS.Core.Entities;

/// <summary>
/// Sự cố ngộ độc thực phẩm - FoodPoisoningIncident
/// </summary>
public class FoodPoisoningIncident : BaseEntity
{
    public string ReportNumber { get; set; } = string.Empty;
    public DateTime IncidentDate { get; set; }
    public string Location { get; set; } = string.Empty;
    public string? FoodSource { get; set; }
    public string? FoodType { get; set; }
    public int EstimatedExposed { get; set; }
    public int AffectedCount { get; set; }
    public int HospitalizedCount { get; set; }
    public int DeathCount { get; set; }
    public string? Symptoms { get; set; } // JSON or comma-separated
    public string? SuspectedCause { get; set; }
    /// <summary>
    /// 0=Reported, 1=Investigating, 2=Confirmed, 3=Closed
    /// </summary>
    public int InvestigationStatus { get; set; }
    /// <summary>
    /// 1=Minor, 2=Moderate, 3=Serious, 4=Critical
    /// </summary>
    public int SeverityLevel { get; set; } = 1;
    public string? ReportedBy { get; set; }
    public DateTime? ReportedAt { get; set; }
    public Guid? InvestigatorId { get; set; }
    public DateTime? InvestigationStartedAt { get; set; }
    public DateTime? InvestigationCompletedAt { get; set; }
    public string? Conclusion { get; set; }
    public string? CorrectiveActions { get; set; }
    public bool NotifiedAuthorities { get; set; }

    // Navigation
    public virtual ICollection<FoodSafetySample> Samples { get; set; } = new List<FoodSafetySample>();
}

/// <summary>
/// Mẫu xét nghiệm an toàn thực phẩm - FoodSafetySample
/// </summary>
public class FoodSafetySample : BaseEntity
{
    public Guid IncidentId { get; set; }
    /// <summary>
    /// Food, Water, Swab, Biological
    /// </summary>
    public string SampleType { get; set; } = string.Empty;
    public string SampleCode { get; set; } = string.Empty;
    public DateTime CollectedAt { get; set; }
    public string? CollectedBy { get; set; }
    public DateTime? LabSentAt { get; set; }
    public string? LabResult { get; set; }
    public DateTime? LabResultDate { get; set; }
    public string? PathogensFound { get; set; }
    public bool? IsPositive { get; set; }

    // Navigation
    public virtual FoodPoisoningIncident? Incident { get; set; }
}

/// <summary>
/// Thanh tra cơ sở thực phẩm - FoodEstablishmentInspection
/// </summary>
public class FoodEstablishmentInspection : BaseEntity
{
    public string EstablishmentName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? LicenseNumber { get; set; }
    public DateTime InspectionDate { get; set; }
    public Guid? InspectorId { get; set; }
    public string? InspectorName { get; set; }
    public int OverallScore { get; set; }
    /// <summary>
    /// A, B, C, D
    /// </summary>
    public string ComplianceLevel { get; set; } = "B";
    public string? ViolationsFound { get; set; }
    public DateTime? CorrectiveDeadline { get; set; }
    public DateTime? FollowUpDate { get; set; }
    /// <summary>
    /// 0=Scheduled, 1=InProgress, 2=Completed, 3=FollowUpNeeded
    /// </summary>
    public int Status { get; set; }
}
