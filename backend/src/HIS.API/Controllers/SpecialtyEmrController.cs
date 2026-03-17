using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.SpecialtyEmr;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/specialty-emr")]
[Authorize]
public class SpecialtyEmrController : ControllerBase
{
    private readonly ISpecialtyEmrService _service;

    public SpecialtyEmrController(ISpecialtyEmrService service)
    {
        _service = service;
    }

    [HttpGet("search")]
    public async Task<ActionResult<SpecialtyEmrPagedResult>> Search([FromQuery] SpecialtyEmrSearchDto dto)
    {
        var result = await _service.SearchAsync(dto);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SpecialtyEmrDto>> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<SpecialtyEmrDto>> Save([FromBody] SpecialtyEmrSaveDto dto)
    {
        var result = await _service.SaveAsync(dto);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var deleted = await _service.DeleteAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }

    [HttpGet("{id}/pdf")]
    public async Task<ActionResult> ExportPdf(Guid id)
    {
        var bytes = await _service.ExportPdfAsync(id);
        return File(bytes, "text/html", $"specialty-emr-{id}.html");
    }

    [HttpGet("{id}/xml")]
    public async Task<ActionResult> ExportXml(Guid id)
    {
        var bytes = await _service.ExportXmlAsync(id);
        return File(bytes, "application/xml", $"specialty-emr-{id}.xml");
    }
}
