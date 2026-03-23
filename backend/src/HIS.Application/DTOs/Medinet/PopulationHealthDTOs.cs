namespace HIS.Application.DTOs;

// ========================
// Module 7: Dân số - KHHGĐ (Population Health)
// ========================

public class PopulationRecordSearchDto
{
    public string? Keyword { get; set; }
    public string? RecordType { get; set; }
    public int? Status { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
}

public class PopulationRecordDto
{
    public Guid Id { get; set; }
    public string RecordCode { get; set; } = string.Empty;
    public string RecordType { get; set; } = string.Empty;
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public string? Ward { get; set; }
    public string? District { get; set; }
    public string? ServiceDate { get; set; }
    public string? ServiceType { get; set; }
    public string? Provider { get; set; }
    public string? FacilityName { get; set; }
    public string? FollowUpDate { get; set; }
    public int Status { get; set; }
    public string? Notes { get; set; }
}

public class CreatePopulationRecordDto
{
    public string? RecordType { get; set; }
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public string? Ward { get; set; }
    public string? District { get; set; }
    public string? ServiceDate { get; set; }
    public string? ServiceType { get; set; }
    public string? Provider { get; set; }
    public string? FacilityName { get; set; }
    public string? FollowUpDate { get; set; }
    public string? Notes { get; set; }
}

public class PopulationHealthStatsDto
{
    public int TotalRecords { get; set; }
    public int FamilyPlanningCount { get; set; }
    public int ElderlyCareCount { get; set; }
    public int BirthReportCount { get; set; }
    public int SurveyCount { get; set; }
    public List<PopulationRecordTypeBreakdownDto> RecordTypeBreakdown { get; set; } = new();
}

public class PopulationRecordTypeBreakdownDto
{
    public string RecordType { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class ElderlyStatsDto
{
    public int TotalElderlyRecords { get; set; }
    public int ActiveCount { get; set; }
    public int CompletedCount { get; set; }
    public int OverdueFollowUp { get; set; }
}
