# HIS – Kiến trúc Hệ thống

> **Mục đích:** Mô tả kiến trúc tổng thể của Hospital Information System (HIS) từ tầng database tới UI, các luồng request/auth/data, và quy ước layering.
> **Phạm vi:** Backend (ASP.NET Core Clean Architecture) + Frontend (React 19 + Antd v6) + Infrastructure (Cloud Run + Vercel + Cloud SQL + Oracle VM PACS).
> **Module liên quan:** Tất cả 100+ controllers, 80+ services, 121 routes frontend.
> **Last updated:** 2026-05-16

---

## Mục lục

- [1. Tổng quan](#1-tổng-quan)
- [2. Layering (Clean Architecture)](#2-layering-clean-architecture)
- [3. Backend pipeline & Request lifecycle](#3-backend-pipeline--request-lifecycle)
- [4. Frontend architecture (v1 + v2 + Mobile)](#4-frontend-architecture-v1--v2--mobile)
- [5. Authentication & Authorization flow](#5-authentication--authorization-flow)
- [6. Data flow giữa các module](#6-data-flow-giữa-các-module)
- [7. State management](#7-state-management)
- [8. Infrastructure & Deployment](#8-infrastructure--deployment)
- [9. Folder structure quy chuẩn](#9-folder-structure-quy-chuẩn)
- [10. Quy ước layering](#10-quy-ước-layering)

---

## 1. Tổng quan

HIS là Hospital Information System cấp Level 6 (EMR) phục vụ Bệnh viện Đa khoa,
Trung tâm Y tế và Trạm Y tế tại Việt Nam, tuân thủ:

- TT 54/2017/TT-BYT, TT 32/2023/TT-BYT, TT 13/2025/TT-BYT (EMR + bảo mật)
- Đề án 06 (liên thông Bộ Công an: giấy chứng sinh / báo tử / KSK lái xe điện tử)
- BHXH XML 4.0 (giám định BHYT)
- HL7 v2 (LIS analyzer) + HL7 FHIR R4 + HL7 CDA R2 (interoperability)
- DICOM 3.0 (PACS / RIS)
- DQGVN (cổng dữ liệu y tế quốc gia)
- Đơn thuốc QG (donthuocquocgia.vn) + Dược QG (duocquocgia.com.vn)

Quy mô hiện tại:

| Lớp | Số lượng |
|---|---|
| Entities (HIS.Core) | 66 file → **~250+ entity** |
| Application interfaces (IService) | 80 |
| Infrastructure services (impl) | 95 |
| Controllers (HIS.API) | 100+ |
| DbSets (HISDbContext) | **439** |
| Migration SQL scripts (idempotent) | 43 (`01_*.sql` → `43_*.sql`) |
| Frontend pages v1 | 121 |
| Frontend pages v2 (ab-* design pack) | 121 |
| Frontend API clients | 100+ |
| React contexts | 4 (Auth, Notification, Signing, Theme) |
| Cypress E2E specs | 60+ |
| Playwright specs | 30+ |

---

## 2. Layering (Clean Architecture)

Backend tuân thủ Clean Architecture với 4 layer, dependency chỉ chiều
**trong → ngoài**:

```
┌────────────────────────────────────────────────────────────────┐
│  HIS.API  (Presentation)                                       │
│  - Controllers, Middleware, SignalR Hubs, Program.cs           │
│  - Phụ thuộc: Application, Infrastructure                      │
└─────────────────────────────────┬──────────────────────────────┘
                                  │
┌─────────────────────────────────▼──────────────────────────────┐
│  HIS.Infrastructure                                             │
│  - Services (impl), DbContext, EF Core, HttpClient, Polly      │
│  - HL7/FHIR/DICOM/iText/Pkcs11/SignalR adapters                │
│  - DependencyInjection.cs (Composition Root)                   │
│  - Phụ thuộc: Core, Application                                 │
└─────────────────────────────────┬──────────────────────────────┘
                                  │
┌─────────────────────────────────▼──────────────────────────────┐
│  HIS.Application                                                │
│  - Interfaces (IService), DTOs, Validators, Use-case logic     │
│  - Phụ thuộc: Core                                              │
└─────────────────────────────────┬──────────────────────────────┘
                                  │
┌─────────────────────────────────▼──────────────────────────────┐
│  HIS.Core  (Domain)                                             │
│  - Entities, Enums, IRepository<T>, IUnitOfWork                │
│  - BaseEntity { Id, CreatedAt, CreatedBy, UpdatedAt, UpdatedBy,│
│    IsDeleted }                                                  │
│  - Không phụ thuộc lib ngoài                                    │
└────────────────────────────────────────────────────────────────┘
```

**Composition Root**: `backend/src/HIS.Infrastructure/DependencyInjection.cs`
đăng ký **~95 scoped services**, **3 singleton** (HL7ConnectionManager,
XmlExportService, XmlSchemaValidator, Pkcs11SessionManager,
AiProviderRegistry, MetricsService), **2 hosted services** (HL7ReceiverService,
AiWorklistService), **2 HttpClient factory** (BhxhGatewayClient, FhirClientService).

**Pattern phụ trợ**:
- Repository generic: `IRepository<T>` + `Repository<T>` (Infrastructure)
- Unit of Work: `IUnitOfWork` cho transaction wrap
- Polly: retry exponential + circuit breaker cho BHXH gateway
- DataProtection: PersistKeysToDbContext (mã hóa PII cột bệnh nhân)

---

## 3. Backend pipeline & Request lifecycle

ASP.NET Core 9 pipeline (`backend/src/HIS.API/Program.cs`):

```
HTTP Request
    │
    ▼
ForwardedHeaders   (Cloud Run gửi X-Forwarded-*)
    │
    ▼
HTTPS Redirect    (chỉ Production)
    │
    ▼
CORS              (AllowFrontend policy – đa origin từ CorsOrigins/CorsOriginsCsv)
    │
    ▼
RequestMetricsMiddleware   (đếm RPS, p50/p95 latency → MetricsService)
    │
    ▼
Authentication    (JWT Bearer + access_token query cho SignalR/print)
    │
    ▼
Authorization
    │
    ▼
AuditLogMiddleware   (log mọi POST/PUT/DELETE qua AuditLog DbSet,
                      module mapping theo route, fire-and-forget scope)
    │
    ▼
ProductionReadFallbackMiddleware  (catch EF "table missing" trên prod
                                    → 503 thay vì 500 với hint sửa)
    │
    ▼
Controller endpoint  (~100 controllers, RBAC qua [Authorize(Roles=)])
   │           │
   │           └─→ Application.IService → Infrastructure impl → DbContext / HttpClient
   │
   └─→ MapHub<NotificationHub>("/hubs/notifications")
       MapHub<RisChatHub>("/hubs/ris-chat")
       (SignalR realtime, JWT qua query string)
```

**Schema repair runner** (`ProductionSchemaRepairRunner`):
- Chạy 1 lần lúc startup
- Apply tất cả `Data/Scripts/*.sql` (embedded resource) theo thứ tự 01→43
- Pass model-driven: `context.Database.GenerateCreateScript()` tạo bảng DbSet còn thiếu
- 4 retry pass: downgrade `CASCADE → NO ACTION`, strip inline `FOREIGN KEY`
- Endpoint `/health/schema-drift` (Admin) báo `missingCount`

---

## 4. Frontend architecture (v1 + v2 + Mobile)

3 layout cùng tồn tại, chia sẻ chung API + Auth + Contexts:

### 4.1 v1 (MainLayout, Antd v6)

- Path: `/` (root) — production demo cho khách hàng
- 121 pages tại `frontend/src/pages/*.tsx`
- Layout: Sidebar collapsible + header + Outlet + responsive (mobile drawer)
- Code-split: mọi route đều `lazy(() => import(...))`

### 4.2 v2 (TerminalLayout, ab-* design pack)

- Path: `/v2/*` — A/B comparison + canonical design system mới
- 121 pages tại `frontend/src/pages-v2/*.tsx`
- Layout: Terminal-style monospace + design tokens
- CSS pack: `frontend/src/layouts/terminal/terminal.css` + `ab-module.css`
- Component kit: `frontend/src/pages-v2/_v2kit.tsx` (`SimpleV2Page<T>`,
  `KpiStrip`, `TopTabs`, `StatusTabs`, `DataTable<T>`, `DrawerShell`,
  `ModalShell`, `ActBtn`, `StatusBadge`, `Pager`, formatter helpers)
- Helper page builder: `SimpleV2Page<T>` đóng gói toàn bộ pattern KPI +
  Toolbar + Tabs + Table + Pager + Drawer trong ~70 LOC per page

### 4.3 Mobile (MobileHome)

- Path: `/mobile` — page riêng cho mobile native users
- Chia sẻ contexts + API

### 4.4 Public routes (không cần đăng nhập)

- `/queue-display` — TV LCD hiển thị hàng đợi (TTS Vietnamese)
- `/dat-lich` — Online appointment booking (public form)
- `/shared/:token` — Public DICOM study viewer (share link)

### 4.5 React entry tree

```
App
└── ThemeProvider          (Dark/Light algorithm)
    └── ConfigProvider     (Antd v6 + viVN locale + theme tokens)
        └── AntdApp
            └── QueryClientProvider
                └── BrowserRouter
                    └── AuthProvider          (User, OTP pending, RBAC helpers)
                        └── NotificationProvider   (SignalR + polling fallback)
                            └── SigningProvider    (USB Token PIN session)
                                └── AppRoutes
                                    ├── /login                    (public)
                                    ├── /queue-display            (public)
                                    ├── /dat-lich                 (public)
                                    ├── /shared/:token            (public)
                                    ├── /                         (ProtectedRoute → MainLayout)
                                    │   └── 121 v1 routes
                                    └── /v2                       (ProtectedRoute)
                                        ├── (index) ModuleIndex
                                        └── TerminalLayout
                                            └── 121 v2 routes
```

---

## 5. Authentication & Authorization flow

### 5.1 Login flow (với 2FA)

```
[User]                          [Frontend]                           [Backend]
  │                                │                                    │
  │ POST username+password ───────▶│                                    │
  │                                │ POST /api/auth/login ─────────────▶│
  │                                │                                    │ AuthService
  │                                │                                    │ + UserRepository
  │                                │                                    │ + BCrypt.Verify
  │                                │                                    │ if 2FA enabled:
  │                                │                                    │   generate OTP (SHA-256 hash)
  │                                │                                    │   send email via EmailService
  │                                │ ◀───{requiresOtp, otpUserId,──────│
  │                                │     maskedEmail, expiresAt}        │
  │                                │                                    │
  │ Hiện OTP form (Antd Input.OTP) │                                    │
  │ POST 6-digit OTP ─────────────▶│                                    │
  │                                │ POST /api/auth/verify-otp ────────▶│
  │                                │                                    │ AuthService.VerifyOtp
  │                                │                                    │ + max 3 attempts
  │                                │                                    │ + 30s resend cooldown
  │                                │                                    │ + issue JWT (HS256)
  │                                │ ◀───{token, user{permissions[]}}──│
  │                                │                                    │
  │                                │ localStorage.setItem('token', ...) │
  │                                │ AuthContext.setUser(...)           │
```

### 5.2 RBAC

- JWT payload chứa `roleId` + permission list
- Backend: `[Authorize(Roles="Admin,Doctor")]` decorator
- Frontend: `useAuth().hasPermission(name)` / `hasRole(name)`
- Access Control Matrix: 8 vai trò × 10 phân hệ (xem `docs/access-control-matrix.md`)

### 5.3 SignalR auth (special case)

SignalR client gửi JWT qua query string `?access_token=...` (browser WebSocket
không attach Authorization header được). Pipeline JWT Bearer handler có
`OnMessageReceived` event detect path `/hubs/*` và copy token sang
`context.Token`.

### 5.4 Print auth

Tương tự SignalR, các print endpoint `/api/pdf/*` + `/api/reception/print/*`
nhận `access_token` qua query để `window.open()` mở tab in.

---

## 6. Data flow giữa các module

**Reception → OPD → Prescription → Pharmacy → Billing → Inpatient** là backbone
chính. Mỗi bước "kế thừa dữ liệu" qua `DataInheritanceService` (Level 6 item 1.8):

```
[Reception]
   │ tạo Patient + MedicalRecord + QueueTicket + Insurance check
   ▼
[OPD Examination]
   │ inherit: patient demographics, insurance, allergies, queue ticket
   │ create: Examination + Vitals + Diagnosis (ICD-10 + SNOMED CT mapping)
   ▼
[Prescription / Service Order]
   │ inherit: diagnosis, vitals, allergies
   │ create: Prescription + PrescriptionItems / ServiceRequest + Details
   │ check: DrugInteraction + DrugAllergy + Contraindication
   ▼
[Billing]
   │ inherit: services + medicines + patient type (BHYT vs paying)
   │ create: InvoiceSummary + Receipt + Payment
   │ split: BHYT portion vs patient portion
   ▼
[Pharmacy Dispensing]
   │ inherit: prescription (after billing confirmed)
   │ create: DispenseRecord + StockMovement (FEFO batch picker)
   ▼
[Inpatient Admission]  (alternative path)
   │ inherit: OPD diagnosis, reason, services ordered
   │ create: Admission + BedAssignment + TreatmentSheet + NursingCareSheet
   │
   ▼
[Discharge / Final Bill] → EMR (38 forms TT 32/2023)
```

**External integration flows**:

| Hệ thống ngoài | Flow | Trạng thái |
|---|---|---|
| BHXH XML 4.0 | InsuranceXmlService → XmlSchemaValidator → BhxhGatewayClient (Polly retry) | Mock mode default, real HTTP wired |
| Đơn thuốc QG | NationalPrescriptionGatewayService → JSON payload | Mock mode (TODO real HTTP) |
| Dược QG | NationalPharmacyGatewayService → XML CV 2406 | Mock mode (TODO real HTTP) |
| Đề án 06 | DeAn06CertificateService → liên thông Bộ CA | Mock mode |
| Zalo OA / ZNS | ZaloNotificationService → 4 templates | Mock mode (TODO real HTTP) |
| HL7 v2 LIS | HL7ReceiverService (TCP listener) + HL7ConnectionManager | Live |
| HL7 FHIR R4 | FhirService + FhirClientService | Live (8 resources, 22+ endpoints) |
| HL7 CDA R2 | CdaDocumentService | Live |
| DICOM C-STORE | RISCompleteService → Orthanc PACS (Oracle VM 168.110.52.7) | Live, R2 storage |
| DQGVN | DqgvnService | Live |
| AI inference | Client-side ONNX (Cornerstone3D) + optional vendor HTTP | Live, multi-modality |
| USB Token | DigitalSignatureService + Pkcs11SessionManager | Live (CryptoAPI + Pkcs11Interop) |
| SMS | SmsService (eSMS.vn / SpeedSMS.vn) | Live |
| Email | EmailService (SMTP) | Live (dev fallback log OTP) |

---

## 7. State management

Không dùng Redux/Zustand — kết hợp:

| Cơ chế | Dùng cho | Vị trí |
|---|---|---|
| **React Context** | Global identity, theme, signing, notifications | `frontend/src/contexts/*.tsx` |
| **React Query** | Cache server state (đã wired QueryClientProvider, nhưng các page hiện đa số tự `useEffect + setState` thay vì `useQuery`) | App.tsx, ít page dùng |
| **`useState/useReducer`** | Local UI state | Trong từng page |
| **localStorage** | JWT token + user object persistence | `auth.ts`, `client.ts` |
| **SignalR push** | Notification + AI queue badge | `NotificationContext.tsx` |
| **Polling fallback** | 30s/60s fallback khi SignalR offline | `NotificationContext.tsx`, `AiQueueBadge.tsx` |

> **Inferred:** React Query đã setup nhưng underused — hầu hết page tự
> quản lý loading/error/data state. Đây là cơ hội refactor (xem TECH_DEBT.md).

---

## 8. Infrastructure & Deployment

### 8.1 Production topology

```
                  ┌──────────────────────────────────────┐
                  │     Vercel (Frontend)                │
                  │  https://his-psi.vercel.app          │
                  │  Auto-deploy on push origin/main     │
                  │  Build: tsc -b && vite build         │
                  └─────────────┬────────────────────────┘
                                │ HTTPS + JWT
                                ▼
                  ┌──────────────────────────────────────┐
                  │  Cloud Run (Backend)                 │
                  │  his-api-694913628964.asia-          │
                  │  southeast1.run.app                  │
                  │  Project: project-4d4a3f8e-d582-...  │
                  │  Region: asia-southeast1             │
                  │  Image: asia-southeast1-docker.pkg./ │
                  │         his/his-api:YYYYMMDD-HHMMSS  │
                  │  Build: gcloud builds submit         │
                  └──────┬──────────────┬────────────────┘
                         │              │
              ┌──────────▼───┐  ┌───────▼────────────────┐
              │ Cloud SQL    │  │  Oracle VM (Tokyo, AMD)│
              │ SQL Server   │  │  168.110.52.7          │
              │ 10.39.0.3    │  │  Orthanc PACS          │
              │ HIS database │  │  Caddy (LE cert)       │
              │ 439 tables   │  │  + Jitsi-meet self-host│
              └──────────────┘  │  + R2 storage backend  │
                                └────────────────────────┘
                                          │
                                          ▼
                                ┌────────────────────────┐
                                │ Cloudflare R2          │
                                │ his-pacs-dicom bucket  │
                                │ DICOM blob storage     │
                                │ (10 GB free, $0 egress)│
                                └────────────────────────┘
```

### 8.2 Dev environment

- Frontend: `cd frontend && npm run dev` → `http://localhost:3001`
- Backend: `cd backend/src/HIS.API && dotnet run --launch-profile http` → `http://localhost:5106`
- SQL Server (Docker): `localhost:1433` (container `his-sqlserver`, password `HisDocker2024Pass#`)
- Orthanc PACS (local Docker): `localhost:8042` (Web) + `:4242` (DICOM)
- Redis: `localhost:6379`
- HL7 listener: `localhost:2576`

### 8.3 CI/CD

- GitHub: Vercel auto-deploys frontend on `git push origin main`
- Cloud Run: **không** auto-deploy. Phải `gcloud builds submit --config cloudbuild.yaml`
  thủ công (xem `docs/deploy-google-cloud-run-cloud-sql.md`)
- Migration: tự apply qua `ProductionSchemaRepairRunner` lúc backend cold start

### 8.4 Backup & DR

- `docs/backup-procedures.md` mô tả flow:
  - `BACKUP DATABASE HIS … WITH COMPRESSION, CHECKSUM` trong container
  - Upload GCS bucket `gs://...cloudbuild/HIS.bak`
  - `gcloud sql import bak` restore lên prod

---

## 9. Folder structure quy chuẩn

```
HIS/
├── backend/
│   ├── HIS.sln
│   ├── cloudbuild.yaml
│   └── src/
│       ├── HIS.Core/                    (Domain)
│       │   └── Entities/                — 66 file, 250+ entities
│       ├── HIS.Application/             (Use cases)
│       │   ├── Services/                — 80 IService interfaces
│       │   └── DTOs/                    — 95 DTO file (grouped by module)
│       │       ├── Common/CccdValidator.cs
│       │       ├── Common/MissingDTOs.cs
│       │       ├── Examination/
│       │       ├── Reception/
│       │       └── ...
│       ├── HIS.Infrastructure/          (Adapters)
│       │   ├── Services/                — 95 service impl
│       │   ├── Services/HL7/            — HL7 v2 adapter
│       │   ├── Data/
│       │   │   ├── HISDbContext.cs      — 439 DbSets
│       │   │   ├── HISDbContext.DataProtection.cs
│       │   │   ├── DatabaseSeeder.cs    — master data seed
│       │   │   ├── ProductionSchemaRepairRunner.cs
│       │   │   └── Scripts/             — 43 idempotent SQL migrations
│       │   ├── Configuration/           — Options pattern
│       │   └── DependencyInjection.cs   — Composition Root
│       └── HIS.API/                     (Presentation)
│           ├── Program.cs               — Pipeline
│           ├── Controllers/             — 100+ controllers
│           ├── Middleware/              — RequestMetrics, AuditLog, etc.
│           ├── Hubs/                    — NotificationHub, RisChatHub
│           ├── Dockerfile
│           └── wwwroot/
│               ├── ai-models/           — ONNX model file(s)
│               └── xsd/bhxh/            — BHXH XML schema
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── playwright.config.ts
│   ├── playwright.prod.config.ts        — production smoke specs
│   ├── cypress.config.ts
│   ├── src/
│   │   ├── App.tsx                      — Route table (v1 + v2)
│   │   ├── api/                         — 100+ axios-based clients
│   │   │   ├── client.ts                — Singleton apiClient (JWT interceptor)
│   │   │   ├── publicClient.ts          — Unauthenticated client
│   │   │   └── <module>.ts              — 1 per backend controller
│   │   ├── contexts/                    — 4 contexts (Auth, Notification, Signing, Theme)
│   │   ├── components/                  — 41 reusable
│   │   ├── hooks/                       — 2 hooks
│   │   ├── layouts/
│   │   │   ├── MainLayout.tsx           — v1 layout
│   │   │   └── terminal/
│   │   │       ├── TerminalLayout.tsx   — v2 layout
│   │   │       ├── Icon.tsx
│   │   │       ├── terminal.css
│   │   │       └── ab-module.css        — ab-* design pack
│   │   ├── pages/                       — 121 v1 pages
│   │   ├── pages-v2/                    — 121 v2 pages
│   │   │   └── _v2kit.tsx               — Page builder helper
│   │   ├── config/api.ts                — env-driven API_URL
│   │   ├── services/                    — Cornerstone3D + AI labeling
│   │   ├── constants/                   — hospital.ts, etc.
│   │   └── utils/                       — formatters, helpers
│   ├── cypress/                         — 60+ E2E specs
│   ├── e2e/                             — Playwright (local)
│   └── e2e-prod/                        — Playwright (production smoke)
│
├── docs/                                — Toàn bộ tài liệu chính thức
│   ├── ARCHITECTURE.md                  ← file này
│   ├── PROJECT_STATUS.md
│   ├── ROADMAP.md
│   ├── TECH_DEBT.md
│   ├── API_FLOW.md
│   ├── access-control-matrix.md
│   ├── backup-procedures.md
│   ├── deploy-azure-container-apps.md
│   ├── deploy-google-cloud-run-cloud-sql.md
│   ├── incident-response-plan.md
│   ├── LIS-HL7Spy-Setup.md
│   └── requirements.md
│
├── design-system/                       — Design tokens, ab-* assets
├── deploy/                              — PACS Oracle VM provisioning
├── scripts/                             — SQL fixes, test utilities
└── CLAUDE.md                            — Session log (lịch sử phát triển)
```

---

## 10. Quy ước layering

| Tầng | Có được tham chiếu | KHÔNG được tham chiếu |
|---|---|---|
| HIS.Core | (chỉ stdlib .NET) | tất cả |
| HIS.Application | HIS.Core | HIS.Infrastructure, HIS.API, EF Core, lib bên ngoài |
| HIS.Infrastructure | HIS.Core, HIS.Application, EF Core, lib bên ngoài | HIS.API |
| HIS.API | HIS.Core, HIS.Application, HIS.Infrastructure | (không có) |

**Vi phạm thường gặp cần tránh**:

- ❌ Đặt entity class trong HIS.Application (phải ở HIS.Core)
- ❌ Đặt impl service trong HIS.API (phải ở HIS.Infrastructure)
- ❌ Inject `HISDbContext` trực tiếp vào Controller (phải qua `IService`)
- ❌ Frontend gọi REST endpoint từ Component (phải qua `api/*.ts` client)

**Quy ước thêm service mới**:

1. Tạo entity ở `HIS.Core/Entities/<Module>.cs`
2. Tạo DTO ở `HIS.Application/DTOs/<Module>/<Service>DTOs.cs`
3. Tạo interface ở `HIS.Application/Services/I<Service>Service.cs`
4. Tạo impl ở `HIS.Infrastructure/Services/<Service>Service.cs`
5. Đăng ký scoped trong `HIS.Infrastructure/DependencyInjection.cs`
6. Thêm DbSet vào `HISDbContext.cs`
7. Viết SQL migration `Data/Scripts/NN_<feature>.sql` (idempotent, IF NOT EXISTS)
8. Tạo controller ở `HIS.API/Controllers/<Service>Controller.cs`
9. Tạo API client frontend `frontend/src/api/<service>.ts`
10. Tạo page v1 + v2, wire route trong `App.tsx`, menu trong layouts

Skill template có sẵn ở `.claude/skills/his-backend-module-scaffold/`.

---

## Liên kết

- **PROJECT_STATUS.md** — trạng thái triển khai hiện tại theo module
- **ROADMAP.md** — kế hoạch tiếp theo
- **TECH_DEBT.md** — debt đã biết
- **API_FLOW.md** — sequence diagram cho 10 luồng nghiệp vụ chính
- `CLAUDE.md` — session log lịch sử (giữ ở root)
- `architecture/data-flow.md` — 100 luồng nghiệp vụ chi tiết
- `architecture/business-logic-complete.md` — business logic spec
