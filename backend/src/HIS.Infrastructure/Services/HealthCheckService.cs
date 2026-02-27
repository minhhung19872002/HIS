using System.Diagnostics;
using System.Net.Sockets;
using HIS.Application.Services;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public class HealthCheckService : IHealthCheckService
{
    private readonly HISDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<HealthCheckService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private static readonly DateTime _startTime = DateTime.UtcNow;
    private const int CheckTimeoutMs = 5000;

    public HealthCheckService(
        HISDbContext dbContext,
        IConfiguration configuration,
        ILogger<HealthCheckService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<HealthCheckResult> CheckAllAsync()
    {
        var result = new HealthCheckResult
        {
            Timestamp = DateTime.UtcNow,
            Uptime = FormatUptime(DateTime.UtcNow - _startTime),
            Version = GetVersion()
        };

        // Run all checks in parallel
        var sqlTask = CheckSqlServerAsync();
        var redisTask = CheckRedisAsync();
        var pacsTask = CheckOrthancPacsAsync();
        var hl7Task = CheckHl7ListenerAsync();
        var diskTask = Task.Run(() => CheckDiskSpace());
        var memTask = Task.Run(() => CheckMemory());

        await Task.WhenAll(sqlTask, redisTask, pacsTask, hl7Task, diskTask, memTask);

        result.Checks["sqlServer"] = await sqlTask;
        result.Checks["redis"] = await redisTask;
        result.Checks["orthancPacs"] = await pacsTask;
        result.Checks["hl7Listener"] = await hl7Task;
        result.Checks["diskSpace"] = await diskTask;
        result.Checks["memory"] = await memTask;

        // Overall status: Unhealthy if SQL is down, Degraded if optional services are down
        if (result.Checks["sqlServer"].Status == "Unhealthy")
        {
            result.Status = "Unhealthy";
        }
        else if (result.Checks.Values.Any(c => c.Status == "Unhealthy"))
        {
            result.Status = "Degraded";
        }
        else
        {
            result.Status = "Healthy";
        }

        return result;
    }

    public async Task<bool> IsAliveAsync()
    {
        // Simple liveness: app is running
        await Task.CompletedTask;
        return true;
    }

    public async Task<bool> IsReadyAsync()
    {
        try
        {
            // Check SQL Server connectivity
            var sqlCheck = await CheckSqlServerAsync();
            return sqlCheck.Status == "Healthy";
        }
        catch
        {
            return false;
        }
    }

    private async Task<ComponentHealthResult> CheckSqlServerAsync()
    {
        var result = new ComponentHealthResult();
        var sw = Stopwatch.StartNew();
        try
        {
            using var cts = new CancellationTokenSource(CheckTimeoutMs);
            // Simple query to check connectivity
            await _dbContext.Database.ExecuteSqlRawAsync("SELECT 1", cts.Token);
            sw.Stop();
            result.Status = "Healthy";
            result.ResponseTime = $"{sw.ElapsedMilliseconds}ms";
        }
        catch (OperationCanceledException)
        {
            sw.Stop();
            result.Status = "Unhealthy";
            result.ResponseTime = $"{sw.ElapsedMilliseconds}ms";
            result.Error = "Connection timed out";
        }
        catch (Exception ex)
        {
            sw.Stop();
            result.Status = "Unhealthy";
            result.ResponseTime = $"{sw.ElapsedMilliseconds}ms";
            result.Error = ex.Message;
            _logger.LogWarning(ex, "SQL Server health check failed");
        }
        return result;
    }

    private async Task<ComponentHealthResult> CheckRedisAsync()
    {
        var result = new ComponentHealthResult();
        var sw = Stopwatch.StartNew();
        try
        {
            using var cts = new CancellationTokenSource(CheckTimeoutMs);
            using var client = new TcpClient();
            await client.ConnectAsync("localhost", 6379, cts.Token);
            sw.Stop();

            if (client.Connected)
            {
                result.Status = "Healthy";
                result.ResponseTime = $"{sw.ElapsedMilliseconds}ms";
            }
            else
            {
                result.Status = "Unhealthy";
                result.ResponseTime = $"{sw.ElapsedMilliseconds}ms";
                result.Error = "Connection refused";
            }
        }
        catch (OperationCanceledException)
        {
            sw.Stop();
            result.Status = "Unhealthy";
            result.ResponseTime = $"{sw.ElapsedMilliseconds}ms";
            result.Error = "Connection timed out";
        }
        catch (Exception ex)
        {
            sw.Stop();
            result.Status = "Unhealthy";
            result.ResponseTime = $"{sw.ElapsedMilliseconds}ms";
            result.Error = ex.Message;
            _logger.LogWarning("Redis health check failed: {Message}", ex.Message);
        }
        return result;
    }

    private async Task<ComponentHealthResult> CheckOrthancPacsAsync()
    {
        var result = new ComponentHealthResult();
        var sw = Stopwatch.StartNew();
        try
        {
            var baseUrl = _configuration["PACS:BaseUrl"] ?? "http://localhost:8042";
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromMilliseconds(CheckTimeoutMs);

            var response = await client.GetAsync($"{baseUrl}/system");
            sw.Stop();

            if (response.IsSuccessStatusCode)
            {
                result.Status = "Healthy";
                result.ResponseTime = $"{sw.ElapsedMilliseconds}ms";
            }
            else
            {
                result.Status = "Unhealthy";
                result.ResponseTime = $"{sw.ElapsedMilliseconds}ms";
                result.Error = $"HTTP {(int)response.StatusCode}";
            }
        }
        catch (OperationCanceledException)
        {
            sw.Stop();
            result.Status = "Unhealthy";
            result.ResponseTime = $"{sw.ElapsedMilliseconds}ms";
            result.Error = "Connection timed out";
        }
        catch (Exception ex)
        {
            sw.Stop();
            result.Status = "Unhealthy";
            result.ResponseTime = $"{sw.ElapsedMilliseconds}ms";
            result.Error = ex.Message;
            _logger.LogWarning("Orthanc PACS health check failed: {Message}", ex.Message);
        }
        return result;
    }

    private async Task<ComponentHealthResult> CheckHl7ListenerAsync()
    {
        var result = new ComponentHealthResult();
        var sw = Stopwatch.StartNew();
        try
        {
            var port = _configuration.GetValue<int>("HL7:ReceiverPort", 2576);
            result.Port = port;

            using var cts = new CancellationTokenSource(CheckTimeoutMs);
            using var client = new TcpClient();
            await client.ConnectAsync("localhost", port, cts.Token);
            sw.Stop();

            if (client.Connected)
            {
                result.Status = "Healthy";
                result.ResponseTime = $"{sw.ElapsedMilliseconds}ms";
            }
            else
            {
                result.Status = "Unhealthy";
                result.ResponseTime = $"{sw.ElapsedMilliseconds}ms";
                result.Error = "Connection refused";
            }
        }
        catch (OperationCanceledException)
        {
            sw.Stop();
            result.Status = "Unhealthy";
            result.ResponseTime = $"{sw.ElapsedMilliseconds}ms";
            result.Error = "Connection timed out";
        }
        catch (Exception ex)
        {
            sw.Stop();
            result.Status = "Unhealthy";
            result.ResponseTime = $"{sw.ElapsedMilliseconds}ms";
            result.Port = _configuration.GetValue<int>("HL7:ReceiverPort", 2576);
            result.Error = ex.Message;
            _logger.LogWarning("HL7 Listener health check failed: {Message}", ex.Message);
        }
        return result;
    }

    private ComponentHealthResult CheckDiskSpace()
    {
        var result = new ComponentHealthResult();
        try
        {
            var drive = new DriveInfo(Path.GetPathRoot(AppContext.BaseDirectory) ?? "C:");
            var freeGb = Math.Round(drive.AvailableFreeSpace / (1024.0 * 1024 * 1024), 1);
            var totalGb = Math.Round(drive.TotalSize / (1024.0 * 1024 * 1024), 1);
            var usagePercent = Math.Round((1 - (double)drive.AvailableFreeSpace / drive.TotalSize) * 100, 1);

            result.FreeGb = freeGb;
            result.TotalGb = totalGb;
            result.UsagePercent = usagePercent;

            // Warn if less than 5 GB free or > 90% usage
            if (freeGb < 5 || usagePercent > 90)
            {
                result.Status = "Unhealthy";
                result.Error = $"Low disk space: {freeGb} GB free ({usagePercent}% used)";
            }
            else
            {
                result.Status = "Healthy";
            }
        }
        catch (Exception ex)
        {
            result.Status = "Unhealthy";
            result.Error = ex.Message;
            _logger.LogWarning("Disk space check failed: {Message}", ex.Message);
        }
        return result;
    }

    private ComponentHealthResult CheckMemory()
    {
        var result = new ComponentHealthResult();
        try
        {
            var process = Process.GetCurrentProcess();
            var usedMb = Math.Round(process.WorkingSet64 / (1024.0 * 1024), 0);
            var totalMb = Math.Round(GC.GetGCMemoryInfo().TotalAvailableMemoryBytes / (1024.0 * 1024), 0);
            var usagePercent = totalMb > 0 ? Math.Round(usedMb / totalMb * 100, 1) : 0;

            result.UsedMb = usedMb;
            result.TotalMb = totalMb;
            result.UsagePercent = usagePercent;

            // Warn if process uses more than 1GB or > 80% of available
            if (usedMb > 1024 || usagePercent > 80)
            {
                result.Status = "Unhealthy";
                result.Error = $"High memory usage: {usedMb} MB ({usagePercent}%)";
            }
            else
            {
                result.Status = "Healthy";
            }
        }
        catch (Exception ex)
        {
            result.Status = "Unhealthy";
            result.Error = ex.Message;
            _logger.LogWarning("Memory check failed: {Message}", ex.Message);
        }
        return result;
    }

    private static string FormatUptime(TimeSpan uptime)
    {
        if (uptime.TotalDays >= 1)
            return $"{(int)uptime.TotalDays}d {uptime.Hours}h {uptime.Minutes}m";
        if (uptime.TotalHours >= 1)
            return $"{(int)uptime.TotalHours}h {uptime.Minutes}m";
        return $"{(int)uptime.TotalMinutes}m {uptime.Seconds}s";
    }

    private static string GetVersion()
    {
        var assembly = System.Reflection.Assembly.GetEntryAssembly();
        var version = assembly?.GetName().Version;
        return version != null ? $"{version.Major}.{version.Minor}.{version.Build}" : "1.0.0";
    }
}
