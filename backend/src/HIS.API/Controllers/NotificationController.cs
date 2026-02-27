using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using HIS.API.Hubs;
using HIS.Infrastructure.Data;

namespace HIS.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NotificationController : ControllerBase
{
    private readonly HISDbContext _context;
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationController(HISDbContext context, IHubContext<NotificationHub> hubContext)
    {
        _context = context;
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

        var notifications = await _context.Notifications
            .Where(n => !n.IsDeleted && (n.TargetUserId == userId || n.TargetUserId == null))
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .Select(n => new
            {
                n.Id,
                n.Title,
                n.Content,
                n.NotificationType,
                n.Module,
                n.ActionUrl,
                n.IsRead,
                n.ReadAt,
                n.CreatedAt,
            })
            .ToListAsync();

        return Ok(notifications);
    }

    /// <summary>
    /// Get unread count for current user
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var count = await _context.Notifications
            .Where(n => !n.IsDeleted && !n.IsRead && (n.TargetUserId == userId || n.TargetUserId == null))
            .CountAsync();

        return Ok(new { count });
    }

    /// <summary>
    /// Mark a notification as read
    /// </summary>
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var notification = await _context.Notifications.FindAsync(id);
        if (notification == null) return NotFound();

        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok();
    }

    /// <summary>
    /// Mark all notifications as read for current user
    /// </summary>
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var unread = await _context.Notifications
            .Where(n => !n.IsDeleted && !n.IsRead && (n.TargetUserId == userId || n.TargetUserId == null))
            .ToListAsync();

        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync();

        return Ok(new { count = unread.Count });
    }

    /// <summary>
    /// Send a test notification to current user (dev/testing only)
    /// </summary>
    [HttpPost("test")]
    public async Task<IActionResult> SendTestNotification()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var notification = new HIS.Core.Entities.Notification
        {
            Title = "Thông báo test",
            Content = $"Thông báo test lúc {DateTime.Now:HH:mm:ss}",
            NotificationType = "Info",
            Module = "System",
            TargetUserId = userId,
        };
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

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
}
