using System.Security.Claims;
using HIS.Application.DTOs.Pharmacy;
using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Workflow phê duyệt cấp phát kho Dược — 5 loại phiếu:
/// 1=Duyệt cấp theo kho dự trù, 2=Duyệt cấp theo BN, 3=Duyệt bù tủ trực,
/// 4=Duyệt cấp hao phí khoa, 5=Duyệt hoàn trả.
/// </summary>
[ApiController]
[Route("api/pharmacy-approval")]
[Authorize]
public class PharmacyApprovalController : ControllerBase
{
    private readonly IPharmacyApprovalService _service;

    public PharmacyApprovalController(IPharmacyApprovalService service)
    {
        _service = service;
    }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    [HttpPost]
    public async Task<ActionResult<PharmacyApprovalDto>> Create([FromBody] CreatePharmacyApprovalDto dto)
        => Ok(await _service.CreateAsync(dto, GetUserId()));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PharmacyApprovalDto>> Update(Guid id, [FromBody] CreatePharmacyApprovalDto dto)
        => Ok(await _service.UpdateAsync(id, dto, GetUserId()));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteDraft(Guid id)
    {
        var ok = await _service.DeleteDraftAsync(id, GetUserId());
        return Ok(new { success = ok });
    }

    [HttpPost("submit")]
    public async Task<ActionResult<PharmacyApprovalDto>> Submit([FromBody] SubmitApprovalDto dto)
        => Ok(await _service.SubmitAsync(dto, GetUserId()));

    [HttpPost("approve")]
    [Authorize(Roles = "Admin,Pharmacist,PharmacyHead")]
    public async Task<ActionResult<PharmacyApprovalDto>> Approve([FromBody] ApproveDto dto)
        => Ok(await _service.ApproveAsync(dto, GetUserId()));

    [HttpPost("revoke")]
    [Authorize(Roles = "Admin,Pharmacist,PharmacyHead")]
    public async Task<ActionResult<PharmacyApprovalDto>> Revoke([FromBody] RevokeApprovalDto dto)
        => Ok(await _service.RevokeAsync(dto, GetUserId()));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PharmacyApprovalDto>> GetById(Guid id)
    {
        var r = await _service.GetByIdAsync(id);
        return r == null ? NotFound() : Ok(r);
    }

    [HttpGet]
    public async Task<ActionResult<PharmacyApprovalSearchResultDto>> Search([FromQuery] PharmacyApprovalSearchDto dto)
        => Ok(await _service.SearchAsync(dto));

    [HttpGet("expiring-medicines")]
    public async Task<ActionResult<List<ExpiringMedicineDto>>> GetExpiring([FromQuery] int daysAhead = 60)
        => Ok(await _service.GetExpiringMedicinesAsync(daysAhead));
}
