using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class MentalHealthService : IMentalHealthService
{
    private readonly HISDbContext _context;

    public MentalHealthService(HISDbContext context)
    {
        _context = context;
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
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(c => c.CreatedAt >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(c => c.CreatedAt <= to.AddDays(1));
            }

            return await query
                .OrderByDescending(c => c.CreatedAt)
                .Take(200)
                .Select(c => new MentalHealthCaseDto
                {
                    Id = c.Id,
                    CaseCode = c.CaseCode,
                    PatientId = c.PatientId,
                    PatientName = c.PatientName,
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
        catch { return new List<MentalHealthCaseDto>(); }
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
        catch { return null; }
    }

    public async Task<MentalHealthCaseDto> CreateCaseAsync(CreateMentalHealthCaseDto dto)
    {
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
        var entity = await _context.MentalHealthCases.FindAsync(id)
            ?? throw new InvalidOperationException("Mental health case not found");

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
        var entity = new PsychiatricAssessment
        {
            Id = Guid.NewGuid(),
            CaseId = dto.CaseId ?? Guid.Empty,
            AssessmentDate = DateTime.TryParse(dto.AssessmentDate, out var ad) ? ad : DateTime.UtcNow,
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
        if (mhCase != null)
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
                .ToListAsync();
        }
        catch { return new List<PsychiatricAssessmentDto>(); }
    }

    public async Task<MentalHealthStatsDto> GetStatsAsync()
    {
        try
        {
            var cases = await _context.MentalHealthCases.Where(c => !c.IsDeleted).ToListAsync();
            var now = DateTime.UtcNow;

            return new MentalHealthStatsDto
            {
                TotalCases = cases.Count,
                ActiveCount = cases.Count(c => c.Status == 0),
                StableCount = cases.Count(c => c.Status == 1),
                OverdueFollowUps = cases.Count(c => c.Status == 0 && c.NextVisitDate.HasValue && c.NextVisitDate.Value < now),
                CaseTypeBreakdown = cases.GroupBy(c => c.CaseType)
                    .Select(g => new MentalHealthCaseTypeBreakdownDto { CaseType = g.Key, Count = g.Count() })
                    .ToList(),
                SeverityBreakdown = cases.GroupBy(c => c.Severity)
                    .Select(g => new MentalHealthSeverityBreakdownDto { Severity = g.Key, Count = g.Count() })
                    .ToList(),
            };
        }
        catch { return new MentalHealthStatsDto(); }
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
        catch { return new List<MentalHealthCaseDto>(); }
    }

    public Task<ScreeningResultDto> ScreenDepressionAsync(Guid caseId, int phq9Score)
    {
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
