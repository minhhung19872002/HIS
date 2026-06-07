using HIS.Application.DTOs.MedicalHR;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

// K7 phien 1 (2026-05-30): tach MedicalHRServiceImpl (~795 dong) khoi ExtendedWorkflowServices.cs.
// 1 class/file convention C# (anti-pattern fix). ZERO runtime change.
#region Flow 16: Medical HR Service - Real Implementation
public class MedicalHRServiceImpl : IMedicalHRService
{
    private readonly HISDbContext _context;
    public MedicalHRServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<MedicalStaffDto>> GetStaffListAsync(Guid? departmentId = null, string? staffType = null, string? status = null)
    {
        var query = _context.MedicalStaffs.Include(x => x.PrimaryDepartment).AsQueryable();
        if (departmentId.HasValue) query = query.Where(x => x.PrimaryDepartmentId == departmentId);
        if (!string.IsNullOrEmpty(staffType)) query = query.Where(x => x.StaffType == staffType);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.ToListAsync();
        return list.Select(MapToStaffDto).ToList();
    }

    public async Task<MedicalStaffDto> GetStaffAsync(Guid id)
    {
        var e = await _context.MedicalStaffs.Include(x => x.PrimaryDepartment).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : MapToStaffDto(e);
    }

    public async Task<MedicalStaffDto> SaveStaffAsync(SaveMedicalStaffDto dto)
    {
        var entity = dto.Id.HasValue ? await _context.MedicalStaffs.FindAsync(dto.Id.Value) : null;
        if (entity == null) { entity = new MedicalStaff { Id = Guid.NewGuid(), StaffCode = $"STF-{DateTime.Now:yyyyMMddHHmmss}", CreatedAt = DateTime.Now }; _context.MedicalStaffs.Add(entity); }
        entity.FullName = dto.FullName; entity.StaffType = dto.StaffType ?? "Other"; entity.PrimaryDepartmentId = dto.DepartmentId; entity.LicenseNumber = dto.PracticeLicenseNumber; entity.Specialty = dto.Specialty; entity.Status = "Active";
        await _context.SaveChangesAsync();
        return await GetStaffAsync(entity.Id);
    }

    public async Task<bool> UpdateStaffStatusAsync(Guid id, string status, string reason)
    {
        var e = await _context.MedicalStaffs.FindAsync(id);
        if (e == null) return false;
        e.Status = status;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<MedicalStaffDto>> GetStaffWithExpiringLicensesAsync(int daysAhead = 90)
    {
        var expiryDate = DateTime.Today.AddDays(daysAhead);
        var list = await _context.MedicalStaffs.Where(x => x.LicenseExpiryDate != null && x.LicenseExpiryDate <= expiryDate && x.Status == "Active").ToListAsync();
        return list.Select(MapToStaffDto).ToList();
    }

    public async Task<QualificationDto> AddQualificationAsync(Guid staffId, QualificationDto dto)
    {
        var entity = new StaffQualification { Id = Guid.NewGuid(), StaffId = staffId, QualificationType = "Degree", Name = dto.Degree ?? "", IssuedBy = dto.Institution, IssueDate = new DateTime(dto.GraduationYear, 1, 1), CreatedAt = DateTime.Now };
        _context.StaffQualifications.Add(entity);
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> RemoveQualificationAsync(Guid id)
    {
        var e = await _context.StaffQualifications.FindAsync(id);
        if (e == null) return false;
        _context.StaffQualifications.Remove(e);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<CertificationDto> AddCertificationAsync(Guid staffId, CertificationDto dto)
    {
        var entity = new StaffQualification { Id = Guid.NewGuid(), StaffId = staffId, QualificationType = "Certification", Name = dto.CertificationName ?? "", IssuedBy = dto.IssuingBody, IssueDate = dto.IssueDate, ExpiryDate = dto.ExpiryDate, CreatedAt = DateTime.Now };
        _context.StaffQualifications.Add(entity);
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> RemoveCertificationAsync(Guid id) => await RemoveQualificationAsync(id);

    public async Task<DutyRosterDto> GetDutyRosterAsync(Guid departmentId, int year, int month)
    {
        var roster = await _context.DutyRosters.Include(x => x.Shifts).FirstOrDefaultAsync(x => x.DepartmentId == departmentId && x.Year == year && x.Month == month);
        if (roster == null) return null!;
        return new DutyRosterDto { Id = roster.Id, DepartmentId = roster.DepartmentId, Year = roster.Year, Month = roster.Month, Status = roster.Status };
    }

    public async Task<DutyRosterDto> CreateDutyRosterAsync(CreateDutyRosterDto dto)
    {
        var entity = new DutyRoster { Id = Guid.NewGuid(), DepartmentId = dto.DepartmentId, Year = dto.Year, Month = dto.Month, Status = "Draft", CreatedAt = DateTime.Now };
        _context.DutyRosters.Add(entity);
        await _context.SaveChangesAsync();
        return new DutyRosterDto { Id = entity.Id, DepartmentId = entity.DepartmentId, Year = entity.Year, Month = entity.Month, Status = entity.Status };
    }

    public async Task<DutyRosterDto> PublishDutyRosterAsync(Guid rosterId)
    {
        var e = await _context.DutyRosters.FindAsync(rosterId);
        if (e == null) return null!;
        e.Status = "Published"; e.PublishedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return await GetDutyRosterAsync(e.DepartmentId, e.Year, e.Month);
    }

    public async Task<DutyShiftDto> AddShiftAssignmentAsync(Guid shiftId, Guid staffId, string role)
    {
        var shift = await _context.DutyShifts.FindAsync(shiftId);
        if (shift == null) return null!;
        shift.StaffId = staffId;
        await _context.SaveChangesAsync();
        return new DutyShiftDto { Id = shift.Id, ShiftDate = shift.ShiftDate, ShiftType = shift.ShiftType };
    }

    public async Task<CopyRosterResultDto> CopyRosterWeekAsync(CopyRosterWeekDto dto, Guid userId)
    {
        var sourceStart = dto.SourceWeekStart.Date;
        var sourceEnd = sourceStart.AddDays(6);
        var targetStart = dto.TargetWeekStart.Date;
        var diff = (targetStart - sourceStart).Days;

        // Lấy ca trực của khoa trong tuần nguồn
        var sourceRosters = await _context.DutyRosters
            .Where(r => r.DepartmentId == dto.DepartmentId
                     && !r.IsDeleted
                     && ((r.Year == sourceStart.Year && r.Month == sourceStart.Month)
                      || (r.Year == sourceEnd.Year && r.Month == sourceEnd.Month)))
            .ToListAsync();

        var rosterIds = sourceRosters.Select(r => r.Id).ToList();
        var sourceShifts = await _context.DutyShifts
            .Where(s => rosterIds.Contains(s.DutyRosterId)
                     && s.ShiftDate >= sourceStart && s.ShiftDate <= sourceEnd
                     && !s.IsDeleted)
            .ToListAsync();

        if (!sourceShifts.Any())
            return new CopyRosterResultDto { TotalShifts = 0, CopiedShifts = 0, SkippedShifts = 0, Message = "Không có ca trực trong tuần nguồn" };

        // Lấy hoặc tạo DutyRoster cho tuần đích
        var targetRoster = await _context.DutyRosters
            .FirstOrDefaultAsync(r => r.DepartmentId == dto.DepartmentId
                                   && r.Year == targetStart.Year
                                   && r.Month == targetStart.Month
                                   && !r.IsDeleted);
        if (targetRoster == null)
        {
            targetRoster = new DutyRoster
            {
                Id = Guid.NewGuid(),
                DepartmentId = dto.DepartmentId,
                Year = targetStart.Year,
                Month = targetStart.Month,
                Status = "Draft",
                CreatedById = userId,
                CreatedAt = DateTime.UtcNow
            };
            _context.DutyRosters.Add(targetRoster);
        }

        int copied = 0, skipped = 0;
        foreach (var shift in sourceShifts)
        {
            var newDate = shift.ShiftDate.AddDays(diff);

            // Kiểm tra trùng (cùng staff + ngày + loại ca)
            var exists = await _context.DutyShifts.AnyAsync(s =>
                s.DutyRosterId == targetRoster.Id
                && s.StaffId == shift.StaffId
                && s.ShiftDate.Date == newDate.Date
                && s.ShiftType == shift.ShiftType
                && !s.IsDeleted);

            if (exists && !dto.OverwriteExisting)
            {
                skipped++;
                continue;
            }

            var newShift = new DutyShift
            {
                Id = Guid.NewGuid(),
                DutyRosterId = targetRoster.Id,
                StaffId = shift.StaffId,
                ShiftDate = newDate,
                ShiftType = shift.ShiftType,
                StartTime = shift.StartTime,
                EndTime = shift.EndTime,
                Status = "Scheduled",
                CreatedAt = DateTime.UtcNow
            };
            _context.DutyShifts.Add(newShift);
            copied++;
        }

        await _context.SaveChangesAsync();

        return new CopyRosterResultDto
        {
            TotalShifts = sourceShifts.Count,
            CopiedShifts = copied,
            SkippedShifts = skipped,
            Message = $"Đã sao chép {copied}/{sourceShifts.Count} ca trực sang tuần {targetStart:dd/MM/yyyy}"
        };
    }

    public async Task<bool> RemoveShiftAssignmentAsync(Guid assignmentId)
    {
        var e = await _context.DutyShifts.FindAsync(assignmentId);
        if (e == null) return false;
        e.Status = "Cancelled";
        await _context.SaveChangesAsync();
        return true;
    }

    public Task<List<ShiftSwapRequestDto>> GetPendingSwapRequestsAsync(Guid? departmentId = null) => Task.FromResult(new List<ShiftSwapRequestDto>());
    public Task<ShiftSwapRequestDto> RequestShiftSwapAsync(Guid assignmentId, Guid targetAssignmentId, string reason) => Task.FromResult(new ShiftSwapRequestDto { Id = Guid.NewGuid() });
    public Task<bool> ApproveSwapAsTargetAsync(Guid requestId, bool approve) => Task.FromResult(true);
    public Task<bool> ApproveSwapAsManagerAsync(Guid requestId, bool approve, string notes) => Task.FromResult(true);

    public async Task<List<ClinicAssignmentDto>> GetClinicAssignmentsAsync(DateTime date, Guid? departmentId = null)
    {
        var query = _context.ClinicAssignments.Include(x => x.Staff).Include(x => x.Room).Where(x => x.AssignmentDate.Date == date.Date);
        if (departmentId.HasValue) query = query.Where(x => x.Room != null && x.Room.DepartmentId == departmentId);
        var list = await query.ToListAsync();
        return list.Select(e => new ClinicAssignmentDto { Id = e.Id, DoctorId = e.StaffId, DoctorName = e.Staff?.FullName ?? "", RoomId = e.RoomId, RoomName = e.Room?.RoomCode ?? "", Date = e.AssignmentDate, Session = e.ShiftType, Status = e.Status }).ToList();
    }

    public async Task<ClinicAssignmentDto> CreateClinicAssignmentAsync(CreateClinicAssignmentDto dto)
    {
        var entity = new ClinicAssignment { Id = Guid.NewGuid(), StaffId = dto.DoctorId, RoomId = dto.RoomId, AssignmentDate = dto.Date, ShiftType = dto.Session ?? "Morning", MaxPatients = dto.MaxPatients, Status = "Active", CreatedAt = DateTime.Now };
        _context.ClinicAssignments.Add(entity);
        await _context.SaveChangesAsync();
        return new ClinicAssignmentDto { Id = entity.Id, DoctorId = entity.StaffId, Date = entity.AssignmentDate, Session = entity.ShiftType, Status = entity.Status };
    }

    public async Task<bool> CancelClinicAssignmentAsync(Guid id, string reason)
    {
        var e = await _context.ClinicAssignments.FindAsync(id);
        if (e == null) return false;
        e.Status = "Cancelled"; e.Notes = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public Task<List<CMECourseDto>> GetAvailableCoursesAsync(string? category = null) => Task.FromResult(new List<CMECourseDto>());

    public async Task<CMESummaryDto> GetStaffCMESummaryAsync(Guid staffId)
    {
        var records = await _context.CMERecords.Where(x => x.StaffId == staffId).ToListAsync();
        return new CMESummaryDto { StaffId = staffId, EarnedCredits = records.Sum(x => x.CreditHours), CurrentYearCredits = records.Where(x => x.ActivityDate.Year == DateTime.Now.Year).Sum(x => x.CreditHours) };
    }

    public async Task<CMERecordDto> RecordCMECompletionAsync(Guid staffId, Guid courseId, int creditsEarned, string certificateNumber)
    {
        var entity = new CMERecord { Id = Guid.NewGuid(), StaffId = staffId, ActivityName = "CME Course", ActivityType = "Course", ActivityDate = DateTime.Now, CreditHours = creditsEarned, CertificateNumber = certificateNumber, CreatedAt = DateTime.Now };
        _context.CMERecords.Add(entity);
        await _context.SaveChangesAsync();
        return new CMERecordDto { Id = entity.Id, StaffId = staffId, CreditsEarned = creditsEarned, CertificateNumber = certificateNumber };
    }

    public async Task<List<MedicalStaffDto>> GetCMENonCompliantStaffAsync()
    {
        try
        {
            var staffIds = await _context.CMERecords.GroupBy(x => x.StaffId).Where(g => g.Sum(x => x.CreditHours) < 24).Select(g => g.Key).ToListAsync();
            var list = await _context.MedicalStaffs.Where(x => staffIds.Contains(x.Id) && x.Status == "Active").ToListAsync();
            return list.Select(MapToStaffDto).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<MedicalStaffDto>();
        }
    }

    public Task<CompetencyAssessmentDto> GetCompetencyAssessmentAsync(Guid id) => Task.FromResult(new CompetencyAssessmentDto { Id = id });
    public Task<CompetencyAssessmentDto> CreateCompetencyAssessmentAsync(Guid staffId, CompetencyAssessmentDto dto) => Task.FromResult(dto);
    public Task<bool> SignAssessmentAsync(Guid id, string signatureType) => Task.FromResult(true);

    public async Task<MedicalHRDashboardDto> GetDashboardAsync()
    {
        try
        {
            return new MedicalHRDashboardDto
            {
                TotalStaff = await _context.MedicalStaffs.CountAsync(),
                ActiveDoctors = await _context.MedicalStaffs.CountAsync(x => x.StaffType == "Doctor" && x.Status == "Active"),
                ActiveNurses = await _context.MedicalStaffs.CountAsync(x => x.StaffType == "Nurse" && x.Status == "Active"),
                ExpiringLicenses30Days = await _context.MedicalStaffs.CountAsync(x => x.LicenseExpiryDate != null && x.LicenseExpiryDate <= DateTime.Today.AddDays(30))
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new MedicalHRDashboardDto();
        }
    }

    private static MedicalStaffDto MapToStaffDto(MedicalStaff e) => new()
    {
        Id = e.Id, StaffCode = e.StaffCode, FullName = e.FullName, StaffType = e.StaffType, Specialty = e.Specialty,
        DepartmentName = e.PrimaryDepartment?.DepartmentName ?? "", DepartmentId = e.PrimaryDepartmentId ?? Guid.Empty,
        PracticeLicenseNumber = e.LicenseNumber, LicenseExpiryDate = e.LicenseExpiryDate, Status = e.Status,
        JoinDate = e.JoinDate ?? DateTime.MinValue
    };

    // ============ HR Catalogs ============

    public async Task<List<HRCatalogDto>> GetCatalogsAsync(string? catalogType = null)
    {
        try
        {
            var query = _context.HRCatalogs.AsQueryable();
            if (!string.IsNullOrEmpty(catalogType)) query = query.Where(x => x.CatalogType == catalogType);
            var list = await query.OrderBy(x => x.CatalogType).ThenBy(x => x.SortOrder).ThenBy(x => x.Name).ToListAsync();
            return list.Select(e => new HRCatalogDto
            {
                Id = e.Id, CatalogType = e.CatalogType, Code = e.Code, Name = e.Name,
                Description = e.Description ?? "", SortOrder = e.SortOrder, IsActive = e.IsActive
            }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<HRCatalogDto>();
        }
    }

    public async Task<HRCatalogDto> SaveCatalogAsync(SaveHRCatalogDto dto)
    {
        var entity = dto.Id.HasValue ? await _context.HRCatalogs.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new HRCatalog { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            _context.HRCatalogs.Add(entity);
        }
        entity.CatalogType = dto.CatalogType; entity.Code = dto.Code; entity.Name = dto.Name;
        entity.Description = dto.Description; entity.SortOrder = dto.SortOrder; entity.IsActive = dto.IsActive;
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new HRCatalogDto { Id = entity.Id, CatalogType = entity.CatalogType, Code = entity.Code, Name = entity.Name, Description = entity.Description ?? "", SortOrder = entity.SortOrder, IsActive = entity.IsActive };
    }

    public async Task<bool> DeleteCatalogAsync(Guid id)
    {
        var entity = await _context.HRCatalogs.FindAsync(id);
        if (entity == null) return false;
        _context.HRCatalogs.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    // ============ Staff Contracts ============

    public async Task<List<StaffContractDto>> GetStaffContractsAsync(Guid? staffId = null, string? contractType = null)
    {
        try
        {
            var query = _context.StaffContracts.Include(x => x.Staff).AsQueryable();
            if (staffId.HasValue) query = query.Where(x => x.StaffId == staffId);
            if (!string.IsNullOrEmpty(contractType)) query = query.Where(x => x.ContractType == contractType);
            var list = await query.OrderByDescending(x => x.StartDate).ToListAsync();
            return list.Select(MapToContractDto).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<StaffContractDto>();
        }
    }

    public async Task<StaffContractDto> SaveContractAsync(SaveStaffContractDto dto)
    {
        var entity = dto.Id.HasValue ? await _context.StaffContracts.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new StaffContract { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            _context.StaffContracts.Add(entity);
        }
        entity.StaffId = dto.StaffId; entity.ContractType = dto.ContractType; entity.ContractNumber = dto.ContractNumber;
        entity.StartDate = dto.StartDate; entity.EndDate = dto.EndDate; entity.Terms = dto.Terms; entity.Notes = dto.Notes;
        entity.Status = entity.EndDate.HasValue && entity.EndDate.Value < DateTime.Today ? 1 : 0;
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return (await GetStaffContractsAsync(entity.StaffId)).FirstOrDefault(x => x.Id == entity.Id)!;
    }

    public async Task<List<StaffContractDto>> GetExpiringContractsAsync(int daysAhead = 90)
    {
        try
        {
            var expiryDate = DateTime.Today.AddDays(daysAhead);
            var list = await _context.StaffContracts.Include(x => x.Staff)
                .Where(x => x.Status == 0 && x.EndDate != null && x.EndDate <= expiryDate && x.EndDate >= DateTime.Today)
                .OrderBy(x => x.EndDate).ToListAsync();
            return list.Select(MapToContractDto).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<StaffContractDto>();
        }
    }

    private static StaffContractDto MapToContractDto(StaffContract e)
    {
        var statusNames = new[] { "Đang hiệu lực", "Đã hết hạn", "Đã chấm dứt", "Đã gia hạn" };
        return new StaffContractDto
        {
            Id = e.Id, StaffId = e.StaffId, StaffName = e.Staff?.FullName ?? "", StaffCode = e.Staff?.StaffCode ?? "",
            ContractType = e.ContractType, ContractNumber = e.ContractNumber, StartDate = e.StartDate, EndDate = e.EndDate,
            Terms = e.Terms ?? "", Status = e.Status, StatusName = e.Status >= 0 && e.Status < statusNames.Length ? statusNames[e.Status] : "Không rõ",
            Notes = e.Notes ?? "", DaysUntilExpiry = e.EndDate.HasValue ? (int)(e.EndDate.Value - DateTime.Today).TotalDays : null
        };
    }

    // ============ Salary History ============

    public async Task<List<SalaryRecordDto>> GetSalaryHistoryAsync(Guid staffId)
    {
        try
        {
            var list = await _context.SalaryRecords.Include(x => x.Staff).Where(x => x.StaffId == staffId).OrderByDescending(x => x.EffectiveDate).ToListAsync();
            return list.Select(e => new SalaryRecordDto
            {
                Id = e.Id, StaffId = e.StaffId, StaffName = e.Staff?.FullName ?? "", SalaryGrade = e.SalaryGrade,
                SalaryCoefficient = e.SalaryCoefficient, BaseSalary = e.BaseSalary, Allowance = e.Allowance,
                TotalSalary = e.BaseSalary + e.Allowance, EffectiveDate = e.EffectiveDate,
                DecisionNumber = e.DecisionNumber ?? "", Notes = e.Notes ?? ""
            }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<SalaryRecordDto>();
        }
    }

    public async Task<SalaryRecordDto> SaveSalaryRecordAsync(SaveSalaryRecordDto dto)
    {
        var entity = dto.Id.HasValue ? await _context.SalaryRecords.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new SalaryRecord { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            _context.SalaryRecords.Add(entity);
        }
        entity.StaffId = dto.StaffId; entity.SalaryGrade = dto.SalaryGrade; entity.SalaryCoefficient = dto.SalaryCoefficient;
        entity.BaseSalary = dto.BaseSalary; entity.Allowance = dto.Allowance; entity.EffectiveDate = dto.EffectiveDate;
        entity.DecisionNumber = dto.DecisionNumber; entity.Notes = dto.Notes; entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new SalaryRecordDto
        {
            Id = entity.Id, StaffId = entity.StaffId, SalaryGrade = entity.SalaryGrade,
            SalaryCoefficient = entity.SalaryCoefficient, BaseSalary = entity.BaseSalary, Allowance = entity.Allowance,
            TotalSalary = entity.BaseSalary + entity.Allowance, EffectiveDate = entity.EffectiveDate,
            DecisionNumber = entity.DecisionNumber ?? "", Notes = entity.Notes ?? ""
        };
    }

    // ============ Leave Management ============

    public async Task<List<LeaveRequestDto>> GetLeaveRequestsAsync(Guid? staffId = null, int? status = null, DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            var query = _context.LeaveRequests.Include(x => x.Staff).ThenInclude(s => s!.PrimaryDepartment).AsQueryable();
            if (staffId.HasValue) query = query.Where(x => x.StaffId == staffId);
            if (status.HasValue) query = query.Where(x => x.Status == status);
            if (fromDate.HasValue) query = query.Where(x => x.StartDate >= fromDate);
            if (toDate.HasValue) query = query.Where(x => x.EndDate <= toDate);
            var list = await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
            return list.Select(MapToLeaveDto).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<LeaveRequestDto>();
        }
    }

    public async Task<LeaveRequestDto> CreateLeaveRequestAsync(CreateLeaveRequestDto dto)
    {
        var entity = new LeaveRequest
        {
            Id = Guid.NewGuid(), StaffId = dto.StaffId, LeaveType = dto.LeaveType,
            StartDate = dto.StartDate, EndDate = dto.EndDate, TotalDays = dto.TotalDays,
            Reason = dto.Reason, Status = 0, CreatedAt = DateTime.Now
        };
        _context.LeaveRequests.Add(entity);
        await _context.SaveChangesAsync();
        return (await GetLeaveRequestsAsync(entity.StaffId)).FirstOrDefault(x => x.Id == entity.Id)!;
    }

    public async Task<LeaveRequestDto> ApproveLeaveAsync(Guid id, LeaveApprovalDto dto)
    {
        var entity = await _context.LeaveRequests.Include(x => x.Staff).ThenInclude(s => s!.PrimaryDepartment).FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null!;
        entity.Status = dto.Approved ? 1 : 2;
        entity.ApproverNote = dto.Note;
        entity.ApprovedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return MapToLeaveDto(entity);
    }

    public async Task<LeaveBalanceDto> GetLeaveBalanceAsync(Guid staffId, int year)
    {
        try
        {
            var staff = await _context.MedicalStaffs.FindAsync(staffId);
            var approved = await _context.LeaveRequests.Where(x => x.StaffId == staffId && x.Status == 1 && x.StartDate.Year == year).ToListAsync();
            var pending = await _context.LeaveRequests.Where(x => x.StaffId == staffId && x.Status == 0 && x.StartDate.Year == year).SumAsync(x => x.TotalDays);
            var annualUsed = approved.Where(x => x.LeaveType == "Annual").Sum(x => x.TotalDays);
            var sickUsed = approved.Where(x => x.LeaveType == "Sick").Sum(x => x.TotalDays);
            return new LeaveBalanceDto
            {
                StaffId = staffId, StaffName = staff?.FullName ?? "", Year = year,
                AnnualEntitlement = 12, UsedDays = annualUsed, RemainingDays = 12 - annualUsed,
                SickDaysUsed = sickUsed, PendingRequests = pending
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new LeaveBalanceDto { StaffId = staffId, Year = year, AnnualEntitlement = 12, RemainingDays = 12 };
        }
    }

    private static LeaveRequestDto MapToLeaveDto(LeaveRequest e)
    {
        var statusNames = new[] { "Chờ duyệt", "Đã duyệt", "Từ chối", "Đã hủy" };
        return new LeaveRequestDto
        {
            Id = e.Id, StaffId = e.StaffId, StaffName = e.Staff?.FullName ?? "", StaffCode = e.Staff?.StaffCode ?? "",
            DepartmentName = e.Staff?.PrimaryDepartment?.DepartmentName ?? "", LeaveType = e.LeaveType,
            StartDate = e.StartDate, EndDate = e.EndDate, TotalDays = e.TotalDays, Reason = e.Reason ?? "",
            Status = e.Status, StatusName = e.Status >= 0 && e.Status < statusNames.Length ? statusNames[e.Status] : "Không rõ",
            ApprovedAt = e.ApprovedAt, ApproverNote = e.ApproverNote ?? "", CreatedAt = e.CreatedAt
        };
    }

    // ============ Attendance ============

    public async Task<List<AttendanceRecordDto>> GetAttendanceAsync(Guid? staffId = null, DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            var query = _context.AttendanceRecords.Include(x => x.Staff).ThenInclude(s => s!.PrimaryDepartment).AsQueryable();
            if (staffId.HasValue) query = query.Where(x => x.StaffId == staffId);
            if (fromDate.HasValue) query = query.Where(x => x.WorkDate >= fromDate);
            if (toDate.HasValue) query = query.Where(x => x.WorkDate <= toDate);
            var list = await query.OrderByDescending(x => x.WorkDate).Take(500).ToListAsync();
            return list.Select(MapToAttendanceDto).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<AttendanceRecordDto>();
        }
    }

    public async Task<AttendanceRecordDto> RecordAttendanceAsync(SaveAttendanceDto dto)
    {
        var entity = dto.Id.HasValue ? await _context.AttendanceRecords.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new AttendanceRecord { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            _context.AttendanceRecords.Add(entity);
        }
        entity.StaffId = dto.StaffId; entity.WorkDate = dto.WorkDate; entity.CheckInTime = dto.CheckInTime;
        entity.CheckOutTime = dto.CheckOutTime; entity.ShiftType = dto.ShiftType ?? "Morning";
        entity.WorkHours = dto.WorkHours; entity.OvertimeHours = dto.OvertimeHours;
        entity.Status = dto.Status ?? "Present"; entity.Notes = dto.Notes; entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        var saved = await _context.AttendanceRecords.Include(x => x.Staff).ThenInclude(s => s!.PrimaryDepartment).FirstOrDefaultAsync(x => x.Id == entity.Id);
        return saved == null ? null! : MapToAttendanceDto(saved);
    }

    public async Task<List<HIS.Application.DTOs.MedicalHR.AttendanceSummaryDto>> GetAttendanceSummaryAsync(int year, int month, Guid? departmentId = null)
    {
        try
        {
            var query = _context.AttendanceRecords.Include(x => x.Staff).ThenInclude(s => s!.PrimaryDepartment)
                .Where(x => x.WorkDate.Year == year && x.WorkDate.Month == month);
            if (departmentId.HasValue) query = query.Where(x => x.Staff != null && x.Staff.PrimaryDepartmentId == departmentId);
            var records = await query.ToListAsync();
            return records.GroupBy(x => x.StaffId).Select(g =>
            {
                var first = g.First();
                return new HIS.Application.DTOs.MedicalHR.AttendanceSummaryDto
                {
                    StaffId = g.Key, StaffName = first.Staff?.FullName ?? "", StaffCode = first.Staff?.StaffCode ?? "",
                    DepartmentName = first.Staff?.PrimaryDepartment?.DepartmentName ?? "", Year = year, Month = month,
                    WorkDays = g.Count(), PresentDays = g.Count(x => x.Status == "Present"),
                    AbsentDays = g.Count(x => x.Status == "Absent"), LeaveDays = g.Count(x => x.Status == "Leave"),
                    HolidayDays = g.Count(x => x.Status == "Holiday"),
                    TotalWorkHours = g.Sum(x => x.WorkHours), TotalOvertimeHours = g.Sum(x => x.OvertimeHours)
                };
            }).OrderBy(x => x.DepartmentName).ThenBy(x => x.StaffName).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<HIS.Application.DTOs.MedicalHR.AttendanceSummaryDto>();
        }
    }

    private static AttendanceRecordDto MapToAttendanceDto(AttendanceRecord e) => new()
    {
        Id = e.Id, StaffId = e.StaffId, StaffName = e.Staff?.FullName ?? "", StaffCode = e.Staff?.StaffCode ?? "",
        DepartmentName = e.Staff?.PrimaryDepartment?.DepartmentName ?? "", WorkDate = e.WorkDate,
        CheckInTime = e.CheckInTime, CheckOutTime = e.CheckOutTime, ShiftType = e.ShiftType,
        WorkHours = e.WorkHours, OvertimeHours = e.OvertimeHours, Status = e.Status, Notes = e.Notes ?? ""
    };

    // ============ Overtime ============

    public async Task<List<OvertimeRecordDto>> GetOvertimeRequestsAsync(Guid? staffId = null, int? status = null, DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            var query = _context.OvertimeRecords.Include(x => x.Staff).ThenInclude(s => s!.PrimaryDepartment).AsQueryable();
            if (staffId.HasValue) query = query.Where(x => x.StaffId == staffId);
            if (status.HasValue) query = query.Where(x => x.Status == status);
            if (fromDate.HasValue) query = query.Where(x => x.OvertimeDate >= fromDate);
            if (toDate.HasValue) query = query.Where(x => x.OvertimeDate <= toDate);
            var list = await query.OrderByDescending(x => x.OvertimeDate).ToListAsync();
            return list.Select(MapToOvertimeDto).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<OvertimeRecordDto>();
        }
    }

    public async Task<OvertimeRecordDto> CreateOvertimeAsync(CreateOvertimeDto dto)
    {
        var entity = new OvertimeRecord
        {
            Id = Guid.NewGuid(), StaffId = dto.StaffId, OvertimeDate = dto.OvertimeDate,
            StartTime = dto.StartTime, EndTime = dto.EndTime, Hours = dto.Hours,
            Reason = dto.Reason, Status = 0, CreatedAt = DateTime.Now
        };
        _context.OvertimeRecords.Add(entity);
        await _context.SaveChangesAsync();
        return (await GetOvertimeRequestsAsync(entity.StaffId)).FirstOrDefault(x => x.Id == entity.Id)!;
    }

    public async Task<OvertimeRecordDto> ApproveOvertimeAsync(Guid id, OvertimeApprovalDto dto)
    {
        var entity = await _context.OvertimeRecords.Include(x => x.Staff).ThenInclude(s => s!.PrimaryDepartment).FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null!;
        entity.Status = dto.Approved ? 1 : 2;
        entity.ApproverNote = dto.Note;
        entity.ApprovedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return MapToOvertimeDto(entity);
    }

    private static OvertimeRecordDto MapToOvertimeDto(OvertimeRecord e)
    {
        var statusNames = new[] { "Chờ duyệt", "Đã duyệt", "Từ chối" };
        return new OvertimeRecordDto
        {
            Id = e.Id, StaffId = e.StaffId, StaffName = e.Staff?.FullName ?? "", StaffCode = e.Staff?.StaffCode ?? "",
            DepartmentName = e.Staff?.PrimaryDepartment?.DepartmentName ?? "", OvertimeDate = e.OvertimeDate,
            StartTime = e.StartTime, EndTime = e.EndTime, Hours = e.Hours, Reason = e.Reason ?? "",
            Status = e.Status, StatusName = e.Status >= 0 && e.Status < statusNames.Length ? statusNames[e.Status] : "Không rõ",
            ApprovedAt = e.ApprovedAt, ApproverNote = e.ApproverNote ?? ""
        };
    }

    // ============ Awards & Discipline ============

    public async Task<List<StaffAwardDto>> GetStaffAwardsAsync(Guid? staffId = null)
    {
        try
        {
            var query = _context.StaffAwards.Include(x => x.Staff).AsQueryable();
            if (staffId.HasValue) query = query.Where(x => x.StaffId == staffId);
            var list = await query.OrderByDescending(x => x.AwardDate).ToListAsync();
            return list.Select(e => new StaffAwardDto
            {
                Id = e.Id, StaffId = e.StaffId, StaffName = e.Staff?.FullName ?? "", StaffCode = e.Staff?.StaffCode ?? "",
                AwardType = e.AwardType, Title = e.Title, AwardDate = e.AwardDate,
                DecisionNumber = e.DecisionNumber ?? "", Description = e.Description ?? "", IssuedBy = e.IssuedBy ?? ""
            }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<StaffAwardDto>();
        }
    }

    public async Task<StaffAwardDto> SaveAwardAsync(SaveStaffAwardDto dto)
    {
        var entity = dto.Id.HasValue ? await _context.StaffAwards.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new StaffAward { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            _context.StaffAwards.Add(entity);
        }
        entity.StaffId = dto.StaffId; entity.AwardType = dto.AwardType; entity.Title = dto.Title;
        entity.AwardDate = dto.AwardDate; entity.DecisionNumber = dto.DecisionNumber;
        entity.Description = dto.Description; entity.IssuedBy = dto.IssuedBy; entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new StaffAwardDto
        {
            Id = entity.Id, StaffId = entity.StaffId, AwardType = entity.AwardType, Title = entity.Title,
            AwardDate = entity.AwardDate, DecisionNumber = entity.DecisionNumber ?? "",
            Description = entity.Description ?? "", IssuedBy = entity.IssuedBy ?? ""
        };
    }

    public async Task<List<StaffDisciplineDto>> GetStaffDisciplinesAsync(Guid? staffId = null)
    {
        try
        {
            var query = _context.StaffDisciplines.Include(x => x.Staff).AsQueryable();
            if (staffId.HasValue) query = query.Where(x => x.StaffId == staffId);
            var list = await query.OrderByDescending(x => x.DisciplineDate).ToListAsync();
            return list.Select(e => new StaffDisciplineDto
            {
                Id = e.Id, StaffId = e.StaffId, StaffName = e.Staff?.FullName ?? "", StaffCode = e.Staff?.StaffCode ?? "",
                DisciplineType = e.DisciplineType, Title = e.Title, DisciplineDate = e.DisciplineDate,
                ExpiryDate = e.ExpiryDate, DecisionNumber = e.DecisionNumber ?? "", Description = e.Description ?? "",
                IsExpired = e.ExpiryDate.HasValue && e.ExpiryDate.Value < DateTime.Today
            }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<StaffDisciplineDto>();
        }
    }

    public async Task<StaffDisciplineDto> SaveDisciplineAsync(SaveStaffDisciplineDto dto)
    {
        var entity = dto.Id.HasValue ? await _context.StaffDisciplines.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new StaffDiscipline { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            _context.StaffDisciplines.Add(entity);
        }
        entity.StaffId = dto.StaffId; entity.DisciplineType = dto.DisciplineType; entity.Title = dto.Title;
        entity.DisciplineDate = dto.DisciplineDate; entity.ExpiryDate = dto.ExpiryDate;
        entity.DecisionNumber = dto.DecisionNumber; entity.Description = dto.Description; entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new StaffDisciplineDto
        {
            Id = entity.Id, StaffId = entity.StaffId, DisciplineType = entity.DisciplineType, Title = entity.Title,
            DisciplineDate = entity.DisciplineDate, ExpiryDate = entity.ExpiryDate,
            DecisionNumber = entity.DecisionNumber ?? "", Description = entity.Description ?? "",
            IsExpired = entity.ExpiryDate.HasValue && entity.ExpiryDate.Value < DateTime.Today
        };
    }

    // ============ Reports ============

    public async Task<List<StaffByDepartmentReportDto>> GetStaffByDepartmentReportAsync(Guid? departmentId = null)
    {
        try
        {
            var query = _context.MedicalStaffs.Include(x => x.PrimaryDepartment).Where(x => x.Status == "Active");
            if (departmentId.HasValue) query = query.Where(x => x.PrimaryDepartmentId == departmentId);
            var staff = await query.ToListAsync();
            return staff.GroupBy(x => x.PrimaryDepartment?.DepartmentName ?? "Không xác định").Select(g => new StaffByDepartmentReportDto
            {
                DepartmentName = g.Key, TotalStaff = g.Count(),
                Doctors = g.Count(x => x.StaffType == "Doctor"), Nurses = g.Count(x => x.StaffType == "Nurse"),
                Technicians = g.Count(x => x.StaffType == "Technician"),
                Others = g.Count(x => x.StaffType != "Doctor" && x.StaffType != "Nurse" && x.StaffType != "Technician"),
                Staff = g.Select(MapToStaffDto).ToList()
            }).OrderBy(x => x.DepartmentName).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<StaffByDepartmentReportDto>();
        }
    }

    public async Task<AttendanceReportDto> GetAttendanceReportAsync(int year, int month, Guid? departmentId = null)
    {
        try
        {
            var summaries = await GetAttendanceSummaryAsync(year, month, departmentId);
            var deptName = "Toàn viện";
            if (departmentId.HasValue)
            {
                var dept = await _context.Set<Department>().FindAsync(departmentId.Value);
                deptName = dept?.DepartmentName ?? deptName;
            }
            return new AttendanceReportDto
            {
                Year = year, Month = month, DepartmentName = deptName, TotalStaff = summaries.Count,
                AvgWorkDays = summaries.Count > 0 ? (decimal)Math.Round(summaries.Average(x => (double)x.PresentDays), 1) : 0,
                AvgOvertimeHours = summaries.Count > 0 ? (decimal)Math.Round(summaries.Average(x => (double)x.TotalOvertimeHours), 1) : 0,
                TotalAbsentDays = summaries.Sum(x => x.AbsentDays), Details = summaries
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new AttendanceReportDto { Year = year, Month = month, Details = new List<HIS.Application.DTOs.MedicalHR.AttendanceSummaryDto>() };
        }
    }

    public async Task<LeaveReportDto> GetLeaveReportAsync(int year, int month, Guid? departmentId = null)
    {
        try
        {
            var query = _context.LeaveRequests.Include(x => x.Staff).ThenInclude(s => s!.PrimaryDepartment)
                .Where(x => x.StartDate.Year == year && x.StartDate.Month == month);
            if (departmentId.HasValue) query = query.Where(x => x.Staff != null && x.Staff.PrimaryDepartmentId == departmentId);
            var list = await query.ToListAsync();
            var deptName = "Toàn viện";
            if (departmentId.HasValue)
            {
                var dept = await _context.Set<Department>().FindAsync(departmentId.Value);
                deptName = dept?.DepartmentName ?? deptName;
            }
            return new LeaveReportDto
            {
                Year = year, Month = month, DepartmentName = deptName, TotalRequests = list.Count,
                ApprovedRequests = list.Count(x => x.Status == 1), RejectedRequests = list.Count(x => x.Status == 2),
                PendingRequests = list.Count(x => x.Status == 0), TotalLeaveDays = list.Where(x => x.Status == 1).Sum(x => x.TotalDays),
                Details = list.Select(MapToLeaveDto).ToList()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new LeaveReportDto { Year = year, Month = month, Details = new List<LeaveRequestDto>() };
        }
    }

    public async Task<OvertimeReportDto> GetOvertimeReportAsync(int year, int month, Guid? departmentId = null)
    {
        try
        {
            var query = _context.OvertimeRecords.Include(x => x.Staff).ThenInclude(s => s!.PrimaryDepartment)
                .Where(x => x.OvertimeDate.Year == year && x.OvertimeDate.Month == month);
            if (departmentId.HasValue) query = query.Where(x => x.Staff != null && x.Staff.PrimaryDepartmentId == departmentId);
            var list = await query.ToListAsync();
            var deptName = "Toàn viện";
            if (departmentId.HasValue)
            {
                var dept = await _context.Set<Department>().FindAsync(departmentId.Value);
                deptName = dept?.DepartmentName ?? deptName;
            }
            return new OvertimeReportDto
            {
                Year = year, Month = month, DepartmentName = deptName, TotalRequests = list.Count,
                TotalHours = list.Sum(x => x.Hours), ApprovedHours = list.Where(x => x.Status == 1).Sum(x => x.Hours),
                Details = list.Select(MapToOvertimeDto).ToList()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new OvertimeReportDto { Year = year, Month = month, Details = new List<OvertimeRecordDto>() };
        }
    }

    public async Task<StaffMovementReportDto> GetStaffMovementReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var newHires = await _context.MedicalStaffs.Where(x => x.JoinDate >= fromDate && x.JoinDate <= toDate).CountAsync();
            var resignations = await _context.MedicalStaffs.Where(x => x.TerminationDate >= fromDate && x.TerminationDate <= toDate).CountAsync();
            var contractsExpired = await _context.StaffContracts.Where(x => x.EndDate >= fromDate && x.EndDate <= toDate && x.Status == 1).CountAsync();
            var contractsRenewed = await _context.StaffContracts.Where(x => x.CreatedAt >= fromDate && x.CreatedAt <= toDate && x.Status == 3).CountAsync();

            var items = new List<StaffMovementItemDto>();

            // New hires
            var hires = await _context.MedicalStaffs.Include(x => x.PrimaryDepartment)
                .Where(x => x.JoinDate >= fromDate && x.JoinDate <= toDate).ToListAsync();
            items.AddRange(hires.Select(e => new StaffMovementItemDto
            {
                StaffName = e.FullName, StaffCode = e.StaffCode, DepartmentName = e.PrimaryDepartment?.DepartmentName ?? "",
                MovementType = "NewHire", MovementDate = e.JoinDate ?? e.CreatedAt, Details = $"Tuyển mới - {e.StaffType}"
            }));

            // Resignations
            var resigned = await _context.MedicalStaffs.Include(x => x.PrimaryDepartment)
                .Where(x => x.TerminationDate >= fromDate && x.TerminationDate <= toDate).ToListAsync();
            items.AddRange(resigned.Select(e => new StaffMovementItemDto
            {
                StaffName = e.FullName, StaffCode = e.StaffCode, DepartmentName = e.PrimaryDepartment?.DepartmentName ?? "",
                MovementType = "Resignation", MovementDate = e.TerminationDate ?? e.UpdatedAt ?? DateTime.Now, Details = "Nghỉ việc"
            }));

            return new StaffMovementReportDto
            {
                FromDate = fromDate, ToDate = toDate, NewHires = newHires, Resignations = resignations,
                ContractsExpired = contractsExpired, ContractsRenewed = contractsRenewed,
                Items = items.OrderByDescending(x => x.MovementDate).ToList()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new StaffMovementReportDto { FromDate = fromDate, ToDate = toDate, Items = new List<StaffMovementItemDto>() };
        }
    }
}
#endregion
