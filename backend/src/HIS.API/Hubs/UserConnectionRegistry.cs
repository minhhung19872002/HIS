using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;

namespace HIS.API.Hubs;

/// <summary>
/// QA-R11: live hub connections per user id, so a revoked session (admin lock/delete/reset/terminate,
/// password change, refresh-token reuse) also loses its realtime socket. A connection is only
/// authenticated at negotiate time — before this, a revoked user kept receiving pushes until the socket's
/// token expired (up to Jwt:ExpireMinutes).
/// </summary>
public static class UserConnectionRegistry
{
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, HubCallerContext>> ByUser =
        new(StringComparer.OrdinalIgnoreCase);

    public static string? UserIdOf(HubCallerContext context)
        => context.User?.FindFirst("sub")?.Value
           ?? context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

    public static void Add(HubCallerContext context)
    {
        var userId = UserIdOf(context);
        if (string.IsNullOrEmpty(userId)) return;
        ByUser.GetOrAdd(userId, _ => new ConcurrentDictionary<string, HubCallerContext>())[context.ConnectionId] = context;
    }

    public static void Remove(HubCallerContext context)
    {
        var userId = UserIdOf(context);
        if (string.IsNullOrEmpty(userId) || !ByUser.TryGetValue(userId, out var conns)) return;
        conns.TryRemove(context.ConnectionId, out _);
        if (conns.IsEmpty) ByUser.TryRemove(new KeyValuePair<string, ConcurrentDictionary<string, HubCallerContext>>(userId, conns));
    }

    /// <summary>Closes every live connection of the user (all hubs). Returns how many were aborted.</summary>
    public static int AbortUser(Guid userId)
    {
        if (!ByUser.TryRemove(userId.ToString(), out var conns)) return 0;
        var n = 0;
        foreach (var ctx in conns.Values)
        {
            try { ctx.Abort(); n++; } catch { /* already closed */ }
        }
        return n;
    }
}
