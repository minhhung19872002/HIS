using HIS.Application.DTOs.DataManagement;
using HIS.Application.Services;
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
///   - Khởi động delay: appsettings BackupScheduler:StartupDelaySeconds (default 60)
///
/// Worker đọc lại cấu hình từ SystemConfig mỗi chu kỳ (hot-reload config mà không cần restart).
/// Idempotent: mỗi chu kỳ kiểm tra lần backup cuối cùng thành công;
/// bỏ qua nếu khoảng cách chưa đủ (tránh backup trùng khi restart pod).
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
    }

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

        _logger.LogInformation("BackupSchedulerWorker: started, polling SystemConfig mỗi chu kỳ");

        while (!stoppingToken.IsCancellationRequested)
        {
            TimeSpan interval;
            try
            {
                interval = await RunCycleAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "BackupSchedulerWorker: lỗi không mong đợi trong chu kỳ — thử lại sau 30 phút");
                interval = TimeSpan.FromMinutes(30);
            }

            try { await Task.Delay(interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    /// <summary>
    /// Thực hiện 1 chu kỳ: đọc config → kiểm tra có cần backup không → chạy backup.
    /// Trả về khoảng delay đến chu kỳ tiếp theo.
    /// </summary>
    private async Task<TimeSpan> RunCycleAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IDataManagementService>();

        // Đọc config từ SystemConfig (hot-reload)
        BackupConfigDto cfg;
        try { cfg = await service.GetBackupConfigAsync(); }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BackupSchedulerWorker: không đọc được BackupConfig từ DB — dùng appsettings");
            cfg = new BackupConfigDto
            {
                ScheduleEnabled = _enabledByConfig,
                ScheduleIntervalHours = (int)_intervalByConfig.TotalHours,
            };
        }

        if (!cfg.ScheduleEnabled)
        {
            _logger.LogDebug("BackupSchedulerWorker: ScheduleEnabled=false — bỏ qua chu kỳ này");
            return TimeSpan.FromMinutes(15); // Polling nhẹ để phát hiện khi được bật lại
        }

        var intervalHours = cfg.ScheduleIntervalHours ?? (int)_intervalByConfig.TotalHours;
        var interval = TimeSpan.FromHours(Math.Max(1, intervalHours));

        // Kiểm tra lần backup tự động cuối — idempotent guard
        var histories = await service.GetBackupHistoryAsync();
        var lastScheduled = histories
            .Where(h => h.BackupType == 1 /* Scheduled */ && h.Status == 1 /* Success */)
            .OrderByDescending(h => h.StartedAt)
            .FirstOrDefault();

        if (lastScheduled != null)
        {
            var elapsed = DateTime.UtcNow - lastScheduled.StartedAt;
            if (elapsed < interval)
            {
                var remaining = interval - elapsed;
                _logger.LogDebug(
                    "BackupSchedulerWorker: backup tự động gần nhất cách {Elapsed:hh\\:mm} trước. " +
                    "Chờ thêm {Remaining:hh\\:mm}",
                    elapsed, remaining);
                return remaining < TimeSpan.FromMinutes(5) ? TimeSpan.FromMinutes(5) : remaining;
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

        return interval;
    }
}
