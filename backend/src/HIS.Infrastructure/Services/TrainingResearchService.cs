using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class TrainingResearchService : ITrainingResearchService
{
    private readonly HISDbContext _context;

    public TrainingResearchService(HISDbContext context)
    {
        _context = context;
    }

    private static readonly Dictionary<int, string> TrainingTypeNames = new()
    {
        { 1, "Noi bo" }, { 2, "Ben ngoai" }, { 3, "CME" }, { 4, "Chi dao tuyen" }
    };

    private static readonly Dictionary<int, string> ClassStatusNames = new()
    {
        { 1, "Ke hoach" }, { 2, "Dang dien ra" }, { 3, "Hoan thanh" }, { 4, "Huy" }
    };

    private static readonly Dictionary<int, string> StudentTypeNames = new()
    {
        { 1, "Noi bo" }, { 2, "Ben ngoai" }, { 3, "Thuc tap sinh" }
    };

    private static readonly Dictionary<int, string> AttendanceStatusNames = new()
    {
        { 1, "Da dang ky" }, { 2, "Dang hoc" }, { 3, "Hoan thanh" }, { 4, "Bo hoc" }
    };

    private static readonly Dictionary<int, string> DirectionTypeNames = new()
    {
        { 1, "Tuyen tren" }, { 2, "Tuyen duoi" }
    };

    private static readonly Dictionary<int, string> DirectionStatusNames = new()
    {
        { 1, "Ke hoach" }, { 2, "Dang thuc hien" }, { 3, "Hoan thanh" }
    };

    private static readonly Dictionary<int, string> ResearchLevelNames = new()
    {
        { 1, "Cap Quoc gia" }, { 2, "Cap Bo" }, { 3, "Cap Co so" }
    };

    private static readonly Dictionary<int, string> ResearchStatusNames = new()
    {
        { 1, "De xuat" }, { 2, "Duyet" }, { 3, "Dang thuc hien" }, { 4, "Hoan thanh" }, { 5, "Da cong bo" }
    };

    // ---- Classes ----

    public async Task<List<TrainingClassListDto>> GetClassesAsync(TrainingClassSearchDto filter)
    {
        try
        {
            var query = _context.TrainingClasses
                .Include(c => c.Instructor)
                .Include(c => c.Department)
                .Include(c => c.Students)
                .Where(c => !c.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(c =>
                    c.ClassCode.ToLower().Contains(kw) ||
                    c.ClassName.ToLower().Contains(kw) ||
                    (c.Location != null && c.Location.ToLower().Contains(kw)));
            }
            if (filter.TrainingType.HasValue)
                query = query.Where(c => c.TrainingType == filter.TrainingType.Value);
            if (filter.Status.HasValue)
                query = query.Where(c => c.Status == filter.Status.Value);
            if (filter.DepartmentId.HasValue)
                query = query.Where(c => c.DepartmentId == filter.DepartmentId.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(c => c.StartDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(c => c.StartDate <= to.AddDays(1));

            var skip = filter.PageIndex * filter.PageSize;

            var classes = await query
                .OrderByDescending(c => c.CreatedAt)
                .Skip(skip)
                .Take(filter.PageSize)
                .ToListAsync();

            return classes.Select(c => new TrainingClassListDto
                {
                    Id = c.Id,
                    ClassCode = c.ClassCode,
                    ClassName = c.ClassName,
                    TrainingType = c.TrainingType,
                    TrainingTypeName = TrainingTypeNames.GetValueOrDefault(c.TrainingType, ""),
                    StartDate = c.StartDate.ToString("yyyy-MM-dd"),
                    EndDate = c.EndDate.HasValue ? c.EndDate.Value.ToString("yyyy-MM-dd") : null,
                    MaxStudents = c.MaxStudents,
                    EnrolledCount = c.Students.Count(s => !s.IsDeleted),
                    Location = c.Location,
                    InstructorName = c.Instructor != null ? c.Instructor.FullName : null,
                    DepartmentName = c.Department != null ? c.Department.DepartmentName : null,
                    CreditHours = c.CreditHours,
                    Status = c.Status,
                    StatusName = ClassStatusNames.GetValueOrDefault(c.Status, ""),
                    Fee = c.Fee,
                })
                .ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<TrainingClassListDto>();
        }
    }

    public async Task<TrainingClassDetailDto?> GetClassByIdAsync(Guid id)
    {
        try
        {
            var c = await _context.TrainingClasses
                .Include(x => x.Instructor)
                .Include(x => x.Department)
                .Include(x => x.Students.Where(s => !s.IsDeleted))
                    .ThenInclude(s => s.Staff)
                .Where(x => x.Id == id && !x.IsDeleted)
                .FirstOrDefaultAsync();

            if (c == null) return null;

            return new TrainingClassDetailDto
            {
                Id = c.Id,
                ClassCode = c.ClassCode,
                ClassName = c.ClassName,
                TrainingType = c.TrainingType,
                TrainingTypeName = TrainingTypeNames.GetValueOrDefault(c.TrainingType, ""),
                StartDate = c.StartDate.ToString("yyyy-MM-dd"),
                EndDate = c.EndDate?.ToString("yyyy-MM-dd"),
                MaxStudents = c.MaxStudents,
                EnrolledCount = c.Students.Count,
                Location = c.Location,
                InstructorId = c.InstructorId,
                InstructorName = c.Instructor?.FullName,
                DepartmentId = c.DepartmentId,
                DepartmentName = c.Department?.DepartmentName,
                Description = c.Description,
                CreditHours = c.CreditHours,
                Status = c.Status,
                StatusName = ClassStatusNames.GetValueOrDefault(c.Status, ""),
                Fee = c.Fee,
                CreatedAt = c.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                Students = c.Students.Select(s => MapStudentDto(s)).ToList(),
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    public async Task<TrainingClassDetailDto> SaveClassAsync(Guid? id, SaveTrainingClassDto dto)
    {
        TrainingClass entity;
        if (id.HasValue)
        {
            entity = await _context.TrainingClasses.FirstAsync(c => c.Id == id.Value && !c.IsDeleted);
            entity.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            entity = new TrainingClass { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow };
            _context.TrainingClasses.Add(entity);
        }

        entity.ClassCode = dto.ClassCode;
        entity.ClassName = dto.ClassName;
        entity.TrainingType = dto.TrainingType;
        if (DateTime.TryParse(dto.StartDate, out var sd)) entity.StartDate = sd;
        entity.EndDate = DateTime.TryParse(dto.EndDate, out var ed) ? ed : null;
        entity.MaxStudents = dto.MaxStudents;
        entity.Location = dto.Location;
        entity.InstructorId = dto.InstructorId;
        entity.DepartmentId = dto.DepartmentId;
        entity.Description = dto.Description;
        entity.CreditHours = dto.CreditHours;
        entity.Status = dto.Status;
        entity.Fee = dto.Fee;

        await _context.SaveChangesAsync();
        return (await GetClassByIdAsync(entity.Id))!;
    }

    public async Task<List<TrainingStudentDto>> GetClassStudentsAsync(Guid classId)
    {
        try
        {
            return await _context.TrainingStudents
                .Include(s => s.Staff)
                .Where(s => s.ClassId == classId && !s.IsDeleted)
                .OrderBy(s => s.CreatedAt)
                .Select(s => MapStudentDto(s))
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<TrainingStudentDto>();
        }
    }

    // ---- Students ----

    public async Task<TrainingStudentDto> EnrollStudentAsync(EnrollStudentDto dto)
    {
        var entity = new TrainingStudent
        {
            Id = Guid.NewGuid(),
            ClassId = dto.ClassId,
            StaffId = dto.StaffId,
            ExternalName = dto.ExternalName,
            StudentType = dto.StudentType,
            AttendanceStatus = 1, // Registered
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };
        _context.TrainingStudents.Add(entity);
        await _context.SaveChangesAsync();

        var saved = await _context.TrainingStudents.Include(s => s.Staff).FirstAsync(s => s.Id == entity.Id);
        return MapStudentDto(saved);
    }

    public async Task<TrainingStudentDto> UpdateStudentStatusAsync(Guid studentId, UpdateStudentStatusDto dto)
    {
        var entity = await _context.TrainingStudents.Include(s => s.Staff).FirstAsync(s => s.Id == studentId && !s.IsDeleted);
        entity.AttendanceStatus = dto.AttendanceStatus;
        if (dto.Score.HasValue) entity.Score = dto.Score;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return MapStudentDto(entity);
    }

    public async Task<TrainingStudentDto> IssueCertificateAsync(Guid studentId, IssueCertificateDto dto)
    {
        var entity = await _context.TrainingStudents.Include(s => s.Staff).FirstAsync(s => s.Id == studentId && !s.IsDeleted);
        entity.CertificateNumber = dto.CertificateNumber;
        entity.CertificateDate = DateTime.TryParse(dto.CertificateDate, out var cd) ? cd : DateTime.UtcNow;
        entity.AttendanceStatus = 3; // Completed
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return MapStudentDto(entity);
    }

    // ---- Clinical Direction ----

    public async Task<List<ClinicalDirectionListDto>> GetDirectionsAsync(ClinicalDirectionSearchDto filter)
    {
        try
        {
            var query = _context.ClinicalDirections
                .Include(d => d.ResponsibleDoctor)
                .Where(d => !d.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(d => d.PartnerHospital.ToLower().Contains(kw) ||
                    (d.Objectives != null && d.Objectives.ToLower().Contains(kw)));
            }
            if (filter.DirectionType.HasValue)
                query = query.Where(d => d.DirectionType == filter.DirectionType.Value);
            if (filter.Status.HasValue)
                query = query.Where(d => d.Status == filter.Status.Value);

            var skip = filter.PageIndex * filter.PageSize;

            var directions = await query
                .OrderByDescending(d => d.CreatedAt)
                .Skip(skip)
                .Take(filter.PageSize)
                .ToListAsync();

            return directions.Select(d => new ClinicalDirectionListDto
                {
                    Id = d.Id,
                    DirectionType = d.DirectionType,
                    DirectionTypeName = DirectionTypeNames.GetValueOrDefault(d.DirectionType, ""),
                    PartnerHospital = d.PartnerHospital,
                    StartDate = d.StartDate.ToString("yyyy-MM-dd"),
                    EndDate = d.EndDate.HasValue ? d.EndDate.Value.ToString("yyyy-MM-dd") : null,
                    Objectives = d.Objectives,
                    Status = d.Status,
                    StatusName = DirectionStatusNames.GetValueOrDefault(d.Status, ""),
                    ResponsibleDoctorName = d.ResponsibleDoctor != null ? d.ResponsibleDoctor.FullName : null,
                    Notes = d.Notes,
                })
                .ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<ClinicalDirectionListDto>();
        }
    }

    public async Task<ClinicalDirectionDetailDto?> GetDirectionByIdAsync(Guid id)
    {
        try
        {
            var d = await _context.ClinicalDirections
                .Include(x => x.ResponsibleDoctor)
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

            if (d == null) return null;

            return new ClinicalDirectionDetailDto
            {
                Id = d.Id,
                DirectionType = d.DirectionType,
                DirectionTypeName = DirectionTypeNames.GetValueOrDefault(d.DirectionType, ""),
                PartnerHospital = d.PartnerHospital,
                StartDate = d.StartDate.ToString("yyyy-MM-dd"),
                EndDate = d.EndDate?.ToString("yyyy-MM-dd"),
                Objectives = d.Objectives,
                Status = d.Status,
                StatusName = DirectionStatusNames.GetValueOrDefault(d.Status, ""),
                ResponsibleDoctorId = d.ResponsibleDoctorId,
                ResponsibleDoctorName = d.ResponsibleDoctor?.FullName,
                Notes = d.Notes,
                CreatedAt = d.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    public async Task<ClinicalDirectionDetailDto> SaveDirectionAsync(Guid? id, SaveClinicalDirectionDto dto)
    {
        ClinicalDirection entity;
        if (id.HasValue)
        {
            entity = await _context.ClinicalDirections.FirstAsync(d => d.Id == id.Value && !d.IsDeleted);
            entity.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            entity = new ClinicalDirection { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow };
            _context.ClinicalDirections.Add(entity);
        }

        entity.DirectionType = dto.DirectionType;
        entity.PartnerHospital = dto.PartnerHospital;
        if (DateTime.TryParse(dto.StartDate, out var sd)) entity.StartDate = sd;
        entity.EndDate = DateTime.TryParse(dto.EndDate, out var ed) ? ed : null;
        entity.Objectives = dto.Objectives;
        entity.Status = dto.Status;
        entity.ResponsibleDoctorId = dto.ResponsibleDoctorId;
        entity.Notes = dto.Notes;

        await _context.SaveChangesAsync();
        return (await GetDirectionByIdAsync(entity.Id))!;
    }

    // ---- Research ----

    public async Task<List<ResearchProjectListDto>> GetProjectsAsync(ResearchProjectSearchDto filter)
    {
        try
        {
            var query = _context.ResearchProjects
                .Include(p => p.PrincipalInvestigator)
                .Where(p => !p.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(p =>
                    p.ProjectCode.ToLower().Contains(kw) ||
                    p.Title.ToLower().Contains(kw));
            }
            if (filter.Level.HasValue)
                query = query.Where(p => p.Level == filter.Level.Value);
            if (filter.Status.HasValue)
                query = query.Where(p => p.Status == filter.Status.Value);

            var skip = filter.PageIndex * filter.PageSize;

            var projects = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip(skip)
                .Take(filter.PageSize)
                .ToListAsync();

            return projects.Select(p => new ResearchProjectListDto
                {
                    Id = p.Id,
                    ProjectCode = p.ProjectCode,
                    Title = p.Title,
                    Level = p.Level,
                    LevelName = ResearchLevelNames.GetValueOrDefault(p.Level, ""),
                    PrincipalInvestigatorName = p.PrincipalInvestigator != null ? p.PrincipalInvestigator.FullName : null,
                    StartDate = p.StartDate.ToString("yyyy-MM-dd"),
                    EndDate = p.EndDate.HasValue ? p.EndDate.Value.ToString("yyyy-MM-dd") : null,
                    Budget = p.Budget,
                    Status = p.Status,
                    StatusName = ResearchStatusNames.GetValueOrDefault(p.Status, ""),
                    PublicationInfo = p.PublicationInfo,
                })
                .ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<ResearchProjectListDto>();
        }
    }

    public async Task<ResearchProjectDetailDto?> GetProjectByIdAsync(Guid id)
    {
        try
        {
            var p = await _context.ResearchProjects
                .Include(x => x.PrincipalInvestigator)
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

            if (p == null) return null;

            return new ResearchProjectDetailDto
            {
                Id = p.Id,
                ProjectCode = p.ProjectCode,
                Title = p.Title,
                Level = p.Level,
                LevelName = ResearchLevelNames.GetValueOrDefault(p.Level, ""),
                PrincipalInvestigatorId = p.PrincipalInvestigatorId,
                PrincipalInvestigatorName = p.PrincipalInvestigator?.FullName,
                StartDate = p.StartDate.ToString("yyyy-MM-dd"),
                EndDate = p.EndDate?.ToString("yyyy-MM-dd"),
                Budget = p.Budget,
                Status = p.Status,
                StatusName = ResearchStatusNames.GetValueOrDefault(p.Status, ""),
                Abstract = p.Abstract,
                Findings = p.Findings,
                PublicationInfo = p.PublicationInfo,
                CreatedAt = p.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    public async Task<ResearchProjectDetailDto> SaveProjectAsync(Guid? id, SaveResearchProjectDto dto)
    {
        ResearchProject entity;
        if (id.HasValue)
        {
            entity = await _context.ResearchProjects.FirstAsync(p => p.Id == id.Value && !p.IsDeleted);
            entity.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            entity = new ResearchProject { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow };
            _context.ResearchProjects.Add(entity);
        }

        entity.ProjectCode = dto.ProjectCode;
        entity.Title = dto.Title;
        entity.Level = dto.Level;
        entity.PrincipalInvestigatorId = dto.PrincipalInvestigatorId;
        if (DateTime.TryParse(dto.StartDate, out var sd)) entity.StartDate = sd;
        entity.EndDate = DateTime.TryParse(dto.EndDate, out var ed) ? ed : null;
        entity.Budget = dto.Budget;
        entity.Status = dto.Status;
        entity.Abstract = dto.Abstract;
        entity.Findings = dto.Findings;
        entity.PublicationInfo = dto.PublicationInfo;

        await _context.SaveChangesAsync();
        return (await GetProjectByIdAsync(entity.Id))!;
    }

    // ---- Dashboard & Stats ----

    public async Task<TrainingDashboardDto> GetDashboardAsync()
    {
        try
        {
            var classes = await _context.TrainingClasses.Where(c => !c.IsDeleted).ToListAsync();
            var students = await _context.TrainingStudents.Where(s => !s.IsDeleted).ToListAsync();
            var projects = await _context.ResearchProjects.Where(p => !p.IsDeleted).ToListAsync();
            var directions = await _context.ClinicalDirections.Where(d => !d.IsDeleted).CountAsync();

            var totalStaff = await _context.Users.CountAsync(u => !u.IsDeleted);
            var staffWithCme = students
                .Where(s => s.AttendanceStatus == 3 && s.CertificateNumber != null)
                .Select(s => s.StaffId)
                .Distinct()
                .Count();

            return new TrainingDashboardDto
            {
                TotalClasses = classes.Count,
                ActiveClasses = classes.Count(c => c.Status == 2),
                TotalStudents = students.Count,
                CertificatesIssued = students.Count(s => s.CertificateNumber != null),
                CmeCompliancePercent = totalStaff > 0 ? Math.Round((decimal)staffWithCme / totalStaff * 100, 1) : 0,
                ResearchProjects = projects.Count,
                ResearchPublished = projects.Count(p => p.Status == 5),
                ClinicalDirections = directions,
                ClassesByType = classes
                    .GroupBy(c => c.TrainingType)
                    .Select(g => new TrainingTypeCountDto
                    {
                        TrainingType = g.Key,
                        TypeName = TrainingTypeNames.GetValueOrDefault(g.Key, ""),
                        Count = g.Count(),
                    })
                    .OrderBy(x => x.TrainingType)
                    .ToList(),
                ProjectsByStatus = projects
                    .GroupBy(p => p.Status)
                    .Select(g => new ResearchStatusCountDto
                    {
                        Status = g.Key,
                        StatusName = ResearchStatusNames.GetValueOrDefault(g.Key, ""),
                        Count = g.Count(),
                    })
                    .OrderBy(x => x.Status)
                    .ToList(),
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new TrainingDashboardDto();
        }
    }

    public async Task<List<CreditSummaryDto>> GetCreditSummaryAsync()
    {
        try
        {
            var completedStudents = await _context.TrainingStudents
                .Include(s => s.Staff)
                .Include(s => s.TrainingClass)
                .Where(s => !s.IsDeleted && s.AttendanceStatus == 3 && s.StaffId.HasValue && s.TrainingClass != null)
                .ToListAsync();

            var staffCredits = completedStudents
                .GroupBy(s => s.StaffId!.Value)
                .Select(g =>
                {
                    var first = g.First();
                    return new CreditSummaryDto
                    {
                        StaffId = g.Key,
                        StaffName = first.Staff?.FullName ?? "",
                        DepartmentName = null, // simplified
                        TotalCredits = g.Sum(s => s.TrainingClass?.CreditHours ?? 0),
                    };
                })
                .OrderBy(x => x.IsCompliant)
                .ThenBy(x => x.StaffName)
                .ToList();

            return staffCredits;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<CreditSummaryDto>();
        }
    }

    // ---- Helpers ----

    private static TrainingStudentDto MapStudentDto(TrainingStudent s) => new()
    {
        Id = s.Id,
        ClassId = s.ClassId,
        StaffId = s.StaffId,
        StaffName = s.Staff?.FullName,
        ExternalName = s.ExternalName,
        StudentType = s.StudentType,
        StudentTypeName = StudentTypeNames.GetValueOrDefault(s.StudentType, ""),
        AttendanceStatus = s.AttendanceStatus,
        AttendanceStatusName = AttendanceStatusNames.GetValueOrDefault(s.AttendanceStatus, ""),
        Score = s.Score,
        CertificateNumber = s.CertificateNumber,
        CertificateDate = s.CertificateDate?.ToString("yyyy-MM-dd"),
        Notes = s.Notes,
    };
}
