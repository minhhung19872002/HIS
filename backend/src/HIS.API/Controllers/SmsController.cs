using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Infrastructure.Services;
using HIS.API.Dtos.Sms;
using HIS.API.Authorization;
using HIS.Core.Constants;

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

    // QA-R11: the reads were open to any logged-in role (Integration.Read is seeded to every role) — the log holds
    // patient names, phone numbers and result texts (and would hold OTP codes). Same permission as the
    // /v2/sms-management page (System.Configure); the writes keep the WritePermissionMap rule.
    [HttpGet("balance")]
    [RequirePermission(PermissionCatalog.System.Configure)]
    public async Task<IActionResult> GetBalance()
    {
        var result = await _smsService.GetBalanceAsync();
        return Ok(result);
    }

    [HttpPost("test")]
    public async Task<IActionResult> TestConnection()
    {
        var result = await _smsService.TestConnectionAsync();
        return Ok(result);
    }

    [HttpPost("send-test")]
    public async Task<IActionResult> SendTestSms([FromBody] SendTestSmsDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.PhoneNumber))
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Vui lòng nhập số điện thoại" });

        var result = await _smsService.SendSmsAsync(
            dto.PhoneNumber,
            dto.Message ?? "Tin nhan thu nghiem tu HIS. Neu nhan duoc tin nay, SMS Gateway da hoat dong thanh cong.",
            "Test");
        return Ok(result);
    }

    [HttpGet("logs")]
    [RequirePermission(PermissionCatalog.System.Configure)]
    public async Task<IActionResult> GetLogs([FromQuery] SmsLogSearchDto search)
    {
        var result = await _smsService.GetSmsLogsAsync(search);
        return Ok(result);
    }

    [HttpGet("stats")]
    [RequirePermission(PermissionCatalog.System.Configure)]
    public async Task<IActionResult> GetStats([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var result = await _smsService.GetSmsStatsAsync(fromDate, toDate);
        return Ok(result);
    }
}

