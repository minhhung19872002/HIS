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
        /// Lấy danh sách thiết bị Capture
        /// </summary>
        [HttpGet("capture-devices")]
        public async Task<ActionResult<List<CaptureDeviceDto>>> GetCaptureDevices(
            [FromQuery] string deviceType = null,
            [FromQuery] string keyword = null, [FromQuery] bool? isActive = null)
        {
            var result = await _risService.GetCaptureDevicesAsync(deviceType, keyword, isActive);
            return Ok(result);
        }

        /// <summary>
        /// Lưu thiết bị Capture
        /// </summary>
        [HttpPost("capture-devices")]
        public async Task<ActionResult<CaptureDeviceDto>> SaveCaptureDevice([FromBody] SaveCaptureDeviceDto dto)
        {
            var result = await _risService.SaveCaptureDeviceAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa thiết bị Capture
        /// </summary>
        [HttpDelete("capture-devices/{deviceId}")]
        public async Task<ActionResult> DeleteCaptureDevice(Guid deviceId)
        {
            await _risService.DeleteCaptureDeviceAsync(deviceId);
            return NoContent();
        }

        /// <summary>
        /// Kiểm tra kết nối thiết bị
        /// </summary>
        [HttpGet("capture-devices/{deviceId}/check-connection")]
        public async Task<ActionResult<bool>> CheckDeviceConnection(Guid deviceId)
        {
            var result = await _risService.CheckDeviceConnectionAsync(deviceId);
            return Ok(new { connected = result });
        }

        /// <summary>
        /// Lấy danh sách Workstation
        /// </summary>
        [HttpGet("workstations")]
        public async Task<ActionResult<List<WorkstationDto>>> GetWorkstations([FromQuery] Guid? roomId = null)
        {
            var result = await _risService.GetWorkstationsAsync(roomId);
            return Ok(result);
        }

        /// <summary>
        /// Lưu Workstation
        /// </summary>
        [HttpPost("workstations")]
        public async Task<ActionResult<WorkstationDto>> SaveWorkstation([FromBody] SaveWorkstationDto dto)
        {
            var result = await _risService.SaveWorkstationAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa Workstation
        /// </summary>
        [HttpDelete("workstations/{workstationId}")]
        public async Task<ActionResult> DeleteWorkstation(Guid workstationId)
        {
            await _risService.DeleteWorkstationAsync(workstationId);
            return NoContent();
        }

        /// <summary>
        /// Tạo phiên Capture
        /// </summary>
        [HttpPost("capture-sessions")]
        public async Task<ActionResult<CaptureSessionDto>> CreateCaptureSession([FromBody] CreateCaptureSessionDto dto)
        {
            var result = await _risService.CreateCaptureSessionAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy phiên Capture đang hoạt động
        /// </summary>
        [HttpGet("capture-devices/{deviceId}/active-session")]
        public async Task<ActionResult<CaptureSessionDto>> GetActiveCaptureSession(Guid deviceId)
        {
            var result = await _risService.GetActiveCaptureSessionAsync(deviceId);
            return Ok(result);
        }

        /// <summary>
        /// Kết thúc phiên Capture
        /// </summary>
        [HttpPost("capture-sessions/{sessionId}/end")]
        public async Task<ActionResult<CaptureSessionDto>> EndCaptureSession(Guid sessionId)
        {
            var result = await _risService.EndCaptureSessionAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Upload hình ảnh/video capture
        /// </summary>
        [HttpPost("capture-sessions/media")]
        public async Task<ActionResult<CapturedMediaDto>> UploadCapturedMedia([FromBody] SaveCapturedMediaDto dto)
        {
            var result = await _risService.UploadCapturedMediaAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách media trong phiên
        /// </summary>
        [HttpGet("capture-sessions/{sessionId}/media")]
        public async Task<ActionResult<List<CapturedMediaDto>>> GetCapturedMedia(Guid sessionId)
        {
            var result = await _risService.GetCapturedMediaAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Đánh dấu ảnh tiêu biểu
        /// </summary>
        [HttpPost("captured-media/{sessionId}/{mediaId}/thumbnail")]
        public async Task<ActionResult> SetThumbnailImage(Guid sessionId, Guid mediaId)
        {
            await _risService.SetThumbnailImageAsync(sessionId, mediaId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Gửi ảnh đến PACS
        /// </summary>
        [HttpPost("capture-sessions/send-to-pacs")]
        public async Task<ActionResult<SendToPacsResultDto>> SendMediaToPacs([FromBody] SendToPacsRequestDto request)
        {
            var result = await _risService.SendMediaToPacsAsync(request);
            return Ok(result);
        }

        /// <summary>
        /// Thống kê thiết bị hàng ngày
        /// </summary>
        [HttpGet("capture-devices/{deviceId}/daily-statistics")]
        public async Task<ActionResult<DeviceDailyStatisticsDto>> GetDeviceDailyStatistics(Guid deviceId, [FromQuery] DateTime date)
        {
            var result = await _risService.GetDeviceDailyStatisticsAsync(deviceId, date);
            return Ok(result);
        }

        /// <summary>
        /// Tìm kiếm phiên hội chẩn
        /// </summary>
        [HttpPost("consultations/search")]
        public async Task<ActionResult<ConsultationSearchResultDto>> SearchConsultations([FromBody] SearchConsultationDto searchDto)
        {
            var result = await _risService.SearchConsultationsAsync(searchDto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy chi tiết phiên hội chẩn
        /// </summary>
        [HttpGet("consultations/{sessionId}")]
        public async Task<ActionResult<ConsultationSessionDto>> GetConsultationSession(Guid sessionId)
        {
            var result = await _risService.GetConsultationSessionAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Tạo/Cập nhật phiên hội chẩn
        /// </summary>
        [HttpPost("consultations")]
        public async Task<ActionResult<ConsultationSessionDto>> SaveConsultationSession([FromBody] SaveConsultationSessionDto dto)
        {
            var result = await _risService.SaveConsultationSessionAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Hủy phiên hội chẩn
        /// </summary>
        [HttpPost("consultations/{sessionId}/cancel")]
        public async Task<ActionResult> CancelConsultationSession(Guid sessionId, [FromBody] CancelConsultationRequest request)
        {
            await _risService.CancelConsultationSessionAsync(sessionId, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Bắt đầu phiên hội chẩn
        /// </summary>
        [HttpPost("consultations/{sessionId}/start")]
        public async Task<ActionResult<ConsultationSessionDto>> StartConsultationSession(Guid sessionId)
        {
            var result = await _risService.StartConsultationSessionAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Kết thúc phiên hội chẩn
        /// </summary>
        [HttpPost("consultations/{sessionId}/end")]
        public async Task<ActionResult<ConsultationSessionDto>> EndConsultationSession(Guid sessionId)
        {
            var result = await _risService.EndConsultationSessionAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Thêm ca vào phiên hội chẩn
        /// </summary>
        [HttpPost("consultations/cases")]
        public async Task<ActionResult<ConsultationCaseDto>> AddConsultationCase([FromBody] AddConsultationCaseDto dto)
        {
            var result = await _risService.AddConsultationCaseAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa ca khỏi phiên hội chẩn
        /// </summary>
        [HttpDelete("consultations/cases/{caseId}")]
        public async Task<ActionResult> RemoveConsultationCase(Guid caseId)
        {
            await _risService.RemoveConsultationCaseAsync(caseId);
            return NoContent();
        }

        /// <summary>
        /// Kết luận ca hội chẩn
        /// </summary>
        [HttpPost("consultations/cases/conclude")]
        public async Task<ActionResult<ConsultationCaseDto>> ConcludeCase([FromBody] ConcludeCaseDto dto)
        {
            var result = await _risService.ConcludeCaseAsync(dto.CaseId, dto.Conclusion, dto.Recommendation);
            return Ok(result);
        }

        /// <summary>
        /// Mời tham gia hội chẩn
        /// </summary>
        [HttpPost("consultations/invite")]
        public async Task<ActionResult<ConsultationParticipantDto>> InviteParticipant([FromBody] InviteParticipantDto dto)
        {
            var result = await _risService.InviteParticipantAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Chấp nhận/Từ chối lời mời
        /// </summary>
        [HttpPost("consultations/respond-invitation")]
        public async Task<ActionResult> RespondInvitation([FromBody] RespondInvitationDto dto)
        {
            await _risService.RespondInvitationAsync(dto.SessionId, dto.UserId, dto.Accept);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Tham gia phiên hội chẩn
        /// </summary>
        [HttpPost("consultations/{sessionId}/join")]
        public async Task<ActionResult<ConsultationParticipantDto>> JoinSession(Guid sessionId)
        {
            var result = await _risService.JoinSessionAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Rời phiên hội chẩn
        /// </summary>
        [HttpPost("consultations/{sessionId}/leave")]
        public async Task<ActionResult> LeaveSession(Guid sessionId)
        {
            await _risService.LeaveSessionAsync(sessionId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Upload file đính kèm hội chẩn
        /// </summary>
        [HttpPost("consultations/attachments")]
        public async Task<ActionResult<ConsultationAttachmentDto>> UploadConsultationAttachment([FromBody] AddConsultationAttachmentDto dto)
        {
            var result = await _risService.UploadAttachmentAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa file đính kèm
        /// </summary>
        [HttpDelete("consultations/attachments/{attachmentId}")]
        public async Task<ActionResult> DeleteConsultationAttachment(Guid attachmentId)
        {
            await _risService.DeleteAttachmentAsync(attachmentId);
            return NoContent();
        }

        /// <summary>
        /// Gửi tin nhắn thảo luận
        /// </summary>
        [HttpPost("consultations/discussions")]
        public async Task<ActionResult<ConsultationDiscussionDto>> PostDiscussion([FromBody] AddConsultationDiscussionDto dto)
        {
            var result = await _risService.PostDiscussionAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa tin nhắn thảo luận
        /// </summary>
        [HttpDelete("consultations/discussions/{discussionId}")]
        public async Task<ActionResult> DeleteDiscussion(Guid discussionId)
        {
            await _risService.DeleteDiscussionAsync(discussionId);
            return NoContent();
        }

        /// <summary>
        /// Lưu ghi chú ảnh DICOM
        /// </summary>
        [HttpPost("consultations/image-notes")]
        public async Task<ActionResult<ConsultationImageNoteDto>> SaveImageNote([FromBody] AddConsultationImageNoteDto dto)
        {
            var result = await _risService.SaveImageNoteAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy ghi chú ảnh DICOM
        /// </summary>
        [HttpGet("consultations/{sessionId}/image-notes")]
        public async Task<ActionResult<List<ConsultationImageNoteDto>>> GetImageNotes(Guid sessionId, [FromQuery] string studyInstanceUID)
        {
            var result = await _risService.GetImageNotesAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Lưu biên bản hội chẩn
        /// </summary>
        [HttpPost("consultations/minutes")]
        public async Task<ActionResult<ConsultationMinutesDto>> SaveMinutes([FromBody] SaveConsultationMinutesDto dto)
        {
            var result = await _risService.SaveMinutesAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy biên bản hội chẩn
        /// </summary>
        [HttpGet("consultations/{sessionId}/minutes")]
        public async Task<ActionResult<ConsultationMinutesDto>> GetMinutes(Guid sessionId)
        {
            var result = await _risService.GetMinutesAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Duyệt biên bản hội chẩn
        /// </summary>
        [HttpPost("consultations/minutes/{minutesId}/approve")]
        public async Task<ActionResult> ApproveMinutes(Guid minutesId)
        {
            await _risService.ApproveMinutesAsync(minutesId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Tạo QR Code mời hội chẩn
        /// </summary>
        [HttpGet("consultations/{sessionId}/invite-qr")]
        public async Task<ActionResult<ConsultationInviteQRDto>> GenerateInviteQRCode(Guid sessionId)
        {
            var result = await _risService.GenerateInviteQRCodeAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Bắt đầu/Dừng ghi hình phiên hội chẩn
        /// </summary>
        [HttpPost("consultations/{sessionId}/toggle-recording")]
        public async Task<ActionResult> ToggleRecording(Guid sessionId, [FromQuery] bool startRecording)
        {
            await _risService.ToggleRecordingAsync(sessionId, startRecording);
            return Ok(new { success = true, isRecording = startRecording });
        }
    }
}
