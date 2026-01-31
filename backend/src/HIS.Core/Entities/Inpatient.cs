namespace HIS.Core.Entities;

/// <summary>
/// Nhập viện - Admission
/// </summary>
public class Admission : BaseEntity
{
    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public Guid MedicalRecordId { get; set; }
    public virtual MedicalRecord MedicalRecord { get; set; } = null!;

    public DateTime AdmissionDate { get; set; } // Ngày nhập viện
    public int AdmissionType { get; set; } // 1-Cấp cứu, 2-Chuyển tuyến, 3-Điều trị, 4-Khác
    public string? ReferralSource { get; set; } // Nguồn chuyển đến (nếu có)

    // Bác sĩ nhập viện
    public Guid AdmittingDoctorId { get; set; }
    public virtual User AdmittingDoctor { get; set; } = null!;

    // Khoa/Phòng/Giường
    public Guid DepartmentId { get; set; }
    public virtual Department Department { get; set; } = null!;

    public Guid RoomId { get; set; }
    public virtual Room Room { get; set; } = null!;

    public Guid? BedId { get; set; }
    public virtual Bed? Bed { get; set; }

    // Trạng thái
    public int Status { get; set; } // 0-Đang điều trị, 1-Chuyển khoa, 2-Xuất viện, 3-Tử vong, 4-Bỏ về

    // Chẩn đoán khi nhập viện
    public string? DiagnosisOnAdmission { get; set; }
    public string? ReasonForAdmission { get; set; } // Lý do nhập viện

    // Navigation properties
    public virtual ICollection<BedAssignment> BedAssignments { get; set; } = new List<BedAssignment>();
    public virtual ICollection<DailyProgress> DailyProgresses { get; set; } = new List<DailyProgress>();
    public virtual ICollection<NursingCare> NursingCares { get; set; } = new List<NursingCare>();
    public virtual Discharge? Discharge { get; set; }
}

/// <summary>
/// Phân giường - Bed Assignment
/// </summary>
public class BedAssignment : BaseEntity
{
    public Guid AdmissionId { get; set; }
    public virtual Admission Admission { get; set; } = null!;

    public Guid BedId { get; set; }
    public virtual Bed Bed { get; set; } = null!;

    public DateTime AssignedAt { get; set; } // Thời gian phân giường
    public DateTime? ReleasedAt { get; set; } // Thời gian trả giường

    public int Status { get; set; } // 0-Đang sử dụng, 1-Đã trả, 2-Chuyển giường
}

/// <summary>
/// Diễn biến hàng ngày - Daily Progress
/// </summary>
public class DailyProgress : BaseEntity
{
    public Guid AdmissionId { get; set; }
    public virtual Admission Admission { get; set; } = null!;

    public DateTime ProgressDate { get; set; } // Ngày ghi nhận

    public Guid DoctorId { get; set; }
    public virtual User Doctor { get; set; } = null!;

    // Diễn biến bệnh (SOAP format)
    public string? SubjectiveFindings { get; set; } // Chủ quan (S)
    public string? ObjectiveFindings { get; set; } // Khách quan (O)
    public string? Assessment { get; set; } // Đánh giá (A)
    public string? Plan { get; set; } // Kế hoạch (P)

    // Dấu hiệu sinh tồn
    public string? VitalSigns { get; set; } // JSON: temperature, pulse, BP, RR, SpO2

    // Chỉ định
    public string? DietOrder { get; set; } // Chế độ ăn
    public string? ActivityOrder { get; set; } // Chế độ vận động
}

/// <summary>
/// Chăm sóc điều dưỡng - Nursing Care
/// </summary>
public class NursingCare : BaseEntity
{
    public Guid AdmissionId { get; set; }
    public virtual Admission Admission { get; set; } = null!;

    public Guid NurseId { get; set; }
    public virtual User Nurse { get; set; } = null!;

    public DateTime CareDate { get; set; } // Ngày chăm sóc

    public int CareType { get; set; } // 1-Theo dõi dấu hiệu sinh tồn, 2-Chăm sóc vệ sinh, 3-Thay băng, 4-Tiêm truyền, 5-Khác
    public string Description { get; set; } = string.Empty; // Mô tả công việc chăm sóc

    public int Status { get; set; } // 0-Đang thực hiện, 1-Hoàn thành
}

/// <summary>
/// Xuất viện - Discharge
/// </summary>
public class Discharge : BaseEntity
{
    public Guid AdmissionId { get; set; }
    public virtual Admission Admission { get; set; } = null!;

    public DateTime DischargeDate { get; set; } // Ngày xuất viện

    public int DischargeType { get; set; } // 1-Ra viện, 2-Chuyển viện, 3-Bỏ về, 4-Tử vong
    public int DischargeCondition { get; set; } // 1-Khỏi, 2-Đỡ, 3-Không thay đổi, 4-Nặng hơn, 5-Tử vong

    public string? DischargeDiagnosis { get; set; } // Chẩn đoán ra viện
    public string? DischargeInstructions { get; set; } // Hướng dẫn sau xuất viện
    public DateTime? FollowUpDate { get; set; } // Ngày hẹn tái khám

    public Guid DischargedBy { get; set; }
    public virtual User DischargedBy_User { get; set; } = null!; // Bác sĩ ra viện
}
