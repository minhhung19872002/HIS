namespace HIS.Core.Entities;

// ========================
// NangCap18: Diagnosis Interruption (IPD)
// ========================

/// <summary>
/// Gián đoạn chẩn đoán trong quá trình điều trị nội trú
/// </summary>
public class DiagnosisInterruption : BaseEntity
{
    public Guid AdmissionId { get; set; }
    public virtual Admission Admission { get; set; } = null!;

    public DateTime InterruptDate { get; set; }
    public DateTime? ResumeDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

// ========================
// NangCap18: Anesthesia Chart (Surgery)
// ========================

/// <summary>
/// Dữ liệu biểu đồ gây mê theo thời gian trong phẫu thuật
/// </summary>
public class AnesthesiaChartEntry : BaseEntity
{
    public Guid SurgeryScheduleId { get; set; }
    public virtual SurgerySchedule SurgerySchedule { get; set; } = null!;

    public int TimeMinutes { get; set; } // Phút kể từ khi bắt đầu mổ
    public int? HeartRate { get; set; }
    public int? SystolicBP { get; set; }
    public int? DiastolicBP { get; set; }
    public int? SpO2 { get; set; }
    public decimal? Temperature { get; set; }
    public int? EtCO2 { get; set; }
    public string? Drug { get; set; }
    public string? DoseGiven { get; set; }
    public string? Notes { get; set; }
}

// ========================
// NangCap18: Drug Equivalence (Pharmacy/Warehouse)
// ========================

/// <summary>
/// Khai báo thuốc tương đương (generic/branded equivalents)
/// </summary>
public class DrugEquivalence : BaseEntity
{
    public Guid MedicineId { get; set; }
    public virtual Medicine Medicine { get; set; } = null!;

    public Guid EquivalentMedicineId { get; set; }
    public virtual Medicine EquivalentMedicine { get; set; } = null!;

    public string? Notes { get; set; }
}

// ========================
// NangCap18: Lab Result Access Link (Notification/SMS)
// ========================

/// <summary>
/// Link truy cập kết quả xét nghiệm online (one-time)
/// </summary>
public class LabResultAccessLink : BaseEntity
{
    public Guid LabRequestId { get; set; }
    public virtual LabRequest LabRequest { get; set; } = null!;

    public string AccessToken { get; set; } = string.Empty; // Unique token
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
    public DateTime? UsedAt { get; set; }
    public string? Phone { get; set; }
}
