using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Common;
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
    /// Các batch migration hỏng ở lần khởi động gần nhất. Admin-only.
    ///
    /// <para><c>failedCount = 0</c> nghĩa là mọi script đã chạy sạch. Khác 0 là **phải xử lý**, kể
    /// cả khi ứng dụng đang chạy bình thường: bộ chạy cố ý nuốt lỗi từng batch để một script hỏng
    /// không chặn khởi động, nên một migration hỏng KHÔNG làm gì đổ vỡ ngay mà chỉ để lại hậu quả
    /// âm thầm.</para>
    ///
    /// <para>Đúng chuyện đó đã xảy ra: `143_patient_search_accent_ci_ai.sql` và
    /// `150_authz5_auditlogs_append_only.sql` hỏng ở MỌI lần khởi động suốt thời gian dài. Hậu quả
    /// là tìm bệnh nhân không dấu chỉ chạy trên cột họ tên, và nhật ký kiểm toán không hề có lớp
    /// chống sửa/xoá mà TT 54/2017 yêu cầu. Cả hai chỉ lộ ra vì có người tình cờ đọc log khởi động
    /// (#218 / T3). Endpoint này để lần sau không phải trông vào sự tình cờ đó.</para>
    /// </summary>
    [HttpGet("/health/migrations")]
    [Authorize(Roles = RoleNames.Admin)]
    public IActionResult GetMigrationFailures()
    {
        var failures = HIS.Infrastructure.Data.ProductionSchemaRepairRunner.LastRunFailures;
        return Ok(new
        {
            failedCount = failures.Count,
            failures = failures.Select(f => new { f.Script, f.Error, f.Preview }),
        });
    }

    /// <summary>
    /// Schema drift check: reports DbSet types whose backing table is missing in the
    /// current database, plus any table names the runtime model expects. Admin-only.
    /// Used for post-deploy verification when endpoints silently return empty data
    /// because an exception (e.g. "Invalid object name") is being caught upstream.
    /// </summary>
    [HttpGet("/health/schema-drift")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<IActionResult> GetSchemaDrift([FromServices] HIS.Infrastructure.Data.HISDbContext context)
    {
        if (!context.Database.IsSqlServer())
            return Ok(new { isSqlServer = false, missing = Array.Empty<string>() });

        // Issue #26: so EF model (bảng + CỘT) với INFORMATION_SCHEMA — checker cũ chỉ so bảng
        // nên migration thiếu cột (vd mig 70 thiếu PaymentCategory/DrugOrderType) không bị bắt.
        var expectedColumns = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
        foreach (var entityType in context.Model.GetEntityTypes())
        {
            var tableName = entityType.GetTableName();
            if (string.IsNullOrEmpty(tableName)) continue; // view/keyless/not mapped

            if (!expectedColumns.TryGetValue(tableName, out var cols))
                expectedColumns[tableName] = cols = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var storeObject = Microsoft.EntityFrameworkCore.Metadata.StoreObjectIdentifier.Table(
                tableName, entityType.GetSchema());
            foreach (var property in entityType.GetProperties())
            {
                var columnName = property.GetColumnName(storeObject);
                if (!string.IsNullOrEmpty(columnName)) cols.Add(columnName);
            }
        }

        var connection = context.Database.GetDbConnection();
        var shouldClose = connection.State != System.Data.ConnectionState.Open;
        if (shouldClose) await connection.OpenAsync();

        var actualColumns = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
        try
        {
            await using var cmd = connection.CreateCommand();
            cmd.CommandText = "SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo'";
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var table = reader.GetString(0);
                if (!actualColumns.TryGetValue(table, out var cols))
                    actualColumns[table] = cols = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                cols.Add(reader.GetString(1));
            }
        }
        finally
        {
            if (shouldClose) await connection.CloseAsync();
        }

        var missingTables = expectedColumns.Keys
            .Where(t => !actualColumns.ContainsKey(t))
            .OrderBy(t => t)
            .ToList();
        var missingColumns = expectedColumns
            .Where(kv => actualColumns.ContainsKey(kv.Key))
            .SelectMany(kv => kv.Value
                .Where(c => !actualColumns[kv.Key].Contains(c))
                .Select(c => $"{kv.Key}.{c}"))
            .OrderBy(s => s)
            .ToList();

        return Ok(new
        {
            timestamp = DateTime.UtcNow,
            expectedCount = expectedColumns.Count,
            actualCount = actualColumns.Count,
            // missingCount giữ nguyên là gate tổng (CLAUDE.md: sau migration phải = 0) — nay gồm cả cột
            missingCount = missingTables.Count + missingColumns.Count,
            missing = missingTables,
            missingColumnsCount = missingColumns.Count,
            missingColumns
        });
    }

    /// <summary>
    /// Audit-log write reliability counters (Issue #198 AUDIT-1 §c). Audit writes are
    /// fire-and-forget across the codebase (AuditLogMiddleware, AuditLogService,
    /// AuditFieldDiffInterceptor) — this surfaces failures instead of only logging them, so a
    /// spike under load is observable without grepping application logs. Admin-only.
    /// </summary>
    [HttpGet("/health/audit-metrics")]
    [Authorize(Roles = RoleNames.Admin)]
    public IActionResult GetAuditMetrics()
    {
        return Ok(new
        {
            timestamp = DateTime.UtcNow,
            metrics = AuditWriteMetrics.GetSnapshot()
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
