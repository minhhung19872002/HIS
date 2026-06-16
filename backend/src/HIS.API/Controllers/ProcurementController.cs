using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.Procurement;
using HIS.Application.Interfaces;
using System.Security.Claims;

namespace HIS.API.Controllers;

/// <summary>
/// Workflow đề xuất – dự trù – tờ trình – duyệt mua sắm tài sản / vật tư (#108)
/// Route: api/procurement
/// Role duyệt: TODO — khi có role claim bổ sung [Authorize(Roles = "Admin,Director,Procurement")]
/// </summary>
[ApiController]
[Route("api/asset-procurement")]
[Authorize]
public class AssetProcurementController : ControllerBase
{
    private readonly IAssetProcurementService _service;

    public AssetProcurementController(IAssetProcurementService service)
    {
        _service = service;
    }

    private string? GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);

    // ── GET list ─────────────────────────────────────────────────────────────

    [HttpGet("requests")]
    public async Task<ActionResult<AssetProcurementPagedResult>> GetList(
        [FromQuery] string? keyword = null,
        [FromQuery] int? status = null,
        [FromQuery] int? requestType = null,
        [FromQuery] Guid? departmentId = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null,
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 30)
    {
        var filter = new AssetProcurementSearchDto
        {
            Keyword      = keyword,
            Status       = status,
            RequestType  = requestType,
            DepartmentId = departmentId,
            FromDate     = fromDate,
            ToDate       = toDate,
            PageIndex    = pageIndex,
            PageSize     = pageSize,
        };
        return Ok(await _service.GetListAsync(filter));
    }

    // ── GET detail kèm items ──────────────────────────────────────────────────

    [HttpGet("requests/{id}")]
    public async Task<ActionResult<AssetProcurementRequestDto>> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    // ── POST create / update (upsert) ─────────────────────────────────────────

    [HttpPost("requests")]
    public async Task<ActionResult<AssetProcurementRequestDto>> Save([FromBody] SaveAssetProcurementRequestDto dto)
    {
        try
        {
            return Ok(await _service.SaveAsync(dto, GetUserId()));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    [HttpDelete("requests/{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        try
        {
            var ok = await _service.DeleteAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // ── SUBMIT (trình duyệt) ──────────────────────────────────────────────────

    [HttpPost("requests/{id}/submit")]
    public async Task<ActionResult<AssetProcurementRequestDto>> Submit(Guid id)
    {
        try
        {
            return Ok(await _service.SubmitAsync(id, GetUserId()));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // ── APPROVE ───────────────────────────────────────────────────────────────
    [Authorize(Roles = "Admin,Director,WarehouseManager")] // #156: duyệt mua sắm = tiền/quyền → siết role
    [HttpPost("requests/approve")]
    public async Task<ActionResult<AssetProcurementRequestDto>> Approve([FromBody] ApproveRejectAssetProcurementDto dto)
    {
        try
        {
            return Ok(await _service.ApproveAsync(dto, GetUserId()));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // ── REJECT ────────────────────────────────────────────────────────────────
    [Authorize(Roles = "Admin,Director,WarehouseManager")] // #156: từ chối mua sắm = quyền duyệt
    [HttpPost("requests/reject")]
    public async Task<ActionResult<AssetProcurementRequestDto>> Reject([FromBody] ApproveRejectAssetProcurementDto dto)
    {
        try
        {
            return Ok(await _service.RejectAsync(dto, GetUserId()));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // ── COMPLETE ──────────────────────────────────────────────────────────────

    [HttpPost("requests/{id}/complete")]
    public async Task<ActionResult<AssetProcurementRequestDto>> Complete(Guid id)
    {
        try
        {
            return Ok(await _service.CompleteAsync(id, GetUserId()));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
