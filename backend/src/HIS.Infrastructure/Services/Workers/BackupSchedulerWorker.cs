using HIS.Application.DTOs.DataManagement;
using HIS.Application.Services;
using HIS.Core.Common;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services.Workers;

/// <summary>
/// Worker nền thực hiện backup tự động theo lịch.
///
/// Cấu hình đọc từ hai nguồn (ưu tiên SystemConfig > appsettings):
///   - Bật/tắt: SystemConfig "Backup.ScheduleEnabled" | appsettings BackupScheduler:Enabled (default false)
///   - Khoảng cách: SystemConfig "Backup.ScheduleIntervalHours" | appsettings BackupScheduler:IntervalHours (default 24)
///   - Mốc giờ VN: appsettings BackupScheduler:RunAtVnTime (default "01:30"); các lần chạy nằm trên lưới
///     RunAtVnTime + k·interval (interval &lt; 24h) hoặc mỗi interval kể từ mốc đầu tiên (interval ≥ 24h)
///   - Chạy ngay khi khởi động: appsettings BackupScheduler:RunOnStartup (default false)
///   - Khởi động delay: appsettings BackupScheduler:StartupDelaySeconds (default 60)
///
/// Worker đọc lại cấu hình từ SystemConfig mỗi 15 phút (hot-reload config mà không cần restart).
/// Idempotent: trước khi chạy kiểm tra lần backup tự động thành công gần nhất; bỏ qua nếu quá gần.
/// Nhà cung cấp backup (TO DISK / AWS RDS→S3): xem DataManagementService (Backup:Provider).
///
/// Đăng ký DI (thêm vào DependencyInjection.cs):
///   services.AddHostedService&lt;BackupSchedulerWorker&gt;();
/// </summary>
public sealed class BackupSchedulerWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BackupSchedulerWorker> _logger;
    private readonly bool _enabledByConfig;
    private readonly TimeSpan _intervalByConfig;
    private readonly TimeSpan _startupDelay;

    public BackupSchedulerWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<BackupSchedulerWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;

        // Cấu hình cứng từ appsettings (fallback khi SystemConfig chưa được seed)
        _enabledByConfig = config.GetValue<bool>("BackupScheduler:Enabled", false);
        _intervalByConfig = TimeSpan.FromHours(
            config.GetValue<double>("BackupScheduler:IntervalHours", 24));
        _startupDelay = TimeSpan.FromSeconds(
            config.GetValue<int>("BackupScheduler:StartupDelaySeconds", 60));
        // QA-R10: anchored to VN wall-clock — "first cycle at boot + 60 s, then every interval" made every deploy
        // start a full backup at whatever hour the container came up.
        _runAtVn = VnSchedule.ParseTimeOfDay(config.GetValue<string>("BackupScheduler:RunAtVnTime"), new TimeSpan(1, 30, 0));
        _runOnStartup = config.GetValue<bool>("BackupScheduler:RunOnStartup", false);
    }

    private readonly TimeSpan _runAtVn;
    private readonly bool _runOnStartup;

    /// <summary>How often the worker wakes to re-read SystemConfig (enable/interval hot-reload).</summary>
    private static readonly TimeSpan ConfigPoll = TimeSpan.FromMinutes(15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabledByConfig)
        {
            _logger.LogInformation(
                "BackupSchedulerWorker: disabled by appsettings " +
                "(set BackupScheduler:Enabled=true, or enable via SystemConfig 'Backup.ScheduleEnabled')");
            // Vẫn tiếp tục vòng lặp để nhận cấu hình từ SystemConfig (hot-reload)
        }

        // Chờ app bootstrap xong
        try { await Task.Delay(_startupDelay, stoppingToken); }
        catch (OperationCanceledException) { return; }

        _logger.LogInformation(
            "BackupSchedulerWorker: started — runAtVn={RunAt}, runOnStartup={OnStartup}, polling SystemConfig mỗi {Poll}",
            _runAtVn, _runOnStartup, ConfigPoll);

        if (_runOnStartup)
            await SafeRunCycleAsync(slotRun: false, stoppingToken);

        DateTime? slot = null;
        TimeSpan? slotInterval = null;
        DateTime? loggedNext = null;
        while (!stoppingToken.IsCancellationRequested)
        {
            TimeSpan wait;
            var runNow = false;
            DateTime nextVn = default;
            try
            {
                var (enabled, interval) = await ReadScheduleAsync();
                if (!enabled)
                {
                    slot = null;
                    loggedNext = null;
                    wait = ConfigPoll; // Polling nhẹ để phát hiện khi được bật lại
                }
                else
                {
                    if (slotInterval != interval) { slot = null; slotInterval = interval; }
                    var delay = VnSchedule.DelayUntilNextRun(_runAtVn, interval, slot, out nextVn);
                    if (loggedNext != nextVn)
                    {
                        _logger.LogInformation(
                            "BackupSchedulerWorker: lần backup tự động kế tiếp {NextVn:yyyy-MM-dd HH:mm} giờ VN (sau {Delay}, interval={Hours}h)",
                            nextVn, delay, interval.TotalHours);
                        loggedNext = nextVn;
                    }
                    runNow = delay <= ConfigPoll;
                    wait = runNow ? delay : ConfigPoll;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "BackupSchedulerWorker: lỗi đọc lịch — thử lại sau 30 phút");
                wait = TimeSpan.FromMinutes(30);
            }

            try { await Task.Delay(wait, stoppingToken); }
            catch (OperationCanceledException) { break; }

            if (runNow)
            {
                slot = nextVn;
                await SafeRunCycleAsync(slotRun: true, stoppingToken);
            }
        }
    }

    private async Task<(bool Enabled, TimeSpan Interval)> ReadScheduleAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var cfg = await ReadConfigAsync(scope.ServiceProvider.GetRequiredService<IDataManagementService>());
        var intervalHours = cfg.ScheduleIntervalHours ?? (int)_intervalByConfig.TotalHours;
        return (cfg.ScheduleEnabled, TimeSpan.FromHours(Math.Max(1, intervalHours)));
    }

    private async Task<BackupConfigDto> ReadConfigAsync(IDataManagementService service)
    {
        // Đọc config từ SystemConfig (hot-reload)
        try { return await service.GetBackupConfigAsync(); }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BackupSchedulerWorker: không đọc được BackupConfig từ DB — dùng appsettings");
            return new BackupConfigDto
            {
                ScheduleEnabled = _enabledByConfig,
                ScheduleIntervalHours = (int)_intervalByConfig.TotalHours,
            };
        }
    }

    private async Task SafeRunCycleAsync(bool slotRun, CancellationToken ct)
    {
        try { await RunCycleAsync(slotRun, ct); }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception ex)
        {
            _logger.LogError(ex, "BackupSchedulerWorker: lỗi không mong đợi trong chu kỳ");
        }
    }

    /// <summary>
    /// Thực hiện 1 chu kỳ: đọc config → kiểm tra có cần backup không → chạy backup.
    /// <paramref name="slotRun"/>: chạy đúng mốc lịch — chỉ bỏ qua nếu vừa có backup thành công gần đây
    /// (mốc trước chạy sớm vài giây không được làm lỡ mốc này).
    /// </summary>
    private async Task RunCycleAsync(bool slotRun, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IDataManagementService>();

        var cfg = await ReadConfigAsync(service);
        if (!cfg.ScheduleEnabled)
        {
            _logger.LogDebug("BackupSchedulerWorker: ScheduleEnabled=false — bỏ qua chu kỳ này");
            return;
        }

        var intervalHours = cfg.ScheduleIntervalHours ?? (int)_intervalByConfig.TotalHours;
        var interval = TimeSpan.FromHours(Math.Max(1, intervalHours));

        // Kiểm tra lần backup tự động cuối — idempotent guard
        var histories = await service.GetBackupHistoryAsync();
        var lastScheduled = histories
            // Running (0) counts too: the backup runs asynchronously, a just-started one is not Success yet.
            .Where(h => h.BackupType == 1 /* Scheduled */ && (h.Status == 1 /* Success */ || h.Status == 0 /* Running */))
            .OrderByDescending(h => h.StartedAt)
            .FirstOrDefault();

        if (lastScheduled != null)
        {
            var elapsed = DateTime.UtcNow - lastScheduled.StartedAt;
            var minGap = slotRun
                ? interval - TimeSpan.FromTicks(Math.Min(TimeSpan.FromHours(1).Ticks, interval.Ticks / 2))
                : interval;
            if (elapsed < minGap)
            {
                _logger.LogInformation(
                    "BackupSchedulerWorker: backup tự động gần nhất cách {Elapsed:hh\\:mm} trước (< {Gap:hh\\:mm}) — bỏ qua lần này",
                    elapsed, minGap);
                return;
            }
        }

        // Thực thi backup tự động
        _logger.LogInformation("BackupSchedulerWorker: bắt đầu backup tự động (interval={Hours}h)", intervalHours);
        try
        {
            var req = new CreateBackupHistoryRequest
            {
                BackupLabel = "Full",
                Destination = cfg.Destination,
            };
            // BackupType=1 (Scheduled) được set bởi service khi userId="system:scheduler"
            var result = await service.CreateBackupWithHistoryAsync(req, "system:scheduler");
            _logger.LogInformation(
                "BackupSchedulerWorker: đã khởi động backup, historyId={Id}, file={File}",
                result.Id, result.FileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "BackupSchedulerWorker: khởi động backup thất bại");
        }
    }
}
