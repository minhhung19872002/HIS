namespace HIS.Application.DTOs;

// ==================== HouseholdHealthRecord DTOs ====================

public class HouseholdSearchDto
{
    public string? Keyword { get; set; }
    public int? RiskLevel { get; set; }
    public string? WardName { get; set; }
    public Guid? AssignedTeamId { get; set; }
    public bool? OverdueVisitOnly { get; set; }
}

public class HouseholdListDto
{
    public Guid Id { get; set; }
    public string HouseholdCode { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? WardName { get; set; }
    public string? DistrictName { get; set; }
    public string? HeadOfHousehold { get; set; }
    public string? PhoneNumber { get; set; }
    public int MemberCount { get; set; }
    public int RiskLevel { get; set; }
    public string? AssignedTeamName { get; set; }
    public string? LastVisitDate { get; set; }
    public string? NextVisitDate { get; set; }
    public bool IsOverdue { get; set; }
}

public class HouseholdCreateDto
{
    public string HouseholdCode { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? WardName { get; set; }
    public string? DistrictName { get; set; }
    public string? HeadOfHousehold { get; set; }
    public string? PhoneNumber { get; set; }
    public int MemberCount { get; set; }
    public int RiskLevel { get; set; }
    public Guid? AssignedTeamId { get; set; }
    public string? NextVisitDate { get; set; }
    public string? Notes { get; set; }
}

public class HouseholdUpdateDto
{
    public string? Address { get; set; }
    public string? WardName { get; set; }
    public string? DistrictName { get; set; }
    public string? HeadOfHousehold { get; set; }
    public string? PhoneNumber { get; set; }
    public int? MemberCount { get; set; }
    public int? RiskLevel { get; set; }
    public Guid? AssignedTeamId { get; set; }
    public string? LastVisitDate { get; set; }
    public string? NextVisitDate { get; set; }
    public string? Notes { get; set; }
}

// ==================== NcdScreening DTOs ====================

public class NcdScreeningSearchDto
{
    public string? Keyword { get; set; }
    public Guid? PatientId { get; set; }
    public string? ScreeningType { get; set; }
    public int? RiskLevel { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public bool? ReferredOnly { get; set; }
}

public class NcdScreeningListDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public string ScreeningDate { get; set; } = string.Empty;
    public string ScreeningType { get; set; } = string.Empty;
    public int? SystolicBP { get; set; }
    public int? DiastolicBP { get; set; }
    public decimal? FastingGlucose { get; set; }
    public decimal? HbA1c { get; set; }
    public decimal? BMI { get; set; }
    public decimal? CVDRiskScore { get; set; }
    public int RiskLevel { get; set; }
    public string? Diagnosis { get; set; }
    public bool ReferredToFacility { get; set; }
    public string? ScreenedBy { get; set; }
}

public class NcdScreeningCreateDto
{
    public Guid PatientId { get; set; }
    public string ScreeningDate { get; set; } = string.Empty;
    public string ScreeningType { get; set; } = "Combined";
    public int? SystolicBP { get; set; }
    public int? DiastolicBP { get; set; }
    public decimal? FastingGlucose { get; set; }
    public decimal? RandomGlucose { get; set; }
    public decimal? HbA1c { get; set; }
    public decimal? BMI { get; set; }
    public decimal? WaistCircumference { get; set; }
    public int SmokingStatus { get; set; }
    public int AlcoholUse { get; set; }
    public int PhysicalActivity { get; set; }
    public string? FamilyHistory { get; set; }
    public string? Diagnosis { get; set; }
    public bool ReferredToFacility { get; set; }
    public string? FollowUpDate { get; set; }
    public string? ScreenedBy { get; set; }
}

public class NcdScreeningUpdateDto
{
    public int? SystolicBP { get; set; }
    public int? DiastolicBP { get; set; }
    public decimal? FastingGlucose { get; set; }
    public decimal? RandomGlucose { get; set; }
    public decimal? HbA1c { get; set; }
    public decimal? BMI { get; set; }
    public decimal? WaistCircumference { get; set; }
    public int? SmokingStatus { get; set; }
    public int? AlcoholUse { get; set; }
    public int? PhysicalActivity { get; set; }
    public string? FamilyHistory { get; set; }
    public decimal? CVDRiskScore { get; set; }
    public int? RiskLevel { get; set; }
    public string? Diagnosis { get; set; }
    public bool? ReferredToFacility { get; set; }
    public string? FollowUpDate { get; set; }
}

public class NcdStatsDto
{
    public int TotalScreenings { get; set; }
    public int HighRiskCount { get; set; }
    public int ReferredCount { get; set; }
    public int HypertensionDetected { get; set; }
    public int DiabetesDetected { get; set; }
    public double AverageCVDRisk { get; set; }
    public List<NcdScreeningByTypeDto> ByType { get; set; } = new();
    public List<NcdScreeningByRiskDto> ByRisk { get; set; } = new();
}

public class NcdScreeningByTypeDto
{
    public string ScreeningType { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class NcdScreeningByRiskDto
{
    public int RiskLevel { get; set; }
    public int Count { get; set; }
}

// ==================== CommunityHealthTeam DTOs ====================

public class TeamSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public string? AssignedWard { get; set; }
}

public class TeamListDto
{
    public Guid Id { get; set; }
    public string TeamCode { get; set; } = string.Empty;
    public string TeamName { get; set; } = string.Empty;
    public string? LeaderName { get; set; }
    public string? AssignedWard { get; set; }
    public int MemberCount { get; set; }
    public int ActiveHouseholds { get; set; }
    public int Status { get; set; }
    public string? EstablishedDate { get; set; }
}

public class TeamCreateDto
{
    public string TeamCode { get; set; } = string.Empty;
    public string TeamName { get; set; } = string.Empty;
    public string? LeaderName { get; set; }
    public Guid? LeaderId { get; set; }
    public string? AssignedWard { get; set; }
    public int MemberCount { get; set; }
    public string? EstablishedDate { get; set; }
}

public class TeamUpdateDto
{
    public string? TeamName { get; set; }
    public string? LeaderName { get; set; }
    public Guid? LeaderId { get; set; }
    public string? AssignedWard { get; set; }
    public int? MemberCount { get; set; }
    public int? Status { get; set; }
}

// ==================== Overdue Visit DTOs ====================

public class OverdueVisitDto
{
    public Guid HouseholdId { get; set; }
    public string HouseholdCode { get; set; } = string.Empty;
    public string? HeadOfHousehold { get; set; }
    public string? Address { get; set; }
    public string? WardName { get; set; }
    public int RiskLevel { get; set; }
    public string? LastVisitDate { get; set; }
    public string? NextVisitDate { get; set; }
    public int DaysOverdue { get; set; }
    public string? AssignedTeamName { get; set; }
}
