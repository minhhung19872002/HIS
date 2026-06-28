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
    /// Lấy danh sách chẩn đoán
    /// </summary>
    [HttpGet("{examinationId}/diagnoses")]
    public async Task<ActionResult<List<DiagnosisFullDto>>> GetDiagnoses(Guid examinationId)
    {
        var result = await _examinationService.GetDiagnosesAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Thêm chẩn đoán
    /// </summary>
    [HttpPost("{examinationId}/diagnoses")]
    public async Task<ActionResult<DiagnosisFullDto>> AddDiagnosis(Guid examinationId, [FromBody] DiagnosisFullDto dto)
    {
        // Sweep 2026-06-12: body rỗng từng 500 — chẩn đoán phải có mã ICD hoặc tên
        if (dto == null || (string.IsNullOrWhiteSpace(dto.IcdCode) && string.IsNullOrWhiteSpace(dto.IcdName)
            && string.IsNullOrWhiteSpace(dto.CustomDiagnosis)))
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Chẩn đoán cần có mã ICD hoặc tên chẩn đoán" });
        dto.ExaminationId = examinationId;
        var result = await _examinationService.AddDiagnosisAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật chẩn đoán
    /// </summary>
    [HttpPut("diagnoses/{diagnosisId}")]
    public async Task<ActionResult<DiagnosisFullDto>> UpdateDiagnosis(Guid diagnosisId, [FromBody] DiagnosisFullDto dto)
    {
        var result = await _examinationService.UpdateDiagnosisAsync(diagnosisId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Xóa chẩn đoán
    /// </summary>
    [HttpDelete("diagnoses/{diagnosisId}")]
    public async Task<ActionResult<bool>> DeleteDiagnosis(Guid diagnosisId)
    {
        var result = await _examinationService.DeleteDiagnosisAsync(diagnosisId);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật toàn bộ danh sách chẩn đoán
    /// </summary>
    [HttpPut("{examinationId}/diagnoses/batch")]
    public async Task<ActionResult<List<DiagnosisFullDto>>> UpdateDiagnosisList(Guid examinationId, [FromBody] UpdateDiagnosisDto dto)
    {
        var result = await _examinationService.UpdateDiagnosisListAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Đặt chẩn đoán chính
    /// </summary>
    [HttpPost("diagnoses/{diagnosisId}/set-primary")]
    public async Task<ActionResult<DiagnosisFullDto>> SetPrimaryDiagnosis(Guid diagnosisId)
    {
        var result = await _examinationService.SetPrimaryDiagnosisAsync(diagnosisId);
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm mã ICD
    /// </summary>
    [HttpGet("icd/search")]
    public async Task<ActionResult<List<IcdCodeFullDto>>> SearchIcdCodes(
        [FromQuery] string keyword,
        [FromQuery] int? icdType = null,
        [FromQuery] int limit = 20)
    {
        var result = await _examinationService.SearchIcdCodesAsync(keyword, icdType, limit);
        return Ok(result);
    }

    /// <summary>
    /// Lấy mã ICD theo code
    /// </summary>
    [HttpGet("icd/{code}")]
    public async Task<ActionResult<IcdCodeFullDto>> GetIcdByCode(string code)
    {
        var result = await _examinationService.GetIcdByCodeAsync(code);
        return Ok(result);
    }

    /// <summary>
    /// Lấy ICD phổ biến theo chuyên khoa
    /// </summary>
    [HttpGet("icd/frequent")]
    public async Task<ActionResult<List<IcdCodeFullDto>>> GetFrequentIcdCodes(
        [FromQuery] Guid? departmentId = null,
        [FromQuery] int limit = 20)
    {
        var result = await _examinationService.GetFrequentIcdCodesAsync(departmentId, limit);
        return Ok(result);
    }

    /// <summary>
    /// Gợi ý ICD dựa trên triệu chứng
    /// </summary>
    [HttpGet("icd/suggest")]
    public async Task<ActionResult<List<IcdCodeFullDto>>> SuggestIcdCodes([FromQuery] string symptoms)
    {
        var result = await _examinationService.SuggestIcdCodesAsync(symptoms);
        return Ok(result);
    }

    /// <summary>
    /// Lấy ICD gần đây của bác sĩ
    /// </summary>
    [HttpGet("icd/recent")]
    public async Task<ActionResult<List<IcdCodeFullDto>>> GetRecentIcdCodes([FromQuery] int limit = 20)
    {
        var doctorId = GetCurrentUserId();
        var result = await _examinationService.GetRecentIcdCodesAsync(doctorId, limit);
        return Ok(result);
    }

    /// <summary>
    /// Tìm mã nguyên nhân ngoài
    /// </summary>
    [HttpGet("icd/external-cause/search")]
    public async Task<ActionResult<List<IcdCodeFullDto>>> SearchExternalCauseCodes([FromQuery] string keyword)
    {
        var result = await _examinationService.SearchExternalCauseCodesAsync(keyword);
        return Ok(result);
    }

    /// <summary>
    /// Tạo yêu cầu khám thêm
    /// </summary>
    [HttpPost("additional")]
    public async Task<ActionResult<ExaminationDto>> CreateAdditionalExamination([FromBody] AdditionalExaminationDto dto)
    {
        var result = await _examinationService.CreateAdditionalExaminationAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Chuyển phòng khám
    /// </summary>
    [HttpPost("transfer-room")]
    public async Task<ActionResult<ExaminationDto>> TransferRoom([FromBody] TransferRoomRequestDto dto)
    {
        var result = await _examinationService.TransferRoomAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Chuyển khám chính sang phòng khác
    /// </summary>
    [HttpPost("{examinationId}/transfer-primary/{newRoomId}")]
    public async Task<ActionResult<ExaminationDto>> TransferPrimaryExamination(Guid examinationId, Guid newRoomId)
    {
        var result = await _examinationService.TransferPrimaryExaminationAsync(examinationId, newRoomId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách khám thêm
    /// </summary>
    [HttpGet("{primaryExaminationId}/additional-list")]
    public async Task<ActionResult<List<ExaminationDto>>> GetAdditionalExaminations(Guid primaryExaminationId)
    {
        var result = await _examinationService.GetAdditionalExaminationsAsync(primaryExaminationId);
        return Ok(result);
    }

    /// <summary>
    /// Hủy khám thêm
    /// </summary>
    [HttpPost("{examinationId}/cancel-additional")]
    public async Task<ActionResult<bool>> CancelAdditionalExamination(Guid examinationId, [FromBody] CancelReasonRequest request)
    {
        var result = await _examinationService.CancelAdditionalExaminationAsync(examinationId, request.Reason);
        return Ok(result);
    }

    /// <summary>
    /// Hoàn thành khám thêm
    /// </summary>
    [HttpPost("{examinationId}/complete-additional")]
    public async Task<ActionResult<ExaminationDto>> CompleteAdditionalExamination(Guid examinationId)
    {
        var result = await _examinationService.CompleteAdditionalExaminationAsync(examinationId);
        return Ok(result);
    }
}
