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
    public class MedicalHRController : ControllerBase
    {
        private readonly IMedicalHRService _service;

        public MedicalHRController(IMedicalHRService service)
        {
            _service = service;
        }

        [HttpGet("staff")]
        public async Task<ActionResult<List<MedicalStaffDto>>> GetStaffList(
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string staffType = null,
            [FromQuery] string status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 200)
            => Ok(await _service.GetStaffListAsync(departmentId, staffType, status));

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

        [HttpGet("shifts")]
        public ActionResult<List<object>> GetShiftDefinitions()
            => Ok(new List<object>());

        [HttpGet("rosters")]
        public async Task<ActionResult<DutyRosterDto>> GetRosters(
            [FromQuery] Guid? departmentId = null,
            [FromQuery] int? year = null,
            [FromQuery] int? month = null)
        {
            if (departmentId == null || year == null || month == null)
                return Ok(new { items = new List<object>() });
            return Ok(await _service.GetDutyRosterAsync(departmentId.Value, year.Value, month.Value));
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
            => Ok(await _service.CreateDutyRosterAsync(dto));

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

        [HttpGet("cme/non-compliant")]
        public async Task<ActionResult<List<MedicalStaffDto>>> GetCMENonCompliantStaff()
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

        [HttpGet("salary-history/{staffId}")]
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
            => Ok(await _service.ApproveLeaveAsync(id, dto));

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
            => Ok(await _service.ApproveOvertimeAsync(id, dto));

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

        [HttpGet("reports/by-department")]
        public async Task<ActionResult<List<StaffByDepartmentReportDto>>> GetStaffByDepartmentReport([FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetStaffByDepartmentReportAsync(departmentId));

        [HttpGet("reports/attendance")]
        public async Task<ActionResult<AttendanceReportDto>> GetAttendanceReport(
            [FromQuery] int year, [FromQuery] int month, [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetAttendanceReportAsync(year, month, departmentId));

        [HttpGet("reports/leave")]
        public async Task<ActionResult<LeaveReportDto>> GetLeaveReport(
            [FromQuery] int year, [FromQuery] int month, [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetLeaveReportAsync(year, month, departmentId));

        [HttpGet("reports/overtime")]
        public async Task<ActionResult<OvertimeReportDto>> GetOvertimeReport(
            [FromQuery] int year, [FromQuery] int month, [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetOvertimeReportAsync(year, month, departmentId));

        [HttpGet("reports/movement")]
        public async Task<ActionResult<StaffMovementReportDto>> GetMovementReport(
            [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
            => Ok(await _service.GetStaffMovementReportAsync(fromDate, toDate));
    }
}
