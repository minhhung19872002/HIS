namespace HIS.Application.DTOs.Clinical;

public class ClinicalTemplateDto
{
    public Guid Id { get; set; }
    public string TemplateCode { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;
    public int TemplateType { get; set; }
    public string TemplateTypeName { get; set; } = string.Empty;
    public string? IcdCode { get; set; }
    public string? IcdName { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public int Gender { get; set; }
    public int? MinAgeYears { get; set; }
    public int? MaxAgeYears { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? DefaultMembersJson { get; set; }
    public bool IsPublic { get; set; }
    public Guid? OwnerUserId { get; set; }
    public string? OwnerName { get; set; }
    public bool IsActive { get; set; }
    public int UsageCount { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveClinicalTemplateDto
{
    public Guid? Id { get; set; }
    public string TemplateName { get; set; } = string.Empty;
    public int TemplateType { get; set; }
    public string? IcdCode { get; set; }
    public string? IcdName { get; set; }
    public Guid? DepartmentId { get; set; }
    public int Gender { get; set; }
    public int? MinAgeYears { get; set; }
    public int? MaxAgeYears { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? DefaultMembersJson { get; set; }
    public bool IsPublic { get; set; }
    public int SortOrder { get; set; }
}

public class ClinicalTemplateSearchDto
{
    public int? TemplateType { get; set; }
    public string? IcdCode { get; set; }
    public Guid? DepartmentId { get; set; }
    public int? Gender { get; set; }
    public int? AgeYears { get; set; }
    public string? Keyword { get; set; }
    public bool? OnlyActive { get; set; } = true;
    public int PageSize { get; set; } = 50;
}
