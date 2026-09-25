using HIS.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services.Workers;

/// <summary>
/// QA-R11: drains the outbound HL7 queue (Hl7MessageQueues, direction = outbound, status = pending). Nothing ever
/// called <see cref="IHl7QueueService.ProcessPendingAsync"/>, so queued messages sat in "Chờ gửi 0/5" forever.
/// Delivery is a real MLLP send (Hl7MllpClient): a message without a configured endpoint is marked failed with
/// "Chưa cấu hình …", never reported as sent. Disable with HL7:OutboundQueue:Enabled=false.
/// </summary>
public sealed class Hl7OutboundQueueWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<Hl7OutboundQueueWorker> _logger;
    private readonly bool _enabled;
    private readonly TimeSpan _interval;

    public Hl7OutboundQueueWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<Hl7OutboundQueueWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _enabled = configuration.GetValue<bool>("HL7:OutboundQueue:Enabled", true);
        _interval = TimeSpan.FromSeconds(Math.Clamp(
            configuration.GetValue<int>("HL7:OutboundQueue:IntervalSeconds", 60), 10, 3600));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation("HL7 outbound queue worker is disabled");
            return;
        }

        // Let the app finish starting (migrations / schema repair) before the first pass.
        try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<IHl7QueueService>();
                var processed = await service.ProcessPendingAsync();
                if (processed > 0)
                    _logger.LogInformation("HL7 outbound queue: processed {Count} messages", processed);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "HL7 outbound queue iteration failed");
            }

            try { await Task.Delay(_interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
