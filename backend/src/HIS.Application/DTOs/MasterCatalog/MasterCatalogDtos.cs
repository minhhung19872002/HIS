namespace HIS.Application.DTOs.MasterCatalog;

public class ManufacturerDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Country { get; set; }
    public string? Address { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class MedicationRouteDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? BhxhCode { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class AdditionalChargeDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public string? Unit { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class OtherIncomeDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public string? Unit { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class TransportServiceDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int CalculationType { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal? GasolineFactor { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class GasolinePriceDto
{
    public Guid Id { get; set; }
    public string FuelType { get; set; } = string.Empty;
    public decimal PricePerLitre { get; set; }
    public DateTime EffectiveFrom { get; set; }
    public string? IssuedBy { get; set; }
    public string? Note { get; set; }
}

public class MachineCodeDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Manufacturer { get; set; }
    public string? Model { get; set; }
    public string? SerialNumber { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? RoomId { get; set; }
    public string? BhxhCode { get; set; }
    public string? Note { get; set; }
    public bool IsLocked { get; set; }
    public bool IsActive { get; set; } = true;
}

public class MachineServiceDto
{
    public Guid Id { get; set; }
    public Guid MachineCodeId { get; set; }
    public Guid ServiceId { get; set; }
    public string? ServiceName { get; set; }
    public string? MachineName { get; set; }
    public bool IsDefault { get; set; }
    public string? Note { get; set; }
}

public class InspectionCommitteeDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public bool IsActive { get; set; } = true;
    public List<InspectionCommitteeMemberDto> Members { get; set; } = new();
}

public class InspectionCommitteeMemberDto
{
    public Guid Id { get; set; }
    public Guid CommitteeId { get; set; }
    public Guid? UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Role { get; set; }
    public int SortOrder { get; set; }
}

public class NursingCareLevelDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Level { get; set; }
    public string? Description { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class MedicalRecordTypeDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Category { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsLocked { get; set; }
}

public class ParaclinicalRoomPriorityDto
{
    public Guid Id { get; set; }
    public Guid ServiceId { get; set; }
    public string? ServiceName { get; set; }
    public Guid? RoomId { get; set; }
    public string? RoomName { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public int PriorityLevel { get; set; }
    public int Sequence { get; set; }
    public string? Note { get; set; }
}

public class ReportServiceGroupTypeDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ReportLabel { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class ReportServiceGroupDto
{
    public Guid Id { get; set; }
    public Guid GroupTypeId { get; set; }
    public string? GroupTypeName { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
