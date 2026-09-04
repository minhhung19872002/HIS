using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.Procurement;
using HIS.Application.Interfaces;
using System.Security.Claims;

namespace HIS.API.Controllers;

/// <summary>
/// Workflow đề xuất – dự trù – tờ trình – duyệt mua sắm tài sản / vật tư (#108)
/// Route: api/procurement
/// Role duyệt: TODO — khi có role claim bổ sung [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Director + "," + RoleNames.Procurement)]
/// </summary>
[ApiController]
[Route("api/asset-procurement")]
[TypeFilter(typeof(Filters.DomainExceptionFilter))] // #219/T4: guard nghiep vu ra 400/404 kem ly do, khong phai 500 tran
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

    // ── ISSUE (cấp phát tài sản cho phiếu Trang cấp) — NangCap26 XVII.4 ───────
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Director + "," + RoleNames.WarehouseManager)]
    [HttpPost("requests/{id}/issue")]
    public async Task<ActionResult<AssetProcurementRequestDto>> Issue(Guid id, [FromBody] IssueAssetsRequest req)
    {
        try
        {
            return Ok(await _service.IssueAssetsAsync(id, req?.FixedAssetIds ?? new List<Guid>(), GetUserId()));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    public class IssueAssetsRequest { public List<Guid> FixedAssetIds { get; set; } = new(); }

    // ── APPROVE ───────────────────────────────────────────────────────────────
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Director + "," + RoleNames.WarehouseManager)] // #156: duyệt mua sắm = tiền/quyền → siết role
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
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Director + "," + RoleNames.WarehouseManager)] // #156: từ chối mua sắm = quyền duyệt
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
