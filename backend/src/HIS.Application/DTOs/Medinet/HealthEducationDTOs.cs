namespace HIS.Application.DTOs;

// ========================
// Module 8: Truyền thông GDSK (Health Education)
// ========================

public class HealthCampaignSearchDto
{
    public string? Keyword { get; set; }
    public string? CampaignType { get; set; }
    public int? Status { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
}

public class HealthCampaignDto
{
    public Guid Id { get; set; }
    public string CampaignCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string CampaignType { get; set; } = string.Empty;
    public string? TargetAudience { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string? Location { get; set; }
    public string? Organizer { get; set; }
    public int? ParticipantCount { get; set; }
    public decimal? Budget { get; set; }
    public int Status { get; set; }
    public string? Outcomes { get; set; }
    public string? Notes { get; set; }
}

public class CreateHealthCampaignDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? CampaignType { get; set; }
    public string? TargetAudience { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string? Location { get; set; }
    public string? Organizer { get; set; }
    public int? ParticipantCount { get; set; }
    public decimal? Budget { get; set; }
    public string? Notes { get; set; }
}

public class HealthEducationMaterialSearchDto
{
    public string? Keyword { get; set; }
    public string? MaterialType { get; set; }
    public string? Topic { get; set; }
}

public class HealthEducationMaterialDto
{
    public Guid Id { get; set; }
    public string MaterialCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string MaterialType { get; set; } = string.Empty;
    public string? Topic { get; set; }
    public string Language { get; set; } = "vi";
    public string? FilePath { get; set; }
    public long? FileSize { get; set; }
    public int Downloads { get; set; }
    public bool IsActive { get; set; }
}

public class CreateHealthEducationMaterialDto
{
    public string? Title { get; set; }
    public string? MaterialType { get; set; }
    public string? Topic { get; set; }
    public string? Language { get; set; }
    public string? FilePath { get; set; }
    public long? FileSize { get; set; }
}

public class CampaignStatsDto
{
    public int TotalCampaigns { get; set; }
    public int PlannedCount { get; set; }
    public int OngoingCount { get; set; }
    public int CompletedCount { get; set; }
    public int TotalParticipants { get; set; }
    public decimal TotalBudget { get; set; }
    public int TotalMaterials { get; set; }
    public List<CampaignTypeBreakdownDto> CampaignTypeBreakdown { get; set; } = new();
}

public class CampaignTypeBreakdownDto
{
    public string CampaignType { get; set; } = string.Empty;
    public int Count { get; set; }
}
