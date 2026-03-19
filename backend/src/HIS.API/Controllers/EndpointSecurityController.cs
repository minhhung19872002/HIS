using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/endpoint-security")]
[Authorize]
public class EndpointSecurityController : ControllerBase
{
    private readonly IEndpointSecurityService _service;
    public EndpointSecurityController(IEndpointSecurityService service) => _service = service;

    [HttpGet("devices")]
    public async Task<ActionResult<List<EndpointDeviceDto>>> GetDevices([FromQuery] string? keyword = null, [FromQuery] int? status = null)
    {
        try { return Ok(await _service.GetDevicesAsync(keyword, status)); }
        catch (Exception ex) when (IsSqlMissing(ex)) { return Ok(new List<EndpointDeviceDto>()); }
    }

    [HttpGet("devices/{id}")]
    public async Task<ActionResult<EndpointDeviceDto>> GetDevice(Guid id)
    {
        var device = await _service.GetDeviceByIdAsync(id);
        return device == null ? NotFound() : Ok(device);
    }

    [HttpPost("devices")]
    public async Task<ActionResult<EndpointDeviceDto>> RegisterDevice([FromBody] RegisterDeviceDto dto)
        => Ok(await _service.RegisterDeviceAsync(dto));

    [HttpPut("devices/{id}/status")]
    public async Task<ActionResult<EndpointDeviceDto>> UpdateDeviceStatus(Guid id, [FromBody] UpdateDeviceStatusDto dto)
    {
        var device = await _service.UpdateDeviceStatusAsync(id, dto);
        return device == null ? NotFound() : Ok(device);
    }

    [HttpDelete("devices/{id}")]
    public async Task<ActionResult> DeleteDevice(Guid id)
    {
        var result = await _service.DeleteDeviceAsync(id);
        return result ? NoContent() : NotFound();
    }

    [HttpGet("incidents")]
    public async Task<ActionResult<List<SecurityIncidentDto>>> GetIncidents([FromQuery] int? severity = null, [FromQuery] int? status = null, [FromQuery] string? keyword = null)
    {
        try { return Ok(await _service.GetIncidentsAsync(severity, status, keyword)); }
        catch (Exception ex) when (IsSqlMissing(ex)) { return Ok(new List<SecurityIncidentDto>()); }
    }

    [HttpGet("incidents/{id}")]
    public async Task<ActionResult<SecurityIncidentDto>> GetIncident(Guid id)
    {
        var incident = await _service.GetIncidentByIdAsync(id);
        return incident == null ? NotFound() : Ok(incident);
    }

    [HttpPost("incidents")]
    public async Task<ActionResult<SecurityIncidentDto>> CreateIncident([FromBody] CreateIncidentDto dto)
        => Ok(await _service.CreateIncidentAsync(dto));

    [HttpPut("incidents/{id}")]
    public async Task<ActionResult<SecurityIncidentDto>> UpdateIncident(Guid id, [FromBody] UpdateIncidentDto dto)
    {
        var incident = await _service.UpdateIncidentAsync(id, dto);
        return incident == null ? NotFound() : Ok(incident);
    }

    [HttpPost("incidents/{id}/resolve")]
    public async Task<ActionResult<SecurityIncidentDto>> ResolveIncident(Guid id, [FromBody] ResolveIncidentRequest request)
    {
        var incident = await _service.ResolveIncidentAsync(id, request.Resolution, request.RootCause);
        return incident == null ? NotFound() : Ok(incident);
    }

    [HttpGet("software")]
    public async Task<ActionResult<List<InstalledSoftwareDto>>> GetSoftware([FromQuery] Guid? deviceId = null, [FromQuery] bool? authorized = null)
    {
        try { return Ok(await _service.GetSoftwareInventoryAsync(deviceId, authorized)); }
        catch (Exception ex) when (IsSqlMissing(ex)) { return Ok(new List<InstalledSoftwareDto>()); }
    }

    [HttpPost("software/{id}/flag-unauthorized")]
    public async Task<ActionResult> FlagUnauthorized(Guid id, [FromBody] FlagSoftwareRequest? request = null)
    {
        var result = await _service.FlagUnauthorizedSoftwareAsync(id, request?.Notes);
        return result ? Ok() : NotFound();
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<EndpointSecurityDashboardDto>> GetDashboard()
    {
        try { return Ok(await _service.GetDashboardAsync()); }
        catch (Exception ex) when (IsSqlMissing(ex))
        {
            return Ok(new EndpointSecurityDashboardDto { CompliancePercent = 100 });
        }
    }

    private static bool IsSqlMissing(Exception ex)
    {
        var msg = ex.InnerException?.Message ?? ex.Message;
        return msg.Contains("Invalid object name") || msg.Contains("Invalid column name")
            || msg.Contains("does not exist") || msg.Contains("208") || msg.Contains("207");
    }
}

public class ResolveIncidentRequest
{
    public string Resolution { get; set; } = string.Empty;
    public string? RootCause { get; set; }
}

public class FlagSoftwareRequest
{
    public string? Notes { get; set; }
}
