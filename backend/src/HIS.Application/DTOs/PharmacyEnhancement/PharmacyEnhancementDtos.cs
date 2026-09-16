namespace HIS.Application.DTOs.PharmacyEnhancement;

public class CancelReasonDto
{
    public string? Reason { get; set; }
}

/// <summary>
/// QA-R4: POST /api/pharmacy/compounding used to bind the CompoundingOrder ENTITY. Its item navigation
/// <c>CompoundingOrderItem.CompoundingOrder</c> is a non-nullable reference → implicitly [Required] → any order
/// WITH items was rejected 400 ("Items[0].CompoundingOrder is required"), and an empty body hit the FK → 500.
/// </summary>
public class CreateCompoundingOrderDto
{
    public Guid PrescriptionId { get; set; }
    public Guid PatientId { get; set; }
    public Guid? AdmissionId { get; set; }
    public Guid DepartmentId { get; set; }
    public int CompoundingType { get; set; } // 1 IV admixture, 2 TPN, 3 cytotoxic, 4 other
    public string? Instructions { get; set; }
    public string? BaseFluid { get; set; }
    public decimal? TotalVolume { get; set; }
    public string? InfusionRate { get; set; }
    public string? StabilityNotes { get; set; }
    public List<CreateCompoundingOrderItemDto> Items { get; set; } = new();
}

public class CreateCompoundingOrderItemDto
{
    public Guid MedicineId { get; set; }
    public decimal Quantity { get; set; }
    public string? Unit { get; set; }
    public string? MixingInstructions { get; set; }
    public int SortOrder { get; set; }
}
