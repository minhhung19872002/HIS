using System;
using HIS.Core.Constants;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.System;
using HIS.Application.Services;

namespace HIS.API.Controllers
{
    public partial class SystemCompleteController
    {
        // 16.1 Quản lý lưu trữ hồ sơ bệnh án
        [HttpGet("api/medical-records/archives")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.MedicalRecordManager + "," + RoleNames.Doctor)]
        public async Task<ActionResult<List<MedicalRecordArchiveDto>>> GetMedicalRecordArchives(
            [FromQuery] string keyword = null,
            [FromQuery] int? year = null,
            [FromQuery] string archiveStatus = null,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _service.GetMedicalRecordArchivesAsync(keyword, year, archiveStatus, departmentId);
            return Ok(result);
        }

        [HttpGet("api/medical-records/archives/{archiveId}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.MedicalRecordManager + "," + RoleNames.Doctor)]
        public async Task<ActionResult<MedicalRecordArchiveDto>> GetMedicalRecordArchive(Guid archiveId)
        {
            var result = await _service.GetMedicalRecordArchiveAsync(archiveId);
            return Ok(result);
        }

        [HttpPost("api/medical-records/archives")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.MedicalRecordManager)]
        public async Task<ActionResult<MedicalRecordArchiveDto>> SaveMedicalRecordArchive([FromBody] MedicalRecordArchiveDto dto)
        {
            var result = await _service.SaveMedicalRecordArchiveAsync(dto);
            return Ok(result);
        }

        [HttpPut("api/medical-records/archives/{archiveId}/location")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.MedicalRecordManager)]
        public async Task<ActionResult<bool>> UpdateArchiveLocation(Guid archiveId, [FromBody] string location)
        {
            var result = await _service.UpdateArchiveLocationAsync(archiveId, location);
            return Ok(result);
        }

        // 16.2 Quản lý mượn trả hồ sơ
        [HttpGet("api/medical-records/borrow-requests")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.MedicalRecordManager)]
        public async Task<ActionResult<List<MedicalRecordBorrowRequestDto>>> GetBorrowRequests(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string status = null,
            [FromQuery] Guid? borrowerId = null)
        {
            var result = await _service.GetBorrowRequestsAsync(fromDate, toDate, status, borrowerId);
            return Ok(result);
        }

        [HttpGet("api/medical-records/borrow-requests/{requestId}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.MedicalRecordManager + "," + RoleNames.Doctor)]
        public async Task<ActionResult<MedicalRecordBorrowRequestDto>> GetBorrowRequest(Guid requestId)
        {
            var result = await _service.GetBorrowRequestAsync(requestId);
            return Ok(result);
        }

        [HttpPost("api/medical-records/borrow-requests")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.MedicalRecordManager + "," + RoleNames.Doctor)]
        public async Task<ActionResult<MedicalRecordBorrowRequestDto>> CreateBorrowRequest([FromBody] CreateBorrowRequestDto dto)
        {
            var result = await _service.CreateBorrowRequestAsync(dto);
            return Ok(result);
        }

        [HttpPut("api/medical-records/borrow-requests/{requestId}/approve")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.MedicalRecordManager)]
        public async Task<ActionResult<bool>> ApproveBorrowRequest(Guid requestId)
        {
            var result = await _service.ApproveBorrowRequestAsync(requestId);
            return Ok(result);
        }

        [HttpPut("api/medical-records/borrow-requests/{requestId}/reject")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.MedicalRecordManager)]
        public async Task<ActionResult<bool>> RejectBorrowRequest(Guid requestId, [FromBody] string reason)
        {
            var result = await _service.RejectBorrowRequestAsync(requestId, reason);
            return Ok(result);
        }

        [HttpPut("api/medical-records/borrow-requests/{requestId}/process")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.MedicalRecordManager)]
        public async Task<ActionResult<bool>> ProcessBorrow(Guid requestId)
        {
            var result = await _service.ProcessBorrowAsync(requestId);
            return Ok(result);
        }

        [HttpPut("api/medical-records/borrow-requests/{requestId}/return")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.MedicalRecordManager)]
        public async Task<ActionResult<bool>> ReturnMedicalRecord(Guid requestId, [FromBody] string note)
        {
            var result = await _service.ReturnMedicalRecordAsync(requestId, note);
            return Ok(result);
        }

        // 16.3 Dashboard thống kê
        [HttpGet("api/statistics/dashboard")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director)]
        public async Task<ActionResult<HospitalDashboardDto>> GetHospitalDashboard([FromQuery] DateTime? date = null)
        {
            var result = await _service.GetHospitalDashboardAsync(date);
            return Ok(result);
        }

        [HttpGet("api/statistics/departments")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director)]
        public async Task<ActionResult<List<DepartmentStatisticsDto>>> GetDepartmentStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _service.GetDepartmentStatisticsAsync(fromDate, toDate);
            return Ok(result);
        }

        // 16.4 Báo cáo khám bệnh
        [HttpGet("api/statistics/examination")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.StatisticsOfficer)]
        public async Task<ActionResult<List<ExaminationStatisticsDto>>> GetExaminationStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] Guid? doctorId = null)
        {
            var result = await _service.GetExaminationStatisticsAsync(fromDate, toDate, departmentId, doctorId);
            return Ok(result);
        }

        // 16.5 Báo cáo nhập viện
        [HttpGet("api/statistics/admission")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.StatisticsOfficer)]
        public async Task<ActionResult<List<AdmissionStatisticsDto>>> GetAdmissionStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string admissionSource = null)
        {
            var result = await _service.GetAdmissionStatisticsAsync(fromDate, toDate, departmentId, admissionSource);
            return Ok(result);
        }

        // 16.6 Báo cáo xuất viện
        [HttpGet("api/statistics/discharge")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.StatisticsOfficer)]
        public async Task<ActionResult<List<DischargeStatisticsDto>>> GetDischargeStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string dischargeType = null)
        {
            var result = await _service.GetDischargeStatisticsAsync(fromDate, toDate, departmentId, dischargeType);
            return Ok(result);
        }

        // 16.7 Báo cáo tử vong
        [HttpGet("api/statistics/mortality")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.StatisticsOfficer)]
        public async Task<ActionResult<List<MortalityStatisticsDto>>> GetMortalityStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _service.GetMortalityStatisticsAsync(fromDate, toDate, departmentId);
            return Ok(result);
        }

        // 16.8 Báo cáo bệnh theo ICD-10
        [HttpGet("api/statistics/disease")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.StatisticsOfficer)]
        public async Task<ActionResult<List<DiseaseStatisticsDto>>> GetDiseaseStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string icdChapter = null,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _service.GetDiseaseStatisticsAsync(fromDate, toDate, icdChapter, departmentId);
            return Ok(result);
        }

        // 16.9 Báo cáo hoạt động khoa
        [HttpGet("api/statistics/department-activity")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.StatisticsOfficer)]
        public async Task<ActionResult<List<DepartmentActivityReportDto>>> GetDepartmentActivityReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _service.GetDepartmentActivityReportAsync(fromDate, toDate, departmentId);
            return Ok(result);
        }

        // 16.10 Báo cáo công suất giường
        [HttpGet("api/statistics/bed-occupancy")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.StatisticsOfficer)]
        public async Task<ActionResult<List<BedOccupancyReportDto>>> GetBedOccupancyReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _service.GetBedOccupancyReportAsync(fromDate, toDate, departmentId);
            return Ok(result);
        }

        // 16.11 Báo cáo A1-A2-A3 (BYT)
        [HttpGet("api/statistics/byt-report")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.StatisticsOfficer)]
        public async Task<ActionResult<BYTReportDto>> GetBYTReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _service.GetBYTReportAsync(fromDate, toDate);
            return Ok(result);
        }

        // 16.12 Báo cáo KPI
        [HttpGet("api/statistics/kpi")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director)]
        public async Task<ActionResult<List<HospitalKPIDto>>> GetHospitalKPIs(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _service.GetHospitalKPIsAsync(fromDate, toDate);
            return Ok(result);
        }

        // In báo cáo thống kê
        [HttpPost("api/statistics/reports/print")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.StatisticsOfficer)]
        public async Task<IActionResult> PrintStatisticsReport([FromBody] StatisticsReportRequest request)
        {
            var result = await _service.PrintStatisticsReportAsync(request);
            return File(result, "application/pdf", $"StatisticsReport_{DateTime.Now:yyyyMMdd}.pdf");
        }

        [HttpPost("api/statistics/reports/export")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.StatisticsOfficer)]
        public async Task<IActionResult> ExportStatisticsReport([FromBody] StatisticsReportRequest request)
        {
            var result = await _service.ExportStatisticsReportToExcelAsync(request);
            return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"StatisticsReport_{DateTime.Now:yyyyMMdd}.xlsx");
        }
    }
}
