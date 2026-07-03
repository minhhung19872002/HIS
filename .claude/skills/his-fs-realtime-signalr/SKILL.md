---
name: his-fs-realtime-signalr
description: Use this skill when adding real-time push to HIS via SignalR — a backend Hub plus a frontend @microsoft/signalr client with JWT auth, auto-reconnect and polling fallback (notifications, RIS chat, AI queue, live queue display). Triggers include "realtime/push a notification [X]", creating a Hub, MapHub, IHubContext push, JWT query-string auth for SignalR, or a frontend HubConnectionBuilder + Context + badge. Do NOT use for plain REST polling pages (his-fe-page-v2) or background jobs (his-be-background-worker).
metadata:
  type: project
---

# HIS Real-time (SignalR)

Standardizing realtime push: a **backend Hub** + a **frontend client** (`@microsoft/signalr`) with JWT auth,
auto-reconnect and a **polling fallback** (always have a fallback because the WebSocket can drop).

## When to use
- Realtime notifications, chat (RIS), a queue (AI queue), a live number-calling board.

## When NOT to use
- A normal list/detail fetch page → `his-fe-page-v2`.
- A background job that doesn't push to the client → `his-be-background-worker`.

## Sample code locations (read before writing)
- Backend Hub: `HIS.API/Hubs/NotificationHub.cs`, `HIS.API/Hubs/RisChatHub.cs`
- Registration + JWT query auth + MapHub: `HIS.API/Program.cs`
- Frontend: `frontend/src/contexts/NotificationContext.tsx`, `components/NotificationBell.tsx`, `api/notification.ts`
- WS proxy: `frontend/vite.config.ts` (`/hubs` with `ws:true`), origin: `frontend/src/config/api.ts` (`REALTIME_ORIGIN`)

## Backend (follow `NotificationHub`)
```csharp
[Authorize]
public class XxxHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst("sub")?.Value
                  ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userId))
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        await base.OnConnectedAsync();
    }
    // OnDisconnectedAsync → RemoveFromGroupAsync
}
```
- `Program.cs`: `builder.Services.AddSignalR();` + JWT **query-string** auth (a WebSocket can't send the Authorization
  header) via `JwtBearerEvents.OnMessageReceived`: if the `path` starts with `/hubs`, read
  `access_token` from the query. `app.MapHub<XxxHub>("/hubs/xxx");`
- Push from the server: inject `IHubContext<XxxHub>` →
  `await _hub.Clients.Group($"user_{id}").SendAsync("ReceiveXxx", payload);`

## ⚠️ Survival gotcha
- **`IHubContext<XxxHub>` is NOT reachable from `HIS.Infrastructure`** (the Hub is in `HIS.API`, Infra doesn't reference API).
  → A background worker in Infra **cannot** push directly. Solution: the worker only writes the DB + the frontend
  **polls** (e.g. `AiQueueBadge` polls every 30s), or define an `IRealtimeNotifier` in `HIS.Application` then an
  adapter in `HIS.API` wrapping `IHubContext`.
- WebSocket auth via the query-string `access_token`, not a header.

## Frontend (follow `NotificationContext.tsx`)
- `HubConnectionBuilder().withUrl(`${REALTIME_ORIGIN}/hubs/xxx`, { accessTokenFactory: () => token })`
  `.withAutomaticReconnect([0, 2000, 5000, 10000, 30000]).configureLogging(LogLevel.Warning)`
- Keep the connection in a `useRef`; `connection.on("ReceiveXxx", handler)` → update state + a `message` popup.
- **Polling fallback MANDATORY**: a `setInterval` calling REST (`Promise.allSettled`) ~30–60s in case the WS drops.
- Connect when `isAuthenticated`; stop on logout/unmount.
- `vite.config.ts`: proxy `/hubs` with `ws: true`.
- Cypress: add SignalR to `IGNORE_PATTERNS` (a connect error when headless) — see `his-test-e2e`.

## Checklist
- [ ] Hub `[Authorize]` + group `user_{id}`; `AddSignalR()` + JWT query auth + `MapHub` in Program.cs
- [ ] Push via `IHubContext` (only in HIS.API; a worker polls/`IRealtimeNotifier`)
- [ ] FE: HubConnectionBuilder + reconnect + accessTokenFactory + **polling fallback**
- [ ] vite proxy `/hubs` ws:true; Cypress IGNORE_PATTERNS SignalR
- [ ] `dotnet build` + `npm run build` 0 errors

## Dependency
`core-reusable-code` → `core-error-loading-state` → `his-fe-api-client` (REST fallback) →
`his-fs-realtime-signalr` → `his-qa-anti-pattern`.

## When to update
- When the Hub/`NotificationContext.tsx` pattern or the SignalR JWT auth approach changes.
