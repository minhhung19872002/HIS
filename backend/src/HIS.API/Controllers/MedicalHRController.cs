using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs.Telemedicine;
using HIS.Application.DTOs.Nutrition;
using HIS.Application.DTOs.InfectionControl;
using HIS.Application.DTOs.Rehabilitation;
using HIS.Application.DTOs.Equipment;
using HIS.Application.DTOs.MedicalHR;
using HIS.Application.DTOs.QualityManagement;
using HIS.Application.DTOs.PatientPortal;
using HIS.Application.DTOs.HealthExchange;
using HIS.Application.DTOs.MassCasualty;
using HIS.API.Dtos.ExtendedWorkflow;

namespace HIS.API.Controllers
{
    /// <summary>
    /// API Controller for Medical HR - Luồng 16
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [TypeFilter(typeof(Filters.DomainExceptionFilter))] // validation/state guards → 400/404 instead of 500
    public class MedicalHRController : ControllerBase
    {
        private readonly IMedicalHRService _service;

        public MedicalHRController(IMedicalHRService service)
        {
            _service = service;
        }

        private Guid? CurrentUserId =>
            Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;

        [HttpGet("staff")]
        public async Task<ActionResult<List<MedicalStaffDto>>> GetStaffList(
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string staffType = null,
            [FromQuery] string status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 200)
        {
            // QA-R11: page/pageSize were declared but ignored — every page returned the same rows.
            // Response stays a plain list (HR page reads list or {items}).
            var list = await _service.GetStaffListAsync(departmentId, staffType, status);
            page = Math.Max(1, page);
            pageSize = pageSize > 0 ? Math.Min(pageSize, 1000) : 200;
            return Ok(list.Skip((page - 1) * pageSize).Take(pageSize).ToList());
        }

        [HttpGet("staff/{id}")]
        public async Task<ActionResult<MedicalStaffDto>> GetStaff(Guid id)
            => Ok(await _service.GetStaffAsync(id));

        [HttpPost("staff")]
        public async Task<ActionResult<MedicalStaffDto>> SaveStaff([FromBody] SaveMedicalStaffDto dto)
            => Ok(await _service.SaveStaffAsync(dto));

        [HttpGet("staff/expiring-licenses")]
        public async Task<ActionResult<List<MedicalStaffDto>>> GetStaffWithExpiringLicenses([FromQuery] int daysAhead = 90)
            => Ok(await _service.GetStaffWithExpiringLicensesAsync(daysAhead));

        [HttpGet("certifications/expiring")]
        public async Task<ActionResult<List<MedicalStaffDto>>> GetExpiringCertifications([FromQuery] int daysWithin = 90)
            => Ok(await _service.GetStaffWithExpiringLicensesAsync(daysWithin));

        // QA-R11: returned an empty list, so the "Phân ca trực" modal fell back to hard-coded options.
        [HttpGet("shifts")]
        public ActionResult<List<object>> GetShiftDefinitions()
            => Ok(StandardShifts.All.Select(d =>
            {
                var hours = (d.End > d.Start ? d.End - d.Start : TimeSpan.FromDays(1) - d.Start + d.End).TotalHours;
                return (object)new
                {
                    id = d.Code, code = d.Code, name = d.Name,
                    startTime = d.Start.ToString(@"hh\:mm"), endTime = d.End.ToString(@"hh\:mm"),
                    durationHours = hours, isNightShift = d.End <= d.Start, isActive = true,
                };
            }).ToList());

        /// <summary>QA-R11: v2 HR "Phân ca trực" — one shift for one staff (the page posted to a route that did not exist).</summary>
        [HttpPost("rosters/shifts")]
        public async Task<ActionResult<DutyShiftDto>> AddDutyShift([FromBody] AddDutyShiftDto dto)
            => Ok(await _service.AddDutyShiftAsync(dto, CurrentUserId ?? Guid.Empty));

        [HttpGet("rosters")]
        public async Task<ActionResult<DutyRosterDto>> GetRosters(
            [FromQuery] Guid? departmentId = null,
            [FromQuery] int? year = null,
            [FromQuery] int? month = null)
        {
            if (year == null || month == null || month < 1 || month > 12 || year < 2000 || year > 2100)
                return Ok(new { items = new List<object>() });
            if (departmentId != null && departmentId != Guid.Empty)
                return Ok(await _service.GetDutyRosterAsync(departmentId.Value, year.Value, month.Value));
            // QA-R3: the v2 weekly roster tab asks for the whole hospital (no department) — that returned an empty
            // list, so the tab fell back to a demo rota. Return every department's real assignments for the month.
            var monthStart = new DateTime(year.Value, month.Value, 1);
            var assignments = await _service.GetRosterAssignmentsAsync(null, monthStart, monthStart.AddMonths(1).AddDays(-1));
            var rosterIds = assignments.Select(a => a.RosterId).Distinct().ToList();
            return Ok(new DutyRosterDto
            {
                Id = rosterIds.Count == 1 ? rosterIds[0] : Guid.Empty, // single roster → "Chốt tuần" can publish it
                Year = year.Value, Month = month.Value, DepartmentName = "Toàn viện",
                Status = rosterIds.Count == 1 ? "Draft" : "Mixed",
                TotalShifts = assignments.Count, FilledShifts = assignments.Count,
                StaffAssignments = assignments,
            });
        }

        /// <summary>QA-R3: real shift assignments of a date range (weekly roster tab).</summary>
        [HttpGet("rosters/assignments")]
        public async Task<ActionResult<List<StaffRosterAssignmentDto>>> GetRosterAssignments(
            [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate, [FromQuery] Guid? departmentId = null)
        {
            if (toDate < fromDate || (toDate - fromDate).TotalDays > 62)
                return BadRequest(new { error = "VALIDATION_FAILED", message = "Khoảng ngày lịch trực không hợp lệ (tối đa 62 ngày)." });
            return Ok(await _service.GetRosterAssignmentsAsync(departmentId, fromDate, toDate));
        }

        // QA-R3: shift swaps on DutyShifts swap columns (the page's calls hit routes that did not exist).
        [HttpGet("shift-swaps")]
        public async Task<ActionResult<List<ShiftSwapRequestDto>>> GetSwapRequests([FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetPendingSwapRequestsAsync(departmentId));

        [HttpPost("shift-swaps")]
        public async Task<ActionResult<ShiftSwapRequestDto>> CreateSwapRequest([FromBody] CreateShiftSwapRequestDto dto)
            => Ok(await _service.CreateShiftSwapAsync(dto));

        [HttpPost("shift-swaps/{id:guid}/approve")]
        public async Task<ActionResult<bool>> ApproveSwapRequest(Guid id, [FromBody] ShiftSwapApprovalDto dto)
        {
            var ok = await _service.ApproveSwapAsManagerAsync(id, dto.IsApproved, dto.Notes ?? string.Empty);
            return ok ? Ok(true) : NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy yêu cầu đổi ca" });
        }

        [HttpGet("duty-roster")]
        public async Task<ActionResult<DutyRosterDto>> GetDutyRoster(
            [FromQuery] Guid departmentId,
            [FromQuery] int year,
            [FromQuery] int month)
            => Ok(await _service.GetDutyRosterAsync(departmentId, year, month));

        [HttpGet("staff/{id:guid}/roster")]
        public async Task<ActionResult<List<StaffRosterAssignmentDto>>> GetStaffRoster(
            Guid id, [FromQuery] int year, [FromQuery] int month)
        {
            if (year < 2000 || year > 2100 || month < 1 || month > 12)
                return BadRequest(new
                {
                    error = "VALIDATION_FAILED",
                    message = "Tháng/năm lịch trực không hợp lệ."
                });

            return Ok(await _service.GetStaffRosterAsync(id, year, month));
        }

        [HttpPost("duty-roster")]
        public async Task<ActionResult<DutyRosterDto>> CreateDutyRoster([FromBody] CreateDutyRosterDto dto)
        {
            // DutyRosters.CreatedById has an FK to Users — leaving it Guid.Empty made every create a 500.
            dto.CreatedById = CurrentUserId ?? Guid.Empty;
            return Ok(await _service.CreateDutyRosterAsync(dto));
        }

        // v2 HR.tsx "Chốt tuần" → publishRoster(); the route did not exist (404).
        [HttpPost("rosters/{id:guid}/publish")]
        public async Task<ActionResult<DutyRosterDto>> PublishRoster(Guid id)
            => Ok(await _service.PublishDutyRosterAsync(id));

        [HttpPost("rosters/copy-week")]
        public async Task<ActionResult<CopyRosterResultDto>> CopyRosterWeek([FromBody] CopyRosterWeekDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
            var result = await _service.CopyRosterWeekAsync(dto, userId);
            return Ok(result);
        }

        [HttpGet("clinic-assignments")]
        public async Task<ActionResult<List<ClinicAssignmentDto>>> GetClinicAssignments(
            [FromQuery] DateTime date,
            [FromQuery] Guid? departmentId)
            => Ok(await _service.GetClinicAssignmentsAsync(date, departmentId));

        [HttpGet("cme/summary/{staffId}")]
        public async Task<ActionResult<CMESummaryDto>> GetCMESummary(Guid staffId)
            => Ok(await _service.GetStaffCMESummaryAsync(staffId));

        // v2 HR.tsx "Đăng ký đào tạo" → createCMERecord(); the route did not exist (404).
        [HttpPost("cme")]
        public async Task<ActionResult<CMERecordDto>> CreateCMERecord([FromBody] CreateCMERecordDto dto)
            => Ok(await _service.CreateCMERecordAsync(dto));

        [HttpGet("cme/non-compliant")]
        public async Task<ActionResult<List<CMESummaryDto>>> GetCMENonCompliantStaff()
            => Ok(await _service.GetCMENonCompliantStaffAsync());

        [HttpGet("dashboard")]
        public async Task<ActionResult<MedicalHRDashboardDto>> GetDashboard()
            => Ok(await _service.GetDashboardAsync());

        // ========== HR Catalogs ==========

        [HttpGet("catalogs")]
        public async Task<ActionResult<List<HRCatalogDto>>> GetCatalogs([FromQuery] string? catalogType = null)
            => Ok(await _service.GetCatalogsAsync(catalogType));

        [HttpPost("catalogs")]
        public async Task<ActionResult<HRCatalogDto>> SaveCatalog([FromBody] SaveHRCatalogDto dto)
            => Ok(await _service.SaveCatalogAsync(dto));

        [HttpDelete("catalogs/{id}")]
        public async Task<ActionResult<bool>> DeleteCatalog(Guid id)
            => Ok(await _service.DeleteCatalogAsync(id));

        // ========== Staff Contracts ==========

        [HttpGet("contracts")]
        public async Task<ActionResult<List<StaffContractDto>>> GetContracts(
            [FromQuery] Guid? staffId = null, [FromQuery] string? contractType = null)
            => Ok(await _service.GetStaffContractsAsync(staffId, contractType));

        [HttpPost("contracts")]
        public async Task<ActionResult<StaffContractDto>> SaveContract([FromBody] SaveStaffContractDto dto)
            => Ok(await _service.SaveContractAsync(dto));

        [HttpGet("contracts/expiring")]
        public async Task<ActionResult<List<StaffContractDto>>> GetExpiringContracts([FromQuery] int daysAhead = 90)
            => Ok(await _service.GetExpiringContractsAsync(daysAhead));

        // ========== Salary History ==========

        // Salary data was readable by ANY logged-in role (GETs are not covered by WritePermissionMap).
        [HttpGet("salary-history/{staffId}")]
        [HIS.API.Authorization.RequirePermission(PermissionCatalog.Hr.Manage)]
        public async Task<ActionResult<List<SalaryRecordDto>>> GetSalaryHistory(Guid staffId)
            => Ok(await _service.GetSalaryHistoryAsync(staffId));

        [HttpPost("salary-history")]
        public async Task<ActionResult<SalaryRecordDto>> SaveSalaryRecord([FromBody] SaveSalaryRecordDto dto)
            => Ok(await _service.SaveSalaryRecordAsync(dto));

        // ========== Leave Management ==========

        [HttpGet("leave-requests")]
        public async Task<ActionResult<List<LeaveRequestDto>>> GetLeaveRequests(
            [FromQuery] Guid? staffId = null, [FromQuery] int? status = null,
            [FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null)
            => Ok(await _service.GetLeaveRequestsAsync(staffId, status, fromDate, toDate));

        [HttpPost("leave-requests")]
        public async Task<ActionResult<LeaveRequestDto>> CreateLeaveRequest([FromBody] CreateLeaveRequestDto dto)
            => Ok(await _service.CreateLeaveRequestAsync(dto));

        [HttpPut("leave-requests/{id}/approve")]
        public async Task<ActionResult<LeaveRequestDto>> ApproveLeave(Guid id, [FromBody] LeaveApprovalDto dto)
        {
            dto.ApproverUserId = CurrentUserId;
            return Ok(await _service.ApproveLeaveAsync(id, dto));
        }

        [HttpGet("leave-balance/{staffId}")]
        public async Task<ActionResult<LeaveBalanceDto>> GetLeaveBalance(Guid staffId, [FromQuery] int? year = null)
            => Ok(await _service.GetLeaveBalanceAsync(staffId, year ?? DateTime.Now.Year));

        // ========== Attendance ==========

        [HttpGet("attendance")]
        public async Task<ActionResult<List<AttendanceRecordDto>>> GetAttendance(
            [FromQuery] Guid? staffId = null, [FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null)
            => Ok(await _service.GetAttendanceAsync(staffId, fromDate, toDate));

        [HttpPost("attendance")]
        public async Task<ActionResult<AttendanceRecordDto>> RecordAttendance([FromBody] SaveAttendanceDto dto)
            => Ok(await _service.RecordAttendanceAsync(dto));

        [HttpGet("attendance/summary")]
        public async Task<ActionResult<List<HIS.Application.DTOs.MedicalHR.AttendanceSummaryDto>>> GetAttendanceSummary(
            [FromQuery] int year, [FromQuery] int month, [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetAttendanceSummaryAsync(year, month, departmentId));

        // ========== Overtime ==========

        [HttpGet("overtime")]
        public async Task<ActionResult<List<OvertimeRecordDto>>> GetOvertime(
            [FromQuery] Guid? staffId = null, [FromQuery] int? status = null,
            [FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null)
            => Ok(await _service.GetOvertimeRequestsAsync(staffId, status, fromDate, toDate));

        [HttpPost("overtime")]
        public async Task<ActionResult<OvertimeRecordDto>> CreateOvertime([FromBody] CreateOvertimeDto dto)
            => Ok(await _service.CreateOvertimeAsync(dto));

        [HttpPut("overtime/{id}/approve")]
        public async Task<ActionResult<OvertimeRecordDto>> ApproveOvertime(Guid id, [FromBody] OvertimeApprovalDto dto)
        {
            dto.ApproverUserId = CurrentUserId;
            return Ok(await _service.ApproveOvertimeAsync(id, dto));
        }

        // ========== Awards & Discipline ==========

        [HttpGet("awards")]
        public async Task<ActionResult<List<StaffAwardDto>>> GetAwards([FromQuery] Guid? staffId = null)
            => Ok(await _service.GetStaffAwardsAsync(staffId));

        [HttpPost("awards")]
        public async Task<ActionResult<StaffAwardDto>> SaveAward([FromBody] SaveStaffAwardDto dto)
            => Ok(await _service.SaveAwardAsync(dto));

        [HttpGet("disciplines")]
        public async Task<ActionResult<List<StaffDisciplineDto>>> GetDisciplines([FromQuery] Guid? staffId = null)
            => Ok(await _service.GetStaffDisciplinesAsync(staffId));

        [HttpPost("disciplines")]
        public async Task<ActionResult<StaffDisciplineDto>> SaveDiscipline([FromBody] SaveStaffDisciplineDto dto)
            => Ok(await _service.SaveDisciplineAsync(dto));

        // ========== Reports ==========
        // QA round 5: these were readable by ANY signed-in account — the role sweep found a receptionist
        // could pull attendance, leave, overtime and staff-movement reports for the whole hospital. HR
        // figures are not clinical data anyone on shift needs; gate them to the roles that own them.

        [HttpGet("reports/by-department")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.HRManager)]
        public async Task<ActionResult<List<StaffByDepartmentReportDto>>> GetStaffByDepartmentReport([FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetStaffByDepartmentReportAsync(departmentId));

        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.HRManager)]
        [HttpGet("reports/attendance")]
        public async Task<ActionResult<AttendanceReportDto>> GetAttendanceReport(
            [FromQuery] int year, [FromQuery] int month, [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetAttendanceReportAsync(year, month, departmentId));

        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.HRManager)]
        [HttpGet("reports/leave")]
        public async Task<ActionResult<LeaveReportDto>> GetLeaveReport(
            [FromQuery] int year, [FromQuery] int month, [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetLeaveReportAsync(year, month, departmentId));

        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.HRManager)]
        [HttpGet("reports/overtime")]
        public async Task<ActionResult<OvertimeReportDto>> GetOvertimeReport(
            [FromQuery] int year, [FromQuery] int month, [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetOvertimeReportAsync(year, month, departmentId));

        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.HRManager)]
        [HttpGet("reports/movement")]
        public async Task<ActionResult<StaffMovementReportDto>> GetMovementReport(
            [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
            => Ok(await _service.GetStaffMovementReportAsync(fromDate, toDate));
    }
}
