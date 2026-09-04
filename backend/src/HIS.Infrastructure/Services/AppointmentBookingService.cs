using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Security;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Dịch vụ đặt lịch khám trực tuyến (public)
/// </summary>
public class AppointmentBookingService : IAppointmentBookingService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEmailService _emailService;
    private readonly ISmsService _smsService;

    // === Anti-fraud defaults (override bằng SystemConfig) ===
    // ConfigKey: "Booking.OnlyExistingPatient"  → "true"/"false"  (mặc định false)
    // ConfigKey: "Booking.MaxPerPhonePerDay"     → số nguyên       (mặc định 3)
    // ConfigKey: "Booking.MaxPerIpPerDay"        → số nguyên       (mặc định 10)
    private const bool DefaultOnlyExistingPatient = false;
    private const int DefaultMaxPerPhonePerDay = 3;
    private const int DefaultMaxPerIpPerDay = 10;

    public AppointmentBookingService(HISDbContext context, IUnitOfWork unitOfWork, IEmailService emailService, ISmsService smsService)
    {
        _context = context;
        _unitOfWork = unitOfWork;
        _emailService = emailService;
        _smsService = smsService;
    }

    public async Task<List<BookingDepartmentDto>> GetBookingDepartmentsAsync()
    {
        var departments = await _context.Departments
            .Where(d => !d.IsDeleted && d.IsActive && d.DepartmentType == 1) // Type 1 = Khoa khám bệnh
            .OrderBy(d => d.DisplayOrder)
            .ThenBy(d => d.DepartmentName)
            .Select(d => new BookingDepartmentDto
            {
                Id = d.Id,
                Code = d.DepartmentCode,
                Name = d.DepartmentName,
                Description = d.Description,
                AvailableRooms = _context.Rooms.Count(r => !r.IsDeleted && r.IsActive && r.DepartmentId == d.Id),
                AvailableDoctors = _context.Users.Count(u => !u.IsDeleted && u.IsActive && u.DepartmentId == d.Id && u.UserType == 2) // Type 2 = Bác sĩ
            })
            .ToBoundedListAsync("AppointmentBookingService.GetBookingDepartmentsAsync");

        return departments;
    }

    public async Task<List<BookingDoctorDto>> GetBookingDoctorsAsync(Guid? departmentId)
    {
        var query = _context.Users
            .Where(u => !u.IsDeleted && u.IsActive && u.UserType == 2); // Bác sĩ

        if (departmentId.HasValue)
            query = query.Where(u => u.DepartmentId == departmentId.Value);

        var doctors = await query
            .Include(u => u.Department)
            .OrderBy(u => u.FullName)
            .Select(u => new BookingDoctorDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Title = u.Title,
                Specialty = u.Specialty,
                DepartmentId = u.DepartmentId,
                DepartmentName = u.Department != null ? u.Department.DepartmentName : null,
                PhotoUrl = null // User entity không có PhotoUrl
            })
            .ToBoundedListAsync("AppointmentBookingService.GetBookingDoctorsAsync");

        return doctors;
    }

    public async Task<BookingSlotResult> GetAvailableSlotsAsync(DateTime date, Guid? departmentId, Guid? doctorId)
    {
        // Khung giờ làm việc: Sáng 7:30-11:30, Chiều 13:30-16:30
        var morningStart = new TimeSpan(7, 30, 0);
        var morningEnd = new TimeSpan(11, 30, 0);
        var afternoonStart = new TimeSpan(13, 30, 0);
        var afternoonEnd = new TimeSpan(16, 30, 0);
        var slotDuration = TimeSpan.FromMinutes(30);
        var maxBookingsPerSlot = 5; // Tối đa 5 BN mỗi khung giờ

        // Đếm số lịch hẹn hiện có trong ngày
        var existingBookings = await _context.Appointments
            .Where(a => !a.IsDeleted && a.AppointmentDate.Date == date.Date && a.Status < 3) // Chưa hủy/không đến
            .Where(a => !departmentId.HasValue || a.DepartmentId == departmentId)
            .Where(a => !doctorId.HasValue || a.DoctorId == doctorId)
            .GroupBy(a => a.AppointmentTime)
            .Select(g => new { Time = g.Key, Count = g.Count() })
            .ToListAsync();

        var bookingMap = existingBookings.ToDictionary(
            b => b.Time ?? TimeSpan.Zero,
            b => b.Count);

        var morningSlots = GenerateSlots(morningStart, morningEnd, slotDuration, maxBookingsPerSlot, bookingMap, date);
        var afternoonSlots = GenerateSlots(afternoonStart, afternoonEnd, slotDuration, maxBookingsPerSlot, bookingMap, date);

        string? deptName = null;
        string? docName = null;
        if (departmentId.HasValue)
            deptName = await _context.Departments.Where(d => d.Id == departmentId).Select(d => d.DepartmentName).FirstOrDefaultAsync();
        if (doctorId.HasValue)
            docName = await _context.Users.Where(u => u.Id == doctorId).Select(u => u.FullName).FirstOrDefaultAsync();

        return new BookingSlotResult
        {
            Date = date,
            DepartmentName = deptName,
            DoctorName = docName,
            MorningSlots = morningSlots,
            AfternoonSlots = afternoonSlots,
            TotalAvailable = morningSlots.Count(s => s.IsAvailable) + afternoonSlots.Count(s => s.IsAvailable)
        };
    }

    public async Task<BookingResultDto> BookAppointmentAsync(OnlineBookingDto dto)
    {
        // Validate cơ bản
        if (string.IsNullOrWhiteSpace(dto.PatientName))
            return new BookingResultDto { Success = false, Message = "Vui lòng nhập họ tên" };
        if (string.IsNullOrWhiteSpace(dto.PhoneNumber))
            return new BookingResultDto { Success = false, Message = "Vui lòng nhập số điện thoại" };
        if (dto.AppointmentDate.Date < DateTime.Today)
            return new BookingResultDto { Success = false, Message = "Ngày hẹn không hợp lệ" };

        var phone = dto.PhoneNumber.Trim();
        var ip = dto.ClientIp?.Trim();

        // === Anti-fraud: đọc cấu hình từ SystemConfig (fallback default) ===
        var configs = await _context.SystemConfigs.AsNoTracking()
            .Where(c => c.IsActive && !c.IsDeleted
                && (c.ConfigKey == "Booking.OnlyExistingPatient"
                    || c.ConfigKey == "Booking.MaxPerPhonePerDay"
                    || c.ConfigKey == "Booking.MaxPerIpPerDay"))
            .ToListAsync();

        bool onlyExisting = DefaultOnlyExistingPatient;
        int maxPerPhone = DefaultMaxPerPhonePerDay;
        int maxPerIp = DefaultMaxPerIpPerDay;

        var cfgOnlyExisting = configs.FirstOrDefault(c => c.ConfigKey == "Booking.OnlyExistingPatient");
        if (cfgOnlyExisting != null)
            onlyExisting = string.Equals(cfgOnlyExisting.ConfigValue, "true", StringComparison.OrdinalIgnoreCase);

        var cfgPhone = configs.FirstOrDefault(c => c.ConfigKey == "Booking.MaxPerPhonePerDay");
        if (cfgPhone != null && int.TryParse(cfgPhone.ConfigValue, out var parsedPhone) && parsedPhone > 0)
            maxPerPhone = parsedPhone;

        var cfgIp = configs.FirstOrDefault(c => c.ConfigKey == "Booking.MaxPerIpPerDay");
        if (cfgIp != null && int.TryParse(cfgIp.ConfigValue, out var parsedIp) && parsedIp > 0)
            maxPerIp = parsedIp;

        // === Anti-fraud: check blacklist SĐT ===
        var nowUtc = DateTime.UtcNow;
        var phoneBlacklisted = await _context.Set<BookingBlacklist>()
            .AnyAsync(b => !b.IsDeleted
                && b.BlacklistType == "Phone"
                && b.Value == phone
                && (b.ExpiresAtUtc == null || b.ExpiresAtUtc > nowUtc));
        if (phoneBlacklisted)
        {
            await LogAttemptAsync(phone, ip, false, null, "Blacklisted phone");
            return new BookingResultDto { Success = false, Message = "Số điện thoại này không được phép đặt lịch. Vui lòng liên hệ bệnh viện." };
        }

        // === Anti-fraud: check blacklist IP ===
        if (!string.IsNullOrEmpty(ip))
        {
            var ipBlacklisted = await _context.Set<BookingBlacklist>()
                .AnyAsync(b => !b.IsDeleted
                    && b.BlacklistType == "IP"
                    && b.Value == ip
                    && (b.ExpiresAtUtc == null || b.ExpiresAtUtc > nowUtc));
            if (ipBlacklisted)
            {
                await LogAttemptAsync(phone, ip, false, null, "Blacklisted IP");
                return new BookingResultDto { Success = false, Message = "Yêu cầu không hợp lệ. Vui lòng thử lại sau hoặc liên hệ bệnh viện." };
            }
        }

        // === Anti-fraud: đếm số lần đặt hôm nay theo SĐT (dùng VnTime.DayRangeUtc — tránh bug ca đêm) ===
        var (dayStart, dayEnd) = VnTime.DayRangeUtc(VnTime.TodayVn);
        var phoneAttemptsToday = await _context.Set<BookingAttemptLog>()
            .CountAsync(l => !l.IsDeleted
                && l.PhoneNumber == phone
                && l.IsSuccessful
                && l.CreatedAt >= dayStart && l.CreatedAt < dayEnd);
        if (phoneAttemptsToday >= maxPerPhone)
        {
            await LogAttemptAsync(phone, ip, false, null, $"Phone limit {maxPerPhone}/day exceeded");
            return new BookingResultDto { Success = false, Message = $"Số điện thoại này đã đặt lịch {maxPerPhone} lần trong hôm nay. Vui lòng liên hệ trực tiếp bệnh viện." };
        }

        // === Anti-fraud: đếm số lần đặt hôm nay theo IP ===
        if (!string.IsNullOrEmpty(ip))
        {
            var ipAttemptsToday = await _context.Set<BookingAttemptLog>()
                .CountAsync(l => !l.IsDeleted
                    && l.IpAddress == ip
                    && l.IsSuccessful
                    && l.CreatedAt >= dayStart && l.CreatedAt < dayEnd);
            if (ipAttemptsToday >= maxPerIp)
            {
                await LogAttemptAsync(phone, ip, false, null, $"IP limit {maxPerIp}/day exceeded");
                return new BookingResultDto { Success = false, Message = "Quá nhiều yêu cầu từ địa chỉ này. Vui lòng thử lại sau." };
            }
        }

        // Kiểm tra trùng lịch hẹn (cùng SĐT, cùng ngày)
        var existingPatient = await _context.Patients
            .Where(p => !p.IsDeleted)
            .FindByPhoneNumberDecryptedAsync(phone);

        if (existingPatient != null)
        {
            var duplicate = await _context.Appointments
                .AnyAsync(a => !a.IsDeleted
                    && a.PatientId == existingPatient.Id
                    && a.AppointmentDate.Date == dto.AppointmentDate.Date
                    && a.Status < 3);
            if (duplicate)
                return new BookingResultDto { Success = false, Message = "Bạn đã có lịch hẹn trong ngày này" };
        }

        // === Anti-fraud: rule chỉ cho phép BN đã có hồ sơ (nếu bật) ===
        if (onlyExisting && existingPatient == null)
        {
            await LogAttemptAsync(phone, ip, false, null, "OnlyExistingPatient: new patient blocked");
            return new BookingResultDto { Success = false, Message = "Hệ thống chỉ nhận đặt lịch online cho bệnh nhân đã có hồ sơ. Vui lòng đến trực tiếp bệnh viện để đăng ký lần đầu." };
        }

        // Tìm hoặc tạo bệnh nhân
        var patient = existingPatient ?? new Patient
        {
            Id = Guid.NewGuid(),
            PatientCode = $"BN{DateTime.Now:yyyyMMddHHmmss}{new Random().Next(100, 999)}",
            FullName = dto.PatientName.Trim(),
            PhoneNumber = dto.PhoneNumber.Trim(),
            Email = dto.Email?.Trim(),
            DateOfBirth = dto.DateOfBirth,
            Gender = dto.Gender ?? 1,
            IdentityNumber = dto.IdentityNumber?.Trim(),
            Address = dto.Address?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        if (existingPatient == null)
            await _context.Patients.AddAsync(patient);

        // Tìm phòng trống
        Guid? roomId = null;
        string? roomName = null;
        if (dto.DepartmentId.HasValue)
        {
            var room = await _context.Rooms
                .Where(r => !r.IsDeleted && r.IsActive && r.DepartmentId == dto.DepartmentId)
                .OrderBy(r => r.DisplayOrder)
                .FirstOrDefaultAsync();
            if (room != null)
            {
                roomId = room.Id;
                roomName = room.RoomName;
            }
        }

        // Tạo mã lịch hẹn
        var code = $"DK{DateTime.Now:yyyyMMdd}{new Random().Next(1000, 9999)}";

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            AppointmentCode = code,
            PatientId = patient.Id,
            AppointmentDate = dto.AppointmentDate.Date,
            AppointmentTime = dto.AppointmentTime,
            DepartmentId = dto.DepartmentId,
            RoomId = roomId,
            DoctorId = dto.DoctorId,
            AppointmentType = dto.AppointmentType,
            Reason = dto.Reason?.Trim(),
            Notes = dto.Notes?.Trim(),
            Status = 0, // Chờ xác nhận
            CreatedAt = DateTime.UtcNow
        };

        await _context.Appointments.AddAsync(appointment);

        // Thêm dịch vụ nếu có
        if (dto.ServiceIds?.Any() == true)
        {
            foreach (var serviceId in dto.ServiceIds)
            {
                await _context.Set<AppointmentService>().AddAsync(new AppointmentService
                {
                    Id = Guid.NewGuid(),
                    AppointmentId = appointment.Id,
                    ServiceId = serviceId,
                    Quantity = 1,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        // Anti-fraud: log lần đặt thành công (TRƯỚC SaveChanges để cùng transaction)
        await _context.Set<BookingAttemptLog>().AddAsync(new BookingAttemptLog
        {
            Id = Guid.NewGuid(),
            PhoneNumber = phone,
            IpAddress = ip,
            IsSuccessful = true,
            AppointmentCode = code,
            CreatedAt = DateTime.UtcNow
        });

        await _unitOfWork.SaveChangesAsync();

        // Lấy tên khoa/bác sĩ
        string? deptName = null, docName = null;
        if (dto.DepartmentId.HasValue)
            deptName = await _context.Departments.Where(d => d.Id == dto.DepartmentId).Select(d => d.DepartmentName).FirstOrDefaultAsync();
        if (dto.DoctorId.HasValue)
            docName = await _context.Users.Where(u => u.Id == dto.DoctorId).Select(u => u.FullName).FirstOrDefaultAsync();

        // Gửi email xác nhận (fire-and-forget)
        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            _ = _emailService.SendBookingConfirmationAsync(
                dto.Email.Trim(), dto.PatientName.Trim(), code,
                appointment.AppointmentDate, appointment.AppointmentTime,
                deptName, docName, roomName);
        }

        // Gửi SMS xác nhận (fire-and-forget)
        _ = _smsService.SendBookingConfirmationSmsAsync(
            dto.PhoneNumber.Trim(), dto.PatientName.Trim(), code,
            appointment.AppointmentDate, appointment.AppointmentTime, deptName);

        return new BookingResultDto
        {
            Success = true,
            Message = "Đặt lịch thành công! Vui lòng lưu mã hẹn để tra cứu.",
            AppointmentCode = code,
            AppointmentDate = appointment.AppointmentDate,
            AppointmentTime = appointment.AppointmentTime,
            DepartmentName = deptName,
            DoctorName = docName,
            RoomName = roomName,
            EstimatedWaitMinutes = 15
        };
    }

    public async Task<List<BookingStatusDto>> LookupAppointmentsAsync(string? code, string? phone)
    {
        var query = _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .Include(a => a.Doctor)
            .Include(a => a.Room)
            .Where(a => !a.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(code))
            query = query.Where(a => a.AppointmentCode == code.Trim());
        else if (string.IsNullOrWhiteSpace(phone))
            return new List<BookingStatusDto>();

        var appointments = await query
            .OrderByDescending(a => a.AppointmentDate)
            .ToListAsync();

        if (string.IsNullOrWhiteSpace(code))
        {
            var expectedPhone = phone!.Trim();
            appointments = appointments
                .Where(a => string.Equals(a.Patient?.PhoneNumber?.Trim(), expectedPhone,
                    StringComparison.OrdinalIgnoreCase))
                .Take(20)
                .ToList();
        }
        else
        {
            appointments = appointments.Take(20).ToList();
        }

        return appointments.Select(a => MapToBookingStatus(a)).ToList();
    }

    public async Task<BookingStatusDto> CancelAppointmentAsync(string appointmentCode, CancelBookingDto dto)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .Include(a => a.Doctor)
            .Include(a => a.Room)
            .FirstOrDefaultAsync(a => !a.IsDeleted && a.AppointmentCode == appointmentCode);

        if (appointment == null)
            throw new KeyNotFoundException("Không tìm thấy lịch hẹn");

        // Xác thực bằng SĐT
        if (appointment.Patient.PhoneNumber != dto.PhoneNumber?.Trim())
            throw new InvalidOperationException("Số điện thoại không khớp");

        if (appointment.Status >= 2)
            throw new InvalidOperationException("Không thể hủy lịch hẹn đã hoàn thành");

        appointment.Status = 4; // Hủy
        appointment.Notes = string.IsNullOrEmpty(appointment.Notes)
            ? $"Hủy: {dto.Reason}"
            : $"{appointment.Notes}\nHủy: {dto.Reason}";
        appointment.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        // Gửi email thông báo hủy (fire-and-forget)
        if (!string.IsNullOrWhiteSpace(appointment.Patient?.Email))
        {
            _ = _emailService.SendBookingCancellationAsync(
                appointment.Patient.Email, appointment.Patient.FullName,
                appointment.AppointmentCode, appointment.AppointmentDate);
        }

        return MapToBookingStatus(appointment);
    }

    public async Task<List<BookingServiceDto>> GetBookingServicesAsync(Guid? departmentId)
    {
        var query = _context.Services
            .Include(s => s.ServiceGroup)
            .Where(s => !s.IsDeleted && s.IsActive && s.ServiceType == 1); // Type 1 = Khám

        if (departmentId.HasValue)
        {
            // Lọc theo nhóm dịch vụ thuộc khoa
            var roomIds = await _context.Rooms
                .Where(r => !r.IsDeleted && r.DepartmentId == departmentId)
                .Select(r => r.Id)
                .ToListAsync();
            // Trả về tất cả dịch vụ khám nếu khoa có phòng
            if (!roomIds.Any())
                return new List<BookingServiceDto>();
        }

        var services = await query
            .OrderBy(s => s.ServiceName)
            .Take(100)
            .Select(s => new BookingServiceDto
            {
                Id = s.Id,
                Code = s.ServiceCode,
                Name = s.ServiceName,
                Category = s.ServiceGroup != null ? s.ServiceGroup.GroupName : null,
                Price = s.UnitPrice,
                EstimatedMinutes = s.EstimatedMinutes
            })
            .ToListAsync();

        return services;
    }

    // === Helpers ===

    private static List<BookingTimeSlot> GenerateSlots(
        TimeSpan start, TimeSpan end, TimeSpan duration, int maxPerSlot,
        Dictionary<TimeSpan, int> bookingMap, DateTime date)
    {
        var slots = new List<BookingTimeSlot>();
        var current = start;
        var now = DateTime.Now;

        while (current + duration <= end)
        {
            var slotEnd = current + duration;
            var currentBookings = bookingMap.GetValueOrDefault(current, 0);
            var isPast = date.Date == DateTime.Today && current < now.TimeOfDay;

            slots.Add(new BookingTimeSlot
            {
                StartTime = current,
                EndTime = slotEnd,
                DisplayTime = $"{current:hh\\:mm} - {slotEnd:hh\\:mm}",
                IsAvailable = !isPast && currentBookings < maxPerSlot,
                CurrentBookings = currentBookings,
                MaxBookings = maxPerSlot
            });

            current = slotEnd;
        }

        return slots;
    }

    private static BookingStatusDto MapToBookingStatus(Appointment a)
    {
        var typeNames = new Dictionary<int, string>
        {
            { 1, "Tái khám" }, { 2, "Khám mới" }, { 3, "Khám sức khỏe" }
        };
        var statusNames = new Dictionary<int, string>
        {
            { 0, "Chờ xác nhận" }, { 1, "Đã xác nhận" }, { 2, "Đã đến khám" },
            { 3, "Không đến" }, { 4, "Đã hủy" }
        };

        return new BookingStatusDto
        {
            AppointmentCode = a.AppointmentCode,
            PatientName = a.Patient?.FullName ?? "",
            PhoneNumber = a.Patient?.PhoneNumber,
            AppointmentDate = a.AppointmentDate,
            AppointmentTime = a.AppointmentTime,
            AppointmentType = a.AppointmentType,
            AppointmentTypeName = typeNames.GetValueOrDefault(a.AppointmentType, "Khác"),
            DepartmentId = a.DepartmentId,
            DepartmentName = a.Department?.DepartmentName,
            DoctorId = a.DoctorId,
            DoctorName = a.Doctor?.FullName,
            RoomName = a.Room?.RoomName,
            Reason = a.Reason,
            Status = a.Status,
            StatusName = statusNames.GetValueOrDefault(a.Status, "Không xác định")
        };
    }

    /// <summary>
    /// Ghi log thử đặt lịch bị chặn (không qua SaveChanges vì nên ghi ngay cả khi main transaction rollback).
    /// Dùng SaveChangesAsync riêng để đảm bảo log được ghi dù main save thất bại.
    /// </summary>
    private async Task LogAttemptAsync(string phone, string? ip, bool success, string? appointmentCode, string? blockReason)
    {
        try
        {
            _context.Set<BookingAttemptLog>().Add(new BookingAttemptLog
            {
                Id = Guid.NewGuid(),
                PhoneNumber = phone,
                IpAddress = ip,
                IsSuccessful = success,
                AppointmentCode = appointmentCode,
                BlockReason = blockReason,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }
        catch
        {
            // Log thất bại không được phép block luồng chính
        }
    }
}
