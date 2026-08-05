using HIS.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services.Workers;

/// <summary>
/// Periodically evaluates real on-arrival DICOM delivery rules. Delivery claiming and
/// retry limits are persisted in SQL, so restarts and multiple API replicas cannot turn
/// a failed operation into a reported success.
/// </summary>
public sealed class DicomAutoSendWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DicomAutoSendWorker> _logger;
    private readonly bool _enabled;
    private readonly TimeSpan _interval;

    public DicomAutoSendWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<DicomAutoSendWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _enabled = configuration.GetValue<bool>("PACS:AutoSend:Enabled", true);
        _interval = TimeSpan.FromSeconds(Math.Clamp(
            configuration.GetValue<int>("PACS:AutoSend:IntervalSeconds", 30), 10, 3600));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation("DICOM auto-send worker is disabled");
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<IDicomAutoSendService>();
                var delivered = await service.TriggerAutoSendCheckAsync();
                if (delivered > 0)
                    _logger.LogInformation("DICOM auto-send delivered {Count} studies", delivered);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DICOM auto-send iteration failed");
            }

            try { await Task.Delay(_interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
