using System.Security.Claims;
using System.Text.Json;
using HIS.Application.Services;

namespace HIS.API.Middleware;

/// <summary>
/// Middleware that automatically logs POST/PUT/DELETE API calls for Level 6 audit compliance.
/// Placed after authentication middleware so JWT claims are available.
/// Logs are written fire-and-forget to avoid blocking the response pipeline.
/// </summary>
public class AuditLogMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditLogMiddleware> _logger;

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

    public AuditLogMiddleware(RequestDelegate next, ILogger<AuditLogMiddleware> logger)
    {
        _next = next;
        _logger = logger;
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

        // Fire-and-forget audit logging after response is sent
        try
        {
            var auditService = context.RequestServices.GetService<IAuditLogService>();
            if (auditService == null) return;

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

            // Fire-and-forget - do not await to avoid blocking
            _ = Task.Run(async () =>
            {
                try
                {
                    await auditService.LogAsync(
                        userId,
                        userName,
                        action,
                        entityType,
                        entityId,
                        details,
                        ipAddress,
                        userAgent,
                        module,
                        path,
                        method,
                        statusCode);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Background audit log write failed for {Method} {Path}", method, path);
                }
            });
        }
        catch (Exception ex)
        {
            // Never let audit logging fail the main request
            _logger.LogWarning(ex, "Audit log middleware error for {Method} {Path}", method, path);
        }
    }

    private static bool ShouldAudit(string path, string method)
    {
        // Only log POST, PUT, DELETE (not GET to avoid noise)
        if (method.Equals("GET", StringComparison.OrdinalIgnoreCase))
            return false;

        // Skip non-API and excluded paths
        foreach (var skipPath in SkipPaths)
        {
            if (path.StartsWith(skipPath, StringComparison.OrdinalIgnoreCase))
                return false;
        }

        return path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase);
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
