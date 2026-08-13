namespace HIS.Core.Entities;

/// <summary>
/// NangCap27 — Phiếu vận chuyển người bệnh (HSMT 4.1.8/4.1.30, 10.1.9/.11, 11.1.12/.14, 18.2.9/.11, 18.3.12/.14).
/// Danh mục <see cref="TransportService"/> + <see cref="GasolinePrice"/> đã có sẵn (NangCap22);
/// entity này là PHIẾU phát sinh theo lượt vận chuyển của người bệnh.
/// Giá được SNAPSHOT lúc lập phiếu — danh mục đổi giá về sau không làm đổi phiếu đã lập.
/// </summary>
public class PatientTransportSlip : BaseEntity
{
    public string SlipCode { get; set; } = string.Empty;

    public Guid PatientId { get; set; }
    public virtual Patient? Patient { get; set; }

    /// <summary>Hồ sơ bệnh án (nội trú / điều trị ngoại trú)</summary>
    public Guid? MedicalRecordId { get; set; }
    /// <summary>Lượt khám ngoại trú</summary>
    public Guid? ExaminationId { get; set; }
    public Guid? DepartmentId { get; set; }

    public Guid TransportServiceId { get; set; }
    public virtual TransportService? TransportService { get; set; }

    /// <summary>Bản giá xăng được áp dụng (chỉ dùng khi tính theo km)</summary>
    public Guid? GasolinePriceId { get; set; }
    /// <summary>
    /// Loại nhiên liệu xe sử dụng (RON 95, E5 RON 92, Diesel…). Danh mục giá xăng có NHIỀU loại
    /// cùng hiệu lực một ngày nên bắt buộc ghi rõ loại — nếu không, tiền xăng sẽ phụ thuộc thứ tự
    /// bản ghi trả về (mỗi lần lập phiếu ra một số tiền khác nhau).
    /// </summary>
    public string? FuelType { get; set; }

    public DateTime TransportDate { get; set; }
    public string FromPlace { get; set; } = string.Empty;
    public string ToPlace { get; set; } = string.Empty;
    public string? Reason { get; set; }

    public string? VehiclePlate { get; set; }
    public string? DriverName { get; set; }
    /// <summary>Nhân viên y tế đi kèm</summary>
    public string? EscortStaff { get; set; }

    public decimal DistanceKm { get; set; }

    // --- Snapshot giá ---
    /// <summary>1 = theo km, 2 = theo lượt (copy từ TransportService lúc lập phiếu)</summary>
    public int CalculationType { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    /// <summary>Số lít xăng tiêu hao trên mỗi km (chỉ dùng khi CalculationType = 1)</summary>
    public decimal? GasolineFactor { get; set; }
    public decimal? FuelPricePerLitre { get; set; }

    public decimal ServiceAmount { get; set; }
    public decimal FuelAmount { get; set; }
    public decimal TotalAmount { get; set; }

    /// <summary>0 = Nháp, 1 = Đã duyệt, 2 = Hoàn thành, 3 = Hủy</summary>
    public int Status { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? CancelReason { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// NangCap27 — Danh mục công ty ký hợp đồng khám sức khỏe theo đoàn (HSMT 17.1).
/// </summary>
public class CheckupCompany : BaseEntity
{
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
}

/// <summary>
/// NangCap27 — Hợp đồng khám sức khỏe theo đoàn (HSMT 17.2).
/// <see cref="CampaignId"/> trỏ tới đợt khám sẵn có của module Khám sức khỏe
/// (api/health-checkup/campaigns) — không đặt FK cứng để hợp đồng lập được TRƯỚC khi mở đợt.
/// </summary>
public class CheckupContract : BaseEntity
{
    public string ContractCode { get; set; } = string.Empty;

    public Guid CheckupCompanyId { get; set; }
    public virtual CheckupCompany? CheckupCompany { get; set; }

    public Guid? CampaignId { get; set; }

    public DateTime ContractDate { get; set; }
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }

    public string? PackageName { get; set; }
    public decimal UnitPrice { get; set; }
    public int ExpectedHeadcount { get; set; }
    public decimal TotalAmount { get; set; }

    /// <summary>0 = Nháp, 1 = Hiệu lực, 2 = Hoàn thành, 3 = Thanh lý</summary>
    public int Status { get; set; }
    public string? Note { get; set; }
}
