using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HIS.PatientApp.Api.Push;

/// <summary>
/// Quét hàng đợi <c>push_outbox</c> và gửi qua relay.
///
/// Vì sao là worker riêng chứ không gửi ngay lúc tạo thông báo: relay nằm ngoài data center nên có
/// lúc không gọi được. Ghi vào bảng rồi gửi sau khiến mạng đứt chỉ làm thông báo đến muộn, thay vì
/// mất hẳn — và người tạo thông báo (ví dụ chiến dịch gửi cho vài nghìn người) không phải đứng chờ
/// từng lần gọi mạng.
/// </summary>
public class PushDispatcherWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly PushRelayOptions _options;
    private readonly ILogger<PushDispatcherWorker> _logger;

    public PushDispatcherWorker(
        IServiceScopeFactory scopeFactory,
        IOptions<PushRelayOptions> options,
        ILogger<PushDispatcherWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrWhiteSpace(_options.BaseUrl))
        {
            _logger.LogWarning(
                "Chưa cấu hình PushRelay:BaseUrl — worker đẩy thông báo không chạy. "
                + "Người bệnh sẽ KHÔNG nhận được thông báo đẩy.");
            return;
        }

        var interval = TimeSpan.FromSeconds(Math.Max(1, _options.PollIntervalSeconds));

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DispatchBatchAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // Nuốt để vòng lặp sống tiếp: một lô lỗi không được phép giết luôn worker, nếu không
                // mọi thông báo sau đó đều tắc mà không ai biết.
                _logger.LogError(ex, "Lỗi khi đẩy lô thông báo, sẽ thử lại ở vòng sau.");
            }

            try
            {
                await Task.Delay(interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task DispatchBatchAsync(CancellationToken ct)
    {
        // Scope riêng mỗi vòng: DbContext là scoped, giữ lại qua nhiều vòng sẽ phình bộ nhớ theo dõi
        // thực thể và ném ObjectDisposedException khi ứng dụng tắt.
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PatientAppDbContext>();
        var sender = scope.ServiceProvider.GetRequiredService<IPushSender>();

        var now = DateTime.UtcNow;
        var pending = await db.PushOutbox
            .Where(o => o.Status == PushOutboxStatus.Pending && o.NextAttemptAt <= now)
            .OrderBy(o => o.CreatedAt)
            .Take(Math.Clamp(_options.BatchSize, 1, 500))
            .ToListAsync(ct);

        if (pending.Count == 0) return;

        foreach (var item in pending)
        {
            var result = await sender.SendAsync(item.PushToken, item.Payload, ct);
            item.AttemptCount++;

            switch (result)
            {
                case PushResult.Sent:
                    item.Status = PushOutboxStatus.Sent;
                    item.SentAt = DateTime.UtcNow;
                    item.LastError = null;
                    break;

                case PushResult.TokenInvalid:
                    item.Status = PushOutboxStatus.TokenInvalid;
                    item.LastError = "Token thiết bị không còn hợp lệ.";
                    // Dọn token chết để những lần sau không xếp hàng vô ích.
                    await db.Devices
                        .Where(d => d.Id == item.DeviceId && d.PushToken == item.PushToken)
                        .ExecuteUpdateAsync(s => s.SetProperty(d => d.PushToken, (string?)null), ct);
                    break;

                case PushResult.RetryLater when item.AttemptCount < _options.MaxAttempts:
                    // Giãn cách tăng dần, chặn trên 30 phút để một sự cố dài không đẩy lần thử kế
                    // tiếp ra tận ngày hôm sau.
                    var delay = TimeSpan.FromSeconds(
                        Math.Min(1800, 15 * Math.Pow(2, item.AttemptCount)));
                    item.NextAttemptAt = DateTime.UtcNow.Add(delay);
                    item.LastError = "Chưa gửi được, sẽ thử lại.";
                    break;

                case PushResult.RetryLater:
                case PushResult.PermanentFailure:
                default:
                    item.Status = PushOutboxStatus.Failed;
                    item.LastError = result == PushResult.PermanentFailure
                        ? "Relay từ chối thông báo."
                        : $"Đã thử {item.AttemptCount} lần không thành công.";
                    break;
            }
        }

        await db.SaveChangesAsync(ct);

        var sent = pending.Count(p => p.Status == PushOutboxStatus.Sent);
        _logger.LogInformation("Đẩy thông báo: {Sent}/{Total} thành công.", sent, pending.Count);
    }
}
