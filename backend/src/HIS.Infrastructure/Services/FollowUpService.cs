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

    public FollowUpService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
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
            query = query.Where(f => f.ScheduledDate <= dateTo.AddDays(1));

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
            ?? throw new Exception("Không tìm thấy lịch tái khám");

        entity.Status = dto.Status;
        entity.ActualDate = dto.ActualDate;
        if (!string.IsNullOrWhiteSpace(dto.Notes))
            entity.Notes = dto.Notes;
        entity.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();
        return MapToListDto(entity);
    }

    public async Task SendReminderAsync(Guid id)
    {
        var entity = await _context.FollowUpAppointments
            .FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted)
            ?? throw new Exception("Không tìm thấy lịch tái khám");

        entity.ReminderSent = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
        // In production: send SMS/email via IEmailService/ISmsService
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
