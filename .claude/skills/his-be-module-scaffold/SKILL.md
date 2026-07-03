---
name: his-be-module-scaffold
description: Use this skill when adding a new backend feature to HIS following Clean Architecture (HIS.Core → HIS.Application → HIS.Infrastructure → HIS.API). Triggers include creating a new service/controller/entity/DTO, registering DI in `backend/src/HIS.Infrastructure/DependencyInjection.cs`, scaffolding an AutoMapper profile, or avoiding a 500 from forgotten DI.
metadata:
  type: project
---

# HIS Backend Module Scaffold

A skill standardizing how to add a new backend module (or a new feature in an existing module) for HIS. Ensures the correct 4-layer Clean Architecture + NOT forgetting DI registration (which has caused 500 errors many times — clearly noted in CLAUDE.md).

## When to use

- Adding a new module (e.g. NangCap20 — a new Ministry of Health function).
- Adding a new service/controller in an existing module (e.g. `IBillingCompleteService` adds a new method + endpoint).
- Splitting one large service into several small ones.
- Turning a `NotImplementedException` stub into a real implementation.

## When NOT to use (route to a specialized skill)

- A service calling an **external HTTP gateway** (national/BHXH/Zalo/FHIR/SMS) → `his-be-external-gateway`.
- A **BackgroundService/hosted worker** running on an interval → `his-be-background-worker`
  (don't inject DbContext into the ctor — it'll ObjectDisposedException).
- **SignalR Hub / realtime push** → `his-fs-realtime-signalr`.
- A payment service → `his-be-payment-gateway`. A SQL table → `his-db-migration`.

## The 4-layer architecture

```
HIS.Core            → Entities, Interfaces (no dependencies)
  ↑
HIS.Application     → DTOs, Service interfaces (IXxxService), AutoMapper profiles
  ↑
HIS.Infrastructure  → Service implementations (XxxService), DbContext, Repositories, DependencyInjection.cs
  ↑
HIS.API             → Controllers, Program.cs, appsettings
```

Dependency rule: a lower layer only depends on the layers above it. **HIS.Core depends on NOTHING** — only entities + abstract interfaces.

## Standard process (adding a new service)

### Step 1 — Entity (`HIS.Core/Entities/`)
If adding a new DB table → create the entity. If only adding logic on an existing table → skip this step.

### Step 2 — Interface (`HIS.Application/Interfaces/IXxxService.cs`)
```csharp
namespace HIS.Application.Interfaces;
public interface IXxxService
{
    Task<XxxDto> GetByIdAsync(Guid id);
    Task<List<XxxDto>> GetListAsync(XxxFilterDto filter);
    Task<XxxDto> CreateAsync(XxxCreateDto dto, Guid userId);
}
```

### Step 3 — DTO (`HIS.Application/DTOs/Xxx/`)
One DTO per action: `XxxDto`, `XxxCreateDto`, `XxxUpdateDto`, `XxxFilterDto`. Do NOT use the entity directly at the API layer.

### Step 4 — AutoMapper Profile (`HIS.Application/Mappings/XxxProfile.cs`)
```csharp
public class XxxProfile : Profile
{
    public XxxProfile()
    {
        CreateMap<XxxEntity, XxxDto>();
        CreateMap<XxxCreateDto, XxxEntity>();
    }
}
```

### Step 5 — Implementation (`HIS.Infrastructure/Services/XxxService.cs`)
See `references/service-template.cs`.

### Step 6 — Register DI (MANDATORY) ⚠️
Open `backend/src/HIS.Infrastructure/DependencyInjection.cs`, add to the `AddInfrastructure` method:

```csharp
// Module N: <VN name> (<EN name>)
services.AddScoped<IXxxService, XxxService>();
```

Follow the existing grouping (by module 1-12). For a new module (NangCap20), add a new `// Module X: ...` comment at the end of the list.

**Forgetting this step = a 500 at runtime** when the controller resolves the interface. This is the project's pitfall #1 (clearly noted in CLAUDE.md).

### Step 7 — Controller (`HIS.API/Controllers/XxxController.cs`)
See `references/controller-template.cs`. Inject `IXxxService` via the constructor.

### Step 8 — Build + smoke test
```powershell
cd backend\src\HIS.API
dotnet build
ASPNETCORE_ENVIRONMENT=Development dotnet run --launch-profile http
```
Test the new endpoint via PowerShell (see skill `his-test-api-powershell`).

## Mandatory conventions

### Async + Task
Every service method is `async Task<>`. NO `async void`.

### Return a DTO, not an Entity
The service maps to a DTO before returning. The controller forwards the DTO to the client.

### Authorization
A controller has `[Authorize]` by default. A public endpoint must be explicit `[AllowAnonymous]`.

### Soft delete
Use `IsDeleted = true` instead of `Remove()`. Filter `Where(x => !x.IsDeleted)` in every GET query.

### Audit on create/update
```csharp
entity.CreatedAt = DateTime.UtcNow;
entity.CreatedBy = userId.ToString();
// or use the existing SaveChangesInterceptor (check HISDbContext)
```
**Read the `audit-columns-convention.md` of skill `his-db-migration`** to know whether the table uses Guid or Nvarchar for CreatedBy.

### Error handling
Do NOT `try/catch` in the service and swallow the exception. Let the controller or middleware (there's an ExceptionHandlingMiddleware) handle it.

### Logging
Inject `ILogger<XxxService>`. Log warning/error, don't log info for every call.

## Pitfalls (hit many times)

- **Forgetting DI → 500 Internal Server Error** with no clear stack trace → check `DependencyInjection.cs` first.
- **AutoMapper profile not registered**: by default the project scans the assembly so it's usually auto-picked-up, but a profile in another project needs an explicit `services.AddAutoMapper(typeof(XxxProfile).Assembly)`.
- **DbContext scope**: do NOT inject `HISDbContext` directly into a singleton service. A service must be scoped.
- **Singleton service injecting scoped**: if truly needed (e.g. `Pkcs11SessionManager` singleton in RIS), inject `IServiceScopeFactory` then create a scope manually.
- **Migration doesn't apply**: if you add a table via an EF migration but CLAUDE.md says "PendingModelChangesWarning Ignore" — the project IGNOREs pending model changes (see `DependencyInjection.cs:28`). You must write a hand-written SQL script (see skill `his-db-migration`) instead of relying on `dotnet ef migrations`.
- **Wrong module enum**: HIS has 12 main modules, each with a `<Module>CompleteService`. Don't create a duplicate name.

## Reference

- `references/service-template.cs` — class skeleton with DI, async, mapping, audit
- `references/controller-template.cs` — controller skeleton with [Authorize], [HttpGet/Post/Put], DTO binding
- `references/di-checklist.md` — a pre-commit checklist to be sure DI isn't forgotten

## When to update
- When the 4-layer structure / DI convention / mapping changes.
