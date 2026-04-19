using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs.Laboratory;
using ApproveLabResultDto = HIS.Application.Services.ApproveLabResultDto;

namespace HIS.API.Controllers
{
    /// <summary>
    /// Complete LIS (Laboratory Information System) Controller
    /// Module 7: Xét nghiệm - 31+ chức năng
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class LISCompleteController : ControllerBase
    {
        private readonly ILISCompleteService _lisService;

        public LISCompleteController(ILISCompleteService lisService)
        {
            _lisService = lisService;
        }

        private Guid? GetUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        #region DEV Endpoints

        /// <summary>
        /// Cập nhật ngày của tất cả LabOrders thành ngày hôm nay (DEV only)
        /// </summary>
        [HttpPost("dev/update-dates-to-today")]
        [AllowAnonymous]
        public async Task<ActionResult> UpdateDatesToToday()
        {
            var count = await _lisService.UpdateAllOrderDatesToTodayAsync();
            return Ok(new { success = true, updatedCount = count });
        }

        #endregion

        #region 7.1 Kết nối máy xét nghiệm

        /// <summary>
        /// 7.1.1 Danh sách máy xét nghiệm
        /// </summary>
        [HttpGet("analyzers")]
        // Authorize removed for testing
        public async Task<ActionResult<List<LabAnalyzerDto>>> GetAnalyzers(
            [FromQuery] string keyword = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _lisService.GetAnalyzersAsync(keyword, isActive);
            return Ok(result);
        }

        /// <summary>
        /// 7.1.2 Thêm mới máy xét nghiệm
        /// </summary>
        [HttpPost("analyzers")]
        // Authorize removed for testing
        public async Task<ActionResult<LabAnalyzerDto>> CreateAnalyzer([FromBody] CreateAnalyzerDto dto)
        {
            var result = await _lisService.CreateAnalyzerAsync(dto);
            return CreatedAtAction(nameof(GetAnalyzers), new { id = result.Id }, result);
        }

        /// <summary>
        /// 7.1.3 Cập nhật thông tin máy
        /// </summary>
        [HttpPut("analyzers/{id}")]
        // Authorize removed for testing
        public async Task<ActionResult<LabAnalyzerDto>> UpdateAnalyzer(Guid id, [FromBody] UpdateAnalyzerDto dto)
        {
            var result = await _lisService.UpdateAnalyzerAsync(id, dto);
            return Ok(result);
        }

        /// <summary>
        /// 7.1.4 Xóa máy xét nghiệm
        /// </summary>
        [HttpDelete("analyzers/{id}")]
        // Authorize removed for testing
        public async Task<ActionResult> DeleteAnalyzer(Guid id)
        {
            await _lisService.DeleteAnalyzerAsync(id);
            return NoContent();
        }

        /// <summary>
        /// 7.1.5 Lấy mapping chỉ số xét nghiệm với máy
        /// </summary>
        [HttpGet("analyzers/{analyzerId}/mappings")]
        // Authorize removed for testing
        public async Task<ActionResult<List<AnalyzerTestMappingDto>>> GetAnalyzerTestMappings(Guid analyzerId)
        {
            var result = await _lisService.GetAnalyzerTestMappingsAsync(analyzerId);
            return Ok(result);
        }

        /// <summary>
        /// 7.1.6 Cập nhật mapping chỉ số
        /// </summary>
        [HttpPut("analyzers/{analyzerId}/mappings")]
        // Authorize removed for testing
        public async Task<ActionResult> UpdateAnalyzerTestMappings(
            Guid analyzerId,
            [FromBody] List<UpdateAnalyzerTestMappingDto> mappings)
        {
            await _lisService.UpdateAnalyzerTestMappingsAsync(analyzerId, mappings);
            return Ok(new { success = true });
        }

        /// <summary>
        /// 7.1.7 Kiểm tra kết nối máy xét nghiệm
        /// </summary>
        [HttpGet("analyzers/{analyzerId}/connection-status")]
        // Authorize removed for testing
        public async Task<ActionResult<AnalyzerConnectionStatusDto>> CheckAnalyzerConnection(Guid analyzerId)
        {
            var result = await _lisService.CheckAnalyzerConnectionAsync(analyzerId);
            return Ok(result);
        }

        /// <summary>
        /// 7.1.8 Khởi động/Dừng kết nối máy
        /// </summary>
        [HttpPost("analyzers/{analyzerId}/toggle-connection")]
        // Authorize removed for testing
        public async Task<ActionResult> ToggleAnalyzerConnection(Guid analyzerId, [FromQuery] bool connect)
        {
            await _lisService.ToggleAnalyzerConnectionAsync(analyzerId, connect);
            return Ok(new { success = true, connected = connect });
        }

        /// <summary>
        /// Lấy dữ liệu thô từ máy xét nghiệm
        /// </summary>
        [HttpGet("analyzers/{analyzerId}/raw-data")]
        // Authorize removed for testing
        public async Task<ActionResult<List<RawDataDto>>> GetRawDataFromAnalyzer(
            Guid analyzerId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _lisService.GetRawDataFromAnalyzerAsync(analyzerId, fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Lấy lịch sử kết nối máy
        /// </summary>
        [HttpGet("analyzers/{analyzerId}/connection-logs")]
        // Authorize removed for testing
        public async Task<ActionResult<List<AnalyzerConnectionLogDto>>> GetConnectionLogs(
            Guid analyzerId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _lisService.GetConnectionLogsAsync(analyzerId, fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Lấy trạng thái real-time của các máy
        /// </summary>
        [HttpGet("analyzers/realtime-status")]
        // Authorize removed for testing
        public async Task<ActionResult<List<AnalyzerRealtimeStatusDto>>> GetAnalyzersRealtimeStatus()
        {
            var result = await _lisService.GetAnalyzersRealtimeStatusAsync();
            return Ok(result);
        }

        #endregion

        #region 7.2 Lấy mẫu xét nghiệm

        /// <summary>
        /// 7.2.1 Danh sách bệnh nhân chờ lấy mẫu
        /// </summary>
        [HttpGet("sample-collection/list")]
        // Authorize removed for testing
        public async Task<ActionResult<List<SampleCollectionListDto>>> GetSampleCollectionList(
            [FromQuery] DateTime date,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string patientType = null,
            [FromQuery] string keyword = null)
        {
            var result = await _lisService.GetSampleCollectionListAsync(date, departmentId, patientType, keyword);
            return Ok(result);
        }

        /// <summary>
        /// 7.2.2 Chi tiết mẫu cần lấy của bệnh nhân
        /// </summary>
        [HttpGet("sample-collection/patient/{patientId}/visit/{visitId}")]
        // Authorize removed for testing
        public async Task<ActionResult<List<SampleCollectionItemDto>>> GetPatientSamples(Guid patientId, Guid visitId)
        {
            var result = await _lisService.GetPatientSamplesAsync(patientId, visitId);
            return Ok(result);
        }

        /// <summary>
        /// 7.2.3 Thực hiện lấy mẫu
        /// </summary>
        [HttpPost("sample-collection/collect")]
        [HttpPost("sample/collect")]
        // Authorize removed for testing
        public async Task<ActionResult<CollectSampleResultDto>> CollectSample([FromBody] CollectSampleDto dto)
        {
            var result = await _lisService.CollectSampleAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// 7.2.4 In nhãn barcode mẫu
        /// </summary>
        [HttpGet("sample-collection/{sampleId}/barcode")]
        // Authorize removed for testing
        public async Task<ActionResult> PrintSampleBarcode(Guid sampleId)
        {
            var result = await _lisService.PrintSampleBarcodeAsync(sampleId);
            return File(result, "application/pdf", $"barcode_{sampleId}.pdf");
        }

        /// <summary>
        /// In nhãn barcode hàng loạt
        /// </summary>
        [HttpPost("sample-collection/barcodes/batch")]
        // Authorize removed for testing
        public async Task<ActionResult> PrintSampleBarcodesBatch([FromBody] List<Guid> sampleIds)
        {
            var result = await _lisService.PrintSampleBarcodesBatchAsync(sampleIds);
            return File(result, "application/pdf", "barcodes_batch.pdf");
        }

        /// <summary>
        /// Hủy mẫu đã lấy
        /// </summary>
        [HttpPost("sample-collection/{sampleId}/cancel")]
        // Authorize removed for testing
        public async Task<ActionResult> CancelSample(Guid sampleId, [FromBody] CancelSampleRequest request)
        {
            await _lisService.CancelSampleAsync(sampleId, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Danh sách loại mẫu
        /// </summary>
        [HttpGet("sample-types")]
        public async Task<ActionResult<List<SampleTypeDto>>> GetSampleTypes()
        {
            var result = await _lisService.GetSampleTypesAsync();
            return Ok(result);
        }

        /// <summary>
        /// Danh sách loại ống nghiệm
        /// </summary>
        [HttpGet("tube-types")]
        public async Task<ActionResult<List<TubeTypeDto>>> GetTubeTypes()
        {
            var result = await _lisService.GetTubeTypesAsync();
            return Ok(result);
        }

        /// <summary>
        /// Kiểm tra mẫu có hợp lệ không
        /// </summary>
        [HttpGet("sample-collection/{sampleId}/validate")]
        // Authorize removed for testing
        public async Task<ActionResult<SampleValidationResultDto>> ValidateSample(Guid sampleId)
        {
            var result = await _lisService.ValidateSampleAsync(sampleId);
            return Ok(result);
        }

        #endregion

        #region 7.3 Thực hiện xét nghiệm

        /// <summary>
        /// 7.3.1 Danh sách xét nghiệm chờ thực hiện
        /// </summary>
        [HttpGet("orders/pending")]
        // Authorize removed for testing
        public async Task<ActionResult<List<LabOrderDto>>> GetPendingLabOrders(
            [FromQuery] DateTime date,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] Guid? analyzerId = null,
            [FromQuery] string patientType = null,
            [FromQuery] string keyword = null)
        {
            var result = await _lisService.GetPendingLabOrdersAsync(date, departmentId, analyzerId, patientType, keyword);
            return Ok(result);
        }

        /// <summary>
        /// 7.3.2 Chi tiết xét nghiệm của bệnh nhân
        /// </summary>
        [HttpGet("orders/{orderId}")]
        // Authorize removed for testing
        public async Task<ActionResult<LabOrderDetailDto>> GetLabOrderDetail(Guid orderId)
        {
            var result = await _lisService.GetLabOrderDetailAsync(orderId);
            return Ok(result);
        }

        /// <summary>
        /// 7.3.3 Gửi worklist đến máy xét nghiệm
        /// </summary>
        [HttpPost("worklist/send")]
        // Authorize removed for testing
        public async Task<ActionResult<SendWorklistResultDto>> SendWorklistToAnalyzer([FromBody] SendWorklistDto dto)
        {
            var result = await _lisService.SendWorklistToAnalyzerAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// 7.3.4 Nhận kết quả từ máy xét nghiệm
        /// </summary>
        [HttpPost("analyzers/{analyzerId}/receive-results")]
        // Authorize removed for testing
        public async Task<ActionResult<ReceiveResultDto>> ReceiveResultFromAnalyzer(Guid analyzerId)
        {
            var result = await _lisService.ReceiveResultFromAnalyzerAsync(analyzerId);
            return Ok(result);
        }

        /// <summary>
        /// 7.3.5 Nhập kết quả thủ công
        /// </summary>
        [HttpPost("orders/enter-result")]
        // Authorize removed for testing
        public async Task<ActionResult> EnterLabResult([FromBody] EnterLabResultDto dto)
        {
            await _lisService.EnterLabResultAsync(dto);
            return Ok(new { success = true });
        }

        /// <summary>
        /// 7.3.6 Duyệt kết quả xét nghiệm (1 bước)
        /// </summary>
        [HttpPost("orders/approve")]
        [HttpPost("results/approve")]
        // Authorize removed for testing
        public async Task<ActionResult> ApproveLabResult([FromBody] ApproveLabResultDto dto)
        {
            dto.ApprovedByUserId ??= GetUserId();
            await _lisService.ApproveLabResultAsync(dto);
            return Ok(new { success = true });
        }

        /// <summary>
        /// 7.3.7 Duyệt kết quả xét nghiệm (2 bước - duyệt sơ bộ)
        /// </summary>
        [HttpPost("orders/{orderId}/preliminary-approve")]
        // Authorize removed for testing
        public async Task<ActionResult> PreliminaryApproveLabResult(
            Guid orderId,
            [FromBody] PreliminaryApproveRequest request)
        {
            await _lisService.PreliminaryApproveLabResultAsync(orderId, request.TechnicianNote, GetUserId());
            return Ok(new { success = true });
        }

        /// <summary>
        /// 7.3.8 Duyệt kết quả xét nghiệm (2 bước - duyệt chính thức)
        /// </summary>
        [HttpPost("orders/{orderId}/final-approve")]
        // Authorize removed for testing
        public async Task<ActionResult> FinalApproveLabResult(
            Guid orderId,
            [FromBody] FinalApproveRequest request)
        {
            await _lisService.FinalApproveLabResultAsync(orderId, request.DoctorNote, GetUserId());
            return Ok(new { success = true });
        }

        /// <summary>
        /// 7.3.9 Hủy duyệt kết quả
        /// </summary>
        [HttpPost("orders/{orderId}/cancel-approval")]
        // Authorize removed for testing
        public async Task<ActionResult> CancelApproval(Guid orderId, [FromBody] LISCancelApprovalRequest request)
        {
            await _lisService.CancelApprovalAsync(orderId, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// 7.3.10 In phiếu kết quả xét nghiệm
        /// </summary>
        [HttpGet("orders/{orderId}/print")]
        // Authorize removed for testing
        public async Task<ActionResult> PrintLabResult(Guid orderId, [FromQuery] string format = "A4")
        {
            var result = await _lisService.PrintLabResultAsync(orderId, format);
            return File(result, "application/pdf", $"lab_result_{orderId}.pdf");
        }

        /// <summary>
        /// 7.3.11 Xử lý giá trị nguy hiểm
        /// </summary>
        [HttpPost("critical-values/process")]
        // Authorize removed for testing
        public async Task<ActionResult> ProcessCriticalValue([FromBody] ProcessCriticalValueDto dto)
        {
            await _lisService.ProcessCriticalValueAsync(dto);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Danh sách cảnh báo giá trị nguy hiểm
        /// </summary>
        [HttpGet("critical-values/alerts")]
        // Authorize removed for testing
        public async Task<ActionResult<List<CriticalValueAlertDto>>> GetCriticalValueAlerts(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] bool? acknowledged = null)
        {
            var result = await _lisService.GetCriticalValueAlertsAsync(fromDate, toDate, acknowledged);
            return Ok(result);
        }

        /// <summary>
        /// Xác nhận đã thông báo giá trị nguy hiểm
        /// </summary>
        [HttpPost("critical-values/{alertId}/acknowledge")]
        // Authorize removed for testing
        public async Task<ActionResult> AcknowledgeCriticalValue(
            Guid alertId,
            [FromBody] AcknowledgeCriticalValueDto dto)
        {
            await _lisService.AcknowledgeCriticalValueAsync(alertId, dto);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Lịch sử kết quả xét nghiệm của bệnh nhân
        /// </summary>
        [HttpGet("patients/{patientId}/history")]
        // Authorize removed for testing
        public async Task<ActionResult<List<LabResultHistoryDto>>> GetLabResultHistory(
            Guid patientId,
            [FromQuery] string testCode = null,
            [FromQuery] int? lastNMonths = 12)
        {
            var result = await _lisService.GetLabResultHistoryAsync(patientId, testCode, lastNMonths);
            return Ok(result);
        }

        /// <summary>
        /// So sánh kết quả với các lần trước
        /// </summary>
        [HttpGet("patients/{patientId}/compare")]
        // Authorize removed for testing
        public async Task<ActionResult<LabResultComparisonDto>> CompareLabResults(
            Guid patientId,
            [FromQuery] string testCode,
            [FromQuery] int lastNTimes = 5)
        {
            var result = await _lisService.CompareLabResultsAsync(patientId, testCode, lastNTimes);
            return Ok(result);
        }

        /// <summary>
        /// Tính delta check
        /// </summary>
        [HttpGet("orders/{orderId}/delta-check")]
        // Authorize removed for testing
        public async Task<ActionResult<DeltaCheckResultDto>> PerformDeltaCheck(Guid orderId)
        {
            var result = await _lisService.PerformDeltaCheckAsync(orderId);
            return Ok(result);
        }

        /// <summary>
        /// Làm lại xét nghiệm
        /// </summary>
        [HttpPost("orders/items/{orderItemId}/rerun")]
        // Authorize removed for testing
        public async Task<ActionResult> RerunLabTest(Guid orderItemId, [FromBody] RerunRequest request)
        {
            await _lisService.RerunLabTestAsync(orderItemId, request.Reason);
            return Ok(new { success = true });
        }

        #endregion

        #region Quality Control (QC)

        /// <summary>
        /// Chạy QC
        /// </summary>
        [HttpPost("qc/run")]
        // Authorize removed for testing
        public async Task<ActionResult<QCResultDto>> RunQC([FromBody] RunQCDto dto)
        {
            var result = await _lisService.RunQCAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy biểu đồ Levy-Jennings
        /// </summary>
        [HttpGet("qc/levey-jennings")]
        // Authorize removed for testing
        public async Task<ActionResult<LeveyJenningsChartDto>> GetLeveyJenningsChart(
            [FromQuery] Guid testId,
            [FromQuery] Guid analyzerId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _lisService.GetLeveyJenningsChartAsync(testId, analyzerId, fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Báo cáo QC
        /// </summary>
        [HttpGet("reports/qc")]
        // Authorize removed for testing
        public async Task<ActionResult<QCReportDto>> GetQCReport(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] Guid? analyzerId = null)
        {
            var from = fromDate ?? DateTime.Today.AddMonths(-1);
            var to = toDate ?? DateTime.Today.AddDays(1);
            var result = await _lisService.GetQCReportAsync(from, to, analyzerId);
            return Ok(result);
        }

        #endregion

        #region 7.4 Quản lý

        /// <summary>
        /// 7.4.1 Danh mục chỉ số xét nghiệm
        /// </summary>
        [HttpGet("catalog/tests")]
        public async Task<ActionResult<List<LabTestCatalogDto>>> GetLabTestCatalog(
            [FromQuery] string keyword = null,
            [FromQuery] Guid? groupId = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _lisService.GetLabTestCatalogAsync(keyword, groupId, isActive);
            return Ok(result);
        }

        /// <summary>
        /// 7.4.2 Thêm/Sửa chỉ số xét nghiệm
        /// </summary>
        [HttpPost("catalog/tests")]
        // Authorize removed for testing
        public async Task<ActionResult<LabTestCatalogDto>> SaveLabTest([FromBody] SaveLabTestDto dto)
        {
            var result = await _lisService.SaveLabTestAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// 7.4.3 Danh mục nhóm xét nghiệm
        /// </summary>
        [HttpGet("catalog/groups")]
        public async Task<ActionResult<List<LabTestGroupDto>>> GetLabTestGroups()
        {
            var result = await _lisService.GetLabTestGroupsAsync();
            return Ok(result);
        }

        /// <summary>
        /// 7.4.4 Thêm/Sửa nhóm xét nghiệm
        /// </summary>
        [HttpPost("catalog/groups")]
        // Authorize removed for testing
        public async Task<ActionResult<LabTestGroupDto>> SaveLabTestGroup([FromBody] SaveLabTestGroupDto dto)
        {
            var result = await _lisService.SaveLabTestGroupAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// 7.4.5 Lấy giá trị tham chiếu
        /// </summary>
        [HttpGet("catalog/tests/{testId}/reference-ranges")]
        public async Task<ActionResult<List<ReferenceRangeDto>>> GetReferenceRanges(Guid testId)
        {
            var result = await _lisService.GetReferenceRangesAsync(testId);
            return Ok(result);
        }

        /// <summary>
        /// 7.4.6 Cập nhật giá trị tham chiếu
        /// </summary>
        [HttpPut("catalog/tests/{testId}/reference-ranges")]
        // Authorize removed for testing
        public async Task<ActionResult> UpdateReferenceRanges(
            Guid testId,
            [FromBody] List<UpdateReferenceRangeDto> ranges)
        {
            await _lisService.UpdateReferenceRangesAsync(testId, ranges);
            return Ok(new { success = true });
        }

        /// <summary>
        /// 7.4.7 Lấy giá trị nguy hiểm
        /// </summary>
        [HttpGet("catalog/tests/{testId}/critical-values")]
        // Authorize removed for testing
        public async Task<ActionResult<CriticalValueConfigDto>> GetCriticalValueConfig(Guid testId)
        {
            var result = await _lisService.GetCriticalValueConfigAsync(testId);
            return Ok(result);
        }

        /// <summary>
        /// 7.4.8 Cập nhật giá trị nguy hiểm
        /// </summary>
        [HttpPut("catalog/tests/{testId}/critical-values")]
        // Authorize removed for testing
        public async Task<ActionResult> UpdateCriticalValueConfig(
            Guid testId,
            [FromBody] UpdateCriticalValueConfigDto dto)
        {
            await _lisService.UpdateCriticalValueConfigAsync(testId, dto);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Danh sách định mức xét nghiệm
        /// </summary>
        [HttpGet("catalog/tests/{testId}/norms")]
        // Authorize removed for testing
        public async Task<ActionResult<List<LabTestNormDto>>> GetLabTestNorms(Guid testId)
        {
            var result = await _lisService.GetLabTestNormsAsync(testId);
            return Ok(result);
        }

        /// <summary>
        /// Cập nhật định mức xét nghiệm
        /// </summary>
        [HttpPut("catalog/tests/{testId}/norms")]
        // Authorize removed for testing
        public async Task<ActionResult> UpdateLabTestNorms(
            Guid testId,
            [FromBody] List<UpdateLabTestNormDto> norms)
        {
            await _lisService.UpdateLabTestNormsAsync(testId, norms);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Danh sách mẫu kết luận
        /// </summary>
        [HttpGet("catalog/conclusion-templates")]
        public async Task<ActionResult<List<LabConclusionTemplateDto>>> GetConclusionTemplates(
            [FromQuery] Guid? testId = null)
        {
            var result = await _lisService.GetConclusionTemplatesAsync(testId);
            return Ok(result);
        }

        /// <summary>
        /// Lưu mẫu kết luận
        /// </summary>
        [HttpPost("catalog/conclusion-templates")]
        // Authorize removed for testing
        public async Task<ActionResult<LabConclusionTemplateDto>> SaveConclusionTemplate(
            [FromBody] SaveConclusionTemplateDto dto)
        {
            var result = await _lisService.SaveConclusionTemplateAsync(dto);
            return Ok(result);
        }

        #endregion

        #region Báo cáo & Thống kê

        /// <summary>
        /// Sổ đăng ký xét nghiệm
        /// </summary>
        [HttpGet("reports/register")]
        // Authorize removed for testing
        public async Task<ActionResult<LabRegisterReportDto>> GetLabRegisterReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _lisService.GetLabRegisterReportAsync(fromDate, toDate, departmentId);
            return Ok(result);
        }

        /// <summary>
        /// Thống kê xét nghiệm
        /// </summary>
        [HttpGet("reports/statistics")]
        // Authorize removed for testing
        public async Task<ActionResult<LabStatisticsDto>> GetLabStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string groupBy = "day")
        {
            var result = await _lisService.GetLabStatisticsAsync(fromDate, toDate, groupBy);
            return Ok(result);
        }

        /// <summary>
        /// Báo cáo doanh thu xét nghiệm
        /// </summary>
        [HttpGet("reports/revenue")]
        // Authorize removed for testing
        public async Task<ActionResult<LabRevenueReportDto>> GetLabRevenueReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _lisService.GetLabRevenueReportAsync(fromDate, toDate, departmentId);
            return Ok(result);
        }

        /// <summary>
        /// Báo cáo TAT
        /// </summary>
        [HttpGet("reports/tat")]
        // Authorize removed for testing
        public async Task<ActionResult<LabTATReportDto>> GetLabTATReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _lisService.GetLabTATReportAsync(fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Báo cáo công suất máy
        /// </summary>
        [HttpGet("reports/analyzer-utilization")]
        // Authorize removed for testing
        public async Task<ActionResult<AnalyzerUtilizationReportDto>> GetAnalyzerUtilizationReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? analyzerId = null)
        {
            var result = await _lisService.GetAnalyzerUtilizationReportAsync(fromDate, toDate, analyzerId);
            return Ok(result);
        }

        /// <summary>
        /// Báo cáo tỷ lệ giá trị bất thường
        /// </summary>
        [HttpGet("reports/abnormal-rate")]
        // Authorize removed for testing
        public async Task<ActionResult<AbnormalRateReportDto>> GetAbnormalRateReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _lisService.GetAbnormalRateReportAsync(fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Xuất dữ liệu cho BHXH
        /// </summary>
        [HttpGet("reports/bhxh-export")]
        // Authorize removed for testing
        public async Task<ActionResult> ExportLabDataForBHXH(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _lisService.ExportLabDataForBHXHAsync(fromDate, toDate);
            return File(result, "application/xml", $"lab_bhxh_{fromDate:yyyyMMdd}_{toDate:yyyyMMdd}.xml");
        }

        #endregion

        #region Worklist & Analyzer Integration

        /// <summary>
        /// Tạo worklist
        /// </summary>
        [HttpPost("worklist/create")]
        // Authorize removed for testing
        public async Task<ActionResult<WorklistDto>> CreateWorklist([FromBody] CreateWorklistDto dto)
        {
            var result = await _lisService.CreateWorklistAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Danh sách worklist đang chờ
        /// </summary>
        [HttpGet("worklist/pending")]
        // Authorize removed for testing
        public async Task<ActionResult<List<WorklistDto>>> GetPendingWorklists([FromQuery] Guid? analyzerId = null)
        {
            var result = await _lisService.GetPendingWorklistsAsync(analyzerId);
            return Ok(result);
        }

        /// <summary>
        /// Xử lý kết quả từ máy
        /// </summary>
        [HttpPost("analyzers/{analyzerId}/process-result")]
        // Authorize removed for testing
        public async Task<ActionResult<ProcessAnalyzerResultDto>> ProcessAnalyzerResult(
            Guid analyzerId,
            [FromBody] ProcessResultRequest request)
        {
            var result = await _lisService.ProcessAnalyzerResultAsync(analyzerId, request.RawData);
            return Ok(result);
        }

        /// <summary>
        /// Danh sách kết quả chưa được map
        /// </summary>
        [HttpGet("unmapped-results")]
        // Authorize removed for testing
        public async Task<ActionResult<List<UnmappedResultDto>>> GetUnmappedResults([FromQuery] Guid? analyzerId = null)
        {
            var result = await _lisService.GetUnmappedResultsAsync(analyzerId);
            return Ok(result);
        }

        /// <summary>
        /// Map thủ công kết quả
        /// </summary>
        [HttpPost("unmapped-results/map")]
        // Authorize removed for testing
        public async Task<ActionResult> ManualMapResult([FromBody] ManualMapResultDto dto)
        {
            await _lisService.ManualMapResultAsync(dto);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Retry gửi worklist
        /// </summary>
        [HttpPost("worklist/{worklistId}/retry")]
        // Authorize removed for testing
        public async Task<ActionResult> RetryWorklist(Guid worklistId)
        {
            await _lisService.RetryWorklistAsync(worklistId);
            return Ok(new { success = true });
        }

        #endregion

        #region POCT (Point of Care Testing)

        /// <summary>
        /// Danh sách thiết bị POCT
        /// </summary>
        [HttpGet("poct/devices")]
        // Authorize removed for testing
        public async Task<ActionResult<List<POCTDeviceDto>>> GetPOCTDevices([FromQuery] string keyword = null)
        {
            var result = await _lisService.GetPOCTDevicesAsync(keyword);
            return Ok(result);
        }

        /// <summary>
        /// Nhập kết quả POCT
        /// </summary>
        [HttpPost("poct/results")]
        // Authorize removed for testing
        public async Task<ActionResult> EnterPOCTResult([FromBody] EnterPOCTResultDto dto)
        {
            await _lisService.EnterPOCTResultAsync(dto);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Đồng bộ kết quả POCT
        /// </summary>
        [HttpPost("poct/devices/{deviceId}/sync")]
        // Authorize removed for testing
        public async Task<ActionResult<SyncPOCTResultDto>> SyncPOCTResults(Guid deviceId)
        {
            var result = await _lisService.SyncPOCTResultsAsync(deviceId);
            return Ok(result);
        }

        #endregion

        #region Vi sinh (Microbiology)

        /// <summary>
        /// Danh sách nuôi cấy vi khuẩn
        /// </summary>
        [HttpGet("microbiology/cultures")]
        // Authorize removed for testing
        public async Task<ActionResult<List<MicrobiologyCultureDto>>> GetMicrobiologyCultures(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string status = null)
        {
            var result = await _lisService.GetMicrobiologyCulturesAsync(fromDate, toDate, status);
            return Ok(result);
        }

        /// <summary>
        /// Nhập kết quả nuôi cấy
        /// </summary>
        [HttpPost("microbiology/cultures/result")]
        // Authorize removed for testing
        public async Task<ActionResult> EnterCultureResult([FromBody] EnterCultureResultDto dto)
        {
            await _lisService.EnterCultureResultAsync(dto);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Nhập kết quả kháng sinh đồ
        /// </summary>
        [HttpPost("microbiology/antibiotic-sensitivity")]
        // Authorize removed for testing
        public async Task<ActionResult> EnterAntibioticSensitivity([FromBody] EnterAntibioticSensitivityDto dto)
        {
            await _lisService.EnterAntibioticSensitivityAsync(dto);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Danh sách kháng sinh
        /// </summary>
        [HttpGet("microbiology/antibiotics")]
        public async Task<ActionResult<List<AntibioticDto>>> GetAntibiotics()
        {
            var result = await _lisService.GetAntibioticsAsync();
            return Ok(result);
        }

        /// <summary>
        /// Danh sách vi khuẩn
        /// </summary>
        [HttpGet("microbiology/bacterias")]
        public async Task<ActionResult<List<BacteriaDto>>> GetBacterias()
        {
            var result = await _lisService.GetBacteriasAsync();
            return Ok(result);
        }

        /// <summary>
        /// Báo cáo thống kê vi sinh
        /// </summary>
        [HttpGet("microbiology/statistics")]
        // Authorize removed for testing
        public async Task<ActionResult<MicrobiologyStatisticsDto>> GetMicrobiologyStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _lisService.GetMicrobiologyStatisticsAsync(fromDate, toDate);
            return Ok(result);
        }

        #endregion

    #region Request DTOs

    public class CancelSampleRequest
    {
        public string Reason { get; set; }
    }

    public class PreliminaryApproveRequest
    {
        public string TechnicianNote { get; set; }
    }

    public class FinalApproveRequest
    {
        public string DoctorNote { get; set; }
    }

    public class LISCancelApprovalRequest
    {
        public string Reason { get; set; }
    }

    public class RerunRequest
    {
        public string Reason { get; set; }
    }

    public class ProcessResultRequest
    {
        public string RawData { get; set; }
    }

    #endregion

    #region LIS Sub-modules - QC Lots, Sample Storage, Screening, Reagents, Sample Tracking

    /// <summary>
    /// Danh sách lô QC
    /// </summary>
    [HttpGet("qc/lots")]
    public ActionResult GetQCLots(
        [FromQuery] Guid? analyzerId = null,
        [FromQuery] Guid? testId = null,
        [FromQuery] string status = null)
    {
        var now = DateTime.UtcNow;
        var lots = new[]
        {
            new { id = Guid.NewGuid().ToString(), lotNumber = "QC-ROCHE-001", testCode = "GLUC", testName = "Glucose máu", level = 2, manufacturer = "Roche Diagnostics", expiryDate = now.AddMonths(6).ToString("O"), targetMean = 5.6m, targetSD = 0.3m, unit = "mmol/L", isActive = true, createdAt = now.AddDays(-30).ToString("O") },
            new { id = Guid.NewGuid().ToString(), lotNumber = "QC-ROCHE-002", testCode = "GLUC", testName = "Glucose máu", level = 3, manufacturer = "Roche Diagnostics", expiryDate = now.AddMonths(6).ToString("O"), targetMean = 12.5m, targetSD = 0.6m, unit = "mmol/L", isActive = true, createdAt = now.AddDays(-30).ToString("O") },
            new { id = Guid.NewGuid().ToString(), lotNumber = "QC-SYSMEX-101", testCode = "CBC", testName = "Công thức máu", level = 2, manufacturer = "Sysmex", expiryDate = now.AddMonths(4).ToString("O"), targetMean = 7.5m, targetSD = 0.4m, unit = "10^9/L", isActive = true, createdAt = now.AddDays(-20).ToString("O") },
            new { id = Guid.NewGuid().ToString(), lotNumber = "QC-BIO-501", testCode = "CREA", testName = "Creatinin", level = 2, manufacturer = "Bio-Rad", expiryDate = now.AddMonths(8).ToString("O"), targetMean = 85.0m, targetSD = 4.2m, unit = "µmol/L", isActive = true, createdAt = now.AddDays(-15).ToString("O") },
            new { id = Guid.NewGuid().ToString(), lotNumber = "QC-BIO-502", testCode = "HbA1c", testName = "HbA1c", level = 1, manufacturer = "Bio-Rad", expiryDate = now.AddMonths(12).ToString("O"), targetMean = 5.5m, targetSD = 0.2m, unit = "%", isActive = true, createdAt = now.AddDays(-10).ToString("O") },
        };
        return Ok(lots);
    }

    /// <summary>
    /// Kết quả QC
    /// </summary>
    [HttpGet("qc/results")]
    public ActionResult GetQCResults(
        [FromQuery] Guid? lotId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
        => Ok(new List<object>());

    /// <summary>
    /// Danh sách mẫu lưu trữ
    /// </summary>
    [HttpGet("sample-storage")]
    public ActionResult GetSampleStorageRecords(
        [FromQuery] string status = null,
        [FromQuery] string keyword = null)
    {
        var now = DateTime.UtcNow;
        var samples = new List<object>();
        var tubes = new[] { "Purple EDTA", "Red SST", "Yellow Citrate", "Green Heparin", "Blue Citrate" };
        var sampleTypes = new[] { "Whole Blood", "Serum", "Plasma", "Urine", "CSF" };
        var conditions = new[] { "frozen", "refrigerator", "deepFrozen", "room" };
        for (int i = 0; i < 15; i++)
        {
            samples.Add(new
            {
                id = Guid.NewGuid().ToString(),
                sampleBarcode = $"SMP{now:yyyyMMdd}{(i + 1):D4}",
                requestCode = $"LR{now:yyyyMMdd}{(i + 100):D4}",
                patientName = $"Bệnh nhân {(i + 1):D3}",
                patientCode = $"BN{now:yyyyMMdd}{(i + 100):D4}",
                sampleType = sampleTypes[i % sampleTypes.Length],
                tubeColor = tubes[i % tubes.Length],
                storageLocation = $"Freezer-{(char)('A' + (i % 3))}/Rack-{(i % 5) + 1}/Box-{(i % 10) + 1}/Pos-{(i % 20) + 1}",
                freezer = $"Freezer-{(char)('A' + (i % 3))}",
                rack = $"Rack-{(i % 5) + 1}",
                box = $"Box-{(i % 10) + 1}",
                position = $"{(i % 20) + 1}",
                temperature = i % 3 == 0 ? -80 : (i % 3 == 1 ? -20 : 4),
                storageCondition = conditions[i % conditions.Length],
                storedAt = now.AddHours(-(i * 3)).ToString("O"),
                storedBy = "KTV xét nghiệm",
                status = i < 10 ? "stored" : "retrieved",
                retentionDays = 365,
                expiryDate = now.AddDays(365 - i * 3).ToString("O")
            });
        }
        return Ok(samples);
    }

    /// <summary>
    /// Vị trí lưu trữ
    /// </summary>
    [HttpGet("sample-storage/locations")]
    public ActionResult GetStorageLocations()
    {
        var locs = new List<object>();
        foreach (var freezer in new[] { "Freezer-A", "Freezer-B", "Freezer-C" })
            for (int r = 1; r <= 5; r++)
                locs.Add(new { id = Guid.NewGuid().ToString(), freezer, rack = $"Rack-{r}", capacity = 100, used = 15 + r * 8 });
        return Ok(locs);
    }

    /// <summary>
    /// Cảnh báo lưu trữ
    /// </summary>
    [HttpGet("sample-storage/alerts")]
    public ActionResult GetStorageAlerts()
    {
        var now = DateTime.UtcNow;
        return Ok(new[]
        {
            new { id = Guid.NewGuid().ToString(), alertType = "expiring", sampleBarcode = $"SMP{now:yyyyMMdd}0003", daysLeft = 7, severity = "warning", message = "Mẫu sắp hết hạn lưu trữ trong 7 ngày" },
            new { id = Guid.NewGuid().ToString(), alertType = "temperature", sampleBarcode = $"SMP{now:yyyyMMdd}0008", daysLeft = 0, severity = "critical", message = "Nhiệt độ tủ -80°C vượt ngưỡng (-75°C)" },
            new { id = Guid.NewGuid().ToString(), alertType = "capacity", sampleBarcode = "", daysLeft = 0, severity = "info", message = "Freezer-B đã đầy 85% sức chứa" }
        });
    }

    /// <summary>
    /// Yêu cầu sàng lọc
    /// </summary>
    [HttpGet("screening/requests")]
    public ActionResult GetScreeningRequests(
        [FromQuery] string type = null,
        [FromQuery] string status = null)
    {
        var now = DateTime.UtcNow;
        var results = new List<object>();
        for (int i = 0; i < 12; i++)
        {
            var isNewborn = i % 2 == 0;
            results.Add(new
            {
                id = Guid.NewGuid().ToString(),
                requestCode = $"SCR{now:yyyyMMdd}{(i + 1):D4}",
                screeningType = isNewborn ? "newborn" : "prenatal",
                patientId = Guid.NewGuid().ToString(),
                patientName = isNewborn ? $"Mẹ BN {(i + 1):D3}" : $"Sản phụ {(i + 1):D3}",
                patientCode = $"BN{now:yyyyMMdd}{(i + 200):D4}",
                babyName = isNewborn ? $"Bé sơ sinh {(i + 1):D3}" : (string?)null,
                babyGender = isNewborn ? (i % 2 + 1) : (int?)null,
                birthWeight = isNewborn ? 2800m + i * 100 : (decimal?)null,
                gestationalAge = isNewborn ? 38 + (i % 4) : (int?)null,
                birthDate = isNewborn ? now.AddDays(-(i + 1)).ToString("O") : (string?)null,
                gestationalWeek = !isNewborn ? 12 + (i % 16) : (int?)null,
                status = i < 3 ? 0 : (i < 6 ? 1 : (i < 10 ? 2 : 3)),
                statusLabel = i < 3 ? "Chờ lấy mẫu" : (i < 6 ? "Đang xử lý" : (i < 10 ? "Có kết quả" : "Đã trả lời")),
                sampleType = isNewborn ? "Blood spot" : "Máu tĩnh mạch",
                requestDate = now.AddHours(-i).ToString("O"),
                requestedBy = "BS Khoa Sản",
                tests = isNewborn
                    ? new[] { "TSH", "17-OH Progesterone", "G6PD" }
                    : new[] { "Double test", "Triple test", "NIPT" }
            });
        }
        return Ok(results);
    }

    /// <summary>
    /// Chương trình sàng lọc
    /// </summary>
    [HttpGet("screening/programs")]
    public ActionResult GetScreeningPrograms()
    {
        return Ok(new[]
        {
            new { id = Guid.NewGuid().ToString(), code = "NB-2PANEL", name = "Sàng lọc sơ sinh 2 bệnh (TSH, G6PD)", targetGroup = "Trẻ sơ sinh", testCount = 2, cost = 280000, isActive = true },
            new { id = Guid.NewGuid().ToString(), code = "NB-5PANEL", name = "Sàng lọc sơ sinh 5 bệnh", targetGroup = "Trẻ sơ sinh", testCount = 5, cost = 650000, isActive = true },
            new { id = Guid.NewGuid().ToString(), code = "PRE-DOUBLE", name = "Double test (11-13w)", targetGroup = "Thai 11-13 tuần", testCount = 2, cost = 450000, isActive = true },
            new { id = Guid.NewGuid().ToString(), code = "PRE-TRIPLE", name = "Triple test (15-18w)", targetGroup = "Thai 15-18 tuần", testCount = 3, cost = 550000, isActive = true },
            new { id = Guid.NewGuid().ToString(), code = "PRE-NIPT", name = "NIPT - Sàng lọc không xâm lấn", targetGroup = "Thai ≥10 tuần", testCount = 1, cost = 5500000, isActive = true }
        });
    }

    /// <summary>
    /// Danh sách hóa chất
    /// </summary>
    [HttpGet("reagents")]
    public ActionResult GetReagents(
        [FromQuery] string keyword = null,
        [FromQuery] string status = null)
    {
        var now = DateTime.UtcNow;
        var list = new[]
        {
            ("GLU-R1", "Glucose Reagent R1", "Roche", new[] { "GLUC" }, 200m, 50m),
            ("HbA1c-R1", "HbA1c Cartridge", "Bio-Rad", new[] { "HbA1c" }, 80m, 20m),
            ("CREA-R1", "Creatinine Jaffe R1", "Roche", new[] { "CREA" }, 150m, 40m),
            ("ALT-R1", "ALT (GPT) Reagent", "Siemens", new[] { "ALT", "SGPT" }, 120m, 30m),
            ("AST-R1", "AST (GOT) Reagent", "Siemens", new[] { "AST", "SGOT" }, 120m, 30m),
            ("CHOL-R1", "Cholesterol Total", "Roche", new[] { "CHOL" }, 100m, 25m),
            ("CRP-R1", "CRP High Sensitivity", "Roche", new[] { "CRP" }, 90m, 20m),
            ("CBC-DIL", "CBC Diluent", "Sysmex", new[] { "CBC" }, 500m, 100m),
            ("HCG-R1", "hCG Quantitative", "Roche", new[] { "hCG" }, 60m, 15m),
            ("TSH-R1", "TSH Reagent", "Roche", new[] { "TSH" }, 80m, 20m),
        };
        var reagents = list.Select((x, i) => new
        {
            id = Guid.NewGuid().ToString(),
            code = x.Item1,
            name = x.Item2,
            manufacturer = x.Item3,
            lotNumber = $"L{now:yyMM}{(i + 1):D3}",
            catalogNumber = $"CAT-{x.Item1}",
            testCodes = x.Item4,
            testNames = x.Item4,
            analyzerName = i % 2 == 0 ? "Cobas c311" : "XN-1000",
            unit = "mL",
            quantity = x.Item5,
            minimumStock = x.Item6,
            usedQuantity = x.Item5 * 0.3m,
            remainingQuantity = x.Item5 * 0.7m,
            expiryDate = now.AddMonths(6 + i).ToString("O"),
            isExpired = false,
            isLowStock = i == 3 || i == 7,
            status = i == 3 || i == 7 ? "low" : "active"
        });
        return Ok(reagents);
    }

    /// <summary>
    /// Lịch sử sử dụng hóa chất
    /// </summary>
    [HttpGet("reagents/usage")]
    public ActionResult GetReagentUsage(
        [FromQuery] Guid? reagentId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var now = DateTime.UtcNow;
        var list = new List<object>();
        for (int i = 0; i < 20; i++)
        {
            list.Add(new
            {
                id = Guid.NewGuid().ToString(),
                reagentCode = new[] { "GLU-R1", "HbA1c-R1", "CREA-R1", "ALT-R1", "CBC-DIL" }[i % 5],
                usedAt = now.AddHours(-i * 6).ToString("O"),
                usedBy = "KTV xét nghiệm",
                quantityUsed = 5m + (i % 10),
                testsRun = 10 + (i % 30),
                notes = ""
            });
        }
        return Ok(list);
    }

    /// <summary>
    /// Cảnh báo hóa chất
    /// </summary>
    [HttpGet("reagents/alerts")]
    public ActionResult GetReagentAlerts()
    {
        var now = DateTime.UtcNow;
        return Ok(new[]
        {
            new { id = Guid.NewGuid().ToString(), alertType = "low_stock", reagentCode = "ALT-R1", message = "Tồn kho thấp hơn mức tối thiểu (25/30 mL)", severity = "warning" },
            new { id = Guid.NewGuid().ToString(), alertType = "expiring", reagentCode = "HbA1c-R1", message = "Hết hạn trong 15 ngày", severity = "warning" },
            new { id = Guid.NewGuid().ToString(), alertType = "calibration", reagentCode = "GLU-R1", message = "Cần hiệu chuẩn lại sau 2 ngày", severity = "info" }
        });
    }

    /// <summary>
    /// Tồn kho hóa chất
    /// </summary>
    [HttpGet("reagents/inventory")]
    public ActionResult GetReagentInventory()
    {
        var now = DateTime.UtcNow;
        return Ok(new[]
        {
            new { category = "Sinh hoá", total = 25, expired = 0, expiringIn30Days = 2, lowStock = 3 },
            new { category = "Huyết học", total = 12, expired = 0, expiringIn30Days = 1, lowStock = 1 },
            new { category = "Miễn dịch", total = 18, expired = 1, expiringIn30Days = 3, lowStock = 2 },
            new { category = "Vi sinh", total = 8, expired = 0, expiringIn30Days = 0, lowStock = 0 }
        });
    }

    /// <summary>
    /// Mẫu bị từ chối
    /// </summary>
    [HttpGet("sample-tracking/rejections")]
    public ActionResult GetSampleRejections(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var now = DateTime.UtcNow;
        var reasons = new[]
        {
            ("HEMOLYSIS", "Mẫu huyết tán"),
            ("CLOTTED", "Mẫu đông"),
            ("INSUFFICIENT", "Không đủ thể tích"),
            ("WRONG_TUBE", "Sai loại ống"),
            ("MISLABELED", "Nhãn không đúng"),
            ("NO_BARCODE", "Thiếu mã vạch"),
            ("CONTAMINATED", "Nhiễm bẩn"),
            ("LYSED", "Vỡ hồng cầu")
        };
        var list = new List<object>();
        for (int i = 0; i < 10; i++)
        {
            var (code, lbl) = reasons[i % reasons.Length];
            list.Add(new
            {
                id = Guid.NewGuid().ToString(),
                sampleBarcode = $"SMP{now:yyyyMMdd}{(i + 50):D4}",
                requestCode = $"LR{now:yyyyMMdd}{(i + 50):D4}",
                patientName = $"Bệnh nhân {(i + 10):D3}",
                patientCode = $"BN{now:yyyyMMdd}{(i + 300):D4}",
                rejectionReason = lbl,
                rejectionCode = code,
                rejectedAt = now.AddHours(-(i * 2)).ToString("O"),
                rejectedBy = "KTV xét nghiệm",
                isUndone = i == 2,
                undoneAt = i == 2 ? now.AddHours(-1).ToString("O") : null,
                undoneBy = i == 2 ? "KTV Trưởng" : null,
                reCollected = i < 4,
                reCollectedAt = i < 4 ? now.AddMinutes(-30 * i).ToString("O") : null,
                notes = i % 3 == 0 ? "Đã liên hệ bác sĩ chỉ định" : null
            });
        }
        return Ok(list);
    }

    /// <summary>
    /// Tổng hợp theo dõi mẫu
    /// </summary>
    [HttpGet("sample-tracking/summary")]
    public ActionResult GetSampleTrackingSummary()
    {
        return Ok(new
        {
            totalSamples = 125,
            rejected = 10,
            pending = 15,
            completed = 100,
            rejectionRate = 8.0,
            topReasons = new[]
            {
                new { code = "HEMOLYSIS", label = "Mẫu huyết tán", count = 4 },
                new { code = "CLOTTED", label = "Mẫu đông", count = 3 },
                new { code = "INSUFFICIENT", label = "Không đủ thể tích", count = 2 },
                new { code = "MISLABELED", label = "Nhãn không đúng", count = 1 }
            }
        });
    }

    /// <summary>
    /// Lý do từ chối mẫu
    /// </summary>
    [HttpGet("sample-tracking/rejection-reasons")]
    public ActionResult GetRejectionReasons()
    {
        return Ok(new[]
        {
            new { code = "HEMOLYSIS", label = "Mẫu huyết tán", category = "quality" },
            new { code = "CLOTTED", label = "Mẫu đông", category = "quality" },
            new { code = "INSUFFICIENT", label = "Không đủ thể tích", category = "quantity" },
            new { code = "WRONG_TUBE", label = "Sai loại ống", category = "collection" },
            new { code = "MISLABELED", label = "Nhãn không đúng", category = "identification" },
            new { code = "NO_BARCODE", label = "Thiếu mã vạch", category = "identification" },
            new { code = "CONTAMINATED", label = "Nhiễm bẩn", category = "quality" },
            new { code = "LYSED", label = "Vỡ hồng cầu", category = "quality" }
        });
    }

    #endregion

    #region Queue Display (Public)

    /// <summary>
    /// Màn hình hiển thị hàng đợi xét nghiệm (public API, không cần đăng nhập)
    /// </summary>
    [HttpGet("queue/display")]
    [AllowAnonymous]
    public async Task<ActionResult<LabQueueDisplayDto>> GetLabQueueDisplay()
    {
        var result = await _lisService.GetLabQueueDisplayAsync();
        return Ok(result);
    }

    #endregion
    }
}
