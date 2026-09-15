using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class TraumaRegistryService : ITraumaRegistryService
{
    private readonly HISDbContext _context;

    public TraumaRegistryService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<TraumaCaseDto>> SearchCasesAsync(TraumaCaseSearchDto? filter = null)
    {
        try
        {
            var query = _context.TraumaCases.Where(c => !c.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(c =>
                        c.CaseCode.ToLower().Contains(kw) ||
                        c.PatientName.ToLower().Contains(kw));
                }
                if (!string.IsNullOrEmpty(filter.InjuryType))
                    query = query.Where(c => c.InjuryType == filter.InjuryType);
                if (!string.IsNullOrEmpty(filter.TriageCategory))
                    query = query.Where(c => c.TriageCategory == filter.TriageCategory);
                if (!string.IsNullOrEmpty(filter.Outcome))
                    query = query.Where(c => c.Outcome == filter.Outcome);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(c => c.InjuryDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(c => c.InjuryDate <= to.AddDays(1));
            }

            var rows = await query
                .AsNoTracking()
                .OrderByDescending(c => c.CreatedAt)
                .Take(200)
                .ToListAsync();
            // QA-R3: patient code/name for the v2 "Mã BN" column (lookup, not Include: a required nav would
            // INNER JOIN away cases whose patient row is soft-deleted).
            var ids = rows.Select(r => r.PatientId).Distinct().ToList();
            var patients = await _context.Patients.IgnoreQueryFilters().AsNoTracking()
                .Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id);
            foreach (var r in rows) if (patients.TryGetValue(r.PatientId, out var p)) r.Patient = p;
            return rows.Select(MapToDto).ToList();
        }
        catch { return new List<TraumaCaseDto>(); }
    }

    public async Task<TraumaCaseDto?> GetByIdAsync(Guid id)
    {
        try
        {
            var c = await _context.TraumaCases.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
            if (c != null)
                c.Patient = await _context.Patients.IgnoreQueryFilters().AsNoTracking().FirstOrDefaultAsync(p => p.Id == c.PatientId);
            if (c == null) return null;
            return MapToDto(c);
        }
        catch { return null; }
    }

    public async Task<TraumaCaseDto> CreateCaseAsync(CreateTraumaCaseDto dto)
    {
        // QA-R3: the v2 form sends "Mã BN" (patient code) and no id, so every registration was rejected below.
        if ((!dto.PatientId.HasValue || dto.PatientId == Guid.Empty) && !string.IsNullOrWhiteSpace(dto.PatientCode))
        {
            var code = dto.PatientCode.Trim();
            var found = await _context.Patients.AsNoTracking().Where(p => p.PatientCode == code && !p.IsDeleted)
                .Select(p => new { p.Id, p.FullName }).FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException($"Không tìm thấy người bệnh mã {code}");
            dto.PatientId = found.Id;
            if (string.IsNullOrWhiteSpace(dto.PatientName)) dto.PatientName = found.FullName;
        }
        // TraumaCases.PatientId is a NOT NULL FK to Patients: a name-only case was written with Guid.Empty → FK 500.
        if (!dto.PatientId.HasValue || dto.PatientId == Guid.Empty || !await _context.Patients.AnyAsync(p => p.Id == dto.PatientId))
            throw new ArgumentException("Phải chọn người bệnh đã có hồ sơ trong hệ thống (nhập đúng mã BN)", nameof(dto.PatientId));
        ValidateScores(dto);
        ValidateStatus(dto.Status);

        var year = DateTime.UtcNow.Year;
        var count = await _context.TraumaCases.CountAsync(c => c.CreatedAt.Year == year) + 1;

        var entity = new TraumaCase
        {
            Id = Guid.NewGuid(),
            CaseCode = $"CT-{year}-{count:D4}",
            PatientId = dto.PatientId ?? Guid.Empty,
            PatientName = dto.PatientName ?? "",
            DateOfBirth = DateTime.TryParse(dto.DateOfBirth, out var dob) ? dob : null,
            Gender = dto.Gender,
            AdmissionDate = DateTime.TryParse(dto.AdmissionDate, out var ad) ? ad : HIS.Core.Common.VnTime.NowVn, // VN local
            InjuryDate = DateTime.TryParse(dto.InjuryDate, out var id2) ? id2 : HIS.Core.Common.VnTime.NowVn,
            InjuryType = dto.InjuryType ?? "other",
            InjuryMechanism = dto.InjuryMechanism,
            InjuryLocation = dto.InjuryLocation,
            InjurySeverityScore = dto.InjurySeverityScore,
            RevisedTraumaScore = dto.RevisedTraumaScore,
            GlasgowComaScale = dto.GlasgowComaScale,
            TriageCategory = dto.TriageCategory,
            Intentionality = dto.Intentionality,
            AlcoholInvolved = dto.AlcoholInvolved ?? false,
            TransportMode = dto.TransportMode,
            PreHospitalTime = dto.PreHospitalTime,
            SurgeryRequired = dto.SurgeryRequired ?? false,
            IcuAdmission = dto.IcuAdmission ?? dto.Status == 1,
            Notes = dto.Notes,
            // QA-R3: the form's status and attending doctor were silently dropped.
            Status = dto.Status ?? 0,
            AttendingDoctor = string.IsNullOrWhiteSpace(dto.AttendingDoctor) ? null : dto.AttendingDoctor.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        _context.TraumaCases.Add(entity);
        await _context.SaveChangesAsync();

        return MapToDto(entity);
    }

    public async Task<TraumaCaseDto> UpdateCaseAsync(Guid id, CreateTraumaCaseDto dto)
    {
        var entity = await _context.TraumaCases.FindAsync(id)
            ?? throw new KeyNotFoundException("Trauma case not found");
        ValidateScores(dto);

        if (dto.InjuryType != null) entity.InjuryType = dto.InjuryType;
        if (dto.InjuryMechanism != null) entity.InjuryMechanism = dto.InjuryMechanism;
        if (dto.InjuryLocation != null) entity.InjuryLocation = dto.InjuryLocation;
        if (dto.InjurySeverityScore.HasValue) entity.InjurySeverityScore = dto.InjurySeverityScore.Value;
        if (dto.RevisedTraumaScore.HasValue) entity.RevisedTraumaScore = dto.RevisedTraumaScore.Value;
        if (dto.GlasgowComaScale.HasValue) entity.GlasgowComaScale = dto.GlasgowComaScale.Value;
        if (dto.TriageCategory != null) entity.TriageCategory = dto.TriageCategory;
        if (dto.SurgeryRequired.HasValue) entity.SurgeryRequired = dto.SurgeryRequired.Value;
        if (dto.IcuAdmission.HasValue) entity.IcuAdmission = dto.IcuAdmission.Value;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        if (dto.AttendingDoctor != null) entity.AttendingDoctor = dto.AttendingDoctor.Trim();
        if (dto.Status.HasValue)
        {
            ValidateStatus(dto.Status);
            // A recorded outcome owns the terminal status (PUT cases/{id}/outcome); the form cannot contradict it.
            if (!string.IsNullOrEmpty(entity.Outcome) && dto.Status < 3)
                throw new InvalidOperationException("Ca đã ghi nhận kết cục ra viện/tử vong — không chuyển về trạng thái đang điều trị");
            entity.Status = dto.Status.Value;
            if (dto.Status == 1) entity.IcuAdmission = true;
        }
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToDto(entity);
    }

    private static readonly string[] TraumaOutcomes = { "discharged", "transferred", "died", "absconded" };

    // QA-R3: outcome / discharge date / LOS had no write path, so the outcome report and mortality/LOS stats could
    // only ever show seeded data.
    public async Task<TraumaCaseDto> UpdateOutcomeAsync(Guid id, UpdateTraumaOutcomeDto dto)
    {
        var entity = await _context.TraumaCases.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy ca chấn thương");
        var outcome = dto.Outcome?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(outcome) || !TraumaOutcomes.Contains(outcome))
            throw new ArgumentException("Kết cục không hợp lệ (discharged / transferred / died / absconded)", nameof(dto.Outcome));
        if (string.IsNullOrWhiteSpace(dto.DischargeDate) || !DateTime.TryParse(dto.DischargeDate, out var dischargeDate))
            throw new ArgumentException("Phải nhập ngày ra viện / tử vong hợp lệ", nameof(dto.DischargeDate));
        if (dischargeDate.Date > HIS.Core.Common.VnTime.TodayVn)
            throw new ArgumentException("Ngày ra viện không được ở tương lai", nameof(dto.DischargeDate));
        if (entity.AdmissionDate.HasValue && dischargeDate.Date < entity.AdmissionDate.Value.Date)
            throw new ArgumentException("Ngày ra viện không được trước ngày nhập viện", nameof(dto.DischargeDate));
        // Treatment days = discharge day − admission day + 1 (a same-day stay counts as one day).
        var computedLos = entity.AdmissionDate.HasValue ? (dischargeDate.Date - entity.AdmissionDate.Value.Date).Days + 1 : (int?)null;
        var los = dto.LengthOfStay ?? computedLos;
        if (los is < 0)
            throw new ArgumentException("Số ngày nằm viện không được âm", nameof(dto.LengthOfStay));
        if (dto.VentilatorDays is < 0 || (dto.VentilatorDays.HasValue && los.HasValue && dto.VentilatorDays > los))
            throw new ArgumentException("Số ngày thở máy phải từ 0 và không vượt số ngày nằm viện", nameof(dto.VentilatorDays));

        entity.Outcome = outcome;
        entity.DischargeDate = dischargeDate;
        entity.LengthOfStay = los;
        if (dto.VentilatorDays.HasValue) entity.VentilatorDays = dto.VentilatorDays;
        if (!string.IsNullOrWhiteSpace(dto.Notes))
            entity.Notes = string.IsNullOrWhiteSpace(entity.Notes) ? dto.Notes.Trim() : $"{entity.Notes}\n{dto.Notes.Trim()}";
        entity.Status = outcome == "died" ? 4 : 3;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return MapToDto(entity);
    }

    private static void ValidateStatus(int? status)
    {
        if (status is < 0 or > 4)
            throw new ArgumentException("Trạng thái ca chấn thương không hợp lệ (0-4)", nameof(status));
    }

    public async Task<TraumaStatsDto> GetStatsAsync()
    {
        try
        {
            var cases = await _context.TraumaCases.Where(c => !c.IsDeleted).ToListAsync();
            var total = cases.Count;
            var died = cases.Count(c => c.Outcome == "died");
            var withLos = cases.Where(c => c.LengthOfStay.HasValue).Select(c => c.LengthOfStay!.Value).ToList();

            return new TraumaStatsDto
            {
                TotalCases = total,
                SurgeryCount = cases.Count(c => c.SurgeryRequired),
                IcuCount = cases.Count(c => c.IcuAdmission),
                MortalityRate = total > 0 ? Math.Round((double)died / total * 100, 1) : 0,
                AvgLengthOfStay = withLos.Count > 0 ? Math.Round(withLos.Average(), 1) : 0,
                InjuryTypeBreakdown = cases.GroupBy(c => c.InjuryType)
                    .Select(g => new InjuryTypeBreakdownDto { InjuryType = g.Key, Count = g.Count() })
                    .ToList(),
                TriageCategoryBreakdown = cases.Where(c => c.TriageCategory != null).GroupBy(c => c.TriageCategory!)
                    .Select(g => new TriageCategoryBreakdownDto { Category = g.Key, Count = g.Count() })
                    .ToList(),
            };
        }
        catch { return new TraumaStatsDto(); }
    }

    public async Task<TraumaOutcomeReportDto> GetOutcomeReportAsync()
    {
        try
        {
            var cases = await _context.TraumaCases.Where(c => !c.IsDeleted && c.Outcome != null).ToListAsync();
            var withIss = cases.Where(c => c.InjurySeverityScore.HasValue).Select(c => (double)c.InjurySeverityScore!.Value).ToList();
            var withGcs = cases.Where(c => c.GlasgowComaScale.HasValue).Select(c => (double)c.GlasgowComaScale!.Value).ToList();
            var withPht = cases.Where(c => c.PreHospitalTime.HasValue).Select(c => (double)c.PreHospitalTime!.Value).ToList();

            return new TraumaOutcomeReportDto
            {
                TotalCases = cases.Count,
                DischargedCount = cases.Count(c => c.Outcome == "discharged"),
                TransferredCount = cases.Count(c => c.Outcome == "transferred"),
                DiedCount = cases.Count(c => c.Outcome == "died"),
                AbscondedCount = cases.Count(c => c.Outcome == "absconded"),
                AvgIss = withIss.Count > 0 ? Math.Round(withIss.Average(), 1) : 0,
                AvgGcs = withGcs.Count > 0 ? Math.Round(withGcs.Average(), 1) : 0,
                AvgPreHospitalTime = withPht.Count > 0 ? Math.Round(withPht.Average(), 1) : 0,
            };
        }
        catch { return new TraumaOutcomeReportDto(); }
    }

    // Clinical score ranges: GCS 3-15, ISS 0-75, RTS 0-7.8408. Out-of-range values corrupted AvgGcs/AvgIss reports.
    private static void ValidateScores(CreateTraumaCaseDto dto)
    {
        if (dto.GlasgowComaScale is < 3 or > 15)
            throw new ArgumentException("GCS phải trong khoảng 3 – 15", nameof(dto.GlasgowComaScale));
        if (dto.InjurySeverityScore is < 0 or > 75)
            throw new ArgumentException("ISS phải trong khoảng 0 – 75", nameof(dto.InjurySeverityScore));
        if (dto.RevisedTraumaScore.HasValue && (dto.RevisedTraumaScore < 0 || dto.RevisedTraumaScore > 7.8408m))
            throw new ArgumentException("RTS phải trong khoảng 0 – 7.84", nameof(dto.RevisedTraumaScore));
    }

    private static TraumaCaseDto MapToDto(TraumaCase c) => new()
    {
        Id = c.Id,
        CaseCode = c.CaseCode,
        PatientId = c.PatientId,
        PatientName = string.IsNullOrWhiteSpace(c.PatientName) ? c.Patient?.FullName ?? "" : c.PatientName,
        PatientCode = c.Patient?.PatientCode,
        DateOfBirth = c.DateOfBirth?.ToString("yyyy-MM-dd"),
        Gender = c.Gender,
        AdmissionDate = c.AdmissionDate?.ToString("yyyy-MM-ddTHH:mm:ss"),
        InjuryDate = c.InjuryDate?.ToString("yyyy-MM-ddTHH:mm:ss"),
        InjuryType = c.InjuryType,
        InjuryMechanism = c.InjuryMechanism,
        InjuryLocation = c.InjuryLocation,
        InjurySeverityScore = c.InjurySeverityScore,
        RevisedTraumaScore = c.RevisedTraumaScore,
        GlasgowComaScale = c.GlasgowComaScale,
        TriageCategory = c.TriageCategory,
        Intentionality = c.Intentionality,
        AlcoholInvolved = c.AlcoholInvolved,
        TransportMode = c.TransportMode,
        PreHospitalTime = c.PreHospitalTime,
        SurgeryRequired = c.SurgeryRequired,
        IcuAdmission = c.IcuAdmission,
        VentilatorDays = c.VentilatorDays,
        LengthOfStay = c.LengthOfStay,
        Outcome = c.Outcome,
        DischargeDate = c.DischargeDate?.ToString("yyyy-MM-dd"),
        Notes = c.Notes,
        Status = c.Status ?? (c.Outcome == "died" ? 4 : c.DischargeDate != null || c.Outcome != null ? 3 : c.IcuAdmission ? 1 : 0),
        AttendingDoctor = c.AttendingDoctor,
    };
}
