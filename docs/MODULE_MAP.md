# HIS – Module Map

> **Mục đích:** Bản đồ module boundaries + dependency flow + ai phụ thuộc ai. Dùng khi cần thêm feature mới mà không phá kiến trúc.
> **Phạm vi:** Backend (17 phân hệ chính + 20+ module mở rộng) + Frontend (3 layout × 121 page).
> **Last updated:** 2026-05-16

---

## Mục lục

- [1. Module boundary cấp 1: 17 phân hệ HSMT](#1-module-boundary-cấp-1-17-phân-hệ-hsmt)
- [2. Module boundary cấp 2: NangCap / Medinet / Supplementary](#2-module-boundary-cấp-2-nangcap--medinet--supplementary)
- [3. Dependency flow: ai gọi ai](#3-dependency-flow-ai-gọi-ai)
- [4. Cross-cutting concerns](#4-cross-cutting-concerns)
- [5. Frontend module map](#5-frontend-module-map)
- [6. External integrations](#6-external-integrations)
- [7. Bounded context rules](#7-bounded-context-rules)

---

## 1. Module boundary cấp 1: 17 phân hệ HSMT

Mỗi phân hệ = 1 bounded context. Trong code = 1 `IService` + 1 Controller + 1+
entity file. Phụ thuộc qua DTO + DataInheritanceService (không gọi cross-service
trực tiếp).

| # | Phân hệ | Entity | Service | Controller | Frontend page |
|---|---|---|---|---|---|
| 1 | Tiếp đón | `Patient.cs`, `Queue.cs`, `Appointment.cs` | `ReceptionCompleteService` | `ReceptionCompleteController` | `Reception.tsx` |
| 2 | Khám bệnh OPD | `MedicalRecord.cs`, `ClinicalEntities.cs` | `ExaminationCompleteService` | `ExaminationCompleteController` | `OPD.tsx`, `Prescription.tsx` |
| 3 | Nội trú IPD | `Inpatient.cs` | `InpatientCompleteService` | `InpatientCompleteController` | `Inpatient.tsx` |
| 4 | Chỉ định | `ServiceRequest.cs` | (qua ExaminationComplete) | (qua ExaminationComplete) | (qua OPD/IPD) |
| 5 | Kho Dược | `Warehouse.cs`, `Medicine.cs`, `WarehouseExtended.cs` | `WarehouseCompleteService` | (multi controllers) | `Pharmacy.tsx` + 6 admin pages |
| 6 | Phẫu thuật | `Surgery.cs` | `SurgeryCompleteService` | `SurgeryController` (suy ra) | `Surgery.tsx` |
| 7 | Xét nghiệm LIS | `Laboratory.cs`, `LISEntities.cs`, `LabCatalog.cs`, `LabMasterCatalog.cs` | `LISCompleteService` + `HL7ReceiverService` | `LISCompleteController` | `Laboratory.tsx` + 6 sub-modules |
| 8 | CĐHA/RIS-PACS | `Radiology.cs`, `RadiologyMasterCatalog.cs`, `RadiologyPermission.cs`, `AiLabeling.cs`, `NonDicomStudy.cs`, `StudyShareLink.cs` | `RISCompleteService` + `AiReportService` + `AiWorklistService` | `RISCompleteController`, `AiLabelingController` | `Radiology.tsx`, `DicomViewer.tsx` |
| 9 | Ngân hàng máu | `BloodBank.cs` | `BloodBankCompleteService` | `BloodBankCompleteController` | `BloodBank.tsx` |
| 10 | Thu ngân | `Billing.cs`, `PaymentGateway.cs`, `ReceiptBook.cs` | `BillingCompleteService` + `PaymentGatewayService` | `BillingCompleteController` + `PaymentGatewayController` + `PaymentReportsController` | `Billing.tsx`, `PaymentReports.tsx`, `PaymentTransactions.tsx` |
| 11 | Tài chính | (qua Billing entities) | (qua Billing) | (qua Reporting) | `Finance.tsx` |
| 12 | BHYT | `Insurance.cs`, `InsuranceExtended.cs` | `InsuranceXmlService` + `BhxhGatewayClient` | `InsuranceXmlController` + `BhxhConfigController` | `Insurance.tsx`, `BhxhConfig.tsx`, `BhxhAudit.tsx` |
| 13 | Danh mục | `Service.cs`, `Icd.cs`, `MasterCatalogs.cs`, `ServicePackages.cs` | `SystemCompleteService` + `MasterCatalogService` | (multi) | `MasterData.tsx` + 5 catalogs page |
| 14 | Nhà thuốc | (qua Warehouse) | `HospitalPharmacyService` | `HospitalPharmacyController` | `HospitalPharmacy.tsx` |
| 15 | BC Dược | (qua Warehouse) | (qua Reporting + Warehouse) | `StockReportController` | `StockReport.tsx` |
| 16 | HSBA/KHTH/BC | (cross-cutting) | `MedicalRecordArchiveService`, `MedicalRecordPlanningService`, `ReportingCompleteService`, `HospitalReportService` | (multi) | `EMR.tsx`, `MedicalRecordArchive.tsx`, `MedicalRecordPlanning.tsx`, `Reports.tsx` |
| 17 | Quản trị HT | `User.cs`, `SystemAdmin.cs`, `Abbreviation.cs` | `SystemCompleteService` + `AuthService` + `AuditLogService` + `SecurityService` | (multi) | `SystemAdmin.tsx` |

---

## 2. Module boundary cấp 2: NangCap / Medinet / Supplementary

Các module mở rộng theo HSMT từng bệnh viện, mỗi cluster có entity + service riêng:

### 2.1 Extended Workflow (Luồng 11-20)

| Luồng | Module | Service |
|---|---|---|
| 11 | Telemedicine | `TelemedicineServiceImpl` |
| 12 | Clinical Nutrition | `ClinicalNutritionServiceImpl` |
| 13 | Infection Control | `InfectionControlServiceImpl` |
| 14 | Rehabilitation | `RehabilitationServiceImpl` |
| 15 | Medical Equipment | `MedicalEquipmentServiceImpl` |
| 16 | Medical HR | `MedicalHRServiceImpl` |
| 17 | Quality Management | `QualityManagementServiceImpl` |
| 18 | Patient Portal | `PatientPortalServiceImpl` |
| 19 | Health Exchange | `HealthExchangeServiceImpl` |
| 20 | Mass Casualty (MCI) | `MassCasualtyServiceImpl` |

Tất cả ở `ExtendedWorkflowServices.cs` + `ExtendedServiceImplementations.cs`.

### 2.2 Medinet (10 modules y tế công cộng)

`Giam dinh Y khoa` · `YHCT` · `SKSS` · `Tam than` · `Moi truong y te` · `Chan thuong` · `Dan so KHHGĐ` · `GDSK` · `Hanh nghe` · `Lien vien`

Entity: `MedinetModules.cs`. Service: 10 file riêng trong `HIS.Infrastructure/Services/`.

### 2.3 Supplementary (9 modules)

`Follow-up` · `Procurement` · `Immunization` · `HealthCheckup` · `Epidemiology` · `SchoolHealth` · `OccupationalHealth` · `Methadone` · `BhxhAudit`

Entity: `SupplementaryEntities.cs`, `SupplementaryEntities2.cs`.

### 2.4 NangCap (hồ sơ HSMT theo BV)

| NangCap | Khách hàng | Module mở rộng | Entity |
|---|---|---|---|
| 5 | Tổng quát | National Prescription, Provincial Health, Data Management | – |
| 6 | Tổng quát | Central Signing, EMR Admin | `DigitalSignature.cs` |
| 7-9 | – | (Setup phases) | – |
| 10 | – | Signing Workflow | `DocumentHold.cs` |
| 11 | – | EMR Admin | – |
| 12 | – | Endpoint Security | – |
| 13 | – | Business Alerts (34 rules) | – |
| 14 | BV Phổi Hải Dương | ChronicDisease, HospitalPharmacy, ClinicalGuidance, TbHiv | `ChronicDisease.cs`, `HospitalPharmacy.cs`, `ClinicalGuidance.cs`, `TbHivManagement.cs` |
| 15 | – | RIS 21 features, PACS, 30 specialty EMR forms | – |
| 16 | BV Cam Ranh | EMR Management (10 features) | `EmrManagement.cs` |
| 17 | – | Asset, Training, IVF | `AssetManagement.cs`, `TrainingResearch.cs`, `IvfLab.cs` |
| 18 | – | (extended entities) | `NangCap18Entities.cs` |
| 19 | TTYT Quảng Hòa | 4 Patient Portal features | – |
| 20 | – | LIS-HIS + Pathology + Culture Stock | `Pathology.cs`, `CultureStock.cs`, `LabCatalog.cs` |
| 21 | – | Multi-facility 3 cấp | – |
| 22 | BV Đắk Nông | 13 master catalogs | `MasterCatalogs.cs` |
| 23 | BV Đa khoa | 9 gap (Đơn thuốc QG, Dược QG, Đề án 06, Linen, FDT, Zalo, Quality dashboard) | `NangCap23Entities.cs` |

---

## 3. Dependency flow: ai gọi ai

### 3.1 Quy tắc tổng quát

```
                 Frontend page
                       │
                       ▼  (axios qua api/*.ts)
                  Controller
                       │
                       ▼  (DI inject)
                  IService (Application)
                       │
                       ▼  (impl)
            Service impl (Infrastructure)
                       │
                       ├──▶ DbContext (EF Core)
                       ├──▶ HttpClient (external)
                       ├──▶ HubContext<NotificationHub> (realtime)
                       └──▶ IRepository<T> (generic CRUD)
```

**KHÔNG được**:
- Controller inject DbContext trực tiếp
- Service A inject Service B trừ khi qua interface ở Application layer
- Frontend page gọi 2 endpoint sequential khi có thể batch qua 1 endpoint

### 3.2 Sequence chính (kế thừa dữ liệu)

```
Reception ─────────────────────────────────┐
   │ Patient + MedicalRecord + Insurance   │
   ▼                                       │
OPD ───── DataInheritanceService.GetOpdContextAsync ─┘
   │ Examination + Diagnosis + Prescription
   ▼
DrugInteraction + DrugAllergy check (block save nếu severity=4)
   │
   ▼
ServiceRequest ───────┐                    Pharmacy.AutoSelectBatchesAsync
   │                  │                                ▲
   ▼                  ▼                                │
Lab (HL7 listener)  Radiology (PACS proxy)            │
   │                  │                                │
   ▼                  ▼                                │
Result → Email + SignalR notification                  │
                                                       │
Billing ────── Inherit unpaid services + medicines ────┘
   │ InvoiceSummary + Receipt + Payment + e-Invoice
   ▼
Pharmacy Dispensing ── FEFO batch picker + StockMovement
   │
   ▼  (optional Inpatient path)
Inpatient ─── Inherit OPD context + Discharge + EMR
```

### 3.3 Cross-module event hooks

| Event | Hook | Module nhận |
|---|---|---|
| Lab result final-approved | `ResultNotificationService.NotifyLabResultAsync` | Email + SignalR |
| Lab result critical value | `ResultNotificationService.NotifyCriticalValueAsync` | Email + SignalR + alert banner |
| Radiology result final-approved | `ResultNotificationService.NotifyRadiologyResultAsync` | Email + SignalR |
| Payment success (IPN) | `PaymentGatewayService.AutoIssueElectronicInvoiceAsync` | Tax authority + Receipt update |
| DICOM study arrived | `RISCompleteService.OnDicomArrivedAsync` | Link to ServiceRequest, SignalR |
| Audit log entry | `AuditLogMiddleware` | DbContext (fire-and-forget scope) |
| New DICOM study (no AI) | `AiWorklistService` background scan | AiLabelingResult placeholder |

---

## 4. Cross-cutting concerns

Áp dụng cho mọi module:

| Concern | Implementation | Vị trí |
|---|---|---|
| Authentication | JWT Bearer + 2FA email OTP | `AuthService`, `JwtBearerOptions` |
| Authorization | RBAC `[Authorize(Roles=...)]` | Controller decorators |
| Audit logging | Middleware ghi mọi POST/PUT/DELETE | `AuditLogMiddleware` |
| Soft delete | `BaseEntity.IsDeleted` + global query filter | `HISDbContext.OnModelCreating` |
| Audit columns | `BaseEntity.CreatedAt/By/UpdatedAt/By` | `BaseEntity.cs` |
| ValueConverter Guid↔string | 31 bảng có `CreatedBy/UpdatedBy` là `uniqueidentifier` DB | `HISDbContext.cs` whitelist |
| PII encryption | DataProtection cột Patient | `HISDbContext.DataProtection.cs` |
| Schema repair | Tự apply SQL embedded lúc startup | `ProductionSchemaRepairRunner` |
| Resilience HTTP | Polly retry + circuit breaker | `BhxhGatewayClient` (template cho service khác) |
| Metrics | Request count, p50/p95 latency | `MetricsService` + `RequestMetricsMiddleware` |
| Health check | 6 component (SQL, Redis, PACS, HL7, Disk, Memory) | `HealthController` |
| SignalR realtime | NotificationHub + RisChatHub | `HIS.API/Hubs/` |
| Realtime fallback | Polling 30s/60s nếu mất SignalR | `NotificationContext.tsx` |

---

## 5. Frontend module map

### 5.1 Layout duality

```
                     App.tsx
                        │
                        ├──▶ /login                    (Login.tsx)
                        ├──▶ /queue-display            (public TV LCD)
                        ├──▶ /dat-lich                 (public booking)
                        ├──▶ /shared/:token            (public DICOM share)
                        │
                        ├──▶ /                         (MainLayout v1 = Antd Pro)
                        │    └── 121 pages dưới ProtectedRoute
                        │
                        └──▶ /v2                       (TerminalLayout v2 = ab-* design)
                             ├── (index) ModuleIndex
                             └── 121 pages dưới ProtectedRoute
```

Cả 2 layout **chia sẻ**: API client, AuthContext, NotificationContext,
SigningContext, ThemeContext.

### 5.2 Frontend internal dependency

```
pages/X.tsx hoặc pages-v2/X.tsx
       │
       ├──▶ api/<module>.ts        (axios + interceptor)
       │       └──▶ apiClient (singleton, JWT auto-attach)
       │
       ├──▶ contexts/<X>Context    (useAuth, useNotification, ...)
       ├──▶ components/<X>.tsx     (reusable UI)
       ├──▶ hooks/use<X>.ts        (logic reusable)
       ├──▶ services/<X>           (Cornerstone3D, aiLabeling)
       ├──▶ utils/                 (formatters, helpers)
       └──▶ constants/             (hospital.ts, etc.)
```

### 5.3 v2 page builder

Mọi page list view nên dùng `pages-v2/_v2kit.tsx` `SimpleV2Page<T>` helper:

```tsx
<SimpleV2Page<RowType>
  title="..."
  load={async () => api.search()}
  rowKey="id"
  columns={[ ... ]}
  searchPlaceholder="..."
  searchOf={(r) => r.name}
  statusTabs={[ ... ]}
  statusOf={(r) => r.status}
  filters={[ ... ]}
  kpis={(rows) => [ ... ]}
  drawer={(row) => <DrSec><DrField>...</DrField></DrSec>}
  drawerTitle={(row) => row.name}
/>
```

~70 LOC per page thay vì 250+ LOC bespoke.

---

## 6. External integrations

| Integration | Direction | Implementation | Trạng thái |
|---|---|---|---|
| BHXH gateway | OUT (POST) | `BhxhGatewayClient` + Polly | Mock + real HTTP wired |
| Đơn thuốc QG | OUT (POST) | `NationalPrescriptionGatewayService` | Mock only |
| Dược QG (CV 2406) | OUT (POST XML) | `NationalPharmacyGatewayService` | Mock only |
| Đề án 06 | OUT (POST) | `DeAn06CertificateService` | Mock only |
| Zalo OA / ZNS | OUT (POST) | `ZaloNotificationService` | Mock only |
| HL7 v2 LIS | IN (TCP listen 2576) | `HL7ReceiverService` + `HL7ConnectionManager` | Live |
| HL7 FHIR R4 | IN/OUT (HTTP) | `FhirService` + `FhirClientService` | Live (8 resources) |
| HL7 CDA R2 | OUT (XML) | `CdaDocumentService` | Live |
| DICOM C-STORE | IN (modality → Orthanc) | Orthanc Oracle VM | Live |
| DICOM API proxy | OUT (`/api/RIS/pacs/...`) | `RISCompleteService` | Live |
| DQGVN | OUT (POST) | `DqgvnService` | Live |
| MoMo v2 | OUT QR + IN IPN | `PaymentGatewayService` | Live |
| ZaloPay | OUT + IN IPN | `PaymentGatewayService` | Live |
| USB Token (Windows CryptoAPI) | LOCAL device | `DigitalSignatureService` | Live (Windows dialog PIN) |
| USB Token (PKCS#11) | LOCAL device | `Pkcs11SessionManager` + `Pkcs11ExternalSignature` | Wired, cần hardware test |
| SMS (eSMS/SpeedSMS) | OUT (HTTP) | `SmsService` | Live |
| Email (SMTP) | OUT | `EmailService` | Live |
| Tax e-Invoice | OUT (POST) | (qua PaymentGatewayService) | Live |
| Smart card writing | LOCAL device | STUB | ❌ Chưa implement |

---

## 7. Bounded context rules

### 7.1 Khi tạo phân hệ mới (bounded context mới)

Tạo theo skill `.claude/skills/his-backend-module-scaffold/`:

1. **Entity** ở `HIS.Core/Entities/<NewModule>.cs` — inherit `BaseEntity`
2. **DTO** ở `HIS.Application/DTOs/<NewModule>/<Service>DTOs.cs`
3. **Interface** ở `HIS.Application/Services/I<Service>Service.cs`
4. **Impl** ở `HIS.Infrastructure/Services/<Service>Service.cs`
5. **Register DI** trong `DependencyInjection.cs`
6. **DbSet** trong `HISDbContext.cs`
7. **Migration SQL** `NN_<feature>.sql` (idempotent IF NOT EXISTS)
8. **Controller** `HIS.API/Controllers/<Service>Controller.cs`
9. **Frontend API** `frontend/src/api/<module>.ts`
10. **Frontend page** v1 + v2 + route + menu

### 7.2 Khi mở rộng phân hệ có sẵn (thêm feature)

- Thêm method vào service hiện tại (đừng tạo service mới nếu cohesion phù hợp)
- Thêm method vào controller cùng tên
- Thêm hàm vào API client cùng module
- Thêm tab/section vào page cùng tên

### 7.3 Khi feature span nhiều phân hệ

Dùng `DataInheritanceService` ở Application layer thay vì cross-service call:

- Đúng: `DataInheritanceService.GetOpdContextAsync` aggregate data từ
  Reception + OPD + Examination
- Sai: `InpatientService` inject `ReceptionService` để lấy patient info

### 7.4 Khi cần external integration mới

1. Thêm `IBhxhGatewayClient`-style interface ở Application layer (đừng đặt impl ở Application)
2. Impl ở Infrastructure dùng `HttpClient` + Polly
3. Đăng ký qua `services.AddHttpClient<I, Impl>(...)` trong DI
4. Config options pattern ở `Configuration/<Name>Options.cs`
5. Default mock impl cho dev environment

---

## Liên kết

- **ARCHITECTURE.md** — kiến trúc tổng thể (layering, pipeline)
- **PROJECT_STRUCTURE.md** — folder layout (file ở đâu)
- **PROJECT_STATUS.md** — module nào đã/chưa làm
- **API_FLOW.md** — sequence diagram chi tiết
- `architecture/data-flow.md` — 100 luồng nghiệp vụ
- `architecture/business-logic-complete.md` — chức năng theo HSMT
