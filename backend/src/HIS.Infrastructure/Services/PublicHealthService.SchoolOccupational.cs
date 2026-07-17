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
    // SCHOOL HEALTH
    // =====================================================================

    public async Task<List<SchoolHealthExamDto>> GetSchoolHealthExamsAsync(SchoolHealthSearchDto? filter = null)
    {
        var query = _context.SchoolHealthExams
            .Where(s => !s.IsDeleted)
            .AsQueryable();

        if (filter != null)
        {
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(s =>
                    s.StudentName.ToLower().Contains(kw) ||
                    s.SchoolName.ToLower().Contains(kw) ||
                    (s.StudentCode != null && s.StudentCode.ToLower().Contains(kw))
                );
            }
            if (!string.IsNullOrEmpty(filter.SchoolName))
                query = query.Where(s => s.SchoolName == filter.SchoolName);
            if (!string.IsNullOrEmpty(filter.AcademicYear))
                query = query.Where(s => s.AcademicYear == filter.AcademicYear);
            if (!string.IsNullOrEmpty(filter.GradeLevel))
                query = query.Where(s => s.GradeLevel == filter.GradeLevel);
            if (filter.Status.HasValue)
                query = query.Where(s => s.Status == filter.Status.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(s => s.ExamDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(s => s.ExamDate <= to.AddDays(1));
        }

        var pageSize = filter?.PageSize > 0 ? filter.PageSize : 20;
        var skip = filter?.PageIndex > 0 ? filter.PageIndex * pageSize : 0;

        return await query
            .OrderByDescending(s => s.ExamDate)
            .Skip(skip)
            .Take(pageSize)
            .Select(s => MapSchoolHealthDto(s))
            .ToListAsync();
    }

    public async Task<SchoolHealthExamDto?> GetSchoolHealthExamByIdAsync(Guid id)
    {
        var s = await _context.SchoolHealthExams.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        return s == null ? null : MapSchoolHealthDto(s);
    }

    public async Task<SchoolHealthExamDto> CreateSchoolHealthExamAsync(CreateSchoolHealthExamDto dto, string? userId)
    {
        var entity = new SchoolHealthExam
        {
            Id = Guid.NewGuid(),
            SchoolName = dto.SchoolName,
            SchoolCode = dto.SchoolCode,
            AcademicYear = dto.AcademicYear,
            GradeLevel = dto.GradeLevel,
            StudentName = dto.StudentName,
            StudentCode = dto.StudentCode,
            DateOfBirth = !string.IsNullOrEmpty(dto.DateOfBirth) && DateTime.TryParse(dto.DateOfBirth, out var dob) ? dob : null,
            Gender = dto.Gender,
            ExamDate = !string.IsNullOrEmpty(dto.ExamDate) && DateTime.TryParse(dto.ExamDate, out var ed) ? ed : DateTime.UtcNow,
            DoctorName = dto.DoctorName,
            Notes = dto.Notes,
            Status = 0, // Pending
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };
        _context.SchoolHealthExams.Add(entity);
        await _context.SaveChangesAsync();
        return MapSchoolHealthDto(entity);
    }

    public async Task<SchoolHealthExamDto> UpdateSchoolHealthExamAsync(Guid id, UpdateSchoolHealthExamDto dto)
    {
        var s = await _context.SchoolHealthExams.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("School health exam not found");
        if (dto.Status.HasValue) s.Status = dto.Status.Value;
        if (dto.Height.HasValue) s.Height = dto.Height.Value;
        if (dto.Weight.HasValue) s.Weight = dto.Weight.Value;
        if (dto.Height.HasValue && dto.Weight.HasValue && dto.Height.Value > 0)
        {
            var hm = dto.Height.Value / 100f;
            s.BMI = (float)Math.Round(dto.Weight.Value / (hm * hm), 1);
        }
        if (dto.NutritionStatus != null) s.NutritionStatus = dto.NutritionStatus;
        if (dto.VisionLeft != null) s.VisionLeft = dto.VisionLeft;
        if (dto.VisionRight != null) s.VisionRight = dto.VisionRight;
        if (dto.HasVisionProblem.HasValue) s.HasVisionProblem = dto.HasVisionProblem.Value;
        if (dto.HearingResult != null) s.HearingResult = dto.HearingResult;
        if (dto.DentalResult != null) s.DentalResult = dto.DentalResult;
        if (dto.DentalCavityCount.HasValue) s.DentalCavityCount = dto.DentalCavityCount.Value;
        if (dto.SpineResult != null) s.SpineResult = dto.SpineResult;
        if (dto.SkinResult != null) s.SkinResult = dto.SkinResult;
        if (dto.HeartLungResult != null) s.HeartLungResult = dto.HeartLungResult;
        if (dto.MentalHealthResult != null) s.MentalHealthResult = dto.MentalHealthResult;
        if (dto.OverallResult != null) s.OverallResult = dto.OverallResult;
        if (dto.Recommendations != null) s.Recommendations = dto.Recommendations;
        if (dto.DoctorName != null) s.DoctorName = dto.DoctorName;
        if (dto.Notes != null) s.Notes = dto.Notes;
        s.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return MapSchoolHealthDto(s);
    }

    public async Task DeleteSchoolHealthExamAsync(Guid id)
    {
        var s = await _context.SchoolHealthExams.FindAsync(id)
            ?? throw new InvalidOperationException("School health exam not found");
        s.IsDeleted = true;
        s.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<SchoolHealthStatsDto> GetSchoolHealthStatsAsync()
    {
        var items = await _context.SchoolHealthExams.Where(s => !s.IsDeleted).ToListAsync();
        return new SchoolHealthStatsDto
        {
            TotalExams = items.Count,
            PendingCount = items.Count(s => s.Status == 0),
            CompletedCount = items.Count(s => s.Status == 1),
            VisionProblemCount = items.Count(s => s.HasVisionProblem == true),
            DentalProblemCount = items.Count(s => s.DentalCavityCount.HasValue && s.DentalCavityCount.Value > 0),
            MalnutritionCount = items.Count(s => s.NutritionStatus == "Suy dinh dưỡng"),
            OverweightCount = items.Count(s => s.NutritionStatus == "Thừa cân" || s.NutritionStatus == "Béo phì"),
            SchoolBreakdown = items.GroupBy(s => s.SchoolName).Select(g => new SchoolBreakdownDto { SchoolName = g.Key, ExamCount = g.Count(), CompletedCount = g.Count(x => x.Status == 1) }).OrderByDescending(x => x.ExamCount).Take(10).ToList(),
        };
    }

    // =====================================================================
    // OCCUPATIONAL HEALTH
    // =====================================================================

    public async Task<List<OccupationalHealthExamDto>> GetOccupationalHealthExamsAsync(OccupationalHealthSearchDto? filter = null)
    {
        var query = _context.OccupationalHealthExams
            .Where(o => !o.IsDeleted)
            .AsQueryable();

        if (filter != null)
        {
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(o =>
                    o.EmployeeName.ToLower().Contains(kw) ||
                    o.CompanyName.ToLower().Contains(kw) ||
                    (o.EmployeeCode != null && o.EmployeeCode.ToLower().Contains(kw))
                );
            }
            if (!string.IsNullOrEmpty(filter.CompanyName))
                query = query.Where(o => o.CompanyName == filter.CompanyName);
            if (!string.IsNullOrEmpty(filter.ExamType))
                query = query.Where(o => o.ExamType == filter.ExamType);
            if (filter.Status.HasValue)
                query = query.Where(o => o.Status == filter.Status.Value);
            if (!string.IsNullOrEmpty(filter.HazardExposure))
                query = query.Where(o => o.HazardExposure != null && o.HazardExposure.Contains(filter.HazardExposure));
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(o => o.ExamDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(o => o.ExamDate <= to.AddDays(1));
        }

        var pageSize = filter?.PageSize > 0 ? filter.PageSize : 20;
        var skip = filter?.PageIndex > 0 ? filter.PageIndex * pageSize : 0;

        return await query
            .OrderByDescending(o => o.ExamDate)
            .Skip(skip)
            .Take(pageSize)
            .Select(o => MapOccupationalHealthDto(o))
            .ToListAsync();
    }

    public async Task<OccupationalHealthExamDto?> GetOccupationalHealthExamByIdAsync(Guid id)
    {
        var o = await _context.OccupationalHealthExams.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);
        return o == null ? null : MapOccupationalHealthDto(o);
    }

    public async Task<OccupationalHealthExamDto> CreateOccupationalHealthExamAsync(CreateOccupationalHealthExamDto dto, string? userId)
    {
        var entity = new OccupationalHealthExam
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            EmployeeName = dto.EmployeeName,
            EmployeeCode = dto.EmployeeCode,
            CompanyName = dto.CompanyName,
            CompanyTaxCode = dto.CompanyTaxCode,
            Department = dto.Department,
            JobTitle = dto.JobTitle,
            HazardExposure = dto.HazardExposure,
            ExposureYears = dto.ExposureYears,
            ExamType = dto.ExamType,
            ExamDate = !string.IsNullOrEmpty(dto.ExamDate) && DateTime.TryParse(dto.ExamDate, out var ed) ? ed : DateTime.UtcNow,
            DoctorName = dto.DoctorName,
            Status = 0, // Pending
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };
        _context.OccupationalHealthExams.Add(entity);
        await _context.SaveChangesAsync();
        return MapOccupationalHealthDto(entity);
    }

    public async Task<OccupationalHealthExamDto> UpdateOccupationalHealthExamAsync(Guid id, UpdateOccupationalHealthExamDto dto)
    {
        var o = await _context.OccupationalHealthExams.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Occupational health exam not found");
        if (dto.Status.HasValue) o.Status = dto.Status.Value;
        if (dto.GeneralHealth != null) o.GeneralHealth = dto.GeneralHealth;
        if (dto.RespiratoryResult != null) o.RespiratoryResult = dto.RespiratoryResult;
        if (dto.HearingResult != null) o.HearingResult = dto.HearingResult;
        if (dto.VisionResult != null) o.VisionResult = dto.VisionResult;
        if (dto.SkinResult != null) o.SkinResult = dto.SkinResult;
        if (dto.LabResults != null) o.LabResults = dto.LabResults;
        if (dto.XrayResult != null) o.XrayResult = dto.XrayResult;
        if (dto.OccupationalDisease != null) o.OccupationalDisease = dto.OccupationalDisease;
        if (dto.DiseaseCode != null) o.DiseaseCode = dto.DiseaseCode;
        if (dto.Classification != null) o.Classification = dto.Classification;
        if (dto.Recommendations != null) o.Recommendations = dto.Recommendations;
        if (dto.DoctorName != null) o.DoctorName = dto.DoctorName;
        if (dto.Notes != null) o.Notes = dto.Notes;
        o.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return MapOccupationalHealthDto(o);
    }

    public async Task DeleteOccupationalHealthExamAsync(Guid id)
    {
        var o = await _context.OccupationalHealthExams.FindAsync(id)
            ?? throw new InvalidOperationException("Occupational health exam not found");
        o.IsDeleted = true;
        o.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<OccupationalHealthStatsDto> GetOccupationalHealthStatsAsync()
    {
        var items = await _context.OccupationalHealthExams.Where(o => !o.IsDeleted).ToListAsync();
        return new OccupationalHealthStatsDto
        {
            TotalExams = items.Count,
            PendingCount = items.Count(o => o.Status == 0),
            CompletedCount = items.Count(o => o.Status == 1),
            OccupationalDiseaseCount = items.Count(o => !string.IsNullOrEmpty(o.OccupationalDisease)),
            NeedFollowUpCount = items.Count(o => o.Status == 2),
            CompanyBreakdown = items.GroupBy(o => o.CompanyName).Select(g => new CompanyBreakdownDto { CompanyName = g.Key, ExamCount = g.Count() }).OrderByDescending(x => x.ExamCount).Take(10).ToList(),
            HazardBreakdown = items.Where(o => !string.IsNullOrEmpty(o.HazardExposure)).GroupBy(o => o.HazardExposure!).Select(g => new HazardBreakdownDto { Hazard = g.Key, Count = g.Count() }).OrderByDescending(x => x.Count).Take(10).ToList(),
        };
    }

    private static SchoolHealthExamDto MapSchoolHealthDto(SchoolHealthExam s) => new()
    {
        Id = s.Id,
        SchoolName = s.SchoolName,
        SchoolCode = s.SchoolCode,
        AcademicYear = s.AcademicYear,
        GradeLevel = s.GradeLevel,
        StudentName = s.StudentName,
        StudentCode = s.StudentCode,
        DateOfBirth = s.DateOfBirth?.ToString("yyyy-MM-dd"),
        Gender = s.Gender,
        ExamDate = s.ExamDate.ToString("yyyy-MM-dd"),
        Height = s.Height,
        Weight = s.Weight,
        BMI = s.BMI,
        NutritionStatus = s.NutritionStatus,
        VisionLeft = s.VisionLeft,
        VisionRight = s.VisionRight,
        HasVisionProblem = s.HasVisionProblem,
        HearingResult = s.HearingResult,
        DentalResult = s.DentalResult,
        DentalCavityCount = s.DentalCavityCount,
        SpineResult = s.SpineResult,
        SkinResult = s.SkinResult,
        HeartLungResult = s.HeartLungResult,
        MentalHealthResult = s.MentalHealthResult,
        OverallResult = s.OverallResult,
        Recommendations = s.Recommendations,
        DoctorName = s.DoctorName,
        Notes = s.Notes,
        Status = s.Status,
    };

    private static OccupationalHealthExamDto MapOccupationalHealthDto(OccupationalHealthExam o) => new()
    {
        Id = o.Id,
        PatientId = o.PatientId,
        EmployeeName = o.EmployeeName,
        EmployeeCode = o.EmployeeCode,
        CompanyName = o.CompanyName,
        CompanyTaxCode = o.CompanyTaxCode,
        Department = o.Department,
        JobTitle = o.JobTitle,
        HazardExposure = o.HazardExposure,
        ExposureYears = o.ExposureYears,
        ExamDate = o.ExamDate.ToString("yyyy-MM-dd"),
        ExamType = o.ExamType,
        GeneralHealth = o.GeneralHealth,
        RespiratoryResult = o.RespiratoryResult,
        HearingResult = o.HearingResult,
        VisionResult = o.VisionResult,
        SkinResult = o.SkinResult,
        LabResults = o.LabResults,
        XrayResult = o.XrayResult,
        OccupationalDisease = o.OccupationalDisease,
        DiseaseCode = o.DiseaseCode,
        Classification = o.Classification,
        Recommendations = o.Recommendations,
        DoctorName = o.DoctorName,
        Status = o.Status,
        Notes = o.Notes,
    };
}
