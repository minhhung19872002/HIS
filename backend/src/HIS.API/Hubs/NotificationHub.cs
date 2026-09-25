using HIS.Core.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace HIS.API.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    /// <summary>
    /// QA-R10: security alerts (break-glass) go only to this group — they used to be sent to Clients.All,
    /// so every signed-in account (receptionist, patient-app service) learned who opened which patient.
    /// Membership is decided server-side from the JWT role claims; there is no client-callable join.
    /// </summary>
    public const string SecurityAlertsGroup = "security_alerts";

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst("sub")?.Value
                  ?? Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        }

        if (Context.User != null &&
            (Context.User.IsInRole(RoleNames.Admin) || Context.User.IsInRole(RoleNames.Director)
             || Context.User.IsInRole(RoleNames.QuanTriHeThong)))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, SecurityAlertsGroup);
        }

        UserConnectionRegistry.Add(Context); // QA-R11: revoked sessions lose their socket
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst("sub")?.Value
                  ?? Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
        }

        UserConnectionRegistry.Remove(Context);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Mark a notification as read
    /// </summary>
    public async Task MarkAsRead(string notificationId)
    {
        // Client confirms they've read a notification
        await Clients.Caller.SendAsync("NotificationRead", notificationId);
    }
}
