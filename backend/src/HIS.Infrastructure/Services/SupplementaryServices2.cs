using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using System.Text;

namespace HIS.Infrastructure.Services;

// ============================================================
// Module 6: SchoolHealthService
// ============================================================

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
        float? bmi = null;
        if (dto.Height.HasValue && dto.Weight.HasValue && dto.Height.Value > 0)
        {
            var heightM = dto.Height.Value / 100f;
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

        float? bmi = null;
        if (dto.Height.HasValue && dto.Weight.HasValue && dto.Height.Value > 0)
        {
            var heightM = dto.Height.Value / 100f;
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

// ============================================================
// Module 7: OccupationalHealthService
// ============================================================

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

// ============================================================
// Module 8: MethadoneTreatmentService
// ============================================================

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
        var today = DateTime.UtcNow.Date;
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

// ============================================================
// Module 9: BhxhAuditService
// ============================================================

public class BhxhAuditService : IBhxhAuditService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public BhxhAuditService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }

    private static readonly Dictionary<int, string> StatusNames = new()
    {
        { 0, "Bản nháp" },
        { 1, "Đang kiểm tra" },
        { 2, "Hoàn thành" },
        { 3, "Đã gửi" }
    };

    private static readonly Dictionary<string, string> ErrorTypeNames = new()
    {
        { "OverCeiling", "Vượt trần" },
        { "WrongIcd", "Sai mã ICD" },
        { "WrongObject", "Sai đối tượng" },
        { "DuplicateClaim", "Trùng thanh toán" },
        { "WrongService", "Sai dịch vụ" },
        { "Other", "Khác" }
    };

    public async Task<BhxhAuditPagedResult> GetSessionsAsync(BhxhAuditSearchDto filter)
    {
        var query = _context.Set<BhxhAuditSession>()
            .Include(s => s.Auditor)
            .Where(s => !s.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(s => s.SessionCode.ToLower().Contains(kw));
        }

        if (filter.PeriodMonth.HasValue)
            query = query.Where(s => s.PeriodMonth == filter.PeriodMonth.Value);

        if (filter.PeriodYear.HasValue)
            query = query.Where(s => s.PeriodYear == filter.PeriodYear.Value);

        if (filter.Status.HasValue)
            query = query.Where(s => s.Status == filter.Status.Value);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(s => s.PeriodYear)
            .ThenByDescending(s => s.PeriodMonth)
            .ThenByDescending(s => s.CreatedAt)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(s => new BhxhAuditListDto
            {
                Id = s.Id,
                SessionCode = s.SessionCode,
                PeriodMonth = s.PeriodMonth,
                PeriodYear = s.PeriodYear,
                TotalRecords = s.TotalRecords,
                TotalAmount = s.TotalAmount,
                ErrorCount = s.ErrorCount,
                ErrorAmount = s.ErrorAmount,
                Status = s.Status,
                StatusName = "", // mapped below
                AuditorName = s.Auditor != null ? s.Auditor.FullName : null,
                Notes = s.Notes,
                CreatedAt = s.CreatedAt
            })
            .ToListAsync();

        foreach (var item in items)
            item.StatusName = StatusNames.GetValueOrDefault(item.Status, "Không xác định");

        return new BhxhAuditPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        };
    }

    public async Task<BhxhAuditDetailDto> CreateSessionAsync(CreateAuditSessionDto dto)
    {
        var count = await _context.Set<BhxhAuditSession>().CountAsync() + 1;
        var code = $"BHXH-{dto.PeriodYear}-{dto.PeriodMonth:D2}-{count:D4}";

        var session = new BhxhAuditSession
        {
            Id = Guid.NewGuid(),
            SessionCode = code,
            PeriodMonth = dto.PeriodMonth,
            PeriodYear = dto.PeriodYear,
            TotalRecords = 0,
            TotalAmount = 0,
            ErrorCount = 0,
            ErrorAmount = 0,
            Status = 0, // Draft
            Notes = dto.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.Set<BhxhAuditSession>().Add(session);
        await _unitOfWork.SaveChangesAsync();

        return new BhxhAuditDetailDto
        {
            Id = session.Id,
            SessionCode = session.SessionCode,
            PeriodMonth = session.PeriodMonth,
            PeriodYear = session.PeriodYear,
            TotalRecords = 0,
            TotalAmount = 0,
            ErrorCount = 0,
            ErrorAmount = 0,
            Status = session.Status,
            StatusName = StatusNames.GetValueOrDefault(session.Status, "Không xác định"),
            Notes = session.Notes,
            CreatedAt = session.CreatedAt,
            Errors = new List<AuditErrorDto>()
        };
    }

    public async Task<BhxhAuditDetailDto> RunAuditAsync(Guid sessionId)
    {
        var session = await _context.Set<BhxhAuditSession>()
            .Include(s => s.Auditor)
            .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted)
            ?? throw new InvalidOperationException("Audit session not found");

        session.Status = 1; // InProgress

        // Get medical records for the audit period with insurance claims
        var periodStart = new DateTime(session.PeriodYear, session.PeriodMonth, 1);
        var periodEnd = periodStart.AddMonths(1).AddDays(-1);

        var records = await _context.MedicalRecords
            .Include(r => r.Patient)
            .Where(r => !r.IsDeleted && r.CreatedAt >= periodStart && r.CreatedAt <= periodEnd)
            .ToListAsync();

        var claims = await _context.InsuranceClaims
            .Include(c => c.ClaimDetails)
            .Where(c => !c.IsDeleted && c.CreatedAt >= periodStart && c.CreatedAt <= periodEnd)
            .ToListAsync();

        var errors = new List<BhxhAuditError>();
        decimal totalAmount = 0;

        // Check each claim for common errors
        foreach (var claim in claims)
        {
            totalAmount += claim.TotalAmount;
            var patient = records.FirstOrDefault(r => r.PatientId == claim.PatientId)?.Patient;

            // Check 1: Duplicate claims (same patient, same date, same service)
            var duplicates = claims.Where(c =>
                c.Id != claim.Id &&
                c.PatientId == claim.PatientId &&
                c.CreatedAt.Date == claim.CreatedAt.Date).ToList();

            if (duplicates.Any())
            {
                errors.Add(new BhxhAuditError
                {
                    Id = Guid.NewGuid(),
                    AuditSessionId = sessionId,
                    RecordId = claim.MedicalRecordId,
                    PatientName = patient?.FullName,
                    InsuranceNumber = claim.InsuranceNumber,
                    ErrorType = "DuplicateClaim",
                    ErrorDescription = $"Trùng thanh toán ngày {claim.CreatedAt:dd/MM/yyyy}",
                    OriginalAmount = claim.TotalAmount,
                    AdjustedAmount = 0,
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Check 2: Over ceiling (claim > 40x base salary = 7,920,000 VND for outpatient)
            var ceiling = 7_920_000m;
            if (claim.TotalAmount > ceiling)
            {
                errors.Add(new BhxhAuditError
                {
                    Id = Guid.NewGuid(),
                    AuditSessionId = sessionId,
                    RecordId = claim.MedicalRecordId,
                    PatientName = patient?.FullName,
                    InsuranceNumber = claim.InsuranceNumber,
                    ErrorType = "OverCeiling",
                    ErrorDescription = $"Chi phí {claim.TotalAmount:N0} vượt trần {ceiling:N0}",
                    OriginalAmount = claim.TotalAmount,
                    AdjustedAmount = ceiling,
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Check 3: Missing or invalid ICD code
            var record = records.FirstOrDefault(r => r.Id == claim.MedicalRecordId);
            if (record != null && string.IsNullOrWhiteSpace(record.MainDiagnosis))
            {
                errors.Add(new BhxhAuditError
                {
                    Id = Guid.NewGuid(),
                    AuditSessionId = sessionId,
                    RecordId = claim.MedicalRecordId,
                    PatientName = patient?.FullName,
                    InsuranceNumber = claim.InsuranceNumber,
                    ErrorType = "WrongIcd",
                    ErrorDescription = "Thiếu mã ICD chẩn đoán chính",
                    OriginalAmount = claim.TotalAmount,
                    AdjustedAmount = 0,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        // Remove existing errors for this session
        var existingErrors = await _context.Set<BhxhAuditError>()
            .Where(e => e.AuditSessionId == sessionId)
            .ToListAsync();
        _context.Set<BhxhAuditError>().RemoveRange(existingErrors);

        // Add new errors
        if (errors.Any())
            _context.Set<BhxhAuditError>().AddRange(errors);

        // Update session summary
        session.TotalRecords = claims.Count;
        session.TotalAmount = totalAmount;
        session.ErrorCount = errors.Count;
        session.ErrorAmount = errors.Sum(e => e.OriginalAmount - e.AdjustedAmount);
        session.Status = 2; // Completed
        session.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        return new BhxhAuditDetailDto
        {
            Id = session.Id,
            SessionCode = session.SessionCode,
            PeriodMonth = session.PeriodMonth,
            PeriodYear = session.PeriodYear,
            TotalRecords = session.TotalRecords,
            TotalAmount = session.TotalAmount,
            ErrorCount = session.ErrorCount,
            ErrorAmount = session.ErrorAmount,
            Status = session.Status,
            StatusName = StatusNames.GetValueOrDefault(session.Status, "Không xác định"),
            AuditorName = session.Auditor?.FullName,
            Notes = session.Notes,
            CreatedAt = session.CreatedAt,
            Errors = errors.Select(e => MapErrorDto(e)).ToList()
        };
    }

    public async Task<List<AuditErrorDto>> GetErrorsAsync(Guid sessionId)
    {
        return await _context.Set<BhxhAuditError>()
            .Where(e => e.AuditSessionId == sessionId && !e.IsDeleted)
            .OrderBy(e => e.ErrorType)
            .ThenByDescending(e => e.OriginalAmount)
            .Select(e => MapErrorDto(e))
            .ToListAsync();
    }

    public async Task<AuditErrorDto> FixErrorAsync(Guid errorId, FixAuditErrorDto dto)
    {
        var error = await _context.Set<BhxhAuditError>()
            .FirstOrDefaultAsync(e => e.Id == errorId && !e.IsDeleted)
            ?? throw new InvalidOperationException("Audit error not found");

        error.AdjustedAmount = dto.AdjustedAmount;
        error.IsFixed = true;
        error.FixedDate = DateTime.UtcNow;
        error.Notes = dto.Notes?.Trim();
        error.UpdatedAt = DateTime.UtcNow;

        // Recalculate session error amount
        var session = await _context.Set<BhxhAuditSession>().FindAsync(error.AuditSessionId);
        if (session != null)
        {
            var allErrors = await _context.Set<BhxhAuditError>()
                .Where(e => e.AuditSessionId == session.Id && !e.IsDeleted)
                .ToListAsync();

            session.ErrorAmount = allErrors.Sum(e => e.OriginalAmount - e.AdjustedAmount);
            session.UpdatedAt = DateTime.UtcNow;
        }

        await _unitOfWork.SaveChangesAsync();
        return MapErrorDto(error);
    }

    public async Task<AuditDashboardDto> GetDashboardAsync()
    {
        var sessions = await _context.Set<BhxhAuditSession>()
            .Where(s => !s.IsDeleted)
            .ToListAsync();

        var errors = await _context.Set<BhxhAuditError>()
            .Where(e => !e.IsDeleted)
            .ToListAsync();

        var byErrorType = errors
            .GroupBy(e => e.ErrorType)
            .Select(g => new ErrorTypeBreakdownDto
            {
                ErrorType = g.Key,
                ErrorTypeName = ErrorTypeNames.GetValueOrDefault(g.Key, g.Key),
                Count = g.Count(),
                TotalAmount = g.Sum(e => e.OriginalAmount - e.AdjustedAmount)
            })
            .OrderByDescending(e => e.Count)
            .ToList();

        var monthlyTrend = sessions
            .GroupBy(s => new { s.PeriodYear, s.PeriodMonth })
            .Select(g => new MonthlyAuditDto
            {
                Year = g.Key.PeriodYear,
                Month = g.Key.PeriodMonth,
                ErrorCount = g.Sum(s => s.ErrorCount),
                ErrorAmount = g.Sum(s => s.ErrorAmount)
            })
            .OrderByDescending(m => m.Year)
            .ThenByDescending(m => m.Month)
            .Take(12)
            .ToList();

        return new AuditDashboardDto
        {
            TotalSessions = sessions.Count,
            CompletedSessions = sessions.Count(s => s.Status >= 2),
            TotalErrors = errors.Count,
            FixedErrors = errors.Count(e => e.IsFixed),
            TotalErrorAmount = errors.Sum(e => e.OriginalAmount - e.AdjustedAmount),
            FixedAmount = errors.Where(e => e.IsFixed).Sum(e => e.OriginalAmount - e.AdjustedAmount),
            ByErrorType = byErrorType,
            MonthlyTrend = monthlyTrend
        };
    }

    public async Task<byte[]> ExportSessionAsync(Guid sessionId)
    {
        var session = await _context.Set<BhxhAuditSession>()
            .Include(s => s.Errors)
            .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted)
            ?? throw new InvalidOperationException("Audit session not found");

        // Generate CSV export
        var sb = new StringBuilder();
        sb.AppendLine("STT,Họ tên BN,Số thẻ BHYT,Loại lỗi,Mô tả,Số tiền gốc,Số tiền điều chỉnh,Đã sửa");

        var i = 1;
        foreach (var error in session.Errors.Where(e => !e.IsDeleted).OrderBy(e => e.ErrorType))
        {
            sb.AppendLine($"{i++}," +
                $"\"{error.PatientName}\"," +
                $"\"{error.InsuranceNumber}\"," +
                $"\"{ErrorTypeNames.GetValueOrDefault(error.ErrorType, error.ErrorType)}\"," +
                $"\"{error.ErrorDescription}\"," +
                $"{error.OriginalAmount}," +
                $"{error.AdjustedAmount}," +
                $"{(error.IsFixed ? "Có" : "Không")}");
        }

        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
    }

    public async Task<BhxhAuditStatisticsDto> GetStatisticsAsync()
    {
        var thisYear = DateTime.UtcNow.Year;

        var sessions = await _context.Set<BhxhAuditSession>()
            .Where(s => !s.IsDeleted && s.PeriodYear == thisYear)
            .ToListAsync();

        var errors = await _context.Set<BhxhAuditError>()
            .Where(e => !e.IsDeleted)
            .Join(_context.Set<BhxhAuditSession>().Where(s => s.PeriodYear == thisYear),
                e => e.AuditSessionId, s => s.Id, (e, s) => e)
            .ToListAsync();

        var totalRecords = sessions.Sum(s => s.TotalRecords);
        var mostCommon = errors
            .GroupBy(e => e.ErrorType)
            .OrderByDescending(g => g.Count())
            .FirstOrDefault();

        var monthlyStats = sessions
            .GroupBy(s => s.PeriodMonth)
            .Select(g => new MonthlyAuditDto
            {
                Year = thisYear,
                Month = g.Key,
                ErrorCount = g.Sum(s => s.ErrorCount),
                ErrorAmount = g.Sum(s => s.ErrorAmount)
            })
            .OrderBy(m => m.Month)
            .ToList();

        return new BhxhAuditStatisticsDto
        {
            TotalSessionsThisYear = sessions.Count,
            TotalErrorsThisYear = errors.Count,
            TotalErrorAmountThisYear = errors.Sum(e => e.OriginalAmount - e.AdjustedAmount),
            FixRate = errors.Count > 0 ? Math.Round((double)errors.Count(e => e.IsFixed) / errors.Count * 100, 1) : 0,
            ErrorRate = totalRecords > 0 ? Math.Round((double)errors.Count / totalRecords * 100, 1) : 0,
            MostCommonErrorType = mostCommon != null ? ErrorTypeNames.GetValueOrDefault(mostCommon.Key, mostCommon.Key) : null,
            MonthlyStats = monthlyStats
        };
    }

    private static AuditErrorDto MapErrorDto(BhxhAuditError e) => new()
    {
        Id = e.Id,
        AuditSessionId = e.AuditSessionId,
        RecordId = e.RecordId,
        PatientName = e.PatientName,
        InsuranceNumber = e.InsuranceNumber,
        ErrorType = e.ErrorType,
        ErrorTypeName = ErrorTypeNames.GetValueOrDefault(e.ErrorType, e.ErrorType),
        ErrorDescription = e.ErrorDescription,
        OriginalAmount = e.OriginalAmount,
        AdjustedAmount = e.AdjustedAmount,
        IsFixed = e.IsFixed,
        FixedBy = e.FixedBy,
        FixedDate = e.FixedDate,
        Notes = e.Notes
    };
}
