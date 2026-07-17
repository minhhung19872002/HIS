using HIS.Application.Services;

namespace HIS.API.Workers;

/// <summary>
/// AUTHZ-4 (#370): auto-expire ủy quyền tạm (DelegationGrant) quá hạn — đánh dấu Active→Expired
/// định kỳ để dữ liệu phản ánh đúng trạng thái. Gated <c>Auth:DelegationEnabled</c> (mặc định FALSE)
/// → OFF thì return ngay (feature dormant, 0 tác động). Idempotent + fail-safe. Interval mặc định 6h.
/// </summary>
public sealed class DelegationExpiryWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DelegationExpiryWorker> _logger;
    private readonly bool _enabled;
    private readonly TimeSpan _interval;

    public DelegationExpiryWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<DelegationExpiryWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _enabled = string.Equals(config["Auth:DelegationEnabled"], "true", StringComparison.OrdinalIgnoreCase);
        _interval = TimeSpan.FromHours(config.GetValue<int>("Delegation:ExpiryIntervalHours", 6));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation("DelegationExpiryWorker disabled (Auth:DelegationEnabled=false)");
            return;
        }

        _logger.LogInformation("DelegationExpiryWorker started — interval={Hours}h", (int)_interval.TotalHours);

        try { await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var svc = scope.ServiceProvider.GetRequiredService<IDelegationService>();
                var expired = await svc.ExpirePastDueAsync(stoppingToken);
                if (expired > 0)
                    _logger.LogInformation("DelegationExpiry: {N} ủy quyền quá hạn → Expired", expired);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DelegationExpiryWorker iteration failed — retry next cycle");
            }

            try { await Task.Delay(_interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
