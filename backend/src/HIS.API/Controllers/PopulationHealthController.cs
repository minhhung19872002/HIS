using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/population-health")]
[Authorize]
public class PopulationHealthController : ControllerBase
{
    private readonly IPopulationHealthService _service;

    public PopulationHealthController(IPopulationHealthService service)
    {
        _service = service;
    }

    [HttpGet("records")]
    public async Task<ActionResult<List<PopulationRecordDto>>> SearchRecords(
        [FromQuery] string? keyword = null, [FromQuery] string? recordType = null,
        [FromQuery] int? status = null, [FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
    {
        var filter = new PopulationRecordSearchDto { Keyword = keyword, RecordType = recordType, Status = status, FromDate = fromDate, ToDate = toDate };
        return Ok(await _service.SearchRecordsAsync(filter));
    }

    [HttpPost("records")]
    public async Task<ActionResult<PopulationRecordDto>> CreateRecord([FromBody] CreatePopulationRecordDto dto)
    {
        return Ok(await _service.CreateRecordAsync(dto));
    }

    [HttpPut("records/{id}")]
    public async Task<ActionResult<PopulationRecordDto>> UpdateRecord(Guid id, [FromBody] CreatePopulationRecordDto dto)
    {
        return Ok(await _service.UpdateRecordAsync(id, dto));
    }

    [HttpGet("stats")]
    public async Task<ActionResult<PopulationHealthStatsDto>> GetStats()
    {
        return Ok(await _service.GetStatsAsync());
    }

    [HttpGet("elderly/stats")]
    public async Task<ActionResult<ElderlyStatsDto>> GetElderlyStats()
    {
        return Ok(await _service.GetElderlyStatsAsync());
    }
}
