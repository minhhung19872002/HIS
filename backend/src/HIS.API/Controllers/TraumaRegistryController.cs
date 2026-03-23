using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/trauma-registry")]
[Authorize]
public class TraumaRegistryController : ControllerBase
{
    private readonly ITraumaRegistryService _service;

    public TraumaRegistryController(ITraumaRegistryService service)
    {
        _service = service;
    }

    [HttpGet("cases")]
    public async Task<ActionResult<List<TraumaCaseDto>>> SearchCases(
        [FromQuery] string? keyword = null, [FromQuery] string? injuryType = null,
        [FromQuery] string? triageCategory = null, [FromQuery] string? outcome = null,
        [FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
    {
        var filter = new TraumaCaseSearchDto { Keyword = keyword, InjuryType = injuryType, TriageCategory = triageCategory, Outcome = outcome, FromDate = fromDate, ToDate = toDate };
        return Ok(await _service.SearchCasesAsync(filter));
    }

    [HttpGet("cases/{id}")]
    public async Task<ActionResult<TraumaCaseDto>> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("cases")]
    public async Task<ActionResult<TraumaCaseDto>> CreateCase([FromBody] CreateTraumaCaseDto dto)
    {
        return Ok(await _service.CreateCaseAsync(dto));
    }

    [HttpPut("cases/{id}")]
    public async Task<ActionResult<TraumaCaseDto>> UpdateCase(Guid id, [FromBody] CreateTraumaCaseDto dto)
    {
        return Ok(await _service.UpdateCaseAsync(id, dto));
    }

    [HttpGet("stats")]
    public async Task<ActionResult<TraumaStatsDto>> GetStats()
    {
        return Ok(await _service.GetStatsAsync());
    }

    [HttpGet("outcome-report")]
    public async Task<ActionResult<TraumaOutcomeReportDto>> GetOutcomeReport()
    {
        return Ok(await _service.GetOutcomeReportAsync());
    }
}
