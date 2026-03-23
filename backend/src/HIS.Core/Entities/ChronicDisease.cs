namespace HIS.Core.Entities;

/// <summary>
/// Bệnh án bệnh mãn tính (NangCap14 - BV Phổi Hải Dương)
/// </summary>
public class ChronicDiseaseRecord : BaseEntity
{
    public Guid PatientId { get; set; }
    public string IcdCode { get; set; } = string.Empty;
    public string IcdName { get; set; } = string.Empty;
    public DateTime DiagnosisDate { get; set; }

    // Status: Active, Remission, Closed, Removed
    public string Status { get; set; } = "Active";

    public Guid DoctorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? Notes { get; set; }

    // Follow-up scheduling
    public int FollowUpIntervalDays { get; set; } = 30;
    public DateTime? NextFollowUpDate { get; set; }

    // Closure
    public DateTime? ClosedDate { get; set; }
    public string? ClosedReason { get; set; }
    public string? ClosedBy { get; set; }

    // Removal
    public DateTime? RemovedDate { get; set; }
    public string? RemovedReason { get; set; }
    public string? RemovedBy { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual User? Doctor { get; set; }
    public virtual Department? Department { get; set; }
    public virtual ICollection<ChronicDiseaseFollowUp> FollowUps { get; set; } = new List<ChronicDiseaseFollowUp>();
}

/// <summary>
/// Lần tái khám bệnh mãn tính
/// </summary>
public class ChronicDiseaseFollowUp : BaseEntity
{
    public Guid ChronicDiseaseRecordId { get; set; }
    public DateTime FollowUpDate { get; set; }

    // Status: Scheduled, Completed, Missed, Cancelled
    public string Status { get; set; } = "Scheduled";

    public Guid? ExaminationId { get; set; }
    public string? Notes { get; set; }

    // Vital signs snapshot
    public string? VitalSigns { get; set; } // JSON: {bloodPressure, heartRate, weight, etc.}

    // Medication review
    public string? MedicationChanges { get; set; }
    public string? LabResults { get; set; }

    // Navigation
    public virtual ChronicDiseaseRecord? ChronicDiseaseRecord { get; set; }
    public virtual Examination? Examination { get; set; }
}
