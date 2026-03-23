namespace HIS.Application.DTOs;

public class ClinicalGuidanceSearchDto
{
    public string? Keyword { get; set; }
    public string? Status { get; set; } // Planning, InProgress, Completed, Cancelled
    public string? GuidanceType { get; set; } // KhamChua, DaoTao, ChuyenGiao, HoTro
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 50;
}

public class ClinicalGuidanceBatchListDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string TargetFacility { get; set; } = string.Empty;
    public string GuidanceType { get; set; } = string.Empty;
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? LeadDoctorName { get; set; }
    public decimal Budget { get; set; }
    public decimal ActualCost { get; set; }
    public int PatientsExamined { get; set; }
    public int TraineesCount { get; set; }
    public int ActivityCount { get; set; }
}

public class ClinicalGuidanceBatchDetailDto : ClinicalGuidanceBatchListDto
{
    public Guid LeadDoctorId { get; set; }
    public string? TargetFacilityCode { get; set; }
    public string? TeamMembers { get; set; } // JSON
    public string? Summary { get; set; }
    public string? Results { get; set; }
    public string? Recommendations { get; set; }
    public int TechniquesTransferred { get; set; }
    public string? CreatedAt { get; set; }
    public List<ClinicalGuidanceActivityDto> Activities { get; set; } = new();
}

public class CreateClinicalGuidanceBatchDto
{
    public string Title { get; set; } = string.Empty;
    public string TargetFacility { get; set; } = string.Empty;
    public string? TargetFacilityCode { get; set; }
    public string GuidanceType { get; set; } = "KhamChua";
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public Guid LeadDoctorId { get; set; }
    public string? TeamMembers { get; set; } // JSON
    public decimal Budget { get; set; }
}

public class UpdateClinicalGuidanceBatchDto
{
    public string? Title { get; set; }
    public string? TargetFacility { get; set; }
    public string? TargetFacilityCode { get; set; }
    public string? GuidanceType { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public Guid? LeadDoctorId { get; set; }
    public string? TeamMembers { get; set; }
    public decimal? Budget { get; set; }
    public decimal? ActualCost { get; set; }
    public string? Summary { get; set; }
    public string? Results { get; set; }
    public string? Recommendations { get; set; }
    public int? PatientsExamined { get; set; }
    public int? TraineesCount { get; set; }
    public int? TechniquesTransferred { get; set; }
}

public class CompleteClinicalGuidanceBatchDto
{
    public string? Summary { get; set; }
    public string? Results { get; set; }
    public string? Recommendations { get; set; }
    public decimal? ActualCost { get; set; }
    public int? PatientsExamined { get; set; }
    public int? TraineesCount { get; set; }
    public int? TechniquesTransferred { get; set; }
}

public class ClinicalGuidanceActivityDto
{
    public Guid Id { get; set; }
    public Guid BatchId { get; set; }
    public string? ActivityDate { get; set; }
    public string ActivityType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Performer { get; set; }
    public string? Location { get; set; }
    public string? Notes { get; set; }
    public int? PatientCount { get; set; }
    public int? TraineeCount { get; set; }
}

public class CreateClinicalGuidanceActivityDto
{
    public string? ActivityDate { get; set; }
    public string ActivityType { get; set; } = "KhamBenh";
    public string Description { get; set; } = string.Empty;
    public string? Performer { get; set; }
    public string? Location { get; set; }
    public string? Notes { get; set; }
    public int? PatientCount { get; set; }
    public int? TraineeCount { get; set; }
}

public class ClinicalGuidanceStatsDto
{
    public int TotalBatches { get; set; }
    public int PlanningCount { get; set; }
    public int InProgressCount { get; set; }
    public int CompletedCount { get; set; }
    public int CancelledCount { get; set; }
    public int TotalPatientsExamined { get; set; }
    public int TotalTrainees { get; set; }
    public int TotalTechniquesTransferred { get; set; }
    public decimal TotalBudget { get; set; }
    public decimal TotalActualCost { get; set; }
    public List<ClinicalGuidanceTypeBreakdownDto> TypeBreakdown { get; set; } = new();
}

public class ClinicalGuidanceTypeBreakdownDto
{
    public string GuidanceType { get; set; } = string.Empty;
    public int Count { get; set; }
    public int PatientsExamined { get; set; }
}
