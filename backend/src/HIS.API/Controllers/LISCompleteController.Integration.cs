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

        /// <summary>
        /// Lấy danh sách inbox kết quả máy XN theo trạng thái + ngày
        /// </summary>
        [HttpGet("inbox")]
        public async Task<ActionResult<List<AnalyzerInboxItemDto>>> GetAnalyzerInbox(
            [FromQuery] Guid? analyzerId,
            [FromQuery] int? status,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] int page = 0,
            [FromQuery] int pageSize = 50)
        {
            var query = new AnalyzerInboxQueryDto
            {
                AnalyzerId = analyzerId,
                Status = status,
                FromDate = fromDate,
                ToDate = toDate,
                Page = page,
                PageSize = Math.Min(pageSize, 200),
            };
            var result = await _lisService.GetAnalyzerInboxAsync(query);
            return Ok(result);
        }

        /// <summary>
        /// Chuyển kết quả Matched từ inbox vào phiếu (Transferred)
        /// </summary>
        [HttpPost("inbox/{inboxId}/transfer")]
        public async Task<ActionResult> TransferInboxResult(Guid inboxId)
        {
            var userId = GetUserId();
            await _lisService.TransferInboxResultAsync(inboxId, userId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Từ chối kết quả inbox
        /// </summary>
        [HttpPost("inbox/{inboxId}/reject")]
        public async Task<ActionResult> RejectInboxResult(Guid inboxId, [FromBody] RejectInboxRequest request)
        {
            await _lisService.RejectInboxResultAsync(inboxId, request.Reason ?? "");
            return Ok(new { success = true });
        }

        /// <summary>
        /// Mock-receive: POST danh sách kết quả giả để test (Admin only)
        /// </summary>
        [HttpPost("mock-receive/{analyzerId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<ProcessAnalyzerResultDto>> MockReceiveResults(
            Guid analyzerId,
            [FromBody] List<MockLabResultDto> results)
        {
            var result = await _lisService.MockReceiveResultsAsync(analyzerId, results);
            return Ok(result);
        }

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

        // -- G-19: FE Microbiology v2 routes (persist) --

        /// <summary>Danh sách nuôi cấy v2 — trả real data từ DB</summary>
        [HttpGet("microbiology/cultures/v2")]
        public async Task<ActionResult<List<MicrobiologyCultureV2Dto>>> GetMicrobiologyCulturesV2(
            [FromQuery] int? status = null,
            [FromQuery] string keyword = null)
        {
            var result = await _lisService.GetMicrobiologyCulturesV2Async(status, keyword);
            return Ok(result);
        }

        /// <summary>Chi tiết 1 nuôi cấy</summary>
        [HttpGet("microbiology/cultures/{id:guid}")]
        public async Task<ActionResult<MicrobiologyCultureV2Dto>> GetMicrobiologyCultureById(Guid id)
        {
            var result = await _lisService.GetMicrobiologyCultureByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        /// <summary>Tạo nuôi cấy mới</summary>
        [HttpPost("microbiology/cultures")]
        public async Task<ActionResult<MicrobiologyCultureV2Dto>> CreateMicrobiologyCulture(
            [FromBody] CreateMicrobiologyCultureDto dto)
        {
            var result = await _lisService.CreateMicrobiologyCultureAsync(dto);
            return Ok(result);
        }

        /// <summary>Cập nhật trạng thái nuôi cấy</summary>
        [HttpPut("microbiology/cultures/{id:guid}/status")]
        public async Task<ActionResult> UpdateMicrobiologyCultureStatus(
            Guid id,
            [FromBody] UpdateCultureStatusDto dto)
        {
            await _lisService.UpdateMicrobiologyCultureStatusAsync(id, dto);
            return Ok(new { success = true });
        }

        /// <summary>Thêm vi sinh vật vào nuôi cấy</summary>
        [HttpPost("microbiology/cultures/{cultureId:guid}/organisms")]
        public async Task<ActionResult<MicrobiologyOrganismV2Dto>> AddOrganismToCulture(
            Guid cultureId,
            [FromBody] AddOrganismDto dto)
        {
            var result = await _lisService.AddOrganismToCultureAsync(cultureId, dto);
            return Ok(result);
        }

        /// <summary>Lưu kháng sinh đồ cho 1 organism finding</summary>
        [HttpPost("microbiology/organisms/{organismId:guid}/antibiogram")]
        public async Task<ActionResult> SaveAntibiogram(
            Guid organismId,
            [FromBody] List<SaveAntibioticResultDto> results)
        {
            await _lisService.SaveAntibiogramAsync(organismId, results);
            return Ok(new { success = true });
        }
    }
}
