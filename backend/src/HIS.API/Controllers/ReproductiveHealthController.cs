using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/reproductive-health")]
[Authorize]
public class ReproductiveHealthController : ControllerBase
{
    private readonly IReproductiveHealthService _service;

    public ReproductiveHealthController(IReproductiveHealthService service)
    {
        _service = service;
    }

    [HttpGet("prenatal")]
    public async Task<ActionResult<List<PrenatalRecordDto>>> SearchPrenatal(
        [FromQuery] string? keyword = null, [FromQuery] string? riskLevel = null,
        [FromQuery] int? status = null, [FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
    {
        var filter = new PrenatalSearchDto { Keyword = keyword, RiskLevel = riskLevel, Status = status, FromDate = fromDate, ToDate = toDate };
        return Ok(await _service.SearchPrenatalAsync(filter));
    }

    [HttpGet("prenatal/{id}")]
    public async Task<ActionResult<PrenatalRecordDetailDto>> GetPrenatalById(Guid id)
    {
        var result = await _service.GetPrenatalByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("prenatal")]
    public async Task<ActionResult<PrenatalRecordDto>> CreatePrenatal([FromBody] CreatePrenatalRecordDto dto)
    {
        return Ok(await _service.CreatePrenatalAsync(dto));
    }

    [HttpPut("prenatal/{id}")]
    public async Task<ActionResult<PrenatalRecordDto>> UpdatePrenatal(Guid id, [FromBody] CreatePrenatalRecordDto dto)
    {
        return Ok(await _service.UpdatePrenatalAsync(id, dto));
    }

    [HttpGet("family-planning")]
    public async Task<ActionResult<List<FamilyPlanningRecordDto>>> SearchFamilyPlanning(
        [FromQuery] string? keyword = null, [FromQuery] string? method = null, [FromQuery] int? status = null)
    {
        var filter = new FamilyPlanningSearchDto { Keyword = keyword, Method = method, Status = status };
        return Ok(await _service.SearchFamilyPlanningAsync(filter));
    }

    [HttpPost("family-planning")]
    public async Task<ActionResult<FamilyPlanningRecordDto>> CreateFamilyPlanning([FromBody] CreateFamilyPlanningRecordDto dto)
    {
        return Ok(await _service.CreateFamilyPlanningAsync(dto));
    }

    [HttpPut("family-planning/{id}")]
    public async Task<ActionResult<FamilyPlanningRecordDto>> UpdateFamilyPlanning(Guid id, [FromBody] CreateFamilyPlanningRecordDto dto)
    {
        return Ok(await _service.UpdateFamilyPlanningAsync(id, dto));
    }

    [HttpGet("stats")]
    public async Task<ActionResult<ReproductiveHealthStatsDto>> GetStats()
    {
        return Ok(await _service.GetStatsAsync());
    }

    [HttpGet("high-risk")]
    public async Task<ActionResult<List<PrenatalRecordDto>>> GetHighRiskPregnancies()
    {
        return Ok(await _service.GetHighRiskPregnanciesAsync());
    }
}
