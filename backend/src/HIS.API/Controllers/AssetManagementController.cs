using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.Asset;
using HIS.Application.Services;
using System.Security.Claims;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/asset-management")]
[Authorize]
public class AssetManagementController : ControllerBase
{
    private readonly IAssetManagementService _service;

    public AssetManagementController(IAssetManagementService service)
    {
        _service = service;
    }

    private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";

    // ===== TENDERS =====

    [HttpGet("tenders")]
    public async Task<ActionResult<AssetPagedResult<TenderDto>>> GetTenders(
        [FromQuery] string? keyword = null, [FromQuery] int? status = null, [FromQuery] int? tenderType = null,
        [FromQuery] string? fromDate = null, [FromQuery] string? toDate = null,
        [FromQuery] int pageIndex = 0, [FromQuery] int pageSize = 20)
    {
        var filter = new TenderSearchDto { Keyword = keyword, Status = status, TenderType = tenderType, FromDate = fromDate, ToDate = toDate, PageIndex = pageIndex, PageSize = pageSize };
        return Ok(await _service.GetTendersAsync(filter));
    }

    [HttpGet("tenders/{id}")]
    public async Task<ActionResult<TenderDto>> GetTenderById(Guid id)
    {
        var result = await _service.GetTenderByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("tenders")]
    public async Task<ActionResult<TenderDto>> SaveTender([FromBody] SaveTenderDto dto)
    {
        return Ok(await _service.SaveTenderAsync(dto, GetUserId()));
    }

    [HttpGet("tenders/{tenderId}/items")]
    public async Task<ActionResult<List<TenderItemDto>>> GetTenderItems(Guid tenderId)
    {
        return Ok(await _service.GetTenderItemsAsync(tenderId));
    }

    [HttpPost("tender-items")]
    public async Task<ActionResult<TenderItemDto>> SaveTenderItem([FromBody] SaveTenderItemDto dto)
    {
        return Ok(await _service.SaveTenderItemAsync(dto, GetUserId()));
    }

    [HttpPost("tenders/award")]
    public async Task<ActionResult<TenderDto>> AwardTender([FromBody] AwardTenderDto dto)
    {
        return Ok(await _service.AwardTenderAsync(dto, GetUserId()));
    }

    // ===== FIXED ASSETS =====

    [HttpGet("assets")]
    public async Task<ActionResult<AssetPagedResult<FixedAssetDto>>> GetAssets(
        [FromQuery] string? keyword = null, [FromQuery] Guid? departmentId = null,
        [FromQuery] int? status = null, [FromQuery] string? assetGroupId = null,
        [FromQuery] int pageIndex = 0, [FromQuery] int pageSize = 20)
    {
        var filter = new AssetSearchDto { Keyword = keyword, DepartmentId = departmentId, Status = status, AssetGroupId = assetGroupId, PageIndex = pageIndex, PageSize = pageSize };
        return Ok(await _service.GetAssetsAsync(filter));
    }

    [HttpGet("assets/{id}")]
    public async Task<ActionResult<FixedAssetDto>> GetAssetById(Guid id)
    {
        var result = await _service.GetAssetByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("assets")]
    public async Task<ActionResult<FixedAssetDto>> SaveAsset([FromBody] SaveFixedAssetDto dto)
    {
        return Ok(await _service.SaveAssetAsync(dto, GetUserId()));
    }

    [HttpPost("assets/{id}/qr-code")]
    public async Task<ActionResult<string>> GenerateQrCode(Guid id)
    {
        return Ok(await _service.GenerateQrCodeAsync(id));
    }

    [HttpGet("assets/{id}/history")]
    public async Task<ActionResult<List<AssetHistoryDto>>> GetAssetHistory(Guid id)
    {
        return Ok(await _service.GetAssetHistoryAsync(id));
    }

    // ===== HANDOVER =====

    [HttpGet("handovers")]
    public async Task<ActionResult<AssetPagedResult<AssetHandoverDto>>> GetHandovers(
        [FromQuery] Guid? fixedAssetId = null, [FromQuery] Guid? departmentId = null,
        [FromQuery] int? status = null, [FromQuery] int pageIndex = 0, [FromQuery] int pageSize = 20)
    {
        var filter = new HandoverSearchDto { FixedAssetId = fixedAssetId, DepartmentId = departmentId, Status = status, PageIndex = pageIndex, PageSize = pageSize };
        return Ok(await _service.GetHandoversAsync(filter));
    }

    [HttpPost("handovers")]
    public async Task<ActionResult<AssetHandoverDto>> SaveHandover([FromBody] SaveHandoverDto dto)
    {
        return Ok(await _service.SaveHandoverAsync(dto, GetUserId()));
    }

    [HttpPut("handovers/{id}/confirm")]
    public async Task<ActionResult<AssetHandoverDto>> ConfirmHandover(Guid id)
    {
        return Ok(await _service.ConfirmHandoverAsync(id, GetUserId()));
    }

    // ===== DISPOSAL =====

    [HttpGet("disposals")]
    public async Task<ActionResult<AssetPagedResult<AssetDisposalDto>>> GetDisposals(
        [FromQuery] int? status = null, [FromQuery] int? disposalType = null,
        [FromQuery] int pageIndex = 0, [FromQuery] int pageSize = 20)
    {
        var filter = new DisposalSearchDto { Status = status, DisposalType = disposalType, PageIndex = pageIndex, PageSize = pageSize };
        return Ok(await _service.GetDisposalsAsync(filter));
    }

    [HttpPost("disposals")]
    public async Task<ActionResult<AssetDisposalDto>> ProposeDisposal([FromBody] ProposeDisposalDto dto)
    {
        return Ok(await _service.ProposeDisposalAsync(dto, GetUserId()));
    }

    [HttpPut("disposals/{id}/approve")]
    public async Task<ActionResult<AssetDisposalDto>> ApproveDisposal(Guid id)
    {
        return Ok(await _service.ApproveDisposalAsync(id, GetUserId()));
    }

    [HttpPut("disposals/{id}/complete")]
    public async Task<ActionResult<AssetDisposalDto>> CompleteDisposal(Guid id)
    {
        return Ok(await _service.CompleteDisposalAsync(id, GetUserId()));
    }

    // ===== DEPRECIATION =====

    [HttpPost("depreciation/calculate")]
    public async Task<ActionResult<object>> CalculateMonthlyDepreciation([FromQuery] int month, [FromQuery] int year)
    {
        var count = await _service.CalculateMonthlyDepreciationAsync(month, year, GetUserId());
        return Ok(new { processedCount = count, month, year });
    }

    [HttpGet("depreciation/report")]
    public async Task<ActionResult<AssetPagedResult<DepreciationReportDto>>> GetDepreciationReport(
        [FromQuery] int? month = null, [FromQuery] int? year = null, [FromQuery] Guid? departmentId = null,
        [FromQuery] int pageIndex = 0, [FromQuery] int pageSize = 50)
    {
        var filter = new DepreciationFilterDto { Month = month, Year = year, DepartmentId = departmentId, PageIndex = pageIndex, PageSize = pageSize };
        return Ok(await _service.GetDepreciationReportAsync(filter));
    }

    // ===== DASHBOARD =====

    [HttpGet("dashboard")]
    public async Task<ActionResult<AssetDashboardDto>> GetDashboard()
    {
        return Ok(await _service.GetAssetDashboardAsync());
    }
}
