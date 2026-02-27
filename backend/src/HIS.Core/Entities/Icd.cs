namespace HIS.Core.Entities;

/// <summary>
/// Danh mục ICD-10 - IcdCode
/// </summary>
public class IcdCode : BaseEntity
{
    public string Code { get; set; } = string.Empty; // Mã ICD
    public string Name { get; set; } = string.Empty; // Tên bệnh
    public string? NameEnglish { get; set; } // Tên tiếng Anh
    public string? ChapterCode { get; set; } // Mã chương
    public string? ChapterName { get; set; } // Tên chương
    public string? GroupCode { get; set; } // Mã nhóm
    public string? GroupName { get; set; } // Tên nhóm

    public int IcdType { get; set; } // 1-Bệnh chính, 2-Nguyên nhân ngoài
    public bool IsNotifiable { get; set; } // Bệnh truyền nhiễm phải báo cáo
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Danh mục dân tộc - Ethnic
/// </summary>
public class Ethnic : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Danh mục quốc gia - Country
/// </summary>
public class Country : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Danh mục tỉnh/thành - Province
/// </summary>
public class Province : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public virtual ICollection<District> Districts { get; set; } = new List<District>();
}

/// <summary>
/// Danh mục quận/huyện - District
/// </summary>
public class District : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    public Guid ProvinceId { get; set; }
    public virtual Province Province { get; set; } = null!;

    public bool IsActive { get; set; } = true;

    public virtual ICollection<Ward> Wards { get; set; } = new List<Ward>();
}

/// <summary>
/// Danh mục xã/phường - Ward
/// </summary>
public class Ward : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    public Guid DistrictId { get; set; }
    public virtual District District { get; set; } = null!;

    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Nhà cung cấp - Supplier
/// </summary>
public class Supplier : BaseEntity
{
    public string SupplierCode { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public string? TaxCode { get; set; } // Mã số thuế
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? ContactPerson { get; set; }
    public string? BankAccount { get; set; }
    public string? BankName { get; set; }
    public int SupplierType { get; set; } // 1-Thuốc, 2-Vật tư, 3-Thiết bị

    public decimal TotalDebt { get; set; } // Công nợ
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Thuật ngữ lâm sàng - ClinicalTerm
/// Bệnh viện tự khai báo (NangCap EMR 1.5)
/// </summary>
public class ClinicalTerm : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? NameEnglish { get; set; }
    public string Category { get; set; } = string.Empty; // Symptom, Sign, Examination, ReviewOfSystems, Procedure, Other
    public string? BodySystem { get; set; } // Cardiovascular, Respiratory, GI, Neuro, MSK, Skin, General, etc.
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Nhật ký hệ thống - AuditLog (Level 6 security audit trail)
/// Tracks medical record access and modifications per TT 54/2017, TT 32/2023
/// </summary>
public class AuditLog : BaseEntity
{
    public string TableName { get; set; } = string.Empty;  // Legacy: mapped to EntityType
    public Guid RecordId { get; set; }                     // Legacy: mapped to EntityId
    public string Action { get; set; } = string.Empty;     // Read, Create, Update, Delete, Print, Export
    public string? OldValues { get; set; }                 // JSON - previous state
    public string? NewValues { get; set; }                 // JSON - new state
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    public Guid? UserId { get; set; }
    public string? Username { get; set; }

    // Level 6 audit fields
    public string? UserFullName { get; set; }              // Full name for display
    public string? EntityType { get; set; }                // Patient, Examination, Prescription, etc.
    public string? EntityId { get; set; }                  // String ID of the entity
    public string? Details { get; set; }                   // JSON with additional context
    public DateTime Timestamp { get; set; }                // Exact time of the action
    public string? Module { get; set; }                    // Reception, OPD, EMR, Pharmacy, Billing, etc.
    public string? RequestPath { get; set; }               // API endpoint path
    public string? RequestMethod { get; set; }             // HTTP method (GET, POST, PUT, DELETE)
    public int? ResponseStatusCode { get; set; }           // HTTP response status code
}
