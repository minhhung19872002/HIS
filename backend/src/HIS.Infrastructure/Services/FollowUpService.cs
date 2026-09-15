using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public class FollowUpService : IFollowUpService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ISmsService? _smsService;

    public FollowUpService(HISDbContext context, IUnitOfWork unitOfWork, ISmsService? smsService = null)
    {
        _context = context;
        _unitOfWork = unitOfWork;
        _smsService = smsService;
    }

    private static readonly Dictionary<int, string> StatusNames = new()
    {
        { 0, "Đã hẹn" }, { 1, "Hoàn thành" }, { 2, "Quá hạn" }, { 3, "Đã hủy" }
    };

    public async Task<FollowUpPagedResult> GetFollowUpsAsync(FollowUpSearchDto filter)
    {
        var query = _context.FollowUpAppointments
            .Include(f => f.Patient)
            .Include(f => f.Doctor)
            .Include(f => f.Department)
            .Where(f => !f.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(f =>
                (f.Patient != null && (f.Patient.FullName.ToLower().Contains(kw) || f.Patient.PatientCode.ToLower().Contains(kw))) ||
                (f.Reason != null && f.Reason.ToLower().Contains(kw)) ||
                (f.Diagnosis != null && f.Diagnosis.ToLower().Contains(kw)));
        }

        if (filter.Status.HasValue)
            query = query.Where(f => f.Status == filter.Status.Value);

        if (!string.IsNullOrWhiteSpace(filter.DateFrom) && DateTime.TryParse(filter.DateFrom, out var dateFrom))
            query = query.Where(f => f.ScheduledDate >= dateFrom);

        if (!string.IsNullOrWhiteSpace(filter.DateTo) && DateTime.TryParse(filter.DateTo, out var dateTo))
            query = query.Where(f => f.ScheduledDate < dateTo.Date.AddDays(1));

        if (filter.DoctorId.HasValue)
            query = query.Where(f => f.DoctorId == filter.DoctorId.Value);

        if (filter.DepartmentId.HasValue)
            query = query.Where(f => f.DepartmentId == filter.DepartmentId.Value);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(f => f.ScheduledDate)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(f => MapToListDto(f))
            .ToListAsync();

        return new FollowUpPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        };
    }

    public async Task<List<FollowUpListDto>> GetTodayFollowUpsAsync()
    {
        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);

        return await _context.FollowUpAppointments
            .Include(f => f.Patient)
            .Include(f => f.Doctor)
            .Include(f => f.Department)
            .Where(f => !f.IsDeleted && f.ScheduledDate >= today && f.ScheduledDate < tomorrow)
            .OrderBy(f => f.ScheduledDate)
            .Select(f => MapToListDto(f))
            .ToListAsync();
    }

    public async Task<List<FollowUpListDto>> GetOverdueFollowUpsAsync()
    {
        var today = DateTime.Today;

        return await _context.FollowUpAppointments
            .Include(f => f.Patient)
            .Include(f => f.Doctor)
            .Include(f => f.Department)
            .Where(f => !f.IsDeleted && f.Status == 0 && f.ScheduledDate < today)
            .OrderBy(f => f.ScheduledDate)
            .Select(f => MapToListDto(f))
            .ToBoundedListAsync("FollowUpService.GetOverdueFollowUps");
    }

    public async Task<FollowUpListDto> CreateFollowUpAsync(CreateFollowUpDto dto)
    {
        if (dto.ScheduledDate == default)
            throw new ArgumentException("Ngày tái khám là bắt buộc", nameof(dto.ScheduledDate));
        if (dto.ScheduledDate.Date < HIS.Core.Common.VnTime.TodayVn)
            throw new ArgumentException("Ngày tái khám không được ở quá khứ", nameof(dto.ScheduledDate));
        // Unknown patient → FK violation (500).
        if (!await _context.Patients.AnyAsync(p => p.Id == dto.PatientId && !p.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy người bệnh");
        var dayStart = dto.ScheduledDate.Date;
        if (await _context.FollowUpAppointments.AnyAsync(f => !f.IsDeleted && f.PatientId == dto.PatientId && f.Status == 0
                && f.ScheduledDate >= dayStart && f.ScheduledDate < dayStart.AddDays(1)))
            throw new InvalidOperationException("Người bệnh đã có lịch tái khám trong ngày này.");

        var entity = new FollowUpAppointment
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            ExaminationId = dto.ExaminationId,
            ScheduledDate = dto.ScheduledDate,
            Status = 0, // Scheduled
            Notes = dto.Notes,
            Reason = dto.Reason,
            Diagnosis = dto.Diagnosis,
            DoctorId = dto.DoctorId,
            DepartmentId = dto.DepartmentId,
            ReminderDaysBefore = dto.ReminderDaysBefore ?? 1,
            ReminderSent = false,
            CreatedAt = DateTime.UtcNow
        };

        await _context.FollowUpAppointments.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        // Reload with navigation properties
        var result = await _context.FollowUpAppointments
            .Include(f => f.Patient)
            .Include(f => f.Doctor)
            .Include(f => f.Department)
            .FirstAsync(f => f.Id == entity.Id);

        return MapToListDto(result);
    }

    public async Task<FollowUpListDto> UpdateStatusAsync(Guid id, UpdateFollowUpDto dto)
    {
        var entity = await _context.FollowUpAppointments
            .Include(f => f.Patient)
            .Include(f => f.Doctor)
            .Include(f => f.Department)
            .FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy lịch tái khám");

        if (!StatusNames.ContainsKey(dto.Status))
            throw new ArgumentException("Trạng thái lịch tái khám không hợp lệ", nameof(dto.Status));
        // Completed / cancelled are terminal (a cancelled visit could be flipped to "completed" and vice versa).
        if ((entity.Status == 1 || entity.Status == 3) && dto.Status != entity.Status)
            throw new InvalidOperationException($"Lịch tái khám đang ở trạng thái \"{StatusNames[entity.Status]}\", không đổi được.");

        entity.Status = dto.Status;
        // Keep the recorded visit date unless a new one is given; default it when completing.
        entity.ActualDate = dto.ActualDate ?? entity.ActualDate ?? (dto.Status == 1 ? DateTime.Now : null);
        if (!string.IsNullOrWhiteSpace(dto.Notes))
            entity.Notes = dto.Notes;
        entity.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();
        return MapToListDto(entity);
    }

    public async Task SendReminderAsync(Guid id)
    {
        var entity = await _context.FollowUpAppointments
            .Include(f => f.Patient)
            .FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy lịch tái khám");

        if (entity.Status != 0)
            throw new InvalidOperationException("Chỉ gửi nhắc cho lịch tái khám đang chờ.");
        var phone = entity.Patient?.PhoneNumber;
        if (string.IsNullOrWhiteSpace(phone))
            throw new InvalidOperationException("Người bệnh chưa có số điện thoại để gửi nhắc.");

        // Previously only flagged ReminderSent=true and answered "Đã gửi nhắc nhở thành công" — nothing was sent.
        var sent = _smsService != null && await _smsService.SendSmsAsync(
            phone,
            $"Nhac lich tai kham ngay {entity.ScheduledDate:dd/MM/yyyy}. Vui long mang theo giay to tuy than va the BHYT. HIS",
            "Reminder", entity.Patient?.FullName, "FollowUpAppointment", entity.Id);
        if (!sent)
            throw new InvalidOperationException("Gửi SMS nhắc tái khám thất bại (số điện thoại không hợp lệ hoặc cổng SMS lỗi).");

        entity.ReminderSent = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
    }

    private static FollowUpListDto MapToListDto(FollowUpAppointment f) => new()
    {
        Id = f.Id,
        PatientId = f.PatientId,
        PatientName = f.Patient?.FullName,
        PatientCode = f.Patient?.PatientCode,
        PatientPhone = f.Patient?.PhoneNumber,
        ExaminationId = f.ExaminationId,
        ScheduledDate = f.ScheduledDate,
        ActualDate = f.ActualDate,
        Status = f.Status,
        StatusName = StatusNames.GetValueOrDefault(f.Status, "Không xác định"),
        ReminderSent = f.ReminderSent,
        Notes = f.Notes,
        Reason = f.Reason,
        Diagnosis = f.Diagnosis,
        DoctorId = f.DoctorId,
        DoctorName = f.Doctor?.FullName,
        DepartmentId = f.DepartmentId,
        DepartmentName = f.Department?.DepartmentName,
        CreatedAt = f.CreatedAt
    };
}
