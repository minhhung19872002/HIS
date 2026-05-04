# DI Registration Checklist (đọc trước khi commit module mới)

Trước khi push commit thêm service mới, đảm bảo TẤT CẢ các mục sau:

## File `backend/src/HIS.Infrastructure/DependencyInjection.cs`

- [ ] Đã thêm `services.AddScoped<IXxxService, XxxService>();` trong method `AddInfrastructure`.
- [ ] Đặt đúng group phân hệ (xem comment `// Phân hệ N: ...`). Nếu là phân hệ mới → thêm comment ở cuối.
- [ ] Service singleton (nếu cần) dùng `AddSingleton`, KHÔNG dùng `AddScoped` cho cache/connection manager.
- [ ] Nếu service implement `IHostedService` → dùng `services.AddHostedService<>()`.
- [ ] Nếu cần config từ appsettings → `services.Configure<XxxOptions>(configuration.GetSection("Xxx"))`.

## File `HIS.API/Program.cs`

- [ ] `builder.Services.AddInfrastructure(builder.Configuration)` đã được gọi (mặc định đã có).
- [ ] Nếu controller mới ở namespace khác → kiểm tra `AddControllers()` có quét đúng assembly.
- [ ] Nếu thêm middleware mới → `app.Use<XxxMiddleware>()` đặt đúng thứ tự (auth trước business).

## DbContext

- [ ] Nếu thêm entity mới → `DbSet<XxxEntity> Xxxs { get; set; }` trong `HISDbContext`.
- [ ] Nếu entity có `CreatedBy/UpdatedBy` Guid → đảm bảo ValueConverter được áp (tự động qua loop hoặc explicit).
- [ ] Nếu có FK shadow conflict (nav property + scalar cùng tên) → Fluent API `HasForeignKey(...)` trong `OnModelCreating`.

## AutoMapper

- [ ] Profile mới đặt trong `HIS.Application/Mappings/`.
- [ ] Profile được auto-discover (kiểm tra `services.AddAutoMapper(typeof(XxxProfile).Assembly)` đã trỏ đúng assembly).

## Smoke test trước commit

- [ ] `cd backend\src\HIS.API && dotnet build` — 0 errors, 0 warnings mới.
- [ ] `dotnet run --launch-profile http` — startup không exception.
- [ ] Login API: `POST /api/auth/login` returns 200.
- [ ] Endpoint mới: GET/POST returns 200/201, KHÔNG phải 500.
- [ ] Nếu 500 → mở `tmp_api_stderr.log` xem stack. 90% là quên DI hoặc EF mapping sai.

## Frontend integration (nếu cần)

- [ ] Service TS trong `frontend/src/services/<xxx>Service.ts`.
- [ ] Type definitions match DTO backend.
- [ ] Page/component dùng service mới.
- [ ] Cypress/Playwright test cho flow mới (xem `frontend/cypress/e2e/`).

## Commit message convention

- Module mới: `feat(<phan-he>): add <Xxx>Service for <chuc-nang>`
- Bug fix: `fix(<phan-he>): <mo-ta-bug>`
- Refactor: `refactor(<phan-he>): split <Xxx>Service into <A>Service + <B>Service`
