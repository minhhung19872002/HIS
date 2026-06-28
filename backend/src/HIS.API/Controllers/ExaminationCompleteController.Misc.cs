using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Examination;
using HIS.Infrastructure.Data;
using RoomDto = HIS.Application.DTOs.RoomDto;
using ServiceDto = HIS.Application.DTOs.ServiceDto;
using HIS.API.Dtos.ExaminationComplete;

namespace HIS.API.Controllers;

public partial class ExaminationCompleteController : ControllerBase
{
    /// <summary>
    /// Lấy thông tin bệnh nhân
    /// </summary>
    [HttpGet("patient/lookup")]
    public async Task<ActionResult<PatientInfoDto>> GetPatientInfo(
        [FromQuery] string? patientCode = null,
        [FromQuery] string? idNumber = null)
    {
        var result = await _examinationService.GetPatientInfoAsync(patientCode, idNumber);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phòng khám đang hoạt động
    /// </summary>
    [HttpGet("rooms/active")]
    public async Task<ActionResult<List<RoomDto>>> GetActiveExaminationRooms([FromQuery] Guid? departmentId = null)
    {
        var result = await _examinationService.GetActiveExaminationRoomsAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách bác sĩ đang trực
    /// </summary>
    [HttpGet("doctors/on-duty")]
    public async Task<ActionResult<List<DoctorDto>>> GetOnDutyDoctors([FromQuery] Guid? departmentId = null)
    {
        var result = await _examinationService.GetOnDutyDoctorsAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy cấu hình phòng khám
    /// </summary>
    [HttpGet("rooms/{roomId}/config")]
    public async Task<ActionResult<RoomExaminationConfigDto>> GetRoomExaminationConfig(Guid roomId)
    {
        var result = await _examinationService.GetRoomExaminationConfigAsync(roomId);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật cấu hình phòng khám
    /// </summary>
    [HttpPut("rooms/{roomId}/config")]
    public async Task<ActionResult<RoomExaminationConfigDto>> UpdateRoomExaminationConfig(Guid roomId, [FromBody] RoomExaminationConfigDto config)
    {
        var result = await _examinationService.UpdateRoomExaminationConfigAsync(roomId, config);
        return Ok(result);
    }

    /// <summary>
    /// Ký điện tử
    /// </summary>
    [HttpPost("{examinationId}/sign")]
    public async Task<ActionResult<bool>> SignExamination(Guid examinationId, [FromBody] SignatureRequest request)
    {
        var result = await _examinationService.SignExaminationAsync(examinationId, request.Signature);
        return Ok(result);
    }

    /// <summary>
    /// Xác minh chữ ký
    /// </summary>
    [HttpGet("{examinationId}/verify-signature")]
    public async Task<ActionResult<SignatureVerificationResult>> VerifyExaminationSignature(Guid examinationId)
    {
        var result = await _examinationService.VerifyExaminationSignatureAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Gửi kết quả qua SMS/Zalo
    /// </summary>
    [HttpPost("{examinationId}/send-result")]
    public async Task<ActionResult<bool>> SendResultNotification(Guid examinationId, [FromBody] SendNotificationRequest request)
    {
        var result = await _examinationService.SendResultNotificationAsync(examinationId, request.Channel);
        return Ok(result);
    }

    /// <summary>
    /// Lấy log hoạt động
    /// </summary>
    [HttpGet("{examinationId}/activity-logs")]
    public async Task<ActionResult<List<ExaminationActivityLogDto>>> GetExaminationLogs(Guid examinationId)
    {
        var result = await _examinationService.GetExaminationLogsAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Chuyển bệnh nhân sang phòng khám khác
    /// </summary>
    [HttpPut("transfer-room")]
    public async Task<ActionResult<HIS.Application.DTOs.NangCap18.TransferPatientRoomResultDto>> TransferPatientRoom(
        [FromBody] HIS.Application.DTOs.NangCap18.TransferPatientRoomDto dto)
    {
        var userId = Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var uid) ? uid : Guid.Empty;
        var result = await _examinationService.TransferPatientRoomAsync(dto.ExaminationId, dto.NewRoomId, dto.Reason, userId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra chứng chỉ hành nghề của bác sĩ
    /// </summary>
    [HttpGet("check-doctor-certification/{doctorId}")]
    public async Task<ActionResult<HIS.Application.DTOs.NangCap18.DoctorCertificationResultDto>> CheckDoctorCertification(Guid doctorId)
    {
        var result = await _examinationService.CheckDoctorCertificationAsync(doctorId);
        return Ok(result);
    }
}
