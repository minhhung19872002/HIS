using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using HIS.API.Extensions;
using HIS.API.Hubs;
using HIS.Application.Interfaces;

namespace HIS.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NotificationController : ControllerBase
{
    private readonly INotificationService _svc;
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationController(INotificationService svc, IHubContext<NotificationHub> hubContext)
    {
        _svc = svc;
        _hubContext = hubContext;
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirst("sub")?.Value
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    /// <summary>
    /// Get current user's notifications (recent 50, newest first)
    /// </summary>
    [HttpGet("my")]
    public async Task<IActionResult> GetMyNotifications([FromQuery] int limit = 50)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        return (await _svc.GetMyNotificationsAsync(limit, userId.Value)).ToActionResult();
    }

    /// <summary>
    /// Get unread count for current user
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        return (await _svc.GetUnreadCountAsync(userId.Value)).ToActionResult();
    }

    /// <summary>
    /// Mark a notification as read
    /// </summary>
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        return (await _svc.MarkAsReadAsync(id)).ToActionResult();
    }

    /// <summary>
    /// Mark all notifications as read for current user
    /// </summary>
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        return (await _svc.MarkAllAsReadAsync(userId.Value)).ToActionResult();
    }

    /// <summary>
    /// Send a test notification to current user (dev/testing only)
    /// </summary>
    [HttpPost("test")]
    public async Task<IActionResult> SendTestNotification()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var notification = await _svc.CreateTestNotificationAsync(userId.Value);

        // Push via SignalR
        await _hubContext.Clients.Group($"user_{userId}").SendAsync("ReceiveNotification", new
        {
            notification.Id,
            notification.Title,
            notification.Content,
            notification.NotificationType,
            notification.Module,
            notification.ActionUrl,
            notification.CreatedAt,
        });

        return Ok(new { notification.Id });
    }

    /// <summary>
    /// Tạo link kết quả xét nghiệm online và gửi SMS
    /// </summary>
    [HttpPost("send-lab-result-link")]
    public async Task<IActionResult> SendLabResultLink(
        [FromBody] HIS.Application.DTOs.NangCap18.SendLabResultLinkDto dto)
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        return (await _svc.SendLabResultLinkAsync(dto, baseUrl, GetUserId())).ToActionResult();
    }
}
