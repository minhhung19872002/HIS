namespace HIS.Application.DTOs;

public class PathologySearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public string? SpecimenType { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
}

public class PathologyRequestDto
{
    public Guid Id { get; set; }
    public string RequestCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public Guid? PatientId { get; set; }
    public int? Gender { get; set; }
    public string? DateOfBirth { get; set; }
    public string? RequestDate { get; set; }
    public string SpecimenType { get; set; } = string.Empty;
    public string? SpecimenSite { get; set; }
    public string? ClinicalDiagnosis { get; set; }
    public string? RequestingDoctor { get; set; }
    public string? DepartmentName { get; set; }
    public int Status { get; set; }
    public string Priority { get; set; } = "normal";
}

public class PathologyRequestDetailDto : PathologyRequestDto
{
    public string? SpecimenDescription { get; set; }
    public int SpecimenCount { get; set; }
    public string? ClinicalHistory { get; set; }
    public string? Notes { get; set; }
    public decimal TotalAmount { get; set; }
    public bool IsPaid { get; set; }
    public PathologyResultDto? Result { get; set; }
}

public class PathologyResultDto
{
    public Guid Id { get; set; }
    public Guid RequestId { get; set; }
    public string? GrossDescription { get; set; }
    public string? MicroscopicDescription { get; set; }
    public string? Diagnosis { get; set; }
    public string? IcdCode { get; set; }
    public List<string> StainingMethods { get; set; } = new();
    public int SlideCount { get; set; }
    public int BlockCount { get; set; }
    public string? SpecialStains { get; set; }
    public string? Immunohistochemistry { get; set; }
    public string? MolecularTests { get; set; }
    public string? Pathologist { get; set; }
    public string? VerifiedBy { get; set; }
    public string? VerifiedAt { get; set; }
    public List<string> Images { get; set; } = new();
}

public class CreatePathologyResultDto
{
    public Guid? RequestId { get; set; }
    public string? GrossDescription { get; set; }
    public string? MicroscopicDescription { get; set; }
    public string? Diagnosis { get; set; }
    public string? IcdCode { get; set; }
    public List<string>? StainingMethods { get; set; }
    public int SlideCount { get; set; }
    public int BlockCount { get; set; }
    public string? SpecialStains { get; set; }
    public string? Immunohistochemistry { get; set; }
    public string? MolecularTests { get; set; }
    public string? Pathologist { get; set; }
}

public class UpdatePathologyResultDto
{
    public string? GrossDescription { get; set; }
    public string? MicroscopicDescription { get; set; }
    public string? Diagnosis { get; set; }
    public string? IcdCode { get; set; }
    public List<string>? StainingMethods { get; set; }
    public int? SlideCount { get; set; }
    public int? BlockCount { get; set; }
    public string? SpecialStains { get; set; }
    public string? Immunohistochemistry { get; set; }
    public string? MolecularTests { get; set; }
    public string? Pathologist { get; set; }
}

public class PathologyStatsDto
{
    public int TotalRequests { get; set; }
    public int PendingCount { get; set; }
    public int CompletedCount { get; set; }
    public double AvgTurnaroundDays { get; set; }
    public List<SpecimenTypeBreakdownDto> SpecimenTypeBreakdown { get; set; } = new();
}

public class SpecimenTypeBreakdownDto
{
    public string Type { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class SpecimenTypeDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}
