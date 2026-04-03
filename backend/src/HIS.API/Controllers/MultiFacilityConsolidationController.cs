using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Core.DTOs;
using HIS.Infrastructure.Services;

namespace HIS.API.Controllers;

/// <summary>
/// NangCap21 - HIS Đám Mây 3 Cấp: Tổng hợp Trạm YT → Huyện → Tỉnh
/// </summary>
[ApiController]
[Route("api/multi-facility")]
[Authorize]
public class MultiFacilityConsolidationController : ControllerBase
{
    private readonly IMultiFacilityConsolidationService _service;

    public MultiFacilityConsolidationController(IMultiFacilityConsolidationService service)
    {
        _service = service;
    }

    /// <summary>
    /// Dashboard đa chi nhánh - tổng hợp 3 cấp
    /// GET /api/multi-facility/dashboard?branchId=&date=
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<ActionResult<MultiFacilityDashboardDto>> GetDashboard(
        [FromQuery] Guid? branchId,
        [FromQuery] DateTime? date)
    {
        var result = await _service.GetDashboardAsync(branchId, date);
        return Ok(result);
    }

    /// <summary>
    /// Cây chi nhánh đầy đủ (3 cấp)
    /// GET /api/multi-facility/branch-tree?branchId=
    /// </summary>
    [HttpGet("branch-tree")]
    public async Task<ActionResult<BranchTreeDto>> GetBranchTree([FromQuery] Guid? branchId)
    {
        var result = await _service.GetBranchTreeAsync(branchId);
        if (result == null)
            return NotFound("Branch not found");
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo tổng hợp theo loại
    /// GET /api/multi-facility/consolidated-report?rootBranchId=&reportType=&fromDate=&toDate=
    /// </summary>
    [HttpGet("consolidated-report")]
    public async Task<ActionResult<ConsolidatedReportDto>> GetConsolidatedReport(
        [FromQuery] Guid? rootBranchId,
        [FromQuery] string reportType,
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate)
    {
        if (string.IsNullOrEmpty(reportType))
            reportType = "patient";
        var result = await _service.GetConsolidatedReportAsync(rootBranchId, reportType, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Lịch trực theo chi nhánh (3 cấp)
    /// GET /api/multi-facility/duty-roster?branchId=&year=&month=
    /// </summary>
    [HttpGet("duty-roster")]
    public async Task<ActionResult<BranchDutyRosterDto>> GetDutyRoster(
        [FromQuery] Guid? branchId,
        [FromQuery] int year,
        [FromQuery] int month)
    {
        if (year == 0) year = DateTime.Today.Year;
        if (month == 0) month = DateTime.Today.Month;
        var result = await _service.GetBranchDutyRosterAsync(branchId, year, month);
        return Ok(result);
    }

    /// <summary>
    /// Danh sách chi nhánh theo cấp (Trạm YT / Huyện / Tỉnh)
    /// GET /api/multi-facility/branches/by-level
    /// </summary>
    [HttpGet("branches/by-level")]
    public async Task<ActionResult<List<BranchTreeDto>>> GetBranchesByLevel()
    {
        var result = await _service.GetBranchesByLevelAsync();
        return Ok(result);
    }

    /// <summary>
    /// Lấy tất cả sub-branch IDs
    /// GET /api/multi-facility/branches/{branchId}/sub-ids
    /// </summary>
    [HttpGet("branches/{branchId}/sub-ids")]
    public async Task<ActionResult<List<Guid>>> GetSubBranchIds(Guid branchId)
    {
        var result = await _service.GetAllSubBranchIdsAsync(branchId);
        return Ok(result);
    }
}
