using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/mental-health")]
[Authorize]
public class MentalHealthController : ControllerBase
{
    private readonly IMentalHealthService _service;

    public MentalHealthController(IMentalHealthService service)
    {
        _service = service;
    }

    [HttpGet("cases")]
    public async Task<ActionResult<List<MentalHealthCaseDto>>> SearchCases(
        [FromQuery] string? keyword = null, [FromQuery] string? caseType = null,
        [FromQuery] int? status = null, [FromQuery] string? severity = null,
        [FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
    {
        var filter = new MentalHealthCaseSearchDto { Keyword = keyword, CaseType = caseType, Status = status, Severity = severity, FromDate = fromDate, ToDate = toDate };
        return Ok(await _service.SearchCasesAsync(filter));
    }

    [HttpGet("cases/{id}")]
    public async Task<ActionResult<MentalHealthCaseDetailDto>> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("cases")]
    public async Task<ActionResult<MentalHealthCaseDto>> CreateCase([FromBody] CreateMentalHealthCaseDto dto)
    {
        return Ok(await _service.CreateCaseAsync(dto));
    }

    [HttpPut("cases/{id}")]
    public async Task<ActionResult<MentalHealthCaseDto>> UpdateCase(Guid id, [FromBody] CreateMentalHealthCaseDto dto)
    {
        return Ok(await _service.UpdateCaseAsync(id, dto));
    }

    [HttpPost("assessments")]
    public async Task<ActionResult<PsychiatricAssessmentDto>> AddAssessment([FromBody] CreatePsychiatricAssessmentDto dto)
    {
        return Ok(await _service.AddAssessmentAsync(dto));
    }

    [HttpGet("cases/{caseId}/assessments")]
    public async Task<ActionResult<List<PsychiatricAssessmentDto>>> GetAssessments(Guid caseId)
    {
        return Ok(await _service.GetAssessmentsAsync(caseId));
    }

    [HttpGet("stats")]
    public async Task<ActionResult<MentalHealthStatsDto>> GetStats()
    {
        return Ok(await _service.GetStatsAsync());
    }

    [HttpGet("overdue-followups")]
    public async Task<ActionResult<List<MentalHealthCaseDto>>> GetOverdueFollowUps()
    {
        return Ok(await _service.GetOverdueFollowUpsAsync());
    }

    [HttpPost("screen-depression")]
    public async Task<ActionResult<ScreeningResultDto>> ScreenDepression([FromQuery] Guid caseId, [FromQuery] int phq9Score)
    {
        return Ok(await _service.ScreenDepressionAsync(caseId, phq9Score));
    }
}
