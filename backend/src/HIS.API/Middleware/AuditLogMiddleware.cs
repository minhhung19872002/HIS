using System.Security.Claims;
using System.Text.Json;
using System.Threading.Channels;
using HIS.Application.Common;
using HIS.Core.Entities;

namespace HIS.API.Middleware;

/// <summary>
/// Middleware that automatically logs POST/PUT/DELETE API calls for Level 6 audit compliance.
/// Placed after authentication middleware so JWT claims are available.
/// #371 inc-2: Logs are enqueued to a bounded Channel and written by AuditWriterWorker (batch, graceful-shutdown).
/// </summary>
public class AuditLogMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditLogMiddleware> _logger;
    private readonly ChannelWriter<AuditLog> _auditChannel;

    // Paths to skip audit logging (health checks, swagger, static files)
    private static readonly string[] SkipPaths = new[]
    {
        "/health",
        "/swagger",
        "/favicon",
        "/_framework",
        "/_blazor",
        "/api/health",
        "/api/metrics"
    };

    // Sensitive paths that require GET request auditing (Level 6 compliance).
    // Only detail-level GETs (with an ID segment) are logged, not list endpoints.
    // NOTE: prefixes must match the ACTUAL controller route (verified via [Route] attributes),
    // not just the module name used in RouteModuleMap below — e.g. LISCompleteController maps
    // to "api/LISComplete" (from [Route("api/[controller]")]), NOT "api/lis". Issue #198 (b).
    private static readonly string[] SensitiveGetPaths = new[]
    {
        "/api/patients/",
        "/api/examination/",
        "/api/emr/",
        "/api/inpatient/",
        "/api/prescription/",
        "/api/reception/patient",
        "/api/liscomplete/",       // LISCompleteController — lab orders/results
        "/api/riscomplete/",       // RISCompleteController — radiology orders/reports
        "/api/billingcomplete/",   // BillingCompleteController — invoices/receipts
        "/api/bloodbankcomplete/"  // BloodBankCompleteController — issue/transfusion records
    };

    // Map API route prefixes to module names
    private static readonly Dictionary<string, string> RouteModuleMap = new(StringComparer.OrdinalIgnoreCase)
    {
        { "/api/auth", "Auth" },
        { "/api/reception", "Reception" },
        { "/api/examination", "OPD" },
        { "/api/opd", "OPD" },
        { "/api/inpatient", "Inpatient" },
        { "/api/ipd", "Inpatient" },
        { "/api/pharmacy", "Pharmacy" },
        { "/api/warehouse", "Warehouse" },
        { "/api/billing", "Billing" },
        { "/api/surgery", "Surgery" },
        { "/api/lis", "Laboratory" },
        { "/api/laboratory", "Laboratory" },
        { "/api/ris", "Radiology" },
        { "/api/radiology", "Radiology" },
        { "/api/bloodbank", "BloodBank" },
        { "/api/insurance", "Insurance" },
        { "/api/emr", "EMR" },
        { "/api/prescription", "Prescription" },
        { "/api/patients", "Patient" },
        { "/api/admin", "SystemAdmin" },
        { "/api/catalog", "MasterData" },
        { "/api/reports", "Reports" },
        { "/api/data-inheritance", "DataInheritance" },
        { "/api/nutrition", "Nutrition" },
        { "/api/telemedicine", "Telemedicine" },
        { "/api/infectioncontrol", "InfectionControl" },
        { "/api/rehabilitation", "Rehabilitation" },
        { "/api/equipment", "Equipment" },
        { "/api/medicalhr", "HR" },
        { "/api/quality", "Quality" },
        { "/api/portal", "PatientPortal" },
        { "/api/hie", "HealthExchange" },
        { "/api/mci", "EmergencyDisaster" },
        { "/api/fhir", "FHIR" },
        { "/api/audit", "Audit" },
        { "/api/pdf", "PDF" },
        { "/api/queue", "Queue" }
    };

    public AuditLogMiddleware(
        RequestDelegate next,
        ILogger<AuditLogMiddleware> logger,
        ChannelWriter<AuditLog> auditChannel)
    {
        _next = next;
        _logger = logger;
        _auditChannel = auditChannel;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;
        var method = context.Request.Method;

        // Skip non-API paths and GET requests (to avoid noise)
        if (!ShouldAudit(path, method))
        {
            await _next(context);
            return;
        }

        // Execute the request first
        await _next(context);

        // Build audit entry from HTTP context and enqueue to bounded channel.
        // AuditWriterWorker (BackgroundService) drains the channel and batch-writes to DB.
        // TryWrite is non-blocking; DropOldest policy keeps memory bounded under burst load.
        try
        {
            var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? context.User?.FindFirst("sub")?.Value
                      ?? string.Empty;
            var userName = context.User?.FindFirst(ClaimTypes.Name)?.Value
                        ?? context.User?.FindFirst("name")?.Value
                        ?? context.User?.FindFirst("unique_name")?.Value
                        ?? "anonymous";

            var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var userAgent = context.Request.Headers.UserAgent.FirstOrDefault();
            var statusCode = context.Response.StatusCode;
            var module = ResolveModule(path);
            var action = ResolveAction(method, path);
            var entityType = ResolveEntityType(path);
            var entityId = ResolveEntityId(path);

            var details = JsonSerializer.Serialize(new
            {
                method,
                path,
                statusCode,
                queryString = context.Request.QueryString.Value
            });

            var entry = new AuditLog
            {
                Id = Guid.NewGuid(),
                UserId = Guid.TryParse(userId, out var uid) ? uid : null,
                Username = userName,
                UserFullName = userName,
                Action = action,
                TableName = entityType,
                EntityType = entityType,
                RecordId = Guid.TryParse(entityId, out var rid) ? rid : Guid.Empty,
                EntityId = entityId,
                Details = details,
                IpAddress = ipAddress,
                UserAgent = userAgent?.Length > 500 ? userAgent[..500] : userAgent,
                Timestamp = DateTime.UtcNow,
                Module = module,
                RequestPath = path.Length > 500 ? path[..500] : path,
                RequestMethod = method,
                ResponseStatusCode = statusCode,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                IsDeleted = false,
            };

            if (!_auditChannel.TryWrite(entry))
            {
                // Channel full (2000 entries) — oldest was dropped (BoundedChannelFullMode.DropOldest).
                AuditWriteMetrics.RecordFailure(new InvalidOperationException("AuditChannel full — entry dropped (DropOldest)"));
                _logger.LogWarning("AuditChannel full — audit entry dropped for {Method} {Path}", method, path);
            }
        }
        catch (Exception ex)
        {
            // Never let audit logging fail the main request
            AuditWriteMetrics.RecordFailure(ex);
            _logger.LogWarning(ex, "Audit log middleware error for {Method} {Path}", method, path);
        }
    }

    private static bool ShouldAudit(string path, string method)
    {
        // Skip non-API and excluded paths first
        foreach (var skipPath in SkipPaths)
        {
            if (path.StartsWith(skipPath, StringComparison.OrdinalIgnoreCase))
                return false;
        }

        if (!path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
            return false;

        // POST, PUT, DELETE are always audited
        if (!method.Equals("GET", StringComparison.OrdinalIgnoreCase))
            return true;

        // GET requests: only audit sensitive paths that access specific records (with ID).
        // List endpoints (e.g., /api/patients) are NOT logged to avoid audit volume explosion.
        // Detail endpoints (e.g., /api/patients/123) ARE logged for Level 6 compliance.
        return IsSensitiveGetRequest(path);
    }

    /// <summary>
    /// Checks if a GET request targets a sensitive patient data endpoint with a specific record ID.
    /// Only detail-level requests (path segments beyond the prefix) are considered sensitive.
    /// Examples:
    ///   /api/patients/abc-123       -> TRUE  (accessing specific patient)
    ///   /api/patients               -> FALSE (listing, too noisy)
    ///   /api/examination/abc-123    -> TRUE  (accessing specific examination)
    ///   /api/emr/records/abc-123    -> TRUE  (accessing specific EMR record)
    /// </summary>
    private static bool IsSensitiveGetRequest(string path)
    {
        foreach (var sensitivePrefix in SensitiveGetPaths)
        {
            if (path.StartsWith(sensitivePrefix, StringComparison.OrdinalIgnoreCase))
            {
                // Ensure there's actual content after the prefix (an ID or sub-resource)
                var remainder = path.Substring(sensitivePrefix.Length).TrimEnd('/');
                if (!string.IsNullOrEmpty(remainder))
                    return true;
            }
        }
        return false;
    }

    private static string ResolveModule(string path)
    {
        foreach (var kv in RouteModuleMap)
        {
            if (path.StartsWith(kv.Key, StringComparison.OrdinalIgnoreCase))
                return kv.Value;
        }
        return "Unknown";
    }

    private static string ResolveAction(string method, string path)
    {
        // Check for special action keywords in the path
        var lowerPath = path.ToLowerInvariant();
        if (lowerPath.Contains("/print") || lowerPath.Contains("/pdf"))
            return "Print";
        if (lowerPath.Contains("/export") || lowerPath.Contains("/download"))
            return "Export";
        if (lowerPath.Contains("/login") || lowerPath.Contains("/verify"))
            return "Auth";
        if (lowerPath.Contains("/approve"))
            return "Approve";
        if (lowerPath.Contains("/reject") || lowerPath.Contains("/cancel"))
            return "Cancel";

        return method.ToUpperInvariant() switch
        {
            "GET" => "Read",
            "POST" => "Create",
            "PUT" => "Update",
            "PATCH" => "Update",
            "DELETE" => "Delete",
            _ => method
        };
    }

    private static string ResolveEntityType(string path)
    {
        // Extract entity type from path: /api/{module}/{entityType}/...
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length >= 2)
        {
            // Return the second segment after 'api' as the entity type
            var idx = Array.FindIndex(segments, s => s.Equals("api", StringComparison.OrdinalIgnoreCase));
            if (idx >= 0 && idx + 1 < segments.Length)
                return segments[idx + 1];
        }
        return "Unknown";
    }

    private static string ResolveEntityId(string path)
    {
        // Try to extract a GUID from the last segment of the path
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        for (int i = segments.Length - 1; i >= 0; i--)
        {
            if (Guid.TryParse(segments[i], out _))
                return segments[i];
        }
        return string.Empty;
    }
}
