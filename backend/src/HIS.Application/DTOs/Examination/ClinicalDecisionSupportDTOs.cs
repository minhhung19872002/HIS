namespace HIS.Application.DTOs.Examination;

// ===== Request DTOs =====

public class DiagnosisSuggestionRequestDto
{
    public List<string> Symptoms { get; set; } = new();
    public List<string> Signs { get; set; } = new();
    public int? Age { get; set; }
    public int? Gender { get; set; } // 1=Male, 2=Female
    public decimal? Temperature { get; set; }
    public int? Pulse { get; set; }
    public int? BloodPressureSystolic { get; set; }
    public int? BloodPressureDiastolic { get; set; }
    public int? RespiratoryRate { get; set; }
    public decimal? SpO2 { get; set; }
    public string? DepartmentId { get; set; }
}

public class EarlyWarningScoreRequestDto
{
    public int? Pulse { get; set; }
    public int? BloodPressureSystolic { get; set; }
    public int? RespiratoryRate { get; set; }
    public decimal? Temperature { get; set; }
    public decimal? SpO2 { get; set; }
    public int? ConsciousnessLevel { get; set; } // 0=Alert, 1=Voice, 2=Pain, 3=Unresponsive
    public bool? IsOnSupplementalOxygen { get; set; }
}

// ===== Response DTOs =====

public class DiagnosisSuggestionDto
{
    public string IcdCode { get; set; } = string.Empty;
    public string IcdName { get; set; } = string.Empty;
    public string? EnglishName { get; set; }
    public double Confidence { get; set; } // 0.0 - 1.0
    public string ConfidenceLevel { get; set; } = string.Empty; // High, Medium, Low
    public List<string> MatchedSymptoms { get; set; } = new();
    public List<string> MatchedSigns { get; set; } = new();
    public string? Reasoning { get; set; }
    public string? Category { get; set; } // ICD chapter
    public bool IsCommonInDepartment { get; set; }
}

public class EarlyWarningScoreDto
{
    public int TotalScore { get; set; }
    public string RiskLevel { get; set; } = string.Empty; // Low, Medium, High, Critical
    public string RiskColor { get; set; } = string.Empty; // green, yellow, orange, red
    public string Recommendation { get; set; } = string.Empty;
    public int MonitoringFrequencyMinutes { get; set; }
    public List<EarlyWarningParameterDto> Parameters { get; set; } = new();
}

public class EarlyWarningParameterDto
{
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public int Score { get; set; }
    public string? Alert { get; set; }
}

public class ClinicalAlertDto
{
    public string AlertType { get; set; } = string.Empty; // VitalSign, Lab, Drug, Allergy, General
    public string Severity { get; set; } = string.Empty; // Info, Warning, Critical
    public string SeverityColor { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionRecommendation { get; set; }
    public string? Source { get; set; }
    public DateTime? Timestamp { get; set; }
}

public class ClinicalDecisionSupportResultDto
{
    public List<DiagnosisSuggestionDto> SuggestedDiagnoses { get; set; } = new();
    public EarlyWarningScoreDto? EarlyWarningScore { get; set; }
    public List<ClinicalAlertDto> Alerts { get; set; } = new();
    public List<IcdCodeFullDto> FrequentDiagnoses { get; set; } = new();
}
