using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public partial class PublicHealthService
{
    // =====================================================================
    // METHADONE TREATMENT
    // =====================================================================

    public async Task<List<MethadonePatientDto>> GetMethadonePatientsAsync(MethadonePatientSearchDto? filter = null)
    {
        var query = _context.MethadonePatients
            .Include(m => m.Patient)
            .Where(m => !m.IsDeleted)
            .AsQueryable();

        if (filter != null)
        {
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(m =>
                    m.PatientCode.ToLower().Contains(kw) ||
                    (m.Patient != null && (m.Patient.FullName.ToLower().Contains(kw) || m.Patient.PatientCode.ToLower().Contains(kw)))
                );
            }
            if (!string.IsNullOrEmpty(filter.Phase))
                query = query.Where(m => m.Phase == filter.Phase);
            if (filter.Status.HasValue)
                query = query.Where(m => m.Status == filter.Status.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(m => m.EnrollmentDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(m => m.EnrollmentDate <= to.AddDays(1));
        }

        var pageSize = filter?.PageSize > 0 ? filter.PageSize : 20;
        var skip = filter?.PageIndex > 0 ? filter.PageIndex * pageSize : 0;

        return await query
            .OrderByDescending(m => m.EnrollmentDate)
            .Skip(skip)
            .Take(pageSize)
            .Select(m => new MethadonePatientDto
            {
                Id = m.Id,
                PatientId = m.PatientId,
                PatientName = m.Patient != null ? m.Patient.FullName : "",
                PatientCodeHIS = m.Patient != null ? m.Patient.PatientCode : "",
                PatientCode = m.PatientCode,
                EnrollmentDate = m.EnrollmentDate.ToString("yyyy-MM-dd"),
                DischargeDate = m.DischargeDate.HasValue ? m.DischargeDate.Value.ToString("yyyy-MM-dd") : null,
                DischargeReason = m.DischargeReason,
                CurrentDoseMg = m.CurrentDoseMg,
                Phase = m.Phase,
                Status = m.Status,
                TransferredFrom = m.TransferredFrom,
                TransferredTo = m.TransferredTo,
                MissedDoseCount = m.MissedDoseCount,
                LastDosingDate = m.LastDosingDate.HasValue ? m.LastDosingDate.Value.ToString("yyyy-MM-dd") : null,
                Notes = m.Notes,
                DosingRecordCount = m.DosingRecords.Count(dr => !dr.IsDeleted),
                UrineTestCount = m.UrineTests.Count(ut => !ut.IsDeleted),
            })
            .ToListAsync();
    }

    public async Task<MethadonePatientDto?> GetMethadonePatientByIdAsync(Guid id)
    {
        var m = await _context.MethadonePatients
            .Include(m => m.Patient)
            .Include(m => m.DosingRecords.Where(d => !d.IsDeleted))
            .Include(m => m.UrineTests.Where(u => !u.IsDeleted))
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);
        if (m == null) return null;

        return new MethadonePatientDto
        {
            Id = m.Id,
            PatientId = m.PatientId,
            PatientName = m.Patient?.FullName ?? "",
            PatientCodeHIS = m.Patient?.PatientCode ?? "",
            PatientCode = m.PatientCode,
            EnrollmentDate = m.EnrollmentDate.ToString("yyyy-MM-dd"),
            DischargeDate = m.DischargeDate?.ToString("yyyy-MM-dd"),
            DischargeReason = m.DischargeReason,
            CurrentDoseMg = m.CurrentDoseMg,
            Phase = m.Phase,
            Status = m.Status,
            TransferredFrom = m.TransferredFrom,
            TransferredTo = m.TransferredTo,
            MissedDoseCount = m.MissedDoseCount,
            LastDosingDate = m.LastDosingDate?.ToString("yyyy-MM-dd"),
            Notes = m.Notes,
            DosingRecordCount = m.DosingRecords.Count,
            UrineTestCount = m.UrineTests.Count,
        };
    }

    public async Task<MethadonePatientDto> CreateMethadonePatientAsync(CreateMethadonePatientDto dto, string? userId)
    {
        var entity = new MethadonePatient
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            PatientCode = dto.PatientCode,
            EnrollmentDate = !string.IsNullOrEmpty(dto.EnrollmentDate) && DateTime.TryParse(dto.EnrollmentDate, out var ed) ? ed : DateTime.UtcNow,
            CurrentDoseMg = dto.CurrentDoseMg,
            Phase = dto.Phase,
            Status = 0, // Active
            TransferredFrom = dto.TransferredFrom,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };
        _context.MethadonePatients.Add(entity);
        await _context.SaveChangesAsync();

        return new MethadonePatientDto
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            PatientCode = entity.PatientCode,
            EnrollmentDate = entity.EnrollmentDate.ToString("yyyy-MM-dd"),
            CurrentDoseMg = entity.CurrentDoseMg,
            Phase = entity.Phase,
            Status = entity.Status,
        };
    }

    public async Task<MethadonePatientDto> UpdateMethadonePatientAsync(Guid id, UpdateMethadonePatientDto dto)
    {
        var m = await _context.MethadonePatients.Include(x => x.Patient).FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Methadone patient not found");
        if (dto.Status.HasValue) m.Status = dto.Status.Value;
        if (dto.CurrentDoseMg.HasValue) m.CurrentDoseMg = dto.CurrentDoseMg.Value;
        if (dto.Phase != null) m.Phase = dto.Phase;
        if (!string.IsNullOrEmpty(dto.DischargeDate) && DateTime.TryParse(dto.DischargeDate, out var dd))
            m.DischargeDate = dd;
        if (dto.DischargeReason != null) m.DischargeReason = dto.DischargeReason;
        if (dto.TransferredTo != null) m.TransferredTo = dto.TransferredTo;
        if (dto.Notes != null) m.Notes = dto.Notes;
        m.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new MethadonePatientDto
        {
            Id = m.Id,
            PatientId = m.PatientId,
            PatientName = m.Patient?.FullName ?? "",
            PatientCode = m.PatientCode,
            EnrollmentDate = m.EnrollmentDate.ToString("yyyy-MM-dd"),
            CurrentDoseMg = m.CurrentDoseMg,
            Phase = m.Phase,
            Status = m.Status,
        };
    }

    public async Task<List<MethadoneDosingRecordDto>> GetDosingHistoryAsync(Guid methadonePatientId)
    {
        return await _context.MethadoneDosingRecords
            .Where(d => d.MethadonePatientId == methadonePatientId && !d.IsDeleted)
            .OrderByDescending(d => d.DosingDate)
            .Take(100)
            .Select(d => new MethadoneDosingRecordDto
            {
                Id = d.Id,
                MethadonePatientId = d.MethadonePatientId,
                DosingDate = d.DosingDate.ToString("yyyy-MM-dd"),
                DoseMg = d.DoseMg,
                Witnessed = d.Witnessed,
                TakeHome = d.TakeHome,
                AdministeredBy = d.AdministeredBy,
                Notes = d.Notes,
                Status = d.Status,
            })
            .ToListAsync();
    }

    public async Task<MethadoneDosingRecordDto> RecordDoseAsync(CreateMethadoneDosingDto dto, string? userId)
    {
        var patient = await _context.MethadonePatients.FindAsync(dto.MethadonePatientId)
            ?? throw new InvalidOperationException("Methadone patient not found");

        var entity = new MethadoneDosingRecord
        {
            Id = Guid.NewGuid(),
            MethadonePatientId = dto.MethadonePatientId,
            DosingDate = !string.IsNullOrEmpty(dto.DosingDate) && DateTime.TryParse(dto.DosingDate, out var dd) ? dd : DateTime.UtcNow,
            DoseMg = dto.DoseMg,
            Witnessed = dto.Witnessed,
            TakeHome = dto.TakeHome,
            AdministeredBy = dto.AdministeredBy,
            Status = dto.Status,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };
        _context.MethadoneDosingRecords.Add(entity);

        // Update patient's last dosing date and missed count
        patient.LastDosingDate = entity.DosingDate;
        if (dto.Status == 1) // Missed
            patient.MissedDoseCount++;
        patient.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new MethadoneDosingRecordDto
        {
            Id = entity.Id,
            MethadonePatientId = entity.MethadonePatientId,
            DosingDate = entity.DosingDate.ToString("yyyy-MM-dd"),
            DoseMg = entity.DoseMg,
            Witnessed = entity.Witnessed,
            TakeHome = entity.TakeHome,
            AdministeredBy = entity.AdministeredBy,
            Notes = entity.Notes,
            Status = entity.Status,
        };
    }

    public async Task<List<MethadoneUrineTestDto>> GetUrineTestsAsync(Guid methadonePatientId)
    {
        return await _context.MethadoneUrineTests
            .Where(u => u.MethadonePatientId == methadonePatientId && !u.IsDeleted)
            .OrderByDescending(u => u.TestDate)
            .Take(50)
            .Select(u => new MethadoneUrineTestDto
            {
                Id = u.Id,
                MethadonePatientId = u.MethadonePatientId,
                TestDate = u.TestDate.ToString("yyyy-MM-dd"),
                IsRandom = u.IsRandom,
                Morphine = u.Morphine,
                Amphetamine = u.Amphetamine,
                Methamphetamine = u.Methamphetamine,
                THC = u.THC,
                Benzodiazepine = u.Benzodiazepine,
                Methadone = u.Methadone,
                OverallResult = u.OverallResult,
                Notes = u.Notes,
            })
            .ToListAsync();
    }

    public async Task<MethadoneUrineTestDto> RecordUrineTestAsync(CreateMethadoneUrineTestDto dto, string? userId)
    {
        _ = await _context.MethadonePatients.FindAsync(dto.MethadonePatientId)
            ?? throw new InvalidOperationException("Methadone patient not found");

        var entity = new MethadoneUrineTest
        {
            Id = Guid.NewGuid(),
            MethadonePatientId = dto.MethadonePatientId,
            TestDate = !string.IsNullOrEmpty(dto.TestDate) && DateTime.TryParse(dto.TestDate, out var td) ? td : DateTime.UtcNow,
            IsRandom = dto.IsRandom,
            Morphine = dto.Morphine,
            Amphetamine = dto.Amphetamine,
            Methamphetamine = dto.Methamphetamine,
            THC = dto.THC,
            Benzodiazepine = dto.Benzodiazepine,
            Methadone = dto.Methadone,
            OverallResult = dto.OverallResult,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };
        _context.MethadoneUrineTests.Add(entity);
        await _context.SaveChangesAsync();

        return new MethadoneUrineTestDto
        {
            Id = entity.Id,
            MethadonePatientId = entity.MethadonePatientId,
            TestDate = entity.TestDate.ToString("yyyy-MM-dd"),
            IsRandom = entity.IsRandom,
            Morphine = entity.Morphine,
            Amphetamine = entity.Amphetamine,
            Methamphetamine = entity.Methamphetamine,
            THC = entity.THC,
            Benzodiazepine = entity.Benzodiazepine,
            Methadone = entity.Methadone,
            OverallResult = entity.OverallResult,
            Notes = entity.Notes,
        };
    }

    public async Task<MethadoneStatsDto> GetMethadoneStatsAsync()
    {
        // #355: đẩy aggregate xuống SQL (KHÔNG load nguyên bảng rồi count/group/avg trên RAM).
        var baseQ = _context.MethadonePatients.Where(m => !m.IsDeleted);
        // DosingDate là ngày user chọn (giờ VN) → "hôm nay" phải theo ngày VN, không phải UTC.
        var today = HIS.Core.Common.VnTime.TodayVn;
        var missedToday = await _context.MethadoneDosingRecords
            .Where(d => !d.IsDeleted && d.Status == 1 && d.DosingDate.Date == today)
            .CountAsync();
        var positiveTests = await _context.MethadoneUrineTests
            .Where(u => !u.IsDeleted && u.OverallResult == "Positive")
            .CountAsync();

        var activeQ = baseQ.Where(m => m.Status == 0);
        var hasActive = await activeQ.AnyAsync();

        return new MethadoneStatsDto
        {
            TotalPatients = await baseQ.CountAsync(),
            ActiveCount = await baseQ.CountAsync(m => m.Status == 0),
            SuspendedCount = await baseQ.CountAsync(m => m.Status == 1),
            DischargedCount = await baseQ.CountAsync(m => m.Status == 2),
            TransferredCount = await baseQ.CountAsync(m => m.Status == 3),
            // AverageAsync ném khi tập rỗng → guard AnyAsync (giữ đúng hành vi cũ: rỗng = 0).
            AverageDoseMg = hasActive ? (float)Math.Round(await activeQ.AverageAsync(m => m.CurrentDoseMg), 1) : 0,
            MissedDosesToday = missedToday,
            PositiveUrineTests = positiveTests,
            PhaseBreakdown = await activeQ.GroupBy(m => m.Phase)
                .Select(g => new PhaseBreakdownDto { Phase = g.Key, Count = g.Count() }).ToListAsync(),
        };
    }
}
