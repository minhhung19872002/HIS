namespace HIS.Application.Services;

/// <summary>
/// Cho phép tầng Infrastructure (background worker) đẩy sự kiện realtime tới
/// client mà KHÔNG cần reference HIS.API — nơi chứa SignalR Hub + IHubContext.
/// Adapter thực thi nằm ở HIS.API (SignalRRealtimeNotifier bọc
/// IHubContext&lt;NotificationHub&gt;). Worker resolve interface này qua DI
/// (optional); nếu không có adapter đăng ký thì bỏ qua, frontend vẫn poll
/// fallback nên không mất chức năng.
/// </summary>
public interface IRealtimeNotifier
{
    /// <summary>
    /// Báo có ca AI mới vào hàng đợi → client refetch /queue ngay thay vì chờ
    /// poll 30s. Payload chỉ là số lượng + timestamp (không chứa dữ liệu BN).
    /// </summary>
    Task NotifyAiQueueUpdatedAsync(int addedCount, CancellationToken ct = default);
}
