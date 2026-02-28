using Microsoft.EntityFrameworkCore;
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
        {
            var count = await _context.Appointments
                .Where(a => !a.IsDeleted && a.AppointmentDate.Date == pair.Date
                    && a.DepartmentId == pair.DepartmentId
                    && a.DoctorId == pair.DoctorId
                    && a.Status < 3)
                .CountAsync();
            bookedCounts[$"{pair.Date:yyyyMMdd}_{pair.DepartmentId}_{pair.DoctorId}"] = count;
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
                ?? throw new Exception("Không tìm thấy lịch làm việc");
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
            ?? throw new Exception("Không tìm thấy lịch làm việc");
        schedule.IsDeleted = true;
        schedule.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task GenerateRecurringSchedulesAsync(Guid scheduleId, DateTime fromDate, DateTime toDate)
    {
        var template = await _context.DoctorSchedules.FindAsync(scheduleId)
            ?? throw new Exception("Không tìm thấy lịch mẫu");

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
        if (!string.IsNullOrWhiteSpace(search.Keyword))
        {
            var kw = search.Keyword.Trim();
            query = query.Where(a =>
                a.AppointmentCode.Contains(kw)
                || a.Patient.FullName.Contains(kw)
                || (a.Patient.PhoneNumber != null && a.Patient.PhoneNumber.Contains(kw)));
        }

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(a => a.AppointmentDate)
            .ThenBy(a => a.AppointmentTime)
            .Skip(search.PageIndex * search.PageSize)
            .Take(search.PageSize)
            .ToListAsync();

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
                DepartmentName = a.Department?.DepartmentName,
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

        // Update status to attended
        appointment.Status = 2;
        appointment.UpdatedAt = DateTime.UtcNow;

        // Create queue ticket
        var maxQueue = await _context.QueueTickets
            .Where(q => !q.IsDeleted && q.IssueDate.Date == DateTime.Today)
            .MaxAsync(q => (int?)q.QueueNumber) ?? 0;

        var queueNumber = maxQueue + 1;
        var queueTicket = new QueueTicket
        {
            Id = Guid.NewGuid(),
            TicketNumber = $"A{queueNumber:D3}",
            QueueNumber = queueNumber,
            IssueDate = DateTime.Now,
            PatientId = appointment.PatientId,
            RoomId = appointment.RoomId,
            QueueType = 1, // Tiếp đón
            Priority = 0,
            Status = 0, // Chờ
            CreatedAt = DateTime.UtcNow
        };

        await _context.QueueTickets.AddAsync(queueTicket);
        await _unitOfWork.SaveChangesAsync();

        return new BookingCheckinResultDto
        {
            Success = true,
            Message = "Check-in thành công",
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
            QueueNumber = queueNumber
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
            ?? throw new Exception("Không tìm thấy lịch hẹn");

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
            DepartmentName = appointment.Department?.DepartmentName,
            DoctorName = appointment.Doctor?.FullName,
            RoomName = appointment.Room?.RoomName,
            Reason = appointment.Reason,
            Status = appointment.Status,
            StatusName = statusNames.GetValueOrDefault(appointment.Status, "Không xác định")
        };
    }
}
