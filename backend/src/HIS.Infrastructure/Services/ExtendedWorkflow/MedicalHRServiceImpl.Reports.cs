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
