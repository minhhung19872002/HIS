namespace HIS.Application.DTOs;

// ---- Search / Filter DTOs ----

public class IvfCoupleSearchDto
{
    public string? Keyword { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 20;
}

public class IvfSpermSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 20;
}

// ---- Couple DTOs ----

public class IvfCoupleDto
{
    public Guid Id { get; set; }
    public Guid WifePatientId { get; set; }
    public string? WifeName { get; set; }
    public string? WifeCode { get; set; }
    public string? WifeDob { get; set; }
    public Guid HusbandPatientId { get; set; }
    public string? HusbandName { get; set; }
    public string? HusbandCode { get; set; }
    public string? HusbandDob { get; set; }
    public int InfertilityDurationMonths { get; set; }
    public string? InfertilityCause { get; set; }
    public string? MarriageDate { get; set; }
    public string? Notes { get; set; }
    public int CycleCount { get; set; }
}

public class IvfCoupleDetailDto : IvfCoupleDto
{
    public List<IvfCycleDto> Cycles { get; set; } = new();
}

public class SaveIvfCoupleDto
{
    public Guid? Id { get; set; }
    public Guid WifePatientId { get; set; }
    public Guid HusbandPatientId { get; set; }
    public int InfertilityDurationMonths { get; set; }
    public string? InfertilityCause { get; set; }
    public string? MarriageDate { get; set; }
    public string? Notes { get; set; }
}

// ---- Cycle DTOs ----

public class IvfCycleDto
{
    public Guid Id { get; set; }
    public Guid CoupleId { get; set; }
    public int CycleNumber { get; set; }
    public string? StartDate { get; set; }
    public int Status { get; set; }
    public string? StatusName { get; set; }
    public string? Protocol { get; set; }
    public Guid? DoctorId { get; set; }
    public string? DoctorName { get; set; }
    public string? Notes { get; set; }
    public int EmbryoCount { get; set; }
    public int TransferCount { get; set; }
}

public class IvfCycleDetailDto : IvfCycleDto
{
    public IvfOvumPickupDto? OvumPickup { get; set; }
    public List<IvfEmbryoDto> Embryos { get; set; } = new();
    public List<IvfTransferDto> Transfers { get; set; } = new();
    public List<IvfBiopsyDto> Biopsies { get; set; } = new();
}

public class SaveIvfCycleDto
{
    public Guid? Id { get; set; }
    public Guid CoupleId { get; set; }
    public int CycleNumber { get; set; }
    public string? StartDate { get; set; }
    public string? Protocol { get; set; }
    public Guid? DoctorId { get; set; }
    public string? Notes { get; set; }
}

public class UpdateIvfCycleStatusDto
{
    public int Status { get; set; }
}

// ---- OvumPickup DTOs ----

public class IvfOvumPickupDto
{
    public Guid Id { get; set; }
    public Guid CycleId { get; set; }
    public string? PickupDate { get; set; }
    public int TotalOvums { get; set; }
    public int MatureOvums { get; set; }
    public int ImmatureOvums { get; set; }
    public int DegeneratedOvums { get; set; }
    public Guid? PerformedById { get; set; }
    public string? PerformedByName { get; set; }
    public string? Notes { get; set; }
}

public class SaveIvfOvumPickupDto
{
    public Guid? Id { get; set; }
    public Guid CycleId { get; set; }
    public string? PickupDate { get; set; }
    public int TotalOvums { get; set; }
    public int MatureOvums { get; set; }
    public int ImmatureOvums { get; set; }
    public int DegeneratedOvums { get; set; }
    public Guid? PerformedById { get; set; }
    public string? Notes { get; set; }
}

// ---- Embryo DTOs ----

public class IvfEmbryoDto
{
    public Guid Id { get; set; }
    public Guid CycleId { get; set; }
    public string EmbryoCode { get; set; } = string.Empty;
    public string? Day2Grade { get; set; }
    public string? Day3Grade { get; set; }
    public string? Day5Grade { get; set; }
    public string? Day6Grade { get; set; }
    public string? Day7Grade { get; set; }
    public int Status { get; set; }
    public string? StatusName { get; set; }
    public string? FreezeDate { get; set; }
    public string? ThawDate { get; set; }
    public string? StrawCode { get; set; }
    public string? StrawColor { get; set; }
    public string? BoxCode { get; set; }
    public string? TankCode { get; set; }
    public string? RackPosition { get; set; }
    public string? Notes { get; set; }
    public string? ImageUrl { get; set; }
}

public class SaveIvfEmbryoDto
{
    public Guid? Id { get; set; }
    public Guid CycleId { get; set; }
    public string EmbryoCode { get; set; } = string.Empty;
    public string? Day2Grade { get; set; }
    public string? Day3Grade { get; set; }
    public string? Day5Grade { get; set; }
    public string? Day6Grade { get; set; }
    public string? Day7Grade { get; set; }
    public string? Notes { get; set; }
    public string? ImageUrl { get; set; }
}

public class UpdateIvfEmbryoStatusDto
{
    public int Status { get; set; }
}

public class FreezeIvfEmbryoDto
{
    public string? FreezeDate { get; set; }
    public string? StrawCode { get; set; }
    public string? StrawColor { get; set; }
    public string? BoxCode { get; set; }
    public string? TankCode { get; set; }
    public string? RackPosition { get; set; }
}

public class ThawIvfEmbryoDto
{
    public string? ThawDate { get; set; }
}

// ---- Transfer DTOs ----

public class IvfTransferDto
{
    public Guid Id { get; set; }
    public Guid CycleId { get; set; }
    public string? TransferDate { get; set; }
    public int TransferType { get; set; }
    public string? TransferTypeName { get; set; }
    public int EmbryoCount { get; set; }
    public Guid? DoctorId { get; set; }
    public string? DoctorName { get; set; }
    public Guid? EmbryologistId { get; set; }
    public string? EmbryologistName { get; set; }
    public string? Notes { get; set; }
    public int ResultStatus { get; set; }
    public string? ResultStatusName { get; set; }
}

public class SaveIvfTransferDto
{
    public Guid? Id { get; set; }
    public Guid CycleId { get; set; }
    public string? TransferDate { get; set; }
    public int TransferType { get; set; }
    public int EmbryoCount { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? EmbryologistId { get; set; }
    public string? Notes { get; set; }
}

public class UpdateIvfTransferResultDto
{
    public int ResultStatus { get; set; }
}

// ---- SpermBank DTOs ----

public class IvfSpermSampleDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public string SampleCode { get; set; } = string.Empty;
    public string? CollectionDate { get; set; }
    public decimal? Volume { get; set; }
    public decimal? Concentration { get; set; }
    public decimal? Motility { get; set; }
    public decimal? Morphology { get; set; }
    public int StrawCount { get; set; }
    public string? TankCode { get; set; }
    public string? RackPosition { get; set; }
    public string? BoxCode { get; set; }
    public int Status { get; set; }
    public string? StatusName { get; set; }
    public string? ExpiryDate { get; set; }
    public decimal StorageFee { get; set; }
    public string? Notes { get; set; }
}

public class SaveIvfSpermSampleDto
{
    public Guid? Id { get; set; }
    public Guid PatientId { get; set; }
    public string SampleCode { get; set; } = string.Empty;
    public string? CollectionDate { get; set; }
    public decimal? Volume { get; set; }
    public decimal? Concentration { get; set; }
    public decimal? Motility { get; set; }
    public decimal? Morphology { get; set; }
    public int StrawCount { get; set; }
    public string? TankCode { get; set; }
    public string? RackPosition { get; set; }
    public string? BoxCode { get; set; }
    public string? ExpiryDate { get; set; }
    public decimal StorageFee { get; set; }
    public string? Notes { get; set; }
}

public class UpdateIvfSpermStatusDto
{
    public int Status { get; set; }
}

// ---- Biopsy DTOs ----

public class IvfBiopsyDto
{
    public Guid Id { get; set; }
    public Guid CycleId { get; set; }
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? BiopsyLab { get; set; }
    public string? SentDate { get; set; }
    public string? ResultDate { get; set; }
    public string? Result { get; set; }
    public string? Notes { get; set; }
}

public class SaveIvfBiopsyDto
{
    public Guid? Id { get; set; }
    public Guid CycleId { get; set; }
    public Guid? PatientId { get; set; }
    public string? BiopsyLab { get; set; }
    public string? SentDate { get; set; }
    public string? ResultDate { get; set; }
    public string? Result { get; set; }
    public string? Notes { get; set; }
}

// ---- Dashboard / Report DTOs ----

public class IvfDashboardDto
{
    public int ActiveCycles { get; set; }
    public int FrozenEmbryos { get; set; }
    public int SpermSamples { get; set; }
    public int TransfersThisMonth { get; set; }
    public decimal SuccessRate { get; set; }
    public int TotalCouples { get; set; }
    public int CompletedCycles { get; set; }
}

public class IvfDailyReportDto
{
    public string? Date { get; set; }
    public List<IvfDailyReportItemDto> Items { get; set; } = new();
}

public class IvfDailyReportItemDto
{
    public string ActivityType { get; set; } = string.Empty;
    public int Count { get; set; }
    public string? Details { get; set; }
}
