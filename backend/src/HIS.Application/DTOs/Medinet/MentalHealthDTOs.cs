namespace HIS.Application.DTOs;

// ========================
// Module 4: Sức khỏe tâm thần (Mental Health)
// ========================

public class MentalHealthCaseSearchDto
{
    public string? Keyword { get; set; }
    public string? CaseType { get; set; }
    public int? Status { get; set; }
    public string? Severity { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
}

public class MentalHealthCaseDto
{
    public Guid Id { get; set; }
    public string CaseCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string? PatientCode { get; set; } // QA-R11: list showed a blank "Mã BN"
    public string? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public string Severity { get; set; } = "moderate";
    public string CaseType { get; set; } = string.Empty;
    public string? TreatingDoctor { get; set; }
    public string? CommunityWorker { get; set; }
    public string? MedicationRegimen { get; set; }
    public string AdherenceLevel { get; set; } = "fair";
    public string? LastVisitDate { get; set; }
    public string? NextVisitDate { get; set; }
    public int Status { get; set; }
    public string? Notes { get; set; }
}

public class MentalHealthCaseDetailDto : MentalHealthCaseDto
{
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public List<PsychiatricAssessmentDto> Assessments { get; set; } = new();
}

public class CreateMentalHealthCaseDto
{
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public string? Severity { get; set; }
    public string? CaseType { get; set; }
    public string? TreatingDoctor { get; set; }
    public string? CommunityWorker { get; set; }
    public string? MedicationRegimen { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? Notes { get; set; }
    // QA-R11: update-only fields the v2 "Cập nhật ca" form edits (status tabs were unreachable)
    public int? Status { get; set; } // 0=Đang điều trị 1=Ổn định 2=Thuyên giảm 3=Đã xuất viện
    public string? AdherenceLevel { get; set; }
    public string? NextVisitDate { get; set; }
}

public class PsychiatricAssessmentDto
{
    public Guid Id { get; set; }
    public Guid CaseId { get; set; }
    public string? AssessmentDate { get; set; }
    public string AssessmentType { get; set; } = string.Empty;
    public int TotalScore { get; set; }
    public string? Interpretation { get; set; }
    public string? Findings { get; set; }
    public string? Recommendations { get; set; }
    public string? AssessorName { get; set; }
    public string? Notes { get; set; }
}

public class CreatePsychiatricAssessmentDto
{
    public Guid? CaseId { get; set; }
    public string? AssessmentDate { get; set; }
    public string? AssessmentType { get; set; }
    public int? TotalScore { get; set; }
    public string? Interpretation { get; set; }
    public string? Findings { get; set; }
    public string? Recommendations { get; set; }
    public string? AssessorName { get; set; }
    public string? Notes { get; set; }
}

public class MentalHealthStatsDto
{
    public int TotalCases { get; set; }
    public int ActiveCount { get; set; }
    public int StableCount { get; set; }
    public int OverdueFollowUps { get; set; }
    public int AssessmentsThisMonth { get; set; } // QA-R11: KPI "ĐG tháng này" was a literal 0
    public List<MentalHealthCaseTypeBreakdownDto> CaseTypeBreakdown { get; set; } = new();
    public List<MentalHealthSeverityBreakdownDto> SeverityBreakdown { get; set; } = new();
}

public class MentalHealthCaseTypeBreakdownDto
{
    public string CaseType { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class MentalHealthSeverityBreakdownDto
{
    public string Severity { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class ScreeningResultDto
{
    public string AssessmentType { get; set; } = string.Empty;
    public int Score { get; set; }
    public string Interpretation { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string? Recommendation { get; set; }
}
