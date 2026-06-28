using System;
using HIS.Core.Constants;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Filters;
using HIS.Application.Services;
using HIS.Application.DTOs.Radiology;
using HIS.Infrastructure.Services;
using Microsoft.Extensions.Logging;
using HIS.API.Dtos.RISComplete;

namespace HIS.API.Controllers
{
    public partial class RISCompleteController
    {
        /// <summary>
        /// Lấy URL mở DICOM Viewer
        /// </summary>
        [HttpGet("viewer/url")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician + "," + RoleNames.Doctor)]
        public async Task<ActionResult<ViewerUrlDto>> GetViewerUrl([FromQuery] string studyInstanceUID)
        {
            var result = await _risService.GetViewerUrlAsync(studyInstanceUID);
            return Ok(result);
        }

        /// <summary>
        /// Lấy cấu hình DICOM Viewer
        /// </summary>
        [HttpGet("viewer/config")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<DicomViewerConfigDto>> GetViewerConfig()
        {
            var result = await _risService.GetViewerConfigAsync();
            return Ok(result);
        }

        /// <summary>
        /// Lưu annotation
        /// </summary>
        [HttpPost("annotations")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist)]
        public async Task<ActionResult<ImageAnnotationDto>> SaveAnnotation([FromBody] ImageAnnotationDto annotation)
        {
            var result = await _risService.SaveAnnotationAsync(annotation);
            return Ok(result);
        }

        /// <summary>
        /// Lấy annotations của ảnh
        /// </summary>
        [HttpGet("annotations")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician + "," + RoleNames.Doctor)]
        public async Task<ActionResult<List<ImageAnnotationDto>>> GetAnnotations([FromQuery] string sopInstanceUID)
        {
            var result = await _risService.GetAnnotationsAsync(sopInstanceUID);
            return Ok(result);
        }

        /// <summary>
        /// Đánh dấu key image
        /// </summary>
        [HttpPost("key-images")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist)]
        public async Task<ActionResult<KeyImageDto>> MarkKeyImage([FromBody] MarkKeyImageDto dto)
        {
            var result = await _risService.MarkKeyImageAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách key images
        /// </summary>
        [HttpGet("key-images")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician + "," + RoleNames.Doctor)]
        public async Task<ActionResult<List<KeyImageDto>>> GetKeyImages([FromQuery] string studyInstanceUID)
        {
            var result = await _risService.GetKeyImagesAsync(studyInstanceUID);
            return Ok(result);
        }

        /// <summary>
        /// Chỉnh sửa ảnh
        /// </summary>
        [HttpPost("images/edit")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist)]
        public async Task<ActionResult> EditImage([FromBody] ImageEditDto dto)
        {
            var result = await _risService.EditImageAsync(dto);
            return File(result, "image/jpeg");
        }

        /// <summary>
        /// Danh sách phòng CĐHA
        /// </summary>
        [HttpGet("rooms")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<List<RadiologyRoomDto>>> GetRooms(
            [FromQuery] string keyword = null,
            [FromQuery] string roomType = null)
        {
            var result = await _risService.GetRoomsAsync(keyword, roomType);
            return Ok(result);
        }

        /// <summary>
        /// Thêm/Sửa phòng
        /// </summary>
        [HttpPost("rooms")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong)]
        public async Task<ActionResult<RadiologyRoomDto>> SaveRoom([FromBody] SaveRadiologyRoomDto dto)
        {
            var result = await _risService.SaveRoomAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lịch làm việc phòng
        /// </summary>
        [HttpGet("rooms/{roomId}/schedule")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<List<RadiologyScheduleDto>>> GetRoomSchedule(
            Guid roomId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _risService.GetRoomScheduleAsync(roomId, fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Cập nhật lịch làm việc
        /// </summary>
        [HttpPost("rooms/schedule")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<RadiologyScheduleDto>> SaveSchedule([FromBody] SaveRadiologyScheduleDto dto)
        {
            var result = await _risService.SaveScheduleAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// In nhãn dán cho ca chụp
        /// </summary>
        [HttpPost("print-label")]
        public async Task<ActionResult<LabelDataDto>> PrintLabel([FromBody] PrintLabelRequestDto request)
        {
            var result = await _risService.PrintLabelAsync(request);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách cấu hình nhãn
        /// </summary>
        [HttpGet("label-configs")]
        public async Task<ActionResult<List<RadiologyLabelConfigDto>>> GetLabelConfigs([FromQuery] Guid? serviceTypeId = null)
        {
            var result = await _risService.GetLabelConfigsAsync(serviceTypeId);
            return Ok(result);
        }

        /// <summary>
        /// Lưu cấu hình nhãn
        /// </summary>
        [HttpPost("label-configs")]
        public async Task<ActionResult<RadiologyLabelConfigDto>> SaveLabelConfig([FromBody] RadiologyLabelConfigDto config)
        {
            var result = await _risService.SaveLabelConfigAsync(config);
            return Ok(result);
        }

        /// <summary>
        /// Xóa cấu hình nhãn
        /// </summary>
        [HttpDelete("label-configs/{configId}")]
        public async Task<ActionResult> DeleteLabelConfig(Guid configId)
        {
            await _risService.DeleteLabelConfigAsync(configId);
            return NoContent();
        }

        /// <summary>
        /// Lấy danh sách mẫu chẩn đoán
        /// </summary>
        [HttpGet("diagnosis-templates")]
        public async Task<ActionResult<List<DiagnosisTemplateDto>>> GetDiagnosisTemplates(
            [FromQuery] Guid? serviceTypeId = null,
            [FromQuery] Guid? serviceId = null,
            [FromQuery] string keyword = null)
        {
            var result = await _risService.GetDiagnosisTemplatesAsync(serviceTypeId, serviceId, keyword);
            return Ok(result);
        }

        /// <summary>
        /// Lưu mẫu chẩn đoán
        /// </summary>
        [HttpPost("diagnosis-templates")]
        public async Task<ActionResult<DiagnosisTemplateDto>> SaveDiagnosisTemplate([FromBody] SaveDiagnosisTemplateDto dto)
        {
            var result = await _risService.SaveDiagnosisTemplateAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa mẫu chẩn đoán
        /// </summary>
        [HttpDelete("diagnosis-templates/{templateId}")]
        public async Task<ActionResult> DeleteDiagnosisTemplate(Guid templateId)
        {
            await _risService.DeleteDiagnosisTemplateAsync(templateId);
            return NoContent();
        }

        /// <summary>
        /// Lấy danh sách từ viết tắt
        /// </summary>
        [HttpGet("abbreviations")]
        public async Task<ActionResult<List<AbbreviationDto>>> GetAbbreviations(
            [FromQuery] string category = null,
            [FromQuery] Guid? serviceTypeId = null,
            [FromQuery] string keyword = null)
        {
            var result = await _risService.GetAbbreviationsAsync(category, serviceTypeId, keyword);
            return Ok(result);
        }

        /// <summary>
        /// Lưu từ viết tắt
        /// </summary>
        [HttpPost("abbreviations")]
        public async Task<ActionResult<AbbreviationDto>> SaveAbbreviation([FromBody] SaveAbbreviationDto dto)
        {
            var result = await _risService.SaveAbbreviationAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa từ viết tắt
        /// </summary>
        [HttpDelete("abbreviations/{abbreviationId}")]
        public async Task<ActionResult> DeleteAbbreviation(Guid abbreviationId)
        {
            await _risService.DeleteAbbreviationAsync(abbreviationId);
            return NoContent();
        }

        /// <summary>
        /// Mở rộng từ viết tắt trong văn bản
        /// </summary>
        [HttpPost("abbreviations/expand")]
        public async Task<ActionResult<ExpandAbbreviationResultDto>> ExpandAbbreviations(
            [FromBody] ExpandAbbreviationRequest request)
        {
            var result = await _risService.ExpandAbbreviationsAsync(request.Text, request.Category, request.ServiceTypeId);
            return Ok(result);
        }

        /// <summary>
        /// Sinh mã QR cho ca chụp
        /// </summary>
        [HttpPost("qrcode/generate")]
        public async Task<ActionResult<QRCodeResultDto>> GenerateQRCode([FromBody] GenerateQRCodeRequestDto request)
        {
            var result = await _risService.GenerateQRCodeAsync(request);
            if (result == null) return NotFound(new { message = "Order not found" });
            return Ok(result);
        }

        /// <summary>
        /// Quét mã QR
        /// </summary>
        [HttpPost("qrcode/scan")]
        public async Task<ActionResult<ScanQRCodeResultDto>> ScanQRCode([FromBody] ScanQRCodeRequest request)
        {
            var result = await _risService.ScanQRCodeAsync(request.QRData);
            return Ok(result);
        }

        /// <summary>
        /// Chia sẻ kết quả qua QR Code
        /// </summary>
        [HttpPost("results/{resultId}/share-qr")]
        public async Task<ActionResult<ShareResultQRDto>> CreateShareResultQR(Guid resultId, [FromQuery] int? validityHours = 24)
        {
            var result = await _risService.CreateShareResultQRAsync(resultId, validityHours);
            return Ok(result);
        }

        /// <summary>
        /// Lấy kết quả từ share link
        /// </summary>
        [HttpGet("shared-result/{shareCode}")]
        [AllowAnonymous]
        public async Task<ActionResult<RadiologyResultDto>> GetSharedResult(string shareCode, [FromQuery] string accessCode)
        {
            var result = await _risService.GetSharedResultAsync(shareCode, accessCode);
            return Ok(result);
        }

        /// <summary>
        /// Lấy lịch trực
        /// </summary>
        [HttpGet("duty-schedules")]
        public async Task<ActionResult<List<DutyScheduleDto>>> GetDutySchedules(
            [FromQuery] Guid departmentId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? roomId = null)
        {
            var result = await _risService.GetDutySchedulesAsync(departmentId, fromDate, toDate, roomId);
            return Ok(result);
        }

        /// <summary>
        /// Lưu lịch trực
        /// </summary>
        [HttpPost("duty-schedules")]
        public async Task<ActionResult<DutyScheduleDto>> SaveDutySchedule([FromBody] SaveDutyScheduleDto dto)
        {
            var result = await _risService.SaveDutyScheduleAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Tạo lịch trực hàng loạt
        /// </summary>
        [HttpPost("duty-schedules/batch")]
        public async Task<ActionResult<List<DutyScheduleDto>>> BatchCreateDutySchedules([FromBody] BatchCreateDutyScheduleDto dto)
        {
            var result = await _risService.BatchCreateDutySchedulesAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa lịch trực
        /// </summary>
        [HttpDelete("duty-schedules/{scheduleId}")]
        public async Task<ActionResult> DeleteDutySchedule(Guid scheduleId)
        {
            await _risService.DeleteDutyScheduleAsync(scheduleId);
            return NoContent();
        }

        /// <summary>
        /// Duyệt lịch trực
        /// </summary>
        [HttpPost("duty-schedules/{scheduleId}/approve")]
        public async Task<ActionResult> ApproveDutySchedule(Guid scheduleId)
        {
            await _risService.ApproveDutyScheduleAsync(scheduleId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Phân phòng thực hiện
        /// </summary>
        [HttpPost("room-assignments")]
        public async Task<ActionResult<RoomAssignmentDto>> AssignRoom([FromBody] AssignRoomRequestDto request)
        {
            var result = await _risService.AssignRoomAsync(request);
            return Ok(result);
        }

        /// <summary>
        /// Cập nhật phân phòng
        /// </summary>
        [HttpPut("room-assignments/{assignmentId}")]
        public async Task<ActionResult<RoomAssignmentDto>> UpdateRoomAssignment(Guid assignmentId, [FromBody] AssignRoomRequestDto request)
        {
            var result = await _risService.UpdateRoomAssignmentAsync(assignmentId, request);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách chờ theo phòng
        /// </summary>
        [HttpGet("rooms/{roomId}/queue")]
        public async Task<ActionResult<List<RoomAssignmentDto>>> GetRoomQueue(Guid roomId, [FromQuery] DateTime date)
        {
            var result = await _risService.GetRoomQueueAsync(roomId, date);
            return Ok(result);
        }

        /// <summary>
        /// Gọi bệnh nhân tiếp theo
        /// </summary>
        [HttpPost("rooms/{roomId}/call-next")]
        public async Task<ActionResult<RoomAssignmentDto>> CallNextPatient(Guid roomId)
        {
            var result = await _risService.CallNextPatientAsync(roomId);
            return Ok(result);
        }

        /// <summary>
        /// Bỏ qua bệnh nhân
        /// </summary>
        [HttpPost("room-assignments/{assignmentId}/skip")]
        public async Task<ActionResult> SkipPatient(Guid assignmentId, [FromBody] SkipPatientRequest request)
        {
            await _risService.SkipPatientAsync(assignmentId, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Thống kê theo phòng
        /// </summary>
        [HttpGet("rooms/statistics")]
        public async Task<ActionResult<List<RoomStatisticsDto>>> GetRoomStatistics([FromQuery] DateTime date)
        {
            var result = await _risService.GetRoomStatisticsAsync(date);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách Tag
        /// </summary>
        [HttpGet("tags")]
        public async Task<ActionResult<List<RadiologyTagDto>>> GetTags(
            [FromQuery] string keyword = null,
            [FromQuery] bool includeInactive = false)
        {
            var result = await _risService.GetTagsAsync(keyword, includeInactive);
            return Ok(result);
        }

        /// <summary>
        /// Lưu Tag
        /// </summary>
        [HttpPost("tags")]
        public async Task<ActionResult<RadiologyTagDto>> SaveTag([FromBody] SaveRadiologyTagDto dto)
        {
            var result = await _risService.SaveTagAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa Tag
        /// </summary>
        [HttpDelete("tags/{tagId}")]
        public async Task<ActionResult> DeleteTag(Guid tagId)
        {
            await _risService.DeleteTagAsync(tagId);
            return NoContent();
        }

        /// <summary>
        /// Gắn Tag cho ca chụp
        /// </summary>
        [HttpPost("requests/tags")]
        public async Task<ActionResult> AssignTagsToRequest([FromBody] AssignTagRequestDto request)
        {
            await _risService.AssignTagsToRequestAsync(request);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Gỡ Tag khỏi ca chụp
        /// </summary>
        [HttpDelete("requests/{requestId}/tags/{tagId}")]
        public async Task<ActionResult> RemoveTagFromRequest(Guid requestId, Guid tagId)
        {
            await _risService.RemoveTagFromRequestAsync(requestId, tagId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Lấy các ca chụp theo Tag
        /// </summary>
        [HttpGet("tags/{tagId}/requests")]
        public async Task<ActionResult<List<TaggedRequestDto>>> GetRequestsByTag(
            Guid tagId,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var result = await _risService.GetRequestsByTagAsync(tagId, fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Lấy các Tag của ca chụp
        /// </summary>
        [HttpGet("requests/{requestId}/tags")]
        public async Task<ActionResult<List<RadiologyTagDto>>> GetTagsOfRequest(Guid requestId)
        {
            var result = await _risService.GetTagsOfRequestAsync(requestId);
            return Ok(result);
        }

        /// <summary>
        /// Tìm kiếm log tích hợp
        /// </summary>
        [HttpPost("integration-logs/search")]
        public async Task<ActionResult<IntegrationLogSearchResultDto>> SearchIntegrationLogs([FromBody] SearchIntegrationLogDto searchDto)
        {
            var result = await _risService.SearchIntegrationLogsAsync(searchDto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy chi tiết log
        /// </summary>
        [HttpGet("integration-logs/{logId}")]
        public async Task<ActionResult<IntegrationLogDto>> GetIntegrationLog(Guid logId)
        {
            var result = await _risService.GetIntegrationLogAsync(logId);
            return Ok(result);
        }

        /// <summary>
        /// Thống kê log tích hợp
        /// </summary>
        [HttpGet("integration-logs/statistics")]
        public async Task<ActionResult<IntegrationLogStatisticsDto>> GetIntegrationLogStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _risService.GetIntegrationLogStatisticsAsync(fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Retry gửi lại message lỗi
        /// </summary>
        [HttpPost("integration-logs/{logId}/retry")]
        public async Task<ActionResult> RetryIntegration(Guid logId)
        {
            await _risService.RetryIntegrationAsync(logId);
            return Ok(new { success = true });
        }
    }
}
