namespace HIS.Application.DTOs.Pharmacy;

public class CreatePharmacyApprovalDto
{
    public int ApprovalType { get; set; }
    public Guid? FromDepartmentId { get; set; }
    public Guid? ToWarehouseId { get; set; }
    public Guid? FromWarehouseId { get; set; }
    public Guid? PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public string? LockedObject { get; set; }
    public string? Note { get; set; }
    public List<CreatePharmacyApprovalItemDto> Items { get; set; } = new();
}

public class CreatePharmacyApprovalItemDto
{
    public Guid? MedicineId { get; set; }
    public Guid? SupplyId { get; set; }
    public Guid? InventoryItemId { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public decimal RequestedQuantity { get; set; }
    public string? Unit { get; set; }
    public decimal UnitPrice { get; set; }
    public string? ObjectType { get; set; }
    public string? UsageInstruction { get; set; }
    public string? Note { get; set; }
}

public class PharmacyApprovalDto
{
    public Guid Id { get; set; }
    public string ApprovalCode { get; set; } = string.Empty;
    public int ApprovalType { get; set; }
    public string ApprovalTypeName { get; set; } = string.Empty;
    public Guid? FromDepartmentId { get; set; }
    public string? FromDepartmentName { get; set; }
    public Guid? ToWarehouseId { get; set; }
    public string? ToWarehouseName { get; set; }
    public Guid? FromWarehouseId { get; set; }
    public string? FromWarehouseName { get; set; }
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public string? LockedObject { get; set; }
    public DateTime RequestDate { get; set; }
    public int Status { get; set; }
    public string StatusText { get; set; } = string.Empty;
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ApproverName { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokeReason { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<PharmacyApprovalItemDto> Items { get; set; } = new();
    public decimal TotalAmount { get; set; }
}

public class PharmacyApprovalItemDto
{
    public Guid Id { get; set; }
    public Guid? MedicineId { get; set; }
    public string? MedicineName { get; set; }
    public Guid? SupplyId { get; set; }
    public string? SupplyName { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public decimal RequestedQuantity { get; set; }
    public decimal ApprovedQuantity { get; set; }
    public string? Unit { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public string? ObjectType { get; set; }
    public string? UsageInstruction { get; set; }
    public bool IsExcluded { get; set; }
}

public class PharmacyApprovalSearchDto
{
    public int? ApprovalType { get; set; }
    public int? Status { get; set; }
    public Guid? FromDepartmentId { get; set; }
    public Guid? ToWarehouseId { get; set; }
    public Guid? PatientId { get; set; }
    public string? Keyword { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int PageIndex { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class PharmacyApprovalSearchResultDto
{
    public List<PharmacyApprovalDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

public class SubmitApprovalDto
{
    public Guid ApprovalId { get; set; }
    public string? Note { get; set; }
}

public class ApproveDto
{
    public Guid ApprovalId { get; set; }
    public List<ApproveItemDto> Items { get; set; } = new();
    public string? Note { get; set; }
}

public class ApproveItemDto
{
    public Guid ItemId { get; set; }
    public decimal ApprovedQuantity { get; set; }
    public bool IsExcluded { get; set; }
}

public class RevokeApprovalDto
{
    public Guid ApprovalId { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class ExpiringMedicineDto
{
    public Guid InventoryItemId { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public int? DaysUntilExpiry { get; set; }
    public decimal Quantity { get; set; }
    public string? Unit { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string Severity { get; set; } = "info";
}
