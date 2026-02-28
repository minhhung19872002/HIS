using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Infrastructure.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/sms")]
[Authorize]
public class SmsController : ControllerBase
{
    private readonly ISmsService _smsService;

    public SmsController(ISmsService smsService)
    {
        _smsService = smsService;
    }

    [HttpGet("balance")]
    public async Task<IActionResult> GetBalance()
    {
        var result = await _smsService.GetBalanceAsync();
        return Ok(result);
    }

    [HttpPost("test")]
    public async Task<IActionResult> TestConnection()
    {
        var result = await _smsService.TestConnectionAsync();
        return Ok(new { success = result });
    }

    [HttpPost("send-test")]
    public async Task<IActionResult> SendTestSms([FromBody] SendTestSmsDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.PhoneNumber))
            return BadRequest(new { message = "Vui lòng nhập số điện thoại" });

        var result = await _smsService.SendSmsAsync(dto.PhoneNumber, dto.Message ?? "Tin nhan thu nghiem tu HIS. Neu nhan duoc tin nay, SMS Gateway da hoat dong thanh cong.");
        return Ok(new { success = result, phone = dto.PhoneNumber });
    }
}

public class SendTestSmsDto
{
    public string PhoneNumber { get; set; } = string.Empty;
    public string? Message { get; set; }
}
