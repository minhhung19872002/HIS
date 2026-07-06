using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using System.Security.Claims;
using HIS.API.Dtos.InpatientComplete;

namespace HIS.API.Controllers;

public partial class InpatientCompleteController
{
    #region Nurse Shift Handover

    /// <summary>
    /// Tạo biên bản bàn giao ca trực
    /// </summary>
    [HttpPost("shift-handover")]
    public async Task<IActionResult> CreateShiftHandover([FromBody] CreateShiftHandoverRequest request)
    {
        var id = await _inpatientService.CreateShiftHandoverAsync(request, GetCurrentUserId());
        return Ok(new { Id = id, message = "Tạo biên bản bàn giao thành công" });
    }

    /// <summary>
    /// Lấy danh sách biên bản bàn giao theo khoa
    /// </summary>
    [HttpGet("shift-handover")]
    public async Task<IActionResult> GetShiftHandovers([FromQuery] Guid? departmentId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        try
        {
            var handovers = await _inpatientService.GetShiftHandoversAsync(departmentId, fromDate, toDate);
            return Ok(handovers);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting shift handovers");
            return Ok(Array.Empty<object>());
        }
    }

    /// <summary>
    /// Xác nhận bàn giao (ĐD nhận ca ký)
    /// </summary>
    [HttpPut("shift-handover/{id}/acknowledge")]
    public async Task<IActionResult> AcknowledgeShiftHandover(Guid id)
    {
        var ok = await _inpatientService.AcknowledgeShiftHandoverAsync(id, GetCurrentUserId());
        if (!ok) return NotFound();
        return Ok(new { message = "Xác nhận bàn giao thành công" });
    }

#endregion

    #region NangCap18 - Diagnosis Interruption, Medicine Rules, Service Compatibility

    /// <summary>
    /// Tạo gián đoạn chẩn đoán
    /// </summary>
    [HttpPost("diagnosis-interruption")]
    public async Task<ActionResult<HIS.Application.DTOs.NangCap18.DiagnosisInterruptionDto>> CreateDiagnosisInterruption(
        [FromBody] HIS.Application.DTOs.NangCap18.CreateDiagnosisInterruptionDto dto)
    {
        var result = await _inpatientService.CreateDiagnosisInterruptionAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách gián đoạn chẩn đoán theo đợt nhập viện
    /// </summary>
    [HttpGet("{admissionId}/diagnosis-interruptions")]
    public async Task<ActionResult<List<HIS.Application.DTOs.NangCap18.DiagnosisInterruptionDto>>> GetDiagnosisInterruptions(Guid admissionId)
    {
        var result = await _inpatientService.GetDiagnosisInterruptionsAsync(admissionId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra quy tắc kê đơn thuốc nội trú (cảnh báo/chặn)
    /// </summary>
    [HttpPost("check-medicine-rules")]
    public async Task<ActionResult<HIS.Application.DTOs.NangCap18.CheckMedicineOrderRulesResultDto>> CheckMedicineOrderRules(
        [FromBody] HIS.Application.DTOs.NangCap18.CheckMedicineOrderRulesDto dto)
    {
        var result = await _inpatientService.CheckMedicineOrderRulesAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra tương thích chỉ định dịch vụ với chẩn đoán
    /// </summary>
    [HttpPost("check-service-compatibility")]
    public async Task<ActionResult<HIS.Application.DTOs.NangCap18.ServiceCompatibilityResultDto>> CheckServiceOrderCompatibility(
        [FromBody] HIS.Application.DTOs.NangCap18.CheckServiceCompatibilityDto dto)
    {
        var result = await _inpatientService.CheckServiceOrderCompatibilityAsync(dto);
        return Ok(result);
    }

    #endregion

    #region Medical Record Archive Summary (dashboard for /medical-record-archive page)

    [HttpGet("medical-record-archive/list")]
    public async Task<ActionResult> GetMedicalRecordArchiveList(
        [FromQuery] string? keyword = null,
        [FromQuery] string? format = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int? status = null,
        [FromQuery] int pageIndex = 1,
        [FromQuery] int pageSize = 20)
    {
        return Ok(await _inpatientService.GetMedicalRecordArchiveListAsync(keyword, format, fromDate, toDate, status, pageIndex, pageSize));
    }

    [HttpGet("medical-record-archive/summary")]
    public async Task<ActionResult> GetMedicalRecordArchiveSummary()
    {
        return Ok(await _inpatientService.GetMedicalRecordArchiveSummaryAsync());
    }

    #endregion
}
