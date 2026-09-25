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

    private const int CmeRequiredHoursPerYear = HIS.Core.Constants.CmeRequirement.HoursPerYear;

    public async Task<List<MedicalStaffDto>> GetStaffListAsync(Guid? departmentId = null, string? staffType = null, string? status = null)
    {
        var query = _context.MedicalStaffs.Include(x => x.PrimaryDepartment).AsQueryable();
        if (departmentId.HasValue) query = query.Where(x => x.PrimaryDepartmentId == departmentId);
        if (!string.IsNullOrEmpty(staffType)) query = query.Where(x => x.StaffType == staffType);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        // QA-R11: deterministic order so the controller's page/pageSize slices are stable.
        query = query.OrderBy(x => x.FullName).ThenBy(x => x.Id);
        var list = await query.ToBoundedListAsync("MedicalHR.GetStaffList");
        var dtos = list.Select(MapToStaffDto).ToList();
        await FillStaffDemographicsAsync(dtos);
        return dtos;
    }

    public async Task<MedicalStaffDto> GetStaffAsync(Guid id)
    {
        var e = await _context.MedicalStaffs.Include(x => x.PrimaryDepartment).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        var dto = MapToStaffDto(e);
        await FillStaffDemographicsAsync(new List<MedicalStaffDto> { dto });
        return dto;
    }

    // QA-R7: the HR form sends DateOfBirth/Gender but MedicalStaffs has no such columns yet (PROPOSED migration:
    // ALTER TABLE MedicalStaffs ADD DateOfBirth date NULL, Gender nvarchar(20) NULL). They are deliberately NOT
    // mapped on the entity — every MedicalStaffs query (incl. the CCHN prescribing gate) would fail until the
    // columns exist. Raw SQL guarded by ExtendedWorkflowSqlGuard: a no-op before the migration, persisted after.
    private sealed class StaffDemographicsRow
    {
        public Guid Id { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
    }

    private async Task SaveStaffDemographicsAsync(Guid staffId, DateTime? dateOfBirth, string? gender)
    {
        if (!dateOfBirth.HasValue && string.IsNullOrWhiteSpace(gender)) return;
        if (!_context.Database.IsRelational()) return;
        var dob = dateOfBirth?.Date;
        var g = string.IsNullOrWhiteSpace(gender) ? null : gender.Trim();
        try
        {
            await _context.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE MedicalStaffs SET DateOfBirth = COALESCE({dob}, DateOfBirth), Gender = COALESCE({g}, Gender) WHERE Id = {staffId}");
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex)) { /* columns not migrated yet */ }
    }

    private async Task FillStaffDemographicsAsync(List<MedicalStaffDto> dtos)
    {
        if (dtos.Count == 0 || !_context.Database.IsRelational()) return;
        var ids = dtos.Select(d => d.Id).ToList();
        try
        {
            var rows = await _context.Database
                .SqlQuery<StaffDemographicsRow>($"SELECT Id, DateOfBirth, Gender FROM MedicalStaffs")
                .Where(r => ids.Contains(r.Id))
                .ToDictionaryAsync(r => r.Id);
            foreach (var d in dtos)
            {
                if (!rows.TryGetValue(d.Id, out var r)) continue;
                if (r.DateOfBirth.HasValue) d.DateOfBirth = r.DateOfBirth.Value;
                if (r.Gender != null) d.Gender = r.Gender;
            }
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex)) { /* columns not migrated yet */ }
    }

    public async Task<MedicalStaffDto> SaveStaffAsync(SaveMedicalStaffDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName))
            throw new ArgumentException("Họ tên nhân viên là bắt buộc", nameof(dto.FullName));
        if (dto.LicenseIssueDate.HasValue && dto.LicenseExpiryDate.HasValue && dto.LicenseExpiryDate < dto.LicenseIssueDate)
            throw new ArgumentException("Ngày hết hạn CCHN phải sau ngày cấp", nameof(dto.LicenseExpiryDate));
        MedicalStaff? entity = null;
        if (dto.Id.HasValue)
        {
            // Unknown Id used to silently create a brand-new staff record.
            entity = await _context.MedicalStaffs.FindAsync(dto.Id.Value)
                ?? throw new KeyNotFoundException("Không tìm thấy nhân viên");
        }
        if (dto.DepartmentId is Guid deptId && deptId != Guid.Empty && !await _context.Departments.AnyAsync(d => d.Id == deptId))
            throw new KeyNotFoundException("Không tìm thấy khoa/phòng");
        // The staff code typed in the v2 form was discarded (always replaced by a generated STF-… code).
        var requestedCode = (dto.StaffCode ?? dto.EmployeeCode)?.Trim();
        if (!string.IsNullOrEmpty(requestedCode)
            && await _context.MedicalStaffs.AnyAsync(s => s.StaffCode == requestedCode && s.Id != (dto.Id ?? Guid.Empty)))
            throw new InvalidOperationException($"Mã nhân viên {requestedCode} đã tồn tại");
        if (entity == null) { entity = new MedicalStaff { Id = Guid.NewGuid(), StaffCode = string.IsNullOrEmpty(requestedCode) ? CodeGenerator.Timestamp("STF") : requestedCode, Status = "Active", CreatedAt = DateTime.Now }; _context.MedicalStaffs.Add(entity); }
        else if (!string.IsNullOrEmpty(requestedCode)) entity.StaffCode = requestedCode;
        entity.FullName = dto.FullName; entity.StaffType = dto.StaffType ?? "Other";
        if (dto.DepartmentId is Guid newDept && newDept != Guid.Empty) entity.PrimaryDepartmentId = newDept;
        entity.LicenseNumber = dto.PracticeLicenseNumber ?? entity.LicenseNumber; entity.Specialty = dto.Specialty;
        // Previously accepted but never persisted (license expiry drives the expiring-license alerts).
        entity.LicenseIssueDate = dto.LicenseIssueDate; entity.LicenseExpiryDate = dto.LicenseExpiryDate;
        entity.LicenseIssuedBy = dto.IssuingAuthority ?? entity.LicenseIssuedBy;
        entity.JoinDate = dto.JoinDate ?? dto.HireDate ?? entity.JoinDate;
        entity.PersonalPhone = dto.Phone ?? entity.PersonalPhone; entity.PersonalEmail = dto.Email ?? entity.PersonalEmail;
        // Status is NOT reset on update (a resigned/suspended staff used to flip back to Active on every save).
        await LinkStaffUserAsync(entity, dto.UserId, requestedCode);
        await _context.SaveChangesAsync();
        await SaveStaffDemographicsAsync(entity.Id, dto.DateOfBirth, dto.Gender);
        return await GetStaffAsync(entity.Id);
    }

    /// <summary>
    /// Links MedicalStaffs.UserId so the CCHN prescribing gate can find the doctor's licence. Staff created from the
    /// v2 HR form were never linked (UserId = Guid.Empty) → the gate could only warn "no data" for them.
    /// Explicit choice wins; otherwise, when still unlinked, auto-link a unique account with the same employee code.
    /// </summary>
    private async Task LinkStaffUserAsync(MedicalStaff entity, Guid? chosenUserId, string? staffCode)
    {
        Guid? target = null;
        if (chosenUserId is Guid chosen && chosen != Guid.Empty)
        {
            if (!await _context.Users.AnyAsync(u => u.Id == chosen))
                throw new KeyNotFoundException("Không tìm thấy tài khoản người dùng được chọn");
            target = chosen;
        }
        else if (entity.UserId == Guid.Empty && !string.IsNullOrEmpty(staffCode))
        {
            var matches = await _context.Users.Where(u => u.EmployeeCode == staffCode).Select(u => u.Id).Take(2).ToListAsync();
            if (matches.Count == 1) target = matches[0];
        }
        if (target is not Guid userId || entity.UserId == userId) return;

        var other = await _context.MedicalStaffs
            .Where(s => s.UserId == userId && s.Id != entity.Id)
            .Select(s => s.StaffCode).FirstOrDefaultAsync();
        if (other != null)
        {
            if (chosenUserId.HasValue)
                throw new InvalidOperationException($"Tài khoản này đã gắn với hồ sơ nhân viên {other}");
            return; // auto-link is best effort only
        }
        entity.UserId = userId;
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
        var roster = await _context.DutyRosters.Include(x => x.Department).FirstOrDefaultAsync(x => x.DepartmentId == departmentId && x.Year == year && x.Month == month && !x.IsDeleted);
        if (roster == null) return null!;
        // QA-R3: return the roster's real assignments (DTO carried only id/status, so the weekly tab had nothing to show).
        var monthStart = new DateTime(year, month, 1);
        var assignments = (await GetRosterAssignmentsAsync(departmentId, monthStart, monthStart.AddMonths(1).AddDays(-1)))
            .Where(a => a.RosterId == roster.Id).ToList();
        return new DutyRosterDto
        {
            Id = roster.Id, DepartmentId = roster.DepartmentId, DepartmentName = roster.Department?.DepartmentName ?? "",
            Year = roster.Year, Month = roster.Month, Status = roster.Status, PublishedAt = roster.PublishedAt,
            CreatedAt = roster.CreatedAt, TotalShifts = assignments.Count, FilledShifts = assignments.Count,
            StaffAssignments = assignments,
        };
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

    // A shift whose end time is not after its start time runs past midnight into the next day.
    private static DateTime ShiftStart(DateTime date, TimeSpan start) => date.Date + start;
    private static DateTime ShiftEnd(DateTime date, TimeSpan start, TimeSpan end)
        => date.Date + end + (end <= start ? TimeSpan.FromDays(1) : TimeSpan.Zero);

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
        if (dto.Year < 2000 || dto.Year > 2100 || dto.Month < 1 || dto.Month > 12)
            throw new ArgumentException("Tháng/năm lịch trực không hợp lệ.");
        if (dto.CreatedById == Guid.Empty)
            throw new UnauthorizedAccessException("Không xác định được người lập lịch trực.");
        if (!await _context.Departments.AnyAsync(d => d.Id == dto.DepartmentId))
            throw new KeyNotFoundException("Không tìm thấy khoa/phòng");
        if (await _context.DutyRosters.AnyAsync(r => r.DepartmentId == dto.DepartmentId && r.Year == dto.Year && r.Month == dto.Month && !r.IsDeleted))
            throw new InvalidOperationException($"Khoa đã có lịch trực tháng {dto.Month}/{dto.Year}.");

        var entity = new DutyRoster { Id = Guid.NewGuid(), DepartmentId = dto.DepartmentId, Year = dto.Year, Month = dto.Month, Status = "Draft", CreatedById = dto.CreatedById, CreatedAt = DateTime.Now };
        _context.DutyRosters.Add(entity);

        // Shifts in the payload used to be dropped silently — persist one DutyShift per assigned staff.
        var shifts = dto.Shifts ?? new List<CreateDutyShiftDto>();
        var staffIds = shifts.SelectMany(s => s.AssignedStaffIds ?? new List<Guid>()).Distinct().ToList();
        if (staffIds.Count > 0)
        {
            var known = await _context.MedicalStaffs.Where(s => staffIds.Contains(s.Id)).Select(s => s.Id).ToListAsync();
            var unknown = staffIds.Except(known).ToList();
            if (unknown.Count > 0)
                throw new KeyNotFoundException($"Không tìm thấy nhân viên: {string.Join(", ", unknown)}");
        }
        // Same person on two overlapping shifts (inside this payload, or already rostered in another
        // department's roster) used to be accepted.
        var planned = new List<(Guid StaffId, DateTime Start, DateTime End)>();
        if (staffIds.Count > 0)
        {
            var monthStart = new DateTime(dto.Year, dto.Month, 1);
            var existing = await _context.DutyShifts.AsNoTracking()
                .Where(x => staffIds.Contains(x.StaffId) && x.Status != "Cancelled"
                    && x.ShiftDate >= monthStart.AddDays(-1) && x.ShiftDate < monthStart.AddMonths(1).AddDays(1))
                .Select(x => new { x.StaffId, x.ShiftDate, x.StartTime, x.EndTime })
                .ToListAsync();
            planned.AddRange(existing.Select(x => (x.StaffId, ShiftStart(x.ShiftDate, x.StartTime), ShiftEnd(x.ShiftDate, x.StartTime, x.EndTime))));
        }
        foreach (var s in shifts)
        {
            if (s.ShiftDate.Year != dto.Year || s.ShiftDate.Month != dto.Month)
                throw new ArgumentException($"Ca trực ngày {s.ShiftDate:dd/MM/yyyy} không thuộc tháng {dto.Month}/{dto.Year}.");
            if (string.IsNullOrWhiteSpace(s.ShiftType))
                throw new ArgumentException("Loại ca trực là bắt buộc.");
            if (s.StartTime == s.EndTime || s.StartTime < TimeSpan.Zero || s.StartTime >= TimeSpan.FromDays(1)
                || s.EndTime < TimeSpan.Zero || s.EndTime >= TimeSpan.FromDays(1))
                throw new ArgumentException($"Giờ ca trực ngày {s.ShiftDate:dd/MM/yyyy} không hợp lệ.");
            var start = ShiftStart(s.ShiftDate, s.StartTime);
            var end = ShiftEnd(s.ShiftDate, s.StartTime, s.EndTime);
            foreach (var staffId in (s.AssignedStaffIds ?? new List<Guid>()).Distinct())
            {
                if (planned.Any(p => p.StaffId == staffId && p.Start < end && start < p.End))
                    throw new InvalidOperationException($"Nhân viên {staffId} đã có ca trực trùng giờ ngày {s.ShiftDate:dd/MM/yyyy}.");
                planned.Add((staffId, start, end));
                _context.DutyShifts.Add(new DutyShift
                {
                    Id = Guid.NewGuid(), DutyRosterId = entity.Id, StaffId = staffId, ShiftDate = s.ShiftDate.Date,
                    ShiftType = s.ShiftType, StartTime = s.StartTime, EndTime = s.EndTime, Status = "Scheduled",
                    CreatedAt = DateTime.Now
                });
            }
        }
        await _context.SaveChangesAsync();
        return new DutyRosterDto { Id = entity.Id, DepartmentId = entity.DepartmentId, Year = entity.Year, Month = entity.Month, Status = entity.Status };
    }

    public async Task<DutyRosterDto> PublishDutyRosterAsync(Guid rosterId)
    {
        var e = await _context.DutyRosters.FindAsync(rosterId)
            ?? throw new KeyNotFoundException("Không tìm thấy lịch trực");
        // Only a Draft roster can be published (re-publishing overwrote PublishedAt; a Locked roster was reopened).
        if (!string.Equals(e.Status, "Draft", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Lịch trực đang ở trạng thái {e.Status} — chỉ lịch nháp mới được công bố.");
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

    public async Task<DutyShiftDto> AddDutyShiftAsync(AddDutyShiftDto dto, Guid userId)
    {
        // QA-R11: the v2 HR "Phân ca trực" modal posted to /medicalhr/rosters/generate, which does not exist
        // (404 on every save). One shift for one staff, in the staff's department roster of that month.
        if (userId == Guid.Empty)
            throw new UnauthorizedAccessException("Không xác định được người lập lịch trực.");
        var def = StandardShifts.Find(dto.ShiftType)
            ?? throw new ArgumentException("Loại ca trực không hợp lệ.", nameof(dto.ShiftType));
        var date = dto.ShiftDate.Date;
        if (date.Year < 2000 || date.Year > 2100)
            throw new ArgumentException("Ngày trực không hợp lệ.", nameof(dto.ShiftDate));
        var staff = await _context.MedicalStaffs.AsNoTracking().FirstOrDefaultAsync(s => s.Id == dto.StaffId)
            ?? throw new KeyNotFoundException("Không tìm thấy nhân viên");
        if (!string.Equals(staff.Status, "Active", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Nhân viên {staff.FullName} không còn hoạt động — không thể phân ca.");
        if (staff.PrimaryDepartmentId is not Guid deptId || deptId == Guid.Empty)
            throw new InvalidOperationException($"Nhân viên {staff.FullName} chưa có khoa/phòng — cập nhật hồ sơ trước khi phân ca.");

        // QA-R12 racescan: the overlap check and the roster lookup were read-then-write — a double-click created two
        // identical shifts (and two rosters for the same department-month). Serialize per department-month.
        await using var tx = await SqlAppLock.BeginAsync(_context);
        await SqlAppLock.AcquireAsync(_context, $"HIS.HR.Roster.{deptId:N}.{date:yyyyMM}",
            "Lịch trực của khoa đang được cập nhật bởi thao tác khác, vui lòng thử lại.");
        var start = ShiftStart(date, def.Start);
        var end = ShiftEnd(date, def.Start, def.End);
        var nearby = await _context.DutyShifts.AsNoTracking()
            .Where(x => x.StaffId == staff.Id && x.Status != "Cancelled"
                && x.ShiftDate >= date.AddDays(-1) && x.ShiftDate <= date.AddDays(1))
            .Select(x => new { x.ShiftDate, x.StartTime, x.EndTime })
            .ToListAsync();
        if (nearby.Any(x => ShiftStart(x.ShiftDate, x.StartTime) < end && start < ShiftEnd(x.ShiftDate, x.StartTime, x.EndTime)))
            throw new InvalidOperationException($"Nhân viên {staff.FullName} đã có ca trực trùng giờ ngày {date:dd/MM/yyyy}.");
        // Approved leave covering the day → cannot be rostered.
        if (await _context.LeaveRequests.AnyAsync(l => l.StaffId == staff.Id && l.Status == 1 && l.StartDate.Date <= date && l.EndDate.Date >= date))
            throw new InvalidOperationException($"Nhân viên {staff.FullName} đang nghỉ phép (đã duyệt) ngày {date:dd/MM/yyyy}.");

        var roster = await _context.DutyRosters
            .FirstOrDefaultAsync(r => r.DepartmentId == deptId && r.Year == date.Year && r.Month == date.Month && !r.IsDeleted);
        if (roster == null)
        {
            roster = new DutyRoster { Id = Guid.NewGuid(), DepartmentId = deptId, Year = date.Year, Month = date.Month, Status = "Draft", CreatedById = userId, CreatedAt = DateTime.Now };
            _context.DutyRosters.Add(roster);
        }
        else if (string.Equals(roster.Status, "Locked", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Lịch trực tháng {date.Month}/{date.Year} của khoa đã khoá.");

        var shift = new DutyShift
        {
            Id = Guid.NewGuid(), DutyRosterId = roster.Id, StaffId = staff.Id, ShiftDate = date,
            ShiftType = def.Code, StartTime = def.Start, EndTime = def.End, Status = "Scheduled", CreatedAt = DateTime.Now
        };
        _context.DutyShifts.Add(shift);
        await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
        return new DutyShiftDto
        {
            Id = shift.Id, ShiftId = shift.Id, RosterId = roster.Id, ShiftDate = shift.ShiftDate, ShiftType = shift.ShiftType,
            StartTime = shift.StartTime, EndTime = shift.EndTime,
            DurationHours = (int)(end - start).TotalHours,
        };
    }

    public async Task<CopyRosterResultDto> CopyRosterWeekAsync(CopyRosterWeekDto dto, Guid userId)
    {
        var sourceStart = dto.SourceWeekStart.Date;
        var sourceEndExcl = sourceStart.AddDays(7);
        var targetStart = dto.TargetWeekStart.Date;
        var diff = (targetStart - sourceStart).Days;
        // Overlapping source/target weeks would copy shifts onto themselves (and overwrite could delete sources).
        if (Math.Abs(diff) < 7)
            throw new ArgumentException("Tuần đích phải cách tuần nguồn ít nhất 7 ngày.");
        // The v2 HR page sends no department (whole hospital); a Guid DepartmentId made that a 400 on every call.
        Guid? departmentId = dto.DepartmentId is Guid d && d != Guid.Empty ? d : null;

        // Ca trực trong tuần nguồn (1 khoa, hoặc toàn viện khi không truyền khoa)
        var sourceShifts = await _context.DutyShifts.AsNoTracking()
            .Include(s => s.DutyRoster)
            .Where(s => s.ShiftDate >= sourceStart && s.ShiftDate < sourceEndExcl
                     && s.Status != "Cancelled"
                     && s.DutyRoster != null
                     && (departmentId == null || s.DutyRoster.DepartmentId == departmentId))
            .OrderBy(s => s.ShiftDate).ThenBy(s => s.StartTime)
            .ToListAsync();

        if (!sourceShifts.Any())
            return new CopyRosterResultDto { TotalShifts = 0, CopiedShifts = 0, SkippedShifts = 0, Message = "Không có ca trực trong tuần nguồn" };

        // #195: nạp 1 lần các ca đã có của các nhân viên quanh tuần đích (mọi khoa) thay vì 1 query/ca nguồn.
        // ShiftType là nvarchar nên SQL so CI_AS — chuẩn hoá khoá để so trong bộ nhớ y như vậy.
        static string ShiftKey(string? shiftType) => (shiftType ?? string.Empty).Trim().ToUpperInvariant();
        var staffIds = sourceShifts.Select(s => s.StaffId).Distinct().ToList();
        var targetEndExcl = targetStart.AddDays(7);
        var existingTarget = await _context.DutyShifts
            .Include(s => s.DutyRoster)
            .Where(s => staffIds.Contains(s.StaffId) && s.Status != "Cancelled"
                     && s.ShiftDate >= targetStart.AddDays(-1) && s.ShiftDate < targetEndExcl.AddDays(1))
            .ToListAsync();

        // Each copied shift goes into its own month's roster (a week spanning two months used to put every
        // shift into the roster of the target week's first day).
        var rosterCache = new Dictionary<(Guid DepartmentId, int Year, int Month), DutyRoster>();
        async Task<DutyRoster> GetOrCreateRosterAsync(Guid deptId, DateTime date)
        {
            var key = (deptId, date.Year, date.Month);
            if (rosterCache.TryGetValue(key, out var cached)) return cached;
            var roster = await _context.DutyRosters
                .FirstOrDefaultAsync(r => r.DepartmentId == deptId && r.Year == date.Year && r.Month == date.Month && !r.IsDeleted);
            if (roster == null)
            {
                roster = new DutyRoster
                {
                    Id = Guid.NewGuid(),
                    DepartmentId = deptId,
                    Year = date.Year,
                    Month = date.Month,
                    Status = "Draft",
                    CreatedById = userId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.DutyRosters.Add(roster);
            }
            rosterCache[key] = roster;
            return roster;
        }

        int copied = 0, skipped = 0;
        foreach (var shift in sourceShifts)
        {
            var newDate = shift.ShiftDate.Date.AddDays(diff);
            var roster = await GetOrCreateRosterAsync(shift.DutyRoster!.DepartmentId, newDate);
            if (string.Equals(roster.Status, "Locked", StringComparison.OrdinalIgnoreCase))
            {
                skipped++;
                continue;
            }

            // Kiểm tra trùng (cùng staff + ngày + loại ca)
            var same = existingTarget
                .Where(e => e.StaffId == shift.StaffId && e.ShiftDate.Date == newDate && ShiftKey(e.ShiftType) == ShiftKey(shift.ShiftType))
                .ToList();
            if (same.Count > 0 && (!dto.OverwriteExisting || same.Any(e => string.Equals(e.DutyRoster?.Status, "Locked", StringComparison.OrdinalIgnoreCase))))
            {
                skipped++;
                continue;
            }
            // Overwrite = replace the matching shift (it used to add a second identical shift next to it).
            foreach (var old in same)
            {
                old.IsDeleted = true;
                existingTarget.Remove(old);
            }

            // Same person already on another overlapping shift that day (any department) → do not double-book.
            var start = ShiftStart(newDate, shift.StartTime);
            var end = ShiftEnd(newDate, shift.StartTime, shift.EndTime);
            if (existingTarget.Any(e => e.StaffId == shift.StaffId
                    && ShiftStart(e.ShiftDate, e.StartTime) < end && start < ShiftEnd(e.ShiftDate, e.StartTime, e.EndTime)))
            {
                skipped++;
                continue;
            }

            var newShift = new DutyShift
            {
                Id = Guid.NewGuid(),
                DutyRosterId = roster.Id,
                StaffId = shift.StaffId,
                ShiftDate = newDate,
                ShiftType = shift.ShiftType,
                StartTime = shift.StartTime,
                EndTime = shift.EndTime,
                Status = "Scheduled",
                CreatedAt = DateTime.UtcNow
            };
            _context.DutyShifts.Add(newShift);
            existingTarget.Add(newShift);
            copied++;
        }

        await _context.SaveChangesAsync();

        return new CopyRosterResultDto
        {
            TotalShifts = sourceShifts.Count,
            CopiedShifts = copied,
            SkippedShifts = skipped,
            Message = $"Đã sao chép {copied}/{sourceShifts.Count} ca trực sang tuần {targetStart:dd/MM/yyyy}"
                + (skipped > 0 ? $" (bỏ qua {skipped} ca trùng/khóa)" : string.Empty)
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

    // Shift swaps (were stubs returning success without writing) → MedicalHRServiceImpl.Swaps.cs (QA-R3).

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
        var currentYear = records.Where(x => x.ActivityDate.Year == DateTime.Now.Year).Sum(x => x.CreditHours);
        // QA-R3: requirement per year is 24 tiết (Nghị định 96/2023: 120 tiết / 5 năm) — was never filled here.
        return new CMESummaryDto
        {
            StaffId = staffId, EarnedCredits = records.Sum(x => x.CreditHours), CurrentYearCredits = currentYear,
            RequiredCredits = CmeRequiredHoursPerYear, RequiredCreditsPerYear = CmeRequiredHoursPerYear,
            IsCompliant = currentYear >= CmeRequiredHoursPerYear,
            CreditsShortfall = Math.Max(0, CmeRequiredHoursPerYear - currentYear), Shortfall = Math.Max(0, CmeRequiredHoursPerYear - currentYear),
        };
    }

    public async Task<CMERecordDto> RecordCMECompletionAsync(Guid staffId, Guid courseId, int creditsEarned, string certificateNumber)
    {
        var entity = new CMERecord { Id = Guid.NewGuid(), StaffId = staffId, ActivityName = "CME Course", ActivityType = "Course", ActivityDate = DateTime.Now, CreditHours = creditsEarned, CertificateNumber = certificateNumber, CreatedAt = DateTime.Now };
        _context.CMERecords.Add(entity);
        await _context.SaveChangesAsync();
        return new CMERecordDto { Id = entity.Id, StaffId = staffId, CreditsEarned = creditsEarned, CertificateNumber = certificateNumber };
    }

    public async Task<CMERecordDto> CreateCMERecordAsync(CreateCMERecordDto dto)
    {
        // The v2 HR "Đăng ký đào tạo" modal posted to /medicalhr/cme, which did not exist (404 on every save).
        if (string.IsNullOrWhiteSpace(dto.ActivityName))
            throw new ArgumentException("Tên hoạt động đào tạo là bắt buộc", nameof(dto.ActivityName));
        if (dto.Credits < 0 || dto.Credits > 1000)
            throw new ArgumentException("Số tiết CME không hợp lệ", nameof(dto.Credits));
        if (dto.StartDate == default || dto.StartDate.Date > DateTime.Today.AddYears(1))
            throw new ArgumentException("Ngày đào tạo không hợp lệ", nameof(dto.StartDate));
        var staff = await _context.MedicalStaffs.AsNoTracking().FirstOrDefaultAsync(s => s.Id == dto.StaffId)
            ?? throw new KeyNotFoundException("Không tìm thấy nhân viên");
        var credits = (int)Math.Round(dto.Credits, MidpointRounding.AwayFromZero);
        var entity = new CMERecord
        {
            Id = Guid.NewGuid(), StaffId = staff.Id,
            ActivityName = dto.ActivityName.Trim(),
            ActivityType = string.IsNullOrWhiteSpace(dto.ActivityType) ? "Workshop" : dto.ActivityType,
            ActivityDate = dto.StartDate.Date, CreditHours = credits,
            Provider = dto.Provider, CertificateNumber = dto.CertificateNumber,
            IsVerified = false, CreatedAt = DateTime.Now
        };
        _context.CMERecords.Add(entity);
        await _context.SaveChangesAsync();
        return new CMERecordDto
        {
            Id = entity.Id, StaffId = staff.Id, StaffName = staff.FullName, CourseName = entity.ActivityName,
            CompletionDate = entity.ActivityDate, CompletedAt = entity.ActivityDate, CreditsEarned = credits,
            CertificateNumber = entity.CertificateNumber, IsVerified = false
        };
    }

    public async Task<List<CMESummaryDto>> GetCMENonCompliantStaffAsync()
    {
        // Returns CMESummaryDto (the v2 HR page contract) instead of the staff profile.
        // Active staff with < RequiredCredits CME credits THIS YEAR — INCLUDING staff with no CME record at all
        // (previous query only looked at staff that already had records). QA-R3: the requirement is per year
        // (24 tiết/năm, NĐ 96/2023), so credits are counted for the current calendar year, not all-time.
        const int RequiredCredits = CmeRequiredHoursPerYear;
        var currentYear = DateTime.Now.Year;
        // Category 1 = formal training (conference/workshop/course); category 2 = online / self-study.
        var category2Types = new[] { "Online", "Self-study", "SelfStudy" };
        try
        {
            // Grouped in memory: CME records are a small table and this avoids EF GroupBy translation limits.
            var yearStart = new DateTime(currentYear, 1, 1);
            var rows = await _context.CMERecords.AsNoTracking()
                .Where(x => x.ActivityDate >= yearStart && x.ActivityDate < yearStart.AddYears(1))
                .Select(x => new { x.StaffId, x.ActivityType, x.CreditHours })
                .ToListAsync();
            var credits = rows
                .GroupBy(x => x.StaffId)
                .Select(g => new
                {
                    StaffId = g.Key,
                    Total = g.Sum(x => x.CreditHours),
                    Cat2 = g.Where(x => category2Types.Contains(x.ActivityType)).Sum(x => x.CreditHours),
                    Count = g.Count(),
                })
                .ToList();
            var byStaff = credits.ToDictionary(c => c.StaffId);
            var compliantIds = credits.Where(c => c.Total >= RequiredCredits).Select(c => c.StaffId).ToList();
            var staff = await _context.MedicalStaffs
                .Where(x => x.Status == "Active" && !compliantIds.Contains(x.Id))
                .OrderBy(x => x.FullName)
                .ToBoundedListAsync("MedicalHR.CMENonCompliantStaff");
            return staff.Select(s =>
            {
                byStaff.TryGetValue(s.Id, out var c);
                var earned = c?.Total ?? 0;
                var cat2 = c?.Cat2 ?? 0;
                var shortfall = Math.Max(0, RequiredCredits - earned);
                return new CMESummaryDto
                {
                    StaffId = s.Id, StaffName = s.FullName, StaffType = s.StaffType,
                    RequiredCredits = RequiredCredits, RequiredCreditsPerYear = RequiredCredits,
                    CurrentYearRequired = RequiredCredits, CurrentYearCredits = earned,
                    EarnedCredits = earned,
                    Category1Credits = earned - cat2, Category2Credits = cat2,
                    ActivitiesCount = c?.Count ?? 0,
                    IsCompliant = false,
                    CreditsShortfall = shortfall, Shortfall = shortfall,
                };
            }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<CMESummaryDto>();
        }
    }

    public Task<CompetencyAssessmentDto> GetCompetencyAssessmentAsync(Guid id) => Task.FromResult(new CompetencyAssessmentDto { Id = id });
    public Task<CompetencyAssessmentDto> CreateCompetencyAssessmentAsync(Guid staffId, CompetencyAssessmentDto dto) => Task.FromResult(dto);
    public Task<bool> SignAssessmentAsync(Guid id, string signatureType) => Task.FromResult(true);

    public async Task<MedicalHRDashboardDto> GetDashboardAsync()
    {
        try
        {
            // HR v2 KPI strip + system ShiftBoard read activeStaff/doctors/nurses/technicians/onLeave/
            // cmeNonCompliant/onDutyToday — those were never filled, so every KPI showed 0 (e.g. "CME chưa đạt: 0"
            // while the CME tab listed non-compliant staff).
            var today = DateTime.Today;
            var byTypeStatus = await _context.MedicalStaffs.AsNoTracking()
                .GroupBy(x => new { x.StaffType, x.Status })
                .Select(g => new { g.Key.StaffType, g.Key.Status, Count = g.Count() })
                .ToListAsync();
            int Active(string type) => byTypeStatus.Where(x => x.Status == "Active" && x.StaffType == type).Sum(x => x.Count);
            var activeStaff = byTypeStatus.Where(x => x.Status == "Active").Sum(x => x.Count);
            var activeDoctors = Active("Doctor");
            var activeNurses = Active("Nurse");
            var activeTechs = Active("Technician");
            var activePharm = Active("Pharmacist");
            var activeLicensed = _context.MedicalStaffs.Where(x => x.Status == "Active" && x.LicenseExpiryDate != null);
            var expired = await activeLicensed.CountAsync(x => x.LicenseExpiryDate < today);
            var expiringSoon = await activeLicensed.CountAsync(x => x.LicenseExpiryDate >= today && x.LicenseExpiryDate <= today.AddDays(30));
            var cmeNonCompliant = (await GetCMENonCompliantStaffAsync()).Count;
            var onDutyToday = await _context.DutyShifts.AsNoTracking()
                .Where(s => s.ShiftDate >= today && s.ShiftDate < today.AddDays(1) && s.Status != "Cancelled")
                .Select(s => s.StaffId).Distinct().CountAsync();
            return new MedicalHRDashboardDto
            {
                Date = today,
                TotalStaff = byTypeStatus.Sum(x => x.Count),
                ActiveStaff = activeStaff,
                Doctors = activeDoctors, Nurses = activeNurses, Technicians = activeTechs, Pharmacists = activePharm,
                OtherStaff = activeStaff - activeDoctors - activeNurses - activeTechs - activePharm,
                ActiveDoctors = activeDoctors,
                ActiveNurses = activeNurses,
                OnLeave = byTypeStatus.Where(x => x.Status == "OnLeave").Sum(x => x.Count),
                // Label is "sắp hết hạn CCHN (30 ngày)": already-expired licences are counted too — they are the urgent ones.
                ExpiringLicenses30Days = expiringSoon + expired,
                ExpiringSoon = expiringSoon,
                Expired = expired,
                CMENonCompliant = cmeNonCompliant,
                CMENotCompliant = cmeNonCompliant,
                OnDutyToday = onDutyToday,
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new MedicalHRDashboardDto();
        }
    }

    private static MedicalStaffDto MapToStaffDto(MedicalStaff e) => new()
    {
        Id = e.Id, UserId = e.UserId == Guid.Empty ? null : e.UserId, StaffCode = e.StaffCode, FullName = e.FullName, StaffType = e.StaffType, Specialty = e.Specialty,
        DepartmentName = e.PrimaryDepartment?.DepartmentName ?? "", DepartmentId = e.PrimaryDepartmentId ?? Guid.Empty,
        PracticeLicenseNumber = e.LicenseNumber, LicenseExpiryDate = e.LicenseExpiryDate, Status = e.Status,
        // Saved by SaveStaffAsync but never read back (the API always returned phone/email = null).
        Phone = e.PersonalPhone ?? e.WorkPhone, Email = e.PersonalEmail,
        JoinDate = e.JoinDate ?? DateTime.MinValue
    };

}
#endregion
