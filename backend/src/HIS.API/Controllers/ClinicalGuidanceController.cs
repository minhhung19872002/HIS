using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/clinical-guidance")]
[Authorize]
public class ClinicalGuidanceController : ControllerBase
{
    private readonly IClinicalGuidanceService _clinicalGuidanceService;

    public ClinicalGuidanceController(IClinicalGuidanceService clinicalGuidanceService)
    {
        _clinicalGuidanceService = clinicalGuidanceService;
    }

    [HttpGet("batches")]
    public async Task<ActionResult<List<ClinicalGuidanceBatchListDto>>> SearchBatches(
        [FromQuery] string? keyword = null,
        [FromQuery] string? status = null,
        [FromQuery] string? guidanceType = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null,
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 50)
    {
        var filter = new ClinicalGuidanceSearchDto
        {
            Keyword = keyword,
            Status = status,
            GuidanceType = guidanceType,
            FromDate = fromDate,
            ToDate = toDate,
            PageIndex = pageIndex,
            PageSize = pageSize,
        };
        var result = await _clinicalGuidanceService.SearchBatchesAsync(filter);
        return Ok(result);
    }

    [HttpGet("batches/{id}")]
    public async Task<ActionResult<ClinicalGuidanceBatchDetailDto>> GetBatchById(Guid id)
    {
        var result = await _clinicalGuidanceService.GetBatchByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("batches")]
    public async Task<ActionResult<ClinicalGuidanceBatchDetailDto>> CreateBatch([FromBody] CreateClinicalGuidanceBatchDto dto)
    {
        var result = await _clinicalGuidanceService.CreateBatchAsync(dto);
        return Ok(result);
    }

    [HttpPut("batches/{id}")]
    public async Task<ActionResult<ClinicalGuidanceBatchDetailDto>> UpdateBatch(Guid id, [FromBody] UpdateClinicalGuidanceBatchDto dto)
    {
        var result = await _clinicalGuidanceService.UpdateBatchAsync(id, dto);
        return Ok(result);
    }

    [HttpPut("batches/{id}/complete")]
    public async Task<ActionResult> CompleteBatch(Guid id, [FromBody] CompleteClinicalGuidanceBatchDto dto)
    {
        var success = await _clinicalGuidanceService.CompleteBatchAsync(id, dto);
        if (!success) return NotFound();
        return Ok(new { message = "Batch completed successfully" });
    }

    [HttpPut("batches/{id}/cancel")]
    public async Task<ActionResult> CancelBatch(Guid id)
    {
        var success = await _clinicalGuidanceService.CancelBatchAsync(id);
        if (!success) return NotFound();
        return Ok(new { message = "Batch cancelled successfully" });
    }

    [HttpGet("batches/{id}/activities")]
    public async Task<ActionResult<List<ClinicalGuidanceActivityDto>>> GetActivities(Guid id)
    {
        var result = await _clinicalGuidanceService.GetActivitiesAsync(id);
        return Ok(result);
    }

    [HttpPost("batches/{id}/activities")]
    public async Task<ActionResult<ClinicalGuidanceActivityDto>> CreateActivity(Guid id, [FromBody] CreateClinicalGuidanceActivityDto dto)
    {
        var result = await _clinicalGuidanceService.CreateActivityAsync(id, dto);
        return Ok(result);
    }

    [HttpGet("statistics")]
    public async Task<ActionResult<ClinicalGuidanceStatsDto>> GetStatistics()
    {
        var result = await _clinicalGuidanceService.GetStatisticsAsync();
        return Ok(result);
    }
}
