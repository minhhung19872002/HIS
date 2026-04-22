namespace HIS.Core.Entities;

/// <summary>
/// Sổ xét nghiệm — Sprint 6 Item 2.15.
/// Phân cấp 3 tầng: Sổ XN (LabBook) → Nhóm XN (LabBookGroup) → Dịch vụ XN (existing Service).
/// Khi máy XN trả KQ, map về Sổ tương ứng để in + báo cáo.
/// </summary>
public class LabBook : BaseEntity
{
    public string BookCode { get; set; } = string.Empty;
    public string BookName { get; set; } = string.Empty;

    /// <summary>STT hiển thị sổ — dùng khi in báo cáo sổ XN</summary>
    public int SortOrder { get; set; }

    /// <summary>Prefix barcode mẫu cho sổ này (HH/SH/VS/MB/GP...)</summary>
    public string? BarcodePrefix { get; set; }

    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }

    public virtual ICollection<LabBookGroup> Groups { get; set; } = new List<LabBookGroup>();
}

public class LabBookGroup : BaseEntity
{
    public Guid LabBookId { get; set; }
    public virtual LabBook? LabBook { get; set; }

    public string GroupCode { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>Danh sách ServiceId thuộc nhóm này — JSON array of Guid</summary>
    public string? ServiceIdsJson { get; set; }
}

/// <summary>
/// Hóa chất / vật tư tiêu hao cho 1 XN cụ thể — Sprint 6 Item 2.15.
/// Khi trả KQ XN sẽ auto-deduct tồn kho theo tỉ lệ quy định.
/// </summary>
public class LabChemical : BaseEntity
{
    public Guid ServiceId { get; set; }
    public virtual Service? Service { get; set; }

    public Guid MedicalSupplyId { get; set; }
    public virtual MedicalSupply? MedicalSupply { get; set; }

    /// <summary>Số lượng tiêu hao / 1 lần XN</summary>
    public decimal QuantityPerTest { get; set; }
    public string? Unit { get; set; }

    /// <summary>"HaoPhi" / "ThuPhi" — mặc định là hao phí</summary>
    public string ObjectType { get; set; } = "HaoPhi";

    public bool IsActive { get; set; } = true;
    public string? Note { get; set; }
}
