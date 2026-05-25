# NangCap23 — Tóm tắt tài liệu + Module Impact

> **Mục đích:** Index cross-doc + bảng tổng hợp + ranking module có ảnh
> hưởng cao nhất + danh sách file tài liệu đã tạo.
> **Đối tượng:** Tech lead, Release manager, QA lead, PO.
> **Last updated:** 2026-05-24

---

## Mục lục

- [1. Bộ tài liệu NangCap23](#1-bộ-tài-liệu-nangcap23)
- [2. Mapping chức năng ↔ API ↔ Test ↔ File source](#2-mapping-chức-năng--api--test--file-source)
- [3. Module impact ranking](#3-module-impact-ranking)
- [4. Source file đã thay đổi/thêm mới](#4-source-file-đã-thay-đổisthêm-mới)
- [5. Tài liệu đã tạo trong gói nâng cấp này](#5-tài-liệu-đã-tạo-trong-gói-nâng-cấp-này)
- [6. Checklist quick-reference cho QA](#6-checklist-quick-reference-cho-qa)
- [7. Outstanding items](#7-outstanding-items)

---

## 1. Bộ tài liệu NangCap23

Toàn bộ tài liệu nằm dưới `docs/features/nangcap23/` (đúng convention
`docs/features/<feature>/` của project, xem `docs/PROJECT_STRUCTURE.md` §4).

| File | Vai trò | Đối tượng đọc | Đã tồn tại trước session này |
|---|---|---|---|
| [`README.md`](./README.md) | Overview + architecture + hardening table | Tech lead, Dev | ✅ |
| [`test-guide.md`](./test-guide.md) | QA checklist 11 section, 30+ kịch bản | QA team | ✅ |
| [`analysis.md`](./analysis.md) | Phân tích chi tiết source code per-layer | Dev review, Audit | ⭐ Tạo mới |
| [`test-plan.md`](./test-plan.md) | Test plan per-chức-năng + mapping + flow test theo thứ tự | QA lead, QA team, Release | ⭐ Tạo mới |
| [`summary.md`](./summary.md) | (File này) Index + module impact | Tech lead, PO | ⭐ Tạo mới |

---

## 2. Mapping chức năng ↔ API ↔ Test ↔ File source

Bảng tổng hợp đầy đủ. Trong các cột:
- **API**: route prefix `/api/`
- **Test**: `cypress/e2e/` viết tắt `cy:`, `e2e/` viết tắt `pw:`
- **Service / Controller / Entity / DTO**: tên class trong source

| Chức năng | API endpoint | Service | Entity | DTO | Test | Page (FE) |
|---|---|---|---|---|---|---|
| Submit đơn thuốc cổng QG | `POST /national-prescription-gateway/submit` | `NationalPrescriptionGatewayService.SubmitAsync` | `NationalPrescriptionSubmission` | `SubmitNationalPrescriptionDto` → `NationalPrescriptionSubmissionDto` | cy:`nangcap23-flow.cy.ts` §3,§5; pw:`nangcap23-pages.spec.ts` | `pages/NationalGateways.tsx` + `pages-v2/NationalGateways.tsx` |
| Retry đơn thuốc | `POST /national-prescription-gateway/{id}/retry` | `.RetryAsync` | (same) | (same) | cy:§5 | (same) |
| Cancel đơn thuốc | `POST /national-prescription-gateway/{id}/cancel` | `.CancelAsync` | (same) | (same) | Manual | (same) |
| List đơn thuốc | `GET /national-prescription-gateway` | `.SearchAsync` | (same) | (list of) `NationalPrescriptionSubmissionDto` | pw:smoke | (same) |
| Detail đơn thuốc | `GET /national-prescription-gateway/{id}` | `.GetByIdAsync` | (same) | `NationalPrescriptionSubmissionDetailDto` | Manual | (same) |
| Config QG (Get) | `GET /national-prescription-gateway/config` (Admin) | `.GetConfigAsync` | (`SystemConfigs` table qua `NangCap23ConfigStore`) | `NationalGatewayConfigDto` | cy:§1,§4 | (same) |
| Config QG (Save) | `POST /national-prescription-gateway/config` (Admin) | `.SaveConfigAsync` | (same) | (same) | cy:§1,§7 | (same) |
| Test connection QG | `GET /national-prescription-gateway/test-connection` | `.TestConnectionAsync` | — | — | Manual / Staging | (same) |
| Generate báo cáo Dược | `POST /national-pharmacy/generate` (Pharmacist) | `NationalPharmacyGatewayService.GenerateAndSubmitAsync` | `NationalPharmacyOutboundReport` | `GeneratePharmacyReportDto` → `NationalPharmacyOutboundReportDto` | cy:§3 | (same) |
| Retry báo cáo Dược | `POST /national-pharmacy/{id}/retry` | `.RetryAsync` | (same) | (same) | Manual | (same) |
| List báo cáo Dược | `GET /national-pharmacy` | `.SearchAsync` | (same) | (list) | pw:smoke | (same) |
| Detail báo cáo Dược | `GET /national-pharmacy/{id}` | `.GetByIdAsync` | (same) | `NationalPharmacyOutboundReportDetailDto` | Manual | (same) |
| Save GCS | `POST /de-an-06/birth-certificates` | `DeAn06CertificateService.SaveBirthCertificateAsync` | `BirthCertificateRecord` | `SaveBirthCertificateDto` → `BirthCertificateDto` | pw:smoke + cy:smoke | `pages/DeAn06Liaison.tsx` |
| Submit GCS | `POST /de-an-06/birth-certificates/{id}/submit` (Doctor, Midwife) | `.SubmitBirthCertificateToDa06Async` | (same) | (same) | Manual | (same) |
| Search GCS | `GET /de-an-06/birth-certificates` | `.SearchBirthCertificatesAsync` | (same) | (list) | pw:smoke | (same) |
| Save GBT | `POST /de-an-06/death-certificates` | `.SaveDeathCertificateAsync` | `DeathCertificateRecord` | `SaveDeathCertificateDto` → `DeathCertificateDto` | pw:smoke + cy:smoke | (same) |
| Submit GBT | `POST /de-an-06/death-certificates/{id}/submit` (Doctor) | `.SubmitDeathCertificateToDa06Async` | (same) | (same) | Manual | (same) |
| Search GBT | `GET /de-an-06/death-certificates` | `.SearchDeathCertificatesAsync` | (same) | (list) | pw:smoke | (same) |
| Save DLHC + auto-compute | `POST /de-an-06/driving-license-checks` | `.SaveDrivingLicenseCheckAsync` (+ `DrivingLicenseEligibility.Recompute`) | `DrivingLicenseHealthCheck` | `SaveDrivingLicenseHealthCheckDto` → `DrivingLicenseHealthCheckDto` | Manual + cy(TBD) | (same) |
| Submit DLHC (re-compute) | `POST /de-an-06/driving-license-checks/{id}/submit` (Doctor) | `.SubmitDrivingLicenseCheckToDa06Async` (+ Recompute defense-in-depth) | (same) | (same) | Manual | (same) |
| List LinenItem | `GET /linen/items` | `LinenManagementService.ListLinenItemsAsync` | `LinenItem` | `LinenItemDto` | cy:§7 | `pages/LinenManagement.tsx` |
| Save LinenItem | `POST /linen/items` | `.SaveLinenItemAsync` | (same) | (same) | cy:§7 | (same) |
| Delete LinenItem | `DELETE /linen/items/{id}` | `.DeleteLinenItemAsync` | (same) | (same) | Manual | (same) |
| Save LinenTransaction | `POST /linen/transactions` | `.SaveTransactionAsync` | `LinenTransaction` | `SaveLinenTransactionDto` → `LinenTransactionDto` | cy:§7 | (same) |
| Change LinenTx status | `POST /linen/transactions/{id}/status/{newStatus}` | `.UpdateTransactionStatusAsync` (+ `Nangcap23StateMachine.EnsureValidLinenTransition`) | (same) | (same) | cy:§7 | (same) |
| Save SterilizationSchedule | `POST /linen/sterilization-schedules` | `.SaveScheduleAsync` | `SterilizationSchedule` | `SaveSterilizationScheduleDto` → `SterilizationScheduleDto` | pw:smoke | (same) |
| Change Sterilization status | `POST /linen/sterilization-schedules/{id}/status/{newStatus}?cultureResult=` | `.UpdateScheduleStatusAsync` (+ `EnsureValidSterilizationTransition`) | (same) | (same) | Manual | (same) |
| Save FDT | `POST /functional-diagnostics` | `FunctionalDiagnosticsService.SaveAsync` | `FunctionalDiagnosticTest` | `SaveFunctionalDiagnosticTestDto` → `FunctionalDiagnosticTestDto` | cy:smoke | `pages/FunctionalDiagnostics.tsx` |
| Complete FDT | `POST /functional-diagnostics/{id}/complete` | `.CompleteAsync` | (same) | (same) | Manual | (same) |
| Verify FDT | `POST /functional-diagnostics/{id}/verify` (Doctor) | `.VerifyAsync` (+ `EnsureCanVerifyDiagnostic`) | (same) | (same) | Manual | (same) |
| Delete FDT | `DELETE /functional-diagnostics/{id}` | `.DeleteAsync` | (same) | (same) | Manual | (same) |
| List FDT type | `GET /functional-diagnostics/test-types` (anonymous) | (controller hardcoded 8 type) | — | — | pw:smoke | (same) |
| Send Zalo ZNS | `POST /zalo-notification/send` | `ZaloNotificationService.SendAsync` | `ZaloNotificationLog` | `SendZaloMessageDto` → `ZaloNotificationLogDto` | cy:§5,§8 | `pages/ZaloNotifications.tsx` |
| Retry Zalo | `POST /zalo-notification/{id}/retry` | `.RetryAsync` | (same) | (same) | cy:§5,§8 | (same) |
| Config Zalo (Get) | `GET /zalo-notification/config` (Admin) | `.GetConfigAsync` | (SystemConfigs) | `ZaloConfigDto` | cy:§1 | (same) |
| Config Zalo (Save) | `POST /zalo-notification/config` (Admin) | `.SaveConfigAsync` | (same) | (same) | cy:§1,§7 | (same) |
| List Zalo template | `GET /zalo-notification/templates` (anonymous) | (hardcoded 4 template) | — | `ZaloTemplateDto` | pw:smoke | (same) |
| Quality Dash full | `GET /quality-dashboard?asOfDate=` | `QualityDashboardService.GetFullDashboardAsync` | — (aggregate 7 table) | `QualityDashboardDto` | cy:§6 | `pages/QualityDashboardLive.tsx` |
| Clinic queue view | `GET /quality-dashboard/clinic-queues` | `.GetClinicQueuesAsync` | (QueueTickets, Examinations) | `List<ClinicQueueViewDto>` | cy:§6 | (same) |
| Inpatient view | `GET /quality-dashboard/inpatient-by-dept` | `.GetInpatientByDepartmentAsync` | (Admissions, Discharges) | `List<InpatientDepartmentViewDto>` | cy:§6 | (same) |
| Paraclinical view | `GET /quality-dashboard/paraclinical` | `.GetParaclinicalStatusAsync` | (RadiologyRequests, FDT, PathologyRequests) | `ParaclinicalStatusViewDto` | cy:§6 | (same) |
| Lab view | `GET /quality-dashboard/lab` | `.GetLabStatusAsync` | (LabRequestItems, Services) | `LabStatusViewDto` | cy:§6 | (same) |
| Revenue view | `GET /quality-dashboard/revenue` | `.GetDailyRevenueAsync` | (Receipts) | `DailyRevenueViewDto` | cy:§6 | (same) |
| Retry Worker | (background — no endpoint) | `Nangcap23RetryWorker.ExecuteAsync` | (NPS + NPOR) | — | Manual log inspection | — |
| Exception filter mapping | (cross-cut filter qua controller) | `Nangcap23ExceptionFilter.OnException` | — | — | cy:§8 | — |
| SSRF allowlist | (cross-cut validator) | `Nangcap23ConfigValidator.EnsureSafeUrl` | — | — | cy:§2 | — |
| Config encryption | (cross-cut store) | `NangCap23ConfigStore.SaveAsync` (+ `IDataProtector`) | `SystemConfig` | — | cy:§1,§7 | — |
| Race-safe config | (cross-cut store) | `.SaveAsync` (Serializable tx + retry) | (same) | — | cy:§7 | — |

**Tổng:**
- Chức năng: **24**
- Endpoint: **55** (gồm 2 `[AllowAnonymous]`)
- Service interface: **7** + 4 gateway client + 1 config store
- Entity: **10**
- DTO: **~30**
- Test file: **5** (3 cypress + 2 playwright)
- Test case đã code: **86+** (30 flow + 12 + 13 v1 + 12 pw + 13 pw v1 + smoke)
- Page FE: **6 v1 + 6 v2 = 12**

---

## 3. Module impact ranking

Module sắp xếp theo mức độ thay đổi/ảnh hưởng từ cao xuống thấp.

### 3.1 Module mới (high impact — toàn bộ là code mới)

| Rank | Module | Mô tả | Lý do high |
|---|---|---|---|
| 1 | **National Prescription Gateway** | Submit đơn thuốc cổng QG | Có Retry Worker background, 2-phase save, idempotency key, circuit breaker, integration với module Prescription/Patient/Medicine hiện có |
| 2 | **Đề án 06 (GCS/GBT/DLHC)** | 3 loại chứng nhận điện tử | 3 entity riêng + 12 endpoint + auto-compute eligibility (DLHC complex 48 trường + TT 24/2023) |
| 3 | **National Pharmacy Gateway** | Báo cáo Dược QG | XML payload theo CV 2406, DB unique chống regenerate active report |
| 4 | **Zalo OA / ZNS** | Notification qua Zalo | Sensitive token mask 3-state + retry, parallel với SMS module hiện có |
| 5 | **Functional Diagnostics** | 8 loại thăm dò chức năng | CRUD + 4-eyes (Complete → Verify), có thể link `ServiceRequestDetailId` |
| 6 | **Linen Management** | Đồ giặt + Tiệt trùng phòng | 2 state machine (Transaction + Sterilization), standalone |
| 7 | **Quality Dashboard** | 5 view real-time | Read-only aggregate 7 bảng, không write effect |

### 3.2 Module hiện có bị ảnh hưởng (read-only — chỉ bị NangCap23 query)

| Module | Bị ảnh hưởng bởi | Hành động cần thiết |
|---|---|---|
| `Prescription` + `PrescriptionDetail` + `Medicine` | National Prescription Gateway query để build payload | Verify schema không drift. Test create Prescription bình thường không bị block. |
| `Patient` | GCS/GBT/DLHC reference qua FK | Verify lookup Patient bình thường |
| `MedicalRecord` | GCS/GBT optional reference | Verify discharge flow không bị block |
| `Examination` | DLHC optional reference | Verify OPD bình thường |
| `Department` + `Room` | Linen Sterilization reference | Verify CRUD bình thường |
| `QueueTickets`, `Admissions`, `Discharges`, `RadiologyRequests`, `PathologyRequests`, `LabRequestItems`, `Receipts`, `Services` | Quality Dashboard query aggregate | Nếu thay đổi schema → re-test Quality Dashboard |
| `Users` (`UserId`/`CreatedBy`/`UpdatedBy`) | Audit fields trên 10 entity mới | Verify audit log middleware vẫn lưu đúng |

### 3.3 Module cross-cut bị NangCap23 mở rộng

| Cross-cut | Thay đổi | File source |
|---|---|---|
| `SystemConfigs` table | Schema thêm UNIQUE filtered index, persist NangCap23 config + encrypt sensitive | Migration 45, `NangCap23ConfigStore.cs` |
| `IHttpClientFactory` | 4 typed HttpClient mới (Prescription/Pharmacy/DeAn06/Zalo) với Polly Circuit Breaker | `DependencyInjection.cs` |
| `IDataProtectionProvider` | Purpose mới `"NangCap23.Config.v1"` cho encrypt config sensitive | `NangCap23ConfigStore.cs` |
| Exception handling | Local filter `Nangcap23ExceptionFilter` apply 7 controller mới | `Nangcap23ExceptionFilter.cs` |
| Background services | 1 hosted service mới `Nangcap23RetryWorker` | `Nangcap23RetryWorker.cs` |
| Authorization | Role mới gắn vào endpoint: `Midwife` (GCS), `PharmacyHead` (Pharmacy) | Controllers `[Authorize(Roles=...)]` |
| Audit log middleware | Tự log mọi POST/PUT/DELETE NangCap23 endpoint (đã có sẵn từ trước) | `AuditLogMiddleware.cs` (không thay đổi) |

### 3.4 Module KHÔNG bị ảnh hưởng (verified by code reading)

Các module sau **không có dependency với NangCap23** và không cần regression test:

- RIS / PACS / DICOM Viewer
- AI Labeling (Phase 1–4)
- Telemedicine + Jitsi self-host
- HL7 FHIR R4
- Payment Gateway (VnPay/MoMo/ZaloPay — khác Zalo OA)
- Digital Signature / Pkcs11Interop / Central Signing
- BHXH Audit + BhxhGateway (khác National Gateway)
- Reports (financial/operational/clinical/regulatory)
- Master Data, Catalog admin
- EMR + EMR print templates
- Health monitoring
- 2FA Authentication
- Audit log SystemAdmin

---

## 4. Source file đã thay đổi/thêm mới

### 4.1 Backend (16 file)

```
backend/src/HIS.Core/Entities/
  └─ NangCap23Entities.cs                    (NEW, 358 LOC, 10 entity)

backend/src/HIS.Application/DTOs/NangCap23/
  └─ NangCap23DTOs.cs                        (NEW, 574 LOC, ~30 DTO)

backend/src/HIS.Application/Services/
  ├─ INangCap23Services.cs                   (NEW, 118 LOC, 7 interface)
  ├─ INangCap23GatewayClients.cs             (NEW, 46 LOC, 4 client interface)
  ├─ INangCap23ConfigStore.cs                (NEW, 40 LOC, 1 interface)
  ├─ Nangcap23StateMachine.cs                (NEW, 108 LOC, 6 guard helper)
  ├─ Nangcap23ConfigValidator.cs             (NEW, 100 LOC, SSRF + range)
  └─ DrivingLicenseEligibility.cs            (NEW, 63 LOC, auto-compute)

backend/src/HIS.Infrastructure/Services/
  ├─ NangCap23Services.cs                    (NEW, 2351 LOC, 7 impl)
  └─ NangCap23ConfigStore.cs                 (NEW, 246 LOC, DP encrypt + tx)

backend/src/HIS.Infrastructure/Services/External/
  └─ NangCap23HttpClients.cs                 (NEW, 427 LOC, 4 HTTP + 4 mock)

backend/src/HIS.Infrastructure/Services/Workers/
  └─ Nangcap23RetryWorker.cs                 (NEW, 206 LOC, BackgroundService)

backend/src/HIS.Infrastructure/Data/Scripts/
  ├─ 43_nangcap23_gateways.sql               (NEW, 379 LOC, 10 table + 17 index)
  ├─ 44_nangcap23_dedupe_idx.sql             (NEW, 54 LOC, UNIQUE filtered)
  └─ 45_systemconfig_unique.sql              (NEW, 47 LOC, ConfigKey UNIQUE)

backend/src/HIS.API/Controllers/
  └─ NangCap23Controllers.cs                 (NEW, 484 LOC, 7 controller)

backend/src/HIS.API/Filters/
  └─ Nangcap23ExceptionFilter.cs             (NEW, 90 LOC, 6 exception map)

backend/src/HIS.Infrastructure/
  └─ DependencyInjection.cs                  (MODIFIED, +~60 LOC NangCap23 section)

backend/src/HIS.API/
  ├─ appsettings.json                        (MODIFIED, +4 section NangCap/DeAn06/Zalo/RetryWorker)
  └─ appsettings.Development.json            (MODIFIED, +Mock override note)
```

### 4.2 Frontend (15 file)

```
frontend/src/api/
  └─ nangcap23.ts                            (NEW, 809 LOC, 7 API client object)

frontend/src/pages/                          (v1 — MainLayout/Antd)
  ├─ NationalGateways.tsx                    (NEW, 318 LOC)
  ├─ DeAn06Liaison.tsx                       (NEW)
  ├─ LinenManagement.tsx                     (NEW)
  ├─ FunctionalDiagnostics.tsx               (NEW)
  ├─ ZaloNotifications.tsx                   (NEW)
  └─ QualityDashboardLive.tsx                (NEW)

frontend/src/pages-v2/                       (v2 — TerminalLayout/ab-*)
  ├─ NationalGateways.tsx                    (NEW, 326 LOC)
  ├─ DeAn06Liaison.tsx                       (NEW)
  ├─ LinenManagement.tsx                     (NEW)
  ├─ FunctionalDiagnostics.tsx               (NEW)
  ├─ ZaloNotifications.tsx                   (NEW)
  └─ QualityDashboardLive.tsx                (NEW)

frontend/src/
  ├─ App.tsx                                 (MODIFIED, +12 lazy import + 12 route)
  └─ layouts/
      ├─ MainLayout.tsx                      (MODIFIED, +6 menu item v1)
      └─ terminal/TerminalLayout.tsx         (MODIFIED, +6 menu item v2)
```

### 4.3 Test (5 file)

```
frontend/cypress/e2e/
  ├─ nangcap23-flow.cy.ts                    (NEW, 463 LOC, 30+ case)
  ├─ nangcap23-pages.cy.ts                   (NEW, 135 LOC, 13 case page-load v2)
  └─ nangcap23-v1-pages.cy.ts                (NEW, 155 LOC, 14 case page-load v1)

frontend/e2e/
  ├─ nangcap23-pages.spec.ts                 (NEW, 141 LOC, 12 case Playwright v2)
  └─ nangcap23-v1-pages.spec.ts              (NEW, 155 LOC, 13 case Playwright v1)
```

### 4.4 Tổng kết

- **36 file** thay đổi/thêm mới
- **~7000 LOC** thêm mới
- **0 TODO/FIXME** trong toàn bộ source
- **Zero breaking change** trên module hiện có

---

## 5. Tài liệu đã tạo trong gói nâng cấp này

Theo yêu cầu user (session 2026-05-24), tạo **3 file mới** trong
`docs/features/nangcap23/` (đúng convention `docs/features/<feature>/`,
không tạo folder mới):

| File | Vị trí | LOC | Vai trò |
|---|---|---|---|
| `analysis.md` | `docs/features/nangcap23/analysis.md` | ~620 | Phân tích source code chi tiết per-layer: entity, DTO, service, controller, validation, state machine, exception filter, gateway client, config store, background job, cấu hình env. Bảng TODO/FIXME/feature flag. |
| `test-plan.md` | `docs/features/nangcap23/test-plan.md` | ~640 | Test plan per-chức-năng với 86+ test case mapped tới API + entity + expected. Flow test smoke/regression/integration/E2E theo thứ tự thực tế. Checklist release. Dữ liệu test cần chuẩn bị. |
| `summary.md` | `docs/features/nangcap23/summary.md` | (file này) | Index cross-doc + mapping tổng hợp + module impact ranking + danh sách file source + outstanding items. |

**Không tạo thư mục mới.** Convention `docs/features/<feature>/` đã chuẩn từ
trước (xem `docs/PROJECT_STRUCTURE.md` §4 "Quy tắc thêm file mới").

**Không trùng lặp** với `README.md` (overview architecture) hay
`test-guide.md` (QA checklist 11 section — focus vào UI/manual). Các file
mới bổ sung góc nhìn:
- `analysis.md`: dev/audit-focused, đi sâu vào source structure
- `test-plan.md`: QA-focused, mapping bảng chi tiết per-case
- `summary.md`: tech-lead/PO-focused, cao hơn 1 cấp (cross-doc index)

---

## 6. Checklist quick-reference cho QA

### 6.1 Lúc bắt đầu sprint test

- [ ] Đọc [README.md](./README.md) (15 phút) — nắm overview + 9 gap
- [ ] Đọc [test-guide.md](./test-guide.md) (20 phút) — nắm 11 section kịch bản UI
- [ ] Đọc [test-plan.md](./test-plan.md) §1+§3 (15 phút) — nắm mapping + thứ tự test
- [ ] Setup user role test (Doctor, Midwife, Pharmacist, PharmacyHead, Nurse) — seed DB

### 6.2 Mỗi ngày sprint

- [ ] Chạy smoke test 5 phút trước khi test feature mới
- [ ] Test 1–2 module/ngày theo [test-plan.md](./test-plan.md) §2

### 6.3 Trước release

- [ ] Hoàn tất [test-plan.md](./test-plan.md) §4 "Checklist trước release" (4.1–4.8)
- [ ] Verify [analysis.md](./analysis.md) §17 "TODO/FIXME/Nguy cơ" không có item mới
- [ ] Run integration test với Staging gateway (nếu có credential thật)

---

## 7. Outstanding items

### 7.1 Block release (NONE)

Không có blocker — gói NangCap23 đã hoàn thiện đầy đủ cho production deploy.

### 7.2 Nice-to-have (không block, có thể làm sau)

(Xem chi tiết [analysis.md](./analysis.md) §16.2)

| Item | Ưu tiên | Effort | Lý do hoãn |
|---|---|---|---|
| Wire AutoSubmit Prescription sau khi save | Medium | ~1 ngày | Chờ workflow Prescription team confirm UX |
| Auto-create BCR/DCR/DLHC từ OB/Inpatient/Examination workflow | Medium | ~2-3 ngày | Cần thiết kế UX trigger điểm |
| UI cho Retry Background Worker stats | Low | ~1 ngày | Hiện monitor qua log đủ |
| Mobile app cho gửi GCS/GBT/DLHC | Low | Out of scope | HSMT mobile riêng |
| Nâng UX hiển thị `Da06ErrorMessage` chi tiết | Low | ~0.5 ngày | Chờ feedback từ real gateway |

### 7.3 Phụ thuộc ngoài

| Item | Ai cấp | Hành động |
|---|---|---|
| Credential `donthuocquocgia.vn` (X-API-Key) | Cục QLD | Liên hệ Cục QLD để đăng ký |
| Credential `duocquocgia.com.vn` | Cục QLD | Tương tự |
| Token Đề án 06 `gdbhyt.baohiemxahoi.gov.vn` | BHXH Việt Nam | Đăng ký Đề án 06 |
| Zalo OA `access_token` + `oa_id` | Zalo Cloud | Tạo Official Account + verify |
| Sandbox URL (nếu có) | (tất cả gateway) | Hỏi đối tác |

Khi cấp xong → set env-var trên Cloud Run + flip `MockMode=false` → ready production.

### 7.4 Nguy cơ tiềm ẩn (đã document)

Xem [analysis.md](./analysis.md) §17.3:
- Phase 2 SaveChanges fail sau gateway ACK → có log alert + cần manual reconcile
- 2 instance worker pick cùng row → idempotency key (cổng phải support)
- Self-signed cert demo (không phải NangCap23 — AI module)

---

## Liên kết external

- **HSMT root:** [`../../requirements.md`](../../requirements.md)
- **NangCap roadmap:** [`../../roadmap/nangcap-phan-tich.md`](../../roadmap/nangcap-phan-tich.md)
- **Project structure:** [`../../PROJECT_STRUCTURE.md`](../../PROJECT_STRUCTURE.md) — convention `docs/features/<feature>/`
- **Module map:** [`../../MODULE_MAP.md`](../../MODULE_MAP.md)
- **Architecture:** [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md)
- **API flow:** [`../../API_FLOW.md`](../../API_FLOW.md)

## Commit / Release reference

- `8b2f777` — feat(nangcap23): HSMT BV Đa khoa — close 9 gap (BE + FE + tests)
- `b9097cb` — feat(nangcap23-v1): wire 6 pages vào MainLayout (Antd)
- `d01fed7` — feat(nangcap23-v2): redesign 6 v2 pages theo handoff bundle
- `e3935e1` — chore(gitignore): ignore PDF extract + design bundle v2
- (Phase 2–3 hardening commit) — Real HTTP client, ConfigStore, SSRF, exception filter, retry worker, 2-phase save, idempotency key

Tag/release version: **không xác định được từ source code** (repo chưa có git tag chính thức cho NangCap23 — diff `8b2f777..e3935e1` chính là toàn bộ phạm vi gói).
