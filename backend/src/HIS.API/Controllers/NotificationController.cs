using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using HIS.API.Hubs;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;

namespace HIS.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NotificationController : ControllerBase
{
    private readonly HISDbContext _context;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ISmsService _smsService;

    public NotificationController(HISDbContext context, IHubContext<NotificationHub> hubContext, ISmsService smsService)
    {
        _context = context;
        _hubContext = hubContext;
        _smsService = smsService;
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

    /// <summary>
    /// Tạo link kết quả xét nghiệm online và gửi SMS
    /// </summary>
    [HttpPost("send-lab-result-link")]
    public async Task<ActionResult<HIS.Application.DTOs.NangCap18.LabResultLinkResultDto>> SendLabResultLink(
        [FromBody] HIS.Application.DTOs.NangCap18.SendLabResultLinkDto dto)
    {
        // Find lab request
        var labRequest = await _context.LabRequests
            .Include(r => r.Patient)
            .FirstOrDefaultAsync(r => r.Id == dto.LabRequestId && !r.IsDeleted);

        if (labRequest == null)
            return Ok(new HIS.Application.DTOs.NangCap18.LabResultLinkResultDto
            {
                Success = false,
                Message = "Không tìm thấy yêu cầu xét nghiệm"
            });

        // Generate one-time access token
        var token = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');

        var link = new LabResultAccessLink
        {
            Id = Guid.NewGuid(),
            LabRequestId = dto.LabRequestId,
            AccessToken = token,
            ExpiresAt = DateTime.Now.AddHours(72),
            Phone = dto.Phone,
            CreatedAt = DateTime.Now,
            CreatedBy = GetUserId()?.ToString()
        };

        _context.Set<LabResultAccessLink>().Add(link);
        await _context.SaveChangesAsync();

        // Build access URL
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var accessUrl = $"{baseUrl}/lab-result?token={token}";

        // Send SMS
        var patientName = labRequest.Patient?.FullName ?? "Quý khách";
        var smsMessage = $"BV Da Khoa: {patientName}, ket qua xet nghiem cua ban da co. Xem tai: {accessUrl} (het han sau 72h)";
        var smsSent = await _smsService.SendSmsAsync(dto.Phone, smsMessage, "LabResult", patientName, "LabRequest", dto.LabRequestId);

        return Ok(new HIS.Application.DTOs.NangCap18.LabResultLinkResultDto
        {
            Success = true,
            Message = smsSent ? "Đã gửi SMS thành công" : "Đã tạo link nhưng gửi SMS thất bại (link vẫn hoạt động)",
            AccessUrl = accessUrl,
            ExpiresAt = link.ExpiresAt
        });
    }
}
