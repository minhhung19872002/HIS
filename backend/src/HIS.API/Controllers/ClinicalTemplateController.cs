using System.Security.Claims;
using HIS.Application.DTOs.Clinical;
using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/clinical-template")]
[Authorize]
public class ClinicalTemplateController : ControllerBase
{
    private readonly IClinicalTemplateService _service;

    public ClinicalTemplateController(IClinicalTemplateService service)
    {
        _service = service;
    }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    [HttpPost]
    public async Task<ActionResult<ClinicalTemplateDto>> Save([FromBody] SaveClinicalTemplateDto dto)
        => Ok(await _service.SaveAsync(dto, GetUserId()));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id, GetUserId());
        return Ok(new { success = true });
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ClinicalTemplateDto>> GetById(Guid id)
    {
        var t = await _service.GetByIdAsync(id);
        return t == null ? NotFound() : Ok(t);
    }

    [HttpGet]
    public async Task<ActionResult<List<ClinicalTemplateDto>>> Search([FromQuery] ClinicalTemplateSearchDto dto)
        => Ok(await _service.SearchAsync(dto));

    [HttpPost("{id:guid}/use")]
    public async Task<ActionResult<ClinicalTemplateDto>> IncrementUsage(Guid id)
        => Ok(await _service.IncrementUsageAsync(id));
}
