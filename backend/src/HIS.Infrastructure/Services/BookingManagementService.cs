using Microsoft.EntityFrameworkCore;
using HIS.Core.Constants;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Quản lý đặt lịch phía nhân viên y tế (cần đăng nhập)
/// </summary>
public class BookingManagementService : IBookingManagementService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public BookingManagementService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }

    // === Doctor Schedule ===

    public async Task<List<DoctorScheduleListDto>> GetDoctorSchedulesAsync(
        DateTime? fromDate, DateTime? toDate, Guid? departmentId, Guid? doctorId)
    {
        var query = _context.DoctorSchedules
            .Include(s => s.Doctor)
            .Include(s => s.Department)
            .Include(s => s.Room)
            .Where(s => !s.IsDeleted);

        if (fromDate.HasValue)
            query = query.Where(s => s.ScheduleDate >= fromDate.Value.Date);
        if (toDate.HasValue)
            query = query.Where(s => s.ScheduleDate <= toDate.Value.Date);
        if (departmentId.HasValue)
            query = query.Where(s => s.DepartmentId == departmentId.Value);
        if (doctorId.HasValue)
            query = query.Where(s => s.DoctorId == doctorId.Value);

        var schedules = await query
            .OrderBy(s => s.ScheduleDate)
            .ThenBy(s => s.StartTime)
            .ThenBy(s => s.Doctor.FullName)
            .Take(500)
            .ToListAsync();

        // Count booked appointments for each schedule
        var scheduleIds = schedules.Select(s => s.Id).ToList();
        var dateDeptPairs = schedules.Select(s => new { s.ScheduleDate.Date, s.DepartmentId, s.DoctorId }).Distinct().ToList();

        var bookedCounts = new Dictionary<string, int>();
        foreach (var pair in dateDeptPairs)
            bookedCounts[$"{pair.Date:yyyyMMdd}_{pair.DepartmentId}_{pair.DoctorId}"] = 0;

        // #195: 1 query gom theo (ngày, khoa, bác sĩ) thay vì 1 count/cặp lịch. Lọc theo khoảng
        // ngày rồi ghép khoá trong bộ nhớ — cặp nào không có lịch hẹn vẫn giữ 0 như trước.
        if (dateDeptPairs.Count > 0)
        {
            var bookingFrom = dateDeptPairs.Min(p => p.Date);
            var bookingTo = dateDeptPairs.Max(p => p.Date).AddDays(1);
            var bookingDeptIds = dateDeptPairs.Select(p => (Guid?)p.DepartmentId).Distinct().ToList();
            var bookingDoctorIds = dateDeptPairs.Select(p => (Guid?)p.DoctorId).Distinct().ToList();

            var bookedRows = await _context.Appointments
                .Where(a => !a.IsDeleted && a.Status < 3
                    && a.AppointmentDate >= bookingFrom && a.AppointmentDate < bookingTo
                    && bookingDeptIds.Contains(a.DepartmentId)
                    && bookingDoctorIds.Contains(a.DoctorId))
                .GroupBy(a => new { Day = a.AppointmentDate.Date, a.DepartmentId, a.DoctorId })
                .Select(g => new { g.Key.Day, g.Key.DepartmentId, g.Key.DoctorId, Count = g.Count() })
                .ToListAsync();

            foreach (var row in bookedRows)
            {
                var key = $"{row.Day:yyyyMMdd}_{row.DepartmentId}_{row.DoctorId}";
                if (bookedCounts.ContainsKey(key)) bookedCounts[key] = row.Count;
            }
        }

        return schedules.Select(s => new DoctorScheduleListDto
        {
            Id = s.Id,
            DoctorId = s.DoctorId,
            DoctorName = s.Doctor?.FullName ?? "",
            Title = s.Doctor?.Title,
            Specialty = s.Doctor?.Specialty,
            DepartmentId = s.DepartmentId,
            DepartmentName = s.Department?.DepartmentName ?? "",
            RoomId = s.RoomId,
            RoomName = s.Room?.RoomName,
            ScheduleDate = s.ScheduleDate,
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            MaxPatients = s.MaxPatients,
            SlotDurationMinutes = s.SlotDurationMinutes,
            ScheduleType = s.ScheduleType,
            Note = s.Note,
            IsActive = s.IsActive,
            IsRecurring = s.IsRecurring,
            DayOfWeek = s.DayOfWeek,
            BookedCount = bookedCounts.GetValueOrDefault($"{s.ScheduleDate:yyyyMMdd}_{s.DepartmentId}_{s.DoctorId}", 0)
        }).ToList();
    }

    public async Task<DoctorScheduleListDto> SaveDoctorScheduleAsync(SaveDoctorScheduleDto dto)
    {
        DoctorSchedule schedule;
        if (dto.Id.HasValue)
        {
            schedule = await _context.DoctorSchedules.FindAsync(dto.Id.Value)
                ?? throw new KeyNotFoundException("Không tìm thấy lịch làm việc");
            schedule.DoctorId = dto.DoctorId;
            schedule.DepartmentId = dto.DepartmentId;
            schedule.RoomId = dto.RoomId;
            schedule.ScheduleDate = dto.ScheduleDate.Date;
            schedule.StartTime = dto.StartTime;
            schedule.EndTime = dto.EndTime;
            schedule.MaxPatients = dto.MaxPatients;
            schedule.SlotDurationMinutes = dto.SlotDurationMinutes;
            schedule.ScheduleType = dto.ScheduleType;
            schedule.Note = dto.Note;
            schedule.IsRecurring = dto.IsRecurring;
            schedule.DayOfWeek = (int)dto.ScheduleDate.DayOfWeek;
            schedule.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            schedule = new DoctorSchedule
            {
                Id = Guid.NewGuid(),
                DoctorId = dto.DoctorId,
                DepartmentId = dto.DepartmentId,
                RoomId = dto.RoomId,
                ScheduleDate = dto.ScheduleDate.Date,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                MaxPatients = dto.MaxPatients,
                SlotDurationMinutes = dto.SlotDurationMinutes,
                ScheduleType = dto.ScheduleType,
                Note = dto.Note,
                IsRecurring = dto.IsRecurring,
                DayOfWeek = (int)dto.ScheduleDate.DayOfWeek,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            await _context.DoctorSchedules.AddAsync(schedule);
        }

        await _unitOfWork.SaveChangesAsync();

        // Reload with includes
        schedule = await _context.DoctorSchedules
            .Include(s => s.Doctor).Include(s => s.Department).Include(s => s.Room)
            .FirstAsync(s => s.Id == schedule.Id);

        return new DoctorScheduleListDto
        {
            Id = schedule.Id,
            DoctorId = schedule.DoctorId,
            DoctorName = schedule.Doctor?.FullName ?? "",
            Title = schedule.Doctor?.Title,
            Specialty = schedule.Doctor?.Specialty,
            DepartmentId = schedule.DepartmentId,
            DepartmentName = schedule.Department?.DepartmentName ?? "",
            RoomId = schedule.RoomId,
            RoomName = schedule.Room?.RoomName,
            ScheduleDate = schedule.ScheduleDate,
            StartTime = schedule.StartTime,
            EndTime = schedule.EndTime,
            MaxPatients = schedule.MaxPatients,
            SlotDurationMinutes = schedule.SlotDurationMinutes,
            ScheduleType = schedule.ScheduleType,
            Note = schedule.Note,
            IsActive = schedule.IsActive,
            IsRecurring = schedule.IsRecurring,
            DayOfWeek = schedule.DayOfWeek,
            BookedCount = 0
        };
    }

    public async Task DeleteDoctorScheduleAsync(Guid id)
    {
        var schedule = await _context.DoctorSchedules.FindAsync(id)
            ?? throw new KeyNotFoundException("Không tìm thấy lịch làm việc");
        schedule.IsDeleted = true;
        schedule.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task GenerateRecurringSchedulesAsync(Guid scheduleId, DateTime fromDate, DateTime toDate)
    {
        var template = await _context.DoctorSchedules.FindAsync(scheduleId)
            ?? throw new KeyNotFoundException("Không tìm thấy lịch mẫu");

        var targetDayOfWeek = (System.DayOfWeek)template.DayOfWeek;
        var current = fromDate.Date;

        while (current <= toDate.Date)
        {
            if (current.DayOfWeek == targetDayOfWeek && current > template.ScheduleDate)
            {
                // Check if schedule already exists for this doctor/date
                var exists = await _context.DoctorSchedules.AnyAsync(s =>
                    !s.IsDeleted && s.DoctorId == template.DoctorId
                    && s.ScheduleDate == current && s.StartTime == template.StartTime);
                if (!exists)
                {
                    await _context.DoctorSchedules.AddAsync(new DoctorSchedule
                    {
                        Id = Guid.NewGuid(),
                        DoctorId = template.DoctorId,
                        DepartmentId = template.DepartmentId,
                        RoomId = template.RoomId,
                        ScheduleDate = current,
                        StartTime = template.StartTime,
                        EndTime = template.EndTime,
                        MaxPatients = template.MaxPatients,
                        SlotDurationMinutes = template.SlotDurationMinutes,
                        ScheduleType = template.ScheduleType,
                        Note = template.Note,
                        IsRecurring = true,
                        DayOfWeek = template.DayOfWeek,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
            current = current.AddDays(1);
        }

        await _unitOfWork.SaveChangesAsync();
    }

    // === Booking Management ===

    public async Task<BookingManagementPagedResult> GetBookingsAsync(BookingSearchDto search)
    {
        var query = _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .Include(a => a.Doctor)
            .Include(a => a.Room)
            .Where(a => !a.IsDeleted);

        if (search.FromDate.HasValue)
            query = query.Where(a => a.AppointmentDate.Date >= search.FromDate.Value.Date);
        if (search.ToDate.HasValue)
            query = query.Where(a => a.AppointmentDate.Date <= search.ToDate.Value.Date);
        if (search.DepartmentId.HasValue)
            query = query.Where(a => a.DepartmentId == search.DepartmentId);
        if (search.DoctorId.HasValue)
            query = query.Where(a => a.DoctorId == search.DoctorId);
        if (search.Status.HasValue)
            query = query.Where(a => a.Status == search.Status);
        List<Appointment> items;
        int total;
        if (!string.IsNullOrWhiteSpace(search.Keyword))
        {
            var kw = search.Keyword.Trim();

            // Patient.PhoneNumber dùng randomized Data Protection encryption. Đẩy
            // Contains xuống SQL khiến EF mã hóa cả tham số/escape của LIKE và SQL
            // Server báo error 506. Materialize tập ứng viên đã được giới hạn bởi
            // ngày/khoa/bác sĩ/trạng thái rồi mới tìm trên giá trị đã giải mã.
            var candidates = await query.AsNoTracking().ToListAsync();
            var matched = candidates
                .Where(a =>
                    a.AppointmentCode.Contains(kw, StringComparison.OrdinalIgnoreCase)
                    || (a.Patient?.FullName?.Contains(kw, StringComparison.OrdinalIgnoreCase) ?? false)
                    || (a.Patient?.PhoneNumber?.Contains(kw, StringComparison.OrdinalIgnoreCase) ?? false))
                .OrderByDescending(a => a.AppointmentDate)
                .ThenBy(a => a.AppointmentTime)
                .ToList();

            total = matched.Count;
            items = matched
                .Skip(search.PageIndex * search.PageSize)
                .Take(search.PageSize)
                .ToList();
        }
        else
        {
            total = await query.CountAsync();
            items = await query
                .AsNoTracking()
                .OrderByDescending(a => a.AppointmentDate)
                .ThenBy(a => a.AppointmentTime)
                .Skip(search.PageIndex * search.PageSize)
                .Take(search.PageSize)
                .ToListAsync();
        }

        var typeNames = new Dictionary<int, string>
        {
            { 1, "Tái khám" }, { 2, "Khám mới" }, { 3, "Khám sức khỏe" }
        };
        var statusNames = new Dictionary<int, string>
        {
            { 0, "Chờ xác nhận" }, { 1, "Đã xác nhận" }, { 2, "Đã đến khám" },
            { 3, "Không đến" }, { 4, "Đã hủy" }
        };

        return new BookingManagementPagedResult
        {
            Items = items.Select(a => new BookingStatusDto
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
            }).ToList(),
            TotalCount = total,
            PageIndex = search.PageIndex,
            PageSize = search.PageSize
        };
    }

    public async Task<BookingStatusDto> UpdateBookingAsync(string appointmentCode, UpdateBookingDto dto)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .Include(a => a.Doctor)
            .Include(a => a.Room)
            .FirstOrDefaultAsync(a => !a.IsDeleted && a.AppointmentCode == appointmentCode)
            ?? throw new KeyNotFoundException("Không tìm thấy lịch hẹn");

        // Chỉ cho sửa khi lịch chưa đến khám / chưa hủy / chưa đánh dấu vắng (status 0-Chờ XN, 1-Đã XN)
        if (appointment.Status >= 2)
            throw new InvalidOperationException("Không thể sửa lịch hẹn đã đến khám hoặc đã hủy");

        // Validate ngày hẹn (tái dùng quy tắc của BookAppointment)
        if (dto.AppointmentDate.Date < DateTime.Today)
            throw new InvalidOperationException("Ngày hẹn không hợp lệ");

        // Cập nhật thông tin bệnh nhân trên hồ sơ (nếu có nhập)
        if (appointment.Patient != null)
        {
            if (!string.IsNullOrWhiteSpace(dto.PatientName))
                appointment.Patient.FullName = dto.PatientName.Trim();
            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
                appointment.Patient.PhoneNumber = dto.PhoneNumber.Trim();
            appointment.Patient.UpdatedAt = DateTime.UtcNow;
        }

        // Kiểm tra trùng lịch hẹn (cùng BN, cùng ngày) — loại trừ chính lịch đang sửa
        var duplicate = await _context.Appointments
            .AnyAsync(a => !a.IsDeleted
                && a.Id != appointment.Id
                && a.PatientId == appointment.PatientId
                && a.AppointmentDate.Date == dto.AppointmentDate.Date
                && a.Status < 3);
        if (duplicate)
            throw new InvalidOperationException("Bệnh nhân đã có lịch hẹn khác trong ngày này");

        // Khi đổi khoa: tự gán lại phòng trống (giống logic BookAppointment)
        if (dto.DepartmentId != appointment.DepartmentId)
        {
            Guid? roomId = null;
            if (dto.DepartmentId.HasValue)
            {
                var room = await _context.Rooms
                    .Where(r => !r.IsDeleted && r.IsActive && r.DepartmentId == dto.DepartmentId)
                    .OrderBy(r => r.DisplayOrder)
                    .FirstOrDefaultAsync();
                roomId = room?.Id;
            }
            appointment.DepartmentId = dto.DepartmentId;
            appointment.RoomId = roomId;
        }

        appointment.DoctorId = dto.DoctorId;
        appointment.AppointmentDate = dto.AppointmentDate.Date;
        appointment.AppointmentTime = dto.AppointmentTime;
        appointment.AppointmentType = dto.AppointmentType;
        appointment.Reason = dto.Reason?.Trim();
        appointment.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        // Nạp lại navigation (khoa/phòng/bác sĩ có thể đã đổi)
        appointment = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .Include(a => a.Doctor)
            .Include(a => a.Room)
            .FirstAsync(a => a.Id == appointment.Id);

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
            AppointmentCode = appointment.AppointmentCode,
            PatientName = appointment.Patient?.FullName ?? "",
            PhoneNumber = appointment.Patient?.PhoneNumber,
            AppointmentDate = appointment.AppointmentDate,
            AppointmentTime = appointment.AppointmentTime,
            AppointmentType = appointment.AppointmentType,
            AppointmentTypeName = typeNames.GetValueOrDefault(appointment.AppointmentType, "Khác"),
            DepartmentId = appointment.DepartmentId,
            DepartmentName = appointment.Department?.DepartmentName,
            DoctorId = appointment.DoctorId,
            DoctorName = appointment.Doctor?.FullName,
            RoomName = appointment.Room?.RoomName,
            Reason = appointment.Reason,
            Status = appointment.Status,
            StatusName = statusNames.GetValueOrDefault(appointment.Status, "Không xác định")
        };
    }

    public async Task<BookingStatusDto> ConfirmBookingAsync(string appointmentCode)
    {
        return await UpdateBookingStatus(appointmentCode, 1, "Đã xác nhận");
    }

    public async Task<BookingStatusDto> CheckInBookingAsync(string appointmentCode)
    {
        return await UpdateBookingStatus(appointmentCode, 2, "Đã đến khám");
    }

    public async Task<BookingStatusDto> MarkNoShowAsync(string appointmentCode)
    {
        return await UpdateBookingStatus(appointmentCode, 3, "Không đến");
    }

    public async Task<BookingStatusDto> CancelBookingAsync(string appointmentCode, string? reason)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .Include(a => a.Doctor)
            .Include(a => a.Room)
            .FirstOrDefaultAsync(a => !a.IsDeleted && a.AppointmentCode == appointmentCode)
            ?? throw new KeyNotFoundException("Không tìm thấy lịch hẹn");

        if (appointment.Status == 2)
            throw new InvalidOperationException("Không thể hủy lịch hẹn đã check-in (BN đã đến khám)");

        if (appointment.Status >= 3)
            throw new InvalidOperationException("Lịch hẹn đã ở trạng thái kết thúc, không thể hủy");

        appointment.Status = 4; // Đã hủy
        appointment.UpdatedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(reason))
            appointment.Notes = string.IsNullOrEmpty(appointment.Notes)
                ? $"Hủy tại quầy: {reason}"
                : $"{appointment.Notes}\nHủy tại quầy: {reason}";

        await _unitOfWork.SaveChangesAsync();

        var typeNames = new Dictionary<int, string>
        {
            { 1, "Tái khám" }, { 2, "Khám mới" }, { 3, "Khám sức khỏe" }
        };

        return new BookingStatusDto
        {
            AppointmentCode = appointment.AppointmentCode,
            PatientName = appointment.Patient?.FullName ?? "",
            PhoneNumber = appointment.Patient?.PhoneNumber,
            AppointmentDate = appointment.AppointmentDate,
            AppointmentTime = appointment.AppointmentTime,
            AppointmentType = appointment.AppointmentType,
            AppointmentTypeName = typeNames.GetValueOrDefault(appointment.AppointmentType, "Khác"),
            DepartmentId = appointment.DepartmentId,
            DepartmentName = appointment.Department?.DepartmentName,
            DoctorId = appointment.DoctorId,
            DoctorName = appointment.Doctor?.FullName,
            RoomName = appointment.Room?.RoomName,
            Reason = appointment.Reason,
            Status = 4,
            StatusName = "Đã hủy"
        };
    }

    public async Task<BookingStatsDto> GetBookingStatsAsync(DateTime? date)
    {
        var targetDate = date ?? DateTime.Today;
        var appointments = await _context.Appointments
            .Include(a => a.Department)
            .Where(a => !a.IsDeleted && a.AppointmentDate.Date == targetDate.Date)
            .ToListAsync();

        var total = appointments.Count;
        var pending = appointments.Count(a => a.Status == 0);
        var confirmed = appointments.Count(a => a.Status == 1);
        var attended = appointments.Count(a => a.Status == 2);
        var noShow = appointments.Count(a => a.Status == 3);
        var cancelled = appointments.Count(a => a.Status == 4);

        var completedTotal = attended + noShow;
        var noShowRate = completedTotal > 0 ? (double)noShow / completedTotal * 100 : 0;

        var byDept = appointments
            .Where(a => a.Department != null)
            .GroupBy(a => a.Department!.DepartmentName)
            .Select(g => new BookingStatsByDepartment { DepartmentName = g.Key, Count = g.Count() })
            .OrderByDescending(d => d.Count)
            .ToList();

        return new BookingStatsDto
        {
            TotalBookings = total,
            Pending = pending,
            Confirmed = confirmed,
            Attended = attended,
            NoShow = noShow,
            Cancelled = cancelled,
            NoShowRate = Math.Round(noShowRate, 1),
            ByDepartment = byDept
        };
    }

    public async Task<BookingCheckinResultDto> CheckinFromBookingAsync(string appointmentCode)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .Include(a => a.Room)
            .Include(a => a.Doctor)
            .FirstOrDefaultAsync(a => !a.IsDeleted && a.AppointmentCode == appointmentCode);

        if (appointment == null)
            return new BookingCheckinResultDto { Success = false, Message = "Không tìm thấy lịch hẹn" };

        if (appointment.Status >= 2)
            return new BookingCheckinResultDto { Success = false, Message = "Lịch hẹn đã được xử lý" };

        if (!appointment.DepartmentId.HasValue)
            return new BookingCheckinResultDto { Success = false, Message = "Lich hen chua duoc gan khoa kham" };

        if (!appointment.RoomId.HasValue)
            return new BookingCheckinResultDto { Success = false, Message = "Lich hen chua duoc gan phong kham" };

        if (!appointment.DoctorId.HasValue)
            return new BookingCheckinResultDto { Success = false, Message = "Lich hen chua duoc phan bac si" };

        // Update status to attended
        appointment.Status = 2;
        appointment.UpdatedAt = DateTime.UtcNow;

        // Check for existing active MedicalRecord
        var existingRecord = await _context.MedicalRecords
            .FirstOrDefaultAsync(m => m.PatientId == appointment.PatientId && m.Status < 3 && m.TreatmentType == 1 && !m.IsDeleted);
        if (existingRecord != null)
            return new BookingCheckinResultDto { Success = false, Message = $"Bệnh nhân đã có hồ sơ khám đang hoạt động (Mã: {existingRecord.MedicalRecordCode})" };

        // Generate medical record code
        var today = DateTime.Today;
        var prefix = $"MR{today:yyyyMMdd}";
        var maxCode = await _context.MedicalRecords
            .Where(m => m.MedicalRecordCode.StartsWith(prefix))
            .OrderByDescending(m => m.MedicalRecordCode)
            .Select(m => m.MedicalRecordCode)
            .FirstOrDefaultAsync();
        int nextNum = 1;
        if (!string.IsNullOrEmpty(maxCode) && maxCode.Length > prefix.Length)
            if (int.TryParse(maxCode.Substring(prefix.Length), out int cur)) nextNum = cur + 1;

        // Create MedicalRecord
        var medicalRecord = new MedicalRecord
        {
            Id = Guid.NewGuid(),
            MedicalRecordCode = $"{prefix}{nextNum:D4}",
            PatientId = appointment.PatientId,
            AdmissionDate = DateTime.UtcNow, // dot16: chuẩn UTC
            PatientType = 2, // Viện phí
            TreatmentType = 1, // Ngoại trú
            RoomId = appointment.RoomId,
            DoctorId = appointment.DoctorId,
            DepartmentId = appointment.DepartmentId,
            Status = 0, // Waiting
            CreatedAt = DateTime.UtcNow
        };
        await _context.MedicalRecords.AddAsync(medicalRecord);

        // Create Examination
        var examination = new Examination
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = medicalRecord.Id,
            ExaminationType = 1, // Primary
            DepartmentId = appointment.DepartmentId.Value,
            RoomId = appointment.RoomId.Value,
            DoctorId = appointment.DoctorId,
            Status = 0, // Waiting
            CreatedAt = DateTime.UtcNow
        };
        await _context.Examinations.AddAsync(examination);

        // Create queue ticket (QueueType=2: Khám bệnh)
        // IssueDate chuẩn hóa UTC — query dùng DayRangeUtc để so sánh đúng ngày VN.
        var (bkFromUtc, bkToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(HIS.Core.Common.VnTime.TodayVn);
        var maxQueue = await _context.QueueTickets
            .Where(q => !q.IsDeleted && q.IssueDate >= bkFromUtc && q.IssueDate < bkToUtc)
            .MaxAsync(q => (int?)q.QueueNumber) ?? 0;

        var queueNumber = maxQueue + 1;
        var queueTicket = new QueueTicket
        {
            Id = Guid.NewGuid(),
            TicketNumber = $"A{queueNumber:D3}",
            QueueNumber = queueNumber,
            IssueDate = DateTime.UtcNow, // Chuẩn hóa UTC — đồng bộ với Queue.cs
            PatientId = appointment.PatientId,
            RoomId = appointment.RoomId,
            QueueType = 2, // Khám bệnh
            Priority = 0,
            Status = 0, // Chờ
            CreatedAt = DateTime.UtcNow
        };

        examination.QueueNumber = queueNumber;
        await _context.QueueTickets.AddAsync(queueTicket);
        await _unitOfWork.SaveChangesAsync();

        return new BookingCheckinResultDto
        {
            Success = true,
            Message = "Check-in thành công - Đã tạo hồ sơ khám",
            PatientCode = appointment.Patient?.PatientCode,
            PatientName = appointment.Patient?.FullName,
            PhoneNumber = appointment.Patient?.PhoneNumber,
            PatientId = appointment.PatientId,
            DepartmentId = appointment.DepartmentId,
            DepartmentName = appointment.Department?.DepartmentName,
            RoomId = appointment.RoomId,
            RoomName = appointment.Room?.RoomName,
            DoctorId = appointment.DoctorId,
            DoctorName = appointment.Doctor?.FullName,
            Reason = appointment.Reason,
            AppointmentType = appointment.AppointmentType,
            QueueNumber = queueNumber,
            MedicalRecordId = medicalRecord.Id,
            MedicalRecordCode = medicalRecord.MedicalRecordCode
        };
    }

    // === Helpers ===

    private async Task<BookingStatusDto> UpdateBookingStatus(string appointmentCode, int newStatus, string statusAction)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .Include(a => a.Doctor)
            .Include(a => a.Room)
            .FirstOrDefaultAsync(a => !a.IsDeleted && a.AppointmentCode == appointmentCode)
            ?? throw new KeyNotFoundException("Không tìm thấy lịch hẹn");

        // #218/T3: hàm này trước đây gán thẳng trạng thái mới, KHÔNG kiểm gì — trong khi hủy, đổi
        // lịch và tiếp đón ngay cạnh đó đều chặn `Status >= 2`. Cả sáu bước chuyển sai đều trả
        // HTTP 200 (evidence/cross/t3/t3_appointment_transitions.json): lịch đã hủy bấm "xác nhận"
        // là sống lại, lịch đã đến khám bấm "không đến" là xoá dấu vết bệnh nhân đã tới.
        AppointmentStatus.EnsureCanTransition(appointment.Status, newStatus);

        appointment.Status = newStatus;
        appointment.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

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
            AppointmentCode = appointment.AppointmentCode,
            PatientName = appointment.Patient?.FullName ?? "",
            PhoneNumber = appointment.Patient?.PhoneNumber,
            AppointmentDate = appointment.AppointmentDate,
            AppointmentTime = appointment.AppointmentTime,
            AppointmentType = appointment.AppointmentType,
            AppointmentTypeName = typeNames.GetValueOrDefault(appointment.AppointmentType, "Khác"),
            DepartmentId = appointment.DepartmentId,
            DepartmentName = appointment.Department?.DepartmentName,
            DoctorId = appointment.DoctorId,
            DoctorName = appointment.Doctor?.FullName,
            RoomName = appointment.Room?.RoomName,
            Reason = appointment.Reason,
            Status = appointment.Status,
            StatusName = statusNames.GetValueOrDefault(appointment.Status, "Không xác định")
        };
    }
}
