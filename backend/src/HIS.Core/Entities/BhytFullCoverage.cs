namespace HIS.Core.Entities;

/// <summary>
/// F3.4 — Danh sach BN duoc BHYT chi tra 100% thuoc dac tri (mien phan cung chi tra).
/// Khi BN co ban ghi con hieu luc, phan BN cang chi tra (PatientAmount) cho cac
/// PrescriptionDetail thuoc pham vi MedicineScopeJson se duoc tinh bang 0.
/// </summary>
public class BhytFullCoveragePatient : BaseEntity
{
    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    /// <summary>Ngay bat dau hieu luc (inclusive, Date only).</summary>
    public DateTime EffectiveFrom { get; set; }

    /// <summary>Ngay ket thuc hieu luc (inclusive, Date only).</summary>
    public DateTime EffectiveTo { get; set; }

    /// <summary>
    /// JSON array cac MedicineCode duoc ap dung (null = tat ca thuoc dac tri cua BN).
    /// Vi du: ["ABC001","DEF002"]
    /// </summary>
    public string? MedicineScopeJson { get; set; }

    public string? Note { get; set; }

    public bool IsActive { get; set; } = true;
}
