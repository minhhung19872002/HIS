using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/tb-hiv")]
[Authorize]
public class TbHivController : ControllerBase
{
    private readonly ITbHivManagementService _tbHivService;

    public TbHivController(ITbHivManagementService tbHivService)
    {
        _tbHivService = tbHivService;
    }

    [HttpGet("records")]
    public async Task<ActionResult<List<TbHivRecordListDto>>> SearchRecords(
        [FromQuery] string? keyword = null,
        [FromQuery] string? recordType = null,
        [FromQuery] string? status = null,
        [FromQuery] string? treatmentCategory = null,
        [FromQuery] Guid? doctorId = null,
        [FromQuery] Guid? departmentId = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null,
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 50)
    {
        var filter = new TbHivSearchDto
        {
            Keyword = keyword,
            RecordType = recordType,
            Status = status,
            TreatmentCategory = treatmentCategory,
            DoctorId = doctorId,
            DepartmentId = departmentId,
            FromDate = fromDate,
            ToDate = toDate,
            PageIndex = pageIndex,
            PageSize = pageSize,
        };
        var result = await _tbHivService.SearchRecordsAsync(filter);
        return Ok(result);
    }

    [HttpGet("records/{id}")]
    public async Task<ActionResult<TbHivRecordDetailDto>> GetRecordById(Guid id)
    {
        var result = await _tbHivService.GetRecordByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("records")]
    public async Task<ActionResult<TbHivRecordDetailDto>> CreateRecord([FromBody] CreateTbHivRecordDto dto)
    {
        var result = await _tbHivService.CreateRecordAsync(dto);
        return Ok(result);
    }

    [HttpPut("records/{id}")]
    public async Task<ActionResult<TbHivRecordDetailDto>> UpdateRecord(Guid id, [FromBody] UpdateTbHivRecordDto dto)
    {
        var result = await _tbHivService.UpdateRecordAsync(id, dto);
        return Ok(result);
    }

    [HttpPut("records/{id}/close")]
    public async Task<ActionResult> CloseRecord(Guid id, [FromBody] CloseTbHivRecordDto dto)
    {
        var success = await _tbHivService.CloseRecordAsync(id, dto);
        if (!success) return NotFound();
        return Ok(new { message = "Record closed successfully" });
    }

    [HttpGet("records/{id}/follow-ups")]
    public async Task<ActionResult<List<TbHivFollowUpDto>>> GetFollowUps(Guid id)
    {
        var result = await _tbHivService.GetFollowUpsAsync(id);
        return Ok(result);
    }

    [HttpPost("records/{id}/follow-ups")]
    public async Task<ActionResult<TbHivFollowUpDto>> CreateFollowUp(Guid id, [FromBody] CreateTbHivFollowUpDto dto)
    {
        var result = await _tbHivService.CreateFollowUpAsync(id, dto);
        return Ok(result);
    }

    [HttpGet("statistics")]
    public async Task<ActionResult<TbHivStatsDto>> GetStatistics()
    {
        var result = await _tbHivService.GetStatisticsAsync();
        return Ok(result);
    }

    [HttpGet("treatment-outcomes")]
    public async Task<ActionResult<List<TbHivTreatmentOutcomeDto>>> GetTreatmentOutcomes(
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null)
    {
        var result = await _tbHivService.GetTreatmentOutcomesAsync(fromDate, toDate);
        return Ok(result);
    }
}
