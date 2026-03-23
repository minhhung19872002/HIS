using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/forensic")]
[Authorize]
public class ForensicController : ControllerBase
{
    private readonly IForensicService _forensicService;

    public ForensicController(IForensicService forensicService)
    {
        _forensicService = forensicService;
    }

    [HttpGet("cases")]
    public async Task<ActionResult<List<ForensicCaseDto>>> SearchCases(
        [FromQuery] string? keyword = null, [FromQuery] string? caseType = null,
        [FromQuery] int? status = null, [FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
    {
        var filter = new ForensicCaseSearchDto { Keyword = keyword, CaseType = caseType, Status = status, FromDate = fromDate, ToDate = toDate };
        return Ok(await _forensicService.SearchCasesAsync(filter));
    }

    [HttpGet("cases/{id}")]
    public async Task<ActionResult<ForensicCaseDetailDto>> GetCaseById(Guid id)
    {
        var result = await _forensicService.GetCaseByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("cases")]
    public async Task<ActionResult<ForensicCaseDto>> CreateCase([FromBody] CreateForensicCaseDto dto)
    {
        return Ok(await _forensicService.CreateCaseAsync(dto));
    }

    [HttpPut("cases/{id}")]
    public async Task<ActionResult<ForensicCaseDto>> UpdateCase(Guid id, [FromBody] CreateForensicCaseDto dto)
    {
        return Ok(await _forensicService.UpdateCaseAsync(id, dto));
    }

    [HttpGet("cases/{caseId}/examinations")]
    public async Task<ActionResult<List<ForensicExaminationDto>>> GetExaminations(Guid caseId)
    {
        return Ok(await _forensicService.GetExaminationsAsync(caseId));
    }

    [HttpPost("examinations")]
    public async Task<ActionResult<ForensicExaminationDto>> AddExamination([FromBody] CreateForensicExaminationDto dto)
    {
        return Ok(await _forensicService.AddExaminationAsync(dto));
    }

    [HttpPut("cases/{id}/approve")]
    public async Task<ActionResult<ForensicCaseDto>> ApproveCase(Guid id, [FromQuery] decimal? disabilityPercentage = null, [FromQuery] string? conclusion = null)
    {
        return Ok(await _forensicService.ApproveCaseAsync(id, disabilityPercentage, conclusion));
    }

    [HttpGet("stats")]
    public async Task<ActionResult<ForensicStatsDto>> GetStats()
    {
        return Ok(await _forensicService.GetStatsAsync());
    }

    [HttpGet("cases/{id}/print")]
    public async Task<ActionResult> PrintCertificate(Guid id)
    {
        var bytes = await _forensicService.PrintCertificateAsync(id);
        if (bytes.Length == 0) return NoContent();
        return File(bytes, "text/html", "forensic-certificate.html");
    }
}
