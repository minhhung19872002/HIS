namespace HIS.Application.DTOs;

// ---- Search / Filter DTOs ----

public class TrainingClassSearchDto
{
    public string? Keyword { get; set; }
    public int? TrainingType { get; set; }
    public int? Status { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public Guid? DepartmentId { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 50;
}

public class ClinicalDirectionSearchDto
{
    public string? Keyword { get; set; }
    public int? DirectionType { get; set; }
    public int? Status { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 50;
}

public class ResearchProjectSearchDto
{
    public string? Keyword { get; set; }
    public int? Level { get; set; }
    public int? Status { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 50;
}

// ---- List DTOs ----

public class TrainingClassListDto
{
    public Guid Id { get; set; }
    public string ClassCode { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public int TrainingType { get; set; }
    public string? TrainingTypeName { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public int MaxStudents { get; set; }
    public int EnrolledCount { get; set; }
    public string? Location { get; set; }
    public string? InstructorName { get; set; }
    public string? DepartmentName { get; set; }
    public decimal CreditHours { get; set; }
    public int Status { get; set; }
    public string? StatusName { get; set; }
    public decimal Fee { get; set; }
}

public class TrainingClassDetailDto : TrainingClassListDto
{
    public Guid? InstructorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? Description { get; set; }
    public string? CreatedAt { get; set; }
    public List<TrainingStudentDto> Students { get; set; } = new();
}

public class TrainingStudentDto
{
    public Guid Id { get; set; }
    public Guid ClassId { get; set; }
    public Guid? StaffId { get; set; }
    public string? StaffName { get; set; }
    public string? ExternalName { get; set; }
    public string DisplayName => StaffName ?? ExternalName ?? "";
    public int StudentType { get; set; }
    public string? StudentTypeName { get; set; }
    public int AttendanceStatus { get; set; }
    public string? AttendanceStatusName { get; set; }
    public decimal? Score { get; set; }
    public string? CertificateNumber { get; set; }
    public string? CertificateDate { get; set; }
    public string? Notes { get; set; }
}

public class ClinicalDirectionListDto
{
    public Guid Id { get; set; }
    public int DirectionType { get; set; }
    public string? DirectionTypeName { get; set; }
    public string PartnerHospital { get; set; } = string.Empty;
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string? Objectives { get; set; }
    public int Status { get; set; }
    public string? StatusName { get; set; }
    public string? ResponsibleDoctorName { get; set; }
    public string? Notes { get; set; }
}

public class ClinicalDirectionDetailDto : ClinicalDirectionListDto
{
    public Guid? ResponsibleDoctorId { get; set; }
    public string? CreatedAt { get; set; }
}

public class ResearchProjectListDto
{
    public Guid Id { get; set; }
    public string ProjectCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int Level { get; set; }
    public string? LevelName { get; set; }
    public string? PrincipalInvestigatorName { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public decimal Budget { get; set; }
    public int Status { get; set; }
    public string? StatusName { get; set; }
    public string? PublicationInfo { get; set; }
}

public class ResearchProjectDetailDto : ResearchProjectListDto
{
    public Guid? PrincipalInvestigatorId { get; set; }
    public string? Abstract { get; set; }
    public string? Findings { get; set; }
    public string? CreatedAt { get; set; }
}

// ---- Create/Update DTOs ----

public class SaveTrainingClassDto
{
    public string ClassCode { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public int TrainingType { get; set; } = 1;
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public int MaxStudents { get; set; } = 30;
    public string? Location { get; set; }
    public Guid? InstructorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? Description { get; set; }
    public decimal CreditHours { get; set; }
    public int Status { get; set; } = 1;
    public decimal Fee { get; set; }
}

public class EnrollStudentDto
{
    public Guid ClassId { get; set; }
    public Guid? StaffId { get; set; }
    public string? ExternalName { get; set; }
    public int StudentType { get; set; } = 1;
    public string? Notes { get; set; }
}

public class UpdateStudentStatusDto
{
    public int AttendanceStatus { get; set; }
    public decimal? Score { get; set; }
    public string? Notes { get; set; }
}

public class IssueCertificateDto
{
    public string CertificateNumber { get; set; } = string.Empty;
    public string? CertificateDate { get; set; }
}

public class SaveClinicalDirectionDto
{
    public int DirectionType { get; set; } = 1;
    public string PartnerHospital { get; set; } = string.Empty;
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string? Objectives { get; set; }
    public int Status { get; set; } = 1;
    public Guid? ResponsibleDoctorId { get; set; }
    public string? Notes { get; set; }
}

public class SaveResearchProjectDto
{
    public string ProjectCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int Level { get; set; } = 3;
    public Guid? PrincipalInvestigatorId { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public decimal Budget { get; set; }
    public int Status { get; set; } = 1;
    public string? Abstract { get; set; }
    public string? Findings { get; set; }
    public string? PublicationInfo { get; set; }
}

// ---- Dashboard / Stats DTOs ----

public class TrainingDashboardDto
{
    public int TotalClasses { get; set; }
    public int ActiveClasses { get; set; }
    public int TotalStudents { get; set; }
    public int CertificatesIssued { get; set; }
    public decimal CmeCompliancePercent { get; set; }
    public int ResearchProjects { get; set; }
    public int ResearchPublished { get; set; }
    public int ClinicalDirections { get; set; }
    public List<TrainingTypeCountDto> ClassesByType { get; set; } = new();
    public List<ResearchStatusCountDto> ProjectsByStatus { get; set; } = new();
}

public class TrainingTypeCountDto
{
    public int TrainingType { get; set; }
    public string TypeName { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class ResearchStatusCountDto
{
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class CreditSummaryDto
{
    public Guid StaffId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public decimal TotalCredits { get; set; }
    public decimal RequiredCredits { get; set; } = 48; // Default CME requirement
    public decimal CompliancePercent => RequiredCredits > 0 ? Math.Min(100, TotalCredits / RequiredCredits * 100) : 0;
    public bool IsCompliant => TotalCredits >= RequiredCredits;
}
