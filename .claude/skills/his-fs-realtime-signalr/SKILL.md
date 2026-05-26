---
name: his-fs-realtime-signalr
description: Use this skill when adding real-time push to HIS via SignalR — a backend Hub plus a frontend @microsoft/signalr client with JWT auth, auto-reconnect and polling fallback (notifications, RIS chat, AI queue, live queue display). Triggers include "realtime/đẩy thông báo [X]", creating a Hub, MapHub, IHubContext push, JWT query-string auth for SignalR, hoặc frontend HubConnectionBuilder + Context + badge. Do NOT use for plain REST polling pages (his-fe-page-v2) or background jobs (his-be-background-worker).
metadata:
  type: project
---

# HIS Real-time (SignalR)

Chuẩn hoá push realtime: **backend Hub** + **frontend client** (`@microsoft/signalr`) có JWT auth,
auto-reconnect và **polling fallback** (luôn có fallback vì WebSocket có thể rớt).

## Khi nào dùng
- Thông báo realtime, chat (RIS), hàng đợi (AI queue), bảng gọi số live.

## Khi nào KHÔNG dùng
- Trang list/detail fetch thường → `his-fe-page-v2`.
- Job nền không đẩy client → `his-be-background-worker`.

## Vị trí code mẫu (đọc trước khi viết)
- Backend Hub: `HIS.API/Hubs/NotificationHub.cs`, `HIS.API/Hubs/RisChatHub.cs`
- Đăng ký + JWT query auth + MapHub: `HIS.API/Program.cs`
- Frontend: `frontend/src/contexts/NotificationContext.tsx`, `components/NotificationBell.tsx`, `api/notification.ts`
- Proxy WS: `frontend/vite.config.ts` (`/hubs` với `ws:true`), origin: `frontend/src/config/api.ts` (`REALTIME_ORIGIN`)

## Backend (bám `NotificationHub`)
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
- `Program.cs`: `builder.Services.AddSignalR();` + JWT **query-string** auth (WebSocket không gửi header
  Authorization được) qua `JwtBearerEvents.OnMessageReceived`: nếu `path` bắt đầu `/hubs` thì đọc
  `access_token` từ query. `app.MapHub<XxxHub>("/hubs/xxx");`
- Push từ server: inject `IHubContext<XxxHub>` →
  `await _hub.Clients.Group($"user_{id}").SendAsync("ReceiveXxx", payload);`

## ⚠️ Gotcha sống còn
- **`IHubContext<XxxHub>` KHÔNG truy cập được từ `HIS.Infrastructure`** (Hub ở `HIS.API`, Infra không reference API).
  → Background worker ở Infra **không** push trực tiếp được. Giải pháp: worker chỉ ghi DB + frontend
  **poll** (vd `AiQueueBadge` poll 30s), hoặc định nghĩa `IRealtimeNotifier` ở `HIS.Application` rồi
  adapter ở `HIS.API` bọc `IHubContext`.
- WebSocket auth bằng query-string `access_token`, không phải header.

## Frontend (bám `NotificationContext.tsx`)
- `HubConnectionBuilder().withUrl(`${REALTIME_ORIGIN}/hubs/xxx`, { accessTokenFactory: () => token })`
  `.withAutomaticReconnect([0, 2000, 5000, 10000, 30000]).configureLogging(LogLevel.Warning)`
- Giữ connection ở `useRef`; `connection.on("ReceiveXxx", handler)` → cập nhật state + `message` popup.
- **Polling fallback BẮT BUỘC**: `setInterval` gọi REST (`Promise.allSettled`) ~30–60s phòng khi WS rớt.
- Connect khi `isAuthenticated`; stop khi logout/unmount.
- `vite.config.ts`: proxy `/hubs` với `ws: true`.
- Cypress: thêm SignalR vào `IGNORE_PATTERNS` (lỗi connect khi headless) — xem `his-test-e2e`.

## Checklist
- [ ] Hub `[Authorize]` + group `user_{id}`; `AddSignalR()` + JWT query auth + `MapHub` trong Program.cs
- [ ] Push qua `IHubContext` (chỉ trong HIS.API; worker thì poll/`IRealtimeNotifier`)
- [ ] FE: HubConnectionBuilder + reconnect + accessTokenFactory + **polling fallback**
- [ ] vite proxy `/hubs` ws:true; Cypress IGNORE_PATTERNS SignalR
- [ ] `dotnet build` + `npm run build` 0 error

## Dependency
`core-reusable-code` → `core-error-loading-state` → `his-fe-api-client` (REST fallback) →
`his-fs-realtime-signalr` → `his-qa-anti-pattern`.

## When to update
- Khi pattern Hub/`NotificationContext.tsx` hoặc cách auth JWT cho SignalR thay đổi.
