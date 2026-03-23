using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/practice-license")]
[Authorize]
public class PracticeLicenseController : ControllerBase
{
    private readonly IPracticeLicenseService _service;

    public PracticeLicenseController(IPracticeLicenseService service)
    {
        _service = service;
    }

    [HttpGet("licenses")]
    public async Task<ActionResult<List<PracticeLicenseDto>>> SearchLicenses(
        [FromQuery] string? keyword = null, [FromQuery] string? licenseType = null,
        [FromQuery] int? status = null, [FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
    {
        var filter = new PracticeLicenseSearchDto { Keyword = keyword, LicenseType = licenseType, Status = status, FromDate = fromDate, ToDate = toDate };
        return Ok(await _service.SearchLicensesAsync(filter));
    }

    [HttpGet("licenses/{id}")]
    public async Task<ActionResult<PracticeLicenseDetailDto>> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("licenses")]
    public async Task<ActionResult<PracticeLicenseDto>> CreateLicense([FromBody] CreatePracticeLicenseDto dto)
    {
        return Ok(await _service.CreateLicenseAsync(dto));
    }

    [HttpPut("licenses/{id}")]
    public async Task<ActionResult<PracticeLicenseDto>> UpdateLicense(Guid id, [FromBody] CreatePracticeLicenseDto dto)
    {
        return Ok(await _service.UpdateLicenseAsync(id, dto));
    }

    [HttpGet("expiring")]
    public async Task<ActionResult<List<PracticeLicenseDto>>> GetExpiringLicenses([FromQuery] int withinDays = 90)
    {
        return Ok(await _service.GetExpiringLicensesAsync(withinDays));
    }

    [HttpGet("stats")]
    public async Task<ActionResult<PracticeLicenseStatsDto>> GetStats()
    {
        return Ok(await _service.GetStatsAsync());
    }

    [HttpPut("licenses/{id}/renew")]
    public async Task<ActionResult<PracticeLicenseDto>> RenewLicense(Guid id, [FromQuery] string? newExpiryDate = null)
    {
        return Ok(await _service.RenewLicenseAsync(id, newExpiryDate));
    }
}
