using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using HIS.PatientApp.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Workers;

/// <summary>
/// Gửi những đợt thông báo đã hẹn giờ khi tới hạn (HSMT I.3 #1.4 "hẹn giờ").
///
/// Quét mỗi phút: đủ đúng giờ cho thông báo của bệnh viện (không ai hẹn theo giây), mà không tạo tải
/// đáng kể — mỗi vòng chỉ là một truy vấn có chỉ số.
/// </summary>
public class CampaignDispatcherWorker : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromMinutes(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CampaignDispatcherWorker> _logger;

    public CampaignDispatcherWorker(
        IServiceScopeFactory scopeFactory, ILogger<CampaignDispatcherWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DispatchDueAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Một vòng hỏng không được phép giết worker — vòng sau vẫn phải chạy.
                _logger.LogError(ex, "Lỗi khi gửi các chiến dịch tới hạn.");
            }

            try
            {
                await Task.Delay(PollInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }
    }

    private async Task DispatchDueAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PatientAppDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<NotificationService>();

        var now = DateTime.UtcNow;

        var due = await db.NotificationCampaigns
            .Where(c => c.Status == CampaignStatus.Scheduled
                        && c.ScheduledAt != null && c.ScheduledAt <= now)
            .OrderBy(c => c.ScheduledAt)
            // Mỗi vòng xử lý tối đa 5 chiến dịch: một đợt gửi cho toàn bộ người dùng có thể mất lâu,
            // và ôm hết vào một vòng sẽ làm những đợt sau trễ giờ hẹn.
            .Take(5)
            .ToListAsync(ct);

        foreach (var campaign in due)
        {
            await CampaignSender.SendAsync(db, notifications, campaign, _logger, ct);
        }
    }
}
