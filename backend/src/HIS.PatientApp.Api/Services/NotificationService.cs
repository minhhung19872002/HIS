using System.Text.Json;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Services;

/// <summary>
/// Tạo thông báo cho người bệnh và xếp hàng đẩy push.
///
/// Thông báo trong CSDL là **nguồn sự thật**; push chỉ là cách báo cho người dùng biết có thư mới.
/// Vì vậy push hỏng không đồng nghĩa mất thông báo — mở app ra vẫn thấy trong hộp thư.
/// </summary>
public class NotificationService
{
    private readonly PatientAppDbContext _db;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(PatientAppDbContext db, ILogger<NotificationService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Ghi thông báo và xếp hàng gửi tới mọi thiết bị còn hoạt động của tài khoản.
    ///
    /// Cả hai việc nằm trong MỘT transaction: nếu chỉ ghi được một nửa thì hoặc người bệnh nhận push
    /// về một thông báo không tồn tại, hoặc có thông báo mà không ai báo cho họ biết.
    /// </summary>
    public async Task<AppNotification> CreateAsync(
        Guid accountId,
        string title,
        string body,
        string category,
        string? deepLink = null,
        object? data = null,
        Guid? campaignId = null,
        CancellationToken ct = default)
    {
        var notification = new AppNotification
        {
            AccountId = accountId,
            Title = title,
            Body = body,
            Category = category,
            DeepLink = deepLink,
            DataJson = data is null ? null : JsonSerializer.Serialize(data),
            CampaignId = campaignId,
        };

        await using var transaction = await _db.Database.BeginTransactionAsync(ct);

        _db.Notifications.Add(notification);

        var devices = await _db.Devices
            .Where(d => d.AccountId == accountId && d.RevokedAt == null && d.PushToken != null)
            .Select(d => new { d.Id, d.PushToken })
            .ToListAsync(ct);

        foreach (var device in devices)
        {
            _db.PushOutbox.Add(new PushOutbox
            {
                NotificationId = notification.Id,
                AccountId = accountId,
                DeviceId = device.Id,
                PushToken = device.PushToken!,
                // CHỈ tiêu đề, tóm tắt và deep-link. Payload này đi qua VPS và hạ tầng Google, nên
                // tuyệt đối không nhét kết quả xét nghiệm hay chẩn đoán vào đây — app tự gọi API lấy.
                Payload = JsonSerializer.Serialize(new
                {
                    notificationId = notification.Id,
                    title,
                    body,
                    category,
                    deepLink,
                }),
            });
        }

        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        if (devices.Count == 0)
        {
            _logger.LogInformation(
                "Tài khoản {AccountId} chưa có thiết bị nhận thông báo; thư vẫn nằm trong hộp thư.",
                accountId);
        }

        return notification;
    }

    public Task<List<AppNotification>> InboxAsync(
        Guid accountId, int take, CancellationToken ct = default) =>
        _db.Notifications
            .Where(n => n.AccountId == accountId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(Math.Clamp(take, 1, 100))
            .ToListAsync(ct);

    public Task<int> UnreadCountAsync(Guid accountId, CancellationToken ct = default) =>
        _db.Notifications.CountAsync(n => n.AccountId == accountId && !n.IsRead, ct);

    /// <summary>Đánh dấu đã đọc. Trả false khi thông báo không thuộc tài khoản này.</summary>
    public async Task<bool> MarkReadAsync(Guid accountId, Guid notificationId, CancellationToken ct = default)
    {
        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.AccountId == accountId, ct);
        if (notification is null) return false;

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
        return true;
    }

    public async Task<int> MarkAllReadAsync(Guid accountId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        return await _db.Notifications
            .Where(n => n.AccountId == accountId && !n.IsRead)
            .ExecuteUpdateAsync(s => s
                .SetProperty(n => n.IsRead, true)
                .SetProperty(n => n.ReadAt, now), ct);
    }
}
