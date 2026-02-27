namespace HIS.Application.Services;

/// <summary>
/// Health check DTOs
/// </summary>
public class ComponentHealthResult
{
    public string Status { get; set; } = "Healthy";
    public string? ResponseTime { get; set; }
    public string? Error { get; set; }

    // Additional properties for specific checks
    public int? Port { get; set; }
    public double? FreeGb { get; set; }
    public double? TotalGb { get; set; }
    public double? UsedMb { get; set; }
    public double? TotalMb { get; set; }
    public double? UsagePercent { get; set; }
}

public class HealthCheckResult
{
    public string Status { get; set; } = "Healthy";
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string Uptime { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
    public Dictionary<string, ComponentHealthResult> Checks { get; set; } = new();
}

/// <summary>
/// Health check service interface for checking system component health
/// </summary>
public interface IHealthCheckService
{
    /// <summary>
    /// Run all health checks and return detailed results
    /// </summary>
    Task<HealthCheckResult> CheckAllAsync();

    /// <summary>
    /// Quick liveness check (app is running)
    /// </summary>
    Task<bool> IsAliveAsync();

    /// <summary>
    /// Readiness check (DB connected, critical services available)
    /// </summary>
    Task<bool> IsReadyAsync();
}
