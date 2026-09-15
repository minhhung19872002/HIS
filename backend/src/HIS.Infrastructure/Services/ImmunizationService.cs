using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public class ImmunizationService : IImmunizationService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public ImmunizationService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }

    private static readonly Dictionary<int, string> StatusNames = new()
    {
        { 0, "Đã hẹn" }, { 1, "Đã tiêm" }, { 2, "Bỏ lỡ" }, { 3, "Chống chỉ định" }
    };

    public async Task<ImmunizationPagedResult> GetRecordsAsync(ImmunizationSearchDto filter)
    {
        var query = _context.VaccinationRecords
            .Include(v => v.Patient)
            .Where(v => !v.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(v =>
                v.VaccineName.ToLower().Contains(kw) ||
                (v.Patient != null && (v.Patient.FullName.ToLower().Contains(kw) || v.Patient.PatientCode.ToLower().Contains(kw))));
        }

        if (filter.Status.HasValue)
            query = query.Where(v => v.Status == filter.Status.Value);

        if (filter.PatientId.HasValue)
            query = query.Where(v => v.PatientId == filter.PatientId.Value);

        if (!string.IsNullOrWhiteSpace(filter.VaccineName))
            query = query.Where(v => v.VaccineName.Contains(filter.VaccineName));

        if (!string.IsNullOrWhiteSpace(filter.DateFrom) && DateTime.TryParse(filter.DateFrom, out var dateFrom))
            query = query.Where(v => v.VaccinationDate >= dateFrom);

        if (!string.IsNullOrWhiteSpace(filter.DateTo) && DateTime.TryParse(filter.DateTo, out var dateTo))
            query = query.Where(v => v.VaccinationDate <= dateTo.AddDays(1));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(v => v.VaccinationDate)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(v => MapToListDto(v))
            .ToListAsync();

        return new ImmunizationPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        };
    }

    public async Task<ImmunizationScheduleDto> GetPatientScheduleAsync(Guid patientId)
    {
        var patient = await _context.Patients
            .FirstOrDefaultAsync(p => p.Id == patientId && !p.IsDeleted);

        var records = await _context.VaccinationRecords
            .Where(v => v.PatientId == patientId && !v.IsDeleted)
            .OrderBy(v => v.VaccineName)
            .ThenBy(v => v.DoseNumber)
            .ToListAsync();

        var scheduleItems = records.Select(r => new ImmunizationScheduleItemDto
        {
            VaccineName = r.VaccineName,
            DoseNumber = r.DoseNumber,
            ScheduledDate = r.Status == 0 ? r.VaccinationDate : null,
            ActualDate = r.Status == 1 ? r.VaccinationDate : null,
            Status = r.Status,
            StatusName = StatusNames.GetValueOrDefault(r.Status)
        }).ToList();

        // Add upcoming doses from NextDoseDate
        var upcomingDoses = records
            .Where(r => r.NextDoseDate.HasValue && r.Status == 1)
            .Where(r => !records.Any(x => x.VaccineName == r.VaccineName && x.DoseNumber == r.DoseNumber + 1))
            .Select(r => new ImmunizationScheduleItemDto
            {
                VaccineName = r.VaccineName,
                DoseNumber = r.DoseNumber + 1,
                ScheduledDate = r.NextDoseDate,
                Status = 0,
                StatusName = "Đã hẹn"
            });

        scheduleItems.AddRange(upcomingDoses);

        return new ImmunizationScheduleDto
        {
            PatientId = patientId,
            PatientName = patient?.FullName,
            ScheduleItems = scheduleItems.OrderBy(s => s.VaccineName).ThenBy(s => s.DoseNumber).ToList()
        };
    }

    /// <summary>
    /// Shared guard for recording an administered dose (also used by PublicHealthService):
    /// real patient, dose number ≥ 1, not in the future, next-dose date after this dose,
    /// no second record of the same dose, and dose N strictly after dose N-1.
    /// </summary>
    internal static async Task ValidateAdministeredDoseAsync(HISDbContext context, Guid patientId, string? vaccineName,
        int doseNumber, DateTime vaccinationDate, DateTime? nextDoseDate)
    {
        if (patientId == Guid.Empty || !await context.Patients.AnyAsync(p => p.Id == patientId && !p.IsDeleted))
            throw new ArgumentException("Chưa chọn bệnh nhân hợp lệ.");
        if (string.IsNullOrWhiteSpace(vaccineName))
            throw new ArgumentException("Chưa nhập tên vắc-xin.");
        if (doseNumber < 1)
            throw new ArgumentException("Mũi tiêm phải từ 1 trở lên.");
        if (vaccinationDate == default)
            throw new ArgumentException("Chưa nhập ngày tiêm.");
        if (vaccinationDate.Date > HIS.Core.Common.VnTime.TodayVn)
            throw new ArgumentException("Ngày tiêm không được ở tương lai (mũi đã tiêm).");
        if (nextDoseDate.HasValue && nextDoseDate.Value.Date <= vaccinationDate.Date)
            throw new ArgumentException("Ngày hẹn mũi tiếp phải sau ngày tiêm.");

        var name = vaccineName.Trim();
        var sameVaccine = await context.VaccinationRecords
            .Where(v => v.PatientId == patientId && !v.IsDeleted && v.Status == 1 && v.VaccineName == name)
            .Select(v => new { v.DoseNumber, v.VaccinationDate })
            .ToListAsync();
        if (sameVaccine.Any(v => v.DoseNumber == doseNumber))
            throw new InvalidOperationException($"Bệnh nhân đã được ghi nhận tiêm mũi {doseNumber} vắc-xin {name}.");
        var prev = sameVaccine.Where(v => v.DoseNumber < doseNumber).OrderByDescending(v => v.DoseNumber).FirstOrDefault();
        if (prev != null && vaccinationDate.Date <= prev.VaccinationDate.Date)
            throw new InvalidOperationException($"Mũi {doseNumber} phải tiêm sau mũi {prev.DoseNumber} ({prev.VaccinationDate:dd/MM/yyyy}).");
        var later = sameVaccine.Where(v => v.DoseNumber > doseNumber).OrderBy(v => v.DoseNumber).FirstOrDefault();
        if (later != null && vaccinationDate.Date >= later.VaccinationDate.Date)
            throw new InvalidOperationException($"Mũi {doseNumber} phải tiêm trước mũi {later.DoseNumber} ({later.VaccinationDate:dd/MM/yyyy}).");
    }

    public async Task<ImmunizationListDto> AdministerAsync(CreateImmunizationDto dto)
    {
        await ValidateAdministeredDoseAsync(_context, dto.PatientId, dto.VaccineName, dto.DoseNumber, dto.VaccinationDate, dto.NextDoseDate);
        if (dto.DoseMl.HasValue && dto.DoseMl.Value <= 0)
            throw new ArgumentException("Liều (ml) phải lớn hơn 0.");

        var entity = new VaccinationRecord
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            VaccineName = dto.VaccineName.Trim(),
            VaccineCode = dto.VaccineCode,
            LotNumber = dto.LotNumber,
            Manufacturer = dto.Manufacturer,
            DoseNumber = dto.DoseNumber,
            VaccinationDate = dto.VaccinationDate,
            InjectionSite = dto.InjectionSite,
            Route = dto.Route,
            DoseMl = dto.DoseMl,
            NextDoseDate = dto.NextDoseDate,
            Status = 1, // Administered
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        await _context.VaccinationRecords.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        var result = await _context.VaccinationRecords
            .Include(v => v.Patient)
            .FirstAsync(v => v.Id == entity.Id);

        return MapToListDto(result);
    }

    public async Task<ImmunizationListDto> RecordReactionAsync(Guid id, RecordReactionDto dto)
    {
        var entity = await _context.VaccinationRecords
            .Include(v => v.Patient)
            .FirstOrDefaultAsync(v => v.Id == id && !v.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy bản ghi tiêm chủng");

        entity.AefiReport = dto.AefiReport;
        entity.AefiSeverity = dto.AefiSeverity;
        if (!string.IsNullOrWhiteSpace(dto.Notes))
            entity.Notes = string.IsNullOrEmpty(entity.Notes) ? dto.Notes : $"{entity.Notes}\n{dto.Notes}";
        entity.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();
        return MapToListDto(entity);
    }

    public async Task<ImmunizationStatisticsDto> GetStatisticsAsync()
    {
        var query = _context.VaccinationRecords.Where(v => !v.IsDeleted);

        var byVaccine = await query
            .GroupBy(v => v.VaccineName)
            .Select(g => new VaccineCountDto { VaccineName = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(20)
            .ToListAsync();

        return new ImmunizationStatisticsDto
        {
            TotalRecords = await query.CountAsync(),
            CompletedCount = await query.CountAsync(v => v.Status == 1),
            ScheduledCount = await query.CountAsync(v => v.Status == 0),
            MissedCount = await query.CountAsync(v => v.Status == 2),
            AefiCount = await query.CountAsync(v => v.AefiSeverity.HasValue && v.AefiSeverity > 0),
            ByVaccine = byVaccine
        };
    }

    public async Task<List<ImmunizationListDto>> GetOverdueAsync()
    {
        var today = DateTime.Today;

        return await _context.VaccinationRecords
            .Include(v => v.Patient)
            .Where(v => !v.IsDeleted && v.Status == 0 && v.VaccinationDate < today)
            .OrderBy(v => v.VaccinationDate)
            .Take(100)
            .Select(v => MapToListDto(v))
            .ToListAsync();
    }

    private static ImmunizationListDto MapToListDto(VaccinationRecord v) => new()
    {
        Id = v.Id,
        PatientId = v.PatientId,
        PatientName = v.Patient?.FullName,
        PatientCode = v.Patient?.PatientCode,
        PatientAge = v.Patient?.DateOfBirth != null
            ? (int)((DateTime.Today - v.Patient.DateOfBirth.Value).TotalDays / 365.25)
            : null,
        VaccineName = v.VaccineName,
        VaccineCode = v.VaccineCode,
        LotNumber = v.LotNumber,
        Manufacturer = v.Manufacturer,
        DoseNumber = v.DoseNumber,
        VaccinationDate = v.VaccinationDate,
        InjectionSite = v.InjectionSite,
        Route = v.Route,
        NextDoseDate = v.NextDoseDate,
        AefiReport = v.AefiReport,
        AefiSeverity = v.AefiSeverity,
        Status = v.Status,
        StatusName = StatusNames.GetValueOrDefault(v.Status, "Không xác định"),
        AdministeredBy = v.AdministeredBy,
        Notes = v.Notes,
        CreatedAt = v.CreatedAt
    };
}
