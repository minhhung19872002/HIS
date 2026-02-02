using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Reporting;
using HIS.Application.Services;

namespace HIS.API.Controllers
{
    /// <summary>
    /// Controller cho Phân hệ Báo cáo & Thống kê - Luồng 10
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReportingController : ControllerBase
    {
        private readonly IReportingCompleteService _reportingService;
        private readonly ILogger<ReportingController> _logger;

        public ReportingController(
            IReportingCompleteService reportingService,
            ILogger<ReportingController> logger)
        {
            _reportingService = reportingService;
            _logger = logger;
        }

        #region Dashboard & KPI

        /// <summary>
        /// Lấy Dashboard tổng quan
        /// </summary>
        [HttpGet("dashboard")]
        public async Task<ActionResult<ApiResponse<DashboardDto>>> GetDashboard([FromQuery] DateTime? date = null)
        {
            try
            {
                var result = await _reportingService.GetDashboardAsync(date);
                return Ok(ApiResponse<DashboardDto>.SuccessResponse(result, "Lấy Dashboard thành công"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting dashboard");
                return StatusCode(500, ApiResponse<DashboardDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// Lấy Dashboard theo khoa
        /// </summary>
        [HttpGet("dashboard/department/{departmentId}")]
        public async Task<ActionResult<ApiResponse<DashboardDto>>> GetDepartmentDashboard(
            Guid departmentId,
            [FromQuery] DateTime? date = null)
        {
            try
            {
                var result = await _reportingService.GetDepartmentDashboardAsync(departmentId, date);
                return Ok(ApiResponse<DashboardDto>.SuccessResponse(result, "Lấy Dashboard khoa thành công"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting department dashboard");
                return StatusCode(500, ApiResponse<DashboardDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// Lấy KPI Dashboard
        /// </summary>
        [HttpGet("kpi")]
        public async Task<ActionResult<ApiResponse<KPIDashboardDto>>> GetKPIDashboard(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            try
            {
                var result = await _reportingService.GetKPIDashboardAsync(fromDate, toDate);
                return Ok(ApiResponse<KPIDashboardDto>.SuccessResponse(result, "Lấy KPI thành công"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting KPI dashboard");
                return StatusCode(500, ApiResponse<KPIDashboardDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// Realtime - Số BN đang chờ
        /// </summary>
        [HttpGet("realtime/waiting-count")]
        public async Task<ActionResult<ApiResponse<Dictionary<string, int>>>> GetRealtimeWaitingCount()
        {
            try
            {
                var result = await _reportingService.GetRealtimeWaitingCountAsync();
                return Ok(ApiResponse<Dictionary<string, int>>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<Dictionary<string, int>>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// Realtime - Giường trống
        /// </summary>
        [HttpGet("realtime/bed-availability")]
        public async Task<ActionResult<ApiResponse<Dictionary<string, int>>>> GetRealtimeBedAvailability()
        {
            try
            {
                var result = await _reportingService.GetRealtimeBedAvailabilityAsync();
                return Ok(ApiResponse<Dictionary<string, int>>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<Dictionary<string, int>>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// Lấy cảnh báo hệ thống
        /// </summary>
        [HttpGet("alerts")]
        public async Task<ActionResult<ApiResponse<List<AlertDto>>>> GetAlerts(
            [FromQuery] string module = null,
            [FromQuery] int? top = 10)
        {
            try
            {
                var result = await _reportingService.GetAlertsAsync(module, top);
                return Ok(ApiResponse<List<AlertDto>>.SuccessResponse(result, "Lấy cảnh báo thành công"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<List<AlertDto>>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        #endregion

        #region Clinical Reports

        /// <summary>
        /// BC-001: Báo cáo BN theo khoa
        /// </summary>
        [HttpGet("clinical/patient-by-department")]
        public async Task<ActionResult<ApiResponse<PatientByDepartmentReportDto>>> GetPatientByDepartmentReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            try
            {
                var result = await _reportingService.GetPatientByDepartmentReportAsync(fromDate, toDate, departmentId);
                return Ok(ApiResponse<PatientByDepartmentReportDto>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<PatientByDepartmentReportDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// BC-002: Top 10 bệnh ICD-10
        /// </summary>
        [HttpGet("clinical/top-diseases")]
        public async Task<ActionResult<ApiResponse<Top10DiseasesReportDto>>> GetTop10DiseasesReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string patientType = null)
        {
            try
            {
                var result = await _reportingService.GetTop10DiseasesReportAsync(fromDate, toDate, patientType);
                return Ok(ApiResponse<Top10DiseasesReportDto>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<Top10DiseasesReportDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// BC-003: Báo cáo tỷ lệ tử vong
        /// </summary>
        [HttpGet("clinical/mortality")]
        public async Task<ActionResult<ApiResponse<MortalityReportDto>>> GetMortalityReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            try
            {
                var result = await _reportingService.GetMortalityReportAsync(fromDate, toDate, departmentId);
                return Ok(ApiResponse<MortalityReportDto>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<MortalityReportDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// BC-004: Thống kê PTTT
        /// </summary>
        [HttpGet("clinical/surgery-statistics")]
        public async Task<ActionResult<ApiResponse<SurgeryStatisticsReportDto>>> GetSurgeryStatisticsReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            try
            {
                var result = await _reportingService.GetSurgeryStatisticsReportAsync(fromDate, toDate, departmentId);
                return Ok(ApiResponse<SurgeryStatisticsReportDto>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<SurgeryStatisticsReportDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        #endregion

        #region Financial Reports

        /// <summary>
        /// BC-101: Báo cáo doanh thu tổng hợp
        /// </summary>
        [HttpGet("financial/revenue")]
        public async Task<ActionResult<ApiResponse<RevenueReportDto>>> GetRevenueReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string patientType = null)
        {
            try
            {
                var result = await _reportingService.GetRevenueReportAsync(fromDate, toDate, departmentId, patientType);
                return Ok(ApiResponse<RevenueReportDto>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<RevenueReportDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// BC-102: Doanh thu theo ngày
        /// </summary>
        [HttpGet("financial/daily-revenue")]
        public async Task<ActionResult<ApiResponse<List<RevenueByDayDto>>>> GetDailyRevenueReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            try
            {
                var result = await _reportingService.GetDailyRevenueReportAsync(fromDate, toDate);
                return Ok(ApiResponse<List<RevenueByDayDto>>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<List<RevenueByDayDto>>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// BC-103: Công nợ bệnh nhân
        /// </summary>
        [HttpGet("financial/patient-debt")]
        public async Task<ActionResult<ApiResponse<PatientDebtReportDto>>> GetPatientDebtReport(
            [FromQuery] DateTime? asOfDate = null,
            [FromQuery] Guid? departmentId = null)
        {
            try
            {
                var result = await _reportingService.GetPatientDebtReportAsync(asOfDate, departmentId);
                return Ok(ApiResponse<PatientDebtReportDto>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<PatientDebtReportDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// BC-104: Báo cáo BHYT tổng hợp
        /// </summary>
        [HttpGet("financial/insurance-claims")]
        public async Task<ActionResult<ApiResponse<InsuranceClaimReportDto>>> GetInsuranceClaimReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            try
            {
                var result = await _reportingService.GetInsuranceClaimReportAsync(fromDate, toDate);
                return Ok(ApiResponse<InsuranceClaimReportDto>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<InsuranceClaimReportDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// BC-105: Lợi nhuận theo khoa
        /// </summary>
        [HttpGet("financial/profit-by-department")]
        public async Task<ActionResult<ApiResponse<ProfitByDepartmentReportDto>>> GetProfitByDepartmentReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            try
            {
                var result = await _reportingService.GetProfitByDepartmentReportAsync(fromDate, toDate);
                return Ok(ApiResponse<ProfitByDepartmentReportDto>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<ProfitByDepartmentReportDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        #endregion

        #region Pharmacy Reports

        /// <summary>
        /// BC-201: Tồn kho hiện tại
        /// </summary>
        [HttpGet("pharmacy/current-stock")]
        public async Task<ActionResult<ApiResponse<CurrentStockReportDto>>> GetCurrentStockReport(
            [FromQuery] Guid? warehouseId = null,
            [FromQuery] string category = null)
        {
            try
            {
                var result = await _reportingService.GetCurrentStockReportAsync(warehouseId, category);
                return Ok(ApiResponse<CurrentStockReportDto>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<CurrentStockReportDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// BC-202: Xuất nhập tồn
        /// </summary>
        [HttpGet("pharmacy/stock-movement")]
        public async Task<ActionResult<ApiResponse<StockMovementReportDto>>> GetStockMovementReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? warehouseId = null)
        {
            try
            {
                var result = await _reportingService.GetStockMovementReportAsync(fromDate, toDate, warehouseId);
                return Ok(ApiResponse<StockMovementReportDto>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<StockMovementReportDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// BC-203: Thuốc gây nghiện
        /// </summary>
        [HttpGet("pharmacy/narcotic-drugs")]
        public async Task<ActionResult<ApiResponse<ControlledDrugReportDto>>> GetNarcoticDrugReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            try
            {
                var result = await _reportingService.GetNarcoticDrugReportAsync(fromDate, toDate);
                return Ok(ApiResponse<ControlledDrugReportDto>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<ControlledDrugReportDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// BC-204: Thuốc hướng thần
        /// </summary>
        [HttpGet("pharmacy/psychotropic-drugs")]
        public async Task<ActionResult<ApiResponse<ControlledDrugReportDto>>> GetPsychotropicDrugReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            try
            {
                var result = await _reportingService.GetPsychotropicDrugReportAsync(fromDate, toDate);
                return Ok(ApiResponse<ControlledDrugReportDto>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<ControlledDrugReportDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// BC-205: Thuốc sắp hết hạn
        /// </summary>
        [HttpGet("pharmacy/expiring-drugs")]
        public async Task<ActionResult<ApiResponse<ExpiringDrugsReportDto>>> GetExpiringDrugsReport(
            [FromQuery] int daysAhead = 90,
            [FromQuery] Guid? warehouseId = null)
        {
            try
            {
                var result = await _reportingService.GetExpiringDrugsReportAsync(daysAhead, warehouseId);
                return Ok(ApiResponse<ExpiringDrugsReportDto>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<ExpiringDrugsReportDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        #endregion

        #region Administrative Reports

        /// <summary>
        /// BC-301: Thống kê người dùng
        /// </summary>
        [HttpGet("admin/user-statistics")]
        public async Task<ActionResult<ApiResponse<UserStatisticsReportDto>>> GetUserStatisticsReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            try
            {
                var result = await _reportingService.GetUserStatisticsReportAsync(fromDate, toDate);
                return Ok(ApiResponse<UserStatisticsReportDto>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<UserStatisticsReportDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// BC-302: Audit Log
        /// </summary>
        [HttpGet("admin/audit-log")]
        public async Task<ActionResult<ApiResponse<AuditLogReportDto>>> GetAuditLogReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string module = null,
            [FromQuery] string userName = null)
        {
            try
            {
                var result = await _reportingService.GetAuditLogReportAsync(fromDate, toDate, module, userName);
                return Ok(ApiResponse<AuditLogReportDto>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<AuditLogReportDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        #endregion

        #region Export Reports

        /// <summary>
        /// Xuất báo cáo ra Excel
        /// </summary>
        [HttpGet("export/excel/{reportCode}")]
        public async Task<IActionResult> ExportToExcel(
            string reportCode,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            try
            {
                var fileContent = await _reportingService.ExportToExcelAsync(reportCode, fromDate, toDate);
                return File(fileContent,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"{reportCode}_{fromDate:yyyyMMdd}_{toDate:yyyyMMdd}.xlsx");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting to Excel");
                return StatusCode(500, $"Lỗi xuất Excel: {ex.Message}");
            }
        }

        /// <summary>
        /// Xuất báo cáo ra PDF
        /// </summary>
        [HttpGet("export/pdf/{reportCode}")]
        public async Task<IActionResult> ExportToPdf(
            string reportCode,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            try
            {
                var fileContent = await _reportingService.ExportToPdfAsync(reportCode, fromDate, toDate);
                return File(fileContent,
                    "application/pdf",
                    $"{reportCode}_{fromDate:yyyyMMdd}_{toDate:yyyyMMdd}.pdf");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting to PDF");
                return StatusCode(500, $"Lỗi xuất PDF: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy lịch sử báo cáo đã xuất
        /// </summary>
        [HttpGet("history")]
        public async Task<ActionResult<ApiResponse<List<ReportHistoryDto>>>> GetReportHistory(
            [FromQuery] string reportCode = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] int? top = 50)
        {
            try
            {
                var result = await _reportingService.GetReportHistoryAsync(reportCode, fromDate, toDate, top);
                return Ok(ApiResponse<List<ReportHistoryDto>>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<List<ReportHistoryDto>>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// Tải lại báo cáo từ lịch sử
        /// </summary>
        [HttpGet("history/{reportHistoryId}/download")]
        public async Task<IActionResult> DownloadFromHistory(Guid reportHistoryId)
        {
            try
            {
                var fileContent = await _reportingService.DownloadReportFromHistoryAsync(reportHistoryId);
                return File(fileContent, "application/octet-stream", $"report_{reportHistoryId}.xlsx");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi tải báo cáo: {ex.Message}");
            }
        }

        #endregion

        #region Scheduled Reports

        /// <summary>
        /// Lấy danh sách báo cáo tự động
        /// </summary>
        [HttpGet("scheduled")]
        public async Task<ActionResult<ApiResponse<List<ScheduledReportConfigDto>>>> GetScheduledReports()
        {
            try
            {
                var result = await _reportingService.GetScheduledReportsAsync();
                return Ok(ApiResponse<List<ScheduledReportConfigDto>>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<List<ScheduledReportConfigDto>>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// Lưu cấu hình báo cáo tự động
        /// </summary>
        [HttpPost("scheduled")]
        public async Task<ActionResult<ApiResponse<ScheduledReportConfigDto>>> SaveScheduledReport(
            [FromBody] SaveScheduledReportDto dto)
        {
            try
            {
                var result = await _reportingService.SaveScheduledReportAsync(dto);
                return Ok(ApiResponse<ScheduledReportConfigDto>.SuccessResponse(result, "Lưu cấu hình thành công"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<ScheduledReportConfigDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// Xóa cấu hình báo cáo tự động
        /// </summary>
        [HttpDelete("scheduled/{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteScheduledReport(Guid id)
        {
            try
            {
                var result = await _reportingService.DeleteScheduledReportAsync(id);
                return Ok(ApiResponse<bool>.SuccessResponse(result, "Xóa thành công"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<bool>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// Chạy báo cáo tự động ngay
        /// </summary>
        [HttpPost("scheduled/{id}/run")]
        public async Task<ActionResult<ApiResponse<bool>>> RunScheduledReportNow(Guid id)
        {
            try
            {
                var result = await _reportingService.RunScheduledReportNowAsync(id);
                return Ok(ApiResponse<bool>.SuccessResponse(result, "Chạy báo cáo thành công"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<bool>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        #endregion

        #region Report Definitions

        /// <summary>
        /// Lấy danh sách định nghĩa báo cáo
        /// </summary>
        [HttpGet("definitions")]
        public async Task<ActionResult<ApiResponse<List<ReportDefinitionDto>>>> GetReportDefinitions(
            [FromQuery] string category = null)
        {
            try
            {
                var result = await _reportingService.GetReportDefinitionsAsync(category);
                return Ok(ApiResponse<List<ReportDefinitionDto>>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<List<ReportDefinitionDto>>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        /// <summary>
        /// Lấy chi tiết định nghĩa báo cáo
        /// </summary>
        [HttpGet("definitions/{reportCode}")]
        public async Task<ActionResult<ApiResponse<ReportDefinitionDto>>> GetReportDefinition(string reportCode)
        {
            try
            {
                var result = await _reportingService.GetReportDefinitionAsync(reportCode);
                return Ok(ApiResponse<ReportDefinitionDto>.SuccessResponse(result, "Success"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<ReportDefinitionDto>.ErrorResponse($"Lỗi: {ex.Message}"));
            }
        }

        #endregion
    }
}
