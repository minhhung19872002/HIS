using HIS.Application.DTOs.MedicalHR;
using HIS.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// QA-R3: real duty-roster assignments + shift swaps on the existing DutyShifts swap columns.
/// The swap endpoints were stubs (list always empty, request/approve returned success writing nothing) and the v2
/// weekly roster tab rendered a pseudo-random demo rota.
///
/// Swap model (no new table): the REQUESTER's shift carries <c>SwappedWithId</c> = target staff, <c>SwapReason</c>
/// = reason, <c>SwapApproved</c> = false. For an exchange the target's own shift carries <c>SwappedWithId</c> =
/// requester with <c>SwapReason</c> = null (counterpart marker). Approve: exchange the two StaffIds (or hand the
/// shift to the target for a cover), <c>Status</c> = "Swapped", <c>SwapApproved</c> = true. Reject: clear the marks.
/// </summary>
public partial class MedicalHRServiceImpl
{
    private static readonly string[] InactiveShiftStatuses = { "Cancelled", "Completed", "Absent" };

    public async Task<List<StaffRosterAssignmentDto>> GetRosterAssignmentsAsync(Guid? departmentId, DateTime fromDate, DateTime toDate)
    {
        var from = fromDate.Date;
        var toExcl = toDate.Date.AddDays(1);
        var shifts = await _context.DutyShifts.AsNoTracking()
            .Include(s => s.DutyRoster).ThenInclude(r => r!.Department)
            .Where(s => s.ShiftDate >= from && s.ShiftDate < toExcl && s.Status != "Cancelled"
                && s.DutyRoster != null && !s.DutyRoster.IsDeleted
                && (departmentId == null || s.DutyRoster.DepartmentId == departmentId))
            .OrderBy(s => s.ShiftDate).ThenBy(s => s.StartTime)
            .ToListAsync();
        return await MapAssignmentsAsync(shifts);
    }

    private async Task<List<StaffRosterAssignmentDto>> MapAssignmentsAsync(List<DutyShift> shifts)
    {
        var staffIds = shifts.Select(s => s.StaffId)
            .Concat(shifts.Where(s => s.SwappedWithId.HasValue).Select(s => s.SwappedWithId!.Value))
            .Distinct().ToList();
        var staff = await _context.MedicalStaffs.AsNoTracking()
            .Where(s => staffIds.Contains(s.Id))
            .Select(s => new { s.Id, s.StaffCode, s.FullName, s.StaffType })
            .ToDictionaryAsync(s => s.Id);

        return shifts.Select(s =>
        {
            staff.TryGetValue(s.StaffId, out var st);
            var duration = s.EndTime > s.StartTime ? s.EndTime - s.StartTime : TimeSpan.FromHours(24) - s.StartTime + s.EndTime;
            var isOnCall = s.ShiftType.Equals("OnCall", StringComparison.OrdinalIgnoreCase)
                || s.ShiftType.Equals("24h", StringComparison.OrdinalIgnoreCase);
            return new StaffRosterAssignmentDto
            {
                Id = s.Id, RosterId = s.DutyRosterId, StaffId = s.StaffId,
                StaffCode = st?.StaffCode ?? "", StaffName = st?.FullName ?? "", StaffType = st?.StaffType ?? "",
                Date = s.ShiftDate, DayOfWeek = s.ShiftDate.DayOfWeek.ToString(),
                ShiftId = s.Id, ShiftName = LocalizeShiftName(s.ShiftType),
                ShiftStart = s.StartTime.ToString(@"hh\:mm"), ShiftEnd = s.EndTime.ToString(@"hh\:mm"),
                Location = s.DutyRoster?.Department?.DepartmentName,
                DepartmentId = s.DutyRoster?.DepartmentId, DepartmentName = s.DutyRoster?.Department?.DepartmentName,
                IsOnCall = isOnCall, IsOvertime = duration.TotalHours > 8,
                OvertimeHours = duration.TotalHours > 8 ? (decimal)(duration.TotalHours - 8) : null,
                Status = s.Status switch { "Confirmed" => 2, "Completed" => 3, "Absent" => 4, "Swapped" => 5, _ => 1 },
                SwappedWithId = s.SwappedWithId,
                SwappedWithName = s.SwappedWithId.HasValue && staff.TryGetValue(s.SwappedWithId.Value, out var sw) ? sw.FullName : null,
                SwapReason = s.SwapReason,
                SwapPending = s.SwappedWithId.HasValue && !s.SwapApproved && s.SwapReason != null,
            };
        }).ToList();
    }

    public async Task<ShiftSwapRequestDto> CreateShiftSwapAsync(CreateShiftSwapRequestDto dto)
    {
        var reason = dto.Reason?.Trim();
        if (string.IsNullOrEmpty(reason))
            throw new ArgumentException("Lý do đổi ca là bắt buộc.");

        var original = await _context.DutyShifts.Include(s => s.DutyRoster)
            .FirstOrDefaultAsync(s => s.Id == dto.OriginalAssignmentId && !s.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy ca trực cần đổi.");
        EnsureShiftSwappable(original, "Ca trực cần đổi");
        if (original.ShiftDate.Date < DateTime.Today)
            throw new InvalidOperationException("Không đổi được ca trực đã qua.");
        if (original.SwappedWithId != null && !original.SwapApproved)
            throw new InvalidOperationException("Ca trực này đang có yêu cầu đổi ca chờ duyệt.");

        DutyShift? target = null;
        Guid targetStaffId;
        if (dto.TargetAssignmentId is Guid tId && tId != Guid.Empty)
        {
            target = await _context.DutyShifts.Include(s => s.DutyRoster)
                .FirstOrDefaultAsync(s => s.Id == tId && !s.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy ca trực của người nhận đổi.");
            if (target.Id == original.Id)
                throw new InvalidOperationException("Không thể đổi ca với chính ca đó.");
            EnsureShiftSwappable(target, "Ca trực của người nhận đổi");
            if (target.SwappedWithId != null && !target.SwapApproved)
                throw new InvalidOperationException("Ca trực của người nhận đổi đang nằm trong một yêu cầu đổi ca khác.");
            if (dto.TargetStaffId is Guid given && given != Guid.Empty && given != target.StaffId)
                throw new InvalidOperationException("Ca trực được chọn không thuộc người nhận đổi.");
            targetStaffId = target.StaffId;
        }
        else
        {
            targetStaffId = dto.TargetStaffId is Guid s && s != Guid.Empty
                ? s
                : throw new ArgumentException("Chọn người nhận đổi/thay ca.");
        }

        if (targetStaffId == original.StaffId)
            throw new InvalidOperationException("Người nhận đổi ca phải khác người đang trực.");
        var targetStaff = await _context.MedicalStaffs.AsNoTracking().FirstOrDefaultAsync(s => s.Id == targetStaffId)
            ?? throw new KeyNotFoundException("Không tìm thấy nhân viên nhận đổi ca.");
        if (!string.Equals(targetStaff.Status, "Active", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Nhân viên {targetStaff.FullName} không ở trạng thái đang làm việc.");

        original.SwappedWithId = targetStaffId;
        original.SwapReason = reason;
        original.SwapApproved = false;
        original.UpdatedAt = DateTime.UtcNow;
        if (target != null)
        {
            target.SwappedWithId = original.StaffId;
            target.SwapReason = null; // counterpart marker
            target.SwapApproved = false;
            target.UpdatedAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync();
        return await BuildSwapDtoAsync(original, target);
    }

    public async Task<ShiftSwapRequestDto> RequestShiftSwapAsync(Guid assignmentId, Guid targetAssignmentId, string reason)
        => await CreateShiftSwapAsync(new CreateShiftSwapRequestDto
        {
            OriginalAssignmentId = assignmentId, TargetAssignmentId = targetAssignmentId, Reason = reason
        });

    public async Task<List<ShiftSwapRequestDto>> GetPendingSwapRequestsAsync(Guid? departmentId = null)
    {
        var requests = await _context.DutyShifts.Include(s => s.DutyRoster)
            .Where(s => !s.IsDeleted && s.SwappedWithId != null && s.SwapReason != null && !s.SwapApproved
                && s.Status != "Cancelled"
                && (departmentId == null || (s.DutyRoster != null && s.DutyRoster.DepartmentId == departmentId)))
            .OrderBy(s => s.ShiftDate)
            .ToListAsync();
        var result = new List<ShiftSwapRequestDto>();
        foreach (var r in requests)
            result.Add(await BuildSwapDtoAsync(r, await FindCounterpartAsync(r)));
        return result;
    }

    public Task<bool> ApproveSwapAsTargetAsync(Guid requestId, bool approve)
        => ApproveSwapAsManagerAsync(requestId, approve, string.Empty);

    public async Task<bool> ApproveSwapAsManagerAsync(Guid requestId, bool approve, string notes)
    {
        var original = await _context.DutyShifts.Include(s => s.DutyRoster)
            .FirstOrDefaultAsync(s => s.Id == requestId && !s.IsDeleted);
        if (original == null || original.SwappedWithId == null || original.SwapReason == null)
            return false;
        if (original.SwapApproved)
            throw new InvalidOperationException("Yêu cầu đổi ca này đã được duyệt.");
        var counterpart = await FindCounterpartAsync(original);

        if (!approve)
        {
            original.SwappedWithId = null;
            original.SwapReason = null;
            original.UpdatedAt = DateTime.UtcNow;
            if (counterpart != null)
            {
                counterpart.SwappedWithId = null;
                counterpart.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return true;
        }

        EnsureShiftSwappable(original, "Ca trực cần đổi");
        if (counterpart != null) EnsureShiftSwappable(counterpart, "Ca trực của người nhận đổi");
        var requesterId = original.StaffId;
        var targetId = original.SwappedWithId.Value;

        // Neither person may end up on two overlapping shifts after the change.
        var involved = new[] { original.Id, counterpart?.Id ?? Guid.Empty };
        await EnsureNoOverlapAsync(targetId, original, involved);
        if (counterpart != null) await EnsureNoOverlapAsync(requesterId, counterpart, involved);

        original.StaffId = targetId;
        original.SwappedWithId = requesterId;
        original.SwapApproved = true;
        original.Status = "Swapped";
        if (!string.IsNullOrWhiteSpace(notes))
            original.AttendanceNotes = string.IsNullOrEmpty(original.AttendanceNotes) ? $"Duyệt đổi ca: {notes}" : $"{original.AttendanceNotes} | Duyệt đổi ca: {notes}";
        original.UpdatedAt = DateTime.UtcNow;
        if (counterpart != null)
        {
            counterpart.StaffId = requesterId;
            counterpart.SwappedWithId = targetId;
            counterpart.SwapApproved = true;
            counterpart.Status = "Swapped";
            counterpart.UpdatedAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync();
        return true;
    }

    private static void EnsureShiftSwappable(DutyShift shift, string label)
    {
        if (InactiveShiftStatuses.Contains(shift.Status, StringComparer.OrdinalIgnoreCase))
            throw new InvalidOperationException($"{label} đang ở trạng thái {shift.Status} — không đổi được.");
        if (string.Equals(shift.DutyRoster?.Status, "Locked", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"{label} thuộc lịch trực đã khóa — không đổi được.");
    }

    private async Task<DutyShift?> FindCounterpartAsync(DutyShift original)
    {
        if (original.SwappedWithId == null) return null;
        return await _context.DutyShifts.Include(s => s.DutyRoster)
            .Where(s => !s.IsDeleted && s.Id != original.Id && s.StaffId == original.SwappedWithId
                && s.SwappedWithId == original.StaffId && s.SwapReason == null && !s.SwapApproved
                && s.Status != "Cancelled")
            .OrderBy(s => s.ShiftDate)
            .FirstOrDefaultAsync();
    }

    private async Task EnsureNoOverlapAsync(Guid staffId, DutyShift incoming, Guid[] excludeIds)
    {
        var start = ShiftStart(incoming.ShiftDate, incoming.StartTime);
        var end = ShiftEnd(incoming.ShiftDate, incoming.StartTime, incoming.EndTime);
        var nearby = await _context.DutyShifts.AsNoTracking()
            .Where(s => s.StaffId == staffId && !s.IsDeleted && s.Status != "Cancelled" && !excludeIds.Contains(s.Id)
                && s.ShiftDate >= incoming.ShiftDate.Date.AddDays(-1) && s.ShiftDate <= incoming.ShiftDate.Date.AddDays(1))
            .ToListAsync();
        if (nearby.Any(s => ShiftStart(s.ShiftDate, s.StartTime) < end && start < ShiftEnd(s.ShiftDate, s.StartTime, s.EndTime)))
            throw new InvalidOperationException($"Sau khi đổi, nhân viên sẽ trùng giờ với một ca trực khác ngày {incoming.ShiftDate:dd/MM/yyyy}.");
    }

    private async Task<ShiftSwapRequestDto> BuildSwapDtoAsync(DutyShift original, DutyShift? target)
    {
        var ids = new[] { original.StaffId, original.SwappedWithId ?? Guid.Empty };
        var names = await _context.MedicalStaffs.AsNoTracking().Where(s => ids.Contains(s.Id))
            .Select(s => new { s.Id, s.FullName }).ToDictionaryAsync(s => s.Id, s => s.FullName);
        return new ShiftSwapRequestDto
        {
            Id = original.Id,
            OriginalAssignmentId = original.Id,
            RequesterId = original.StaffId,
            RequesterName = names.GetValueOrDefault(original.StaffId) ?? "",
            OriginalShiftDate = original.ShiftDate,
            OriginalShiftType = original.ShiftType,
            TargetAssignmentId = target?.Id,
            TargetStaffId = original.SwappedWithId,
            TargetStaffName = original.SwappedWithId.HasValue ? names.GetValueOrDefault(original.SwappedWithId.Value) ?? "" : "",
            TargetShiftDate = target?.ShiftDate,
            TargetShiftType = target?.ShiftType ?? "",
            Reason = original.SwapReason ?? "",
            Status = original.SwapApproved ? "ManagerApproved" : "Pending",
            ManagerApproval = original.SwapApproved ? true : null,
            ApprovalNotes = "",
            CreatedAt = original.UpdatedAt ?? original.CreatedAt,
        };
    }
}
