using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[Authorize]
[ApiController]
[Route("api/treatment-protocols")]
public class TreatmentProtocolController : ControllerBase
{
    private readonly ITreatmentProtocolService _service;

    public TreatmentProtocolController(ITreatmentProtocolService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<TreatmentProtocolPagedResult>> Search([FromQuery] TreatmentProtocolSearchDto dto)
        => Ok(await _service.SearchProtocolsAsync(dto));

    [HttpGet("{id}")]
    public async Task<ActionResult<TreatmentProtocolDto>> GetById(Guid id)
    {
        var result = await _service.GetProtocolByIdAsync(id);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<TreatmentProtocolDto>> Save([FromBody] SaveTreatmentProtocolDto dto)
        => Ok(await _service.SaveProtocolAsync(dto));

    [HttpDelete("{id}")]
    public async Task<ActionResult<bool>> Delete(Guid id)
        => Ok(await _service.DeleteProtocolAsync(id));

    [HttpPost("{id}/approve")]
    public async Task<ActionResult<TreatmentProtocolDto>> Approve(Guid id)
    {
        var userId = User.FindFirst("sub")?.Value ?? User.Identity?.Name ?? "system";
        return Ok(await _service.ApproveProtocolAsync(id, userId));
    }

    [HttpPost("{id}/new-version")]
    public async Task<ActionResult<TreatmentProtocolDto>> NewVersion(Guid id)
        => Ok(await _service.NewVersionAsync(id));

    [HttpGet("by-icd/{icdCode}")]
    public async Task<ActionResult<List<TreatmentProtocolDto>>> GetByIcd(string icdCode)
        => Ok(await _service.GetProtocolsByIcdAsync(icdCode));

    [HttpGet("{protocolId}/evaluate/{examinationId}")]
    public async Task<ActionResult<ProtocolEvaluationDto>> Evaluate(Guid protocolId, Guid examinationId)
        => Ok(await _service.EvaluatePatientAsync(protocolId, examinationId));

    [HttpGet("disease-groups")]
    public async Task<ActionResult<List<string>>> GetDiseaseGroups()
        => Ok(await _service.GetDiseaseGroupsAsync());
}
