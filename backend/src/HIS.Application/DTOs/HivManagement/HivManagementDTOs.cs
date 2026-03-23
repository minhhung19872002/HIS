namespace HIS.Application.DTOs;

// ==================== HivPatient DTOs ====================

public class HivPatientSearchDto
{
    public string? Keyword { get; set; }
    public int? ARTStatus { get; set; }
    public int? WHOStage { get; set; }
    public bool? IsVirallySuppressed { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
}

public class HivPatientListDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string HivCode { get; set; } = string.Empty;
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public int? Gender { get; set; }
    public string? DateOfBirth { get; set; }
    public string DiagnosisDate { get; set; } = string.Empty;
    public string DiagnosisType { get; set; } = string.Empty;
    public string? CurrentARTRegimen { get; set; }
    public int ARTStatus { get; set; }
    public int WHOStage { get; set; }
    public int? LastCD4Count { get; set; }
    public string? LastCD4Date { get; set; }
    public decimal? LastViralLoad { get; set; }
    public string? LastViralLoadDate { get; set; }
    public bool? IsVirallySuppressed { get; set; }
    public string? NextAppointmentDate { get; set; }
    public bool LinkedToMethadone { get; set; }
}

public class HivPatientCreateDto
{
    public Guid PatientId { get; set; }
    public string? HivCode { get; set; }
    public string DiagnosisDate { get; set; } = string.Empty;
    public string DiagnosisType { get; set; } = "VCT";
    public string? ConfirmationDate { get; set; }
    public string? CurrentARTRegimen { get; set; }
    public string? ARTStartDate { get; set; }
    public int ARTStatus { get; set; }
    public int WHOStage { get; set; } = 1;
    public string? CoInfections { get; set; }
    public string? ReferralSource { get; set; }
    public bool LinkedToMethadone { get; set; }
    public Guid? MethadonePatientId { get; set; }
}

public class HivPatientUpdateDto
{
    public string? CurrentARTRegimen { get; set; }
    public string? ARTStartDate { get; set; }
    public int? ARTStatus { get; set; }
    public int? WHOStage { get; set; }
    public int? LastCD4Count { get; set; }
    public string? LastCD4Date { get; set; }
    public decimal? LastViralLoad { get; set; }
    public string? LastViralLoadDate { get; set; }
    public bool? IsVirallySuppressed { get; set; }
    public string? CoInfections { get; set; }
    public bool? LinkedToMethadone { get; set; }
    public Guid? MethadonePatientId { get; set; }
    public string? NextAppointmentDate { get; set; }
}

public class HivPatientStatsDto
{
    public int TotalPatients { get; set; }
    public int OnARTCount { get; set; }
    public int PreARTCount { get; set; }
    public int VirallySuppressedCount { get; set; }
    public int LostToFollowUpCount { get; set; }
    public int DeceasedCount { get; set; }
    public double SuppressedRate { get; set; } // percentage
    public List<HivPatientByStatusDto> ByStatus { get; set; } = new();
    public List<HivPatientByStageDto> ByStage { get; set; } = new();
}

public class HivPatientByStatusDto
{
    public int ARTStatus { get; set; }
    public int Count { get; set; }
}

public class HivPatientByStageDto
{
    public int WHOStage { get; set; }
    public int Count { get; set; }
}

// ==================== HivLabResult DTOs ====================

public class HivLabResultSearchDto
{
    public Guid? HivPatientId { get; set; }
    public string? TestType { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
}

public class HivLabResultListDto
{
    public Guid Id { get; set; }
    public Guid HivPatientId { get; set; }
    public string? PatientName { get; set; }
    public string? HivCode { get; set; }
    public string TestDate { get; set; } = string.Empty;
    public string TestType { get; set; } = string.Empty;
    public string? Result { get; set; }
    public string? Unit { get; set; }
    public bool? IsAbnormal { get; set; }
    public string? LabName { get; set; }
    public string? OrderedBy { get; set; }
}

public class HivLabResultCreateDto
{
    public Guid HivPatientId { get; set; }
    public string TestDate { get; set; } = string.Empty;
    public string TestType { get; set; } = string.Empty;
    public string? Result { get; set; }
    public string? Unit { get; set; }
    public bool? IsAbnormal { get; set; }
    public string? LabName { get; set; }
    public string? OrderedBy { get; set; }
}

// ==================== PmtctRecord DTOs ====================

public class PmtctRecordListDto
{
    public Guid Id { get; set; }
    public Guid HivPatientId { get; set; }
    public string? PatientName { get; set; }
    public string? HivCode { get; set; }
    public int? GestationalAgeAtDiagnosis { get; set; }
    public bool ARTDuringPregnancy { get; set; }
    public string? DeliveryDate { get; set; }
    public string? DeliveryMode { get; set; }
    public bool InfantProphylaxis { get; set; }
    public string? InfantHivTestDate { get; set; }
    public string? InfantHivTestResult { get; set; }
    public string? BreastfeedingStatus { get; set; }
}

public class PmtctRecordCreateDto
{
    public Guid HivPatientId { get; set; }
    public Guid? PregnancyId { get; set; }
    public int? GestationalAgeAtDiagnosis { get; set; }
    public bool ARTDuringPregnancy { get; set; }
    public string? DeliveryDate { get; set; }
    public string? DeliveryMode { get; set; }
    public bool InfantProphylaxis { get; set; }
    public string? InfantHivTestDate { get; set; }
    public string? InfantHivTestResult { get; set; }
    public string? BreastfeedingStatus { get; set; }
}

public class PmtctRecordUpdateDto
{
    public bool? ARTDuringPregnancy { get; set; }
    public string? DeliveryDate { get; set; }
    public string? DeliveryMode { get; set; }
    public bool? InfantProphylaxis { get; set; }
    public string? InfantHivTestDate { get; set; }
    public string? InfantHivTestResult { get; set; }
    public string? BreastfeedingStatus { get; set; }
}

public class PmtctStatsDto
{
    public int TotalPregnancies { get; set; }
    public int ARTDuringPregnancyCount { get; set; }
    public int InfantProphylaxisCount { get; set; }
    public int InfantTestedCount { get; set; }
    public int InfantPositiveCount { get; set; }
    public double TransmissionRate { get; set; } // percentage
}
