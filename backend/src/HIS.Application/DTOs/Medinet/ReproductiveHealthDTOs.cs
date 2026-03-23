namespace HIS.Application.DTOs;

// ========================
// Module 3: Sức khỏe sinh sản (Reproductive Health)
// ========================

public class PrenatalSearchDto
{
    public string? Keyword { get; set; }
    public string? RiskLevel { get; set; }
    public int? Status { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
}

public class PrenatalRecordDto
{
    public Guid Id { get; set; }
    public string RecordCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string? DateOfBirth { get; set; }
    public int Gravida { get; set; }
    public int Para { get; set; }
    public int GestationalAge { get; set; }
    public string? ExpectedDeliveryDate { get; set; }
    public string? BloodType { get; set; }
    public string? RhFactor { get; set; }
    public decimal? CurrentWeight { get; set; }
    public int? BloodPressureSystolic { get; set; }
    public int? BloodPressureDiastolic { get; set; }
    public int? FetalHeartRate { get; set; }
    public decimal? FundalHeight { get; set; }
    public string RiskLevel { get; set; } = "low";
    public string? RiskFactors { get; set; }
    public string? NextAppointment { get; set; }
    public int Status { get; set; }
    public string? Notes { get; set; }
}

public class PrenatalRecordDetailDto : PrenatalRecordDto
{
    public string? LastMenstrualPeriod { get; set; }
    public decimal? PrePregnancyWeight { get; set; }
    public string? ScreeningResults { get; set; }
}

public class CreatePrenatalRecordDto
{
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? DateOfBirth { get; set; }
    public int? Gravida { get; set; }
    public int? Para { get; set; }
    public int? GestationalAge { get; set; }
    public string? ExpectedDeliveryDate { get; set; }
    public string? LastMenstrualPeriod { get; set; }
    public string? BloodType { get; set; }
    public string? RhFactor { get; set; }
    public decimal? CurrentWeight { get; set; }
    public decimal? PrePregnancyWeight { get; set; }
    public int? BloodPressureSystolic { get; set; }
    public int? BloodPressureDiastolic { get; set; }
    public int? FetalHeartRate { get; set; }
    public decimal? FundalHeight { get; set; }
    public string? RiskLevel { get; set; }
    public string? RiskFactors { get; set; }
    public string? NextAppointment { get; set; }
    public string? Notes { get; set; }
}

public class FamilyPlanningSearchDto
{
    public string? Keyword { get; set; }
    public string? Method { get; set; }
    public int? Status { get; set; }
}

public class FamilyPlanningRecordDto
{
    public Guid Id { get; set; }
    public string RecordCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public string Method { get; set; } = string.Empty;
    public string? StartDate { get; set; }
    public string? ExpiryDate { get; set; }
    public string? FollowUpDate { get; set; }
    public string? Provider { get; set; }
    public string? FacilityName { get; set; }
    public string? SideEffects { get; set; }
    public int Status { get; set; }
    public string? Notes { get; set; }
}

public class CreateFamilyPlanningRecordDto
{
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public string? Method { get; set; }
    public string? StartDate { get; set; }
    public string? ExpiryDate { get; set; }
    public string? FollowUpDate { get; set; }
    public string? Provider { get; set; }
    public string? FacilityName { get; set; }
    public string? Notes { get; set; }
}

public class ReproductiveHealthStatsDto
{
    public int TotalPrenatal { get; set; }
    public int ActivePrenatal { get; set; }
    public int HighRiskPrenatal { get; set; }
    public int TotalFamilyPlanning { get; set; }
    public int ActiveFamilyPlanning { get; set; }
    public List<MethodBreakdownDto> MethodBreakdown { get; set; } = new();
}

public class MethodBreakdownDto
{
    public string Method { get; set; } = string.Empty;
    public int Count { get; set; }
}
