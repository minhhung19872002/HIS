using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.DTOs.BhxhConfig;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Cấu hình BHXH Gateway + Test tools — N1.19.
/// Persist trong SystemConfig với prefix "BHXH.". Masked password khi trả về.
/// </summary>
[ApiController]
[Route("api/bhxh-config")]
[Authorize]
public class BhxhConfigController : ControllerBase
{
    private readonly IBhxhConfigService _svc;
    public BhxhConfigController(IBhxhConfigService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    [HttpGet]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant + "," + RoleNames.InsuranceManager)]
    public async Task<IActionResult> Get()
        => (await _svc.GetAsync()).ToActionResult();

    [HttpPost]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.InsuranceManager)]
    public async Task<IActionResult> Save([FromBody] BhxhConfigDto dto)
        => (await _svc.SaveAsync(dto, GetUserId())).ToActionResult();

    /// <summary>Test ping GatewayUrl — không cần auth với BHXH, chỉ kiểm tra reachable.</summary>
    [HttpPost("test-connection")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.InsuranceManager)]
    public async Task<IActionResult> TestConnection()
        => (await _svc.TestConnectionAsync()).ToActionResult();

    /// <summary>Test authenticate — lấy access_token từ TokenUrl.</summary>
    [HttpPost("test-auth")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.InsuranceManager)]
    public async Task<IActionResult> TestAuth()
        => (await _svc.TestAuthAsync()).ToActionResult();

    /// <summary>Test submit XML thô tới gateway — dry-run.</summary>
    [HttpPost("test-submit-xml")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.InsuranceManager)]
    public async Task<IActionResult> TestSubmitXml([FromBody] TestSubmitXmlDto dto)
        => (await _svc.TestSubmitXmlAsync(dto)).ToActionResult();
}
