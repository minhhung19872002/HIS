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
        // Broadcasts (TargetUserId NULL) are shared rows: their read state lives per user in NotificationReads,
        // Notifications.IsRead only means something for a notification addressed to one user.
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
                IsRead = n.TargetUserId == null
                    ? _context.NotificationReads.Any(r => r.NotificationId == n.Id && r.UserId == userId)
                    : n.IsRead,
                ReadAt = n.TargetUserId == null
                    ? _context.NotificationReads.Where(r => r.NotificationId == n.Id && r.UserId == userId)
                        .Select(r => (DateTime?)r.ReadAt).FirstOrDefault()
                    : n.ReadAt,
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
        var count = await UnreadQuery(userId).CountAsync();

        return ServiceOutcome.Ok(new { count });
    }

    /// <summary>Unread for this user: own notifications with IsRead=false + broadcasts without a read row of this user.</summary>
    private IQueryable<HIS.Core.Entities.Notification> UnreadQuery(Guid userId)
        => _context.Notifications.Where(n => !n.IsDeleted
            && ((n.TargetUserId == userId && !n.IsRead)
                || (n.TargetUserId == null
                    && !_context.NotificationReads.Any(r => r.NotificationId == n.Id && r.UserId == userId))));

    /// <summary>
    /// Mark a notification as read
    /// </summary>
    public async Task<ServiceOutcome> MarkAsReadAsync(Guid id, Guid userId)
    {
        // Scope to the caller: any user could mark another user's (or a deleted) notification as read by id.
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && !n.IsDeleted && (n.TargetUserId == userId || n.TargetUserId == null));
        if (notification == null) return ServiceOutcome.NotFound();

        if (notification.TargetUserId == null)
        {
            // Broadcast: record the read for THIS user only (idempotent — unique NotificationId+UserId).
            if (!await _context.NotificationReads.AnyAsync(r => r.NotificationId == id && r.UserId == userId))
            {
                _context.NotificationReads.Add(new NotificationRead
                {
                    Id = Guid.NewGuid(), NotificationId = id, UserId = userId, ReadAt = DateTime.UtcNow,
                });
                try { await _context.SaveChangesAsync(); }
                catch (DbUpdateException ex) when (NangCap23ServiceHelpers.IsUniqueViolation(ex))
                {
                    // Double click / second tab already recorded it — same outcome.
                }
            }
            return ServiceOutcome.OkEmpty();
        }

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
        var unread = await UnreadQuery(userId).ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var n in unread)
        {
            if (n.TargetUserId == null)
            {
                _context.NotificationReads.Add(new NotificationRead
                {
                    Id = Guid.NewGuid(), NotificationId = n.Id, UserId = userId, ReadAt = now,
                });
            }
            else
            {
                n.IsRead = true;
                n.ReadAt = now;
            }
        }
        try { await _context.SaveChangesAsync(); }
        catch (DbUpdateException ex) when (NangCap23ServiceHelpers.IsUniqueViolation(ex))
        {
            // A concurrent mark-read inserted one of the rows first: retry once with whatever is still unread.
            _context.ChangeTracker.Clear();
            return await MarkAllAsReadAsync(userId);
        }

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

    /// <summary>
    /// Public page behind the SMS link (/lab-result?token=…). The token is the only credential, so the reply is
    /// limited to that one lab request: approved results only (Status 2), masked patient name, no identifiers.
    /// Every failure returns the same generic message so tokens cannot be probed for state.
    /// </summary>
    public async Task<ServiceOutcome> GetLabResultByTokenAsync(string? token)
    {
        const string invalid = "Link không hợp lệ hoặc đã hết hạn";
        if (string.IsNullOrWhiteSpace(token) || token.Length > 128) return ServiceOutcome.NotFound(invalid);

        var link = await _context.LabResultAccessLinks.FirstOrDefaultAsync(l => l.AccessToken == token);
        // ExpiresAt is written with DateTime.Now in SendLabResultLinkAsync — compare on the same clock.
        if (link == null || link.ExpiresAt < DateTime.Now) return ServiceOutcome.NotFound(invalid);

        var request = await _context.ServiceRequests
            .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(r => r.Id == link.LabRequestId && r.RequestType == 1);
        if (request == null) return ServiceOutcome.NotFound(invalid);

        var details = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Where(d => d.ServiceRequestId == request.Id && d.Status != 3)
            .ToListAsync();
        var approved = details.Where(d => d.Status == 2).ToList();
        var approvedIds = approved.Select(d => d.Id).ToList();
        var parameters = await _context.ServiceRequestDetailParameters
            .Where(p => approvedIds.Contains(p.ServiceRequestDetailId))
            .OrderBy(p => p.SequenceNumber)
            .ToListAsync();

        if (!link.IsUsed)
        {
            link.IsUsed = true;
            link.UsedAt = DateTime.Now;
            await _context.SaveChangesAsync();
        }

        return ServiceOutcome.Ok(new
        {
            patientNameMasked = MaskName(request.MedicalRecord?.Patient?.FullName),
            requestCode = request.RequestCode,
            requestDate = request.RequestDate,
            expiresAt = link.ExpiresAt,
            pendingCount = details.Count - approved.Count,
            results = approved.OrderBy(d => d.Service?.ServiceName).Select(d => new
            {
                serviceName = d.Service?.ServiceName ?? "",
                resultDate = d.ResultDate,
                result = d.Result,
                conclusion = d.Conclusion,
                items = parameters.Where(p => p.ServiceRequestDetailId == d.Id).Select(p => new
                {
                    name = string.IsNullOrWhiteSpace(p.ParameterName) ? p.ParameterCode : p.ParameterName,
                    value = p.Value,
                    unit = p.Unit,
                    referenceRange = !string.IsNullOrWhiteSpace(p.ReferenceRange) ? p.ReferenceRange
                        : p.ReferenceMin.HasValue && p.ReferenceMax.HasValue ? $"{p.ReferenceMin} - {p.ReferenceMax}"
                        : p.ReferenceMin.HasValue ? $"≥ {p.ReferenceMin}"
                        : p.ReferenceMax.HasValue ? $"≤ {p.ReferenceMax}" : "",
                    flag = p.Flag,
                }).ToList(),
            }).ToList(),
        });
    }

    /// <summary>"Nguyễn Văn An" → "N** V** An" (anonymous page: never the full name).</summary>
    private static string MaskName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "";
        var parts = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        for (int i = 0; i < parts.Length - 1; i++) parts[i] = parts[i][0] + "**";
        return string.Join(' ', parts);
    }
}
