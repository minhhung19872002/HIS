namespace HIS.Core.Entities;

/// <summary>
/// Phòng lưu / theo dõi ngắn hạn (N1.07).
/// Khác hồ sơ nội trú: BN chưa nhập viện chính thức, chỉ ở phòng lưu để
/// theo dõi 2-12 tiếng trước khi cho về hoặc nhập viện. Thường dùng ở cấp cứu.
/// </summary>
public class ObservationStay : BaseEntity
{
    public string StayCode { get; set; } = string.Empty;

    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public Guid? MedicalRecordId { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }

    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }

    public Guid? RoomId { get; set; }
    public virtual Room? Room { get; set; }

    public Guid? BedId { get; set; }
    public virtual Bed? Bed { get; set; }

    public Guid? DoctorId { get; set; }
    public virtual User? Doctor { get; set; }

    public DateTime AdmittedAt { get; set; } = DateTime.Now;
    public DateTime? DischargedAt { get; set; }

    public string? ChiefComplaint { get; set; }      // Lý do vào lưu
    public string? InitialDiagnosis { get; set; }    // Chẩn đoán sơ bộ
    public string? FinalDiagnosis { get; set; }      // Chẩn đoán khi ra

    /// <summary>
    /// 1 = Đang lưu (InObservation)
    /// 2 = Cho về (DischargedHome)
    /// 3 = Chuyển nhập viện (EscalatedToInpatient)
    /// 4 = Chuyển viện (TransferredOut)
    /// 5 = Tử vong (Died)
    /// </summary>
    public int Status { get; set; } = 1;

    public string? DischargeReason { get; set; }
    public string? Notes { get; set; }

    /// <summary>Điểm cảnh báo sớm (MEWS/NEWS) nếu có.</summary>
    public int? EwsScore { get; set; }

    /// <summary>Nếu escalated, HSBA nội trú được tạo.</summary>
    public Guid? EscalatedToAdmissionId { get; set; }
}

/// <summary>
/// Bản ghi theo dõi sinh hiệu / diễn biến trong phòng lưu.
/// </summary>
public class ObservationVital : BaseEntity
{
    public Guid ObservationStayId { get; set; }
    public virtual ObservationStay ObservationStay { get; set; } = null!;

    public DateTime RecordedAt { get; set; } = DateTime.Now;

    public decimal? Temperature { get; set; }
    public int? HeartRate { get; set; }
    public int? RespirationRate { get; set; }
    public string? BloodPressure { get; set; } // "120/80"
    public int? SpO2 { get; set; }
    public int? Consciousness { get; set; } // GCS or AVPU-coded

    public string? NurseNote { get; set; }
    public string? DoctorNote { get; set; }

    public Guid? RecordedByUserId { get; set; }
}
