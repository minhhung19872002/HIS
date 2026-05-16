# HIS – Project Status

> **Mục đích:** Trạng thái triển khai từng phân hệ tại thời điểm hiện tại — feature đã hoàn thành, đang dở, còn thiếu, có integration ngoài hay mock.
> **Phạm vi:** Toàn bộ 30+ phân hệ + module mở rộng (Medinet, NangCap1–23, EMR Level 6, AI Diagnostic Imaging Phase 1–4).
> **Module liên quan:** Tất cả.
> **Last updated:** 2026-05-16

---

## Mục lục

- [1. Tóm tắt](#1-tóm-tắt)
- [2. Tổng quan chỉ số](#2-tổng-quan-chỉ-số)
- [3. Trạng thái theo nhóm phân hệ](#3-trạng-thái-theo-nhóm-phân-hệ)
- [4. UI status (v1 vs v2 vs Mobile)](#4-ui-status-v1-vs-v2-vs-mobile)
- [5. Test coverage](#5-test-coverage)
- [6. Production deploy state](#6-production-deploy-state)
- [7. External integration status](#7-external-integration-status)
- [8. Known gaps](#8-known-gaps)

---

## 1. Tóm tắt

**Tình trạng tổng thể: PRODUCTION-READY** cho khách hàng demo + thầu hồ sơ
HSMT (Đắk Nông NangCap22 + BV Đa khoa NangCap23). Đã chạy live tại
`his-psi.vercel.app` + Cloud Run `his-api-00027-cjw`. Các tính năng core
clinical (Reception → OPD → Pharmacy → Billing → Inpatient) hoạt động đầy
đủ. Các tính năng cấp Level 6 (EMR 38 bieu mau TT 32/2023, 2FA, audit log,
FHIR R4, AI diagnostic imaging) đã triển khai. Còn ~5 cổng quốc gia ở mock
mode chờ sandbox credential.

---

## 2. Tổng quan chỉ số

| Metric | Giá trị |
|---|---|
| Backend controllers | 100+ |
| Backend services (impl) | 95 |
| DbSets | **439** |
| SQL migrations | 43 (idempotent) |
| Entities | 250+ |
| DTOs | 95 file |
| Frontend pages v1 + v2 | 121 + 121 |
| Frontend API clients | 100+ |
| Cypress E2E specs | 60+ (820+ tests) |
| Playwright specs | 30+ (250+ tests) |
| **NotImplementedException backend** | **0** |
| **TODO/FIXME backend** | **3** (đều là integration HTTP wiring) |
| **TODO/FIXME frontend** | **25** (đa số là button placeholder v2) |

---

## 3. Trạng thái theo nhóm phân hệ

### 3.1 Core Clinical (10 phân hệ chính) — ✅ HOÀN THÀNH

| # | Phân hệ | Service | UI v1 | UI v2 | Note |
|---|---|---|---|---|---|
| 1 | Tiếp đón (Reception) | `ReceptionCompleteService` (105+ methods) | ✅ | ✅ bespoke | Patient lookup whole history (filter today đã gỡ) |
| 2 | Khám bệnh OPD | `ExaminationCompleteService` (180+ methods) | ✅ | ✅ bespoke | Drug check (interaction/allergy/contraindication) wired |
| 3 | Điều trị Nội trú | `InpatientCompleteService` (200+ methods) | ✅ | ✅ bespoke | EF correlated subqueries cho pending orders/labs/medicine |
| 4 | Kê đơn (Prescription) | (qua Examination service) | ✅ | ✅ bespoke | Drug interaction local fallback + backend check |
| 5 | Kho Dược (Pharmacy) | `WarehouseCompleteService` (50+ methods) | ✅ | ✅ bespoke | FEFO batch picker, multi-receipt types |
| 6 | Phẫu thuật | `SurgeryCompleteService` | ✅ | ✅ bespoke | |
| 7 | Xét nghiệm LIS | `LISCompleteService` + HL7 listener | ✅ | ✅ bespoke | Analyzer config, QC chart (Levey-Jennings), 6 sub-modules |
| 8 | Chẩn đoán hình ảnh RIS/PACS | `RISCompleteService` + Orthanc | ✅ | ✅ bespoke | Cornerstone3D native viewer (Phase 1+2+3) |
| 9 | Ngân hàng máu | `BloodBankCompleteService` | ✅ | ✅ bespoke | 8 nhóm máu, gelcard test, expiry warning |
| 10 | Thu ngân (Billing) | `BillingCompleteService` + `PaymentGatewayService` | ✅ | ✅ bespoke | MoMo v2 HMAC, ZaloPay, e-invoice auto-issue |

### 3.2 Extended Workflow (Luồng 11–20) — ✅ HOÀN THÀNH

11. Telemedicine — Jitsi self-host (Oracle VM `161.33.180.17`), Jibri pending
12. Dinh dưỡng lâm sàng (Nutrition)
13. Kiểm soát nhiễm khuẩn (Infection Control)
14. Vật lý trị liệu (Rehabilitation)
15. Quản lý TTB y tế (Medical Equipment)
16. Quản lý nhân sự y tế (Medical HR)
17. Quản lý chất lượng (Quality Management)
18. Cổng bệnh nhân (Patient Portal) — ⚠️ admin browse cần `accountId` override
19. Liên thông y tế (Health Information Exchange) — HL7 FHIR R4 + CDA R2
20. Cấp cứu thảm họa MCI (Mass Casualty Incident)

### 3.3 Level 6 EMR (TT 32/2023, TT 13/2025) — ✅ HOÀN THÀNH

- ✅ EMR module (`EMR.tsx`) với 5 tabs (Hồ sơ BA, Lịch sử khám, Phiếu điều trị, Hội chẩn, Chăm sóc)
- ✅ **38/38 biểu mẫu TT 32/2023** in HTML/PDF (17 BS + 21 ĐD)
  - File: `frontend/src/components/EMRPrintTemplates.tsx`
  - File: `frontend/src/components/EMRNursingPrintTemplates.tsx`
  - File: `frontend/src/components/SpecialtyEMRForms1.tsx` (15 forms)
  - File: `frontend/src/components/SpecialtyEMRForms2.tsx` (15 forms)
- ✅ **2FA OTP** (Email): `AuthService.cs` + `Login.tsx` (Antd Input.OTP, resend cooldown)
- ✅ **Audit Logging** (`AuditLogMiddleware` + `SystemAdmin.tsx` UI tab)
- ✅ **HL7 FHIR R4** (8 resources, 22+ endpoints)
- ✅ **PDF generation + ký số** (`PdfGenerationService` + `PdfSignatureService` + iText7)
- ✅ **Patient Timeline** (8 module types, ngày tháng group)
- ✅ **Dashboard charts** (recharts: Area/Bar/Pie)
- ✅ **Clinical terminology** (200+ SNOMED CT mappings)
- ✅ **Queue Display** (LCD TV + TTS Vietnamese)
- ✅ **EMR Management** (sharing time-limited, extract watermark, spine, patient signature canvas, document lock auto-expire, data tags, image library, shortcodes, auto-check 10 rules, close validation)
- ✅ **8 báo cáo đối chiếu Level 6**
- ✅ **Data inheritance** Reception → OPD → Rx → Billing → Pharmacy → IPD
- ⚠️ **USB Token PIN programmatic** — Pkcs11Interop wired, needs hardware E2E

### 3.4 AI Diagnostic Imaging (Phase 1–4) — ✅ HOÀN THÀNH

| Phase | Mục đích | File chính | Trạng thái |
|---|---|---|---|
| 0 | DenseNet/ResNet50 ONNX client-side, review workflow | `services/aiLabelingService.ts` | ✅ |
| 1 | Multi-modality routing CR/CT/US | `AiLabelingController.cs`, `aiLabeling.ts` | ✅ (CT/US dev placeholder, production cần fine-tuned checkpoint) |
| 2 | Bbox + heatmap overlay theo pan/zoom | `AiOverlayLayer.tsx`, `CornerstoneViewer.tsx` | ✅ |
| 3 | DICOM SR + PDF (ký số iText7) + merge to RadiologyReport | `AiReportService.cs` | ✅ self-signed cert demo, BV cert thay qua env var |
| 4 | Worklist auto-queue + vendor adapter pattern | `AiWorklistService.cs`, `GenericRestAiProvider.cs` | ✅ default disabled |

### 3.5 NangCap series — ✅ HOÀN THÀNH

| Mã | Mô tả | Trạng thái |
|---|---|---|
| NangCap1–10 | Foundation phases (xem CLAUDE.md sessions) | ✅ |
| NangCap11 | EMR Admin | ✅ |
| NangCap12 | Endpoint Security (ATTT) | ✅ |
| NangCap13 | Business Alerts (34 rules) | ✅ |
| NangCap14 | BV Phổi Hải Dương (4 modules: chronic disease, hospital pharmacy, clinical guidance, TB-HIV) | ✅ |
| NangCap15 | RIS 21 features + PACS 4/5 (mobile app hardware) + 30 specialty EMR forms | ✅ 25/26 |
| NangCap16 | EMR Management BV Cam Ranh (10 features) | ✅ 36/36 |
| NangCap17 | Asset/Tender + IVF Lab + Training Research + 10 Medinet modules | ✅ |
| NangCap18 | (xem entity file `NangCap18Entities.cs`) | ✅ |
| NangCap19 | TTYT Quảng Hòa Cao Bằng (4 patient portal features) | ✅ 73/73 software |
| NangCap20 | LIS-HIS (6 sub-modules + Pathology + Culture Stock) | ✅ 27/28 |
| NangCap21 | HIS Đám Mây 3 Cấp (Trạm YT → Huyện → Tỉnh) | ✅ |
| NangCap22 | BV Đắk Nông tender (13 master catalogs) | ✅ |
| NangCap23 | HSMT BV Đa khoa (9 gaps đóng end-to-end) | ✅ 39/39 |

### 3.6 Medinet (10 modules) — ✅ HOÀN THÀNH

Giám định Y khoa, Y học cổ truyền, Sức khỏe sinh sản, Sức khỏe tâm thần,
Môi trường y tế, Sổ chấn thương, Dân số-KHHGĐ, Truyền thông GDSK,
Quản lý hành nghề, Chia sẻ dữ liệu liên viện. Toàn bộ wired backend +
frontend.

### 3.7 Supplementary (9 modules) — ✅ HOÀN THÀNH

Follow-up, Procurement, Immunization, Health Checkup, Epidemiology,
School Health, Occupational Health, Methadone Treatment, BHXH Audit.

---

## 4. UI status (v1 vs v2 vs Mobile)

### 4.1 v1 (Antd Pro-like, MainLayout) — 121 routes

✅ **100% backend-wired** (không còn mock array hardcoded sau Session 14 + 27).

### 4.2 v2 (Terminal + ab-* design pack) — 121 routes

✅ **100% native bespoke** — không còn `WrapV1` passthrough.
✅ Toàn bộ pages dùng `_v2kit.tsx` primitives hoặc bespoke nâng cao.
✅ Design pack đã port: `terminal.css` + `ab-module.css` từ
`design-system/project/`.

**Phân loại v2 pages**:

| Loại | Số lượng | Pattern |
|---|---|---|
| Tier B bespoke (clinical core) | 17 | Foundation tokens + bespoke layout |
| Hand-bespoke (`Reports`, `Finance`, `EmergencyDisaster`, `HR`, …) | ~12 | Custom CSS classes (`reports-v2-`, `er-v2-`, `hr-v2-`) |
| `SimpleV2Page<T>` helper-driven | ~40 | KPI + Toolbar + Tabs + Table + Drawer (~70 LOC) |
| Templated `_GenericListPage` (legacy) | 0 | (đã refactor hết) |

### 4.3 Mobile

- `MobileHome.tsx` standalone landing
- Hầu hết page responsive qua media queries trong `MainLayout.tsx` (mobile drawer sidebar <768px, tablet auto-collapse 768-1024px)

---

## 5. Test coverage

### 5.1 Backend

- API smoke tests: 41/41 workflow + 22 NangCap23 endpoints
- Health check endpoints: `/health`, `/health/live`, `/health/ready`, `/health/details`, `/health/schema-drift`

### 5.2 Frontend (Cypress)

- **820+ tests across 60+ specs** (lần audit gần nhất Session 39 cho thấy 100/100 luồng nghiệp vụ trong `architecture/data-flow.md` đều có spec)
- Spec file gốc: `console-errors.cy.ts`, `deep-controls.cy.ts`, `real-workflow.cy.ts`, `all-flows.cy.ts`, `user-workflow.cy.ts`, `manual-user-workflow.cy.ts`, `form-interactions.cy.ts`, `click-through-workflow.cy.ts`, `emr.cy.ts`, `nangcap23-pages.cy.ts`, …

### 5.3 Frontend (Playwright)

- **255 tests across 30+ specs** + production smoke (`e2e-prod/`)
- 5 skipped là HL7Spy port 2576 connectivity tests
- 3 pending USB Token Cypress tests (Windows PIN dialog blocks headless)

### 5.4 Production smoke

- `e2e-prod/v2-design-conformance.spec.ts`: 121 routes audit (Last: 0 API failures, 0 console errors)
- `e2e-prod/v2-interactive-audit.spec.ts`: row click + search + tab switch
- `e2e-prod/cornerstone-phase{1,2,3}.spec.ts`: PACS smoke
- `e2e-prod/smoke.spec.ts`: 4 prod smoke (health, login, previously-500 endpoints, 24-page sweep)

---

## 6. Production deploy state

| Layer | URL / ID | Trạng thái |
|---|---|---|
| Frontend (Vercel) | `https://his-psi.vercel.app` | ✅ Live, auto-deploy on push |
| Backend (Cloud Run) | `his-api-694913628964.asia-southeast1.run.app`, revision `his-api-00027-cjw` | ✅ Live |
| Database (Cloud SQL) | SQL Server `10.39.0.3`, db `HIS` | ✅ Live, restored from local Docker BAK |
| PACS (Oracle VM) | `https://168-110-52-7.nip.io` (Orthanc + Caddy) | ✅ Live, 135-slice CT test data uploaded |
| PACS storage (R2) | `his-pacs-dicom` bucket | ✅ Live |
| Telemedicine Jitsi | `https://161-33-180-17.nip.io` | ✅ Live (recording chờ Jibri ARM capacity) |
| Email (SMTP) | (env) | ✅ Live (dev fallback log OTP) |
| SMS (eSMS.vn/SpeedSMS.vn) | (env) | ✅ Live |
| Schema drift | `missingCount: 0` | ✅ Clean |

---

## 7. External integration status

| Integration | Trạng thái | Switch production |
|---|---|---|
| BHXH XML 4.0 | Mock + real HTTP code wired | Set `BhxhGateway:UseMock=false` + URL |
| Đơn thuốc QG | **Mock only** | Comment `TODO: HTTP POST` ở `NangCap23Services.cs:197` |
| Dược QG (CV 2406) | **Mock only** | Wire HTTP POST khi Cục QLD công bố sandbox |
| Đề án 06 | **Mock only** | Wait Bộ CA cấp credential |
| Zalo OA / ZNS | **Mock only** | `NangCap23Services.cs:1644` — chờ Zalo OA template approval |
| HL7 v2 LIS | ✅ Live | TCP listener port 2576 |
| HL7 FHIR R4 | ✅ Live | 22+ endpoints |
| HL7 CDA R2 | ✅ Live | |
| DICOM C-STORE | ✅ Live | Orthanc Oracle VM |
| DQGVN | ✅ Live | |
| USB Token (CryptoAPI) | ✅ Live | Windows dialog PIN |
| USB Token (Pkcs11) | ⚠️ Wired, need hardware E2E | |
| SMS Gateway | ✅ Live | |
| Email (SMTP) | ✅ Live | |
| Smart Card writing | ❌ Stub only | `ReceptionCompleteService.cs:2906` |

---

## 8. Known gaps

### 8.1 Tính năng còn dở

- ❌ **Smart card writing**: stub `// TODO: Implement smart card writing` tại
  `ReceptionCompleteService.cs:2906`. Cần SDK của vendor smart card reader.
- ⚠️ **USB Token Pkcs11Interop end-to-end**: code có sẵn (`Pkcs11SessionManager`,
  `Pkcs11ExternalSignature`) nhưng chưa test với token vật lý production.
- ⚠️ **5 cổng quốc gia ở mock mode** (xem [#7](#7-external-integration-status)).

### 8.2 v2 page TODO buttons

25 button placeholder `message.info('TODO: ...')` ở các trang v2:
`Inpatient`, `Pharmacy`, `BloodBank`, `EMR`, `Billing`, `Insurance`,
`Consultation`, `Telemedicine`, `Prescription`, `Radiology`, `Reception`,
`Laboratory`, `Quality`, `FollowUp` (xem TECH_DEBT.md mục 3).

Đây không phải logic bị thiếu — backend đã có endpoint, frontend v1 đã có
modal wizard. Chỉ là v2 chưa wire button → workflow handler tương ứng.

### 8.3 Production data state

- Patient-portal endpoint filter `AccountId == currentUserId` strict → admin
  browse trống ở 5 endpoint còn lại (Session 2026-04-29 fix một phần).
- v2 page templates trên prod: 76/84 (90%) có data. 8 còn lại empty là do
  rendering bug / filter mismatch (xem CLAUDE.md Session 2026-04-21 chi
  tiết).

### 8.4 Tối ưu chưa làm

- React Query underused — hầu hết page tự useState + axios. Refactor sẽ cải
  thiện caching + retry behavior.
- Bundle size: vendor-cornerstone chunk ~3 MB / 830 KB gzipped (chấp nhận
  được, nhưng chỉ DicomViewer cần). Chunk warnings trong build vẫn xuất
  hiện.
- Cloud Run autoscaling: chưa cấu hình min instances → cold start ~3–5s
  cho user đầu tiên sau idle.

---

## Liên kết

- **ROADMAP.md** — kế hoạch tiếp
- **TECH_DEBT.md** — debt chi tiết
- **API_FLOW.md** — sequence chính
- `CLAUDE.md` — session log (lịch sử chi tiết các phase phát triển)
- `roadmap/nangcap-phan-tich.md` — phân tích phân hệ vs requirement HSMT
