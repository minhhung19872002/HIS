namespace HIS.Application.DTOs.BhytFullCoverage;

// F3.4: DTOs cho danh sach BN BHYT chi tra 100% thuoc dac tri

public class BhytFullCoveragePatientDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string InsuranceNumber { get; set; } = string.Empty;
    public DateTime EffectiveFrom { get; set; }
    public DateTime EffectiveTo { get; set; }
    public string? MedicineScopeJson { get; set; }
    public string? Note { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
}

public class CreateBhytFullCoverageDto
{
    public Guid PatientId { get; set; }
    public DateTime EffectiveFrom { get; set; }
    public DateTime EffectiveTo { get; set; }
    /// <summary>JSON array MedicineCode; null = tat ca thuoc dac tri.</summary>
    public string? MedicineScopeJson { get; set; }
    public string? Note { get; set; }
}

public class BhytFullCoverageSearchDto
{
    public string? Keyword { get; set; }
    public Guid? PatientId { get; set; }
    public bool? IsActive { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
