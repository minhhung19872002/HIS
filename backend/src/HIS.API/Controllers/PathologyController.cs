using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.API.Authorization;
using HIS.Core.Constants;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequirePermission(PermissionCatalog.LabResult.Read)] // #464: enforce permission — [Authorize] alone allowed any authenticated user
public class PathologyController : ControllerBase
{
    private readonly IPathologyService _pathologyService;

    public PathologyController(IPathologyService pathologyService)
    {
        _pathologyService = pathologyService;
    }

    [HttpGet("requests")]
    public async Task<ActionResult<List<PathologyRequestDto>>> GetPathologyRequests(
        [FromQuery] string? keyword = null,
        [FromQuery] int? status = null,
        [FromQuery] string? specimenType = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null)
    {
        var filter = new PathologySearchDto
        {
            Keyword = keyword,
            Status = status,
            SpecimenType = specimenType,
            FromDate = fromDate,
            ToDate = toDate,
        };
        var result = await _pathologyService.GetPathologyRequestsAsync(filter);
        return Ok(result);
    }

    [HttpGet("requests/{id}")]
    public async Task<ActionResult<PathologyRequestDetailDto>> GetPathologyRequestById(Guid id)
    {
        var result = await _pathologyService.GetPathologyRequestByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("results")]
    [RequirePermission(PermissionCatalog.LabResult.Create)]
    public async Task<ActionResult<PathologyResultDto>> CreatePathologyResult([FromBody] CreatePathologyResultDto dto)
    {
        if (dto == null || dto.RequestId == null || dto.RequestId == Guid.Empty)
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Thiếu RequestId (phiếu GPB)" });
        var result = await _pathologyService.CreatePathologyResultAsync(dto);
        return Ok(result);
    }

    [HttpPut("results/{id}")]
    [RequirePermission(PermissionCatalog.LabResult.Create)]
    public async Task<ActionResult<PathologyResultDto>> UpdatePathologyResult(Guid id, [FromBody] UpdatePathologyResultDto dto)
    {
        var result = await _pathologyService.UpdatePathologyResultAsync(id, dto);
        return Ok(result);
    }

    [HttpGet("statistics")]
    public async Task<ActionResult<PathologyStatsDto>> GetPathologyStatistics()
    {
        var result = await _pathologyService.GetPathologyStatisticsAsync();
        return Ok(result);
    }

    [HttpGet("specimen-types")]
    public async Task<ActionResult<List<SpecimenTypeDto>>> GetSpecimenTypes()
    {
        var result = await _pathologyService.GetSpecimenTypesAsync();
        return Ok(result);
    }

    [HttpGet("results/{id}/print")]
    public async Task<ActionResult> PrintPathologyReport(Guid id)
    {
        var htmlBytes = await _pathologyService.PrintPathologyReportAsync(id);
        return File(htmlBytes, "text/html", "pathology-report.html");
    }

    [HttpPost("requests/{id}/cancel")]
    [RequirePermission(PermissionCatalog.LabResult.Create)]
    public async Task<ActionResult<CancelledPathologyRequestDto>> CancelPathologyRequest(Guid id, [FromBody] CancelPathologyRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto?.Reason))
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Lý do hủy là bắt buộc" });

        var cancelledBy = User.FindFirst(ClaimTypes.Name)?.Value
            ?? User.FindFirst("name")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? "Unknown";

        try
        {
            var result = await _pathologyService.CancelPathologyRequestAsync(id, dto.Reason, cancelledBy);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "VALIDATION_FAILED", message = ex.Message });
        }
    }

    [HttpPost("results/{id}/verify")]
    [RequirePermission(PermissionCatalog.LabResult.Validate)]
    public async Task<ActionResult<PathologyResultDto>> VerifyPathologyResult(Guid id, [FromBody] VerifyPathologyResultDto? dto)
    {
        var verifierName = User.FindFirst(ClaimTypes.Name)?.Value
            ?? User.FindFirst("name")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? "Unknown";
        var verifierIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var verifierId = Guid.TryParse(verifierIdClaim, out var gid) ? gid : Guid.Empty;

        try
        {
            var result = await _pathologyService.VerifyPathologyResultAsync(id, verifierId, verifierName);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "VALIDATION_FAILED", message = ex.Message });
        }
    }

    [HttpPut("requests/{id}/status")]
    [RequirePermission(PermissionCatalog.LabResult.Create)]
    public async Task<ActionResult<PathologyRequestDetailDto>> TransitionPathologyStatus(Guid id, [FromBody] TransitionPathologyStatusDto dto)
    {
        try
        {
            var result = await _pathologyService.TransitionPathologyStatusAsync(id, dto.NewStatus);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "VALIDATION_FAILED", message = ex.Message });
        }
    }
}
