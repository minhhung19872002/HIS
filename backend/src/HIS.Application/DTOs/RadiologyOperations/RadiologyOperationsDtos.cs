namespace HIS.Application.DTOs.RadiologyOperations;

public class AddOnDto
{
    public Guid ParentRequestId { get; set; }
    public List<Guid> ServiceIds { get; set; } = new();
    public string? Reason { get; set; }
    public bool WithContrast { get; set; }
}

public class RoomDispenseItemDto
{
    public Guid? MedicineId { get; set; }
    public Guid? SupplyId { get; set; }
    public decimal Quantity { get; set; }
    public string? Unit { get; set; }
    public string? Note { get; set; }
}

public class RoomDispenseDto
{
    public Guid WarehouseId { get; set; }
    public Guid PatientId { get; set; }
    public Guid? RadiologyRequestId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public List<RoomDispenseItemDto> Items { get; set; } = new();
    public string? Note { get; set; }
}
