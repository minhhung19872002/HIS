---
name: his-be-background-worker
description: Use this skill when adding a background/hosted service to the HIS backend — a BackgroundService that runs on an interval (retry worker, worklist scanner, HL7 receiver, queue processor). Triggers include "worker/job nền [X]", "tự động quét/gửi lại [X]", BackgroundService + IServiceScopeFactory, interval loop, idempotent claim, hoặc fix ObjectDisposedException trong hosted service. Do NOT use for ASP.NET request-scoped services (his-be-module-scaffold) hay SignalR realtime push (his-fs-realtime-signalr).
metadata:
  type: project
---

# HIS Background Worker (Hosted Service)

Chuẩn hoá `BackgroundService` chạy nền theo chu kỳ trong HIS backend. Gotcha lớn nhất:
hosted service là **singleton** → KHÔNG được inject service scoped (DbContext) trực tiếp vào ctor
(sẽ `ObjectDisposedException`). Phải tạo scope **mỗi vòng lặp**.

## Khi nào dùng
- Retry worker gửi lại bản ghi treo (cổng ngoài — xem `his-be-external-gateway`).
- Worklist scanner (vd AI quét DicomStudy mới), HL7 receiver, queue processor.

## Khi nào KHÔNG dùng
- Service xử lý theo request HTTP → `his-be-module-scaffold`.
- Đẩy realtime tới client → `his-fs-realtime-signalr`.

## Vị trí code mẫu (đọc trước khi viết)
- `HIS.Infrastructure/Services/Workers/Nangcap23RetryWorker.cs` (chuẩn nhất)
- `HIS.Infrastructure/Services/AiWorklistService.cs`, `HIS.Infrastructure/Services/HL7/HL7ReceiverService.cs`
- Cũng xem `AuditLogMiddleware` — dùng `IServiceScopeFactory` + `Task.Run` vì cùng lý do scope.

## Pattern chuẩn (bám `Nangcap23RetryWorker`)
```csharp
public sealed class XxxWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory; // KHÔNG inject DbContext trực tiếp
    private readonly bool _enabled;       // config, default false (tắt cho dev)
    private readonly TimeSpan _interval;  // config IntervalSeconds

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        if (!_enabled) { _logger.LogInformation("XxxWorker disabled"); return; }
        try { await Task.Delay(TimeSpan.FromSeconds(15), ct); }  // chờ app bootstrap
        catch (OperationCanceledException) { return; }
        while (!ct.IsCancellationRequested)
        {
            try { await DoWorkAsync(ct); }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { break; }
            catch (Exception ex) { _logger.LogError(ex, "iteration failed — retry next cycle"); } // worker KHÔNG die
            try { await Task.Delay(_interval, ct); } catch (OperationCanceledException) { break; }
        }
    }

    private async Task DoWorkAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();          // scope MỖI vòng
        var db = scope.ServiceProvider.GetRequiredService<HISDbContext>();
        // ... claim row idempotent qua Where(...) + status marker; SaveChangesAsync(ct)
        // catch per-row: db.ChangeTracker.Clear() rồi tiếp tục
    }
}
```

## Quy tắc sống còn
1. **`IServiceScopeFactory` + scope mỗi vòng** — không bao giờ giữ DbContext/scoped service ở field ctor.
2. **`_enabled` mặc định `false`** cho dev; bật trên prod qua env var (vd `AiLabeling__Worklist__Enabled=true`).
3. **try/catch quanh mỗi iteration** — worker tuyệt đối không được chết; log rồi tiếp tục.
4. **Idempotent + multi-instance safe**: claim row bằng atomic `Where(Status==..., RetryCount<max, time<threshold)`;
   Cloud Run chạy nhiều instance → tránh xử lý trùng (status marker / idempotency key).
5. **`OperationCanceledException`** khi shutdown → thoát sạch, không log như lỗi.
6. **`db.ChangeTracker.Clear()`** khi 1 row lỗi để không kẹt cả batch.
7. **Đăng ký**: `services.AddHostedService<XxxWorker>()` trong `DependencyInjection.cs` (quên → worker không chạy).

## Checklist
- [ ] `sealed class : BackgroundService`, inject `IServiceScopeFactory` (không scoped)
- [ ] `_enabled` default false; bật prod qua env
- [ ] try/catch mỗi vòng; xử lý `OperationCanceledException`
- [ ] scope-per-iteration; `ChangeTracker.Clear()` khi lỗi row
- [ ] `AddHostedService<>` đã đăng ký
- [ ] `dotnet build` 0 error

## Dependency
`core-architecture-follow` (worker ở Infrastructure) → `his-be-background-worker` →
`his-be-external-gateway` (nếu là retry cổng) → `his-qa-anti-pattern` (DI, không hardcode).

## When to update
- Khi pattern worker đổi (vd `Nangcap23RetryWorker`) hoặc cách tạo scope/idempotent thay đổi.
