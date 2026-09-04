using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using QueueDailyStatisticsDto = HIS.Application.DTOs.Reception.QueueDailyStatisticsDto;
using AverageWaitingTimeDto = HIS.Application.DTOs.Reception.AverageWaitingTimeDto;
using QueueReportRequestDto = HIS.Application.DTOs.Reception.QueueReportRequestDto;
using QueueConfigurationDto = HIS.Application.DTOs.Reception.QueueConfigurationDto;
using WaitingPhaseAnalysisDto = HIS.Application.DTOs.Reception.WaitingPhaseAnalysisDto;
using HIS.API.Dtos.ReceptionComplete;

namespace HIS.API.Controllers;

public partial class ReceptionCompleteController
{
    #region 1.12 Xem lịch sử đăng ký khám

    /// <summary>
    /// 1.12.1-2: Lấy lịch sử khám gần nhất
    /// </summary>
    [HttpGet("patients/{patientId}/visit-history")]
    public async Task<ActionResult<List<PatientVisitHistoryDto>>> GetPatientVisitHistory(
        Guid patientId,
        [FromQuery] int maxRecords = 5)
    {
        var result = await _receptionService.GetPatientVisitHistoryAsync(patientId, maxRecords);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết lịch sử khám
    /// </summary>
    [HttpGet("visit-history/{medicalRecordId}")]
    public async Task<ActionResult<PatientVisitHistoryDto>> GetVisitDetail(Guid medicalRecordId)
    {
        var result = await _receptionService.GetVisitDetailAsync(medicalRecordId);
        if (result == null) return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy dữ liệu." });
        return Ok(result);
    }

    /// <summary>
    /// 1.12.3-4: Lấy cấu hình hiển thị lịch sử
    /// </summary>
    [HttpGet("settings/history-display")]
    public async Task<ActionResult<HistoryDisplayConfigDto>> GetHistoryDisplayConfig()
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.GetHistoryDisplayConfigAsync(userId);
        return Ok(result);
    }

    #endregion

    #region 1.13 Chỉ định dịch vụ ở tiếp đón

    /// <summary>
    /// 1.13.1-4: Chỉ định dịch vụ tại tiếp đón
    /// </summary>
    [HttpPost("admissions/{medicalRecordId}/services")]
    public async Task<ActionResult<List<ServiceOrderResultDto>>> OrderServicesAtReception(
        Guid medicalRecordId,
        [FromBody] ReceptionServiceOrderDto dto)
    {
        dto.MedicalRecordId = medicalRecordId;
        var userId = GetCurrentUserId();
        var result = await _receptionService.OrderServicesAtReceptionAsync(dto, userId);
        return Ok(result);
    }

    /// <summary>
    /// 1.13.2: Chỉ định dịch vụ theo nhóm
    /// </summary>
    [HttpPost("admissions/{medicalRecordId}/services/by-group/{groupId}")]
    public async Task<ActionResult<List<ServiceOrderResultDto>>> OrderServicesByGroup(
        Guid medicalRecordId,
        Guid groupId)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.OrderServicesByGroupAsync(medicalRecordId, groupId, userId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách nhóm dịch vụ
    /// </summary>
    [HttpGet("service-groups")]
    public async Task<ActionResult<List<ServiceGroupDto>>> GetServiceGroups()
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.GetServiceGroupsAsync(userId);
        return Ok(result);
    }

    /// <summary>
    /// 1.13.8: Tính đường đi tối ưu (TT54)
    /// </summary>
    [HttpGet("admissions/{medicalRecordId}/optimal-path")]
    public async Task<ActionResult<OptimalPathResultDto>> CalculateOptimalPath(Guid medicalRecordId)
    {
        var result = await _receptionService.CalculateOptimalPathAsync(medicalRecordId);
        return Ok(result);
    }

    #endregion

    #region 1.14 In phiếu

    /// <summary>
    /// 1.14.1: In phiếu khám bệnh
    /// </summary>
    [HttpGet("print/examination-slip/{medicalRecordId}")]
    public async Task<IActionResult> PrintExaminationSlip(Guid medicalRecordId)
    {
        var data = await _receptionService.PrintExaminationSlipAsync(medicalRecordId);
        return File(data, "application/pdf", $"PhieuKham_{medicalRecordId}.pdf");
    }

    /// <summary>
    /// 1.14.3: In phiếu giữ thẻ BHYT
    /// </summary>
    [HttpGet("print/insurance-hold-slip/{documentHoldId}")]
    public async Task<IActionResult> PrintInsuranceCardHoldSlip(Guid documentHoldId)
    {
        var data = await _receptionService.PrintInsuranceCardHoldSlipAsync(documentHoldId);
        return File(data, "application/pdf", $"PhieuGiuThe_{documentHoldId}.pdf");
    }

    /// <summary>
    /// 1.14.4: In thẻ bệnh nhân
    /// </summary>
    [HttpGet("print/patient-card/{patientId}")]
    public async Task<IActionResult> PrintPatientCard(Guid patientId)
    {
        var data = await _receptionService.PrintPatientCardAsync(patientId);
        return File(data, "application/pdf", $"TheBenhNhan_{patientId}.pdf");
    }

    /// <summary>
    /// 1.13.7: In phiếu chỉ định
    /// </summary>
    [HttpGet("print/service-order-slip/{medicalRecordId}")]
    public async Task<IActionResult> PrintServiceOrderSlip(Guid medicalRecordId)
    {
        var data = await _receptionService.PrintServiceOrderSlipAsync(medicalRecordId);
        return File(data, "application/pdf", $"PhieuChiDinh_{medicalRecordId}.pdf");
    }

    /// <summary>
    /// Lấy dữ liệu phiếu khám
    /// </summary>
    [HttpGet("print/examination-slip/{medicalRecordId}/data")]
    public async Task<ActionResult<ExaminationSlipDto>> GetExaminationSlipData(Guid medicalRecordId)
    {
        var result = await _receptionService.GetExaminationSlipDataAsync(medicalRecordId);
        return Ok(result);
    }

    /// <summary>
    /// 1.14.5: In phiếu số thứ tự (gồm thời gian chờ ước tính + vị trí phòng CLS)
    /// </summary>
    [HttpGet("print/queue-ticket/{ticketId}")]
    public async Task<IActionResult> PrintQueueTicket(Guid ticketId)
    {
        var data = await _receptionService.PrintQueueTicketAsync(ticketId);
        return File(data, "application/pdf", $"PhieuSTT_{ticketId}.pdf");
    }

    /// <summary>
    /// NangCap18: In nhãn mã vạch Code128 (60mm x 30mm) dán lên HSBA giấy.
    /// </summary>
    [HttpGet("print/medical-record-barcode/{medicalRecordId}")]
    public async Task<IActionResult> PrintMedicalRecordBarcode(Guid medicalRecordId)
    {
        var data = await _receptionService.PrintMedicalRecordBarcodeAsync(medicalRecordId);
        if (data.Length == 0)
            return NotFound(HIS.Application.DTOs.Common.ApiResponse<object>.Fail("Không tìm thấy hồ sơ bệnh án"));
        return File(data, "application/pdf", $"BarcodeHSBA_{medicalRecordId}.pdf");
    }

    #endregion
}
