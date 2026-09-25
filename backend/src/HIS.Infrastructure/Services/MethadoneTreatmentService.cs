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

    /// <summary>Sanity ceiling against keying errors (e.g. 5000 instead of 50). Not a clinical titration limit.</summary>
    internal const double MaxDoseMg = 300;

    internal static void ValidateDoseMg(double doseMg, string label)
    {
        if (double.IsNaN(doseMg) || doseMg <= 0 || doseMg > MaxDoseMg)
            throw new ArgumentException($"{label} phải lớn hơn 0 và không vượt quá {MaxDoseMg} mg.");
    }

    private Task ValidateDosingAsync(MethadonePatient mp, DateTime dosingDate, double doseMg, bool missed)
        => ValidateDosingAsync(_context, mp, dosingDate, doseMg, missed);

    /// <summary>
    /// QA-R3: two concurrent "cấp liều" requests both pass ValidateDosingAsync; the unique index UX_MethadoneDosing_Day
    /// (migration 207) then rejects the second one. Translate that into a 400 with a readable reason instead of a 500.
    /// </summary>
    internal static async Task SaveDoseAsync(Func<Task> save, DateTime dosingDate)
    {
        try
        {
            await save();
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("UX_MethadoneDosing_Day", StringComparison.OrdinalIgnoreCase) == true)
        {
            throw new InvalidOperationException(
                $"Bệnh nhân đã được cấp liều methadone ngày {dosingDate:dd/MM/yyyy} (có thể vừa được ghi ở máy khác) — không cấp liều thứ hai trong ngày.");
        }
    }

    /// <summary>
    /// Shared dispensing guard (also used by PublicHealthService): only active patients, a real dose,
    /// no future/pre-enrollment date, and never a second dispensed dose on the same day (overdose risk).
    /// </summary>
    internal static async Task ValidateDosingAsync(HISDbContext context, MethadonePatient mp, DateTime dosingDate, double doseMg, bool missed, bool advanceAllowed = false)
    {
        if (mp.Status != 0)
            throw new InvalidOperationException("Bệnh nhân không ở trạng thái đang điều trị — không thể ghi nhận liều.");
        if (dosingDate == default)
            throw new ArgumentException("Chưa nhập ngày cấp liều.");
        var day = dosingDate.Date;
        // Take-home / holiday doses are recorded ahead of the day they are taken.
        if (day > HIS.Core.Common.VnTime.TodayVn && !advanceAllowed)
            throw new ArgumentException("Ngày cấp liều không được ở tương lai.");
        if (day < mp.EnrollmentDate.Date)
            throw new ArgumentException("Ngày cấp liều trước ngày đăng ký điều trị.");
        if (!missed)
            ValidateDoseMg(doseMg, "Liều cấp");
        // QA-R11: the FE blocks a dose above the prescribed daily dose, the API did not (direct call / stale page).
        if (!missed && mp.CurrentDoseMg > 0 && doseMg > mp.CurrentDoseMg + 0.001)
            throw new ArgumentException($"Liều cấp vượt liều chỉ định ({mp.CurrentDoseMg} mg) — cập nhật liều điều trị trước.");

        var nextDay = day.AddDays(1);
        var sameDay = await context.MethadoneDosingRecords
            .Where(d => d.MethadonePatientId == mp.Id && !d.IsDeleted && d.DosingDate >= day && d.DosingDate < nextDay)
            .Select(d => d.Status)
            .ToListAsync();
        // Only a second DISPENSED dose is blocked; recording refused/holiday after a dose stays possible.
        if (!missed && sameDay.Contains(0))
            throw new InvalidOperationException("Bệnh nhân đã được cấp liều trong ngày này — không cấp liều lần 2.");
        if (missed && sameDay.Contains(1))
            throw new InvalidOperationException("Đã ghi nhận bỏ liều cho ngày này.");
    }

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
            .ThenBy(m => m.Id) // QA-R11: deterministic paging
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

        if (dto.EnrollmentDate == default)
            throw new InvalidOperationException("Chưa nhập ngày đăng ký điều trị.");
        if (dto.EnrollmentDate.Date > HIS.Core.Common.VnTime.TodayVn)
            throw new InvalidOperationException("Ngày đăng ký không được ở tương lai.");
        ValidateDoseMg(dto.CurrentDose, "Liều khởi đầu");
        // A patient may only have one open (active/suspended) enrollment — a second one splits the dosing history.
        if (await _context.MethadonePatients.AnyAsync(m => m.PatientId == dto.PatientId && !m.IsDeleted && (m.Status == 0 || m.Status == 1)))
            throw new InvalidOperationException("Bệnh nhân đang có hồ sơ điều trị Methadone chưa kết thúc.");

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
        var mp = await _context.MethadonePatients.FirstOrDefaultAsync(m => m.Id == dto.MethadonePatientId && !m.IsDeleted)
            ?? throw new InvalidOperationException("Methadone patient not found");

        await ValidateDosingAsync(mp, dto.DoseDate, dto.DoseMg, dto.MissedDose);

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
            // A back-dated entry must not move "last dose" backwards.
            if (!mp.LastDosingDate.HasValue || dto.DoseDate > mp.LastDosingDate.Value)
                mp.LastDosingDate = dto.DoseDate;
        }
        else
        {
            mp.MissedDoseCount++;
        }
        mp.UpdatedAt = DateTime.UtcNow;

        await SaveDoseAsync(() => _unitOfWork.SaveChangesAsync(), dto.DoseDate);

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
        var mpUrine = await _context.MethadonePatients.FirstOrDefaultAsync(m => m.Id == dto.MethadonePatientId && !m.IsDeleted)
            ?? throw new InvalidOperationException("Methadone patient not found");
        if (dto.ScreeningDate == default)
            throw new ArgumentException("Chưa nhập ngày xét nghiệm.");
        if (dto.ScreeningDate.Date > HIS.Core.Common.VnTime.TodayVn || dto.ScreeningDate.Date < mpUrine.EnrollmentDate.Date)
            throw new ArgumentException("Ngày xét nghiệm không hợp lệ (tương lai hoặc trước ngày đăng ký).");

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

        if (!StatusNames.ContainsKey(dto.Status))
            throw new ArgumentException("Trạng thái điều trị không hợp lệ (0-4).", nameof(dto.Status));

        mp.Status = dto.Status;
        if (!string.IsNullOrWhiteSpace(dto.Notes))
            mp.Notes = string.IsNullOrEmpty(mp.Notes) ? dto.Notes : $"{mp.Notes}\n{dto.Notes}";

        if (dto.Status == 2) // Completed
            mp.DischargeDate = HIS.Core.Common.VnTime.NowVn; // business timestamp = VN local

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
