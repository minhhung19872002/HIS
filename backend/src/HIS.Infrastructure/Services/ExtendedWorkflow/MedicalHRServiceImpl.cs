using HIS.Application.DTOs.MedicalHR;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

// K7 phien 1 (2026-05-30): tach MedicalHRServiceImpl (~795 dong) khoi ExtendedWorkflowServices.cs.
// 1 class/file convention C# (anti-pattern fix). ZERO runtime change.
#region Flow 16: Medical HR Service - Real Implementation
public partial class MedicalHRServiceImpl : IMedicalHRService
{
    private readonly HISDbContext _context;
    public MedicalHRServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<MedicalStaffDto>> GetStaffListAsync(Guid? departmentId = null, string? staffType = null, string? status = null)
    {
        var query = _context.MedicalStaffs.Include(x => x.PrimaryDepartment).AsQueryable();
        if (departmentId.HasValue) query = query.Where(x => x.PrimaryDepartmentId == departmentId);
        if (!string.IsNullOrEmpty(staffType)) query = query.Where(x => x.StaffType == staffType);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.ToBoundedListAsync("MedicalHR.GetStaffList");
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
        if (entity == null) { entity = new MedicalStaff { Id = Guid.NewGuid(), StaffCode = CodeGenerator.Timestamp("STF"), CreatedAt = DateTime.Now }; _context.MedicalStaffs.Add(entity); }
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
        var list = await _context.MedicalStaffs.Where(x => x.LicenseExpiryDate != null && x.LicenseExpiryDate <= expiryDate && x.Status == "Active").ToBoundedListAsync("MedicalHR.ExpiringLicenses");
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

    public async Task<List<StaffRosterAssignmentDto>> GetStaffRosterAsync(Guid userOrStaffId, int year, int month)
    {
        if (year < 2000 || year > 2100 || month < 1 || month > 12)
            throw new InvalidOperationException("Tháng/năm lịch trực không hợp lệ.");

        var staff = await _context.MedicalStaffs.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == userOrStaffId || s.UserId == userOrStaffId);
        if (staff == null) return new List<StaffRosterAssignmentDto>();

        var shifts = await _context.DutyShifts.AsNoTracking()
            .Include(s => s.DutyRoster).ThenInclude(r => r!.Department)
            .Where(s => s.StaffId == staff.Id
                && s.ShiftDate.Year == year
                && s.ShiftDate.Month == month)
            .OrderBy(s => s.ShiftDate)
            .ThenBy(s => s.StartTime)
            .ToListAsync();

        return shifts.Select(s =>
        {
            var duration = s.EndTime >= s.StartTime
                ? s.EndTime - s.StartTime
                : TimeSpan.FromHours(24) - s.StartTime + s.EndTime;
            var isOnCall = s.ShiftType.Equals("OnCall", StringComparison.OrdinalIgnoreCase)
                || s.ShiftType.Equals("24h", StringComparison.OrdinalIgnoreCase);

            return new StaffRosterAssignmentDto
            {
                Id = s.Id,
                RosterId = s.DutyRosterId,
                StaffId = staff.Id,
                StaffCode = staff.StaffCode,
                StaffName = staff.FullName,
                StaffType = staff.StaffType,
                Date = s.ShiftDate,
                DayOfWeek = s.ShiftDate.DayOfWeek.ToString(),
                ShiftId = s.Id,
                ShiftName = LocalizeShiftName(s.ShiftType),
                ShiftStart = s.StartTime.ToString(@"hh\:mm"),
                ShiftEnd = s.EndTime.ToString(@"hh\:mm"),
                Location = s.DutyRoster?.Department?.DepartmentName,
                IsOnCall = isOnCall,
                IsOvertime = duration.TotalHours > 8,
                OvertimeHours = duration.TotalHours > 8 ? (decimal)(duration.TotalHours - 8) : null,
                Status = s.Status switch
                {
                    "Confirmed" => 2,
                    "Completed" => 3,
                    "Absent" => 4,
                    "Swapped" => 5,
                    _ => 1
                }
            };
        }).ToList();
    }

    private static string LocalizeShiftName(string shiftType) => shiftType switch
    {
        "Morning" => "Ca sáng",
        "Afternoon" => "Ca chiều",
        "Night" => "Ca đêm",
        "OnCall" => "Trực",
        "24h" => "Trực 24 giờ",
        _ => shiftType
    };

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

        // #195: nạp 1 lần các ca đã có của bảng đích thay vì 1 query/ca nguồn. ShiftType là
        // nvarchar nên SQL so CI_AS (không phân biệt hoa/thường) — chuẩn hoá khoá để so trong bộ
        // nhớ y như vậy, không thì 'morning' và 'Morning' bị coi là 2 ca khác nhau.
        static string ShiftKey(string? shiftType) => (shiftType ?? string.Empty).Trim().ToUpperInvariant();
        var existingShiftKeys = (await _context.DutyShifts
                .Where(s => s.DutyRosterId == targetRoster.Id && !s.IsDeleted)
                .Select(s => new { s.StaffId, s.ShiftDate, s.ShiftType })
                .ToListAsync())
            .Select(s => (s.StaffId, s.ShiftDate.Date, ShiftKey(s.ShiftType)))
            .ToHashSet();

        int copied = 0, skipped = 0;
        foreach (var shift in sourceShifts)
        {
            var newDate = shift.ShiftDate.AddDays(diff);

            // Kiểm tra trùng (cùng staff + ngày + loại ca)
            var exists = existingShiftKeys.Contains((shift.StaffId, newDate.Date, ShiftKey(shift.ShiftType)));

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
        var list = await query.ToBoundedListAsync("MedicalHR.ClinicAssignments");
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
            var list = await _context.MedicalStaffs.Where(x => staffIds.Contains(x.Id) && x.Status == "Active").ToBoundedListAsync("MedicalHR.CMENonCompliantStaff");
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

}
#endregion
