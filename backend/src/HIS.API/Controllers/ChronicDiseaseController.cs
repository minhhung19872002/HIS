using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/chronic-disease")]
[Authorize]
public class ChronicDiseaseController : ControllerBase
{
    private readonly IChronicDiseaseService _chronicDiseaseService;

    public ChronicDiseaseController(IChronicDiseaseService chronicDiseaseService)
    {
        _chronicDiseaseService = chronicDiseaseService;
    }

    [HttpGet("records")]
    public async Task<ActionResult<List<ChronicDiseaseListDto>>> SearchRecords(
        [FromQuery] string? keyword = null,
        [FromQuery] string? status = null,
        [FromQuery] string? icdCode = null,
        [FromQuery] Guid? doctorId = null,
        [FromQuery] Guid? departmentId = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null,
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 50)
    {
        var filter = new ChronicDiseaseSearchDto
        {
            Keyword = keyword,
            Status = status,
            IcdCode = icdCode,
            DoctorId = doctorId,
            DepartmentId = departmentId,
            FromDate = fromDate,
            ToDate = toDate,
            PageIndex = pageIndex,
            PageSize = pageSize,
        };
        var result = await _chronicDiseaseService.SearchRecordsAsync(filter);
        return Ok(result);
    }

    [HttpGet("records/{id}")]
    public async Task<ActionResult<ChronicDiseaseDetailDto>> GetRecordById(Guid id)
    {
        var result = await _chronicDiseaseService.GetRecordByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("records")]
    public async Task<ActionResult<ChronicDiseaseDetailDto>> CreateRecord([FromBody] CreateChronicDiseaseDto dto)
    {
        var result = await _chronicDiseaseService.CreateRecordAsync(dto);
        return Ok(result);
    }

    [HttpPut("records/{id}")]
    public async Task<ActionResult<ChronicDiseaseDetailDto>> UpdateRecord(Guid id, [FromBody] UpdateChronicDiseaseDto dto)
    {
        var result = await _chronicDiseaseService.UpdateRecordAsync(id, dto);
        return Ok(result);
    }

    [HttpPut("records/{id}/close")]
    public async Task<ActionResult> CloseRecord(Guid id, [FromBody] CloseChronicDiseaseDto dto)
    {
        var success = await _chronicDiseaseService.CloseRecordAsync(id, dto);
        if (!success) return NotFound();
        return Ok(new { message = "Record closed successfully" });
    }

    [HttpPut("records/{id}/remove")]
    public async Task<ActionResult> RemoveRecord(Guid id, [FromBody] RemoveChronicDiseaseDto dto)
    {
        var success = await _chronicDiseaseService.RemoveRecordAsync(id, dto);
        if (!success) return NotFound();
        return Ok(new { message = "Record removed successfully" });
    }

    [HttpPut("records/{id}/reopen")]
    public async Task<ActionResult> ReopenRecord(Guid id)
    {
        var success = await _chronicDiseaseService.ReopenRecordAsync(id);
        if (!success) return NotFound();
        return Ok(new { message = "Record reopened successfully" });
    }

    [HttpGet("records/{id}/follow-ups")]
    public async Task<ActionResult<List<ChronicDiseaseFollowUpDto>>> GetFollowUps(Guid id)
    {
        var result = await _chronicDiseaseService.GetFollowUpsAsync(id);
        return Ok(result);
    }

    [HttpPost("records/{id}/follow-ups")]
    public async Task<ActionResult<ChronicDiseaseFollowUpDto>> CreateFollowUp(Guid id, [FromBody] CreateChronicDiseaseFollowUpDto dto)
    {
        var result = await _chronicDiseaseService.CreateFollowUpAsync(id, dto);
        return Ok(result);
    }

    [HttpGet("statistics")]
    public async Task<ActionResult<ChronicDiseaseStatsDto>> GetStatistics()
    {
        var result = await _chronicDiseaseService.GetStatisticsAsync();
        return Ok(result);
    }
}
