using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Daily seed endpoint. Generates fake patient registrations with CreatedAt=today
/// so Reception page always shows activity. Secured via X-Seed-Key header, invoked
/// by Cloud Scheduler once per day.
/// #365 REFAC-3: thinned — seed logic moved to <see cref="IDailySeedService"/>
/// (backend/src/HIS.Infrastructure/Services/DevData/DailySeedServiceImpl.cs).
/// </summary>
[ApiController]
[Route("api/admin/seed-daily")]
[AllowAnonymous]
public class DailySeedController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly IDailySeedService _service;

    public DailySeedController(IConfiguration config, IDailySeedService service)
    {
        _config = config;
        _service = service;
    }

    [HttpPost("patients")]
    public async Task<IActionResult> SeedPatients([FromQuery] int count = 30, [FromQuery] bool purge = false)
    {
        var expectedKey = _config["DailySeed:Key"];
        if (string.IsNullOrWhiteSpace(expectedKey))
            return StatusCode(503, new { error = "DailySeed:Key not configured" });

        var providedKey = Request.Headers["X-Seed-Key"].ToString();
        if (providedKey != expectedKey)
            return Unauthorized(new { error = "Invalid X-Seed-Key" });

        if (count < 1 || count > 200)
            return BadRequest(new { error = "count must be 1..200" });

        var result = await _service.RunDailySeedAsync(count, purge);
        if (result is null)
            return StatusCode(503, new { error = "No active examination rooms" });
        return Ok(result);
    }
}
