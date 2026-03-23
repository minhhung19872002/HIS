using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/health-education")]
[Authorize]
public class HealthEducationController : ControllerBase
{
    private readonly IHealthEducationService _service;

    public HealthEducationController(IHealthEducationService service)
    {
        _service = service;
    }

    [HttpGet("campaigns")]
    public async Task<ActionResult<List<HealthCampaignDto>>> SearchCampaigns(
        [FromQuery] string? keyword = null, [FromQuery] string? campaignType = null,
        [FromQuery] int? status = null, [FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
    {
        var filter = new HealthCampaignSearchDto { Keyword = keyword, CampaignType = campaignType, Status = status, FromDate = fromDate, ToDate = toDate };
        return Ok(await _service.SearchCampaignsAsync(filter));
    }

    [HttpPost("campaigns")]
    public async Task<ActionResult<HealthCampaignDto>> CreateCampaign([FromBody] CreateHealthCampaignDto dto)
    {
        return Ok(await _service.CreateCampaignAsync(dto));
    }

    [HttpPut("campaigns/{id}")]
    public async Task<ActionResult<HealthCampaignDto>> UpdateCampaign(Guid id, [FromBody] CreateHealthCampaignDto dto)
    {
        return Ok(await _service.UpdateCampaignAsync(id, dto));
    }

    [HttpGet("materials")]
    public async Task<ActionResult<List<HealthEducationMaterialDto>>> SearchMaterials(
        [FromQuery] string? keyword = null, [FromQuery] string? materialType = null, [FromQuery] string? topic = null)
    {
        var filter = new HealthEducationMaterialSearchDto { Keyword = keyword, MaterialType = materialType, Topic = topic };
        return Ok(await _service.SearchMaterialsAsync(filter));
    }

    [HttpPost("materials")]
    public async Task<ActionResult<HealthEducationMaterialDto>> CreateMaterial([FromBody] CreateHealthEducationMaterialDto dto)
    {
        return Ok(await _service.CreateMaterialAsync(dto));
    }

    [HttpGet("stats")]
    public async Task<ActionResult<CampaignStatsDto>> GetCampaignStats()
    {
        return Ok(await _service.GetCampaignStatsAsync());
    }
}
