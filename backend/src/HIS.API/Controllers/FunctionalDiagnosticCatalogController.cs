using HIS.Application.DTOs.FunctionalDiagnostic;
using HIS.Application.Interfaces;
using HIS.API.Filters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HIS.API.Controllers;

/// <summary>
/// Danh mục thăm dò chức năng: Loại TDCN + Mẫu kết quả.
/// Route: /api/functional-diagnostic-catalog
/// </summary>
[ApiController]
[Route("api/functional-diagnostic-catalog")]
[Authorize]
[TypeFilter(typeof(DomainExceptionFilter))]
public class FunctionalDiagnosticCatalogController : ControllerBase
{
    private readonly IFunctionalDiagnosticCatalogService _svc;

    public FunctionalDiagnosticCatalogController(IFunctionalDiagnosticCatalogService svc)
        => _svc = svc;

    private string? UserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);

    // ─── Test Types ───────────────────────────────────────────────────────────

    [HttpGet("test-types")]
    public async Task<ActionResult<List<FunctionalDiagnosticTestTypeDto>>> GetTestTypes(
        [FromQuery] string? keyword)
        => Ok(await _svc.GetTestTypesAsync(keyword));

    [HttpPost("test-types")]
    public async Task<ActionResult<FunctionalDiagnosticTestTypeDto>> SaveTestType(
        [FromBody] SaveFunctionalDiagnosticTestTypeDto dto)
        => Ok(await _svc.SaveTestTypeAsync(dto, UserId()));

    [HttpDelete("test-types/{id:guid}")]
    public async Task<ActionResult<object>> DeleteTestType(Guid id)
        => Ok(new { success = await _svc.DeleteTestTypeAsync(id) });

    // ─── Templates ────────────────────────────────────────────────────────────

    [HttpGet("templates")]
    public async Task<ActionResult<List<FunctionalDiagnosticTemplateDto>>> GetTemplates(
        [FromQuery] Guid? testTypeId, [FromQuery] string? keyword)
        => Ok(await _svc.GetTemplatesAsync(testTypeId, keyword));

    [HttpPost("templates")]
    public async Task<ActionResult<FunctionalDiagnosticTemplateDto>> SaveTemplate(
        [FromBody] SaveFunctionalDiagnosticTemplateDto dto)
        => Ok(await _svc.SaveTemplateAsync(dto, UserId()));

    [HttpDelete("templates/{id:guid}")]
    public async Task<ActionResult<object>> DeleteTemplate(Guid id)
        => Ok(new { success = await _svc.DeleteTemplateAsync(id) });
}
