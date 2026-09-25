using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public class MentalHealthService : IMentalHealthService
{
    private readonly HISDbContext _context;
    private readonly ILogger<MentalHealthService> _logger;

    public MentalHealthService(HISDbContext context, ILogger<MentalHealthService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<MentalHealthCaseDto>> SearchCasesAsync(MentalHealthCaseSearchDto? filter = null)
    {
        try
        {
            var query = _context.MentalHealthCases.Where(c => !c.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(c =>
                        c.CaseCode.ToLower().Contains(kw) ||
                        c.PatientName.ToLower().Contains(kw) ||
                        (c.DiagnosisName != null && c.DiagnosisName.ToLower().Contains(kw)));
                }
                if (!string.IsNullOrEmpty(filter.CaseType))
                    query = query.Where(c => c.CaseType == filter.CaseType);
                if (filter.Status.HasValue)
                    query = query.Where(c => c.Status == filter.Status.Value);
                if (!string.IsNullOrEmpty(filter.Severity))
                    query = query.Where(c => c.Severity == filter.Severity);
                // QA-R11: CreatedAt is UTC and the page picks VN calendar days → shift by +7h, inclusive end day.
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                {
                    var fromUtc = from.Date.AddHours(-7);
                    query = query.Where(c => c.CreatedAt >= fromUtc);
                }
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                {
                    var toUtcExclusive = to.Date.AddDays(1).AddHours(-7);
                    query = query.Where(c => c.CreatedAt < toUtcExclusive);
                }
            }

            return await query
                .OrderByDescending(c => c.CreatedAt)
                .ThenBy(c => c.Id)
                .Take(200)
                .Select(c => new MentalHealthCaseDto
                {
                    Id = c.Id,
                    CaseCode = c.CaseCode,
                    PatientId = c.PatientId,
                    PatientName = c.PatientName,
                    PatientCode = _context.Patients.Where(p => p.Id == c.PatientId).Select(p => p.PatientCode).FirstOrDefault(),
                    DateOfBirth = c.DateOfBirth.HasValue ? c.DateOfBirth.Value.ToString("yyyy-MM-dd") : null,
                    Gender = c.Gender,
                    DiagnosisCode = c.DiagnosisCode,
                    DiagnosisName = c.DiagnosisName,
                    Severity = c.Severity,
                    CaseType = c.CaseType,
                    TreatingDoctor = c.TreatingDoctor,
                    CommunityWorker = c.CommunityWorker,
                    MedicationRegimen = c.MedicationRegimen,
                    AdherenceLevel = c.AdherenceLevel,
                    LastVisitDate = c.LastVisitDate.HasValue ? c.LastVisitDate.Value.ToString("yyyy-MM-dd") : null,
                    NextVisitDate = c.NextVisitDate.HasValue ? c.NextVisitDate.Value.ToString("yyyy-MM-dd") : null,
                    Status = c.Status,
                    Notes = c.Notes,
                })
                .ToListAsync();
        }
        catch (Exception ex) { _logger.LogWarning(ex, "MentalHealthService thao tác thất bại, trả giá trị mặc định"); return new List<MentalHealthCaseDto>(); }
    }

    public async Task<MentalHealthCaseDetailDto?> GetByIdAsync(Guid id)
    {
        try
        {
            var c = await _context.MentalHealthCases
                .Include(x => x.Assessments.Where(a => !a.IsDeleted))
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
            if (c == null) return null;

            return new MentalHealthCaseDetailDto
            {
                Id = c.Id,
                CaseCode = c.CaseCode,
                PatientId = c.PatientId,
                PatientName = c.PatientName,
                DateOfBirth = c.DateOfBirth?.ToString("yyyy-MM-dd"),
                Gender = c.Gender,
                DiagnosisCode = c.DiagnosisCode,
                DiagnosisName = c.DiagnosisName,
                Severity = c.Severity,
                CaseType = c.CaseType,
                TreatingDoctor = c.TreatingDoctor,
                CommunityWorker = c.CommunityWorker,
                MedicationRegimen = c.MedicationRegimen,
                AdherenceLevel = c.AdherenceLevel,
                LastVisitDate = c.LastVisitDate?.ToString("yyyy-MM-dd"),
                NextVisitDate = c.NextVisitDate?.ToString("yyyy-MM-dd"),
                Status = c.Status,
                Notes = c.Notes,
                EmergencyContactName = c.EmergencyContactName,
                EmergencyContactPhone = c.EmergencyContactPhone,
                Assessments = c.Assessments.OrderByDescending(a => a.AssessmentDate).Select(a => new PsychiatricAssessmentDto
                {
                    Id = a.Id,
                    CaseId = a.CaseId,
                    AssessmentDate = a.AssessmentDate.ToString("yyyy-MM-ddTHH:mm:ss"),
                    AssessmentType = a.AssessmentType,
                    TotalScore = a.TotalScore,
                    Interpretation = a.Interpretation,
                    Findings = a.Findings,
                    Recommendations = a.Recommendations,
                    AssessorName = a.AssessorName,
                    Notes = a.Notes,
                }).ToList(),
            };
        }
        catch (Exception ex) { _logger.LogWarning(ex, "MentalHealthService thao tác thất bại, trả giá trị mặc định"); return null; }
    }

    private static readonly HashSet<string> Severities = new() { "mild", "moderate", "severe" };
    private static readonly HashSet<string> Adherence = new() { "good", "moderate", "poor" };

    public async Task<MentalHealthCaseDto> CreateCaseAsync(CreateMentalHealthCaseDto dto)
    {
        // QA-R11: link the HIS patient (name/DOB/gender from the patient record) — the form used to post a
        // free-text name only, so every case had PatientId = Guid.Empty and no patient code.
        if (dto.PatientId.HasValue && dto.PatientId.Value != Guid.Empty)
        {
            var p = await _context.Patients.FirstOrDefaultAsync(x => x.Id == dto.PatientId.Value && !x.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy bệnh nhân.");
            dto.PatientName ??= p.FullName;
            dto.DateOfBirth ??= p.DateOfBirth?.ToString("yyyy-MM-dd");
            dto.Gender ??= p.Gender;
            if (await _context.MentalHealthCases.AnyAsync(c => c.PatientId == p.Id && !c.IsDeleted && c.Status != 3
                    && c.CaseType == (dto.CaseType ?? "other")))
                throw new InvalidOperationException("Bệnh nhân đã có hồ sơ tâm thần cùng loại đang quản lý.");
        }
        if (string.IsNullOrWhiteSpace(dto.PatientName))
            throw new ArgumentException("Chưa chọn bệnh nhân.", nameof(dto.PatientName));
        if (dto.Severity != null && !Severities.Contains(dto.Severity))
            throw new ArgumentException("Mức độ không hợp lệ.", nameof(dto.Severity));
        var year = DateTime.UtcNow.Year;
        var count = await _context.MentalHealthCases.CountAsync(c => c.CreatedAt.Year == year) + 1;

        var entity = new MentalHealthCase
        {
            Id = Guid.NewGuid(),
            CaseCode = $"SKTT-{year}-{count:D4}",
            PatientId = dto.PatientId ?? Guid.Empty,
            PatientName = dto.PatientName ?? "",
            DateOfBirth = DateTime.TryParse(dto.DateOfBirth, out var dob) ? dob : null,
            Gender = dto.Gender,
            DiagnosisCode = dto.DiagnosisCode,
            DiagnosisName = dto.DiagnosisName,
            Severity = dto.Severity ?? "moderate",
            CaseType = dto.CaseType ?? "other",
            TreatingDoctor = dto.TreatingDoctor,
            CommunityWorker = dto.CommunityWorker,
            MedicationRegimen = dto.MedicationRegimen,
            EmergencyContactName = dto.EmergencyContactName,
            EmergencyContactPhone = dto.EmergencyContactPhone,
            Notes = dto.Notes,
            Status = 0,
            CreatedAt = DateTime.UtcNow,
        };

        _context.MentalHealthCases.Add(entity);
        await _context.SaveChangesAsync();

        return new MentalHealthCaseDto { Id = entity.Id, CaseCode = entity.CaseCode, PatientName = entity.PatientName, CaseType = entity.CaseType, Status = entity.Status };
    }

    public async Task<MentalHealthCaseDto> UpdateCaseAsync(Guid id, CreateMentalHealthCaseDto dto)
    {
        var entity = await _context.MentalHealthCases.FindAsync(id);
        if (entity == null || entity.IsDeleted) throw new KeyNotFoundException("Không tìm thấy ca tâm thần.");
        if (dto.Status is < 0 or > 3)
            throw new ArgumentException("Trạng thái ca không hợp lệ.", nameof(dto.Status));
        if (dto.Severity != null && !Severities.Contains(dto.Severity))
            throw new ArgumentException("Mức độ không hợp lệ.", nameof(dto.Severity));
        if (dto.AdherenceLevel != null && !Adherence.Contains(dto.AdherenceLevel))
            throw new ArgumentException("Mức tuân thủ không hợp lệ.", nameof(dto.AdherenceLevel));
        // QA-R11: status / adherence / next visit / case type were never saved → the "Ổn định / Thuyên giảm /
        // Đã xuất viện" tabs could never fill and "Quá hạn tái khám" had no input.
        if (dto.Status.HasValue) entity.Status = dto.Status.Value;
        if (dto.AdherenceLevel != null) entity.AdherenceLevel = dto.AdherenceLevel;
        if (DateTime.TryParse(dto.NextVisitDate, out var nvd)) entity.NextVisitDate = nvd;
        if (dto.CaseType != null) entity.CaseType = dto.CaseType;

        if (dto.DiagnosisCode != null) entity.DiagnosisCode = dto.DiagnosisCode;
        if (dto.DiagnosisName != null) entity.DiagnosisName = dto.DiagnosisName;
        if (dto.Severity != null) entity.Severity = dto.Severity;
        if (dto.TreatingDoctor != null) entity.TreatingDoctor = dto.TreatingDoctor;
        if (dto.CommunityWorker != null) entity.CommunityWorker = dto.CommunityWorker;
        if (dto.MedicationRegimen != null) entity.MedicationRegimen = dto.MedicationRegimen;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new MentalHealthCaseDto { Id = entity.Id, CaseCode = entity.CaseCode, PatientName = entity.PatientName, CaseType = entity.CaseType, Status = entity.Status };
    }

    public async Task<PsychiatricAssessmentDto> AddAssessmentAsync(CreatePsychiatricAssessmentDto dto)
    {
        // QA-R11: an assessment without a (live) case was stored as an orphan with CaseId = Guid.Empty.
        if (!dto.CaseId.HasValue || !await _context.MentalHealthCases.AnyAsync(c => c.Id == dto.CaseId.Value && !c.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy ca tâm thần.");
        if (dto.TotalScore < 0)
            throw new ArgumentException("Điểm đánh giá không được âm.", nameof(dto.TotalScore));
        if (string.Equals(dto.AssessmentType, "PHQ9", StringComparison.OrdinalIgnoreCase) && dto.TotalScore > 27)
            throw new ArgumentException("Điểm PHQ-9 phải trong khoảng 0-27.", nameof(dto.TotalScore));
        var entity = new PsychiatricAssessment
        {
            Id = Guid.NewGuid(),
            CaseId = dto.CaseId ?? Guid.Empty,
            AssessmentDate = DateTime.TryParse(dto.AssessmentDate, out var ad) ? ad : HIS.Core.Common.VnTime.NowVn,
            AssessmentType = dto.AssessmentType ?? "custom",
            TotalScore = dto.TotalScore ?? 0,
            Interpretation = dto.Interpretation,
            Findings = dto.Findings,
            Recommendations = dto.Recommendations,
            AssessorName = dto.AssessorName,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.PsychiatricAssessments.Add(entity);

        // Update last visit date on the case
        var mhCase = await _context.MentalHealthCases.FindAsync(dto.CaseId);
        if (mhCase != null && (!mhCase.LastVisitDate.HasValue || entity.AssessmentDate >= mhCase.LastVisitDate.Value))
        {
            mhCase.LastVisitDate = entity.AssessmentDate;
            mhCase.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return new PsychiatricAssessmentDto
        {
            Id = entity.Id,
            CaseId = entity.CaseId,
            AssessmentDate = entity.AssessmentDate.ToString("yyyy-MM-ddTHH:mm:ss"),
            AssessmentType = entity.AssessmentType,
            TotalScore = entity.TotalScore,
            Interpretation = entity.Interpretation,
            Findings = entity.Findings,
            Recommendations = entity.Recommendations,
            AssessorName = entity.AssessorName,
            Notes = entity.Notes,
        };
    }

    public async Task<List<PsychiatricAssessmentDto>> GetAssessmentsAsync(Guid caseId)
    {
        try
        {
            return await _context.PsychiatricAssessments
                .Where(a => a.CaseId == caseId && !a.IsDeleted)
                .OrderByDescending(a => a.AssessmentDate)
                .Select(a => new PsychiatricAssessmentDto
                {
                    Id = a.Id,
                    CaseId = a.CaseId,
                    AssessmentDate = a.AssessmentDate.ToString("yyyy-MM-ddTHH:mm:ss"),
                    AssessmentType = a.AssessmentType,
                    TotalScore = a.TotalScore,
                    Interpretation = a.Interpretation,
                    Findings = a.Findings,
                    Recommendations = a.Recommendations,
                    AssessorName = a.AssessorName,
                    Notes = a.Notes,
                })
                .ToBoundedListAsync("MentalHealth.GetAssessments");
        }
        catch (Exception ex) { _logger.LogWarning(ex, "MentalHealthService thao tác thất bại, trả giá trị mặc định"); return new List<PsychiatricAssessmentDto>(); }
    }

    public async Task<MentalHealthStatsDto> GetStatsAsync()
    {
        try
        {
            var cases = await _context.MentalHealthCases.Where(c => !c.IsDeleted).ToListAsync();
            var now = DateTime.UtcNow;
            var todayVn = HIS.Core.Common.VnTime.TodayVn;
            var monthStart = new DateTime(todayVn.Year, todayVn.Month, 1);
            var assessmentsThisMonth = await _context.PsychiatricAssessments
                .CountAsync(a => !a.IsDeleted && a.AssessmentDate >= monthStart && a.AssessmentDate < monthStart.AddMonths(1));

            return new MentalHealthStatsDto
            {
                TotalCases = cases.Count,
                ActiveCount = cases.Count(c => c.Status == 0),
                StableCount = cases.Count(c => c.Status == 1),
                AssessmentsThisMonth = assessmentsThisMonth,
                OverdueFollowUps = cases.Count(c => c.Status == 0 && c.NextVisitDate.HasValue && c.NextVisitDate.Value < now),
                CaseTypeBreakdown = cases.GroupBy(c => c.CaseType)
                    .Select(g => new MentalHealthCaseTypeBreakdownDto { CaseType = g.Key, Count = g.Count() })
                    .ToList(),
                SeverityBreakdown = cases.GroupBy(c => c.Severity)
                    .Select(g => new MentalHealthSeverityBreakdownDto { Severity = g.Key, Count = g.Count() })
                    .ToList(),
            };
        }
        catch (Exception ex) { _logger.LogWarning(ex, "MentalHealthService thao tác thất bại, trả giá trị mặc định"); return new MentalHealthStatsDto(); }
    }

    public async Task<List<MentalHealthCaseDto>> GetOverdueFollowUpsAsync()
    {
        try
        {
            var now = DateTime.UtcNow;
            return await _context.MentalHealthCases
                .Where(c => !c.IsDeleted && c.Status == 0 && c.NextVisitDate.HasValue && c.NextVisitDate.Value < now)
                .OrderBy(c => c.NextVisitDate)
                .Take(100)
                .Select(c => new MentalHealthCaseDto
                {
                    Id = c.Id,
                    CaseCode = c.CaseCode,
                    PatientId = c.PatientId,
                    PatientName = c.PatientName,
                    CaseType = c.CaseType,
                    Severity = c.Severity,
                    NextVisitDate = c.NextVisitDate!.Value.ToString("yyyy-MM-dd"),
                    Status = c.Status,
                })
                .ToListAsync();
        }
        catch (Exception ex) { _logger.LogWarning(ex, "MentalHealthService thao tác thất bại, trả giá trị mặc định"); return new List<MentalHealthCaseDto>(); }
    }

    public Task<ScreeningResultDto> ScreenDepressionAsync(Guid caseId, int phq9Score)
    {
        // 9 items × 0..3 — out-of-range scores (e.g. -5 → "no depression") must not produce an interpretation.
        if (phq9Score < 0 || phq9Score > 27)
            throw new ArgumentException("Điểm PHQ-9 phải trong khoảng 0-27.");
        var (interpretation, severity) = phq9Score switch
        {
            <= 4 => ("Không có triệu chứng trầm cảm", "none"),
            <= 9 => ("Trầm cảm nhẹ", "mild"),
            <= 14 => ("Trầm cảm vừa", "moderate"),
            <= 19 => ("Trầm cảm nặng vừa", "moderately_severe"),
            _ => ("Trầm cảm nặng", "severe"),
        };

        var recommendation = phq9Score switch
        {
            <= 4 => "Theo dõi định kỳ",
            <= 9 => "Tư vấn tâm lý, theo dõi 2 tuần",
            <= 14 => "Cân nhắc dùng thuốc chống trầm cảm + tâm lý trị liệu",
            <= 19 => "Dùng thuốc chống trầm cảm + tâm lý trị liệu. Xem xét chuyển chuyên khoa",
            _ => "Cần can thiệp ngay. Đánh giá nguy cơ tự sát. Chuyển chuyên khoa tâm thần",
        };

        return Task.FromResult(new ScreeningResultDto
        {
            AssessmentType = "phq9",
            Score = phq9Score,
            Interpretation = interpretation,
            Severity = severity,
            Recommendation = recommendation,
        });
    }
}
