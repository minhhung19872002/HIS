using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/inter-hospital")]
[Authorize]
public class InterHospitalController : ControllerBase
{
    private readonly IInterHospitalService _service;

    public InterHospitalController(IInterHospitalService service)
    {
        _service = service;
    }

    [HttpGet("requests")]
    public async Task<ActionResult<List<InterHospitalRequestDto>>> SearchRequests(
        [FromQuery] string? keyword = null, [FromQuery] string? requestType = null,
        [FromQuery] int? status = null, [FromQuery] string? urgency = null,
        [FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
    {
        var filter = new InterHospitalRequestSearchDto { Keyword = keyword, RequestType = requestType, Status = status, Urgency = urgency, FromDate = fromDate, ToDate = toDate };
        return Ok(await _service.SearchRequestsAsync(filter));
    }

    [HttpGet("requests/{id}")]
    public async Task<ActionResult<InterHospitalRequestDto>> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("requests")]
    public async Task<ActionResult<InterHospitalRequestDto>> CreateRequest([FromBody] CreateInterHospitalRequestDto dto)
    {
        return Ok(await _service.CreateRequestAsync(dto));
    }

    [HttpPut("requests/{id}/respond")]
    public async Task<ActionResult<InterHospitalRequestDto>> RespondToRequest(Guid id, [FromBody] RespondInterHospitalRequestDto dto)
    {
        return Ok(await _service.RespondToRequestAsync(id, dto));
    }

    [HttpGet("active")]
    public async Task<ActionResult<List<InterHospitalRequestDto>>> GetActiveRequests()
    {
        return Ok(await _service.GetActiveRequestsAsync());
    }

    [HttpGet("stats")]
    public async Task<ActionResult<InterHospitalStatsDto>> GetStats()
    {
        return Ok(await _service.GetStatsAsync());
    }
}
