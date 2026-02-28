using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.CDA;
using HIS.Application.Services;

namespace HIS.API.Controllers;

/// <summary>
/// HL7 CDA R2 Document Generation Controller
/// Generates and manages Clinical Document Architecture documents
/// for health information exchange (TT 54/2017, TT 32/2023, TT 13/2025)
/// </summary>
[ApiController]
[Route("api/cda")]
[Authorize]
public class CdaDocumentController : ControllerBase
{
    private readonly ICdaDocumentService _cdaService;

    public CdaDocumentController(ICdaDocumentService cdaService)
    {
        _cdaService = cdaService;
    }

    private string GetUserId() => User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? "";

    /// <summary>
    /// POST /api/cda/generate - Generate a new CDA document
    /// </summary>
    [HttpPost("generate")]
    public async Task<IActionResult> GenerateCdaDocument([FromBody] GenerateCdaRequest request)
    {
        try
        {
            var result = await _cdaService.GenerateCdaDocumentAsync(request, GetUserId());
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/cda - Search CDA documents with pagination and filters
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> SearchCdaDocuments([FromQuery] CdaDocumentSearchDto search)
    {
        var result = await _cdaService.SearchCdaDocumentsAsync(search);
        return Ok(result);
    }

    /// <summary>
    /// GET /api/cda/{id} - Get CDA document by ID (includes XML content)
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetCdaDocument(Guid id)
    {
        var result = await _cdaService.GetCdaDocumentAsync(id);
        if (result == null) return NotFound(new { message = $"CDA document {id} not found" });
        return Ok(result);
    }

    /// <summary>
    /// GET /api/cda/{id}/xml - Get raw CDA XML content
    /// Returns XML with proper content type for downstream processing
    /// </summary>
    [HttpGet("{id}/xml")]
    public async Task<IActionResult> GetCdaXml(Guid id)
    {
        try
        {
            var xml = await _cdaService.GetCdaXmlAsync(id);
            return Content(xml, "application/xml; charset=utf-8");
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/cda/{id}/validate - Validate CDA document against HL7 CDA R2 rules
    /// </summary>
    [HttpPost("{id}/validate")]
    public async Task<IActionResult> ValidateCdaDocument(Guid id)
    {
        try
        {
            var result = await _cdaService.ValidateCdaDocumentAsync(id);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// PUT /api/cda/{id}/finalize - Finalize a draft CDA document (status 0 -> 1)
    /// </summary>
    [HttpPut("{id}/finalize")]
    public async Task<IActionResult> FinalizeCdaDocument(Guid id)
    {
        try
        {
            var result = await _cdaService.FinalizeCdaDocumentAsync(id, GetUserId());
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// PUT /api/cda/{id}/regenerate - Regenerate CDA document XML from current clinical data
    /// </summary>
    [HttpPut("{id}/regenerate")]
    public async Task<IActionResult> RegenerateCdaDocument(Guid id)
    {
        try
        {
            var result = await _cdaService.RegenerateCdaDocumentAsync(id, GetUserId());
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// DELETE /api/cda/{id} - Delete a draft CDA document (soft delete)
    /// Only draft (status=0) and finalized (status=1) documents can be deleted
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCdaDocument(Guid id)
    {
        try
        {
            await _cdaService.DeleteCdaDocumentAsync(id);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
