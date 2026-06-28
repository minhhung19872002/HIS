using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.API.Dtos.InsuranceXml;

namespace HIS.API.Controllers;

public partial class InsuranceXmlController
{
    // 12.9 Cấu hình và thiết lập

    /// <summary>
    /// Lấy cấu hình kết nối cổng BHXH
    /// </summary>
    [HttpGet("config/portal")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<ActionResult<InsurancePortalConfigDto>> GetPortalConfig()
    {
        var result = await _insuranceService.GetPortalConfigAsync();
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật cấu hình kết nối cổng BHXH
    /// </summary>
    [HttpPut("config/portal")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<ActionResult<InsurancePortalConfigDto>> UpdatePortalConfig([FromBody] InsurancePortalConfigDto config)
    {
        var result = await _insuranceService.UpdatePortalConfigAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra kết nối cổng BHXH
    /// </summary>
    [HttpGet("config/test-connection")]
    public async Task<ActionResult<PortalConnectionTestResult>> TestPortalConnection()
    {
        var result = await _insuranceService.TestPortalConnectionAsync();
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin cơ sở KCB
    /// </summary>
    [HttpGet("config/facility")]
    public async Task<ActionResult<FacilityInfoDto>> GetFacilityInfo()
    {
        var result = await _insuranceService.GetFacilityInfoAsync();
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật thông tin cơ sở KCB
    /// </summary>
    [HttpPut("config/facility")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<ActionResult<FacilityInfoDto>> UpdateFacilityInfo([FromBody] FacilityInfoDto dto)
    {
        var result = await _insuranceService.UpdateFacilityInfoAsync(dto);
        return Ok(result);
    }

    // 12.10 Tiện ích

    /// <summary>
    /// Tạo mã liên thông mới
    /// </summary>
    [HttpPost("generate-malk/{examinationId}")]
    public async Task<ActionResult<string>> GenerateMaLk(Guid examinationId)
    {
        var result = await _insuranceService.GenerateMaLkAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Tính toán chi phí BHYT cho dịch vụ
    /// </summary>
    [HttpGet("calculate/service-cost")]
    public async Task<ActionResult<InsuranceCostCalculationDto>> CalculateServiceInsuranceCost(
        [FromQuery] Guid serviceId,
        [FromQuery] string insuranceNumber)
    {
        var result = await _insuranceService.CalculateServiceInsuranceCostAsync(serviceId, insuranceNumber);
        return Ok(result);
    }

    /// <summary>
    /// Tính toán chi phí BHYT cho thuốc
    /// </summary>
    [HttpGet("calculate/medicine-cost")]
    public async Task<ActionResult<InsuranceCostCalculationDto>> CalculateMedicineInsuranceCost(
        [FromQuery] Guid medicineId,
        [FromQuery] decimal quantity,
        [FromQuery] string insuranceNumber)
    {
        var result = await _insuranceService.CalculateMedicineInsuranceCostAsync(medicineId, quantity, insuranceNumber);
        return Ok(result);
    }

    /// <summary>
    /// Lấy tỷ lệ thanh toán BHYT
    /// </summary>
    [HttpGet("payment-ratio")]
    public async Task<ActionResult<int>> GetInsurancePaymentRatio(
        [FromQuery] string insuranceNumber,
        [FromQuery] int treatmentType)
    {
        var result = await _insuranceService.GetInsurancePaymentRatioAsync(insuranceNumber, treatmentType);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra đúng tuyến/trái tuyến
    /// </summary>
    [HttpGet("check-referral")]
    public async Task<ActionResult<ReferralCheckResult>> CheckReferralStatus(
        [FromQuery] string insuranceNumber,
        [FromQuery] string facilityCode)
    {
        var result = await _insuranceService.CheckReferralStatusAsync(insuranceNumber, facilityCode);
        return Ok(result);
    }

    /// <summary>
    /// Lấy log hoạt động BHYT
    /// </summary>
    [HttpGet("logs")]
    public async Task<ActionResult<List<InsuranceActivityLogDto>>> GetInsuranceLogs(
        [FromQuery] string? maLk = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var result = await _insuranceService.GetInsuranceLogsAsync(maLk, fromDate, toDate);
        return Ok(result);
    }
}
