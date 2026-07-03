# DI Registration Checklist (read before committing a new module)

Before pushing a commit adding a new service, ensure ALL of the following:

## File `backend/src/HIS.Infrastructure/DependencyInjection.cs`

- [ ] Added `services.AddScoped<IXxxService, XxxService>();` in the `AddInfrastructure` method.
- [ ] Placed in the correct module-group comment block. For a new module → add a comment at the end.
- [ ] A singleton service (if needed) uses `AddSingleton`, do NOT use `AddScoped` for a cache/connection manager.
- [ ] If the service implements `IHostedService` → use `services.AddHostedService<>()`.
- [ ] If config from appsettings is needed → `services.Configure<XxxOptions>(configuration.GetSection("Xxx"))`.

## File `HIS.API/Program.cs`

- [ ] `builder.Services.AddInfrastructure(builder.Configuration)` is called (present by default).
- [ ] If the new controller is in a different namespace → check `AddControllers()` scans the right assembly.
- [ ] If adding new middleware → `app.Use<XxxMiddleware>()` in the right order (auth before business).

## DbContext

- [ ] If adding a new entity → `DbSet<XxxEntity> Xxxs { get; set; }` in `HISDbContext`.
- [ ] If the entity has a Guid `CreatedBy/UpdatedBy` → ensure the ValueConverter is applied (auto via loop or explicit).
- [ ] If there's a shadow-FK conflict (nav property + scalar with the same name) → Fluent API `HasForeignKey(...)` in `OnModelCreating`.

## AutoMapper

- [ ] The new Profile lives in `HIS.Application/Mappings/`.
- [ ] The Profile is auto-discovered (check `services.AddAutoMapper(typeof(XxxProfile).Assembly)` points to the right assembly).

## Smoke test before commit

- [ ] `cd backend\src\HIS.API && dotnet build` — 0 errors, 0 new warnings.
- [ ] `dotnet run --launch-profile http` — startup without an exception.
- [ ] Login API: `POST /api/auth/login` returns 200.
- [ ] New endpoint: GET/POST returns 200/201, NOT 500.
- [ ] If 500 → open `tmp_api_stderr.log` for the stack. 90% is a forgotten DI or a wrong EF mapping.

## Frontend integration (if needed)

- [ ] A TS service in `frontend/src/services/<xxx>Service.ts`.
- [ ] Type definitions match the backend DTO.
- [ ] The page/component uses the new service.
- [ ] A Cypress/Playwright test for the new flow (see `frontend/cypress/e2e/`).

## Commit message convention

- New module: `feat(<module>): add <Xxx>Service for <function>`
- Bug fix: `fix(<module>): <bug-description>`
- Refactor: `refactor(<module>): split <Xxx>Service into <A>Service + <B>Service`
