namespace HIS.Application.DTOs;

public class ChronicDiseaseSearchDto
{
    public string? Keyword { get; set; }
    public string? Status { get; set; } // Active, Remission, Closed, Removed
    public string? IcdCode { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 50;
}

public class ChronicDiseaseListDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public int? Gender { get; set; }
    public string? DateOfBirth { get; set; }
    public string IcdCode { get; set; } = string.Empty;
    public string IcdName { get; set; } = string.Empty;
    public string? DiagnosisDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? DoctorName { get; set; }
    public string? DepartmentName { get; set; }
    public int FollowUpIntervalDays { get; set; }
    public string? NextFollowUpDate { get; set; }
    public int TotalFollowUps { get; set; }
    public string? LastFollowUpDate { get; set; }
}

public class ChronicDiseaseDetailDto : ChronicDiseaseListDto
{
    public Guid DoctorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? Notes { get; set; }
    public string? ClosedDate { get; set; }
    public string? ClosedReason { get; set; }
    public string? RemovedDate { get; set; }
    public string? RemovedReason { get; set; }
    public string? CreatedAt { get; set; }
    public List<ChronicDiseaseFollowUpDto> FollowUps { get; set; } = new();
}

public class CreateChronicDiseaseDto
{
    public Guid PatientId { get; set; }
    public string IcdCode { get; set; } = string.Empty;
    public string IcdName { get; set; } = string.Empty;
    public string? DiagnosisDate { get; set; }
    public Guid DoctorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? Notes { get; set; }
    public int FollowUpIntervalDays { get; set; } = 30;
}

public class UpdateChronicDiseaseDto
{
    public string? IcdCode { get; set; }
    public string? IcdName { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? Notes { get; set; }
    public int? FollowUpIntervalDays { get; set; }
}

public class CloseChronicDiseaseDto
{
    public string Reason { get; set; } = string.Empty;
}

public class RemoveChronicDiseaseDto
{
    public string Reason { get; set; } = string.Empty;
}

public class ChronicDiseaseFollowUpDto
{
    public Guid Id { get; set; }
    public Guid ChronicDiseaseRecordId { get; set; }
    public string? FollowUpDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid? ExaminationId { get; set; }
    public string? Notes { get; set; }
    public string? VitalSigns { get; set; }
    public string? MedicationChanges { get; set; }
    public string? LabResults { get; set; }
}

public class CreateChronicDiseaseFollowUpDto
{
    public string? FollowUpDate { get; set; }
    public string? Status { get; set; }
    public Guid? ExaminationId { get; set; }
    public string? Notes { get; set; }
    public string? VitalSigns { get; set; }
    public string? MedicationChanges { get; set; }
    public string? LabResults { get; set; }
}

public class ChronicDiseaseStatsDto
{
    public int TotalActive { get; set; }
    public int TotalRemission { get; set; }
    public int TotalClosed { get; set; }
    public int TotalRemoved { get; set; }
    public int OverdueFollowUps { get; set; }
    public int UpcomingFollowUps7Days { get; set; }
    public List<ChronicDiseaseIcdBreakdownDto> IcdBreakdown { get; set; } = new();
}

public class ChronicDiseaseIcdBreakdownDto
{
    public string IcdCode { get; set; } = string.Empty;
    public string IcdName { get; set; } = string.Empty;
    public int Count { get; set; }
}
