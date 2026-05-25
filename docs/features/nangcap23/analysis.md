# NangCap23 — Phân tích Source Code

> **Mục đích:** Tài liệu phân tích chi tiết thay đổi do gói nâng cấp 23 (HSMT BV
> Đa khoa, 9 gap còn thiếu trong 39 phân hệ).
> **Phạm vi:** Toàn bộ commit `8b2f777` → `e3935e1` (5 commit chức năng).
> **Nguồn dữ liệu:** Đọc trực tiếp source code BE + FE + SQL + cấu hình + test.
> **Tài liệu liên quan:** [README.md](./README.md), [test-guide.md](./test-guide.md),
> [test-plan.md](./test-plan.md), [summary.md](./summary.md).
> **Last updated:** 2026-05-24

---

## Mục lục

- [1. Phạm vi nâng cấp](#1-phạm-vi-nâng-cấp)
- [2. Thay đổi theo lớp kiến trúc](#2-thay-đổi-theo-lớp-kiến-trúc)
- [3. Entity / Schema thay đổi](#3-entity--schema-thay-đổi)
- [4. DTO / Request / Response](#4-dto--request--response)
- [5. Service Interface + Implementation](#5-service-interface--implementation)
- [6. Controller / API](#6-controller--api)
- [7. Business Logic mới](#7-business-logic-mới)
- [8. Validation Rule mới](#8-validation-rule-mới)
- [9. Background Job](#9-background-job)
- [10. Exception Filter](#10-exception-filter)
- [11. External Gateway Client](#11-external-gateway-client)
- [12. Config Store + Sensitive Encryption](#12-config-store--sensitive-encryption)
- [13. Cấu hình môi trường](#13-cấu-hình-môi-trường)
- [14. Flow ảnh hưởng tới module khác](#14-flow-ảnh-hưởng-tới-module-khác)
- [15. Frontend — Route + UI](#15-frontend--route--ui)
- [16. Chức năng đã triển khai vs chưa](#16-chức-năng-đã-triển-khai-vs-chưa)
- [17. TODO / FIXME / Feature flag / Nguy cơ](#17-todo--fixme--feature-flag--nguy-cơ)
- [18. Tham chiếu commit](#18-tham-chiếu-commit)

---

## 1. Phạm vi nâng cấp

NangCap23 đóng **9 gap nghiệp vụ** còn thiếu so với HSMT Bệnh viện Đa khoa
(39 phân hệ). 30/39 phân hệ đã có sẵn trong codebase trước đó.

| # | Phân hệ HSMT | Mục HSMT | Hình thức xử lý |
|---|---|---|---|
| 1 | Cổng Đơn thuốc Quốc Gia (donthuocquocgia.vn) | #12 | Submit qua mạng (real HTTP) |
| 2 | Cổng Dược Quốc Gia (duocquocgia.com.vn) | #12 | Submit qua mạng (real HTTP) |
| 3 | Giấy chứng sinh điện tử — Đề án 06 | #32 | Submit qua mạng (real HTTP) |
| 4 | Giấy báo tử điện tử — Đề án 06 | #32 | Submit qua mạng (real HTTP) |
| 5 | Giấy KSK lái xe điện tử — TT 24/2023 + Đề án 06 | #32 | Submit qua mạng + auto-compute |
| 6 | Đồ giặt vải + lịch tiệt trùng phòng (KSNK) | #21 | Local DB only |
| 7 | Thăm dò chức năng 8 loại | #18 | Local DB only |
| 8 | Quality Dashboard 5 view | #39 | Read-only aggregate |
| 9 | Zalo OA / ZNS notification | #14 | Submit qua mạng (real HTTP) |

Hệ thống có 2 mode đồng tồn tại:
- **MockMode** (Dev): bind `InMemory*` client trả `MOCK-*` transactionId
- **Production**: bind `Http*` client gọi gateway thật qua `IHttpClientFactory`
  với Polly Circuit Breaker

---

## 2. Thay đổi theo lớp kiến trúc

Tất cả thay đổi tôn trọng Clean Architecture của HIS:

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation (HIS.API)                                      │
│  ├─ Controllers/NangCap23Controllers.cs        (7 controller)│
│  └─ Filters/Nangcap23ExceptionFilter.cs        (8 case map)  │
└─────────────────────────────────────────────────────────────┘
            ▼
┌─────────────────────────────────────────────────────────────┐
│ Application (HIS.Application)                               │
│  ├─ DTOs/NangCap23/NangCap23DTOs.cs            (~30 DTO)     │
│  ├─ Services/INangCap23Services.cs             (7 interface) │
│  ├─ Services/INangCap23GatewayClients.cs       (4 client)    │
│  ├─ Services/INangCap23ConfigStore.cs          (1 interface) │
│  ├─ Services/Nangcap23StateMachine.cs          (6 guard)     │
│  ├─ Services/Nangcap23ConfigValidator.cs       (SSRF + range)│
│  └─ Services/DrivingLicenseEligibility.cs      (auto-compute)│
└─────────────────────────────────────────────────────────────┘
            ▼
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure (HIS.Infrastructure)                         │
│  ├─ Services/NangCap23Services.cs              (7 impl, 2351 LOC)│
│  ├─ Services/NangCap23ConfigStore.cs           (DP-encrypt + tx)│
│  ├─ Services/External/NangCap23HttpClients.cs  (4 HTTP + 4 mock)│
│  ├─ Services/Workers/Nangcap23RetryWorker.cs   (BackgroundService)│
│  ├─ Data/Scripts/43_nangcap23_gateways.sql     (10 tables)   │
│  ├─ Data/Scripts/44_nangcap23_dedupe_idx.sql   (UNIQUE filter)│
│  └─ Data/Scripts/45_systemconfig_unique.sql    (ConfigKey UQ) │
└─────────────────────────────────────────────────────────────┘
            ▼
┌─────────────────────────────────────────────────────────────┐
│ Core (HIS.Core)                                             │
│  └─ Entities/NangCap23Entities.cs              (10 entity)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Entity / Schema thay đổi

### 3.1 Entity mới (10) — file `backend/src/HIS.Core/Entities/NangCap23Entities.cs`

| Entity | Bảng SQL | Mục đích |
|---|---|---|
| `NationalPrescriptionSubmission` | `NationalPrescriptionSubmissions` | Submission đơn thuốc lên Cổng Đơn thuốc QG |
| `NationalPharmacyOutboundReport` | `NationalPharmacyOutboundReports` | Báo cáo nhà thuốc lên Cổng Dược QG |
| `BirthCertificateRecord` | `BirthCertificateRecords` | Giấy chứng sinh điện tử (GCS) |
| `DeathCertificateRecord` | `DeathCertificateRecords` | Giấy báo tử điện tử (GBT) |
| `DrivingLicenseHealthCheck` | `DrivingLicenseHealthChecks` | Giấy KSK lái xe (DLHC) — 48 trường y khoa |
| `LinenItem` | `LinenItems` | Danh mục đồ vải / đồ giặt |
| `LinenTransaction` | `LinenTransactions` | Giao dịch giao/nhận đồ vải |
| `SterilizationSchedule` | `SterilizationSchedules` | Lịch giám sát vệ sinh / tiệt trùng phòng |
| `FunctionalDiagnosticTest` | `FunctionalDiagnosticTests` | Kết quả thăm dò chức năng (8 loại) |
| `ZaloNotificationLog` | `ZaloNotificationLogs` | Log gửi Zalo ZNS qua OA |

Tất cả entity kế thừa `BaseEntity` (Id, CreatedAt, CreatedBy, UpdatedAt,
UpdatedBy, IsDeleted) — chuẩn audit log của hệ thống.

### 3.2 Trạng thái chung (Status 0..4)

7/10 entity có cột `Status` (hoặc `Da06Status`) theo thang chung:

```
0 = Draft / NotSubmitted
1 = Submitted
2 = Acknowledged
3 = Rejected
4 = Cancelled
```

Các entity khác:
- `SterilizationSchedule.Status`: 0=Scheduled, 1=InProgress, 2=Completed,
  3=Failed, 4=Cancelled
- `LinenTransaction.Status`: 0=Draft, 1=Dispatched, 2=Received,
  3=Reconciled, 4=Cancelled
- `FunctionalDiagnosticTest.Status`: 0=Requested, 1=InProgress,
  2=Completed, 3=Verified, 4=Cancelled
- `ZaloNotificationLog.Status`: 0=Pending, 1=Sent, 2=Delivered, 3=Failed

### 3.3 Migration script

| Script | Mô tả |
|---|---|
| `43_nangcap23_gateways.sql` | Tạo 10 table mới, idempotent `IF NOT EXISTS`, 17 index |
| `44_nangcap23_dedupe_idx.sql` | UNIQUE filtered `UX_NationalPrescriptionSubmissions_PrescriptionId_Active` (Status != 4 AND IsDeleted=0); UNIQUE `UX_NationalPharmacyReports_TypeP_Active` (Status=2). Có ALTER COLUMN safety cho `SubmissionCode` từ NVARCHAR(MAX) → NVARCHAR(60). Thêm `IX_NationalPrescriptionSubmissions_Pending` hỗ trợ background retry. |
| `45_systemconfig_unique.sql` | ALTER `SystemConfigs.ConfigKey` MAX → NVARCHAR(200), dedupe row cũ, tạo `UX_SystemConfigs_ConfigKey_Active` filtered unique. |

Tất cả script auto-apply qua `ProductionSchemaRepairRunner` lúc cold start.

### 3.4 Bảng liên thông

3 entity Đề án 06 (Birth/Death/DLHC) có cluster column liên thông gateway
chung: `Da06SubmissionId`, `Da06ResponseCode`, `Da06SubmittedAt`,
`Da06AcknowledgedAt`, `Da06Status`, `Da06ErrorMessage`.

### 3.5 Quan hệ navigation

Lazy-loaded `virtual` navigation:
- `NationalPrescriptionSubmission.Prescription` → `Prescription`
- `BirthCertificateRecord.Mother` → `Patient`, `.MedicalRecord` → `MedicalRecord`
- `DeathCertificateRecord.Patient` → `Patient`, `.MedicalRecord` → `MedicalRecord`
- `DrivingLicenseHealthCheck.Patient` → `Patient`, `.Examination` → `Examination`
- `LinenTransaction.FromDepartment/ToDepartment` → `Department`
- `SterilizationSchedule.Department/Room` → `Department/Room`
- `FunctionalDiagnosticTest.Patient/MedicalRecord/Examination`

---

## 4. DTO / Request / Response

File `backend/src/HIS.Application/DTOs/NangCap23/NangCap23DTOs.cs` chứa ~30 DTO
gồm 3 nhóm:
- **Read DTO** (`*Dto`): trả về cho client, thường có `StatusName` enrich
- **Detail DTO** (`*DetailDto` kế thừa `*Dto`): bổ sung `PayloadJson`/`ResponseJson`
- **Write DTO** (`Save*Dto`, `Submit*Dto`, `Generate*Dto`, `Send*Dto`): body POST

### 4.1 ZaloConfigDto — semantic 3-state cho AccessToken

File DTO này có **semantic đặc biệt** tài liệu hóa trực tiếp trong XML doc:

```csharp
/// <summary>
/// Zalo OA access token. Semantic 3 trạng thái khi POST /config:
///   - null   → giữ nguyên token cũ (no-op)
///   - "***"  → giữ nguyên (UI gửi lại mask khi không sửa)
///   - ""     → CLEAR token hoàn toàn (vô hiệu hóa Zalo OA)
///   - khác   → cập nhật token mới (encrypted server-side)
/// GET trả "***" nếu đã có token, "" nếu chưa cấu hình.
/// </summary>
public string? AccessToken { get; set; }
```

Đảm bảo UI không vô tình ghi đè token khi user chỉ sửa field khác.

### 4.2 QualityDashboardDto — 5 view nested

```
QualityDashboardDto
  ├─ ClinicQueues[]            : List<ClinicQueueViewDto>
  ├─ InpatientByDepartment[]   : List<InpatientDepartmentViewDto>
  ├─ Paraclinical              : ParaclinicalStatusViewDto { Items[] }
  ├─ Lab                       : LabStatusViewDto { Categories[] }
  └─ Revenue                   : DailyRevenueViewDto { ByCashier[] }
```

`DailyRevenueViewDto.GrandTotal` và `CashierRevenueDto.Total` là **computed
property** (`=>` getter), không lưu DB.

---

## 5. Service Interface + Implementation

### 5.1 7 Service Interface (file `INangCap23Services.cs`)

| Interface | Method count | Public surface |
|---|---|---|
| `INationalPrescriptionGatewayService` | 9 | Search, GetById, Submit (2 overload với/không CT), Retry, Cancel, GetConfig, SaveConfig, TestConnection |
| `INationalPharmacyGatewayService` | 5 | Search, GetById, GenerateAndSubmit, Retry, TestConnection |
| `IDeAn06CertificateService` | 12 | Birth/Death/DLHC × {Search, GetById, Save, Submit} |
| `ILinenManagementService` | 12 | LinenItem × {List, Get, Save, Delete} + LinenTransaction × {Search, Get, Save, UpdateStatus} + SterilizationSchedule × {Search, Get, Save, UpdateStatus} |
| `IFunctionalDiagnosticsService` | 6 | Search, GetById, Save, Complete, Verify, Delete |
| `IZaloNotificationService` | 7 | SearchLogs, GetLog, Send, Retry, GetConfig, SaveConfig, TestConnection |
| `IQualityDashboardService` | 6 | GetFullDashboard, GetClinicQueues, GetInpatientByDepartment, GetParaclinicalStatus, GetLabStatus, GetDailyRevenue |

### 5.2 4 Gateway Client Interface (file `INangCap23GatewayClients.cs`)

Tách riêng để service layer unit-test được mà không cần spin up HttpClient:

| Interface | Implementation prod | Implementation dev |
|---|---|---|
| `INationalPrescriptionGatewayClient` | `HttpNationalPrescriptionGatewayClient` | `InMemoryNationalPrescriptionGatewayClient` |
| `INationalPharmacyGatewayClient` | `HttpNationalPharmacyGatewayClient` | `InMemoryNationalPharmacyGatewayClient` |
| `IDeAn06GatewayClient` | `HttpDeAn06GatewayClient` (3 endpoint: GCS/GBT/DLHC) | `InMemoryDeAn06GatewayClient` |
| `IZaloOaClient` | `HttpZaloOaClient` | `InMemoryZaloOaClient` |

Tất cả trả `GatewaySubmissionResult` chung `{ Acknowledged, TransactionId, ErrorCode, ErrorMessage, RawResponse }`.

### 5.3 Implementation chính (`NangCap23Services.cs`, 2351 LOC)

7 class impl tương ứng 7 interface. **Pattern 2-phase save** áp dụng cho mọi
submission (Prescription, Pharmacy report, GCS, GBT, DLHC, Zalo):

```
PHASE 1: Save row Status=1 trước khi gọi gateway
         → DB unique index chặn duplicate khi user reload
PHASE 2: Gọi gateway, parse response
         → Acknowledged: Status=2, set TransactionId
         → 4xx Rejected: Status=3
         → 5xx/Network/Timeout/Circuit-open: giữ Status=1 cho retry worker
```

Khi cancel giữa Phase 1–2 → row vẫn còn Status=1 → background worker pick up.

Khi Phase 1 thành công + gateway ack + Phase 2 SaveChanges fail (DB outage)
→ log **CRITICAL** với `[NANGCAP23-ALERT]` prefix để admin manual reconcile.

---

## 6. Controller / API

7 controller trong `NangCap23Controllers.cs`, tất cả có:
- `[ApiController]` + `[Authorize]` (mặc định)
- `[TypeFilter(typeof(Nangcap23ExceptionFilter))]` — local filter (không global)
- `UserId()` helper đọc từ `ClaimTypes.NameIdentifier`

### 6.1 Bảng tổng hợp endpoint (55 endpoint)

| Controller | Route | Method | Endpoint count | Role-guard ngoài Authorize |
|---|---|---|---|---|
| `NationalPrescriptionGatewayController` | `/api/national-prescription-gateway` | 8 | Submit/Retry/Cancel = Admin,Doctor,Pharmacist; Config = Admin |
| `NationalPharmacyController` | `/api/national-pharmacy` | 5 | Generate/Retry = Admin,Pharmacist,PharmacyHead |
| `DeAn06Controller` | `/api/de-an-06` | 12 | Submit Birth = Admin,Doctor,Midwife; Submit Death/DLHC = Admin,Doctor |
| `LinenManagementController` | `/api/linen` | 12 | (chỉ Authorize default) |
| `FunctionalDiagnosticsController` | `/api/functional-diagnostics` | 7 | Verify = Admin,Doctor |
| `ZaloNotificationController` | `/api/zalo-notification` | 8 | Config = Admin |
| `QualityDashboardController` | `/api/quality-dashboard` | 6 | (chỉ Authorize default) |

Tổng: **55 endpoint** (không tính `test-types` và `templates` `[AllowAnonymous]`).

### 6.2 Endpoint `[AllowAnonymous]`

- `GET /api/functional-diagnostics/test-types` — trả 8 loại test cứng (không cần auth, dùng cho dropdown)
- `GET /api/zalo-notification/templates` — trả 4 template cứng (`appointment_reminder`, `lab_result_ready`, `prescription_dispense`, `medicine_reminder`)

### 6.3 Route conflict tránh được

Route `/api/national-prescription-gateway/*` cố ý tách khỏi
`NationalPrescriptionController` cũ (đăng ký `/api/national-prescription` —
legacy, quản lý cục bộ). Đây là intentional choice — không phải bug.

---

## 7. Business Logic mới

### 7.1 Auto-compute `EligibleToDrive` theo TT 24/2023 (file `DrivingLicenseEligibility.cs`)

**Quy tắc nghiêm ngặt:**
- Server **không bao giờ tin** giá trị `EligibleToDrive` client gửi (BS có thể nhấn nhầm)
- Recompute áp dụng tại **CẢ Save và Submit** (defense-in-depth)
- Hạng thương mại (B1+, C, D, E, F): **bắt buộc** test ma túy + cồn mới đủ điều kiện. Chưa test → default-deny (KHÔNG default to pass).
- Hạng cá nhân (A1, A2, A3): permissive theo TT 24/2023

Công thức:
```
EligibleToDrive = basicHealthOk AND drugOk AND alcoholOk

basicHealthOk = ColorBlindNormal AND HearingNormal AND NeurologicalNormal AND PsychiatricNormal
drugOk(commercial) = DrugTestPerformed AND NOT DrugTestPositive
drugOk(personal)   = NOT DrugTestPerformed OR NOT DrugTestPositive
alcoholOk = AlcoholLevelMgPercent < 50 (TT 24/2023 + Luật GTĐB)
```

Khi server recompute thay đổi giá trị, log INFO với cert/class/prev/computed.

### 7.2 State Machine guard (file `Nangcap23StateMachine.cs`)

6 helper static throw `InvalidOperationException` (controller filter trả 400):

| Helper | Áp dụng cho | Status hợp lệ |
|---|---|---|
| `EnsureCanSubmit` | Submit Prescription/Pharmacy/Birth/Death/DLHC | 0 (Draft) hoặc 3 (Rejected) |
| `EnsureCanRetry` | Retry submission | 1 (Submitted) hoặc 3 (Rejected), `RetryCount < maxRetries` |
| `EnsureCanCancel` | Cancel submission | KHÔNG cho 2 (Acked) hoặc 4 (Cancelled) |
| `EnsureCanVerifyDiagnostic` | Verify Functional Diagnostic Test | Phải 2 (Completed) |
| `EnsureValidSterilizationTransition` | Update Sterilization status | 0→1, 1→2, 1→3 Failed, 0→4, 1→4 |
| `EnsureValidLinenTransition` | Update Linen Transaction status | 0→1, 1→2, 2→3, 0→4, 1→4, 2→4. Idempotent if from==to |

### 7.3 2-Phase Save + Idempotency Key

`PostWithRetryAsync` trong `GatewayHttpHelper`:
- `contentFactory` factory pattern → mỗi attempt tạo `HttpContent` mới (fix bug HttpClient.PostAsync dispose Content sau attempt 1)
- `X-Idempotency-Key` header derive từ `SubmissionCode`/`ReportCode`/`CertificateNumber` cho gateway dedupe khi retry
- Exponential backoff 1s/2s/4s giữa attempt
- 4xx → KHÔNG retry, trả `ErrorCode="HTTP_4xx"`
- 5xx → retry tới `maxAttempts` lần
- `BrokenCircuitException` → fast-fail trả `ErrorCode="CIRCUIT_OPEN"`
- `OperationCanceledException` + `ct.IsCancellationRequested` → bubble up

### 7.4 Service-level duplicate prevention

Trước khi insert Phase 1, service query:
```csharp
existing = NationalPrescriptionSubmissions
  .Where(x => x.PrescriptionId == dto.PrescriptionId && x.Status != 4)
  .FirstOrDefaultAsync();
if (existing != null) throw InvalidOperationException(...);
```

Combo với DB unique filtered index `UX_NationalPrescriptionSubmissions_PrescriptionId_Active`:
- App-level check chặn 99% trường hợp
- DB-level chặn race condition 2-process concurrent (bắt `DbUpdateException` UNIQUE 2601/2627 → 409 Conflict qua exception filter)

---

## 8. Validation Rule mới

### 8.1 DTO validation (throw `ArgumentException` → 400 VALIDATION_FAILED)

| Endpoint | Field | Rule |
|---|---|---|
| `POST /national-prescription-gateway/submit` | `PrescriptionId` | Không `Guid.Empty` |
| | `DoctorIdNumber` | Không rỗng |
| | `DoctorLicenseNumber` | Không rỗng |
| | `PrescriptionType` | ∈ {Outpatient, Narcotic, Psychotropic, Precursor} |
| `POST /national-pharmacy/generate` | `ReportType` | ∈ {DailySale, MonthlyInventory, NarcoticReport, Recall} |
| | `PeriodFrom <= PeriodTo` | Đúng |
| | `PeriodTo` | ≤ hôm nay (cộng 1 ngày tolerance) |
| `POST /zalo-notification/send` | `targetPhone` | Length 9–12 ký tự số (regex digit) |
| | `templateId` | Không rỗng |

### 8.2 Config validator (file `Nangcap23ConfigValidator.cs`)

`ValidateNationalGateway`:
- `EnsureSafeUrl` cho `NationalPrescriptionBaseUrl` + `NationalPharmacyBaseUrl`
- `RetryCount` ∈ 1..10
- `TimeoutSeconds` ∈ 1..120
- `FacilityCode` length 1..50

`ValidateZalo`:
- `EnsureSafeUrl` cho `BaseUrl`
- `OaId` ≤ 50 ký tự
- `AccessToken` ≤ 1000 ký tự (bỏ qua nếu là `"***"` mask)

`EnsureSafeUrl` — chống SSRF:
- Scheme phải `http`/`https`
- Hostname phải khớp allowlist suffix: `donthuocquocgia.vn`, `duocquocgia.com.vn`,
  `baohiemxahoi.gov.vn`, `zalo.me`, plus sandbox subdomain
- IP literal bị reject (chống trỏ trực tiếp tới AWS metadata `169.254.169.254`)
- `localhost` / `127.0.0.1` / `::1` chỉ cho phép khi
  `ASPNETCORE_ENVIRONMENT=Development`

Validator được gọi 2 chỗ:
- `DependencyInjection.cs` lúc startup → fail-fast nếu env-var trỏ tới URL không an toàn
- Service `SaveConfigAsync` → block admin set URL không an toàn qua UI

### 8.3 Type validation trong ConfigStore

Key có suffix `.RetryCount`, `.TimeoutSeconds`, `.CircuitBreakerThreshold`,
`.CircuitBreakerDurationSeconds` phải parse được thành `int`.

### 8.4 Range/Constraint mặc định DTO

- `DrivingLicenseHealthCheck.LicenseClass` default `"B1"` (hạng thương mại — strict)
- `ChildGender` default `"Unknown"` (Male/Female/Unknown)
- `BirthLocation` default `"Hospital"` (Hospital/Home/OnWay/Other)
- `BirthMethod` default `"Vaginal"` (Vaginal/Cesarean/Assisted)
- `MannerOfDeath` default `"Natural"` (Natural/Accident/Suicide/Homicide/Undetermined)
- `Category` (LinenItem) default `"Bedding"` (Bedding/Clothing/Towel/Drape/Surgical/OperatingRoom/Other)
- `AreaType` (SterilizationSchedule) default `"OperatingRoom"` (OperatingRoom/ICU/Ward/Pharmacy/Other)
- `SterilizationMethod` default `"ChemicalDisinfection"` (ChemicalDisinfection/UV/Fumigation/Autoclave)

---

## 9. Background Job

File `backend/src/HIS.Infrastructure/Services/Workers/Nangcap23RetryWorker.cs`
— `BackgroundService` đăng ký qua `AddHostedService`.

### 9.1 Cấu hình (`appsettings.json` section `NangCap23:RetryWorker`)

```json
{
  "Enabled": true,           // BẬT mặc định trên prod
  "IntervalSeconds": 60,     // Quét mỗi 60s
  "StuckMinutes": 5,         // Coi là stuck nếu UpdatedAt > 5 phút trước
  "MaxBatchSize": 20         // Tối đa 20 row/batch để không gây spike
}
```

### 9.2 Logic worker

Mỗi tick:
1. `ProcessStuckPrescriptionsAsync` quét `NationalPrescriptionSubmissions`
   WHERE `Status=1` AND `RetryCount < maxRetries` AND `UpdatedAt < UTC - StuckMinutes`
2. `ProcessStuckPharmacyReportsAsync` cùng logic cho `NationalPharmacyOutboundReports`

Với mỗi row:
- Increment `RetryCount`, set `UpdatedBy="system:retry-worker"`
- Call gateway client (production hoặc InMemory tùy MockMode)
- Acknowledged → `Status=2`, set TransactionId, clear ErrorCode
- Transient error (NETWORK/TIMEOUT/CIRCUIT_OPEN) → giữ `Status=1` cho lần sau
- Non-transient → `Status=3` Rejected

### 9.3 Safety property

- **Multi-instance safe:** dựa atomic UPDATE qua EF SaveChanges (không claim row).
  Risk: 2 instance pick cùng row → cùng gửi gateway 2 lần. Gateway có thể dedupe
  qua `X-Idempotency-Key` (nếu hỗ trợ).
- **Worker không die:** outer try/catch xung quanh iteration, log error tiếp tục loop.
- **Initial delay 15s** để app bootstrap xong.

### 9.4 Khả năng tắt

`Enabled=false` → worker log "disabled" và return (không spawn loop). Đây
là cách an toàn để tắt nhanh nếu phát hiện worker spam gateway.

---

## 10. Exception Filter

File `backend/src/HIS.API/Filters/Nangcap23ExceptionFilter.cs` — local filter,
chỉ apply controller có `[TypeFilter(typeof(Nangcap23ExceptionFilter))]`.

### 10.1 Mapping

| Exception | HTTP status | Body shape |
|---|---|---|
| `ArgumentException` | 400 | `{ error: "VALIDATION_FAILED", message, field }` |
| `InvalidOperationException` | 400 | `{ error: "INVALID_STATE", message }` |
| `KeyNotFoundException` | 404 | `{ error: "NOT_FOUND", message }` |
| `JsonException` | 400 | `{ error: "INVALID_JSON", message }` |
| `DbUpdateException` + UNIQUE (SQL 2601/2627) | 409 | `{ error: "DUPLICATE", message }` |
| `OperationCanceledException` | 499 Client Closed | (no body) |
| Khác | (passthrough → middleware global) | — |

### 10.2 Log behavior

- `ArgumentException`, `InvalidOperationException`, `JsonException`, `OperationCanceledException` → `LogInformation` (không cảnh báo nhân viên)
- `DbUpdateException` UNIQUE → `LogWarning` với inner message
- Khác → default middleware log

---

## 11. External Gateway Client

File `backend/src/HIS.Infrastructure/Services/External/NangCap23HttpClients.cs`
chứa 8 class (4 Http + 4 InMemory).

### 11.1 Helper chung — `GatewayHttpHelper.PostWithRetryAsync`

Single source of truth cho retry/timeout/error mapping. Tham số:
- `HttpClient http` — typed client từ `IHttpClientFactory`
- `string relativeUrl` — endpoint cụ thể
- `Func<HttpContent> contentFactory` — tạo content mới mỗi attempt
- `int maxAttempts` — đọc từ `NationalGateway:RetryCount` (default 3)
- `string? idempotencyKey` — header `X-Idempotency-Key`
- `ILogger logger`
- `CancellationToken ct`

Behavior:
| Tình huống | Hành vi |
|---|---|
| Success 2xx | Parse `transactionId`/`ticketNumber`/`submissionId`/`messageId` từ JSON; nếu không có dùng 40 ký tự đầu của body |
| 4xx | Trả `ErrorCode="HTTP_4xx"`, KHÔNG retry |
| 5xx | Retry tới max |
| `HttpRequestException` | Retry |
| `TaskCanceledException` (timeout) | Retry |
| `BrokenCircuitException` | Fast-fail, trả `ErrorCode="CIRCUIT_OPEN"` + Vietnamese message |
| `OperationCanceledException` (user cancel) | Bubble up |
| Hết retry | Trả `ErrorCode="NETWORK_ERROR"` hoặc `"TIMEOUT"` |

### 11.2 Truncation + Sanitize

- `RawResponse` truncate 4000 ký tự (`MaxStoreLen`) để không phình DB
- `ErrorMessage` truncate 500 ký tự (`MaxMsgLen`)
- `SanitizeForLog` regex mask `access_token|Authorization|api_key|X-API-Key|password|secret` thành `***` khi log exception message

### 11.3 4 client production

| Client | BaseUrl mặc định | Auth header | Endpoint |
|---|---|---|---|
| `HttpNationalPrescriptionGatewayClient` | `https://donthuocquocgia.vn` | `X-API-Key: <NationalGateway:Prescription:ApiKey>` | POST `/api/prescription/submit` |
| `HttpNationalPharmacyGatewayClient` | `https://duocquocgia.com.vn` | `X-API-Key: <NationalGateway:Pharmacy:ApiKey>` + `X-Report-Type: <type>` | POST `/api/reports/upload` (Content-Type: application/xml) |
| `HttpDeAn06GatewayClient` | `https://gdbhyt.baohiemxahoi.gov.vn` | `Authorization: Bearer <DeAn06:AccessToken>` | POST `/api/v1/{birth/death/driving-license}-certificates` (`-health-checks`) |
| `HttpZaloOaClient` | `https://business.openapi.zalo.me` | `access_token: <Zalo:AccessToken>` | POST `/message/template` |

`HttpZaloOaClient` có 2 layer fail-fast:
- `AccessToken` rỗng → trả `MISSING_ACCESS_TOKEN` ngay, không gọi gateway
- Payload `template_data` parse fail → trả `INVALID_PAYLOAD`, không retry

### 11.4 4 InMemory client

Mỗi method trả `Acknowledged=true` với `TransactionId` prefix `MOCK-{type}-{guid}`:
- `MOCK-RX-*` (Prescription)
- `MOCK-PH-*` (Pharmacy)
- `MOCK-GCS-*` / `MOCK-GBT-*` / `MOCK-DLHC-*` (Đề án 06)
- `MOCK-ZL-*` (Zalo)

Dễ phân biệt với production traffic. **Tuyệt đối không bind khi MockMode=false.**

---

## 12. Config Store + Sensitive Encryption

File `backend/src/HIS.Infrastructure/Services/NangCap23ConfigStore.cs` —
persist config vào table `SystemConfigs`.

### 12.1 Key naming convention

```
NangCap23.{Module}.{Setting}
NangCap23.NationalGateway.MockMode
NangCap23.NationalGateway.Prescription.ApiKey    (encrypted)
NangCap23.Zalo.AccessToken                       (encrypted)
```

### 12.2 Encryption

- `IDataProtectionProvider.CreateProtector("NangCap23.Config.v1")`
- Sensitive suffix: `.ApiKey`, `.AccessToken`, `.Password`, `.Secret`, `.Token`, `.ClientSecret`
- Encrypted value prefix với `ENC:` để identify khi decrypt
- Data-protection keys persist qua `PersistKeysToDbContext<HISDbContext>` → encryption stable qua Cloud Run cold start

### 12.3 Race safety — Serializable transaction + retry-on-conflict

`SaveAsync` chạy trong `IsolationLevel.Serializable`:
- SELECT existing row qua `WHERE ConfigKey IN (...) AND IsDeleted=0` → range lock
- INSERT/UPDATE bên trong cùng tx
- Commit/Rollback atomic

Khi 2 instance race → instance thua catch `DbUpdateException` UNIQUE (SQL 2601/2627)
→ `MaxConflictRetries=3` lần, mỗi lần `ChangeTracker.Clear()` + sleep `50ms × attempt`.

### 12.4 GET semantic

- Row tồn tại + value rỗng → trả `""` (respect admin's explicit clear, KHÔNG fallback appsettings)
- Row không tồn tại → fallback `fallback` parameter HOẶC `_config[key]`
- Decrypt fail → log error + fallback

---

## 13. Cấu hình môi trường

### 13.1 `appsettings.json` (production-first)

Section mới thêm:
```json
{
  "NationalGateway": {
    "MockMode": false,                              // ← Production default
    "FacilityCode": "BV-DEMO-01",
    "FacilityName": "Bệnh viện Demo",
    "TimeoutSeconds": 30,
    "RetryCount": 3,
    "AutoSubmit": false,
    "Prescription": { "BaseUrl": "https://donthuocquocgia.vn", "ApiKey": "" },
    "Pharmacy":     { "BaseUrl": "https://duocquocgia.com.vn",  "ApiKey": "" },
    "CircuitBreakerThreshold": 5,
    "CircuitBreakerDurationSeconds": 30
  },
  "NangCap23": {
    "RetryWorker": {
      "Enabled": true,                              // ← BẬT mặc định
      "IntervalSeconds": 60,
      "StuckMinutes": 5,
      "MaxBatchSize": 20
    }
  },
  "DeAn06": {
    "BaseUrl": "https://gdbhyt.baohiemxahoi.gov.vn",
    "AccessToken": ""                               // ← Empty default — Zalo client trả MISSING_ACCESS_TOKEN
  },
  "Zalo": {
    "MockMode": false,
    "IsEnabled": false,
    "BaseUrl": "https://business.openapi.zalo.me",
    "AccessToken": "",
    "OaId": "",
    "TimeoutSeconds": 15,
    "RetryCount": 3,
    "CostPerMessageVnd": 350
  }
}
```

### 13.2 `appsettings.Development.json` (dev override)

```json
{
  "NationalGateway": { "MockMode": true },
  "Zalo":            { "MockMode": true }
}
```

→ DI bind `InMemory*` clients. Dev không cần sandbox URL hay API key.

### 13.3 Cloud Run env-var override (production)

```bash
gcloud run services update his-api --update-env-vars="
  NationalGateway__MockMode=false,
  NationalGateway__Prescription__ApiKey=<api-key>,
  NationalGateway__Pharmacy__ApiKey=<api-key>,
  NationalGateway__FacilityCode=BV-XYZ-2026,
  DeAn06__AccessToken=<da06-token>,
  Zalo__MockMode=false,
  Zalo__AccessToken=<oa-token>,
  Zalo__OaId=<oa-id>,
  Zalo__IsEnabled=true
" --region=asia-southeast1 --project=project-4d4a3f8e-d582-4536-97f
```

---

## 14. Flow ảnh hưởng tới module khác

### 14.1 Module phụ thuộc DATA → NangCap23 (NangCap23 READ từ module khác)

| Module nguồn | NangCap23 module | Trường data |
|---|---|---|
| `Prescriptions` + `PrescriptionDetails` + `Medicines` | National Prescription Gateway | `PrescriptionId`, `Details[]`, `MedicineCode/Name`, `Quantity`, `Dosage`, `Usage`, `Days` |
| `MedicalRecord` + `Patient` | National Prescription Gateway | `PatientId`, `FullName`, `IdentityNumber`, `Gender`, `DateOfBirth` |
| `Patient` | Đề án 06 (GCS / GBT / DLHC) | `MotherPatientId` / `PatientId`, `FullName`, `PatientCode`, `IdentityNumber` |
| `MedicalRecord` | Đề án 06 GCS / GBT | `MedicalRecordId` |
| `Examination` | Đề án 06 DLHC | `ExaminationId` |
| `Department` + `Room` | Linen Sterilization | `DepartmentId`, `RoomId` |
| `QueueTickets` + `Examinations` | Quality Dashboard (Clinic Queue view) | Aggregation source |
| `Admissions` + `Discharges` + `Beds` | Quality Dashboard (Inpatient view) | Aggregation source |
| `RadiologyRequests` + `FunctionalDiagnosticTests` + `PathologyRequests` | Quality Dashboard (CLS view) | Aggregation source |
| `LabRequestItems` + `Services` | Quality Dashboard (Lab view) | Aggregation source |
| `Receipts` | Quality Dashboard (Revenue view) | Aggregation source |

### 14.2 Module gọi NangCap23 (NangCap23 expose → module khác)

| Module gọi | Endpoint | Mục đích |
|---|---|---|
| (Hiện tại không có module nào gọi NangCap23) | — | UI là consumer duy nhất; chưa có service-to-service call |

→ NangCap23 là **terminal feature** — không có downstream consumer.

### 14.3 Side-effect không trực tiếp

- **Pharmacy module:** sau khi dispense, có thể chủ động trigger `POST /national-pharmacy/generate` để báo cáo daily sale. Hiện tại **manual** (user click), không auto. `AutoSubmit` config có flag nhưng chưa wire vào pharmacy workflow.
- **OB/GYN module:** sau khi Birth event lưu thành `Patient` (con) + `MedicalRecord`, có thể trigger tạo `BirthCertificateRecord`. Hiện tại **manual**.
- **Inpatient module:** sau Discharge với manner=death, có thể trigger tạo `DeathCertificateRecord`. Hiện tại **manual**.
- **Notification module SMS hiện hữu:** Zalo OA chạy song song, KHÔNG thay thế. Không phá vỡ flow SMS.

---

## 15. Frontend — Route + UI

### 15.1 Route đã đăng ký (`frontend/src/App.tsx`)

| Path v1 (MainLayout/Antd) | Path v2 (TerminalLayout/ab-*) | Component |
|---|---|---|
| `/national-gateways` | `/v2/national-gateways` | `NationalGateways` |
| `/de-an-06` | `/v2/de-an-06` | `DeAn06Liaison` |
| `/linen-management` | `/v2/linen-management` | `LinenManagement` |
| `/functional-diagnostics` | `/v2/functional-diagnostics` | `FunctionalDiagnostics` |
| `/zalo-notifications` | `/v2/zalo-notifications` | `ZaloNotifications` |
| `/quality-dashboard-live` | `/v2/quality-dashboard-live` | `QualityDashboardLive` |

12 route trong tổng số 121+121 = 242 route của hệ thống.

### 15.2 Menu wiring

- `MainLayout.tsx` (v1 — Antd Pro): 6 menu item trong các group:
  - "Liên thông" → Cổng Đơn thuốc/Dược QG, Đề án 06, Zalo OA / ZNS
  - "Quản lý" → DB Chất lượng (live), Đồ giặt & Tiệt trùng
  - "Cận lâm sàng" → Thăm dò chức năng
- `TerminalLayout.tsx` (v2 — ab-* design pack): 6 menu item tương ứng

### 15.3 API client (`frontend/src/api/nangcap23.ts`, 809 LOC)

7 object exporting cho 6 module (Quality Dashboard có 1 object):
- `npGateway` — 9 method
- `nphGateway` — 5 method
- `deAn06` — 12 method
- `linen` — 11 method
- `fdt` — 7 method
- `zalo` — 8 method
- `qualityDash` — 6 method

Tất cả dùng `apiClient` (axios instance shared, base URL từ `VITE_API_URL`).

### 15.4 Page LOC

| Page | v1 LOC | v2 LOC |
|---|---|---|
| `NationalGateways` | 318 | 326 |
| `DeAn06Liaison` | (similar size) | (similar size) |
| `LinenManagement` | ~280 | ~290 |
| `FunctionalDiagnostics` | ~250 | ~260 |
| `ZaloNotifications` | ~270 | ~280 |
| `QualityDashboardLive` | ~250 | ~260 |

v1 dùng Antd primitives (`Card`, `Tabs`, `Table`, `Modal`, `Drawer`, `Descriptions`, `Statistic`).
v2 dùng `_v2kit` (`KpiStrip`, `TopTabs`, `DataTable`, `DrawerShell`, `ModalShell`, `ActBtn`, `DrSec`, `DrField`, `StatusBadge`).

---

## 16. Chức năng đã triển khai vs chưa

### 16.1 Triển khai đầy đủ (BE + FE + Test)

| Chức năng | BE service | FE page v1 | FE page v2 | Test |
|---|---|---|---|---|
| Submit đơn thuốc cổng QG | ✅ | ✅ | ✅ | ✅ flow |
| Retry submission | ✅ | ✅ | ✅ | ✅ |
| Cancel submission | ✅ | ✅ | ✅ | ✅ |
| Config gateway (Admin) | ✅ | ✅ | ✅ | ✅ persistence |
| Generate báo cáo Dược QG | ✅ | ✅ | ✅ | ✅ validation |
| Save / Submit GCS | ✅ | ✅ | ✅ | ✅ page-load |
| Save / Submit GBT | ✅ | ✅ | ✅ | ✅ page-load |
| Save / Submit DLHC + auto-compute | ✅ | ✅ | ✅ | ✅ page-load |
| CRUD Linen Item | ✅ | ✅ | ✅ | ✅ flow |
| Linen Transaction state machine | ✅ | ✅ | ✅ | ✅ flow |
| Sterilization Schedule state machine | ✅ | ✅ | ✅ | ✅ page-load |
| CRUD Functional Diagnostic Test | ✅ | ✅ | ✅ | ✅ page-load |
| FDT Complete → Verify | ✅ | ✅ | ✅ | ✅ |
| Send Zalo ZNS | ✅ | ✅ | ✅ | ✅ flow |
| Zalo Config (Admin, sensitive token mask) | ✅ | ✅ | ✅ | ✅ persistence |
| Zalo Retry (chức năng thêm mới sau audit) | ✅ | ✅ | ✅ | ✅ |
| Quality Dashboard 5 view | ✅ | ✅ | ✅ | ✅ page-load |
| Retry Background Worker | ✅ | (không có UI) | (không có UI) | (manual run) |
| SSRF allowlist | ✅ | — | — | ✅ |
| Sensitive token encryption | ✅ | — | — | ✅ |
| Race-safe config save | ✅ | — | — | ✅ |
| Idempotency key | ✅ | — | — | (manual verify) |
| Circuit breaker (Polly) | ✅ | — | — | (manual verify) |

### 16.2 Chưa triển khai (nice-to-have, không block production)

| Chức năng | Trạng thái | Ghi chú |
|---|---|---|
| Production credential thật | ⚠️ Chưa có | BHXH Việt Nam / Cục QLD chưa cấp sandbox URL + API key. Cloud Run hiện vẫn MockMode=true. |
| Auto-submit Prescription sau khi BS lưu đơn thuốc | ⚠️ Chưa wire | Flag `NationalGateway:AutoSubmit=false`. Phải có module Prescription chủ động gọi NangCap23 service. |
| Auto-create BCR/DCR/DLHC từ workflow OB/Inpatient/Examination | ⚠️ Chưa wire | UI hiện tại tạo tay. Có thể tích hợp sau qua event/hook. |
| UI cho Retry Background Worker (stats, on/off) | ⚠️ Chưa có | Phải debug qua log + DB query. |
| Test với gateway thật (Staging) | ⚠️ Chưa có | Test hiện chỉ với InMemory mock. |
| Mobile app cho gửi GCS/GBT/DLHC tại bệnh án | ❌ Out of scope | HSMT có yêu cầu mobile riêng. |
| FE hiển thị `Da06ErrorMessage` chi tiết với hint sửa | ⚠️ Hiển thị đơn giản | Có thể nâng cấp UX sau khi có real gateway feedback. |

---

## 17. TODO / FIXME / Feature flag / Nguy cơ

### 17.1 TODO / FIXME

**Kết quả grep `TODO|FIXME|XXX|HACK` trong toàn bộ source NangCap23: KHÔNG TÌM THẤY**

Code đã đi qua audit Phase 1–3 (xem README.md "Hardening Phase"). Mọi TODO marker
gốc đã được xóa hoặc convert thành implementation thật.

### 17.2 Feature flag

| Flag | Vị trí | Default | Tác dụng |
|---|---|---|---|
| `NationalGateway:MockMode` | appsettings | `false` (prod) / `true` (dev) | DI chọn InMemory vs Http client |
| `Zalo:MockMode` | appsettings | `false` (prod) / `true` (dev) | DI chọn InMemory vs Http client |
| `NationalGateway:AutoSubmit` | appsettings | `false` | (placeholder — chưa wire vào module Prescription) |
| `NangCap23:RetryWorker:Enabled` | appsettings | `true` | Bật/tắt background retry worker |
| `Zalo:IsEnabled` | appsettings + Config | `false` | UI có thể disable Zalo OA mà không phải xóa AccessToken |

### 17.3 Đoạn code có nguy cơ tiềm ẩn

| File | Vấn đề | Mức độ | Mitigation hiện có |
|---|---|---|---|
| `NangCap23Services.cs:291-298` (`SubmitAsync`) | Phase 2 SaveChanges fail sau khi gateway đã ACK → DB Status=1 nhưng cổng QG đã nhận. User retry → cổng nhận duplicate. | Critical | Log `[NANGCAP23-ALERT]` CRITICAL với `transactionId`. Admin phải manual reconcile. Idempotency key giúp cổng dedupe **nếu** cổng hỗ trợ (không bảo đảm). |
| `Nangcap23RetryWorker.cs:107-144` | 2 Cloud Run instance pick cùng row → cùng gửi gateway 2 lần | Medium | `X-Idempotency-Key` (chỉ effective nếu cổng dedupe) |
| `HttpZaloOaClient.cs:346` | `SHA256.HashData` mỗi attempt cho idempotency key | Low (perf) | Chấp nhận overhead nhỏ |
| `NangCap23ConfigStore.cs:153-156` | `Task.Delay(50ms × attempt)` synchronous-like trong retry loop | Low | Acceptable cho admin endpoint |
| 2-phase save | User mở 2 tab + click Submit cùng prescription trong vòng < 100ms | Medium | App check `existing != null` + DB filtered UNIQUE chặn (409) |
| Self-signed cert demo cho AI PDF | (không liên quan NangCap23) | — | — |

### 17.4 Phụ thuộc bên ngoài không kiểm soát

| Phụ thuộc | Tác động khi fail |
|---|---|
| `donthuocquocgia.vn` down | Submission stuck Status=1, worker retry liên tục, circuit breaker mở sau 5 lỗi → fast-fail trong 30s |
| `duocquocgia.com.vn` down | Tương tự |
| `gdbhyt.baohiemxahoi.gov.vn` down | Đề án 06 stuck (không có worker retry — chỉ user retry manual) |
| `business.openapi.zalo.me` down | Zalo log Status=3 Failed, user click Retry trong UI |
| Cấp credential thật chậm | Hệ thống vẫn chạy MockMode → mọi submission đều ack `MOCK-*` (không có dấu trên cổng QG thực sự) |
| Data Protection key bị mất (Cloud Run instance restart + key chưa persist) | Decrypt fail → log error + fallback appsettings (AccessToken rỗng). Cần `PersistKeysToDbContext` ổn định. |

### 17.5 Pattern phòng thủ đã có

- **Default-deny** cho DLHC commercial class: chưa test ma túy/cồn → `EligibleToDrive=false`
- **Defense-in-depth**: `DrivingLicenseEligibility.Recompute` gọi cả Save và Submit
- **Server không tin client** cho mọi `EligibleToDrive`, `StatusName` (server compute)
- **Sensitive log mask** regex 6 token (`access_token|Authorization|api_key|X-API-Key|password|secret`)
- **Response truncate** 4000 ký tự (chống DB phình)
- **Cancellation propagate** `CancellationToken` qua mọi layer
- **2-phase save** rồi DB unique chống duplicate
- **Polly Circuit Breaker** chống cascading failure
- **Hostname allowlist** chống SSRF
- **Block IP literal** chống SSRF (trừ Development)
- **Data Protection encrypt** sensitive value trong DB

---

## 18. Tham chiếu commit

| Commit | Mô tả | File chính |
|---|---|---|
| `8b2f777` | NangCap23 v1 — close 9 gap (BE + FE + tests) | Entity, DTO, Service, Controller, SQL 43, API client, 6 v2 page, 2 test |
| `b9097cb` | Wire 6 page Antd v1 vào MainLayout | 6 file `frontend/src/pages/*.tsx`, App.tsx, MainLayout.tsx |
| `d01fed7` | Redesign 6 v2 page theo handoff bundle `V9H_yBugmWNF7AnlovXO8g` | 6 file `frontend/src/pages-v2/*.tsx` |
| `e3935e1` | gitignore Rider lscache + design bundle | `.gitignore` |
| (Phase 2 hardening) | `INangCap23ConfigStore`, `NangCap23ConfigStore`, validator SSRF, exception filter, SQL 44+45 | `INangCap23ConfigStore.cs`, `NangCap23ConfigStore.cs`, `Nangcap23ConfigValidator.cs`, `Nangcap23ExceptionFilter.cs`, scripts 44/45 |
| (Phase 3 worker + 2-phase) | `Nangcap23RetryWorker`, 2-phase save trong service, idempotency key | `Nangcap23RetryWorker.cs`, refactor `NangCap23Services.cs`, `External/NangCap23HttpClients.cs` |

Tag/release note: **không xác định được từ source code** (repo không có tag chính
thức cho NangCap23 — commit `8b2f777..e3935e1` chính là thay đổi tổng hợp).

---

## Tài liệu liên quan

- **[README.md](./README.md)** — Tổng quan + architecture + hardening table
- **[test-guide.md](./test-guide.md)** — QA test checklist (11 section, 30+ kịch bản)
- **[test-plan.md](./test-plan.md)** — Test plan chi tiết (mapping chức năng ↔ API ↔ test case)
- **[summary.md](./summary.md)** — Index + module impact ranking + danh sách file đã tạo
- **[../../roadmap/nangcap-phan-tich.md](../../roadmap/nangcap-phan-tich.md)** — Phân tích roadmap NangCap (39 phân hệ)
- **[../../requirements.md](../../requirements.md)** — HSMT root requirements
