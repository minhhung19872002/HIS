using HIS.PatientApp.Api.Entities;
using HIS.PatientApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.PatientApp.Api.Controllers;

/// <summary>
/// Hộp thư thông báo trong app (HSMT I.2 #9 inbox).
///
/// Mọi truy vấn lấy `accountId` từ token, không nhận từ tham số — đây chính là lỗi IDOR mà khảo sát
/// tìm thấy ở HIS Core (`00-his-api-inventory.md` §11.1).
/// </summary>
[ApiController]
[Route("api/v1/patient/notifications")]
[Authorize]
[Produces("application/json")]
public class NotificationsController : ControllerBase
{
    private readonly NotificationService _notifications;

    public NotificationsController(NotificationService notifications) => _notifications = notifications;

    [HttpGet]
    public async Task<IActionResult> Inbox([FromQuery] int take = 50, CancellationToken ct = default)
    {
        var items = await _notifications.InboxAsync(User.GetAccountId(), take, ct);
        return Ok(ApiResponse<List<NotificationDto>>.Ok(items.Select(NotificationDto.From).ToList()));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount(CancellationToken ct)
    {
        var count = await _notifications.UnreadCountAsync(User.GetAccountId(), ct);
        return Ok(ApiResponse<int>.Ok(count));
    }

    [HttpPut("{notificationId:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid notificationId, CancellationToken ct)
    {
        var ok = await _notifications.MarkReadAsync(User.GetAccountId(), notificationId, ct);
        // 404 chứ không 403: nói "thông báo này của người khác" cũng là tiết lộ nó tồn tại.
        return ok
            ? Ok(ApiResponse.Ok("Đã đánh dấu đã đọc."))
            : NotFound(ApiResponse.Fail("Không tìm thấy thông báo."));
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        var count = await _notifications.MarkAllReadAsync(User.GetAccountId(), ct);
        return Ok(ApiResponse<int>.Ok(count, $"Đã đánh dấu {count} thông báo là đã đọc."));
    }
}

public class NotificationDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? DeepLink { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }

    public static NotificationDto From(AppNotification n) => new()
    {
        Id = n.Id,
        Title = n.Title,
        Body = n.Body,
        Category = n.Category,
        DeepLink = n.DeepLink,
        IsRead = n.IsRead,
        CreatedAt = n.CreatedAt,
    };
}
