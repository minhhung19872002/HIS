namespace HIS.Application.DTOs;

// ========================
// Module 2: Y học cổ truyền (Traditional Medicine)
// ========================

public class TraditionalMedicineSearchDto
{
    public string? Keyword { get; set; }
    public string? TreatmentType { get; set; }
    public int? Status { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
}

public class TraditionalMedicineTreatmentDto
{
    public Guid Id { get; set; }
    public string TreatmentCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string TreatmentType { get; set; } = string.Empty;
    public string? DiagnosisTCM { get; set; }
    public string? DiagnosisWestern { get; set; }
    public int SessionNumber { get; set; }
    public string? TreatmentPlan { get; set; }
    public string? Practitioner { get; set; }
    public int Status { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string? Notes { get; set; }
}

public class TraditionalMedicineTreatmentDetailDto : TraditionalMedicineTreatmentDto
{
    public List<HerbalPrescriptionDto> HerbalPrescriptions { get; set; } = new();
}

public class CreateTraditionalMedicineTreatmentDto
{
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? TreatmentType { get; set; }
    public string? DiagnosisTCM { get; set; }
    public string? DiagnosisWestern { get; set; }
    public int? SessionNumber { get; set; }
    public string? TreatmentPlan { get; set; }
    public string? Practitioner { get; set; }
    public string? StartDate { get; set; }
    public string? Notes { get; set; }
}

public class HerbalPrescriptionDto
{
    public Guid Id { get; set; }
    public Guid TreatmentId { get; set; }
    public string PrescriptionCode { get; set; } = string.Empty;
    public string? HerbalFormula { get; set; }
    public string? Ingredients { get; set; }
    public string? Dosage { get; set; }
    public string? Instructions { get; set; }
    public int Duration { get; set; }
    public int Quantity { get; set; }
    public string? Notes { get; set; }
}

public class CreateHerbalPrescriptionDto
{
    public Guid? TreatmentId { get; set; }
    public string? HerbalFormula { get; set; }
    public string? Ingredients { get; set; }
    public string? Dosage { get; set; }
    public string? Instructions { get; set; }
    public int? Duration { get; set; }
    public int? Quantity { get; set; }
    public string? Notes { get; set; }
}

public class TraditionalMedicineStatsDto
{
    public int TotalTreatments { get; set; }
    public int ActiveCount { get; set; }
    public int CompletedCount { get; set; }
    public List<TreatmentTypeBreakdownDto> TreatmentTypeBreakdown { get; set; } = new();
}

public class TreatmentTypeBreakdownDto
{
    public string TreatmentType { get; set; } = string.Empty;
    public int Count { get; set; }
}
