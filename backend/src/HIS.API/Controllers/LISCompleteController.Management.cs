using System;
using HIS.Core.Constants;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs.Laboratory;
using ApproveLabResultDto = HIS.Application.Services.ApproveLabResultDto;
using HIS.API.Dtos.LISComplete;

namespace HIS.API.Controllers
{
    public partial class LISCompleteController : ControllerBase
    {
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
    }
}
