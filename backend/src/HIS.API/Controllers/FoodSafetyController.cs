using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/food-safety")]
[Authorize]
public class FoodSafetyController : ControllerBase
{
    private readonly IFoodSafetyService _foodSafetyService;

    public FoodSafetyController(IFoodSafetyService foodSafetyService)
    {
        _foodSafetyService = foodSafetyService;
    }

    // ==================== Incidents ====================

    [HttpGet("incidents")]
    public async Task<ActionResult<List<FoodIncidentListDto>>> SearchIncidents(
        [FromQuery] string? keyword = null,
        [FromQuery] int? investigationStatus = null,
        [FromQuery] int? severityLevel = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null)
    {
        var filter = new FoodIncidentSearchDto
        {
            Keyword = keyword,
            InvestigationStatus = investigationStatus,
            SeverityLevel = severityLevel,
            FromDate = fromDate,
            ToDate = toDate,
        };
        var result = await _foodSafetyService.SearchIncidentsAsync(filter);
        return Ok(result);
    }

    [HttpGet("incidents/{id}")]
    public async Task<ActionResult<FoodIncidentListDto>> GetIncidentById(Guid id)
    {
        var result = await _foodSafetyService.GetIncidentByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("incidents")]
    public async Task<ActionResult<FoodIncidentListDto>> CreateIncident([FromBody] FoodIncidentCreateDto dto)
    {
        var result = await _foodSafetyService.CreateIncidentAsync(dto);
        return Ok(result);
    }

    [HttpPut("incidents/{id}")]
    public async Task<ActionResult<FoodIncidentListDto>> UpdateIncident(Guid id, [FromBody] FoodIncidentUpdateDto dto)
    {
        var result = await _foodSafetyService.UpdateIncidentAsync(id, dto);
        return Ok(result);
    }

    [HttpGet("incidents/stats")]
    public async Task<ActionResult<FoodIncidentStatsDto>> GetIncidentStats()
    {
        var result = await _foodSafetyService.GetIncidentStatsAsync();
        return Ok(result);
    }

    // ==================== Samples ====================

    [HttpPost("samples")]
    public async Task<ActionResult<FoodSampleListDto>> AddSample([FromBody] FoodSampleCreateDto dto)
    {
        var result = await _foodSafetyService.AddSampleAsync(dto);
        return Ok(result);
    }

    [HttpPut("samples/{id}")]
    public async Task<ActionResult<FoodSampleListDto>> UpdateSample(Guid id, [FromBody] FoodSampleUpdateDto dto)
    {
        var result = await _foodSafetyService.UpdateSampleAsync(id, dto);
        return Ok(result);
    }

    [HttpGet("incidents/{incidentId}/samples")]
    public async Task<ActionResult<List<FoodSampleListDto>>> GetSamplesByIncident(Guid incidentId)
    {
        var result = await _foodSafetyService.GetSamplesByIncidentAsync(incidentId);
        return Ok(result);
    }

    // ==================== Inspections ====================

    [HttpGet("inspections")]
    public async Task<ActionResult<List<FoodInspectionListDto>>> SearchInspections(
        [FromQuery] string? keyword = null,
        [FromQuery] int? status = null,
        [FromQuery] string? complianceLevel = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null)
    {
        var filter = new FoodInspectionSearchDto
        {
            Keyword = keyword,
            Status = status,
            ComplianceLevel = complianceLevel,
            FromDate = fromDate,
            ToDate = toDate,
        };
        var result = await _foodSafetyService.SearchInspectionsAsync(filter);
        return Ok(result);
    }

    [HttpPost("inspections")]
    public async Task<ActionResult<FoodInspectionListDto>> CreateInspection([FromBody] FoodInspectionCreateDto dto)
    {
        var result = await _foodSafetyService.CreateInspectionAsync(dto);
        return Ok(result);
    }

    [HttpPut("inspections/{id}")]
    public async Task<ActionResult<FoodInspectionListDto>> UpdateInspection(Guid id, [FromBody] FoodInspectionUpdateDto dto)
    {
        var result = await _foodSafetyService.UpdateInspectionAsync(id, dto);
        return Ok(result);
    }

    [HttpGet("inspections/stats")]
    public async Task<ActionResult<FoodInspectionStatsDto>> GetInspectionStats()
    {
        var result = await _foodSafetyService.GetInspectionStatsAsync();
        return Ok(result);
    }
}
