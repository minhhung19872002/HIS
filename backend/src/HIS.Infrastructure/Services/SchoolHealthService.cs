using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using System.Text;

namespace HIS.Infrastructure.Services;

public class SchoolHealthService : ISchoolHealthService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public SchoolHealthService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }

    public async Task<SchoolHealthPagedResult> GetRecordsAsync(SchoolHealthSearchDto2 filter)
    {
        var query = _context.SchoolHealthExams
            .Where(s => !s.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(s =>
                s.StudentName.ToLower().Contains(kw) ||
                (s.StudentCode != null && s.StudentCode.ToLower().Contains(kw)) ||
                s.SchoolName.ToLower().Contains(kw));
        }

        if (!string.IsNullOrWhiteSpace(filter.SchoolName))
            query = query.Where(s => s.SchoolName.Contains(filter.SchoolName.Trim()));

        if (!string.IsNullOrWhiteSpace(filter.Grade))
            query = query.Where(s => s.GradeLevel == filter.Grade.Trim());

        if (filter.FromDate.HasValue)
            query = query.Where(s => s.ExamDate >= filter.FromDate.Value.Date);

        if (filter.ToDate.HasValue)
            query = query.Where(s => s.ExamDate <= filter.ToDate.Value.Date);

        if (filter.HasReferral == true)
            query = query.Where(s => s.Recommendations != null && s.Recommendations != "");

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(s => s.ExamDate)
            .ThenBy(s => s.SchoolName)
            .ThenBy(s => s.StudentName)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(s => MapToListDto(s))
            .ToListAsync();

        return new SchoolHealthPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        };
    }

    public async Task<SchoolHealthListDto> CreateAsync(CreateSchoolHealthDto2 dto)
    {
        // Calculate BMI
        double? bmi = null;
        if (dto.Height.HasValue && dto.Weight.HasValue && dto.Height.Value > 0)
        {
            var heightM = dto.Height.Value / 100.0;
            bmi = dto.Weight.Value / (heightM * heightM);
        }

        var entity = new SchoolHealthExam
        {
            Id = Guid.NewGuid(),
            SchoolName = dto.SchoolName.Trim(),
            StudentName = dto.StudentName.Trim(),
            StudentCode = dto.StudentCode?.Trim(),
            GradeLevel = dto.Grade?.Trim(),
            DateOfBirth = dto.DateOfBirth,
            ExamDate = dto.ScreeningDate,
            Height = dto.Height,
            Weight = dto.Weight,
            BMI = bmi,
            VisionLeft = dto.Vision,
            HearingResult = dto.Hearing,
            DentalResult = dto.DentalStatus,
            OverallResult = dto.VaccinationStatus,
            Recommendations = dto.Referral,
            DoctorName = dto.DoctorId.HasValue
                ? await _context.Users.Where(u => u.Id == dto.DoctorId).Select(u => u.FullName).FirstOrDefaultAsync()
                : null,
            Notes = dto.Notes?.Trim(),
            Status = 1,
            CreatedAt = DateTime.UtcNow
        };

        _context.SchoolHealthExams.Add(entity);
        await _unitOfWork.SaveChangesAsync();
        return MapToListDto(entity);
    }

    public async Task<SchoolHealthListDto> UpdateAsync(Guid id, CreateSchoolHealthDto2 dto)
    {
        var entity = await _context.SchoolHealthExams.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted)
            ?? throw new InvalidOperationException("School health record not found");

        double? bmi = null;
        if (dto.Height.HasValue && dto.Weight.HasValue && dto.Height.Value > 0)
        {
            var heightM = dto.Height.Value / 100.0;
            bmi = dto.Weight.Value / (heightM * heightM);
        }

        entity.SchoolName = dto.SchoolName.Trim();
        entity.StudentName = dto.StudentName.Trim();
        entity.StudentCode = dto.StudentCode?.Trim();
        entity.GradeLevel = dto.Grade?.Trim();
        entity.DateOfBirth = dto.DateOfBirth;
        entity.ExamDate = dto.ScreeningDate;
        entity.Height = dto.Height;
        entity.Weight = dto.Weight;
        entity.BMI = bmi;
        entity.VisionLeft = dto.Vision;
        entity.HearingResult = dto.Hearing;
        entity.DentalResult = dto.DentalStatus;
        entity.OverallResult = dto.VaccinationStatus;
        entity.Recommendations = dto.Referral;
        entity.Notes = dto.Notes?.Trim();
        entity.UpdatedAt = DateTime.UtcNow;

        if (dto.DoctorId.HasValue)
            entity.DoctorName = await _context.Users.Where(u => u.Id == dto.DoctorId).Select(u => u.FullName).FirstOrDefaultAsync();

        await _unitOfWork.SaveChangesAsync();
        return MapToListDto(entity);
    }

    public async Task<SchoolHealthStatisticsDto2> GetStatisticsBySchoolAsync(string? schoolName = null)
    {
        var query = _context.SchoolHealthExams.Where(s => !s.IsDeleted);

        if (!string.IsNullOrWhiteSpace(schoolName))
            query = query.Where(s => s.SchoolName.Contains(schoolName.Trim()));

        var all = await query.ToListAsync();

        var bySchool = all
            .GroupBy(s => s.SchoolName)
            .Select(g => new SchoolBreakdownDto2
            {
                SchoolName = g.Key,
                StudentCount = g.Count(),
                ReferralCount = g.Count(s => !string.IsNullOrWhiteSpace(s.Recommendations)),
                AverageBMI = g.Where(s => s.BMI.HasValue).Select(s => (double)s.BMI!.Value).DefaultIfEmpty(0).Average()
            })
            .OrderByDescending(s => s.StudentCount)
            .ToList();

        return new SchoolHealthStatisticsDto2
        {
            TotalRecords = all.Count,
            TotalSchools = all.Select(s => s.SchoolName).Distinct().Count(),
            TotalStudents = all.Select(s => s.StudentCode ?? s.StudentName).Distinct().Count(),
            ReferralCount = all.Count(s => !string.IsNullOrWhiteSpace(s.Recommendations)),
            AverageBMI = all.Where(s => s.BMI.HasValue).Select(s => (double)s.BMI!.Value).DefaultIfEmpty(0).Average(),
            VisionIssues = all.Count(s => s.HasVisionProblem == true),
            HearingIssues = all.Count(s => !string.IsNullOrWhiteSpace(s.HearingResult) && s.HearingResult != "Bình thường"),
            DentalIssues = all.Count(s => s.DentalCavityCount.HasValue && s.DentalCavityCount > 0),
            BySchool = bySchool
        };
    }

    public async Task<SchoolHealthPagedResult> GetReferralsAsync(int pageIndex = 0, int pageSize = 20)
    {
        var query = _context.SchoolHealthExams
            .Where(s => !s.IsDeleted && s.Recommendations != null && s.Recommendations != "");

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(s => s.ExamDate)
            .Skip(pageIndex * pageSize)
            .Take(pageSize)
            .Select(s => MapToListDto(s))
            .ToListAsync();

        return new SchoolHealthPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = pageIndex,
            PageSize = pageSize
        };
    }

    private static SchoolHealthListDto MapToListDto(SchoolHealthExam s) => new()
    {
        Id = s.Id,
        SchoolName = s.SchoolName,
        StudentName = s.StudentName,
        StudentCode = s.StudentCode,
        Grade = s.GradeLevel,
        DateOfBirth = s.DateOfBirth,
        ExamDate = s.ExamDate,
        Height = s.Height,
        Weight = s.Weight,
        BMI = s.BMI,
        Vision = s.VisionLeft,
        Hearing = s.HearingResult,
        DentalStatus = s.DentalResult,
        VaccinationStatus = s.OverallResult,
        Findings = s.Notes,
        HasReferral = !string.IsNullOrWhiteSpace(s.Recommendations),
        DoctorName = s.DoctorName,
        Status = s.Status
    };
}
