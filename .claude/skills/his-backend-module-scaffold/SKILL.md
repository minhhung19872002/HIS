---
name: his-backend-module-scaffold
description: Use this skill when adding a new backend feature to HIS following Clean Architecture (HIS.Core → HIS.Application → HIS.Infrastructure → HIS.API). Triggers include creating a new service/controller/entity/DTO, đăng ký DI trong `backend/src/HIS.Infrastructure/DependencyInjection.cs`, scaffold AutoMapper profile, hoặc tránh lỗi 500 do quên DI.
type: project
---

# HIS Backend Module Scaffold

Skill chuẩn hoá cách thêm 1 module backend mới (hoặc feature mới trong module có sẵn) cho HIS. Đảm bảo đúng 4-layer Clean Architecture + KHÔNG quên DI registration (đã từng gây lỗi 500 nhiều lần — note rõ trong CLAUDE.md).

## Khi nào dùng

- Thêm phân hệ mới (vd: NangCap20 — chức năng mới của Bộ Y tế).
- Thêm service/controller mới trong phân hệ có sẵn (vd: `IBillingCompleteService` thêm method mới + endpoint).
- Tách 1 service lớn thành nhiều service nhỏ.
- Sửa stub `NotImplementedException` thành implementation thật.

## Kiến trúc 4 layer

```
HIS.Core            → Entities, Interfaces (no dependencies)
  ↑
HIS.Application     → DTOs, Service interfaces (IXxxService), AutoMapper profiles
  ↑
HIS.Infrastructure  → Service implementations (XxxService), DbContext, Repositories, DependencyInjection.cs
  ↑
HIS.API             → Controllers, Program.cs, appsettings
```

Quy tắc dependency: lớp dưới chỉ phụ thuộc các lớp trên nó. **HIS.Core KHÔNG phụ thuộc bất cứ thứ gì** — chỉ entities + interface trừu tượng.

## Quy trình chuẩn (thêm 1 service mới)

### Bước 1 — Entity (`HIS.Core/Entities/`)
Nếu thêm bảng DB mới → tạo entity. Nếu chỉ thêm logic trên bảng cũ → bỏ qua bước này.

### Bước 2 — Interface (`HIS.Application/Interfaces/IXxxService.cs`)
```csharp
namespace HIS.Application.Interfaces;
public interface IXxxService
{
    Task<XxxDto> GetByIdAsync(Guid id);
    Task<List<XxxDto>> GetListAsync(XxxFilterDto filter);
    Task<XxxDto> CreateAsync(XxxCreateDto dto, Guid userId);
}
```

### Bước 3 — DTO (`HIS.Application/DTOs/Xxx/`)
Mỗi action 1 DTO: `XxxDto`, `XxxCreateDto`, `XxxUpdateDto`, `XxxFilterDto`. KHÔNG dùng entity trực tiếp ở API layer.

### Bước 4 — AutoMapper Profile (`HIS.Application/Mappings/XxxProfile.cs`)
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

### Bước 5 — Implementation (`HIS.Infrastructure/Services/XxxService.cs`)
Xem `references/service-template.cs`.

### Bước 6 — Đăng ký DI (BẮT BUỘC) ⚠️
Mở `backend/src/HIS.Infrastructure/DependencyInjection.cs`, thêm vào method `AddInfrastructure`:

```csharp
// Phân hệ N: <Tên VN> (<Tên EN>)
services.AddScoped<IXxxService, XxxService>();
```

Tuân theo grouping hiện có (theo phân hệ 1-12). Nếu là phân hệ mới (NangCap20), thêm comment `// Phân hệ X: ...` mới ở cuối list.

**Quên bước này = lỗi 500 lúc runtime** khi controller resolve interface. Đây là pitfall #1 của project (CLAUDE.md ghi rõ).

### Bước 7 — Controller (`HIS.API/Controllers/XxxController.cs`)
Xem `references/controller-template.cs`. Inject `IXxxService` qua constructor.

### Bước 8 — Build + smoke test
```powershell
cd backend\src\HIS.API
dotnet build
ASPNETCORE_ENVIRONMENT=Development dotnet run --launch-profile http
```
Test endpoint mới qua PowerShell (xem skill `his-api-test-powershell`).

## Convention bắt buộc

### Async + Task
Mọi method service đều `async Task<>`. KHÔNG `async void`.

### Trả về DTO, không phải Entity
Service map sang DTO trước khi return. Controller forward DTO cho client.

### Authorization
Mặc định controller có `[Authorize]`. Endpoint public phải explicit `[AllowAnonymous]`.

### Soft delete
Dùng `IsDeleted = true` thay vì `Remove()`. Filter `Where(x => !x.IsDeleted)` trong mọi query GET.

### Audit on create/update
```csharp
entity.CreatedAt = DateTime.UtcNow;
entity.CreatedBy = userId.ToString();
// hoặc dùng SaveChangesInterceptor sẵn có (kiểm tra HISDbContext)
```
**Đọc `audit-columns-convention.md` của skill `his-sql-table-migration`** để biết bảng đang dùng Guid hay Nvarchar cho CreatedBy.

### Error handling
KHÔNG `try/catch` ở service rồi nuốt exception. Để controller hoặc middleware (đã có ExceptionHandlingMiddleware) handle.

### Logging
Inject `ILogger<XxxService>`. Log warning/error, không log info cho mọi call.

## Pitfalls (đã dính nhiều lần)

- **Quên DI → 500 Internal Server Error** không có stack trace rõ ràng → kiểm tra `DependencyInjection.cs` đầu tiên.
- **AutoMapper profile chưa register**: mặc định project quét assembly nên thường tự pick up, nhưng nếu profile ở project khác cần explicit `services.AddAutoMapper(typeof(XxxProfile).Assembly)`.
- **DbContext scope**: KHÔNG inject `HISDbContext` trực tiếp vào service singleton. Service phải scoped.
- **Singleton service inject scoped**: nếu thật sự cần (vd `Pkcs11SessionManager` singleton trong RIS), phải inject `IServiceScopeFactory` rồi tạo scope thủ công.
- **Migration không apply**: nếu thêm bảng qua EF migration mà CLAUDE.md ghi "PendingModelChangesWarning Ignore" — project đang IGNORE pending model changes (xem `DependencyInjection.cs:28`). Phải tạo SQL script tay (xem skill `his-sql-table-migration`) thay vì trông cậy `dotnet ef migrations`.
- **Phân hệ enum sai**: HIS có 12 phân hệ chính, mỗi phân hệ có service `<Module>CompleteService`. Đừng tạo trùng tên.

## Reference

- `references/service-template.cs` — class skeleton với DI, async, mapping, audit
- `references/controller-template.cs` — controller skeleton với [Authorize], [HttpGet/Post/Put], DTO binding
- `references/di-checklist.md` — checklist trước commit để chắc chắn không quên DI
