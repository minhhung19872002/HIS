using HIS.Application.Interfaces;
using HIS.API.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// 7 báo cáo thanh toán theo chuẩn MQ Solutions — N1.03.
/// </summary>
[ApiController]
[Route("api/payment-reports")]
[Authorize]
public class PaymentReportsController : ControllerBase
{
    private readonly IPaymentReportsService _svc;
    public PaymentReportsController(IPaymentReportsService svc) { _svc = svc; }

    /// <summary>BC1 — Tạm ứng VNPay/MoMo/ZaloPay</summary>
    [HttpGet("deposit-gateway")]
    public async Task<IActionResult> DepositGateway(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, [FromQuery] string? provider)
        => (await _svc.DepositGatewayAsync(fromDate, toDate, provider)).ToActionResult();

    /// <summary>BC2 — Thu tiền theo ngày tổng hợp</summary>
    [HttpGet("daily-summary")]
    public async Task<IActionResult> DailySummary(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        => (await _svc.DailySummaryAsync(fromDate, toDate)).ToActionResult();

    /// <summary>BC3 — Thu tiền theo ngày chi tiết (mỗi phiếu 1 dòng)</summary>
    [HttpGet("daily-detail")]
    public async Task<IActionResult> DailyDetail(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] Guid? cashierId, [FromQuery] int? paymentMethod)
        => (await _svc.DailyDetailAsync(fromDate, toDate, cashierId, paymentMethod)).ToActionResult();

    /// <summary>BC4 — HDDT sự nghiệp (BHYT + nguồn NS)</summary>
    [HttpGet("einvoice-budget")]
    public async Task<IActionResult> EInvoiceBudget(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        => (await _svc.EInvoiceBudgetAsync(fromDate, toDate)).ToActionResult();

    /// <summary>BC5 — HDDT dịch vụ (Thu phí + Dịch vụ)</summary>
    [HttpGet("einvoice-service")]
    public async Task<IActionResult> EInvoiceService(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        => (await _svc.EInvoiceServiceAsync(fromDate, toDate)).ToActionResult();

    /// <summary>BC6 — Viện phí chi tiết (theo từng dòng dịch vụ)</summary>
    [HttpGet("billing-detail")]
    public async Task<IActionResult> BillingDetail(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] Guid? patientId)
        => (await _svc.BillingDetailAsync(fromDate, toDate, patientId)).ToActionResult();

    /// <summary>BC7 — Hoàn trả biên lai VNPay</summary>
    [HttpGet("refund-gateway")]
    public async Task<IActionResult> RefundGateway(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        => (await _svc.RefundGatewayAsync(fromDate, toDate)).ToActionResult();

    /// <summary>BC8 — Báo cáo nhà thuốc (doanh thu bán lẻ thuốc)</summary>
    [HttpGet("pharmacy-retail")]
    public async Task<IActionResult> PharmacyRetail(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] string? paymentMethod)
        => (await _svc.PharmacyRetailAsync(fromDate, toDate, paymentMethod)).ToActionResult();
}
