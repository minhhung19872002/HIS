using HIS.Application.DTOs.Billing;
using HIS.Core.Constants;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HIS.API.Controllers;

/// <summary>
/// Bảo lãnh viện phí: CRUD đơn vị bảo lãnh (SponsorOrg) + gán bảo lãnh + báo cáo công nợ.
/// TODO role-guard: thêm [Authorize(Roles=RoleNames.Accountant + "," + RoleNames.Cashier)] khi role enum ổn định.
/// </summary>
[ApiController]
[Route("api/billing-guarantor")]
[Authorize]
public class BillingGuarantorController : ControllerBase
{
    private readonly IBillingGuarantorService _svc;

    public BillingGuarantorController(IBillingGuarantorService svc) => _svc = svc;

    private string? UserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                              ?? User.FindFirst("sub")?.Value;

    // ─── SponsorOrg ──────────────────────────────────────────────────────────

    [HttpGet("sponsor-orgs")]
    public async Task<IActionResult> GetSponsorOrgs([FromQuery] string? keyword) =>
        Ok(await _svc.GetSponsorOrgsAsync(keyword));

    [HttpPost("sponsor-orgs")]
    public async Task<IActionResult> SaveSponsorOrg([FromBody] SponsorOrgDto dto) =>
        Ok(await _svc.SaveSponsorOrgAsync(dto, UserId));

    [HttpDelete("sponsor-orgs/{id:guid}")]
    public async Task<IActionResult> DeleteSponsorOrg(Guid id) =>
        await _svc.DeleteSponsorOrgAsync(id) ? Ok() : NotFound();

    // ─── BillingGuarantor ────────────────────────────────────────────────────

    [HttpGet("guarantors")]
    public async Task<IActionResult> GetGuarantors(
        [FromQuery] Guid? patientId,
        [FromQuery] Guid? medicalRecordId,
        [FromQuery] string? keyword) =>
        Ok(await _svc.GetGuarantorsAsync(patientId, medicalRecordId, keyword));

    [HttpPost("guarantors")]
    public async Task<IActionResult> SaveGuarantor([FromBody] BillingGuarantorDto dto)
    {
        try { return Ok(await _svc.SaveGuarantorAsync(dto, UserId)); }
        catch (ArgumentException ex) { return BadRequest(ex.Message); }
    }

    [HttpDelete("guarantors/{id:guid}")]
    public async Task<IActionResult> DeleteGuarantor(Guid id) =>
        await _svc.DeleteGuarantorAsync(id) ? Ok() : NotFound();

    // ─── Debt report ─────────────────────────────────────────────────────────

    [HttpGet("debt-report")]
    public async Task<IActionResult> GetDebtReport(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to) =>
        Ok(await _svc.GetDebtByOrgAsync(from, to));
}
