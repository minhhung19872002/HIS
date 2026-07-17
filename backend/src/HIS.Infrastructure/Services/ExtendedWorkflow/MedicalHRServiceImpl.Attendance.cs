using HIS.Application.DTOs.MedicalHR;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

public partial class MedicalHRServiceImpl
{
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
            var list = await query.OrderByDescending(x => x.CreatedAt).ToBoundedListAsync("MedicalHR.GetLeaveRequests");
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
            var list = await query.OrderByDescending(x => x.OvertimeDate).ToBoundedListAsync("MedicalHR.GetOvertimeRequests");
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
}
