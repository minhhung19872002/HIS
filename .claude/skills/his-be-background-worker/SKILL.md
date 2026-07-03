---
name: his-be-background-worker
description: Use this skill when adding a background/hosted service to the HIS backend — a BackgroundService that runs on an interval (retry worker, worklist scanner, HL7 receiver, queue processor). Triggers include "background worker/job [X]", "auto scan/resend [X]", BackgroundService + IServiceScopeFactory, interval loop, idempotent claim, or fixing an ObjectDisposedException in a hosted service. Do NOT use for ASP.NET request-scoped services (his-be-module-scaffold) or SignalR realtime push (his-fs-realtime-signalr).
metadata:
  type: project
---

# HIS Background Worker (Hosted Service)

Standardizing an interval `BackgroundService` in the HIS backend. The biggest gotcha:
a hosted service is a **singleton** → you must NOT inject a scoped service (DbContext) directly into the ctor
(it'll `ObjectDisposedException`). You must create a scope **each loop iteration**.

## When to use
- A retry worker resending stuck records (external gateway — see `his-be-external-gateway`).
- A worklist scanner (e.g. AI scanning new DicomStudy), HL7 receiver, queue processor.

## When NOT to use
- A service handling an HTTP request → `his-be-module-scaffold`.
- Pushing realtime to a client → `his-fs-realtime-signalr`.

## Sample code locations (read before writing)
- `HIS.Infrastructure/Services/Workers/Nangcap23RetryWorker.cs` (the best reference)
- `HIS.Infrastructure/Services/AiWorklistService.cs`, `HIS.Infrastructure/Services/HL7/HL7ReceiverService.cs`
- Also see `AuditLogMiddleware` — it uses `IServiceScopeFactory` + `Task.Run` for the same scope reason.

## Standard pattern (follow `Nangcap23RetryWorker`)
```csharp
public sealed class XxxWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory; // do NOT inject DbContext directly
    private readonly bool _enabled;       // config, default false (off for dev)
    private readonly TimeSpan _interval;  // config IntervalSeconds

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        if (!_enabled) { _logger.LogInformation("XxxWorker disabled"); return; }
        try { await Task.Delay(TimeSpan.FromSeconds(15), ct); }  // wait for app bootstrap
        catch (OperationCanceledException) { return; }
        while (!ct.IsCancellationRequested)
        {
            try { await DoWorkAsync(ct); }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { break; }
            catch (Exception ex) { _logger.LogError(ex, "iteration failed — retry next cycle"); } // worker does NOT die
            try { await Task.Delay(_interval, ct); } catch (OperationCanceledException) { break; }
        }
    }

    private async Task DoWorkAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();          // a scope PER iteration
        var db = scope.ServiceProvider.GetRequiredService<HISDbContext>();
        // ... claim a row idempotently via Where(...) + a status marker; SaveChangesAsync(ct)
        // catch per-row: db.ChangeTracker.Clear() then continue
    }
}
```

## Survival rules
1. **`IServiceScopeFactory` + a scope per iteration** — never hold a DbContext/scoped service in a ctor field.
2. **`_enabled` defaults to `false`** for dev; enable on prod via env var (e.g. `AiLabeling__Worklist__Enabled=true`).
3. **try/catch around each iteration** — the worker must never die; log then continue.
4. **Idempotent + multi-instance safe**: claim a row with an atomic `Where(Status==..., RetryCount<max, time<threshold)`;
   Cloud Run runs multiple instances → avoid double-processing (status marker / idempotency key).
5. **`OperationCanceledException`** on shutdown → exit cleanly, don't log it as an error.
6. **`db.ChangeTracker.Clear()`** on a row error so the whole batch isn't stuck.
7. **Register**: `services.AddHostedService<XxxWorker>()` in `DependencyInjection.cs` (forget → the worker doesn't run).

## Checklist
- [ ] `sealed class : BackgroundService`, inject `IServiceScopeFactory` (not scoped)
- [ ] `_enabled` default false; enable on prod via env
- [ ] try/catch each loop; handle `OperationCanceledException`
- [ ] scope-per-iteration; `ChangeTracker.Clear()` on a row error
- [ ] `AddHostedService<>` registered
- [ ] `dotnet build` 0 errors

## Dependency
`core-architecture-follow` (worker in Infrastructure) → `his-be-background-worker` →
`his-be-external-gateway` (if it's a gateway retry) → `his-qa-anti-pattern` (DI, no hardcode).

## When to update
- When the worker pattern changes (e.g. `Nangcap23RetryWorker`) or the scope/idempotent approach changes.
