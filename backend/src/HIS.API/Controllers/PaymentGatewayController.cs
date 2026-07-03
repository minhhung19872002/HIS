using System.Security.Claims;
using HIS.Core.Constants;
using HIS.Application.DTOs.Payment;
using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Thanh toán không dùng tiền mặt qua VNPay / MoMo / ZaloPay.
/// IPN webhook và Return URL để AllowAnonymous vì gateway gọi từ server họ.
/// </summary>
[ApiController]
[Route("api/payment")]
// NangCap25: map InvalidOperationException (business guard "đã thanh toán", "không còn nợ"...)
// → 400 INVALID_STATE thay vì 500; ArgumentException → 400; KeyNotFoundException → 404.
[TypeFilter(typeof(HIS.API.Filters.DomainExceptionFilter))]
public class PaymentGatewayController : ControllerBase
{
    private readonly IPaymentGatewayService _service;
    private readonly IRefundDisbursementService _disbursementService;

    public PaymentGatewayController(
        IPaymentGatewayService service,
        IRefundDisbursementService disbursementService)
    {
        _service = service;
        _disbursementService = disbursementService;
    }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    private string GetClientIp() =>
        HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

    [HttpPost("create-url")]
    [Authorize]
    public async Task<ActionResult<PaymentUrlResponseDto>> CreateUrl([FromBody] CreatePaymentUrlDto dto)
    {
        try
        {
            var result = await _service.CreatePaymentUrlAsync(dto, GetClientIp(), GetUserId());
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            // Input không hợp lệ (provider/amount sai) → 400 thay vì 500
            return BadRequest(new { error = "VALIDATION_FAILED", message = ex.Message });
        }
    }

    [HttpGet("vnpay/return")]
    [AllowAnonymous]
    public async Task<IActionResult> VnPayReturn()
    {
        var q = Request.Query.ToDictionary(x => x.Key, x => x.Value.ToString());
        var result = await _service.HandleVnPayReturnAsync(q);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpGet("vnpay/ipn")]
    [AllowAnonymous]
    public async Task<IActionResult> VnPayIpn()
    {
        var q = Request.Query.ToDictionary(x => x.Key, x => x.Value.ToString());
        var result = await _service.HandleVnPayIpnAsync(q);
        return Ok(result);
    }

    [HttpPost("momo/ipn")]
    [AllowAnonymous]
    public async Task<IActionResult> MoMoIpn([FromBody] Dictionary<string, object> body)
    {
        var result = await _service.HandleMoMoIpnAsync(body);
        return Ok(result);
    }

    [HttpPost("zalopay/callback")]
    [AllowAnonymous]
    public async Task<IActionResult> ZaloPayCallback([FromBody] Dictionary<string, object> body)
    {
        var result = await _service.HandleZaloPayCallbackAsync(body);
        return Ok(new { return_code = result.RspCode == "00" ? 1 : -1, return_message = result.Message });
    }

    [HttpGet("transactions/{id:guid}")]
    [Authorize]
    public async Task<ActionResult<PaymentTransactionDto>> GetById(Guid id)
    {
        var t = await _service.GetTransactionByIdAsync(id);
        return t == null ? NotFound() : Ok(t);
    }

    [HttpGet("transactions/by-ref/{txnRef}")]
    [Authorize]
    public async Task<ActionResult<PaymentTransactionDto>> GetByRef(string txnRef)
    {
        var t = await _service.GetTransactionByRefAsync(txnRef);
        return t == null ? NotFound() : Ok(t);
    }

    [HttpGet("transactions")]
    [Authorize]
    public async Task<ActionResult<PaymentSearchResultDto>> Search([FromQuery] PaymentSearchDto dto)
    {
        var r = await _service.SearchAsync(dto);
        return Ok(r);
    }

    [HttpPost("refund")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<PaymentTransactionDto>> Refund([FromBody] PaymentRefundDto dto)
    {
        var t = await _service.RefundAsync(dto, GetUserId());
        return Ok(t);
    }

    [HttpGet("stats")]
    [Authorize]
    public async Task<ActionResult<PaymentStatsDto>> Stats(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] string? provider)
    {
        var s = await _service.GetStatsAsync(fromDate, toDate, provider);
        return Ok(s);
    }

    [HttpPost("mark-expired")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<IActionResult> MarkExpired()
    {
        var changed = await _service.MarkExpiredAsync();
        return Ok(new { changed });
    }

    /// <summary>
    /// Xác nhận thủ công giao dịch ngân hàng (BIDV/VCB/Agribank/Vietinbank/MSB).
    /// Khi BV chưa có merchant API, kế toán đối soát sao kê và confirm.
    /// </summary>
    [HttpPost("bank/confirm")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant + "," + RoleNames.Cashier)]
    public async Task<ActionResult<PaymentTransactionDto>> ConfirmBankTransfer([FromBody] BankConfirmDto dto)
    {
        var result = await _service.ConfirmBankTransferAsync(dto, GetUserId());
        return Ok(result);
    }

    // ===== NangCap25: QR động theo ngữ cảnh nghiệp vụ =====

    /// <summary>
    /// Sinh QR động Vietcombank gắn nguồn nghiệp vụ: chỉ định CLS (service-request),
    /// đơn thuốc (prescription), bán lẻ quầy thuốc (retail-sale), tạm ứng nội trú (deposit),
    /// thanh toán ra viện (discharge). Số tiền do BE tự tính từ bản ghi nguồn.
    /// </summary>
    [HttpPost("qr/dynamic")]
    [Authorize]
    public async Task<ActionResult<PaymentUrlResponseDto>> CreateDynamicQr([FromBody] DynamicQrRequestDto dto)
    {
        // Argument/InvalidOperation exceptions → 400 qua DomainExceptionFilter (controller-level)
        var result = await _service.CreateDynamicQrAsync(dto, GetClientIp(), GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Kiosk tự phục vụ: xác thực mã BN + ngày sinh → danh sách khoản chờ thanh toán + QR gộp.
    /// AllowAnonymous vì kiosk không đăng nhập (như KioskController); không lộ chi tiết dịch vụ.
    /// </summary>
    [HttpPost("kiosk/qr")]
    [AllowAnonymous]
    public async Task<ActionResult<KioskQrResponseDto>> CreateKioskQr([FromBody] KioskQrRequestDto dto)
    {
        var result = await _service.CreateKioskQrAsync(dto, GetClientIp());
        return Ok(result);
    }

    /// <summary>
    /// Kiosk poll trạng thái giao dịch — AllowAnonymous nhưng CHỈ trả status (không lộ chi tiết).
    /// </summary>
    [HttpGet("kiosk/qr-status/{transactionId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> KioskQrStatus(Guid transactionId)
    {
        var t = await _service.GetTransactionByIdAsync(transactionId);
        if (t == null) return NotFound();
        return Ok(new { status = t.Status, statusText = t.StatusText });
    }

    /// <summary>VI.1 — Báo cáo tài chính giao dịch QR ngân hàng (ghi rõ người tạo mã QR).</summary>
    [HttpGet("reports/qr-finance")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<QrFinanceReportDto>> QrFinanceReport(
        [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
    {
        var r = await _service.GetQrFinanceReportAsync(fromDate, toDate);
        return Ok(r);
    }

    /// <summary>VI.2 — Báo cáo đối soát giao dịch QR với ngân hàng.</summary>
    [HttpGet("reports/bank-reconciliation")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<BankReconciliationReportDto>> BankReconciliation(
        [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate, [FromQuery] string? bankCode)
    {
        var r = await _service.GetBankReconciliationAsync(fromDate, toDate, bankCode);
        return Ok(r);
    }

    // ===== NangCap25 IV: Chi hộ hoàn tiền thừa =====

    [HttpPost("disbursement")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<RefundDisbursementDto>> CreateDisbursement([FromBody] CreateRefundDisbursementDto dto)
    {
        var r = await _disbursementService.CreateAsync(dto, GetUserId());
        return Ok(r);
    }

    [HttpPost("disbursement/{id:guid}/execute")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<RefundDisbursementDto>> ExecuteDisbursement(Guid id)
    {
        var r = await _disbursementService.ExecuteAsync(id, GetUserId());
        return Ok(r);
    }

    [HttpPost("disbursement/{id:guid}/cancel")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<RefundDisbursementDto>> CancelDisbursement(Guid id, [FromBody] CancelDisbursementDto? body)
    {
        var r = await _disbursementService.CancelAsync(id, body?.Reason, GetUserId());
        return Ok(r);
    }

    [HttpGet("disbursement/{id:guid}")]
    [Authorize]
    public async Task<ActionResult<RefundDisbursementDto>> GetDisbursement(Guid id)
    {
        var r = await _disbursementService.GetByIdAsync(id);
        return r == null ? NotFound() : Ok(r);
    }

    [HttpGet("disbursement")]
    [Authorize]
    public async Task<ActionResult<RefundDisbursementSearchResultDto>> SearchDisbursements(
        [FromQuery] RefundDisbursementSearchDto dto)
    {
        var r = await _disbursementService.SearchAsync(dto);
        return Ok(r);
    }

    /// <summary>
    /// Lấy danh sách 5 ngân hàng VN qua VietQR + BIN code.
    /// </summary>
    [HttpGet("bank/list")]
    [Authorize]
    public IActionResult ListSupportedBanks()
    {
        var banks = new[]
        {
            new { code = "bidv", name = "Ngân hàng BIDV", shortName = "BIDV", bin = "970418", color = "#00754A" },
            new { code = "vcb", name = "Vietcombank", shortName = "VCB", bin = "970436", color = "#007934" },
            new { code = "agribank", name = "Agribank", shortName = "Agribank", bin = "970405", color = "#940202" },
            new { code = "vietinbank", name = "VietinBank", shortName = "VietinBank", bin = "970415", color = "#005DAA" },
            new { code = "msb", name = "MSB", shortName = "MSB", bin = "970426", color = "#E60012" }
        };
        return Ok(banks);
    }
}
