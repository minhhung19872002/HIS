namespace HIS.Application.DTOs;

// ========================
// Module 6: Sổ chấn thương (Trauma Registry)
// ========================

public class TraumaCaseSearchDto
{
    public string? Keyword { get; set; }
    public string? InjuryType { get; set; }
    public string? TriageCategory { get; set; }
    public string? Outcome { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
}

public class TraumaCaseDto
{
    public Guid Id { get; set; }
    public string CaseCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public string? AdmissionDate { get; set; }
    public string? InjuryDate { get; set; }
    public string InjuryType { get; set; } = string.Empty;
    public string? InjuryMechanism { get; set; }
    public string? InjuryLocation { get; set; }
    public int? InjurySeverityScore { get; set; }
    public decimal? RevisedTraumaScore { get; set; }
    public int? GlasgowComaScale { get; set; }
    public string? TriageCategory { get; set; }
    public string? Intentionality { get; set; }
    public bool AlcoholInvolved { get; set; }
    public string? TransportMode { get; set; }
    public int? PreHospitalTime { get; set; }
    public bool SurgeryRequired { get; set; }
    public bool IcuAdmission { get; set; }
    public int? VentilatorDays { get; set; }
    public int? LengthOfStay { get; set; }
    public string? Outcome { get; set; }
    public string? DischargeDate { get; set; }
    public string? Notes { get; set; }
}

public class CreateTraumaCaseDto
{
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public string? AdmissionDate { get; set; }
    public string? InjuryDate { get; set; }
    public string? InjuryType { get; set; }
    public string? InjuryMechanism { get; set; }
    public string? InjuryLocation { get; set; }
    public int? InjurySeverityScore { get; set; }
    public decimal? RevisedTraumaScore { get; set; }
    public int? GlasgowComaScale { get; set; }
    public string? TriageCategory { get; set; }
    public string? Intentionality { get; set; }
    public bool? AlcoholInvolved { get; set; }
    public string? TransportMode { get; set; }
    public int? PreHospitalTime { get; set; }
    public bool? SurgeryRequired { get; set; }
    public bool? IcuAdmission { get; set; }
    public string? Notes { get; set; }
}

public class TraumaStatsDto
{
    public int TotalCases { get; set; }
    public int SurgeryCount { get; set; }
    public int IcuCount { get; set; }
    public double MortalityRate { get; set; }
    public double AvgLengthOfStay { get; set; }
    public List<InjuryTypeBreakdownDto> InjuryTypeBreakdown { get; set; } = new();
    public List<TriageCategoryBreakdownDto> TriageCategoryBreakdown { get; set; } = new();
}

public class InjuryTypeBreakdownDto
{
    public string InjuryType { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class TriageCategoryBreakdownDto
{
    public string Category { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class TraumaOutcomeReportDto
{
    public int TotalCases { get; set; }
    public int DischargedCount { get; set; }
    public int TransferredCount { get; set; }
    public int DiedCount { get; set; }
    public int AbscondedCount { get; set; }
    public double AvgIss { get; set; }
    public double AvgGcs { get; set; }
    public double AvgPreHospitalTime { get; set; }
}
