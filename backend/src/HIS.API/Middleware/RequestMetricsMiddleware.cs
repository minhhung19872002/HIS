using System.Diagnostics;
using HIS.Infrastructure.Services;

namespace HIS.API.Middleware;

/// <summary>
/// Middleware to capture request metrics (total requests, response time, errors)
/// </summary>
public class RequestMetricsMiddleware
{
    private readonly RequestDelegate _next;
    private readonly MetricsService _metrics;

    public RequestMetricsMiddleware(RequestDelegate next, MetricsService metrics)
    {
        _next = next;
        _metrics = metrics;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip health check endpoints and static files from metrics
        var path = context.Request.Path.Value ?? string.Empty;
        if (path.StartsWith("/health", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        _metrics.RecordRequestStart();
        var sw = Stopwatch.StartNew();

        try
        {
            await _next(context);
        }
        finally
        {
            sw.Stop();
            _metrics.RecordRequestEnd(sw.ElapsedMilliseconds, context.Response.StatusCode, path);
        }
    }
}
