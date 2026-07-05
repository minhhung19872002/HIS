using HIS.Application.Common;
using HIS.Application.DTOs.NangCap18;
using HIS.Core.Entities;

namespace HIS.Application.Interfaces;

/// <summary>
/// Logic thông báo — tách khỏi NotificationController (#202 thin-controller).
/// Behavior-preserving. Ghi chú giới hạn tầng:
/// - Gate <c>Unauthorized()</c> (401) không biểu diễn được bằng ServiceOutcome → giữ ở controller.
/// - SignalR push dùng NotificationHub (thuộc tầng API, Infrastructure không tham chiếu được) →
///   <see cref="CreateTestNotificationAsync"/> chỉ ghi DB rồi TRẢ entity để controller push + trả {Id}.
/// - baseUrl lấy từ <c>Request.Scheme/Host</c> (HTTP) → controller tính rồi truyền vào.
/// </summary>
public interface INotificationService
{
    Task<ServiceOutcome> GetMyNotificationsAsync(int limit, Guid userId);
    Task<ServiceOutcome> GetUnreadCountAsync(Guid userId);
    Task<ServiceOutcome> MarkAsReadAsync(Guid id);
    Task<ServiceOutcome> MarkAllAsReadAsync(Guid userId);
    Task<HIS.Core.Entities.Notification> CreateTestNotificationAsync(Guid userId);
    Task<ServiceOutcome> SendLabResultLinkAsync(SendLabResultLinkDto dto, string baseUrl, Guid? userId);
}
