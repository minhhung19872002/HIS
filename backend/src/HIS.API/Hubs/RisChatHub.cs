using HIS.Core.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace HIS.API.Hubs;

/// <summary>
/// QA-R10: same role set as the RIS viewer endpoints (RISCompleteController.Viewer) — the hub used to accept
/// any signed-in account, so a receptionist could join any study room and read/post into it.
/// </summary>
[Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician + "," + RoleNames.Doctor)]
public class RisChatHub : Hub
{
    // QA-R10: bound the broadcast payload (default hub limit is 32KB per frame, every member receives it).
    private const int MaxMessageLength = 4000;
    private const string JoinedRoomsKey = "ris_chat_rooms";

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
        // QA-R10: room ids are study GUIDs — reject free-form group names from the client.
        if (!Guid.TryParse(studyId, out var id)) return;

        var groupName = $"study_{id:D}";
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        JoinedRooms().Add(groupName);

        var (userId, username) = GetCallerIdentity();
        await Clients.Group(groupName).SendAsync("UserJoined", userId, username);
    }

    /// <summary>
    /// Leave a per-study chat room.
    /// </summary>
    public async Task LeaveStudyRoom(string studyId)
    {
        if (!Guid.TryParse(studyId, out var id)) return;

        var groupName = $"study_{id:D}";
        if (!JoinedRooms().Remove(groupName)) return;

        var (userId, username) = GetCallerIdentity();
        await Clients.Group(groupName).SendAsync("UserLeft", userId, username);

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
    }

    /// <summary>
    /// Send a chat message to everyone in the study room (including the sender).
    /// </summary>
    public async Task SendMessage(string studyId, string messageText)
    {
        if (string.IsNullOrWhiteSpace(messageText) || !Guid.TryParse(studyId, out var id)) return;
        if (messageText.Length > MaxMessageLength)
            throw new HubException($"Tin nhắn vượt quá {MaxMessageLength} ký tự.");

        var groupName = $"study_{id:D}";
        // QA-R10: only members of the room may post (used to accept posts from any connection).
        if (!JoinedRooms().Contains(groupName))
            throw new HubException("Chưa tham gia phòng trao đổi của ca chụp này.");

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

    private HashSet<string> JoinedRooms()
    {
        if (Context.Items.TryGetValue(JoinedRoomsKey, out var v) && v is HashSet<string> set) return set;
        set = new HashSet<string>(StringComparer.Ordinal);
        Context.Items[JoinedRoomsKey] = set;
        return set;
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
