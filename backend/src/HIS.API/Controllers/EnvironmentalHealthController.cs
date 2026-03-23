using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/environmental-health")]
[Authorize]
public class EnvironmentalHealthController : ControllerBase
{
    private readonly IEnvironmentalHealthService _service;

    public EnvironmentalHealthController(IEnvironmentalHealthService service)
    {
        _service = service;
    }

    [HttpGet("waste")]
    public async Task<ActionResult<List<WasteRecordDto>>> SearchWasteRecords(
        [FromQuery] string? keyword = null, [FromQuery] string? wasteType = null,
        [FromQuery] int? status = null, [FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
    {
        var filter = new WasteRecordSearchDto { Keyword = keyword, WasteType = wasteType, Status = status, FromDate = fromDate, ToDate = toDate };
        return Ok(await _service.SearchWasteRecordsAsync(filter));
    }

    [HttpPost("waste")]
    public async Task<ActionResult<WasteRecordDto>> CreateWasteRecord([FromBody] CreateWasteRecordDto dto)
    {
        return Ok(await _service.CreateWasteRecordAsync(dto));
    }

    [HttpPut("waste/{id}")]
    public async Task<ActionResult<WasteRecordDto>> UpdateWasteRecord(Guid id, [FromBody] CreateWasteRecordDto dto)
    {
        return Ok(await _service.UpdateWasteRecordAsync(id, dto));
    }

    [HttpGet("monitoring")]
    public async Task<ActionResult<List<EnvironmentalMonitoringDto>>> SearchMonitoring(
        [FromQuery] string? keyword = null, [FromQuery] string? monitoringType = null,
        [FromQuery] bool? isCompliant = null, [FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
    {
        var filter = new EnvironmentalMonitoringSearchDto { Keyword = keyword, MonitoringType = monitoringType, IsCompliant = isCompliant, FromDate = fromDate, ToDate = toDate };
        return Ok(await _service.SearchMonitoringAsync(filter));
    }

    [HttpPost("monitoring")]
    public async Task<ActionResult<EnvironmentalMonitoringDto>> CreateMonitoring([FromBody] CreateEnvironmentalMonitoringDto dto)
    {
        return Ok(await _service.CreateMonitoringAsync(dto));
    }

    [HttpGet("waste/stats")]
    public async Task<ActionResult<WasteStatsDto>> GetWasteStats()
    {
        return Ok(await _service.GetWasteStatsAsync());
    }

    [HttpGet("monitoring/stats")]
    public async Task<ActionResult<MonitoringStatsDto>> GetMonitoringStats()
    {
        return Ok(await _service.GetMonitoringStatsAsync());
    }

    [HttpGet("biosafety-status")]
    public async Task<ActionResult<BiosafetyStatusDto>> GetBiosafetyStatus()
    {
        return Ok(await _service.GetBiosafetyStatusAsync());
    }
}
