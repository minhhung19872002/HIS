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
    // 12.4 Kiểm tra và validate

    /// <summary>
    /// Kiểm tra hồ sơ BHYT đơn lẻ
    /// </summary>
    [HttpGet("validate/{maLk}")]
    public async Task<ActionResult<InsuranceValidationResultDto>> ValidateClaim(string maLk)
    {
        var result = await _insuranceService.ValidateClaimAsync(maLk);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra hàng loạt hồ sơ BHYT
    /// </summary>
    [HttpPost("validate/batch")]
    public async Task<ActionResult<List<InsuranceValidationResultDto>>> ValidateClaimsBatch([FromBody] List<string> maLkList)
    {
        var result = await _insuranceService.ValidateClaimsBatchAsync(maLkList);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra trước khi xuất XML
    /// </summary>
    [HttpPost("validate/before-export")]
    public async Task<ActionResult<List<InsuranceValidationResultDto>>> ValidateBeforeExport([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.ValidateBeforeExportAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra quy tắc kê đơn BHYT
    /// </summary>
    [HttpGet("validate/prescription/{prescriptionId}")]
    public async Task<ActionResult<List<PrescriptionValidationError>>> ValidateBhytPrescription(Guid prescriptionId)
    {
        var result = await _insuranceService.ValidateBhytPrescriptionAsync(prescriptionId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra quy tắc chỉ định CLS BHYT
    /// </summary>
    [HttpGet("validate/service-order/{serviceOrderId}")]
    public async Task<ActionResult<List<ServiceValidationError>>> ValidateBhytServiceOrder(Guid serviceOrderId)
    {
        var result = await _insuranceService.ValidateBhytServiceOrderAsync(serviceOrderId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra chi phí vượt trần BHYT
    /// </summary>
    [HttpGet("check-cost-ceiling/{maLk}")]
    public async Task<ActionResult<CostCeilingCheckResult>> CheckCostCeiling(string maLk)
    {
        var result = await _insuranceService.CheckCostCeilingAsync(maLk);
        return Ok(result);
    }

    // 12.5 Gửi dữ liệu lên cổng BHXH

    /// <summary>
    /// Gửi XML lên cổng BHXH
    /// </summary>
    [HttpPost("submit")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.InsuranceManager)]
    public async Task<ActionResult<SubmitResultDto>> SubmitToInsurancePortal([FromBody] SubmitToInsurancePortalDto dto)
    {
        // Sweep 2026-06-12: body rỗng từng trả TXN giả + "tiep nhan thanh cong" (mock) — chặn khi thiếu hồ sơ.
        if (dto == null || dto.BatchId == Guid.Empty)
            return BadRequest(HIS.Application.DTOs.Common.ApiResponse<object>.Fail("Thiếu BatchId — chưa chọn đợt quyết toán để gửi"));
        var result = await _insuranceService.SubmitToInsurancePortalAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra trạng thái gửi
    /// </summary>
    [HttpGet("submit-status/{transactionId}")]
    public async Task<ActionResult<SubmitStatusDto>> CheckSubmitStatus(string transactionId)
    {
        var result = await _insuranceService.CheckSubmitStatusAsync(transactionId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy kết quả phản hồi từ BHXH
    /// </summary>
    [HttpGet("feedback/{transactionId}")]
    public async Task<ActionResult<InsuranceFeedbackDto>> GetInsuranceFeedback(string transactionId)
    {
        var result = await _insuranceService.GetInsuranceFeedbackAsync(transactionId);
        return Ok(result);
    }

    /// <summary>
    /// Tái gửi hồ sơ bị từ chối
    /// </summary>
    [HttpPost("resubmit")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.InsuranceManager)]
    public async Task<ActionResult<SubmitResultDto>> ResubmitRejectedClaims([FromBody] List<string> maLkList)
    {
        var result = await _insuranceService.ResubmitRejectedClaimsAsync(maLkList);
        return Ok(result);
    }

    // 12.6 Đối soát và quyết toán

    /// <summary>
    /// Tạo đợt quyết toán
    /// </summary>
    [HttpPost("settlement/create")]
    public async Task<ActionResult<InsuranceSettlementBatchDto>> CreateSettlementBatch([FromBody] CreateSettlementBatchRequest request)
    {
        var result = await _insuranceService.CreateSettlementBatchAsync(request.Month, request.Year);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin đợt quyết toán
    /// </summary>
    [HttpGet("settlement/{batchId}")]
    public async Task<ActionResult<InsuranceSettlementBatchDto>> GetSettlementBatch(Guid batchId)
    {
        var result = await _insuranceService.GetSettlementBatchAsync(batchId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách đợt quyết toán
    /// </summary>
    [HttpGet("settlement/list/{year}")]
    public async Task<ActionResult<List<InsuranceSettlementBatchDto>>> GetSettlementBatches(int year)
    {
        var result = await _insuranceService.GetSettlementBatchesAsync(year);
        return Ok(result);
    }

    /// <summary>
    /// Import kết quả đối soát từ BHXH
    /// </summary>
    [HttpPost("reconciliation/import/{batchId}")]
    public async Task<ActionResult<InsuranceReconciliationDto>> ImportReconciliationResult(Guid batchId, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(HIS.Application.DTOs.Common.ApiResponse<object>.Fail("Chưa chọn file kết quả đối soát"));
        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        var result = await _insuranceService.ImportReconciliationResultAsync(batchId, stream.ToArray(), GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách hồ sơ bị từ chối
    /// </summary>
    [HttpGet("rejected-claims/{batchId}")]
    public async Task<ActionResult<List<RejectedClaimDto>>> GetRejectedClaims(Guid batchId)
    {
        var result = await _insuranceService.GetRejectedClaimsAsync(batchId);
        return Ok(result);
    }

    /// <summary>
    /// Xử lý hồ sơ bị từ chối
    /// </summary>
    [HttpPost("rejected-claims/{maLk}/process")]
    public async Task<ActionResult<bool>> ProcessRejectedClaim(string maLk, [FromBody] RejectedClaimProcessDto dto)
    {
        var result = await _insuranceService.ProcessRejectedClaimAsync(maLk, dto);
        return Ok(result);
    }

    /// <summary>
    /// Tính toán chênh lệch đối soát
    /// </summary>
    [HttpGet("reconciliation/difference/{batchId}")]
    public async Task<ActionResult<ReconciliationDifferenceDto>> CalculateReconciliationDifference(Guid batchId)
    {
        var result = await _insuranceService.CalculateReconciliationDifferenceAsync(batchId);
        return Ok(result);
    }
}
