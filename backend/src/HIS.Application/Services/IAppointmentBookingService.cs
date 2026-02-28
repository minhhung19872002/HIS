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
