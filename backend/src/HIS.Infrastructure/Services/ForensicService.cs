using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class ForensicService : IForensicService
{
    private readonly HISDbContext _context;

    public ForensicService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<ForensicCaseDto>> SearchCasesAsync(ForensicCaseSearchDto? filter = null)
    {
        try
        {
            var query = _context.ForensicCases.Where(c => !c.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(c =>
                        c.CaseCode.ToLower().Contains(kw) ||
                        c.PatientName.ToLower().Contains(kw) ||
                        (c.Cccd != null && c.Cccd.Contains(kw)));
                }
                if (!string.IsNullOrEmpty(filter.CaseType))
                    query = query.Where(c => c.CaseType == filter.CaseType);
                if (filter.Status.HasValue)
                    query = query.Where(c => c.Status == filter.Status.Value);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(c => c.RequestDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(c => c.RequestDate <= to.AddDays(1));
            }

            return await query
                .OrderByDescending(c => c.CreatedAt)
                .Take(200)
                .Select(c => new ForensicCaseDto
                {
                    Id = c.Id,
                    CaseCode = c.CaseCode,
                    CaseType = c.CaseType,
                    PatientName = c.PatientName,
                    Cccd = c.Cccd,
                    Gender = c.Gender,
                    DateOfBirth = c.DateOfBirth.HasValue ? c.DateOfBirth.Value.ToString("yyyy-MM-dd") : null,
                    RequestingOrganization = c.RequestingOrganization,
                    RequestDate = c.RequestDate.HasValue ? c.RequestDate.Value.ToString("yyyy-MM-ddTHH:mm:ss") : null,
                    ExaminationDate = c.ExaminationDate.HasValue ? c.ExaminationDate.Value.ToString("yyyy-MM-ddTHH:mm:ss") : null,
                    Status = c.Status,
                    DisabilityPercentage = c.DisabilityPercentage,
                    Conclusion = c.Conclusion,
                })
                .ToListAsync();
        }
        catch { return new List<ForensicCaseDto>(); }
    }

    public async Task<ForensicCaseDetailDto?> GetCaseByIdAsync(Guid id)
    {
        try
        {
            var c = await _context.ForensicCases
                .Include(x => x.Examinations.Where(e => !e.IsDeleted))
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
            if (c == null) return null;

            return new ForensicCaseDetailDto
            {
                Id = c.Id,
                CaseCode = c.CaseCode,
                CaseType = c.CaseType,
                PatientId = c.PatientId,
                PatientName = c.PatientName,
                Cccd = c.Cccd,
                Gender = c.Gender,
                DateOfBirth = c.DateOfBirth?.ToString("yyyy-MM-dd"),
                RequestingOrganization = c.RequestingOrganization,
                RequestDate = c.RequestDate?.ToString("yyyy-MM-ddTHH:mm:ss"),
                ExaminationDate = c.ExaminationDate?.ToString("yyyy-MM-ddTHH:mm:ss"),
                Status = c.Status,
                DisabilityPercentage = c.DisabilityPercentage,
                Conclusion = c.Conclusion,
                CouncilMembers = c.CouncilMembers,
                Notes = c.Notes,
                Examinations = c.Examinations.Select(e => new ForensicExaminationDto
                {
                    Id = e.Id,
                    ForensicCaseId = e.ForensicCaseId,
                    ExamCategory = e.ExamCategory,
                    Findings = e.Findings,
                    FunctionScore = e.FunctionScore,
                    DisabilityScore = e.DisabilityScore,
                    ExaminerName = e.ExaminerName,
                    Notes = e.Notes,
                }).ToList(),
            };
        }
        catch { return null; }
    }

    public async Task<ForensicCaseDto> CreateCaseAsync(CreateForensicCaseDto dto)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _context.ForensicCases.CountAsync(c => c.CreatedAt.Year == year) + 1;

        var entity = new ForensicCase
        {
            Id = Guid.NewGuid(),
            CaseCode = $"GD-{year}-{count:D4}",
            CaseType = dto.CaseType ?? "disability",
            PatientId = dto.PatientId ?? Guid.Empty,
            PatientName = dto.PatientName ?? "",
            DateOfBirth = DateTime.TryParse(dto.DateOfBirth, out var dob) ? dob : null,
            Gender = dto.Gender,
            Cccd = dto.Cccd,
            RequestingOrganization = dto.RequestingOrganization,
            RequestDate = DateTime.TryParse(dto.RequestDate, out var rd) ? rd : DateTime.UtcNow,
            ExaminationDate = DateTime.TryParse(dto.ExaminationDate, out var ed) ? ed : null,
            CouncilMembers = dto.CouncilMembers,
            Notes = dto.Notes,
            Status = 0,
            CreatedAt = DateTime.UtcNow,
        };

        _context.ForensicCases.Add(entity);
        await _context.SaveChangesAsync();

        return new ForensicCaseDto
        {
            Id = entity.Id,
            CaseCode = entity.CaseCode,
            CaseType = entity.CaseType,
            PatientName = entity.PatientName,
            Status = entity.Status,
        };
    }

    public async Task<ForensicCaseDto> UpdateCaseAsync(Guid id, CreateForensicCaseDto dto)
    {
        var entity = await _context.ForensicCases.FindAsync(id)
            ?? throw new InvalidOperationException("Forensic case not found");

        if (dto.CaseType != null) entity.CaseType = dto.CaseType;
        if (dto.PatientName != null) entity.PatientName = dto.PatientName;
        if (dto.Cccd != null) entity.Cccd = dto.Cccd;
        if (dto.RequestingOrganization != null) entity.RequestingOrganization = dto.RequestingOrganization;
        if (dto.CouncilMembers != null) entity.CouncilMembers = dto.CouncilMembers;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        if (DateTime.TryParse(dto.ExaminationDate, out var ed)) entity.ExaminationDate = ed;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new ForensicCaseDto
        {
            Id = entity.Id,
            CaseCode = entity.CaseCode,
            CaseType = entity.CaseType,
            PatientName = entity.PatientName,
            Status = entity.Status,
            DisabilityPercentage = entity.DisabilityPercentage,
            Conclusion = entity.Conclusion,
        };
    }

    public async Task<List<ForensicExaminationDto>> GetExaminationsAsync(Guid caseId)
    {
        try
        {
            return await _context.ForensicExaminations
                .Where(e => e.ForensicCaseId == caseId && !e.IsDeleted)
                .OrderBy(e => e.CreatedAt)
                .Select(e => new ForensicExaminationDto
                {
                    Id = e.Id,
                    ForensicCaseId = e.ForensicCaseId,
                    ExamCategory = e.ExamCategory,
                    Findings = e.Findings,
                    FunctionScore = e.FunctionScore,
                    DisabilityScore = e.DisabilityScore,
                    ExaminerName = e.ExaminerName,
                    Notes = e.Notes,
                })
                .ToListAsync();
        }
        catch { return new List<ForensicExaminationDto>(); }
    }

    public async Task<ForensicExaminationDto> AddExaminationAsync(CreateForensicExaminationDto dto)
    {
        var entity = new ForensicExamination
        {
            Id = Guid.NewGuid(),
            ForensicCaseId = dto.ForensicCaseId ?? Guid.Empty,
            ExamCategory = dto.ExamCategory ?? "general",
            Findings = dto.Findings,
            FunctionScore = dto.FunctionScore,
            DisabilityScore = dto.DisabilityScore,
            ExaminerName = dto.ExaminerName,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.ForensicExaminations.Add(entity);

        // Update case status to examining
        var forensicCase = await _context.ForensicCases.FindAsync(dto.ForensicCaseId);
        if (forensicCase != null && forensicCase.Status == 0)
        {
            forensicCase.Status = 1;
            forensicCase.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return new ForensicExaminationDto
        {
            Id = entity.Id,
            ForensicCaseId = entity.ForensicCaseId,
            ExamCategory = entity.ExamCategory,
            Findings = entity.Findings,
            FunctionScore = entity.FunctionScore,
            DisabilityScore = entity.DisabilityScore,
            ExaminerName = entity.ExaminerName,
            Notes = entity.Notes,
        };
    }

    public async Task<ForensicCaseDto> ApproveCaseAsync(Guid id, decimal? disabilityPercentage, string? conclusion)
    {
        var entity = await _context.ForensicCases.FindAsync(id)
            ?? throw new InvalidOperationException("Forensic case not found");

        entity.Status = 3; // approved
        entity.DisabilityPercentage = disabilityPercentage;
        entity.Conclusion = conclusion;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new ForensicCaseDto
        {
            Id = entity.Id,
            CaseCode = entity.CaseCode,
            CaseType = entity.CaseType,
            PatientName = entity.PatientName,
            Status = entity.Status,
            DisabilityPercentage = entity.DisabilityPercentage,
            Conclusion = entity.Conclusion,
        };
    }

    public async Task<ForensicStatsDto> GetStatsAsync()
    {
        try
        {
            var cases = await _context.ForensicCases.Where(c => !c.IsDeleted).ToListAsync();
            return new ForensicStatsDto
            {
                TotalCases = cases.Count,
                PendingCount = cases.Count(c => c.Status == 0),
                CompletedCount = cases.Count(c => c.Status == 2),
                ApprovedCount = cases.Count(c => c.Status == 3),
                CaseTypeBreakdown = cases.GroupBy(c => c.CaseType)
                    .Select(g => new ForensicCaseTypeBreakdownDto { CaseType = g.Key, Count = g.Count() })
                    .ToList(),
            };
        }
        catch { return new ForensicStatsDto(); }
    }

    public Task<byte[]> PrintCertificateAsync(Guid caseId)
    {
        return Task.FromResult(Array.Empty<byte>());
    }
}
