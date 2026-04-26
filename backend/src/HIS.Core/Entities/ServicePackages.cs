namespace HIS.Core.Entities;

/// <summary>
/// Gói dịch vụ - Service package
/// VD: Gói khám sức khỏe tổng quát = 10 dịch vụ con với giá ưu đãi.
/// </summary>
public class ServicePackage : BaseEntity
{
    public string PackageCode { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;
    public string? Description { get; set; }

    public int PackageType { get; set; } // 1=Khám SK tổng quát, 2=Khám tiền hôn nhân, 3=Khám lái xe, 4=Khám visa, 5=Khác
    public string? GenderRestriction { get; set; } // Nam/Nữ/null

    public int? MinAge { get; set; }
    public int? MaxAge { get; set; }

    public decimal TotalPrice { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal FinalPrice { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }

    public virtual ICollection<ServicePackageItem> Items { get; set; } = new List<ServicePackageItem>();
}

/// <summary>
/// Item trong gói dịch vụ.
/// </summary>
public class ServicePackageItem : BaseEntity
{
    public Guid PackageId { get; set; }
    public virtual ServicePackage? Package { get; set; }

    public Guid ServiceId { get; set; }
    public virtual Service? Service { get; set; }

    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public string? Notes { get; set; }
}
