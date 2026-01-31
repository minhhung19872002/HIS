namespace HIS.Core.Entities;

/// <summary>
/// Nhóm dịch vụ - ServiceGroup
/// </summary>
public class ServiceGroup : BaseEntity
{
    public string GroupCode { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public int GroupType { get; set; } // 1-Khám, 2-XN, 3-CĐHA, 4-TDCN, 5-PTTT, 6-Giường, 7-Khác
    public string? Description { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public Guid? ParentId { get; set; }
    public virtual ServiceGroup? Parent { get; set; }

    public virtual ICollection<ServiceGroup> Children { get; set; } = new List<ServiceGroup>();
    public virtual ICollection<Service> Services { get; set; } = new List<Service>();
}

/// <summary>
/// Dịch vụ - Service
/// </summary>
public class Service : BaseEntity
{
    public string ServiceCode { get; set; } = string.Empty; // Mã dịch vụ
    public string ServiceName { get; set; } = string.Empty; // Tên dịch vụ
    public string? ServiceCodeBYT { get; set; } // Mã tương đương BYT
    public string? ServiceCodeBHYT { get; set; } // Mã BHYT

    public Guid ServiceGroupId { get; set; }
    public virtual ServiceGroup ServiceGroup { get; set; } = null!;

    // Giá
    public decimal UnitPrice { get; set; } // Đơn giá
    public decimal InsurancePrice { get; set; } // Giá BHYT
    public decimal ServicePrice { get; set; } // Giá dịch vụ
    public string? Unit { get; set; } // Đơn vị tính

    // Phân loại
    public int ServiceType { get; set; } // 1-Khám, 2-XN, 3-CĐHA, 4-TDCN, 5-PTTT
    public int SurgeryType { get; set; } // Loại PTTT: 0-Không, 1-Đặc biệt, 2-Loại 1, 3-Loại 2, 4-Loại 3
    public bool IsInsuranceCovered { get; set; } = true; // BHYT chi trả
    public int InsurancePaymentRate { get; set; } = 100; // Tỷ lệ BHYT thanh toán (%)

    // Cấu hình
    public bool RequiresResult { get; set; } // Cần trả kết quả
    public bool RequiresSample { get; set; } // Cần lấy mẫu (XN)
    public int EstimatedMinutes { get; set; } // Thời gian ước tính (phút)
    public string? Note { get; set; }

    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }

    // Navigation
    public virtual ICollection<ServicePrice> ServicePrices { get; set; } = new List<ServicePrice>();
}

/// <summary>
/// Bảng giá dịch vụ - ServicePrice (cho nhiều đối tượng khác nhau)
/// </summary>
public class ServicePrice : BaseEntity
{
    public Guid ServiceId { get; set; }
    public virtual Service Service { get; set; } = null!;

    public int PatientType { get; set; } // 1-BHYT, 2-Viện phí, 3-Dịch vụ, 4-Khám sức khỏe
    public decimal Price { get; set; }
    public int InsurancePaymentRate { get; set; } = 100; // Tỷ lệ BHYT
    public decimal Surcharge { get; set; } // Phụ thu

    public DateTime EffectiveDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsActive { get; set; } = true;
}
