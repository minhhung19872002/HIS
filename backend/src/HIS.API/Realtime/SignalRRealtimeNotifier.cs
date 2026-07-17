using HIS.API.Hubs;
using HIS.Application.Services;
using Microsoft.AspNetCore.SignalR;

namespace HIS.API.Realtime;

/// <summary>
/// Adapter thực thi <see cref="IRealtimeNotifier"/> (định nghĩa ở HIS.Application)
/// bằng SignalR <see cref="IHubContext{NotificationHub}"/>. Đặt ở HIS.API vì
/// NotificationHub sống ở đây và HIS.Infrastructure không reference được API.
/// Broadcast tới mọi client đang đăng nhập (badge AI hiển thị cho mọi staff,
/// payload không chứa dữ liệu bệnh nhân).
/// </summary>
public class SignalRRealtimeNotifier : IRealtimeNotifier
{
    private readonly IHubContext<NotificationHub> _hub;

    public SignalRRealtimeNotifier(IHubContext<NotificationHub> hub) => _hub = hub;

    public Task NotifyAiQueueUpdatedAsync(int addedCount, CancellationToken ct = default)
        => _hub.Clients.All.SendAsync("ReceiveAiQueueUpdate", new { addedCount, at = DateTime.UtcNow }, ct);

    public Task NotifyBreakGlassActivatedAsync(Guid userId, string username, Guid patientId, DateTime expireAt, CancellationToken ct = default)
        => _hub.Clients.All.SendAsync("ReceiveBreakGlassAlert", new { userId, username, patientId, expireAt }, ct);
}
