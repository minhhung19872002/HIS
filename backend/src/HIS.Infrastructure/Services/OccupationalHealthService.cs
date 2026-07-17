using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using System.Text;

namespace HIS.Infrastructure.Services;

public class OccupationalHealthService : IOccupationalHealthService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public OccupationalHealthService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }

    public async Task<OccHealthPagedResult> GetRecordsAsync(OccHealthSearchDto2 filter)
    {
        var query = _context.OccupationalHealthExams
            .Where(o => !o.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(o =>
                o.EmployeeName.ToLower().Contains(kw) ||
                (o.EmployeeCode != null && o.EmployeeCode.ToLower().Contains(kw)) ||
                o.CompanyName.ToLower().Contains(kw));
        }

        if (!string.IsNullOrWhiteSpace(filter.CompanyName))
            query = query.Where(o => o.CompanyName.Contains(filter.CompanyName.Trim()));

        if (!string.IsNullOrWhiteSpace(filter.ExamType))
            query = query.Where(o => o.ExamType == filter.ExamType.Trim());

        if (!string.IsNullOrWhiteSpace(filter.Classification))
            query = query.Where(o => o.Classification == filter.Classification.Trim());

        if (filter.FromDate.HasValue)
            query = query.Where(o => o.ExamDate >= filter.FromDate.Value.Date);

        if (filter.ToDate.HasValue)
            query = query.Where(o => o.ExamDate <= filter.ToDate.Value.Date);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(o => o.ExamDate)
            .ThenBy(o => o.CompanyName)
            .ThenBy(o => o.EmployeeName)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(o => MapToListDto(o))
            .ToListAsync();

        return new OccHealthPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        };
    }

    public async Task<OccHealthListDto> CreateAsync(CreateOccHealthDto2 dto)
    {
        var entity = new OccupationalHealthExam
        {
            Id = Guid.NewGuid(),
            EmployeeName = dto.EmployeeName.Trim(),
            EmployeeCode = dto.EmployeeCode?.Trim(),
            CompanyName = dto.CompanyName.Trim(),
            Department = dto.Department?.Trim(),
            JobTitle = dto.JobTitle?.Trim(),
            ExamDate = dto.ExaminationDate,
            ExamType = dto.ExaminationType.Trim(),
            HazardExposure = dto.HazardExposure?.Trim(),
            Classification = dto.Classification?.Trim(),
            OccupationalDisease = dto.OccupationalDisease?.Trim(),
            Recommendations = dto.Recommendations?.Trim(),
            DoctorName = dto.DoctorId.HasValue
                ? await _context.Users.Where(u => u.Id == dto.DoctorId).Select(u => u.FullName).FirstOrDefaultAsync()
                : null,
            Notes = dto.Notes?.Trim(),
            Status = 1,
            CreatedAt = DateTime.UtcNow
        };

        _context.OccupationalHealthExams.Add(entity);
        await _unitOfWork.SaveChangesAsync();
        return MapToListDto(entity);
    }

    public async Task<OccHealthListDto> UpdateAsync(Guid id, CreateOccHealthDto2 dto)
    {
        var entity = await _context.OccupationalHealthExams.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted)
            ?? throw new InvalidOperationException("Occupational health record not found");

        entity.EmployeeName = dto.EmployeeName.Trim();
        entity.EmployeeCode = dto.EmployeeCode?.Trim();
        entity.CompanyName = dto.CompanyName.Trim();
        entity.Department = dto.Department?.Trim();
        entity.JobTitle = dto.JobTitle?.Trim();
        entity.ExamDate = dto.ExaminationDate;
        entity.ExamType = dto.ExaminationType.Trim();
        entity.HazardExposure = dto.HazardExposure?.Trim();
        entity.Classification = dto.Classification?.Trim();
        entity.OccupationalDisease = dto.OccupationalDisease?.Trim();
        entity.Recommendations = dto.Recommendations?.Trim();
        entity.Notes = dto.Notes?.Trim();
        entity.UpdatedAt = DateTime.UtcNow;

        if (dto.DoctorId.HasValue)
            entity.DoctorName = await _context.Users.Where(u => u.Id == dto.DoctorId).Select(u => u.FullName).FirstOrDefaultAsync();

        await _unitOfWork.SaveChangesAsync();
        return MapToListDto(entity);
    }

    public async Task<OccHealthStatisticsDto2> GetStatisticsAsync()
    {
        var all = await _context.OccupationalHealthExams.Where(o => !o.IsDeleted).ToListAsync();

        var classificationMap = new Dictionary<string, string>
        {
            { "Fit", "Fit" },
            { "FitWithRestriction", "FitWithRestriction" },
            { "Unfit", "Unfit" },
            { "TemporarilyUnfit", "TemporarilyUnfit" },
            { "Đủ SK", "Fit" },
            { "Không đủ SK", "Unfit" },
            { "Hạn chế", "FitWithRestriction" }
        };

        var byCompany = all
            .GroupBy(o => o.CompanyName)
            .Select(g => new CompanyBreakdownDto2
            {
                CompanyName = g.Key,
                EmployeeCount = g.Count(),
                FitCount = g.Count(o => o.Classification == "Fit" || o.Classification == "Đủ SK"),
                DiseaseCount = g.Count(o => !string.IsNullOrWhiteSpace(o.OccupationalDisease))
            })
            .OrderByDescending(c => c.EmployeeCount)
            .ToList();

        return new OccHealthStatisticsDto2
        {
            TotalRecords = all.Count,
            TotalCompanies = all.Select(o => o.CompanyName).Distinct().Count(),
            TotalEmployees = all.Select(o => o.EmployeeCode ?? o.EmployeeName).Distinct().Count(),
            FitCount = all.Count(o => o.Classification == "Fit" || o.Classification == "Đủ SK"),
            FitWithRestrictionCount = all.Count(o => o.Classification == "FitWithRestriction" || o.Classification == "Hạn chế"),
            UnfitCount = all.Count(o => o.Classification == "Unfit" || o.Classification == "Không đủ SK"),
            TemporarilyUnfitCount = all.Count(o => o.Classification == "TemporarilyUnfit"),
            DiseaseDetectedCount = all.Count(o => !string.IsNullOrWhiteSpace(o.OccupationalDisease)),
            ByCompany = byCompany
        };
    }

    public async Task<List<OccHealthDiseaseReportDto>> GetDiseaseReportAsync()
    {
        var withDisease = await _context.OccupationalHealthExams
            .Where(o => !o.IsDeleted && o.OccupationalDisease != null && o.OccupationalDisease != "")
            .OrderByDescending(o => o.ExamDate)
            .ToListAsync();

        return withDisease
            .GroupBy(o => o.OccupationalDisease!)
            .Select(g => new OccHealthDiseaseReportDto
            {
                DiseaseName = g.Key,
                IcdCode = g.FirstOrDefault()?.DiseaseCode,
                CaseCount = g.Count(),
                Cases = g.Select(o => MapToListDto(o)).ToList()
            })
            .OrderByDescending(d => d.CaseCount)
            .ToList();
    }

    private static OccHealthListDto MapToListDto(OccupationalHealthExam o) => new()
    {
        Id = o.Id,
        EmployeeName = o.EmployeeName,
        EmployeeCode = o.EmployeeCode,
        CompanyName = o.CompanyName,
        Department = o.Department,
        JobTitle = o.JobTitle,
        ExamDate = o.ExamDate,
        ExamType = o.ExamType,
        HazardExposure = o.HazardExposure,
        Findings = o.Notes,
        Classification = o.Classification,
        OccupationalDisease = o.OccupationalDisease,
        Recommendations = o.Recommendations,
        DoctorName = o.DoctorName,
        NextExamDate = null, // Derived from ExamDate + 12 months for periodic
        Status = o.Status
    };
}
