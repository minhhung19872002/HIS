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
    public string? DepartmentName { get; set; }
    public string? DoctorName { get; set; }
    public string? RoomName { get; set; }
    public string? Reason { get; set; }
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
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
    Task<BookingStatusDto> ConfirmBookingAsync(string appointmentCode);
    Task<BookingStatusDto> CheckInBookingAsync(string appointmentCode);
    Task<BookingStatusDto> MarkNoShowAsync(string appointmentCode);
    Task<BookingStatsDto> GetBookingStatsAsync(DateTime? date);

    // Booking → Reception
    Task<BookingCheckinResultDto> CheckinFromBookingAsync(string appointmentCode);
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
}
