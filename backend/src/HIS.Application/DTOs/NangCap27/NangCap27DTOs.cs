namespace HIS.Application.DTOs.NangCap27;

// ============================================================
// G1 — Phiếu vận chuyển người bệnh
// ============================================================

public class PatientTransportSlipDto
{
    public Guid Id { get; set; }
    public string SlipCode { get; set; } = string.Empty;

    public Guid PatientId { get; set; }
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }

    public Guid? MedicalRecordId { get; set; }
    public Guid? ExaminationId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }

    public Guid TransportServiceId { get; set; }
    public string? TransportServiceName { get; set; }
    public Guid? GasolinePriceId { get; set; }
    public string? FuelType { get; set; }

    public DateTime TransportDate { get; set; }
    public string FromPlace { get; set; } = string.Empty;
    public string ToPlace { get; set; } = string.Empty;
    public string? Reason { get; set; }

    public string? VehiclePlate { get; set; }
    public string? DriverName { get; set; }
    public string? EscortStaff { get; set; }

    public decimal DistanceKm { get; set; }
    public int CalculationType { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal? GasolineFactor { get; set; }
    public decimal? FuelPricePerLitre { get; set; }

    public decimal ServiceAmount { get; set; }
    public decimal FuelAmount { get; set; }
    public decimal TotalAmount { get; set; }

    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public Guid? ApprovedByUserId { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? CancelReason { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveTransportSlipDto
{
    public Guid? Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public Guid? ExaminationId { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid TransportServiceId { get; set; }
    /// <summary>Loại nhiên liệu xe dùng — phải khớp FuelType trong danh mục giá xăng.</summary>
    public string? FuelType { get; set; }
    public DateTime? TransportDate { get; set; }
    public string FromPlace { get; set; } = string.Empty;
    public string ToPlace { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public string? VehiclePlate { get; set; }
    public string? DriverName { get; set; }
    public string? EscortStaff { get; set; }
    public decimal DistanceKm { get; set; }
    public string? Note { get; set; }
}

public class TransportSlipFilterDto
{
    public Guid? PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public Guid? ExaminationId { get; set; }
    public Guid? DepartmentId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int? Status { get; set; }
    public string? Keyword { get; set; }
}

public class CancelTransportSlipDto
{
    public string? Reason { get; set; }
}

// ============================================================
// G8 — Khám sức khỏe theo đoàn: công ty + hợp đồng
// ============================================================

public class CheckupCompanyDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? TaxCode { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }
    public string? Note { get; set; }
    public bool IsActive { get; set; } = true;
    public int ContractCount { get; set; }
}

public class CheckupContractDto
{
    public Guid Id { get; set; }
    public string ContractCode { get; set; } = string.Empty;
    public Guid CheckupCompanyId { get; set; }
    public string? CompanyName { get; set; }
    public Guid? CampaignId { get; set; }
    public DateTime ContractDate { get; set; }
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public string? PackageName { get; set; }
    public decimal UnitPrice { get; set; }
    public int ExpectedHeadcount { get; set; }
    public decimal TotalAmount { get; set; }
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveCheckupContractDto
{
    public Guid? Id { get; set; }
    public string? ContractCode { get; set; }
    public Guid CheckupCompanyId { get; set; }
    public Guid? CampaignId { get; set; }
    public DateTime? ContractDate { get; set; }
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public string? PackageName { get; set; }
    public decimal UnitPrice { get; set; }
    public int ExpectedHeadcount { get; set; }
    public int Status { get; set; }
    public string? Note { get; set; }
}

public class CheckupContractFilterDto
{
    public Guid? CheckupCompanyId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int? Status { get; set; }
    public string? Keyword { get; set; }
}
