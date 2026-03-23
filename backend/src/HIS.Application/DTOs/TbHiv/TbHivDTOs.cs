namespace HIS.Application.DTOs;

public class TbHivSearchDto
{
    public string? Keyword { get; set; }
    public string? RecordType { get; set; } // TB, HIV, TB_HIV
    public string? Status { get; set; }
    public string? TreatmentCategory { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 50;
}

public class TbHivRecordListDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public int? Gender { get; set; }
    public string? DateOfBirth { get; set; }
    public string RecordType { get; set; } = string.Empty;
    public string RegistrationCode { get; set; } = string.Empty;
    public string? RegistrationDate { get; set; }
    public string TreatmentCategory { get; set; } = string.Empty;
    public string? TreatmentRegimen { get; set; }
    public string? TreatmentStartDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? DoctorName { get; set; }
    public string? DepartmentName { get; set; }
    public int TotalFollowUps { get; set; }
    public string? LastFollowUpDate { get; set; }
}

public class TbHivRecordDetailDto : TbHivRecordListDto
{
    public string? ExpectedEndDate { get; set; }
    public string? SmearResult { get; set; }
    public string? GeneXpertResult { get; set; }
    public string? TbSite { get; set; }
    public bool IsMdr { get; set; }
    public int? Cd4Count { get; set; }
    public decimal? ViralLoad { get; set; }
    public string? ArtRegimen { get; set; }
    public string? ArtStartDate { get; set; }
    public string? WhoStage { get; set; }
    public string? DotProvider { get; set; }
    public string? DotProviderPhone { get; set; }
    public string? OutcomeDate { get; set; }
    public string? OutcomeNotes { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? Notes { get; set; }
    public string? CreatedAt { get; set; }
    public List<TbHivFollowUpDto> FollowUps { get; set; } = new();
}

public class CreateTbHivRecordDto
{
    public Guid PatientId { get; set; }
    public string RecordType { get; set; } = "TB";
    public string? RegistrationDate { get; set; }
    public string TreatmentCategory { get; set; } = "New";
    public string? TreatmentRegimen { get; set; }
    public string? TreatmentStartDate { get; set; }
    public string? ExpectedEndDate { get; set; }
    public string? SmearResult { get; set; }
    public string? GeneXpertResult { get; set; }
    public string? TbSite { get; set; }
    public bool IsMdr { get; set; }
    public int? Cd4Count { get; set; }
    public decimal? ViralLoad { get; set; }
    public string? ArtRegimen { get; set; }
    public string? ArtStartDate { get; set; }
    public string? WhoStage { get; set; }
    public string? DotProvider { get; set; }
    public string? DotProviderPhone { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? Notes { get; set; }
}

public class UpdateTbHivRecordDto
{
    public string? TreatmentRegimen { get; set; }
    public string? TreatmentStartDate { get; set; }
    public string? ExpectedEndDate { get; set; }
    public string? SmearResult { get; set; }
    public string? GeneXpertResult { get; set; }
    public string? TbSite { get; set; }
    public bool? IsMdr { get; set; }
    public int? Cd4Count { get; set; }
    public decimal? ViralLoad { get; set; }
    public string? ArtRegimen { get; set; }
    public string? ArtStartDate { get; set; }
    public string? WhoStage { get; set; }
    public string? DotProvider { get; set; }
    public string? DotProviderPhone { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? Notes { get; set; }
}

public class CloseTbHivRecordDto
{
    public string Status { get; set; } = "Completed"; // Completed, Failed, DefaultedLostToFollowUp, Died, TransferredOut
    public string? OutcomeNotes { get; set; }
}

public class TbHivFollowUpDto
{
    public Guid Id { get; set; }
    public Guid TbHivRecordId { get; set; }
    public string? VisitDate { get; set; }
    public int TreatmentMonth { get; set; }
    public decimal? Weight { get; set; }
    public string? SmearResult { get; set; }
    public string? CultureResult { get; set; }
    public int? Cd4Count { get; set; }
    public decimal? ViralLoad { get; set; }
    public string? DrugAdherence { get; set; }
    public string? SideEffects { get; set; }
    public bool RegimenChanged { get; set; }
    public string? NewRegimen { get; set; }
    public string? Notes { get; set; }
    public Guid? ExaminationId { get; set; }
}

public class CreateTbHivFollowUpDto
{
    public string? VisitDate { get; set; }
    public int TreatmentMonth { get; set; }
    public decimal? Weight { get; set; }
    public string? SmearResult { get; set; }
    public string? CultureResult { get; set; }
    public int? Cd4Count { get; set; }
    public decimal? ViralLoad { get; set; }
    public string? DrugAdherence { get; set; }
    public string? SideEffects { get; set; }
    public bool RegimenChanged { get; set; }
    public string? NewRegimen { get; set; }
    public string? Notes { get; set; }
    public Guid? ExaminationId { get; set; }
}

public class TbHivStatsDto
{
    public int TotalRecords { get; set; }
    public int TbCount { get; set; }
    public int HivCount { get; set; }
    public int TbHivCoinfectionCount { get; set; }
    public int OnTreatmentCount { get; set; }
    public int CompletedCount { get; set; }
    public int FailedCount { get; set; }
    public int DefaultedCount { get; set; }
    public int DiedCount { get; set; }
    public int TransferredOutCount { get; set; }
    public int MdrTbCount { get; set; }
    public List<TbHivCategoryBreakdownDto> CategoryBreakdown { get; set; } = new();
}

public class TbHivCategoryBreakdownDto
{
    public string TreatmentCategory { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class TbHivTreatmentOutcomeDto
{
    public string RecordType { get; set; } = string.Empty;
    public int Total { get; set; }
    public int Completed { get; set; }
    public int Failed { get; set; }
    public int Defaulted { get; set; }
    public int Died { get; set; }
    public int TransferredOut { get; set; }
    public int StillOnTreatment { get; set; }
    public double CompletionRate { get; set; }
}
