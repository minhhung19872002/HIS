using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.DTOs.PharmacyEnhancement;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using HIS.Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/pharmacy")]
[Authorize]
public class PharmacyEnhancementController : ControllerBase
{
    private readonly IPharmacyEnhancementService _svc;
    public PharmacyEnhancementController(IPharmacyEnhancementService svc) => _svc = svc;

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    // ========== Login-time Expiry Alerts ==========

    [HttpGet("expiry-alerts/on-login")]
    public async Task<IActionResult> GetExpiryAlertsOnLogin()
        => (await _svc.GetExpiryAlertsOnLoginAsync()).ToActionResult();

    [HttpPut("expiry-alerts/{id:guid}/acknowledge")]
    public async Task<IActionResult> AcknowledgeExpiryAlert(Guid id)
        => (await _svc.AcknowledgeExpiryAlertAsync(id, GetUserId())).ToActionResult();

    // ========== Compounding Orders (Pha chế trung tâm) ==========

    [HttpGet("compounding")]
    public async Task<IActionResult> GetCompoundingOrders([FromQuery] int? status, [FromQuery] Guid? departmentId)
        => (await _svc.GetCompoundingOrdersAsync(status, departmentId)).ToActionResult();

    [HttpGet("compounding/{id:guid}")]
    public async Task<IActionResult> GetCompoundingOrder(Guid id)
        => (await _svc.GetCompoundingOrderAsync(id)).ToActionResult();

    [HttpPost("compounding")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Pharmacist + "," + RoleNames.PharmacyHead)]
    public async Task<IActionResult> CreateCompoundingOrder([FromBody] CompoundingOrder dto)
        => (await _svc.CreateCompoundingOrderAsync(dto, GetUserId())).ToActionResult();

    [HttpPut("compounding/{id:guid}/start")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Pharmacist + "," + RoleNames.PharmacyHead)]
    public async Task<IActionResult> StartCompounding(Guid id)
        => (await _svc.StartCompoundingAsync(id, GetUserId())).ToActionResult();

    [HttpPut("compounding/{id:guid}/complete")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Pharmacist + "," + RoleNames.PharmacyHead)]
    public async Task<IActionResult> CompleteCompounding(Guid id)
        => (await _svc.CompleteCompoundingAsync(id, GetUserId())).ToActionResult();

    [HttpPut("compounding/{id:guid}/cancel")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Pharmacist + "," + RoleNames.PharmacyHead)]
    public async Task<IActionResult> CancelCompounding(Guid id, [FromBody] CancelReasonDto dto)
        => (await _svc.CancelCompoundingAsync(id, dto, GetUserId())).ToActionResult();
}
