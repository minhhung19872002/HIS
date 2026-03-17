namespace HIS.Application.DTOs.Clinical;

// ========== Partograph DTOs ==========

public class PartographSearchDto
{
    public Guid? AdmissionId { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 100;
}

public class PartographRecordDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string RecordTime { get; set; } = string.Empty;
    public decimal? CervicalDilation { get; set; }
    public int? ContractionFrequency { get; set; }
    public int? ContractionDuration { get; set; }
    public int? FetalHeartRate { get; set; }
    public string? AmnioticFluid { get; set; }
    public string? MouldingDegree { get; set; }
    public string? FetalPosition { get; set; }
    public int? SystolicBP { get; set; }
    public int? DiastolicBP { get; set; }
    public int? MaternalPulse { get; set; }
    public decimal? Temperature { get; set; }
    public string? OxytocinDose { get; set; }
    public string? DrugGiven { get; set; }
    public string? AlertLine { get; set; }
    public string? Notes { get; set; }
    public string? CreatedBy { get; set; }
    public string? CreatedAt { get; set; }

    // Computed labels
    public string AlertLineLabel => AlertLine switch
    {
        "Normal" => "Binh thuong",
        "Alert" => "Canh bao",
        "Action" => "Can xu tri",
        _ => AlertLine ?? ""
    };
}

public class PartographSaveDto
{
    public Guid? Id { get; set; }
    public Guid AdmissionId { get; set; }
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public DateTime RecordTime { get; set; }
    public decimal? CervicalDilation { get; set; }
    public int? ContractionFrequency { get; set; }
    public int? ContractionDuration { get; set; }
    public int? FetalHeartRate { get; set; }
    public string? AmnioticFluid { get; set; }
    public string? MouldingDegree { get; set; }
    public string? FetalPosition { get; set; }
    public int? SystolicBP { get; set; }
    public int? DiastolicBP { get; set; }
    public int? MaternalPulse { get; set; }
    public decimal? Temperature { get; set; }
    public string? OxytocinDose { get; set; }
    public string? DrugGiven { get; set; }
    public string? AlertLine { get; set; }
    public string? Notes { get; set; }
}

// ========== Anesthesia DTOs ==========

public class AnesthesiaSearchDto
{
    public Guid? SurgeryId { get; set; }
    public Guid? PatientId { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int? Status { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 100;
}

public class AnesthesiaRecordDto
{
    public Guid Id { get; set; }
    public Guid SurgeryId { get; set; }
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public int AsaClass { get; set; }
    public int MallampatiScore { get; set; }
    public string? Allergies { get; set; }
    public string? NpoStatus { get; set; }
    public string AnesthesiaType { get; set; } = string.Empty;
    public string? AirwayPlan { get; set; }
    public string? PreOpAssessment { get; set; }
    public string? RecoveryNotes { get; set; }
    public int Status { get; set; }
    public string? CreatedBy { get; set; }
    public string? CreatedAt { get; set; }

    // Child collections
    public List<AnesthesiaMonitorDto> Monitors { get; set; } = new();
    public List<AnesthesiaDrugDto> Drugs { get; set; } = new();
    public List<AnesthesiaFluidDto> Fluids { get; set; } = new();

    // Labels
    public string StatusLabel => Status switch
    {
        0 => "Nhap",
        1 => "Dang gay me",
        2 => "Hoan thanh",
        _ => "Khong xac dinh"
    };
    public string AsaLabel => $"ASA {AsaClass}";
    public string MallampatiLabel => $"Mallampati {MallampatiScore}";
}

public class AnesthesiaSaveDto
{
    public Guid? Id { get; set; }
    public Guid SurgeryId { get; set; }
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public int AsaClass { get; set; }
    public int MallampatiScore { get; set; }
    public string? Allergies { get; set; }
    public string? NpoStatus { get; set; }
    public string AnesthesiaType { get; set; } = string.Empty;
    public string? AirwayPlan { get; set; }
    public string? PreOpAssessment { get; set; }
    public string? RecoveryNotes { get; set; }
    public int Status { get; set; }

    // Child collections for batch save
    public List<AnesthesiaMonitorDto> Monitors { get; set; } = new();
    public List<AnesthesiaDrugDto> Drugs { get; set; } = new();
    public List<AnesthesiaFluidDto> Fluids { get; set; } = new();
}

public class AnesthesiaMonitorDto
{
    public Guid? Id { get; set; }
    public string MonitorTime { get; set; } = string.Empty;
    public int? SystolicBP { get; set; }
    public int? DiastolicBP { get; set; }
    public int? HeartRate { get; set; }
    public int? SpO2 { get; set; }
    public int? EtCO2 { get; set; }
    public decimal? Temperature { get; set; }
    public string? Notes { get; set; }
}

public class AnesthesiaDrugDto
{
    public Guid? Id { get; set; }
    public string GivenTime { get; set; } = string.Empty;
    public string DrugName { get; set; } = string.Empty;
    public string? Dose { get; set; }
    public string? Route { get; set; }
}

public class AnesthesiaFluidDto
{
    public Guid? Id { get; set; }
    public string FluidType { get; set; } = string.Empty;
    public int? Volume { get; set; }
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
}
