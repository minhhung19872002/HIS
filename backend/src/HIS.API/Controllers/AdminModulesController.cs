using System.Security.Claims;
using HIS.Application.DTOs;
using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Admin modules MVP: G-41 Payroll, G-42 HR Decisions, G-43 VPP StockCard (reuse /api/warehouse),
/// G-44 Official Documents.
/// Base route: /api/admin-modules
/// </summary>
[ApiController]
[Route("api/admin-modules")]
[Authorize]
public class AdminModulesController : ControllerBase
{
    private readonly IAdminModulesService _svc;
    public AdminModulesController(IAdminModulesService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    private string GetUserName() =>
        User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue(ClaimTypes.Email) ?? "system";

    // ─── G-41: Payroll ────────────────────────────────────────────────────

    [HttpGet("payroll/periods")]
    public async Task<IActionResult> GetPeriods([FromQuery] int? year)
        => Ok(await _svc.GetPayrollPeriodsAsync(year));

    [HttpGet("payroll/periods/{id:guid}")]
    public async Task<IActionResult> GetPeriod(Guid id)
    {
        var dto = await _svc.GetPayrollPeriodAsync(id);
        return dto == null ? NotFound() : Ok(dto);
    }

    [HttpPost("payroll/periods")]
    public async Task<IActionResult> CreatePeriod([FromBody] CreatePayrollPeriodDto dto)
    {
        try { return Ok(await _svc.CreatePayrollPeriodAsync(dto, GetUserId())); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("payroll/periods/{id:guid}/approve")]
    public async Task<IActionResult> ApprovePeriod(Guid id)
    {
        try { return Ok(await _svc.ApprovePayrollPeriodAsync(id, GetUserName())); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("payroll/periods/{id:guid}/generate")]
    public async Task<IActionResult> GenerateItems(Guid id)
    {
        try { return Ok(await _svc.GeneratePayrollItemsAsync(id, GetUserId())); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("payroll/periods/{id:guid}/items")]
    public async Task<IActionResult> GetItems(Guid id)
        => Ok(await _svc.GetPayrollItemsAsync(id));

    [HttpPost("payroll/items")]
    public async Task<IActionResult> SaveItem([FromBody] SavePayrollItemDto dto)
        => Ok(await _svc.SavePayrollItemAsync(dto));

    [HttpDelete("payroll/items/{id:guid}")]
    public async Task<IActionResult> DeleteItem(Guid id)
    {
        await _svc.DeletePayrollItemAsync(id);
        return NoContent();
    }

    // ─── G-42: HR Decisions ───────────────────────────────────────────────

    [HttpGet("hr-decisions")]
    public async Task<IActionResult> GetDecisions(
        [FromQuery] int? decisionType,
        [FromQuery] int? status,
        [FromQuery] string? staffId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? keyword)
        => Ok(await _svc.GetHrDecisionsAsync(decisionType, status, staffId, from, to, keyword));

    [HttpGet("hr-decisions/{id:guid}")]
    public async Task<IActionResult> GetDecision(Guid id)
    {
        var dto = await _svc.GetHrDecisionAsync(id);
        return dto == null ? NotFound() : Ok(dto);
    }

    [HttpPost("hr-decisions")]
    public async Task<IActionResult> SaveDecision([FromBody] SaveHrDecisionDto dto)
        => Ok(await _svc.SaveHrDecisionAsync(dto, GetUserId()));

    [HttpDelete("hr-decisions/{id:guid}")]
    public async Task<IActionResult> DeleteDecision(Guid id)
    {
        await _svc.DeleteHrDecisionAsync(id);
        return NoContent();
    }

    // ─── G-44: Official Documents ─────────────────────────────────────────

    [HttpGet("official-documents")]
    public async Task<IActionResult> GetDocs(
        [FromQuery] int? documentType,
        [FromQuery] int? status,
        [FromQuery] string? keyword)
        => Ok(await _svc.GetOfficialDocumentsAsync(documentType, status, keyword));

    [HttpGet("official-documents/{id:guid}")]
    public async Task<IActionResult> GetDoc(Guid id)
    {
        var dto = await _svc.GetOfficialDocumentAsync(id);
        return dto == null ? NotFound() : Ok(dto);
    }

    [HttpPost("official-documents")]
    public async Task<IActionResult> SaveDoc([FromBody] SaveOfficialDocumentDto dto)
        => Ok(await _svc.SaveOfficialDocumentAsync(dto, GetUserId()));

    [HttpDelete("official-documents/{id:guid}")]
    public async Task<IActionResult> DeleteDoc(Guid id)
    {
        await _svc.DeleteOfficialDocumentAsync(id);
        return NoContent();
    }

    [HttpGet("official-documents/kpi/overdue")]
    public async Task<IActionResult> GetOverdueCount()
        => Ok(new { count = await _svc.GetOverdueCountAsync() });
}
