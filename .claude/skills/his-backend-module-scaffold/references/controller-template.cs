// Template for HIS controller
// Location: backend/src/HIS.API/Controllers/<Xxx>Controller.cs
// Replace <Xxx> + <route> placeholders.

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.<Xxx>;
using HIS.Application.Interfaces;

namespace HIS.API.Controllers;

[ApiController]
[Authorize]
[Route("api/<route>")]
public class <Xxx>Controller : ControllerBase
{
    private readonly I<Xxx>Service _service;

    public <Xxx>Controller(I<Xxx>Service service)
    {
        _service = service;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                   ?? throw new UnauthorizedAccessException("Missing user id claim"));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var dto = await _service.GetByIdAsync(id);
        if (dto == null) return NotFound();
        return Ok(new { data = dto });
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] <Xxx>FilterDto filter)
    {
        var items = await _service.GetListAsync(filter);
        return Ok(new { data = items, total = items.Count });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] <Xxx>CreateDto dto)
    {
        var created = await _service.CreateAsync(dto, CurrentUserId);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, new { data = created });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] <Xxx>UpdateDto dto)
    {
        var updated = await _service.UpdateAsync(id, dto, CurrentUserId);
        if (updated == null) return NotFound();
        return Ok(new { data = updated });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ok = await _service.DeleteAsync(id, CurrentUserId);
        if (!ok) return NotFound();
        return NoContent();
    }

    // Optional: public health-check / lookup endpoint
    // [HttpGet("ping")]
    // [AllowAnonymous]
    // public IActionResult Ping() => Ok(new { ok = true });
}
