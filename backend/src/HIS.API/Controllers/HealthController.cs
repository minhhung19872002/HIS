using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Infrastructure.Services;

namespace HIS.API.Controllers;

/// <summary>
/// Health check endpoints for monitoring system status.
/// /health, /health/live, /health/ready are public (no auth required).
/// /health/details requires authorization.
/// </summary>
[ApiController]
public class HealthController : ControllerBase
{
    private readonly IHealthCheckService _healthCheckService;

    public HealthController(IHealthCheckService healthCheckService)
    {
        _healthCheckService = healthCheckService;
    }

    /// <summary>
    /// Overall health status. Returns 200 if Healthy/Degraded, 503 if Unhealthy.
    /// </summary>
    [HttpGet("/health")]
    [AllowAnonymous]
    public async Task<IActionResult> GetHealth()
    {
        try
        {
            var result = await _healthCheckService.CheckAllAsync();
            var statusCode = result.Status == "Unhealthy" ? 503 : 200;
            return StatusCode(statusCode, new
            {
                status = result.Status,
                timestamp = result.Timestamp,
                uptime = result.Uptime,
                version = result.Version
            });
        }
        catch (Exception)
        {
            return StatusCode(503, new
            {
                status = "Unhealthy",
                timestamp = DateTime.UtcNow,
                error = "Health check failed"
            });
        }
    }

    /// <summary>
    /// Liveness check - returns 200 if the application is running.
    /// Used by orchestrators (Docker, K8s) to determine if the process should be restarted.
    /// </summary>
    [HttpGet("/health/live")]
    [AllowAnonymous]
    public async Task<IActionResult> GetLiveness()
    {
        try
        {
            var alive = await _healthCheckService.IsAliveAsync();
            return alive
                ? Ok(new { status = "Alive", timestamp = DateTime.UtcNow })
                : StatusCode(503, new { status = "Dead", timestamp = DateTime.UtcNow });
        }
        catch (Exception)
        {
            return StatusCode(503, new { status = "Dead", timestamp = DateTime.UtcNow });
        }
    }

    /// <summary>
    /// Readiness check - returns 200 if the application is ready to serve requests (DB connected).
    /// Used by load balancers to determine if traffic should be routed to this instance.
    /// </summary>
    [HttpGet("/health/ready")]
    [AllowAnonymous]
    public async Task<IActionResult> GetReadiness()
    {
        try
        {
            var ready = await _healthCheckService.IsReadyAsync();
            return ready
                ? Ok(new { status = "Ready", timestamp = DateTime.UtcNow })
                : StatusCode(503, new { status = "NotReady", timestamp = DateTime.UtcNow });
        }
        catch (Exception)
        {
            return StatusCode(503, new { status = "NotReady", timestamp = DateTime.UtcNow });
        }
    }

    /// <summary>
    /// Detailed health check with individual component status. Requires authorization.
    /// </summary>
    [HttpGet("/health/details")]
    [Authorize]
    public async Task<IActionResult> GetHealthDetails()
    {
        try
        {
            var result = await _healthCheckService.CheckAllAsync();
            var statusCode = result.Status == "Unhealthy" ? 503 : 200;
            return StatusCode(statusCode, result);
        }
        catch (Exception ex)
        {
            return StatusCode(503, new
            {
                status = "Unhealthy",
                timestamp = DateTime.UtcNow,
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// Schema drift check: reports DbSet types whose backing table is missing in the
    /// current database, plus any table names the runtime model expects. Admin-only.
    /// Used for post-deploy verification when endpoints silently return empty data
    /// because an exception (e.g. "Invalid object name") is being caught upstream.
    /// </summary>
    [HttpGet("/health/schema-drift")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetSchemaDrift([FromServices] HIS.Infrastructure.Data.HISDbContext context)
    {
        if (!context.Database.IsSqlServer())
            return Ok(new { isSqlServer = false, missing = Array.Empty<string>() });

        var expected = context.Model.GetEntityTypes()
            .Select(t => t.GetTableName())
            .Where(n => !string.IsNullOrEmpty(n))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var connection = context.Database.GetDbConnection();
        var shouldClose = connection.State != System.Data.ConnectionState.Open;
        if (shouldClose) await connection.OpenAsync();

        var actual = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            await using var cmd = connection.CreateCommand();
            cmd.CommandText = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = 'dbo'";
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                actual.Add(reader.GetString(0));
        }
        finally
        {
            if (shouldClose) await connection.CloseAsync();
        }

        var missing = expected.Where(n => !actual.Contains(n!)).OrderBy(n => n).ToList();
        return Ok(new
        {
            timestamp = DateTime.UtcNow,
            expectedCount = expected.Count,
            actualCount = actual.Count,
            missingCount = missing.Count,
            missing
        });
    }
}

/// <summary>
/// Metrics endpoint for monitoring request statistics. Requires authorization.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MetricsController : ControllerBase
{
    private readonly MetricsService _metricsService;

    public MetricsController(MetricsService metricsService)
    {
        _metricsService = metricsService;
    }

    /// <summary>
    /// Get current request metrics (total requests, active, errors, response times, top endpoints)
    /// </summary>
    [HttpGet]
    public IActionResult GetMetrics()
    {
        try
        {
            var snapshot = _metricsService.GetSnapshot();
            return Ok(snapshot);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
