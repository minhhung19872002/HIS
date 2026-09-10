using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Security;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Constants;
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

    public async Task<List<BookingDepartmentDto>> GetBookingDepartmentsAsync(DateTime? date = null)
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
                // Mặc định đếm theo khoa CƠ HỮU; có `date` thì đếm lại theo ca trực bên dưới.
                AvailableDoctors = _context.Users.Count(u => !u.IsDeleted && u.IsActive && u.DepartmentId == d.Id && u.UserType == UserTypes.Doctor)
            })
            .ToBoundedListAsync("AppointmentBookingService.GetBookingDepartmentsAsync");

        if (date.HasValue)
            await ApplyScheduledDoctorCountsAsync(departments, date.Value);

        return departments;
    }

    /// <summary>
    /// Đếm lại <c>AvailableDoctors</c> theo CA TRỰC của ngày, dùng ĐÚNG quy tắc của
    /// <see cref="GetScheduledDoctorIdsAsync"/> (ca đúng ngày → ca lặp theo thứ → rơi về khoa cơ
    /// hữu). Không dùng chung quy tắc thì con số "(N BS)" trên thẻ khoa sẽ lệch với chính dropdown
    /// chọn bác sĩ — người dùng thấy "1 BS" rồi mở ra lại là một người khác.
    ///
    /// Gộp 2 truy vấn cho TẤT CẢ khoa (không lặp từng khoa) để không thành N+1.
    /// </summary>
    private async Task ApplyScheduledDoctorCountsAsync(List<BookingDepartmentDto> departments, DateTime date)
    {
        if (departments.Count == 0) return;

        var day = date.Date;
        var dayOfWeek = (int)day.DayOfWeek;
        var deptIds = departments.Select(d => d.Id).ToList();

        var shifts = await ActiveDoctorShifts()
            .Where(s => deptIds.Contains(s.DepartmentId))
            .Where(s => s.ScheduleDate.Date == day || (s.IsRecurring && s.DayOfWeek == dayOfWeek))
            .Select(s => new { s.DepartmentId, s.DoctorId, s.ScheduleDate, s.IsRecurring })
            .ToListAsync();

        foreach (var dept in departments)
        {
            var exact = shifts.Where(s => s.DepartmentId == dept.Id && s.ScheduleDate.Date == day)
                .Select(s => s.DoctorId).Distinct().Count();
            var count = exact > 0
                ? exact
                : shifts.Where(s => s.DepartmentId == dept.Id && s.IsRecurring)
                    .Select(s => s.DoctorId).Distinct().Count();

            // Không có BÁC SĨ HỢP LỆ nào trực ngày đó → GIỮ số bác sĩ cơ hữu (fallback y như dropdown).
            if (count > 0)
                dept.AvailableDoctors = count;
        }
    }

    public async Task<List<BookingDoctorDto>> GetBookingDoctorsAsync(Guid? departmentId, DateTime? date = null)
    {
        var query = _context.Users
            .Where(u => !u.IsDeleted && u.IsActive && u.UserType == UserTypes.Doctor);

        if (departmentId.HasValue)
        {
            // Có NGÀY HẸN → ưu tiên bác sĩ CÓ CA TRỰC ở khoa đó đúng hôm ấy, kể cả bác sĩ khoa
            // khác được phân trực sang. Trước đây chỉ lọc theo khoa cơ hữu (Users.DepartmentId)
            // nên màn "Lịch bác sĩ" hoàn toàn KHÔNG ảnh hưởng dropdown: hệ thống vẫn mở khung giờ
            // sinh ra từ ca trực của bác sĩ đó (GetWorkingShiftsAsync đọc DoctorSchedules) nhưng
            // lại không cho chọn chính người ấy.
            var scheduledIds = date.HasValue
                ? await GetScheduledDoctorIdsAsync(departmentId.Value, date.Value)
                : new List<Guid>();

            // Khoa CHƯA khai ca nào cho ngày đó → rơi về bác sĩ cơ hữu. Cùng triết lý fallback với
            // GetWorkingShiftsAsync: thà cho đặt rồi lễ tân xác nhận, còn hơn dropdown rỗng ở khoa
            // chưa kịp khai lịch (toàn hệ thống hiện mới có rất ít bản ghi lịch làm việc).
            query = scheduledIds.Count > 0
                ? query.Where(u => scheduledIds.Contains(u.Id))
                : query.Where(u => u.DepartmentId == departmentId.Value);
        }

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

    /// <summary>
    /// Ca trực chỉ tính khi người được phân THỰC SỰ là bác sĩ đang hoạt động.
    ///
    /// ⚠️ Bỏ điều kiện này là hỏng thật: DB đang có lịch lặp của Khoa Ngoại phân cho một ĐIỀU
    /// DƯỠNG (rác sinh ra từ thời dropdown "bác sĩ" còn lọc nhầm UserType == 2). Nếu chỉ xét "có
    /// bản ghi lịch hay không" thì khoa đó coi như ĐÃ khai ca → không fallback → lọc ra 0 bác sĩ
    /// → dropdown RỖNG 5/7 ngày trong tuần. Phải xét "có BÁC SĨ HỢP LỆ trực hay không".
    /// </summary>
    private IQueryable<DoctorSchedule> ActiveDoctorShifts() =>
        _context.DoctorSchedules.Where(s => !s.IsDeleted && s.IsActive
            && _context.Users.Any(u => u.Id == s.DoctorId
                && !u.IsDeleted && u.IsActive && u.UserType == UserTypes.Doctor));

    /// <summary>
    /// Id bác sĩ có ca trực ở khoa <paramref name="departmentId"/> vào <paramref name="date"/>.
    /// Ưu tiên ca đúng ngày; không có thì lấy ca lặp hàng tuần khớp thứ — khớp đúng thứ tự mà
    /// <see cref="GetWorkingShiftsAsync"/> dùng để dựng khung giờ, để danh sách bác sĩ và khung
    /// giờ luôn nói cùng một chuyện. Rỗng = khoa chưa khai ca nào cho ngày đó.
    /// </summary>
    private async Task<List<Guid>> GetScheduledDoctorIdsAsync(Guid departmentId, DateTime date)
    {
        var day = date.Date;
        var dayOfWeek = (int)day.DayOfWeek;

        var query = ActiveDoctorShifts().Where(s => s.DepartmentId == departmentId);

        var ids = await query
            .Where(s => s.ScheduleDate.Date == day)
            .Select(s => s.DoctorId).Distinct().ToListAsync();

        if (ids.Count == 0)
        {
            ids = await query
                .Where(s => s.IsRecurring && s.DayOfWeek == dayOfWeek)
                .Select(s => s.DoctorId).Distinct().ToListAsync();
        }

        return ids;
    }

    /// <summary>
    /// Khung giờ dự phòng khi khoa/bác sĩ CHƯA có lịch trực trong <c>DoctorSchedules</c>.
    /// Sáng 7:30-11:30, chiều 13:30-16:30, mỗi slot 30 phút, tối đa 5 người.
    /// </summary>
    private static readonly (TimeSpan Start, TimeSpan End)[] FallbackShifts =
    {
        (new TimeSpan(7, 30, 0), new TimeSpan(11, 30, 0)),
        (new TimeSpan(13, 30, 0), new TimeSpan(16, 30, 0)),
    };
    private const int FallbackSlotMinutes = 30;
    private const int FallbackMaxPerSlot = 5;

    public async Task<BookingSlotResult> GetAvailableSlotsAsync(DateTime date, Guid? departmentId, Guid? doctorId)
    {
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

        // Lịch trực THẬT của bác sĩ trong ngày. Trước đây hàm này dùng khung giờ cứng 7:30-11:30 /
        // 13:30-16:30 với hạn 5 người cho MỌI bác sĩ, nên app có thể cho người bệnh đặt vào giờ bác
        // sĩ không trực — họ đến nơi mới biết. Xem docs/features/patient-app/00-his-api-inventory.md
        // §11.5 GAP 18.
        var shifts = await GetWorkingShiftsAsync(date, departmentId, doctorId);

        var morningSlots = new List<BookingTimeSlot>();
        var afternoonSlots = new List<BookingTimeSlot>();
        var noon = new TimeSpan(12, 0, 0);

        foreach (var shift in shifts)
        {
            var slots = GenerateSlots(
                shift.Start, shift.End,
                TimeSpan.FromMinutes(shift.SlotMinutes),
                shift.MaxPerSlot, bookingMap, date);

            // Phân loại TỪNG KHUNG theo giờ bắt đầu của CHÍNH NÓ.
            //
            // Trước đây phân theo giờ KẾT THÚC của cả ca: ca cả ngày (07:00-15:00 — loại phổ biến
            // nhất) kết thúc sau 12h nên bị dồn TRỌN vào buổi chiều. Người bệnh mở trang đặt lịch
            // thấy mục "Buổi chiều" chứa khung 07:00, còn "Buổi sáng" rỗng trơn.
            foreach (var slot in slots)
            {
                if (slot.StartTime < noon) morningSlots.Add(slot);
                else afternoonSlots.Add(slot);
            }
        }

        morningSlots = morningSlots.OrderBy(s => s.StartTime).ToList();
        afternoonSlots = afternoonSlots.OrderBy(s => s.StartTime).ToList();

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
        //
        // Lịch ĐÃ HUỶ không tính vào hạn mức.
        //
        // Hạn mức này sinh ra để một người không ôm nhiều chỗ khám. Lịch đã huỷ thì không ôm chỗ
        // nào cả — chỗ đó đã trả lại cho người khác. Tính cả lịch đã huỷ nghĩa là người bệnh bấm
        // nhầm giờ rồi tự sửa lại bị PHẠT mất một suất trong ngày, mà người dùng chính của app lại
        // là người cao tuổi, nhóm bấm nhầm nhiều nhất. Đây là chuyện đã xảy ra thật: chủ đầu tư
        // đặt 3 lịch, huỷ 1, và bị chặn khi chỉ còn 2 lịch còn hiệu lực.
        //
        // Trạng thái 4 = đã huỷ (xem `Appointment.Status`).
        var (dayStart, dayEnd) = VnTime.DayRangeUtc(VnTime.TodayVn);

        var cancelledCodesToday = await _context.Appointments
            .Where(a => !a.IsDeleted && a.Status == 4 && a.AppointmentCode != null)
            .Select(a => a.AppointmentCode!)
            .ToListAsync();

        var phoneAttemptsToday = await _context.Set<BookingAttemptLog>()
            .CountAsync(l => !l.IsDeleted
                && l.PhoneNumber == phone
                && l.IsSuccessful
                && l.CreatedAt >= dayStart && l.CreatedAt < dayEnd
                // Lượt đặt chưa gắn được mã hẹn thì vẫn tính — không có cách nào biết nó đã huỷ hay chưa.
                && (l.AppointmentCode == null || !cancelledCodesToday.Contains(l.AppointmentCode)));
        if (phoneAttemptsToday >= maxPerPhone)
        {
            await LogAttemptAsync(phone, ip, false, null, $"Phone limit {maxPerPhone}/day exceeded");
            return new BookingResultDto { Success = false, Message = $"Số điện thoại này đã đặt lịch {maxPerPhone} lần trong hôm nay. Vui lòng liên hệ trực tiếp bệnh viện." };
        }

        // === Anti-fraud: đếm số lần đặt hôm nay theo IP ===
        //
        // Bỏ qua khi người gọi đã xác thực. Hạn mức này chặn kẻ vô danh nện biểu mẫu công khai;
        // nhưng app hỗ trợ người bệnh đi qua BFF, mà BFF là MỘT máy chủ — HIS thấy đúng một IP cho
        // toàn bộ người bệnh. Giữ nguyên thì người thứ 11 đặt lịch trong ngày và mọi người sau đó
        // đều bị từ chối với câu "Quá nhiều yêu cầu từ địa chỉ này", dù chẳng liên quan gì nhau.
        // Hạn mức theo SỐ ĐIỆN THOẠI ở trên vẫn áp, và với người dùng app thì số đó đã qua OTP.
        if (!string.IsNullOrEmpty(ip) && !dto.IsAuthenticatedCaller)
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

        // Chọn phòng. Ưu tiên đúng phòng bác sĩ ngồi hôm đó theo lịch trực — trước đây hàm này lấy
        // phòng active đầu tiên của khoa, nên giấy hẹn có thể ghi sai phòng và người bệnh đi lạc.
        // Xem docs/features/patient-app/00-his-api-inventory.md §11.5 GAP 19.
        Guid? roomId = null;
        string? roomName = null;

        if (dto.DoctorId.HasValue)
        {
            var day = dto.AppointmentDate.Date;
            var dayOfWeek = (int)day.DayOfWeek;

            roomId = await _context.DoctorSchedules
                .Where(s => !s.IsDeleted && s.IsActive && s.DoctorId == dto.DoctorId && s.RoomId != null)
                .Where(s => s.ScheduleDate.Date == day || (s.IsRecurring && s.DayOfWeek == dayOfWeek))
                // Lịch đúng ngày thắng lịch lặp hàng tuần.
                .OrderByDescending(s => s.ScheduleDate.Date == day)
                .Select(s => s.RoomId)
                .FirstOrDefaultAsync();
        }

        if (roomId == null && dto.DepartmentId.HasValue)
        {
            roomId = await _context.Rooms
                .Where(r => !r.IsDeleted && r.IsActive && r.DepartmentId == dto.DepartmentId)
                .OrderBy(r => r.DisplayOrder)
                .Select(r => (Guid?)r.Id)
                .FirstOrDefaultAsync();
        }

        if (roomId != null)
        {
            roomName = await _context.Rooms
                .Where(r => r.Id == roomId)
                .Select(r => r.RoomName)
                .FirstOrDefaultAsync();
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

    public async Task<BookingStatusDto> RescheduleAppointmentAsync(
        string appointmentCode, RescheduleBookingDto dto)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .Include(a => a.Doctor)
            .Include(a => a.Room)
            .FirstOrDefaultAsync(a => !a.IsDeleted && a.AppointmentCode == appointmentCode);

        if (appointment == null)
            throw new KeyNotFoundException("Không tìm thấy lịch hẹn");

        // Xác thực chủ lịch hẹn bằng SĐT, giống hệt luồng huỷ.
        if (appointment.Patient?.PhoneNumber != dto.PhoneNumber?.Trim())
            throw new InvalidOperationException("Số điện thoại không khớp");

        if (appointment.Status >= 2)
            throw new InvalidOperationException("Lịch hẹn đã đến khám hoặc đã kết thúc, không đổi được");
        if (appointment.Status == 4)
            throw new InvalidOperationException("Lịch hẹn đã huỷ, vui lòng đặt lịch mới");

        if (dto.NewAppointmentDate.Date < DateTime.Today)
            throw new InvalidOperationException("Ngày hẹn mới không hợp lệ");

        var newDoctorId = dto.NewDoctorId ?? appointment.DoctorId;

        // Khung giờ mới phải nằm trong ca trực thật và còn chỗ. Không kiểm thì đổi lịch trở thành
        // đường vòng để lách đúng cái ràng buộc mà luồng đặt mới đang giữ.
        if (dto.NewAppointmentTime.HasValue)
        {
            var slots = await GetAvailableSlotsAsync(
                dto.NewAppointmentDate, appointment.DepartmentId, newDoctorId);

            var target = slots.MorningSlots.Concat(slots.AfternoonSlots)
                .FirstOrDefault(s => s.StartTime == dto.NewAppointmentTime.Value);

            if (target is null)
                throw new InvalidOperationException("Khung giờ này không nằm trong lịch làm việc của bác sĩ");
            if (!target.IsAvailable)
                throw new InvalidOperationException("Khung giờ này đã hết chỗ, vui lòng chọn giờ khác");
        }

        var oldDate = appointment.AppointmentDate;
        var oldTime = appointment.AppointmentTime;

        appointment.AppointmentDate = dto.NewAppointmentDate.Date;
        appointment.AppointmentTime = dto.NewAppointmentTime ?? appointment.AppointmentTime;
        appointment.DoctorId = newDoctorId;
        // Đổi lịch thì trạng thái quay về "chờ xác nhận": lịch cũ đã được duyệt không có nghĩa lịch
        // mới cũng được duyệt.
        appointment.Status = 0;
        appointment.UpdatedAt = DateTime.UtcNow;

        var note = $"Đổi lịch từ {oldDate:dd/MM/yyyy}"
                   + (oldTime.HasValue ? $" {oldTime:hh\\:mm}" : "")
                   + $" sang {appointment.AppointmentDate:dd/MM/yyyy}"
                   + (appointment.AppointmentTime.HasValue ? $" {appointment.AppointmentTime:hh\\:mm}" : "")
                   + (string.IsNullOrWhiteSpace(dto.Reason) ? "" : $" — {dto.Reason}");

        appointment.Notes = string.IsNullOrEmpty(appointment.Notes) ? note : $"{appointment.Notes}\n{note}";

        // Phòng có thể đổi theo bác sĩ hoặc theo ngày.
        var day = appointment.AppointmentDate.Date;
        var dayOfWeek = (int)day.DayOfWeek;
        var newRoomId = await _context.DoctorSchedules
            .Where(s => !s.IsDeleted && s.IsActive && s.DoctorId == newDoctorId && s.RoomId != null)
            .Where(s => s.ScheduleDate.Date == day || (s.IsRecurring && s.DayOfWeek == dayOfWeek))
            .OrderByDescending(s => s.ScheduleDate.Date == day)
            .Select(s => s.RoomId)
            .FirstOrDefaultAsync();
        if (newRoomId != null) appointment.RoomId = newRoomId;

        await _unitOfWork.SaveChangesAsync();

        // Nạp lại phòng/bác sĩ để phản hồi trả đúng tên mới.
        await _context.Entry(appointment).Reference(a => a.Room).LoadAsync();
        await _context.Entry(appointment).Reference(a => a.Doctor).LoadAsync();

        return MapToBookingStatus(appointment);
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

    /// <summary>Một ca làm việc đã quy về khung giờ + độ dài slot + sức chứa mỗi slot.</summary>
    private readonly record struct WorkingShift(
        TimeSpan Start, TimeSpan End, int SlotMinutes, int MaxPerSlot);

    /// <summary>
    /// Ca làm việc thật trong ngày, đọc từ <c>DoctorSchedules</c> (bảng mà màn "Quản lý lịch làm việc
    /// bác sĩ" đang ghi vào).
    ///
    /// Quy tắc:
    /// <list type="bullet">
    /// <item>Ưu tiên lịch đúng ngày; không có thì lấy lịch lặp hàng tuần khớp thứ.</item>
    /// <item><c>MaxPatients</c> của cả ca được chia đều cho số slot trong ca, để tổng số người nhận
    ///       trong ca không vượt quá con số bác sĩ đã đăng ký.</item>
    /// <item>Không tìm được lịch nào thì rơi về khung giờ hành chính mặc định — thà cho đặt rồi lễ tân
    ///       xác nhận, còn hơn hiện "hết chỗ" ở khoa chưa kịp khai báo lịch.</item>
    /// </list>
    /// </summary>
    private async Task<List<WorkingShift>> GetWorkingShiftsAsync(
        DateTime date, Guid? departmentId, Guid? doctorId)
    {
        var day = date.Date;
        var dayOfWeek = (int)day.DayOfWeek;

        var query = _context.DoctorSchedules
            .Where(s => !s.IsDeleted && s.IsActive)
            .Where(s => !departmentId.HasValue || s.DepartmentId == departmentId)
            .Where(s => !doctorId.HasValue || s.DoctorId == doctorId);

        var schedules = await query
            .Where(s => s.ScheduleDate.Date == day)
            .Select(s => new { s.StartTime, s.EndTime, s.MaxPatients, s.SlotDurationMinutes })
            .ToListAsync();

        if (schedules.Count == 0)
        {
            schedules = await query
                .Where(s => s.IsRecurring && s.DayOfWeek == dayOfWeek)
                .Select(s => new { s.StartTime, s.EndTime, s.MaxPatients, s.SlotDurationMinutes })
                .ToListAsync();
        }

        if (schedules.Count == 0)
        {
            return FallbackShifts
                .Select(f => new WorkingShift(f.Start, f.End, FallbackSlotMinutes, FallbackMaxPerSlot))
                .ToList();
        }

        var shifts = new List<WorkingShift>();
        foreach (var schedule in schedules)
        {
            // Dữ liệu lịch có thể khai thiếu hoặc khai 0; ép về giá trị dùng được thay vì chia cho 0.
            var slotMinutes = schedule.SlotDurationMinutes > 0 ? schedule.SlotDurationMinutes : FallbackSlotMinutes;
            if (schedule.EndTime <= schedule.StartTime) continue;

            var totalMinutes = (schedule.EndTime - schedule.StartTime).TotalMinutes;
            var slotCount = Math.Max(1, (int)(totalMinutes / slotMinutes));
            var maxPatients = schedule.MaxPatients > 0 ? schedule.MaxPatients : FallbackMaxPerSlot * slotCount;

            shifts.Add(new WorkingShift(
                schedule.StartTime,
                schedule.EndTime,
                slotMinutes,
                Math.Max(1, maxPatients / slotCount)));
        }

        return shifts.Count > 0
            ? shifts.OrderBy(s => s.Start).ToList()
            : FallbackShifts
                .Select(f => new WorkingShift(f.Start, f.End, FallbackSlotMinutes, FallbackMaxPerSlot))
                .ToList();
    }

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
            StatusName = statusNames.GetValueOrDefault(a.Status, "Không xác định"),
            CreatedAt = a.CreatedAt
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
