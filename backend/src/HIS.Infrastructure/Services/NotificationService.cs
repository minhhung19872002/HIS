using HIS.Application.Common;
using HIS.Application.DTOs.NangCap18;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Logic thông báo — tách khỏi NotificationController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape + message giữ nguyên; userId truyền
/// từ controller (thay cho GetUserId() cũ đọc claim). Giới hạn tầng giữ ở controller: gate
/// Unauthorized (401) · SignalR push (NotificationHub thuộc tầng API) · baseUrl từ Request.
/// </summary>
public class NotificationService : INotificationService
{
    private readonly HISDbContext _context;
    private readonly ISmsService _smsService;

    public NotificationService(HISDbContext context, ISmsService smsService)
    {
        _context = context;
        _smsService = smsService;
    }

    /// <summary>
    /// Get current user's notifications (recent 50, newest first)
    /// </summary>
    public async Task<ServiceOutcome> GetMyNotificationsAsync(int limit, Guid userId)
    {
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

        return ServiceOutcome.Ok(notifications);
    }

    /// <summary>
    /// Get unread count for current user
    /// </summary>
    public async Task<ServiceOutcome> GetUnreadCountAsync(Guid userId)
    {
        var count = await _context.Notifications
            .Where(n => !n.IsDeleted && !n.IsRead && (n.TargetUserId == userId || n.TargetUserId == null))
            .CountAsync();

        return ServiceOutcome.Ok(new { count });
    }

    /// <summary>
    /// Mark a notification as read
    /// </summary>
    public async Task<ServiceOutcome> MarkAsReadAsync(Guid id)
    {
        var notification = await _context.Notifications.FindAsync(id);
        if (notification == null) return ServiceOutcome.NotFound();

        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return ServiceOutcome.OkEmpty();
    }

    /// <summary>
    /// Mark all notifications as read for current user
    /// </summary>
    public async Task<ServiceOutcome> MarkAllAsReadAsync(Guid userId)
    {
        var unread = await _context.Notifications
            .Where(n => !n.IsDeleted && !n.IsRead && (n.TargetUserId == userId || n.TargetUserId == null))
            .ToListAsync();

        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync();

        return ServiceOutcome.Ok(new { count = unread.Count });
    }

    /// <summary>
    /// Send a test notification to current user (dev/testing only)
    /// </summary>
    public async Task<HIS.Core.Entities.Notification> CreateTestNotificationAsync(Guid userId)
    {
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

        return notification;
    }

    /// <summary>
    /// Tạo link kết quả xét nghiệm online và gửi SMS
    /// </summary>
    public async Task<ServiceOutcome> SendLabResultLinkAsync(SendLabResultLinkDto dto, string baseUrl, Guid? userId)
    {
        // Find lab request — #14b: model 1 ServiceRequest (RequestType=1 XN); LabRequests model 2 chỉ seed ghi
        // → trước đây id thật từ FE không bao giờ khớp, luôn trả "Không tìm thấy".
        var labRequest = await _context.ServiceRequests
            .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(r => r.Id == dto.LabRequestId && !r.IsDeleted && r.RequestType == 1);

        if (labRequest == null)
            return ServiceOutcome.Ok(new HIS.Application.DTOs.NangCap18.LabResultLinkResultDto
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
            CreatedBy = userId?.ToString()
        };

        _context.Set<LabResultAccessLink>().Add(link);
        await _context.SaveChangesAsync();

        // Build access URL
        var accessUrl = $"{baseUrl}/lab-result?token={token}";

        // Send SMS
        var patientName = labRequest.MedicalRecord?.Patient?.FullName ?? "Quý khách";
        var smsMessage = $"BV Da Khoa: {patientName}, ket qua xet nghiem cua ban da co. Xem tai: {accessUrl} (het han sau 72h)";
        var smsSent = await _smsService.SendSmsAsync(dto.Phone, smsMessage, "LabResult", patientName, "LabRequest", dto.LabRequestId);

        return ServiceOutcome.Ok(new HIS.Application.DTOs.NangCap18.LabResultLinkResultDto
        {
            Success = true,
            Message = smsSent ? "Đã gửi SMS thành công" : "Đã tạo link nhưng gửi SMS thất bại (link vẫn hoạt động)",
            AccessUrl = accessUrl,
            ExpiresAt = link.ExpiresAt
        });
    }
}
