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
    #region 1.16 Thu tiền khám bệnh

    /// <summary>
    /// 1.16.1: Thu tạm ứng tại tiếp đón
    /// </summary>
    [HttpPost("billing/deposit")]
    public async Task<ActionResult<DepositReceiptDto>> CreateDeposit([FromBody] ReceptionDepositDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.CreateDepositAsync(dto, userId);
        return Ok(result);
    }

    /// <summary>
    /// 1.16.2-4: Thu tiền theo dịch vụ
    /// </summary>
    [HttpPost("billing/payment")]
    public async Task<ActionResult<PaymentReceiptDto>> CreatePayment([FromBody] ReceptionPaymentDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.CreatePaymentAsync(dto, userId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin viện phí bệnh nhân
    /// </summary>
    [HttpGet("billing/{medicalRecordId}")]
    public async Task<ActionResult<PatientBillingInfoDto>> GetPatientBillingInfo(Guid medicalRecordId)
    {
        var result = await _receptionService.GetPatientBillingInfoAsync(medicalRecordId);
        return Ok(result);
    }

    #endregion

    #region 1.17 Thẻ khám bệnh thông minh

    /// <summary>
    /// 1.17.1: Đọc thẻ khám bệnh thông minh
    /// </summary>
    [HttpPost("smart-card/read")]
    public async Task<ActionResult<SmartCardDataDto>> ReadSmartCard([FromBody] SmartCardReadDto dto)
    {
        var result = await _receptionService.ReadSmartCardAsync(dto.CardData);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra kết nối cổng BHXH
    /// </summary>
    [HttpGet("bhxh/check-connection")]
    public async Task<ActionResult<object>> CheckBHXHConnection()
    {
        var isConnected = await _receptionService.CheckBHXHConnectionAsync();
        return Ok(new { isConnected });
    }

    #endregion

    #region Thống kê và báo cáo

    /// <summary>
    /// Lấy thống kê hàng đợi theo phòng
    /// </summary>
    [HttpGet("statistics/room/{roomId}")]
    public async Task<ActionResult<QueueRoomStatisticsDto>> GetRoomQueueStatistics(Guid roomId, [FromQuery] DateTime? date)
    {
        var result = await _receptionService.GetRoomQueueStatisticsAsync(roomId, date ?? DateTime.Today);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thống kê hàng ngày
    /// </summary>
    [HttpGet("statistics/daily")]
    public async Task<ActionResult<QueueDailyStatisticsDto>> GetDailyStatistics(
        [FromQuery] DateTime date,
        [FromQuery] Guid? departmentId)
    {
        var result = await _receptionService.GetDailyStatisticsAsync(date, departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thời gian chờ trung bình (legacy)
    /// </summary>
    [HttpGet("statistics/waiting-time")]
    public async Task<ActionResult<AverageWaitingTimeDto>> GetAverageWaitingTime(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] Guid? roomId)
    {
        var result = await _receptionService.GetAverageWaitingTimeAsync(fromDate, toDate, roomId);
        return Ok(result);
    }

    /// <summary>
    /// F9.4 — Phân tích thời gian chờ theo từng khâu thực (đăng ký→khám→CLS→KQ→kê đơn).
    /// Break-down theo khoa và đối tượng (BHYT/viện phí/dịch vụ).
    /// </summary>
    [HttpGet("statistics/waiting-phase-analysis")]
    public async Task<ActionResult<WaitingPhaseAnalysisDto>> GetWaitingPhaseAnalysis(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] Guid? departmentId)
    {
        var result = await _receptionService.GetWaitingPhaseAnalysisAsync(fromDate, toDate, departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Xuất báo cáo
    /// </summary>
    [HttpPost("reports/export")]
    public async Task<IActionResult> ExportReport([FromBody] QueueReportRequestDto dto)
    {
        var data = await _receptionService.ExportQueueReportAsync(dto);
        var contentType = dto.ExportFormat == "PDF" ? "application/pdf" :
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        var ext = dto.ExportFormat == "PDF" ? "pdf" : "xlsx";
        return File(data, contentType, $"BaoCaoHangDoi_{dto.FromDate:yyyyMMdd}_{dto.ToDate:yyyyMMdd}.{ext}");
    }

    /// <summary>
    /// Lấy cấu hình hàng đợi
    /// </summary>
    [HttpGet("queue/config/{roomId}")]
    public async Task<ActionResult<QueueConfigurationDto>> GetQueueConfiguration(Guid roomId, [FromQuery] int queueType)
    {
        var result = await _receptionService.GetQueueConfigurationAsync(roomId, queueType);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// Lưu cấu hình hàng đợi
    /// </summary>
    [HttpPost("queue/config")]
    public async Task<ActionResult<QueueConfigurationDto>> SaveQueueConfiguration([FromBody] QueueConfigurationDto dto)
    {
        var result = await _receptionService.SaveQueueConfigurationAsync(dto);
        return Ok(result);
    }

    #endregion

    #region CCCD/National ID Validation

    /// <summary>
    /// Validate CCCD (Citizen Identity Card) number
    /// </summary>
    [HttpGet("validate-cccd")]
    [AllowAnonymous]
    public ActionResult<CccdValidationResultDto> ValidateCccd([FromQuery] string cccd)
    {
        var result = CccdValidator.Validate(cccd);
        return Ok(result);
    }

    #endregion
}
