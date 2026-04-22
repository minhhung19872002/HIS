namespace HIS.Application.DTOs.Abbreviation;

public class AbbreviationDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Expansion { get; set; } = string.Empty;
    public int Scope { get; set; }
    public string ScopeName { get; set; } = string.Empty;
    public string? ScopeKey { get; set; }
    public Guid? OwnerUserId { get; set; }
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
    public int UsageCount { get; set; }
}

public class SaveAbbreviationDto
{
    public Guid? Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Expansion { get; set; } = string.Empty;
    public int Scope { get; set; }
    public string? ScopeKey { get; set; }
    public bool OwnerOnly { get; set; }
    public int SortOrder { get; set; }
}
