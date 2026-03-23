namespace HIS.Application.DTOs;

// ========================
// Module 1: Giám định Y khoa (Medical Forensics)
// ========================

public class ForensicCaseSearchDto
{
    public string? Keyword { get; set; }
    public string? CaseType { get; set; }
    public int? Status { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
}

public class ForensicCaseDto
{
    public Guid Id { get; set; }
    public string CaseCode { get; set; } = string.Empty;
    public string CaseType { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string? Cccd { get; set; }
    public int? Gender { get; set; }
    public string? DateOfBirth { get; set; }
    public string? RequestingOrganization { get; set; }
    public string? RequestDate { get; set; }
    public string? ExaminationDate { get; set; }
    public int Status { get; set; }
    public decimal? DisabilityPercentage { get; set; }
    public string? Conclusion { get; set; }
}

public class ForensicCaseDetailDto : ForensicCaseDto
{
    public Guid PatientId { get; set; }
    public string? CouncilMembers { get; set; }
    public string? Notes { get; set; }
    public List<ForensicExaminationDto> Examinations { get; set; } = new();
}

public class CreateForensicCaseDto
{
    public string? CaseType { get; set; }
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public string? Cccd { get; set; }
    public string? RequestingOrganization { get; set; }
    public string? RequestDate { get; set; }
    public string? ExaminationDate { get; set; }
    public string? CouncilMembers { get; set; }
    public string? Notes { get; set; }
}

public class ForensicExaminationDto
{
    public Guid Id { get; set; }
    public Guid ForensicCaseId { get; set; }
    public string ExamCategory { get; set; } = string.Empty;
    public string? Findings { get; set; }
    public int? FunctionScore { get; set; }
    public int? DisabilityScore { get; set; }
    public string? ExaminerName { get; set; }
    public string? Notes { get; set; }
}

public class CreateForensicExaminationDto
{
    public Guid? ForensicCaseId { get; set; }
    public string? ExamCategory { get; set; }
    public string? Findings { get; set; }
    public int? FunctionScore { get; set; }
    public int? DisabilityScore { get; set; }
    public string? ExaminerName { get; set; }
    public string? Notes { get; set; }
}

public class ForensicStatsDto
{
    public int TotalCases { get; set; }
    public int PendingCount { get; set; }
    public int CompletedCount { get; set; }
    public int ApprovedCount { get; set; }
    public List<ForensicCaseTypeBreakdownDto> CaseTypeBreakdown { get; set; } = new();
}

public class ForensicCaseTypeBreakdownDto
{
    public string CaseType { get; set; } = string.Empty;
    public int Count { get; set; }
}
