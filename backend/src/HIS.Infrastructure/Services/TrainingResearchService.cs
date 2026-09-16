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
            // QA-R4: TrainingClass.Students / TrainingStudent.TrainingClass are bound by EF convention to a
            // shadow FK column `TrainingClassId` (always NULL) — the real FK is `ClassId`. Every navigation
            // through them returned nothing (enrolledCount 0/N, empty student list, empty CME summary), so the
            // student side is queried explicitly on ClassId here and below.
            var query = _context.TrainingClasses
                .Include(c => c.Instructor)
                .Include(c => c.Department)
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

            var classIds = classes.Select(c => c.Id).ToList();
            var enrolled = await _context.TrainingStudents
                .Where(s => classIds.Contains(s.ClassId) && !s.IsDeleted)
                .GroupBy(s => s.ClassId)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);

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
                    EnrolledCount = enrolled.GetValueOrDefault(c.Id),
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
                .Where(x => x.Id == id && !x.IsDeleted)
                .FirstOrDefaultAsync();

            if (c == null) return null;

            // Explicit ClassId query (see GetClassesAsync — the Students navigation is bound to a NULL shadow FK).
            var students = await _context.TrainingStudents
                .Include(s => s.Staff)
                .Where(s => s.ClassId == id && !s.IsDeleted)
                .OrderBy(s => s.CreatedAt)
                .ToListAsync();

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
                EnrolledCount = students.Count,
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
                Students = students.Select(s => MapStudentDto(s)).ToList(),
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    public async Task<TrainingClassDetailDto> SaveClassAsync(Guid? id, SaveTrainingClassDto dto)
    {
        // Validation: blank code/name, negative capacity/credits and end-before-start used to be saved as-is.
        if (string.IsNullOrWhiteSpace(dto.ClassCode))
            throw new ArgumentException("Mã lớp đào tạo là bắt buộc", nameof(dto.ClassCode));
        if (string.IsNullOrWhiteSpace(dto.ClassName))
            throw new ArgumentException("Tên lớp đào tạo là bắt buộc", nameof(dto.ClassName));
        if (dto.MaxStudents <= 0)
            throw new ArgumentException("Sĩ số tối đa phải lớn hơn 0", nameof(dto.MaxStudents));
        if (dto.CreditHours < 0 || dto.Fee < 0)
            throw new ArgumentException("Số tiết/học phí không được âm", nameof(dto.CreditHours));
        if (dto.Status is < 1 or > 4)
            throw new ArgumentException("Trạng thái lớp không hợp lệ", nameof(dto.Status));
        var hasStart = DateTime.TryParse(dto.StartDate, out var startDate);
        if (!id.HasValue && !hasStart)
            throw new ArgumentException("Ngày bắt đầu lớp là bắt buộc", nameof(dto.StartDate));
        if (hasStart && DateTime.TryParse(dto.EndDate, out var endDate) && endDate.Date < startDate.Date)
            throw new ArgumentException("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu", nameof(dto.EndDate));

        TrainingClass entity;
        if (id.HasValue)
        {
            entity = await _context.TrainingClasses.FirstOrDefaultAsync(c => c.Id == id.Value && !c.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy lớp đào tạo");
            entity.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            entity = new TrainingClass { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow };
            _context.TrainingClasses.Add(entity);
        }

        entity.ClassCode = dto.ClassCode.Trim();
        entity.ClassName = dto.ClassName.Trim();
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
        // Guards: missing class was a FK 500; cancelled/completed or full classes, duplicate enrolment of
        // the same staff and anonymous students were all accepted.
        if (!dto.StaffId.HasValue && string.IsNullOrWhiteSpace(dto.ExternalName))
            throw new ArgumentException("Cần chọn nhân viên hoặc nhập tên học viên ngoài", nameof(dto.StaffId));
        var cls = await _context.TrainingClasses.AsNoTracking().FirstOrDefaultAsync(c => c.Id == dto.ClassId && !c.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy lớp đào tạo");
        if (cls.Status is 3 or 4)
            throw new InvalidOperationException("Lớp đã kết thúc hoặc đã huỷ — không thể ghi danh");
        if (dto.StaffId.HasValue && !await _context.Users.AnyAsync(u => u.Id == dto.StaffId.Value))
            throw new KeyNotFoundException("Không tìm thấy nhân viên");
        var activeStudents = _context.TrainingStudents.Where(s => s.ClassId == dto.ClassId && !s.IsDeleted && s.AttendanceStatus != 4);
        if (dto.StaffId.HasValue && await activeStudents.AnyAsync(s => s.StaffId == dto.StaffId))
            throw new InvalidOperationException("Nhân viên đã được ghi danh vào lớp này");
        // QA-R4: the same external student could be enrolled any number of times (eats the class capacity).
        var externalName = dto.ExternalName?.Trim();
        if (!dto.StaffId.HasValue && await activeStudents.AnyAsync(s => s.StaffId == null && s.ExternalName != null
                && s.ExternalName.ToLower() == externalName!.ToLower()))
            throw new InvalidOperationException("Học viên ngoài này đã được ghi danh vào lớp");
        if (await activeStudents.CountAsync() >= cls.MaxStudents)
            throw new InvalidOperationException($"Lớp đã đủ sĩ số tối đa ({cls.MaxStudents})");

        var entity = new TrainingStudent
        {
            Id = Guid.NewGuid(),
            ClassId = dto.ClassId,
            StaffId = dto.StaffId,
            ExternalName = externalName,
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
        if (dto.AttendanceStatus is < 1 or > 4)
            throw new ArgumentException("Trạng thái học viên không hợp lệ", nameof(dto.AttendanceStatus));
        if (dto.Score is < 0 or > 100)
            throw new ArgumentException("Điểm phải trong khoảng 0–100", nameof(dto.Score));
        var entity = await _context.TrainingStudents.Include(s => s.Staff).FirstOrDefaultAsync(s => s.Id == studentId && !s.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy học viên");
        // A certified student cannot be moved back / marked dropped while the certificate stays on record.
        if (!string.IsNullOrEmpty(entity.CertificateNumber) && dto.AttendanceStatus != 3)
            throw new InvalidOperationException("Học viên đã được cấp chứng chỉ — không thể đổi trạng thái");
        entity.AttendanceStatus = dto.AttendanceStatus;
        if (dto.Score.HasValue) entity.Score = dto.Score;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return MapStudentDto(entity);
    }

    public async Task<TrainingStudentDto> IssueCertificateAsync(Guid studentId, IssueCertificateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CertificateNumber))
            throw new ArgumentException("Số chứng chỉ là bắt buộc", nameof(dto.CertificateNumber));
        var entity = await _context.TrainingStudents.Include(s => s.Staff).FirstOrDefaultAsync(s => s.Id == studentId && !s.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy học viên");
        // Dropped students were certified (and flipped to Completed); re-issuing silently overwrote the number.
        if (entity.AttendanceStatus == 4)
            throw new InvalidOperationException("Học viên đã bỏ học — không thể cấp chứng chỉ");
        // QA-R4: a certificate for a student still "Đã đăng ký"/"Đang học" silently marked them Completed and
        // counted toward CME credits. The v2 page only offers the button once the student is Completed (3).
        if (entity.AttendanceStatus != 3)
            throw new InvalidOperationException("Học viên chưa hoàn thành khoá học — không thể cấp chứng chỉ");
        if (!string.IsNullOrEmpty(entity.CertificateNumber))
            throw new InvalidOperationException("Học viên đã được cấp chứng chỉ");
        entity.CertificateNumber = dto.CertificateNumber.Trim();
        entity.CertificateDate = DateTime.TryParse(dto.CertificateDate, out var cd) ? cd : DateTime.UtcNow;
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
        if (string.IsNullOrWhiteSpace(dto.PartnerHospital))
            throw new ArgumentException("Bệnh viện đối tác là bắt buộc", nameof(dto.PartnerHospital));
        if (DateTime.TryParse(dto.StartDate, out var dStart) && DateTime.TryParse(dto.EndDate, out var dEnd) && dEnd.Date < dStart.Date)
            throw new ArgumentException("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu", nameof(dto.EndDate));
        ClinicalDirection entity;
        if (id.HasValue)
        {
            entity = await _context.ClinicalDirections.FirstOrDefaultAsync(d => d.Id == id.Value && !d.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy hoạt động chỉ đạo tuyến");
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
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new ArgumentException("Tên đề tài là bắt buộc", nameof(dto.Title));
        if (dto.Budget < 0)
            throw new ArgumentException("Kinh phí không được âm", nameof(dto.Budget));
        if (DateTime.TryParse(dto.StartDate, out var pStart) && DateTime.TryParse(dto.EndDate, out var pEnd) && pEnd.Date < pStart.Date)
            throw new ArgumentException("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu", nameof(dto.EndDate));
        ResearchProject entity;
        if (id.HasValue)
        {
            entity = await _context.ResearchProjects.FirstOrDefaultAsync(p => p.Id == id.Value && !p.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy đề tài nghiên cứu");
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
            // QA-R4: "CME tuân thủ" counted anyone holding a certificate (external students with StaffId NULL
            // included) regardless of hours/year; use the same 24 tiết/năm rule as the credit-summary tab.
            var staffWithCme = (await GetCreditSummaryAsync()).Count(x => x.IsCompliant);

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
            // QA-R3: the requirement is per year (24 tiết/năm, NĐ 96/2023 — same value as MedicalHR), so only this
            // year's completed classes count; all-time credits against a 48-credit default contradicted the HR tab.
            var yearStart = new DateTime(DateTime.Now.Year, 1, 1);
            var yearEnd = yearStart.AddYears(1);
            // Explicit join on ClassId — the TrainingClass navigation is bound to a NULL shadow FK (see GetClassesAsync).
            var completedStudents = await (
                from s in _context.TrainingStudents
                join c in _context.TrainingClasses on s.ClassId equals c.Id
                where !s.IsDeleted && s.AttendanceStatus == 3 && s.StaffId.HasValue && !c.IsDeleted
                    && (c.EndDate ?? c.StartDate) >= yearStart && (c.EndDate ?? c.StartDate) < yearEnd
                select new { StaffId = s.StaffId!.Value, StaffName = s.Staff != null ? s.Staff.FullName : "", c.CreditHours })
                .ToListAsync();

            var staffCredits = completedStudents
                .GroupBy(s => s.StaffId)
                .Select(g =>
                {
                    var first = g.First();
                    return new CreditSummaryDto
                    {
                        StaffId = g.Key,
                        StaffName = first.StaffName ?? "",
                        DepartmentName = null, // simplified
                        TotalCredits = g.Sum(s => s.CreditHours),
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
