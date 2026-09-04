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
    // #218/T3 (2026-09-04): chú thích cũ ghi "1-Chuyển khoa(legacy), 2-Xuất viện" là SAI so với mã
    // đang chạy. `DischargeAsync` ánh xạ DischargeType → Status: 1 Ra viện→1, 2 Chuyển viện→2,
    // 3 Bỏ về→4, 4 Tử vong→3. Từ vựng đúng nằm ở HIS.Core.Constants.AdmissionStatus — dùng nó thay
    // vì đọc số ở đây.
    public int Status { get; set; } // xem AdmissionStatus: 0-Đang điều trị, 1-Xuất viện, 2-Chuyển viện, 3-Tử vong, 4-Bỏ về, 5-Đã chuyển khoa(nội bộ), 6-Chờ ra viện(chưa có đường ghi)

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

/// <summary>
/// Ho so tre so sinh — module 6 (#50-54)
/// Mo hinh nhe: gac vao MotherAdmissionId, khong tao admission/MRN rieng cho be.
/// Sinh doi = nhieu record cung MotherAdmissionId.
/// Status: 0=Dang theo doi, 2=Da xuat.
/// </summary>
public class NewbornRecord : BaseEntity
{
    public Guid MotherAdmissionId { get; set; }
    public virtual Admission MotherAdmission { get; set; } = null!;

    public DateTime BirthDate { get; set; }
    public TimeSpan BirthTime { get; set; }
    public int Gender { get; set; } // 1=Nam, 2=Nu

    public decimal BirthWeight { get; set; } // gram
    public decimal BirthLength { get; set; } // cm
    public decimal HeadCircumference { get; set; } // cm

    public int ApgarScore1Min { get; set; }   // 0-10
    public int ApgarScore5Min { get; set; }   // 0-10
    public int? ApgarScore10Min { get; set; } // 0-10, optional

    public string? DeliveryMethod { get; set; }
    public string? Complications { get; set; }
    public string? InitialExamFindings { get; set; }
    public string? VitaminKGiven { get; set; }
    public string? HepBVaccine { get; set; }

    // Neu sau nay cap admission rieng cho be
    public Guid? NewbornAdmissionId { get; set; }

    // Vong doi
    public int Status { get; set; } // 0=Dang theo doi, 2=Da xuat
    public DateTime? DischargeDate { get; set; }
}

/// <summary>
/// Phiếu theo dõi từng buổi chạy thận nhân tạo (hemodialysis) — #148 (F1.7).
/// Mỗi record = 1 buổi lọc máu gắn vào AdmissionId (nội trú khoa Thận nhân tạo).
/// Lưu cân nặng trước/sau, dấu hiệu sinh tồn, thông số máy lọc, biến chứng, thuốc.
/// </summary>
public class HemodialysisSession : BaseEntity
{
    public Guid AdmissionId { get; set; }
    public virtual Admission Admission { get; set; } = null!;

    public DateTime SessionDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public int SessionNumber { get; set; } // buổi thứ mấy

    // Cân nặng (kg)
    public decimal WeightPre { get; set; }
    public decimal WeightPost { get; set; }

    // Dấu hiệu sinh tồn
    public int Pulse { get; set; }                       // mạch lần/phút
    public string? BloodPressureLying { get; set; }      // HA nằm "120/80"
    public string? BloodPressureStanding { get; set; }   // HA đứng "120/80"
    public decimal Temperature { get; set; }             // độ C
    public int RespiratoryRate { get; set; }             // nhịp thở lần/phút

    // Thông số máy lọc
    public int BloodFlowRate { get; set; }               // tốc độ máu ml/phút
    public int? ArterialPressure { get; set; }           // áp lực động mạch mmHg
    public int? VenousPressure { get; set; }             // áp lực tĩnh mạch mmHg
    public decimal Tmp { get; set; }                     // PTM (áp lực xuyên màng) mmHg
    public decimal ReplacementFluid { get; set; }        // tái dịch (lít)
    public string? DialyzerType { get; set; }            // loại quả lọc

    public string? Medications { get; set; }             // thuốc (heparin...)
    public string? Complications { get; set; }           // biến chứng
    public string? Notes { get; set; }
}

/// <summary>
/// Phiếu theo dõi truyền dịch nội trú — #16 (2026-06-11): persist thật thay stub echo-fake
/// (FE modal "Truyền dịch" báo thành công nhưng trước đây không lưu gì — patient-safety).
/// </summary>
public class InfusionRecord : BaseEntity
{
    public Guid AdmissionId { get; set; }
    public virtual Admission Admission { get; set; } = null!;

    public string FluidName { get; set; } = string.Empty; // Tên dịch truyền
    public int Volume { get; set; }   // ml
    public int DropRate { get; set; } // giọt/phút

    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int? DurationMinutes { get; set; }

    public string? Route { get; set; } // Đường truyền
    public string? AdditionalMedication { get; set; } // Thuốc pha thêm

    public Guid StartedBy { get; set; }
    public Guid? CompletedBy { get; set; }

    public string? Observations { get; set; }  // Theo dõi trong truyền
    public string? Complications { get; set; } // Biến chứng/phản ứng

    public int Status { get; set; } // 0-Đang truyền, 1-Hoàn thành, 2-Ngừng
}
