namespace HIS.Core.Entities;

/// <summary>
/// Lịch hẹn khám - Appointment
/// </summary>
public class Appointment : BaseEntity
{
    public string AppointmentCode { get; set; } = string.Empty;
    public DateTime AppointmentDate { get; set; }
    public TimeSpan? AppointmentTime { get; set; }

    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    // Từ lượt khám trước
    public Guid? PreviousMedicalRecordId { get; set; }
    public virtual MedicalRecord? PreviousMedicalRecord { get; set; }

    // Khoa/Phòng/Bác sĩ hẹn
    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }
    public Guid? RoomId { get; set; }
    public virtual Room? Room { get; set; }
    public Guid? DoctorId { get; set; }
    public virtual User? Doctor { get; set; }

    public int AppointmentType { get; set; } // 1-Tái khám, 2-Khám mới, 3-Khám sức khỏe
    public string? Reason { get; set; } // Lý do hẹn
    public string? Note { get; set; }
    public string? Notes { get; set; } // Ghi chú chi tiết

    public int Status { get; set; } // 0-Chờ xác nhận, 1-Đã xác nhận, 2-Đã đến khám, 3-Không đến, 4-Hủy
    public bool IsReminderSent { get; set; } // Đã gửi nhắc
    public DateTime? ReminderSentAt { get; set; }

    // Dịch vụ đã chọn (nếu có)
    public virtual ICollection<AppointmentService> AppointmentServices { get; set; } = new List<AppointmentService>();
}

/// <summary>
/// Dịch vụ trong lịch hẹn - AppointmentService
/// </summary>
public class AppointmentService : BaseEntity
{
    public Guid AppointmentId { get; set; }
    public virtual Appointment Appointment { get; set; } = null!;

    public Guid ServiceId { get; set; }
    public virtual Service Service { get; set; } = null!;

    public int Quantity { get; set; } = 1;
    public string? Note { get; set; }
}

/// <summary>
/// Hàng đợi - Queue
/// </summary>
public class Queue : BaseEntity
{
    public DateTime QueueDate { get; set; }
    public int QueueNumber { get; set; } // Số thứ tự
    public string? QueueCode { get; set; } // Mã hàng đợi (A001, B001...)

    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public Guid? MedicalRecordId { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }

    public int QueueType { get; set; } // 1-Tiếp đón, 2-Khám bệnh, 3-CLS, 4-Thanh toán, 5-Lĩnh thuốc

    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }
    public Guid? RoomId { get; set; }
    public virtual Room? Room { get; set; }

    public int Priority { get; set; } // 0-Thường, 1-Ưu tiên, 2-Cấp cứu
    public int Status { get; set; } // 0-Chờ, 1-Đang gọi, 2-Đã vào, 3-Bỏ qua
    public DateTime? CalledAt { get; set; } // Thời gian gọi
    public DateTime? StartedAt { get; set; } // Thời gian bắt đầu
    public DateTime? CompletedAt { get; set; } // Thời gian hoàn thành

    public int CalledCount { get; set; } // Số lần gọi
    public string? Counter { get; set; } // Quầy/Bàn gọi
}

/// <summary>
/// Hợp đồng khám sức khỏe - HealthCheckContract
/// </summary>
public class HealthCheckContract : BaseEntity
{
    public string ContractCode { get; set; } = string.Empty;
    public string ContractName { get; set; } = string.Empty;
    public string? CompanyName { get; set; } // Tên công ty
    public string? CompanyAddress { get; set; } // Dia chi cong ty
    public string? CompanyPhone { get; set; } // SDT cong ty
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }
    public string? Address { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    public int TotalPatients { get; set; } // Số lượng BN
    public decimal TotalAmount { get; set; }
    public decimal DiscountRate { get; set; } // Tỷ lệ giảm giá

    public string? Note { get; set; }
    public int Status { get; set; } // 0-Chờ duyệt, 1-Đang thực hiện, 2-Hoàn thành, 3-Hủy
    public Guid? CreatedByUserId { get; set; } // Nguoi tao

    // Navigation
    public virtual User? CreatedByUser { get; set; }
    public virtual ICollection<HealthCheckPackage> Packages { get; set; } = new List<HealthCheckPackage>();
}

/// <summary>
/// Gói khám sức khỏe - HealthCheckPackage
/// </summary>
public class HealthCheckPackage : BaseEntity
{
    public Guid ContractId { get; set; }
    public virtual HealthCheckContract Contract { get; set; } = null!;

    public string PackageCode { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Gender { get; set; } // 0-Cả 2, 1-Nam, 2-Nữ
    public int? ApplicableGender { get; set; } // Alias for Gender (nullable)
    public int? MinAge { get; set; }
    public int? MaxAge { get; set; }
    public decimal PackagePrice { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public virtual ICollection<HealthCheckPackageService> PackageServices { get; set; } = new List<HealthCheckPackageService>();
}

/// <summary>
/// Dịch vụ trong gói khám - HealthCheckPackageService
/// </summary>
public class HealthCheckPackageService : BaseEntity
{
    public Guid PackageId { get; set; }
    public virtual HealthCheckPackage Package { get; set; } = null!;

    public Guid ServiceId { get; set; }
    public virtual Service Service { get; set; } = null!;

    public int Quantity { get; set; } = 1;
    public bool IsMandatory { get; set; } = true; // Bắt buộc
}
