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
/// Lịch làm việc bác sĩ - DoctorSchedule
/// </summary>
public class DoctorSchedule : BaseEntity
{
    public Guid DoctorId { get; set; }
    public virtual User Doctor { get; set; } = null!;

    public Guid DepartmentId { get; set; }
    public virtual Department Department { get; set; } = null!;

    public Guid? RoomId { get; set; }
    public virtual Room? Room { get; set; }

    public DateTime ScheduleDate { get; set; } // Ngày làm việc
    public TimeSpan StartTime { get; set; } // Giờ bắt đầu
    public TimeSpan EndTime { get; set; } // Giờ kết thúc
    public int MaxPatients { get; set; } = 30; // Số BN tối đa trong ca
    public int SlotDurationMinutes { get; set; } = 30; // Thời gian mỗi slot (phút)

    public int ScheduleType { get; set; } = 1; // 1-Thường, 2-Trực, 3-Hẹn trước
    public string? Note { get; set; }
    public bool IsActive { get; set; } = true;
    public int DayOfWeek { get; set; } // 0=CN, 1=T2, ..., 6=T7 (for recurring)
    public bool IsRecurring { get; set; } // Lịch lặp hàng tuần
}

/// <summary>
/// Log mỗi lần thử đặt lịch online — dùng để đếm số lần/SĐT/IP/ngày.
/// CreatedAt lưu UTC (datetime2) — query theo VnTime.DayRangeUtc.
/// </summary>
public class BookingAttemptLog : BaseEntity
{
    /// <summary>Số điện thoại người đặt (plaintext, không encrypt — chỉ dùng để đếm).</summary>
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>IP client (IPv4 hoặc IPv6). Nullable khi không lấy được.</summary>
    public string? IpAddress { get; set; }

    /// <summary>true = đặt thành công, false = bị chặn/lỗi.</summary>
    public bool IsSuccessful { get; set; }

    /// <summary>Mã lịch hẹn được tạo (chỉ có khi IsSuccessful = true).</summary>
    public string? AppointmentCode { get; set; }

    /// <summary>Lý do bị chặn nếu IsSuccessful = false.</summary>
    public string? BlockReason { get; set; }
}

/// <summary>
/// Blacklist SĐT hoặc IP — chặn vĩnh viễn hoặc có thời hạn.
/// </summary>
public class BookingBlacklist : BaseEntity
{
    /// <summary>Loại: "Phone" hoặc "IP".</summary>
    public string BlacklistType { get; set; } = string.Empty;

    /// <summary>Giá trị bị blacklist (số điện thoại hoặc IP address).</summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>Lý do thêm vào blacklist.</summary>
    public string? Reason { get; set; }

    /// <summary>null = vĩnh viễn; có giá trị = hết hạn sau ngày này (UTC).</summary>
    public DateTime? ExpiresAtUtc { get; set; }

    /// <summary>Người thêm blacklist (username hoặc "system").</summary>
    public string? AddedBy { get; set; }
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
