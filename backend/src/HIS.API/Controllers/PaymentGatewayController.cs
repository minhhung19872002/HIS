using System.Security.Claims;
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
public class PaymentGatewayController : ControllerBase
{
    private readonly IPaymentGatewayService _service;

    public PaymentGatewayController(IPaymentGatewayService service)
    {
        _service = service;
    }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    private string GetClientIp() =>
        HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

    [HttpPost("create-url")]
    [Authorize]
    public async Task<ActionResult<PaymentUrlResponseDto>> CreateUrl([FromBody] CreatePaymentUrlDto dto)
    {
        var result = await _service.CreatePaymentUrlAsync(dto, GetClientIp(), GetUserId());
        return Ok(result);
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
    [Authorize(Roles = "Admin,Accountant")]
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
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> MarkExpired()
    {
        var changed = await _service.MarkExpiredAsync();
        return Ok(new { changed });
    }
}
