using System.Collections.Concurrent;
using System.Diagnostics;

namespace HIS.Infrastructure.Services;

/// <summary>
/// In-memory request metrics collector
/// </summary>
public class MetricsService
{
    private long _totalRequests;
    private long _activeRequests;
    private long _errorCount;
    private long _totalResponseTimeMs;
    private readonly DateTime _startTime = DateTime.UtcNow;

    // Track requests per endpoint (top 20)
    private readonly ConcurrentDictionary<string, long> _endpointCounts = new();

    // Track status code distribution
    private readonly ConcurrentDictionary<int, long> _statusCodeCounts = new();

    // Rolling window for requests per minute (last 60 entries, 1 per second)
    private readonly ConcurrentQueue<(DateTime timestamp, int count)> _requestsPerSecond = new();
    private int _currentSecondCount;
    private DateTime _currentSecond = DateTime.UtcNow;
    private readonly object _rollingLock = new();

    public void RecordRequestStart()
    {
        Interlocked.Increment(ref _activeRequests);
        Interlocked.Increment(ref _totalRequests);
        UpdateRollingWindow();
    }

    public void RecordRequestEnd(long elapsedMs, int statusCode, string path)
    {
        Interlocked.Decrement(ref _activeRequests);
        Interlocked.Add(ref _totalResponseTimeMs, elapsedMs);

        if (statusCode >= 400)
        {
            Interlocked.Increment(ref _errorCount);
        }

        // Track status codes
        _statusCodeCounts.AddOrUpdate(statusCode, 1, (_, count) => count + 1);

        // Track endpoint counts (normalize path)
        var normalizedPath = NormalizePath(path);
        if (!string.IsNullOrEmpty(normalizedPath))
        {
            _endpointCounts.AddOrUpdate(normalizedPath, 1, (_, count) => count + 1);
        }
    }

    public MetricsSnapshot GetSnapshot()
    {
        var total = Interlocked.Read(ref _totalRequests);
        var active = Interlocked.Read(ref _activeRequests);
        var errors = Interlocked.Read(ref _errorCount);
        var totalTime = Interlocked.Read(ref _totalResponseTimeMs);
        var avgResponseTime = total > 0 ? (double)totalTime / total : 0;
        var errorRate = total > 0 ? (double)errors / total * 100 : 0;

        // Calculate requests per minute from rolling window
        var requestsPerMinute = CalculateRequestsPerMinute();

        // Get top 20 endpoints
        var topEndpoints = _endpointCounts
            .OrderByDescending(kvp => kvp.Value)
            .Take(20)
            .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

        // Status code distribution
        var statusCodes = _statusCodeCounts
            .OrderBy(kvp => kvp.Key)
            .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

        return new MetricsSnapshot
        {
            Timestamp = DateTime.UtcNow,
            UptimeSeconds = (long)(DateTime.UtcNow - _startTime).TotalSeconds,
            TotalRequests = total,
            ActiveRequests = active,
            ErrorCount = errors,
            ErrorRate = Math.Round(errorRate, 2),
            AverageResponseTimeMs = Math.Round(avgResponseTime, 1),
            RequestsPerMinute = requestsPerMinute,
            TopEndpoints = topEndpoints,
            StatusCodeDistribution = statusCodes
        };
    }

    private void UpdateRollingWindow()
    {
        lock (_rollingLock)
        {
            var now = DateTime.UtcNow;
            var second = new DateTime(now.Year, now.Month, now.Day, now.Hour, now.Minute, now.Second);

            if (second == _currentSecond)
            {
                _currentSecondCount++;
            }
            else
            {
                if (_currentSecondCount > 0)
                {
                    _requestsPerSecond.Enqueue((_currentSecond, _currentSecondCount));
                }
                _currentSecond = second;
                _currentSecondCount = 1;

                // Keep only last 120 seconds
                while (_requestsPerSecond.Count > 120)
                {
                    _requestsPerSecond.TryDequeue(out _);
                }
            }
        }
    }

    private double CalculateRequestsPerMinute()
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-1);
        var recentCount = 0;
        foreach (var entry in _requestsPerSecond)
        {
            if (entry.timestamp >= cutoff)
            {
                recentCount += entry.count;
            }
        }
        // Add current second
        lock (_rollingLock)
        {
            if (_currentSecond >= cutoff)
            {
                recentCount += _currentSecondCount;
            }
        }
        return Math.Round((double)recentCount, 1);
    }

    private static string NormalizePath(string path)
    {
        if (string.IsNullOrEmpty(path)) return string.Empty;

        // Remove query string
        var idx = path.IndexOf('?');
        if (idx >= 0) path = path[..idx];

        // Replace GUIDs with {id}
        path = System.Text.RegularExpressions.Regex.Replace(
            path,
            @"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
            "{id}");

        // Replace numeric IDs with {id}
        path = System.Text.RegularExpressions.Regex.Replace(
            path,
            @"/\d+(/|$)",
            "/{id}$1");

        return path;
    }
}

public class MetricsSnapshot
{
    public DateTime Timestamp { get; set; }
    public long UptimeSeconds { get; set; }
    public long TotalRequests { get; set; }
    public long ActiveRequests { get; set; }
    public long ErrorCount { get; set; }
    public double ErrorRate { get; set; }
    public double AverageResponseTimeMs { get; set; }
    public double RequestsPerMinute { get; set; }
    public Dictionary<string, long> TopEndpoints { get; set; } = new();
    public Dictionary<int, long> StatusCodeDistribution { get; set; } = new();
}
