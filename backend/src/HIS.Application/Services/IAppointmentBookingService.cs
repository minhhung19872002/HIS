namespace HIS.Application.Services;

/// <summary>
/// Dịch vụ đặt lịch khám trực tuyến (public, không cần đăng nhập)
/// </summary>
public interface IAppointmentBookingService
{
    Task<List<BookingDepartmentDto>> GetBookingDepartmentsAsync();
    Task<List<BookingDoctorDto>> GetBookingDoctorsAsync(Guid? departmentId);
    Task<BookingSlotResult> GetAvailableSlotsAsync(DateTime date, Guid? departmentId, Guid? doctorId);
    Task<BookingResultDto> BookAppointmentAsync(OnlineBookingDto dto);
    Task<List<BookingStatusDto>> LookupAppointmentsAsync(string? code, string? phone);
    Task<BookingStatusDto> CancelAppointmentAsync(string appointmentCode, CancelBookingDto dto);

    /// <summary>
    /// Người bệnh tự đổi ngày/giờ lịch hẹn (HSMT app mobile I.2 #4).
    ///
    /// Trước đây chỉ có huỷ rồi đặt lại, mà đặt lại thì đụng bộ đếm chống lạm dụng
    /// (MaxPerPhonePerDay) nên người bệnh đổi lịch hai lần trong ngày là bị chặn — xem
    /// docs/features/patient-app/00-his-api-inventory.md §11.5 GAP 20.
    /// </summary>
    Task<BookingStatusDto> RescheduleAppointmentAsync(string appointmentCode, RescheduleBookingDto dto);
    Task<List<BookingServiceDto>> GetBookingServicesAsync(Guid? departmentId);
}

// === DTOs ===

public class BookingDepartmentDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int AvailableRooms { get; set; }
    public int AvailableDoctors { get; set; }
}

public class BookingDoctorDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Title { get; set; } // BS, ThS, TS, PGS, GS
    public string? Specialty { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? PhotoUrl { get; set; }
}

public class BookingSlotResult
{
    public DateTime Date { get; set; }
    public string? DepartmentName { get; set; }
    public string? DoctorName { get; set; }
    public List<BookingTimeSlot> MorningSlots { get; set; } = new();
    public List<BookingTimeSlot> AfternoonSlots { get; set; } = new();
    public int TotalAvailable { get; set; }
}

public class BookingTimeSlot
{
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public string DisplayTime { get; set; } = string.Empty; // "08:00 - 08:30"
    public bool IsAvailable { get; set; }
    public int CurrentBookings { get; set; }
    public int MaxBookings { get; set; }
}

public class OnlineBookingDto
{
    // Thông tin bệnh nhân
    public string PatientName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? Email { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public int? Gender { get; set; } // 0-Nữ, 1-Nam
    public string? IdentityNumber { get; set; } // CCCD
    public string? Address { get; set; }

    // Thông tin hẹn
    public DateTime AppointmentDate { get; set; }
    public TimeSpan? AppointmentTime { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? DoctorId { get; set; }
    public int AppointmentType { get; set; } = 2; // 1-Tái khám, 2-Khám mới, 3-KSKD
    public string? Reason { get; set; }
    public string? Notes { get; set; }

    // Dịch vụ (nếu có)
    public List<Guid>? ServiceIds { get; set; }

    // Anti-fraud — điền bởi controller, KHÔNG nhận từ client body
    /// <summary>IP của client, lấy từ HttpContext.Connection.RemoteIpAddress tại controller (server-side). Không trust field này nếu được gửi lên từ body.</summary>
    public string? ClientIp { get; set; }

    /// <summary>
    /// Người gọi có mang danh tính đã xác thực không (điền bởi controller từ
    /// <c>User.Identity.IsAuthenticated</c>, KHÔNG nhận từ body).
    ///
    /// <para>Dùng để bỏ hạn mức đặt-lịch-theo-IP. Hạn mức đó sinh ra để chặn một kẻ vô danh nện
    /// biểu mẫu đặt lịch công khai. Nhưng app hỗ trợ người bệnh đi qua BFF, mà BFF là MỘT máy chủ:
    /// HIS nhìn thấy đúng một địa chỉ IP cho TOÀN BỘ người bệnh trong cả nước. Giữ nguyên hạn mức
    /// thì người thứ 11 đặt lịch trong ngày — và mọi người sau đó — đều bị từ chối, dù họ chẳng
    /// liên quan gì tới nhau.</para>
    ///
    /// <para>Bỏ hạn mức IP KHÔNG mở toang cửa: hạn mức theo SỐ ĐIỆN THOẠI vẫn giữ nguyên, và với
    /// người dùng app thì số điện thoại đã qua xác thực OTP — đó mới là danh tính có nghĩa. Danh
    /// sách chặn theo IP cũng giữ, vì đó là thao tác quản trị viên đặt tay.</para>
    /// </summary>
    public bool IsAuthenticatedCaller { get; set; }
}

public class BookingResultDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string AppointmentCode { get; set; } = string.Empty;
    public DateTime AppointmentDate { get; set; }
    public TimeSpan? AppointmentTime { get; set; }
    public string? DepartmentName { get; set; }
    public string? DoctorName { get; set; }
    public string? RoomName { get; set; }
    public int EstimatedWaitMinutes { get; set; }
}

public class BookingStatusDto
{
    public string AppointmentCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public DateTime AppointmentDate { get; set; }
    public TimeSpan? AppointmentTime { get; set; }
    public int AppointmentType { get; set; }
    public string AppointmentTypeName { get; set; } = string.Empty;
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public Guid? DoctorId { get; set; }
    public string? DoctorName { get; set; }
    public string? RoomName { get; set; }
    public string? Reason { get; set; }
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
}

/// <summary>Yêu cầu đổi lịch của người bệnh.</summary>
public class RescheduleBookingDto
{
    /// <summary>Xác thực chủ lịch hẹn, giống luồng huỷ.</summary>
    public string PhoneNumber { get; set; } = string.Empty;

    public DateTime NewAppointmentDate { get; set; }
    public TimeSpan? NewAppointmentTime { get; set; }

    /// <summary>Đổi luôn bác sĩ nếu người bệnh chọn người khác; bỏ trống thì giữ nguyên.</summary>
    public Guid? NewDoctorId { get; set; }

    public string? Reason { get; set; }
}

public class CancelBookingDto
{
    public string PhoneNumber { get; set; } = string.Empty; // Xác thực bằng SĐT
    public string? Reason { get; set; }
}

public class BookingServiceDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
    public decimal? Price { get; set; }
    public int? EstimatedMinutes { get; set; }
}

// === Booking Management (staff-side) ===

/// <summary>
/// Quản lý đặt lịch (nhân viên y tế - cần đăng nhập)
/// </summary>
public interface IBookingManagementService
{
    // Doctor Schedule CRUD
    Task<List<DoctorScheduleListDto>> GetDoctorSchedulesAsync(DateTime? fromDate, DateTime? toDate, Guid? departmentId, Guid? doctorId);
    Task<DoctorScheduleListDto> SaveDoctorScheduleAsync(SaveDoctorScheduleDto dto);
    Task DeleteDoctorScheduleAsync(Guid id);
    Task GenerateRecurringSchedulesAsync(Guid scheduleId, DateTime fromDate, DateTime toDate);

    // Booking management for staff
    Task<BookingManagementPagedResult> GetBookingsAsync(BookingSearchDto search);
    Task<BookingStatusDto> UpdateBookingAsync(string appointmentCode, UpdateBookingDto dto);
    Task<BookingStatusDto> ConfirmBookingAsync(string appointmentCode);
    Task<BookingStatusDto> CheckInBookingAsync(string appointmentCode);
    Task<BookingStatusDto> MarkNoShowAsync(string appointmentCode);
    Task<BookingStatsDto> GetBookingStatsAsync(DateTime? date);

    // Booking → Reception
    Task<BookingCheckinResultDto> CheckinFromBookingAsync(string appointmentCode);

    // Staff-side cancel (không cần xác thực SĐT như public cancel)
    Task<BookingStatusDto> CancelBookingAsync(string appointmentCode, string? reason);
}

/// <summary>
/// Payload hủy lịch tại quầy (nhân viên y tế — không cần SĐT xác thực).
/// </summary>
public class StaffCancelBookingDto
{
    public string? Reason { get; set; }
}

public class DoctorScheduleListDto
{
    public Guid Id { get; set; }
    public Guid DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Specialty { get; set; }
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public Guid? RoomId { get; set; }
    public string? RoomName { get; set; }
    public DateTime ScheduleDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int MaxPatients { get; set; }
    public int SlotDurationMinutes { get; set; }
    public int ScheduleType { get; set; }
    public string? Note { get; set; }
    public bool IsActive { get; set; }
    public bool IsRecurring { get; set; }
    public int DayOfWeek { get; set; }
    public int BookedCount { get; set; } // Số lịch hẹn đã đặt trong ca này
}

public class SaveDoctorScheduleDto
{
    public Guid? Id { get; set; } // null = create new
    public Guid DoctorId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid? RoomId { get; set; }
    public DateTime ScheduleDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int MaxPatients { get; set; } = 30;
    public int SlotDurationMinutes { get; set; } = 30;
    public int ScheduleType { get; set; } = 1;
    public string? Note { get; set; }
    public bool IsRecurring { get; set; }
}

/// <summary>
/// Cập nhật lịch hẹn (nhân viên y tế). Chỉ cho sửa khi chưa đến khám / chưa hủy.
/// </summary>
public class UpdateBookingDto
{
    // Thông tin bệnh nhân (cập nhật trên hồ sơ BN nếu có nhập)
    public string? PatientName { get; set; }
    public string? PhoneNumber { get; set; }

    // Thông tin hẹn
    public DateTime AppointmentDate { get; set; }
    public TimeSpan? AppointmentTime { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? DoctorId { get; set; }
    public int AppointmentType { get; set; } = 2; // 1-Tái khám, 2-Khám mới, 3-KSKD
    public string? Reason { get; set; }
}

public class BookingSearchDto
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? DoctorId { get; set; }
    public int? Status { get; set; }
    public string? Keyword { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 20;
}

public class BookingManagementPagedResult
{
    public List<BookingStatusDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

public class BookingStatsDto
{
    public int TotalBookings { get; set; }
    public int Pending { get; set; }
    public int Confirmed { get; set; }
    public int Attended { get; set; }
    public int NoShow { get; set; }
    public int Cancelled { get; set; }
    public double NoShowRate { get; set; } // %
    public List<BookingStatsByDepartment> ByDepartment { get; set; } = new();
}

public class BookingStatsByDepartment
{
    public string DepartmentName { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class BookingCheckinResultDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }
    public string? PhoneNumber { get; set; }
    public Guid? PatientId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public Guid? RoomId { get; set; }
    public string? RoomName { get; set; }
    public Guid? DoctorId { get; set; }
    public string? DoctorName { get; set; }
    public string? Reason { get; set; }
    public int? AppointmentType { get; set; }
    public int? QueueNumber { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public string? MedicalRecordCode { get; set; }
}
