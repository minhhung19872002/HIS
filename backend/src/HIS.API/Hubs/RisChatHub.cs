using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace HIS.API.Hubs;

[Authorize]
public class RisChatHub : Hub
{
    /// <summary>
    /// When a client connects, we don't auto-join any study room.
    /// The client must explicitly call JoinStudyRoom(studyId).
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Join a per-study chat room so the client receives messages for that study.
    /// </summary>
    public async Task JoinStudyRoom(string studyId)
    {
        if (string.IsNullOrWhiteSpace(studyId)) return;

        var groupName = $"study_{studyId}";
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

        var (userId, username) = GetCallerIdentity();
        await Clients.Group(groupName).SendAsync("UserJoined", userId, username);
    }

    /// <summary>
    /// Leave a per-study chat room.
    /// </summary>
    public async Task LeaveStudyRoom(string studyId)
    {
        if (string.IsNullOrWhiteSpace(studyId)) return;

        var groupName = $"study_{studyId}";

        var (userId, username) = GetCallerIdentity();
        await Clients.Group(groupName).SendAsync("UserLeft", userId, username);

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
    }

    /// <summary>
    /// Send a chat message to everyone in the study room (including the sender).
    /// </summary>
    public async Task SendMessage(string studyId, string messageText)
    {
        if (string.IsNullOrWhiteSpace(studyId) || string.IsNullOrWhiteSpace(messageText)) return;

        var groupName = $"study_{studyId}";
        var (senderId, senderName) = GetCallerIdentity();
        var timestamp = DateTimeOffset.UtcNow.ToString("o");

        await Clients.Group(groupName).SendAsync(
            "ReceiveMessage",
            senderId,
            senderName,
            messageText,
            timestamp
        );
    }

    /// <summary>
    /// Extract userId and username from JWT claims.
    /// </summary>
    private (string userId, string username) GetCallerIdentity()
    {
        var userId = Context.User?.FindFirst("sub")?.Value
                  ?? Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                  ?? "";

        var username = Context.User?.FindFirst("name")?.Value
                    ?? Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                    ?? Context.User?.FindFirst("unique_name")?.Value
                    ?? "Unknown";

        return (userId, username);
    }
}
