using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.ProvincialHealth;
using HIS.Application.Services;

namespace HIS.API.Controllers;

/// <summary>
/// Hệ thống giám sát điều hành thông tin y tế - Sở Y tế
/// </summary>
[ApiController]
[Route("api/provincial-health")]
[Authorize]
public class ProvincialHealthController : ControllerBase
{
    private readonly IProvincialHealthService _service;

    public ProvincialHealthController(IProvincialHealthService service)
    {
        _service = service;
    }

    private string GetUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "system";

    /// <summary>
    /// Tìm kiếm báo cáo
    /// </summary>
    [HttpPost("reports/search")]
    public async Task<ActionResult<ProvincialReportPagedResult>> SearchReports([FromBody] ProvincialReportSearchDto search)
        => Ok(await _service.SearchReportsAsync(search));

    /// <summary>
    /// Chi tiết báo cáo
    /// </summary>
    [HttpGet("reports/{id}")]
    public async Task<IActionResult> GetReport(Guid id)
    {
        var result = await _service.GetReportByIdAsync(id);
        return result == null ? NotFound() : Ok(result);
    }

    /// <summary>
    /// Tạo báo cáo tự động từ dữ liệu BV
    /// </summary>
    [HttpPost("reports/generate")]
    public async Task<ActionResult<ProvincialReportDto>> GenerateReport([FromBody] GenerateReportRequest request)
        => Ok(await _service.GenerateReportAsync(request.ReportType, request.Period, GetUserId()));

    /// <summary>
    /// Gửi báo cáo lên Sở Y tế
    /// </summary>
    [HttpPost("reports/submit/{id}")]
    public async Task<IActionResult> SubmitReport(Guid id)
        => Ok(await _service.SubmitReportAsync(id, GetUserId()));

    /// <summary>
    /// Thống kê tổng quan
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult<ProvincialStatsDto>> GetStats()
        => Ok(await _service.GetStatsAsync());

    /// <summary>
    /// Kiểm tra kết nối Sở Y tế
    /// </summary>
    [HttpGet("test-connection")]
    public async Task<IActionResult> TestConnection()
        => Ok(await _service.TestConnectionAsync());

    /// <summary>
    /// Thông tin kết nối
    /// </summary>
    [HttpGet("connection")]
    public async Task<ActionResult<ProvincialConnectionDto>> GetConnection()
        => Ok(await _service.GetConnectionInfoAsync());

    /// <summary>
    /// Danh sách báo cáo bệnh truyền nhiễm
    /// </summary>
    [HttpGet("infectious-diseases")]
    public async Task<ActionResult<List<InfectiousDiseaseReportDto>>> GetInfectiousDiseases(
        [FromQuery] string? dateFrom, [FromQuery] string? dateTo)
        => Ok(await _service.GetInfectiousDiseaseReportsAsync(dateFrom, dateTo));

    /// <summary>
    /// Gửi báo cáo bệnh truyền nhiễm
    /// </summary>
    [HttpPost("infectious-diseases/submit/{id}")]
    public async Task<IActionResult> SubmitInfectious(Guid id)
        => Ok(await _service.SubmitInfectiousReportAsync(id, GetUserId()));
}
