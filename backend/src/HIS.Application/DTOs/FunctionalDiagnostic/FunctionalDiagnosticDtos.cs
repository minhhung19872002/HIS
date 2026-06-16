namespace HIS.Application.DTOs.FunctionalDiagnostic;

// ─── TestType ─────────────────────────────────────────────────────────────────

public class FunctionalDiagnosticTestTypeDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}

public class SaveFunctionalDiagnosticTestTypeDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}

// ─── Template ─────────────────────────────────────────────────────────────────

public class FunctionalDiagnosticTemplateDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid TestTypeId { get; set; }
    public string? TestTypeName { get; set; }
    public string? Content { get; set; }
    public bool IsActive { get; set; } = true;
}

public class SaveFunctionalDiagnosticTemplateDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid TestTypeId { get; set; }
    public string? Content { get; set; }
    public bool IsActive { get; set; } = true;
}
