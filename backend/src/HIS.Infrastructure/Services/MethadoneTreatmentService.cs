using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using System.Text;

namespace HIS.Infrastructure.Services;

public class MethadoneTreatmentService : IMethadoneTreatmentService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public MethadoneTreatmentService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }

    private static readonly Dictionary<int, string> StatusNames = new()
    {
        { 0, "Đang điều trị" },
        { 1, "Tạm ngưng" },
        { 2, "Hoàn thành" },
        { 3, "Chuyển cơ sở" },
        { 4, "Bỏ trị" }
    };

    public async Task<MethadonePagedResult> GetPatientsAsync(MethadoneSearchDto2 filter)
    {
        var query = _context.MethadonePatients
            .Include(m => m.Patient)
            .Where(m => !m.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(m =>
                m.Patient!.FullName.ToLower().Contains(kw) ||
                m.PatientCode.ToLower().Contains(kw));
        }

        if (filter.Status.HasValue)
            query = query.Where(m => m.Status == filter.Status.Value);

        if (!string.IsNullOrWhiteSpace(filter.Phase))
            query = query.Where(m => m.Phase == filter.Phase.Trim());

        if (filter.FromDate.HasValue)
            query = query.Where(m => m.EnrollmentDate >= filter.FromDate.Value.Date);

        if (filter.ToDate.HasValue)
            query = query.Where(m => m.EnrollmentDate <= filter.ToDate.Value.Date);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(m => m.EnrollmentDate)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(m => new MethadoneListDto
            {
                Id = m.Id,
                PatientId = m.PatientId,
                PatientName = m.Patient != null ? m.Patient.FullName : "",
                PatientCode = m.PatientCode,
                EnrollmentDate = m.EnrollmentDate,
                CurrentDoseMg = m.CurrentDoseMg,
                Phase = m.Phase,
                Status = m.Status,
                StatusName = "", // mapped below
                LastDosingDate = m.LastDosingDate,
                MissedDoseCount = m.MissedDoseCount,
                Notes = m.Notes
            })
            .ToListAsync();

        foreach (var item in items)
            item.StatusName = StatusNames.GetValueOrDefault(item.Status, "Không xác định");

        return new MethadonePagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        };
    }

    public async Task<MethadoneDetailDto2> EnrollAsync(CreateMethadoneDto2 dto)
    {
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Id == dto.PatientId && !p.IsDeleted)
            ?? throw new InvalidOperationException("Patient not found");

        // Generate Methadone patient code
        var count = await _context.MethadonePatients.CountAsync() + 1;
        var code = $"MTD-{DateTime.Now:yyyy}-{count:D4}";

        var entity = new MethadonePatient
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            PatientCode = code,
            EnrollmentDate = dto.EnrollmentDate,
            CurrentDoseMg = dto.CurrentDose,
            Phase = "Induction",
            Status = 0, // Active
            Notes = dto.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.MethadonePatients.Add(entity);
        await _unitOfWork.SaveChangesAsync();

        return new MethadoneDetailDto2
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            PatientName = patient.FullName,
            PatientCode = entity.PatientCode,
            DateOfBirth = patient.DateOfBirth,
            PhoneNumber = patient.PhoneNumber,
            Address = patient.Address,
            EnrollmentDate = entity.EnrollmentDate,
            CurrentDoseMg = entity.CurrentDoseMg,
            Phase = entity.Phase,
            Status = entity.Status,
            StatusName = StatusNames.GetValueOrDefault(entity.Status, "Không xác định"),
            Notes = entity.Notes,
            TotalDoses = 0,
            TotalUrineTests = 0,
            PositiveUrineCount = 0
        };
    }

    public async Task<DoseRecordDto2> RecordDoseAsync(CreateDoseRecordDto dto)
    {
        var mp = await _context.MethadonePatients.FindAsync(dto.MethadonePatientId)
            ?? throw new InvalidOperationException("Methadone patient not found");

        var entity = new MethadoneDosingRecord
        {
            Id = Guid.NewGuid(),
            MethadonePatientId = dto.MethadonePatientId,
            DosingDate = dto.DoseDate,
            DoseMg = dto.DoseMg,
            AdministeredBy = dto.AdministeredById.HasValue
                ? await _context.Users.Where(u => u.Id == dto.AdministeredById).Select(u => u.FullName).FirstOrDefaultAsync()
                : null,
            Witnessed = !string.IsNullOrWhiteSpace(dto.WitnessedBy),
            Status = dto.MissedDose ? 1 : 0,
            Notes = dto.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.MethadoneDosingRecords.Add(entity);

        // Update patient last dosing date and missed count
        if (!dto.MissedDose)
        {
            mp.LastDosingDate = dto.DoseDate;
        }
        else
        {
            mp.MissedDoseCount++;
        }
        mp.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        return new DoseRecordDto2
        {
            Id = entity.Id,
            MethadonePatientId = entity.MethadonePatientId,
            DoseDate = entity.DosingDate,
            DoseMg = entity.DoseMg,
            AdministeredBy = entity.AdministeredBy,
            WitnessedBy = dto.WitnessedBy,
            MissedDose = dto.MissedDose,
            Status = entity.Status,
            Notes = entity.Notes
        };
    }

    public async Task<ScreeningDto2> RecordUrineScreeningAsync(CreateScreeningDto dto)
    {
        _ = await _context.MethadonePatients.FindAsync(dto.MethadonePatientId)
            ?? throw new InvalidOperationException("Methadone patient not found");

        // Determine overall result
        var results = new[] { dto.Morphine, dto.Amphetamine, dto.Methamphetamine, dto.THC, dto.Benzodiazepine };
        var overallResult = results.Any(r => r?.ToLower() == "positive") ? "Positive" : "Negative";

        var entity = new MethadoneUrineTest
        {
            Id = Guid.NewGuid(),
            MethadonePatientId = dto.MethadonePatientId,
            TestDate = dto.ScreeningDate,
            Morphine = dto.Morphine,
            Amphetamine = dto.Amphetamine,
            Methamphetamine = dto.Methamphetamine,
            THC = dto.THC,
            Benzodiazepine = dto.Benzodiazepine,
            Methadone = dto.MethadoneResult,
            OverallResult = overallResult,
            Notes = dto.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.MethadoneUrineTests.Add(entity);
        await _unitOfWork.SaveChangesAsync();

        return new ScreeningDto2
        {
            Id = entity.Id,
            MethadonePatientId = entity.MethadonePatientId,
            ScreeningDate = entity.TestDate,
            OverallResult = entity.OverallResult,
            Morphine = entity.Morphine,
            Amphetamine = entity.Amphetamine,
            Methamphetamine = entity.Methamphetamine,
            THC = entity.THC,
            Benzodiazepine = entity.Benzodiazepine,
            MethadoneResult = entity.Methadone,
            Notes = entity.Notes
        };
    }

    public async Task<List<DoseRecordDto2>> GetDoseHistoryAsync(Guid methadonePatientId)
    {
        return await _context.MethadoneDosingRecords
            .Where(d => d.MethadonePatientId == methadonePatientId && !d.IsDeleted)
            .OrderByDescending(d => d.DosingDate)
            .Select(d => new DoseRecordDto2
            {
                Id = d.Id,
                MethadonePatientId = d.MethadonePatientId,
                DoseDate = d.DosingDate,
                DoseMg = d.DoseMg,
                AdministeredBy = d.AdministeredBy,
                WitnessedBy = d.Witnessed ? "Có" : "Không",
                MissedDose = d.Status == 1,
                Status = d.Status,
                Notes = d.Notes
            })
            .ToListAsync();
    }

    public async Task<List<ScreeningDto2>> GetScreeningsAsync(Guid methadonePatientId)
    {
        return await _context.MethadoneUrineTests
            .Where(u => u.MethadonePatientId == methadonePatientId && !u.IsDeleted)
            .OrderByDescending(u => u.TestDate)
            .Select(u => new ScreeningDto2
            {
                Id = u.Id,
                MethadonePatientId = u.MethadonePatientId,
                ScreeningDate = u.TestDate,
                OverallResult = u.OverallResult,
                Morphine = u.Morphine,
                Amphetamine = u.Amphetamine,
                Methamphetamine = u.Methamphetamine,
                THC = u.THC,
                Benzodiazepine = u.Benzodiazepine,
                MethadoneResult = u.Methadone,
                Notes = u.Notes
            })
            .ToListAsync();
    }

    public async Task<MethadoneDetailDto2> UpdateStatusAsync(Guid methadonePatientId, UpdateMethadoneStatusDto dto)
    {
        var mp = await _context.MethadonePatients
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == methadonePatientId && !m.IsDeleted)
            ?? throw new InvalidOperationException("Methadone patient not found");

        mp.Status = dto.Status;
        if (!string.IsNullOrWhiteSpace(dto.Notes))
            mp.Notes = string.IsNullOrEmpty(mp.Notes) ? dto.Notes : $"{mp.Notes}\n{dto.Notes}";

        if (dto.Status == 2) // Completed
            mp.DischargeDate = DateTime.UtcNow;

        mp.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        var totalDoses = await _context.MethadoneDosingRecords.CountAsync(d => d.MethadonePatientId == mp.Id && !d.IsDeleted);
        var totalUrine = await _context.MethadoneUrineTests.CountAsync(u => u.MethadonePatientId == mp.Id && !u.IsDeleted);
        var positiveUrine = await _context.MethadoneUrineTests.CountAsync(u => u.MethadonePatientId == mp.Id && !u.IsDeleted && u.OverallResult == "Positive");

        return new MethadoneDetailDto2
        {
            Id = mp.Id,
            PatientId = mp.PatientId,
            PatientName = mp.Patient?.FullName ?? "",
            PatientCode = mp.PatientCode,
            DateOfBirth = mp.Patient?.DateOfBirth,
            PhoneNumber = mp.Patient?.PhoneNumber,
            Address = mp.Patient?.Address,
            EnrollmentDate = mp.EnrollmentDate,
            DischargeDate = mp.DischargeDate,
            CurrentDoseMg = mp.CurrentDoseMg,
            Phase = mp.Phase,
            Status = mp.Status,
            StatusName = StatusNames.GetValueOrDefault(mp.Status, "Không xác định"),
            LastDosingDate = mp.LastDosingDate,
            MissedDoseCount = mp.MissedDoseCount,
            TransferredFrom = mp.TransferredFrom,
            TransferredTo = mp.TransferredTo,
            Notes = mp.Notes,
            TotalDoses = totalDoses,
            TotalUrineTests = totalUrine,
            PositiveUrineCount = positiveUrine
        };
    }

    public async Task<MethadoneDashboardDto2> GetDashboardAsync()
    {
        var patients = await _context.MethadonePatients.Where(m => !m.IsDeleted).ToListAsync();
        // DosingDate là ngày user chọn (giờ VN) → "hôm nay" phải theo ngày VN, không phải UTC.
        var today = HIS.Core.Common.VnTime.TodayVn;
        var monthStart = new DateTime(today.Year, today.Month, 1);

        var dosedToday = await _context.MethadoneDosingRecords
            .CountAsync(d => !d.IsDeleted && d.DosingDate.Date == today && d.Status == 0);

        var missedToday = await _context.MethadoneDosingRecords
            .CountAsync(d => !d.IsDeleted && d.DosingDate.Date == today && d.Status == 1);

        var urineThisMonth = await _context.MethadoneUrineTests
            .Where(u => !u.IsDeleted && u.TestDate >= monthStart)
            .ToListAsync();

        var byPhase = patients
            .Where(p => p.Status == 0)
            .GroupBy(p => p.Phase)
            .Select(g => new PhaseBreakdownDto2
            {
                Phase = g.Key,
                Count = g.Count(),
                AverageDoseMg = g.Average(p => p.CurrentDoseMg)
            })
            .OrderBy(p => p.Phase)
            .ToList();

        var activePatients = patients.Where(p => p.Status == 0).ToList();

        return new MethadoneDashboardDto2
        {
            TotalActive = patients.Count(p => p.Status == 0),
            TotalSuspended = patients.Count(p => p.Status == 1),
            TotalCompleted = patients.Count(p => p.Status == 2),
            TotalTransferred = patients.Count(p => p.Status == 3),
            TotalDropped = patients.Count(p => p.Status == 4),
            DosedToday = dosedToday,
            MissedToday = missedToday,
            AverageDoseMg = activePatients.Any() ? activePatients.Average(p => p.CurrentDoseMg) : 0,
            PositiveUrineThisMonth = urineThisMonth.Count(u => u.OverallResult == "Positive"),
            TotalUrineThisMonth = urineThisMonth.Count,
            PositiveRate = urineThisMonth.Count > 0
                ? Math.Round((double)urineThisMonth.Count(u => u.OverallResult == "Positive") / urineThisMonth.Count * 100, 1)
                : 0,
            ByPhase = byPhase
        };
    }
}
