using System.ComponentModel.DataAnnotations;

namespace HIS.Application.DTOs.SatisfactionSurvey;

public class CreateSurveyCampaignDto
{
    [Required]
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? TargetGroup { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public Guid? TemplateId { get; set; }
    public string? TemplateName { get; set; }
    public int TargetCount { get; set; }
    public string? Notes { get; set; }
}

public class ContactCallbackDto
{
    public Guid? SurveyResultId { get; set; }
    public Guid? CampaignId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientPhone { get; set; }
    public string? PatientCode { get; set; }
    public string? IssueDescription { get; set; }
    public string? ContactedByName { get; set; }
    public string? Resolution { get; set; }
}

/// <summary>QA-R3: one completed survey (kiosk / tablet / staff entry). Stored in SatisfactionSurveyResults.</summary>
public class SubmitSurveyResultDto
{
    public Guid? CampaignId { get; set; }
    public Guid? TemplateId { get; set; }
    public Guid? PatientId { get; set; }
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    /// <summary>1–5</summary>
    public double OverallScore { get; set; }
    /// <summary>Answers as a JSON string (per-question scores).</summary>
    public string? Answers { get; set; }
    public string? Comment { get; set; }
}

public class UpdateCampaignStatusDto
{
    /// <summary>0 Draft · 1 Active · 2 Closed · 3 Archived</summary>
    public int Status { get; set; }
}

public class AcknowledgeDto
{
    public string? Note { get; set; }
}

public class SurveyTemplateDto
{
    [Required]
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? Questions { get; set; }
    public int SortOrder { get; set; }
}
