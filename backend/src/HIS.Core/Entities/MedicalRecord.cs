namespace HIS.Core.Entities;

/// <summary>
/// Hồ sơ bệnh án - MedicalRecord
/// </summary>
public class MedicalRecord : BaseEntity
{
    public string MedicalRecordCode { get; set; } = string.Empty; // Số hồ sơ
    public string? InpatientCode { get; set; } // Số vào viện (nội trú)
    public string? ArchiveCode { get; set; } // Số lưu trữ

    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    // Thông tin đăng ký
    public DateTime AdmissionDate { get; set; } // Ngày vào viện
    public DateTime? DischargeDate { get; set; } // Ngày ra viện
    public int PatientType { get; set; } // 1-BHYT, 2-Viện phí, 3-Dịch vụ, 4-Khám sức khỏe
    public int TreatmentType { get; set; } // 1-Ngoại trú, 2-Nội trú, 3-Cấp cứu

    // BHYT
    public string? InsuranceNumber { get; set; }
    public DateTime? InsuranceExpireDate { get; set; }
    public string? InsuranceFacilityCode { get; set; }
    public int InsuranceRightRoute { get; set; } // 1-Đúng tuyến, 2-Trái tuyến, 3-Thông tuyến

    // Chẩn đoán
    public string? InitialDiagnosis { get; set; } // Chẩn đoán ban đầu
    public string? MainDiagnosis { get; set; } // Chẩn đoán chính
    public string? MainIcdCode { get; set; } // Mã ICD chính
    public string? SubDiagnosis { get; set; } // Chẩn đoán phụ
    public string? SubIcdCodes { get; set; } // Mã ICD phụ (JSON)
    public string? ExternalCause { get; set; } // Nguyên nhân ngoài

    // Kết quả điều trị
    public int? TreatmentResult { get; set; } // 1-Khỏi, 2-Đỡ, 3-Không thay đổi, 4-Nặng hơn, 5-Tử vong
    public int? DischargeType { get; set; } // 1-Ra viện, 2-Chuyển viện, 3-Trốn viện, 4-Xin về, 5-Tử vong
    public string? DischargeNote { get; set; }

    // Khoa/Phòng
    public Guid? DepartmentId { get; set; } // Khoa điều trị
    public virtual Department? Department { get; set; }
    public Guid? RoomId { get; set; } // Phòng/Giường
    public virtual Room? Room { get; set; }
    public Guid? BedId { get; set; }
    public virtual Bed? Bed { get; set; }

    // Bác sĩ
    public Guid? DoctorId { get; set; } // Bác sĩ điều trị
    public virtual User? Doctor { get; set; }

    // Trạng thái
    public int Status { get; set; } // 0-Chờ khám, 1-Đang khám, 2-Chờ kết luận, 3-Hoàn thành, 4-Đã thanh toán
    public bool IsClosed { get; set; } // Đã đóng bệnh án

    // Navigation
    public virtual ICollection<Examination> Examinations { get; set; } = new List<Examination>();
    public virtual ICollection<ServiceRequest> ServiceRequests { get; set; } = new List<ServiceRequest>();
    public virtual ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();
}

/// <summary>
/// Lượt khám - Examination
/// </summary>
public class Examination : BaseEntity
{
    public Guid MedicalRecordId { get; set; }
    public virtual MedicalRecord MedicalRecord { get; set; } = null!;

    public int ExaminationType { get; set; } // 1-Khám chính, 2-Khám thêm, 3-Khám kết hợp
    public int QueueNumber { get; set; } // Số thứ tự
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }

    // Khoa/Phòng khám
    public Guid DepartmentId { get; set; }
    public virtual Department Department { get; set; } = null!;
    public Guid RoomId { get; set; }
    public virtual Room Room { get; set; } = null!;

    // Bác sĩ
    public Guid? DoctorId { get; set; }
    public virtual User? Doctor { get; set; }

    // Hỏi bệnh - Khám
    public string? ChiefComplaint { get; set; } // Lý do khám
    public string? PresentIllness { get; set; } // Bệnh sử
    public string? PhysicalExamination { get; set; } // Khám toàn thân
    public string? SystemsReview { get; set; } // Khám bộ phận

    // Dấu hiệu sinh tồn
    public decimal? Temperature { get; set; } // Nhiệt độ
    public int? Pulse { get; set; } // Mạch
    public int? BloodPressureSystolic { get; set; } // Huyết áp tâm thu
    public int? BloodPressureDiastolic { get; set; } // Huyết áp tâm trương
    public int? RespiratoryRate { get; set; } // Nhịp thở
    public decimal? Height { get; set; } // Chiều cao (cm)
    public decimal? Weight { get; set; } // Cân nặng (kg)
    public decimal? SpO2 { get; set; } // SpO2
    public decimal? BMI { get; set; }

    // Chẩn đoán
    public string? InitialDiagnosis { get; set; }
    public string? MainDiagnosis { get; set; }
    public string? MainIcdCode { get; set; }
    public string? SubDiagnosis { get; set; }
    public string? SubIcdCodes { get; set; }

    // Kết luận
    public int? ConclusionType { get; set; } // 1-Cho về, 2-Kê đơn, 3-Nhập viện, 4-Chuyển viện, 5-Hẹn khám, 6-Tử vong
    public string? ConclusionNote { get; set; }
    public DateTime? FollowUpDate { get; set; } // Ngày hẹn tái khám
    public string? TreatmentPlan { get; set; } // Phương hướng điều trị

    public int Status { get; set; } // 0-Chờ khám, 1-Đang khám, 2-Chờ CLS, 3-Chờ kết luận, 4-Hoàn thành
}
