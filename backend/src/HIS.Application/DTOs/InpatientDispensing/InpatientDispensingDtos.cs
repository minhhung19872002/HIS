namespace HIS.Application.DTOs.InpatientDispensing;

public class BatchDispenseDto
{
    public Guid WarehouseId { get; set; }
    public Guid DepartmentId { get; set; }
    public List<Guid> PrescriptionIds { get; set; } = new();
    public string? Note { get; set; }
}
