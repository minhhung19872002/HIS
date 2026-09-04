using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using System.Security.Claims;
using HIS.API.Dtos.BillingComplete;

namespace HIS.API.Controllers;

public partial class BillingCompleteController
{
    // 10.3 Quản lý thu ngân

    /// <summary>
    /// Lấy báo cáo thu ngân theo ngày
    /// </summary>
    [HttpGet("reports/cashier")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Cashier + "," + RoleNames.Accountant)]
    public async Task<ActionResult<CashierReportDto>> GetCashierReport([FromQuery] CashierReportRequestDto dto)
    {
        var result = await _billingService.GetCashierReportAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Đóng sổ thu ngân
    /// </summary>
    [HttpPost("cash-books/close")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Cashier)]
    public async Task<ActionResult<CashierReportDto>> CloseCashBook([FromBody] CloseCashBookDto dto)
    {
        var result = await _billingService.CloseCashBookAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo thu tiền ngoại trú
    /// </summary>
    [HttpGet("reports/outpatient-revenue")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<OutpatientRevenueReportDto>> GetOutpatientRevenueReport([FromQuery] RevenueReportRequestDto dto)
    {
        var result = await _billingService.GetOutpatientRevenueReportAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo thu tiền nội trú
    /// </summary>
    [HttpGet("reports/inpatient-revenue")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<InpatientRevenueReportDto>> GetInpatientRevenueReport([FromQuery] RevenueReportRequestDto dto)
    {
        var result = await _billingService.GetInpatientRevenueReportAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo thu tiền tạm ứng
    /// </summary>
    [HttpGet("reports/deposit-revenue")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<DepositRevenueReportDto>> GetDepositRevenueReport([FromQuery] RevenueReportRequestDto dto)
    {
        var result = await _billingService.GetDepositRevenueReportAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo sử dụng sổ thu chi
    /// </summary>
    [HttpGet("reports/cash-book-usage/{cashBookId}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<CashBookUsageReportDto>> GetCashBookUsageReport(
        Guid cashBookId,
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate)
    {
        var result = await _billingService.GetCashBookUsageReportAsync(cashBookId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// In báo cáo thu tiền ngoại trú
    /// </summary>
    [HttpPost("reports/outpatient-revenue/print")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<IActionResult> PrintOutpatientRevenueReport([FromBody] RevenueReportRequestDto dto)
    {
        var result = await _billingService.PrintOutpatientRevenueReportAsync(dto);
        return File(result, "application/pdf", "baocao_thutien_ngoaitru.pdf");
    }

    /// <summary>
    /// In báo cáo thu tiền nội trú
    /// </summary>
    [HttpPost("reports/inpatient-revenue/print")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<IActionResult> PrintInpatientRevenueReport([FromBody] RevenueReportRequestDto dto)
    {
        var result = await _billingService.PrintInpatientRevenueReportAsync(dto);
        return File(result, "application/pdf", "baocao_thutien_noitru.pdf");
    }

    /// <summary>
    /// In báo cáo thu tiền tạm ứng
    /// </summary>
    [HttpPost("reports/deposit-revenue/print")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<IActionResult> PrintDepositRevenueReport([FromBody] RevenueReportRequestDto dto)
    {
        var result = await _billingService.PrintDepositRevenueReportAsync(dto);
        return File(result, "application/pdf", "baocao_tamung.pdf");
    }

    // 10.4 Thống kê & BHYT

    /// <summary>
    /// Thống kê viện phí tổng hợp
    /// </summary>
    [HttpGet("statistics")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<BillingStatisticsDto>> GetBillingStatistics([FromQuery] BillingStatisticsRequestDto dto)
    {
        var result = await _billingService.GetBillingStatisticsAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo doanh thu theo ngày
    /// </summary>
    [HttpGet("statistics/daily/{date}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<DailyRevenueReportDto>> GetDailyRevenue(DateTime date)
    {
        var result = await _billingService.GetDailyRevenueAsync(date);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo doanh thu theo khoa/phòng
    /// </summary>
    [HttpGet("statistics/by-department")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<List<DepartmentRevenueDto>>> GetRevenueByDepartment([FromQuery] DepartmentRevenueRequestDto dto)
    {
        var result = await _billingService.GetRevenueByDepartmentAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Thống kê công nợ
    /// </summary>
    [HttpGet("statistics/debt")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<DebtStatisticsDto>> GetDebtStatistics([FromQuery] DateTime? asOfDate)
    {
        var result = await _billingService.GetDebtStatisticsAsync(asOfDate);
        return Ok(result);
    }

    /// <summary>
    /// Tạo dữ liệu giám định BHYT
    /// </summary>
    [HttpPost("insurance-claims/{medicalRecordId}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<InsuranceClaimDto>> GenerateInsuranceClaim(Guid medicalRecordId)
    {
        var result = await _billingService.GenerateInsuranceClaimAsync(medicalRecordId);
        return Ok(result);
    }

    /// <summary>
    /// Tạo file XML 4210
    /// </summary>
    [HttpPost("insurance-claims/xml-4210")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<Xml4210ResultDto>> GenerateXml4210([FromBody] GenerateXml4210RequestDto dto)
    {
        var result = await _billingService.GenerateXml4210Async(dto);
        return Ok(result);
    }

    /// <summary>
    /// Thống kê giám định BHYT
    /// </summary>
    [HttpGet("insurance-claims/statistics")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<InsuranceClaimStatisticsDto>> GetInsuranceClaimStatistics(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate)
    {
        var result = await _billingService.GetInsuranceClaimStatisticsAsync(fromDate, toDate);
        return Ok(result);
    }

    // 10.5 Đảo bút toán dịch vụ

    /// <summary>
    /// Đảo bút toán khi hủy dịch vụ đã thu tiền
    /// </summary>
    [HttpPost("reverse-charge")]
    public async Task<IActionResult> ReverseServiceCharge([FromBody] ReverseServiceChargeDto dto)
    {
        try
        {
            var result = await _billingService.ReverseServiceChargeAsync(dto, GetUserId());
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "VALIDATION_FAILED", message = ex.Message });
        }
    }

    /// <summary>
    /// Lấy lịch sử đảo bút toán
    /// </summary>
    [HttpGet("reversal-history")]
    public async Task<IActionResult> GetReversalHistory(
        [FromQuery] Guid? medicalRecordId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var result = await _billingService.GetReversalHistoryAsync(medicalRecordId, fromDate, toDate);
        return Ok(result);
    }
}
