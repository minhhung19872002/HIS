using System.Security.Claims;
using HIS.Application.DTOs.Abbreviation;
using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/abbreviation")]
[Authorize]
public class AbbreviationController : ControllerBase
{
    private readonly IAbbreviationService _service;

    public AbbreviationController(IAbbreviationService service)
    {
        _service = service;
    }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    [HttpPost]
    public async Task<ActionResult<AbbreviationDto>> Save([FromBody] SaveAbbreviationDto dto)
        => Ok(await _service.SaveAsync(dto, GetUserId()));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id, GetUserId());
        return Ok(new { success = true });
    }

    [HttpGet]
    public async Task<ActionResult<List<AbbreviationDto>>> Search([FromQuery] int? scope, [FromQuery] string? scopeKey)
        => Ok(await _service.SearchAsync(scope, scopeKey, GetUserId()));

    [HttpPost("{id:guid}/use")]
    public async Task<ActionResult<AbbreviationDto>> IncrementUsage(Guid id)
        => Ok(await _service.IncrementUsageAsync(id));
}
