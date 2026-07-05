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
