# NangCap23 — HSMT gói thầu BV Đa khoa (39 phân hệ)

## Tổng quan

NangCap23 là gói nâng cấp đáp ứng yêu cầu Hồ sơ mời thầu (HSMT) BV Đa khoa
tỉnh — 39 phân hệ nghiệp vụ. Sau khi đối chiếu codebase, **30/39 phân hệ
đã có sẵn** và **9 phân hệ mới được implement** trong gói này.

| # | Phân hệ HSMT | Mục HSMT | Trạng thái |
|---|---|---|---|
| 1 | Cổng Đơn thuốc QG (donthuocquocgia.vn) — QĐ 808/QĐ-BYT 2022 | #12 | ✅ Real HttpClient |
| 2 | Cổng Dược QG (duocquocgia.com.vn) — CV 2406/QLD-Ttra 2018 | #12 | ✅ Real HttpClient |
| 3 | Giấy chứng sinh điện tử — Đề án 06 (TT 17/2024) | #32 | ✅ Real HttpClient |
| 4 | Giấy báo tử điện tử — Đề án 06 | #32 | ✅ Real HttpClient |
| 5 | Giấy KSK lái xe điện tử — TT 24/2023 + Đề án 06 | #32 | ✅ Real HttpClient |
| 6 | Đồ giặt vải + lịch tiệt trùng phòng (KSNK) | #21 | ✅ Local DB |
| 7 | Thăm dò chức năng 8 loại (ECG/Endoscopy/EEG/EMG/Spirometry/Audiometry/BoneDensity/ECGStress) | #18 | ✅ Local DB |
| 8 | Quality Dashboard 5 view (Phòng khám/Nội trú/CLS/XN/Doanh thu) | #39 | ✅ Local DB |
| 9 | Zalo OA / ZNS notification | #14 | ✅ Real HttpClient |

## Production-readiness

| Cấu phần | Trạng thái |
|---|---|
| Backend layer: Entity/DTO/Service/Controller/DI/Migration | ✅ Hoàn thiện |
| Real HTTP client (Polly-like retry + timeout + exponential backoff) | ✅ `NangCap23HttpClients.cs` |
| Default `MockMode` | ✅ **`false`** trong `appsettings.json` (production-first) |
| Development override | ✅ `appsettings.Development.json` → `MockMode=true` |
| Cloud Run prod env | Cần set `NationalGateway__MockMode=false` + `Zalo__MockMode=false` |
| Role-based authorization | ✅ `[Authorize(Roles="Admin")]` cho `POST /config` |
| State machine guard | ✅ `Nangcap23StateMachine` — chặn Submit/Retry/Cancel sai thứ tự |
| Input validation | ✅ ArgumentException cho phone/period/reportType/empty payload |
| Error handling | ✅ HttpRequestException/TaskCanceledException catch + retry 3 lần |
| Test coverage | ✅ 43 case page-load + 30 case CRUD/state/permission/validation |
| QA guide | ✅ `docs/features/nangcap23/test-guide.md` |

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│ HIS.API Controllers (NangCap23Controllers.cs)                  │
│   /api/national-prescription-gateway/*  [Authorize]            │
│   /api/national-pharmacy/*              [Authorize]            │
│   /api/de-an-06/{birth,death,driving-license}-*                │
│   /api/linen/{items,transactions,sterilization-schedules}      │
│   /api/functional-diagnostics                                  │
│   /api/zalo-notification/*                                     │
│   /api/quality-dashboard/*                                     │
└─────────────────────────────┬──────────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────────┐
│ HIS.Application Services (INangCap23Services.cs)               │
│   INationalPrescriptionGatewayService  ◄── DI: HISDbContext +  │
│   INationalPharmacyGatewayService          IConfiguration +    │
│   IDeAn06CertificateService                gateway client +    │
│   ILinenManagementService                  ILogger             │
│   IFunctionalDiagnosticsService                                │
│   IZaloNotificationService                                     │
│   IQualityDashboardService                                     │
│                                                                │
│ Nangcap23StateMachine — static guard helper                    │
│ INangCap23GatewayClients — 4 client contracts                  │
└─────────────────────────────┬──────────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────────┐
│ HIS.Infrastructure (gồm 2 binding tùy MockMode)                │
│                                                                │
│ MockMode=false (production default):                           │
│   ├─ HttpNationalPrescriptionGatewayClient   → donthuocquocgia.vn
│   ├─ HttpNationalPharmacyGatewayClient       → duocquocgia.com.vn
│   ├─ HttpDeAn06GatewayClient                 → gdbhyt.baohiemxahoi.gov.vn
│   └─ HttpZaloOaClient                        → business.openapi.zalo.me
│                                                                │
│ MockMode=true (Development only):                              │
│   ├─ InMemoryNationalPrescriptionGatewayClient                 │
│   ├─ InMemoryNationalPharmacyGatewayClient                     │
│   ├─ InMemoryDeAn06GatewayClient                               │
│   └─ InMemoryZaloOaClient                                      │
└────────────────────────────────────────────────────────────────┘
```

## Cấu hình môi trường

### Development (`appsettings.Development.json`)

```json
{
  "NationalGateway": { "MockMode": true },
  "Zalo":            { "MockMode": true }
}
```

→ DI bind `InMemory*` clients. Không cần sandbox URL hay API key.

### Production (`appsettings.json`)

```json
{
  "NationalGateway": {
    "MockMode": false,
    "FacilityCode": "BV-DEMO-01",
    "TimeoutSeconds": 30,
    "RetryCount": 3,
    "Prescription": { "BaseUrl": "https://donthuocquocgia.vn", "ApiKey": "" },
    "Pharmacy":     { "BaseUrl": "https://duocquocgia.com.vn", "ApiKey": "" }
  },
  "DeAn06": { "BaseUrl": "https://gdbhyt.baohiemxahoi.gov.vn", "AccessToken": "" },
  "Zalo":   { "MockMode": false, "BaseUrl": "https://business.openapi.zalo.me", "AccessToken": "", "OaId": "" }
}
```

### Cloud Run prod env-var override

```bash
gcloud run services update his-api --update-env-vars="
  NationalGateway__MockMode=false,
  NationalGateway__FacilityCode=BV-XYZ-2026,
  NationalGateway__Prescription__ApiKey=<api-key>,
  NationalGateway__Pharmacy__ApiKey=<api-key>,
  DeAn06__AccessToken=<da06-token>,
  Zalo__MockMode=false,
  Zalo__AccessToken=<oa-token>,
  Zalo__OaId=<oa-id>,
  Zalo__IsEnabled=true
" --region=asia-southeast1 --project=project-4d4a3f8e-d582-4536-97f
```

## Files

### Backend
- `backend/src/HIS.Core/Entities/NangCap23Entities.cs` — 10 entities
- `backend/src/HIS.Application/DTOs/NangCap23/NangCap23DTOs.cs` — ~30 DTO
- `backend/src/HIS.Application/Services/INangCap23Services.cs` — 7 service interface
- `backend/src/HIS.Application/Services/INangCap23GatewayClients.cs` — 4 client interface
- `backend/src/HIS.Application/Services/Nangcap23StateMachine.cs` — state guard
- `backend/src/HIS.Infrastructure/Services/NangCap23Services.cs` — 7 service impl
- `backend/src/HIS.Infrastructure/Services/External/NangCap23HttpClients.cs` — 4 HTTP + 4 InMemory clients
- `backend/src/HIS.API/Controllers/NangCap23Controllers.cs` — 7 controllers
- `backend/src/HIS.Infrastructure/Data/Scripts/43_nangcap23_gateways.sql` — 10 tables

### Frontend
- `frontend/src/api/nangcap23.ts` — 7 API clients
- `frontend/src/pages/{NationalGateways,DeAn06Liaison,LinenManagement,FunctionalDiagnostics,ZaloNotifications,QualityDashboardLive}.tsx` — 6 v1 pages
- `frontend/src/pages-v2/<same 6>.tsx` — 6 v2 pages

### Tests
- `frontend/cypress/e2e/nangcap23-pages.cy.ts` — page-load smoke
- `frontend/cypress/e2e/nangcap23-v1-pages.cy.ts` — v1 page smoke
- `frontend/cypress/e2e/nangcap23-flow.cy.ts` — **CRUD + state + permission + validation** (new)
- `frontend/e2e/nangcap23-pages.spec.ts` — Playwright page-load
- `frontend/e2e/nangcap23-v1-pages.spec.ts` — Playwright v1 page-load

### Docs
- `docs/features/nangcap23/README.md` — file này
- `docs/features/nangcap23/test-guide.md` — QA test checklist

## Hardening Phase (2026-05-17) — sau audit adversarial

| Audit finding | Mức | Fix |
|---|---|---|
| `SaveConfigAsync` no-op | Critical-1 | `INangCap23ConfigStore` + `NangCap23ConfigStore` persist vào `SystemConfigs` table. Sensitive value (ApiKey/AccessToken/Password) encrypt qua `IDataProtectionProvider` (purpose `NangCap23.Config.v1`). Read trả `***` mask cho UI, không leak token. Re-save với `***` không ghi đè token gốc. |
| HttpContent dispose giữa retry | Critical-2 | `PostWithRetryAsync` refactor sang `Func<HttpContent>` factory — mỗi attempt tạo content mới. Thêm `X-Idempotency-Key` header (SubmissionCode/ReportCode/CertNumber) để gateway dedupe khi retry. |
| Duplicate submission | Critical-3 | Service check `AnyAsync(PrescriptionId == ... && Status != 4)` + filtered unique index `UX_NationalPrescriptionSubmissions_PrescriptionId_Active` (migration 44). Pharmacy: index unique trên `(ReportType, PeriodFrom, PeriodTo)` khi `Status=2`. DbUpdateException 2601/2627 → 409 Conflict qua exception filter. |
| State machine không gọi | High-1 | `EnsureCanVerifyDiagnostic` gọi trong `VerifyAsync`; `EnsureValidSterilizationTransition` gọi trong `UpdateScheduleStatusAsync`. |
| DLHC EligibleToDrive bypass | High-2 | Luôn auto-compute theo TT 24/2023, override mọi giá trị client gửi. Log khi override để audit. |
| Sync HTTP block 90s | High-3 | 2-phase save: Phase 1 save row với Status=1 (Submitted) trước, Phase 2 gọi gateway sau. User reload không tạo duplicate (DB index chặn). CancellationToken propagate. `OperationCanceledException` → 499. |
| Không circuit breaker | High-4 | Polly `HandleTransientHttpError().CircuitBreakerAsync(5 errors, 30s break)` cho cả 4 named HttpClient. `BrokenCircuitException` → `ErrorCode=CIRCUIT_OPEN`, treat như NETWORK_ERROR (retry-able). |
| Test assertion lỏng `[200,400,500]` | High-5 | Strict `expect(r.status).to.eq(400)` + verify body shape `{error, message, field}`. 25 test mới trong `nangcap23-flow.cy.ts`, all pass. |
| Role guard chỉ /config | Sec-1 | Per-action: Submit/Retry/Cancel cổng QG → Roles="Admin,Doctor,Pharmacist". Pharmacy Generate → "Admin,Pharmacist,PharmacyHead". Đề án 06 GCS → "Admin,Doctor,Midwife". GBT/DLHC → "Admin,Doctor". FDT Verify → "Admin,Doctor". |
| Exception filter chỉ 3 type | Med-1 | Mở rộng: `DbUpdateException` (UNIQUE 2601/2627) → 409. `JsonException` → 400 INVALID_JSON. `OperationCanceledException` → 499 Client Closed. |
| CancellationToken | Med-2 | `INangCap23Services.SubmitAsync(..., CancellationToken)` overload. Controller propagate `ct` từ `HttpContext.RequestAborted`. Gateway client tôn trọng `ct.ThrowIfCancellationRequested()` đầu mỗi attempt + giữa Task.Delay. |
| SSRF risk | Med-4 | `Nangcap23ConfigValidator.EnsureSafeUrl` — allowlist hostname (`*.donthuocquocgia.vn`, `*.duocquocgia.com.vn`, `*.baohiemxahoi.gov.vn`, `*.zalo.me`, localhost). Block IP literal trừ loopback. DI registration validate URL ngay khi `AddHttpClient` → fail-fast nếu env-var trỏ tới internal IP. |
| Log có thể leak | Sec-3 | `SanitizeForLog` regex mask `access_token|Authorization|api[_-]?key|password|secret` thành `***`. ResponseJson truncate 4000 chars khi lưu DB. |

### Files thêm trong Phase này

| File | Purpose |
|---|---|
| `backend/src/HIS.Application/Services/INangCap23ConfigStore.cs` | Interface persistence layer cho config |
| `backend/src/HIS.Infrastructure/Services/NangCap23ConfigStore.cs` | Impl đọc/ghi SystemConfigs + encrypt sensitive |
| `backend/src/HIS.Application/Services/Nangcap23ConfigValidator.cs` | SSRF allowlist + DTO field validation |
| `backend/src/HIS.Infrastructure/Data/Scripts/44_nangcap23_dedupe_idx.sql` | Filtered unique index + ALTER COLUMN safety |

## Cải tiến so với phiên bản gốc (session 2026-05-15)

| Vấn đề audit | Fix trong session 2026-05-16 |
|---|---|
| 2 TODO marker `L197-198, L1644-1645` | ✅ Xóa, thay bằng `_client.SubmitAsync()` + `_client.SendTemplateMessageAsync()` |
| 13 chỗ `if (mockMode)` inline | ✅ Xóa hoàn toàn, DI bind chọn client tùy `MockMode` flag |
| `appsettings.json` thiếu block | ✅ Thêm `NationalGateway`, `DeAn06`, `Zalo` block đầy đủ |
| MockMode default `true` | ✅ Flip sang `false`; Dev override `true` qua `appsettings.Development.json` |
| Config endpoint không có role guard | ✅ `[Authorize(Roles="Admin")]` cho 4 endpoint `POST/GET /config` |
| State machine không enforce | ✅ `Nangcap23StateMachine` chặn `Submit/Retry/Cancel` sai thứ tự |
| Validation business rule thiếu | ✅ ArgumentException cho phone/period/reportType/CCCD bác sĩ |
| Zalo `RetryCount` không reachable | ✅ Thêm `RetryAsync()` vào `IZaloNotificationService` + endpoint |
| Quality Dashboard silent catch | ✅ `_logger.LogError(ex, ...)` thay vì nuốt exception |
| DLHC `EligibleToDrive` không auto-compute | ✅ Auto-compute theo TT 24/2023 (vision/hearing/neuro/psy + ma túy + BAC<50) |
| HTTP error handling | ✅ Retry 3 lần exponential backoff (1s/2s/4s), catch `HttpRequestException` + `TaskCanceledException` |
| No CRUD/state/validation test | ✅ `nangcap23-flow.cy.ts` — 30+ case |
| QA guide chưa có | ✅ `docs/features/nangcap23/test-guide.md` |

## Còn lại (Nice-to-have, KHÔNG block production)

- **Auto-retry background job** — failed submission status=1 cần BackgroundService poll mỗi 5 phút retry. Hiện retry là manual qua UI/API. Khi BHXH/Cục QLD cấp credential thật, có thể implement sau bằng `IHostedService`.
- **Real sandbox URL** — Tất cả gateway URL trong `appsettings.json` đang trỏ về production domain (`donthuocquocgia.vn`, `duocquocgia.com.vn`, `gdbhyt.baohiemxahoi.gov.vn`, `business.openapi.zalo.me`). Khi BHXH/Cục QLD công bố sandbox URL, override qua env var trên Cloud Run.
