# Kiểm kê v1 ↔ v2 — bản đồ chuyển đổi (Phase 0 của #352)

> **Issue:** #353 (Phase 0 của epic #352 — chuyển đổi v1→v2). **Read-only** — không sửa code.
> **Feed:** quyết định #204 (sunset/xóa v1) cần bảng parity này ở pre-flight.
> **Ngày:** 2026-06-28. **Phương pháp:** route-map chính xác (App.tsx) + đọc thực tế từng cặp v1/v2 (kể cả editor vệ tinh) bằng 7 subagent song song, chấm parity bảo thủ (bias Partial khi chưa chắc — vì feed quyết định XÓA).

## 0. Tóm tắt số liệu (đo thực tế 2026-06-28)

| Nhóm | Số lượng | Nguồn |
|---|---|---|
| **Cặp trùng tên v1↔v2** (cùng basename `pages/` ∩ `pages-v2/`) | **117** | `comm -12` |
| **v1-only** (page v1 không có cặp v2 cùng tên) | **32** (7 top-level + 25 subdir) | `comm -23` + `find pages -mindepth 2` |
| **v2-only** (page v2 không có cặp v1 cùng tên) | **39** | `comm -13` |
| pages-v2 top-level `.tsx` | 156 | `ls` |
| pages v1 top-level `.tsx` | 124 | `ls` |

> Issue ước "31 v1-only" — số đo thực = **32** (7+25). Khác biệt nhỏ do đếm helper.

## 1. Phát hiện kiến trúc (định khung mọi phân tích)

1. **Hai cây route active song song** trong `App.tsx`:
   - **v1** dưới `/` (`MainLayout`) — ~115 route.
   - **v2** dưới `/v2/*` (`TerminalLayout`) — ~150 route.
2. **v2 là UI MẶC ĐỊNH**: `HomeEntry` redirect `/` → `/v2/dashboard`; v1 chỉ hiện khi `localStorage.layoutMode==='v1'` (App.tsx:335-340).
3. **Comment App.tsx:507-510 đã STALE** (mô tả lối cũ "v1 content trong shell v2"): thực tế mọi route `/v2/*` trỏ component `pages-v2/*` **native** (`ab-*` design pack), dòng 542 ghi rõ "no v1 fallback".
4. **★ v2 PHÂN RÃ trang monolithic v1** thành *list-shell + editor + sub-page* riêng → **line-count của 1 file v2 KHÔNG phản ánh parity**. Các cặp phân rã đã biết:
   - `OPD` (list) → `OpdEditor` (`/v2/opd/edit`, form khám đầy đủ)
   - `Prescription` → `PrescriptionEditor` (`/v2/prescription/edit`)
   - `EMR` → `EmrEditor` (`/v2/emr/edit`) + `EmrExtract` + `EmrDataTags`
   - `Billing` → `BillingEditor` (`/v2/billing/edit`)
   - `SystemAdmin` v1 dùng 16 file `pages/system-admin/*Tab`; v2 gộp 4 tab + tách phần còn lại thành **page v2 standalone**.
   - `OPD` v1 dùng 5 `pages/opd/tabs/Tab*`; v2 gộp trong `OpdEditor`.

## 2. Bảng parity 117 cặp (v2 list + editor vệ tinh vs v1)

> Parity: **Full** = v2 phủ mọi capability lớn của v1 · **Partial** = thiếu ≥1 feature đáng kể (liệt kê) · **Stub** = placeholder mỏng (list-only, không CRUD) · **None** = v2 rỗng/redirect/không route.
> `Conf` = mức tin (High đọc đủ / Med / Low). DELETE-candidate CHỈ lấy `Full` + `Conf High` (đã adversarial spot-check).

**Verdict batch (sơ bộ):** 64 Full · 40 Partial · 13 Stub. **Sau adversarial verify 33 Full (2 vòng refute-lens) → 19 bị HẠ** (15 §2b-2 + 4 §2b-3; RadiologyOps nghi-bug nhưng verify = false-alarm, giữ Full).
**→ TỔNG CUỐI (đã verify đủ nhóm rủi-ro): `45 Full · 58 Partial · 14 Stub · 0 None`** (đọc thực tế 117 cặp + vệ tinh). Trong 45 Full: **44 DELETE-safe** (14 adversarial-verified + 30 v2-superset) · **1 KEEP** (DicomViewer=dependency). Không còn nhóm 'chưa-verify' — Tier-2 đã soi xong (§2b-3/§2d).

### 2a. STUB (14) — v2 mới list/drawer read-only, CHƯA có CRUD → **PORT ưu tiên cao nhất**

| Page | v1→v2 dòng | v1 có, v2 THIẾU |
|---|---|---|
| HospitalPharmacy | 1405→123 | POS bán lẻ tạo đơn, tab kho/khách/ca/GPP/hoa hồng/báo cáo (v2 chỉ list 7 ngày) |
| Immunization | 562→293 | 3/4 tab: Campaigns(progress), AEFI reports, Statistics, lịch TCMR (v2 chỉ list+create) — *batch gắn Full, verify hạ Stub* |
| HivManagement | 1078→189 | modal enroll/lab/PMTCT, tab ART cascade stats |
| TbHivManagement | 888→153 | create/edit, follow-up modal, in thẻ điều trị |
| ChronicDisease | 666→137 | create/edit, follow-up, close/reopen/delete, print |
| OccupationalHealth | 604→139 | create/edit form khám, detail, tab stats/hazard |
| SchoolHealth | 525→133 | create/edit khám, detail, bulk class-exam upload |
| SmsManagement | 495→106 | tab dashboard (balance/stats), test-connection, test-send |
| MentalHealth | 293→147 | create case, PHQ-9 screening modal, assessment drawer |
| Screening | 292→148 | create (newborn+prenatal), detail/results, print, status tabs |
| MedicalForensics | 326→111 | create case, approve, in giấy chứng nhận, exam sub-list |
| CommunityHealth | 853→125 | household CRUD, NCD screening modal, tab health-teams |
| DoctorPortal | 762→123 | **+ KHÔNG có route v2** (→ Navigate mobile); thiếu tab inpatient/ký-số/lịch trực |
| MedicalSupply | (warehouse API)→110 | create/receive/adjust/transfer (v2 read-only) |

### 2b. PARTIAL (40) — v2 có core nhưng thiếu feature đáng kể → **PORT bổ sung**

| Page | v1 có, v2 THIẾU |
|---|---|
| OPD-area `EMR` | partograph, phiếu mê (anesthesia), amendment audit-log, completeness-check (v2 EmrEditor 930L) `Conf Med` |
| `Surgery` | create-request, schedule-OR, start-surgery forms, SurgeryDrawingPad, in MS06/BV-02 |
| `Billing` | ReassignObject/ApplyDiscount/PartialRefund/QR modal; deposit/refund/e-invoice create (P2 read-only) |
| `Insurance` | XML export QĐ4210, tab batch mgmt, approve/lock claims |
| `MasterData` | tab occupations/genders/admin-divisions, Excel import; services+ICD v2 read-only |
| `Inpatient` | DischargeModal chưa wire, nursing/progress notes, supply order, deposit check, bed transfer, prints |
| `Pharmacy` | dispensing drawer (multi-line+print), inventory scanner+sync, inter-ward transfers, clinical-pharmacy sub-tab |
| `Reports` | report-runner đầy tham số, tab Reconciliation, ReportBuilder, 3 NC10 tabs |
| `SystemAdmin` | tab ITTickets/Notifications/Sessions/LockedServices/AccessMatrix/Compliance/EmrAdmin/Branches (xem §3b — một số đã tách page v2) |
| `Finance` | tab revenue-by-dept, expense mgmt(+print), insurance reconcile, surgery-profit |
| `LISConfig` | tab TestParameters, ReferenceRanges, AnalyzerMapping (CSV import) |
| `Nutrition` | NRS-2002 screening, diet-plan builder, multi-tab dashboard |
| `Radiology` | remote-DICOM config drawer, result-template CRUD tab, DICOM tags tab |
| `Consultation` | inline create-session, discussion/minutes, QR, start/end/join |
| `Epidemiology` | tab stats, notifiable-diseases/contact-tracing, full outbreak UI |
| `MedicalRecordArchive` | tab Review (tree viewer), Handover, Archive decode/retrieval |
| `BloodBank` | gelcard compatibility-test workflow |
| `Quality` | audit scheduling CRUD, investigation update form, audit-checklist |
| `Rehabilitation` | tab session-schedule, session CRUD, exercises tab, assessment+plan modals |
| `SatisfactionSurvey` | survey template CRUD (question builder), tab config |
| `TrainingResearch` | tab NCKH research (deferred), cert issuance, clinical-directions CRUD, enroll modal |
| `HR` | employee CRUD, tab contracts/leave/overtime/awards, HR reports (v2 chỉ rota) |
| `PatientPortal` | **+ KHÔNG có route v2 staff**; family/reminders/health/feedback/Q&A modals + tabs |
| `AssetManagement` | tab Tenders/procurement (gói thầu) |
| `BookingManagement` | tab doctor-schedules CRUD, tab daily stats |
| `EndpointSecurity` | tab software inventory, incident create+resolve |
| `Microbiology` | add-organism modal, AST (kháng sinh đồ) modal |
| `EnvironmentalHealth` | tab biosafety |
| `IvfLab` | tab IVF Cycles, full Cryopreservation |
| `Procurement` | create-request, suggestions/cart (v2 read-only) — XSED v2 `ProcurementRequests` |
| `ReproductiveHealth` | create/edit prenatal, tab family-planning (v2 read-only) |
| `InfectionControl` | tab hand-hygiene observation, outbreak, investigation-update, print |
| `EmergencyDisaster` | command center, activity log, resource summary, event history, print MCI |
| `Equipment` | add-equipment CRUD, repair request modal, in thẻ thiết bị |
| `LabQC` | tab QC reports |
| `MethadoneTreatment` | flow enroll-new-patient |
| `Pathology` | create result modal, status tabs, print |
| `Telemedicine` | in-app consult modal (camera/mic/end-session); new-booking redirect ngoài |
| `WorkloadReport` | per-tab Excel export (v2 chỉ CSV) — *minor* |
| `Help` | category-grid UX, article CRUD (BE absent → cả 2 thiếu) `Conf Med` |

### 2b-2. ⚠ 15 trang batch gắn "Full" nhưng ADVERSARIAL VERIFY HẠ (audit-trail — chống false-Full feed nhầm DELETE)

> Đây là 14 trang bổ sung vào Partial (+ Immunization → Stub §2a). Pattern: batch-agent gắn Full cho trang có list+vài action dù **thiếu tab/feature thứ cấp**.

| Page | Batch→Verify | v1 có, v2 THIẾU |
|---|---|---|
| OPD | Full→**Partial** ⚠ | **AI-CDS/EWS-NEWS2, PatientFlagBanner, BusinessAlertPanel, cảnh báo thuốc-đang-dùng, supply-template(F10), in phiếu ngoại trú(giấy nghỉ BHXH), auto-save** — *core khám ĐÃ port qua OpdEditor* |
| Prescription | Full→**Partial** ⚠ | **liều theo cữ sáng/trưa/chiều/tối**, save-as-template, in phiếu công khai thuốc MSS-01, BHYT rx-type, PatientFlagBanner — *core kê ĐÃ port* |
| Reception | Full→**Partial** | in phiếu MS03/BV-02, barcode label print, BHXH-history modal, CCCD validation — *core tiếp đón ĐÃ port (12 satellite)* |
| Laboratory | Full→**Partial** | form nhập KQ thủ công, barcode label print, ký-số inline per-result — *core LIS ĐÃ port* |
| MedicalRecordPlanning | Full→**Partial(severe)** | **5 tab thiếu**: Transfer/Borrow/Handover/Outpatient/Attendance (v2 chỉ cấp-mã BA) |
| HealthExchange | Full→**Partial** | **6/7 tab**: insurance-XML-submit, e-referral, teleconsult, FHIR-R4, national-rx-portal, provincial-report |
| SigningWorkflow | Full→**Partial** | batch approve, stats tab (getSigningStats), overdue/duplicate alerts, doc-type filter |
| BhxhAudit | Full→**Partial** | tab Cổng-giám-định (auditor CRUD + PDF viewer), date-range/payment filter, batch approve |
| TreatmentProtocol | Full→**Partial** | step-editor modal, approve action, newVersion, ICD/dept filter, print |
| HealthCheckup | Full→**Partial** | tab Campaign (CRUD+group), Excel import, tab Báo cáo |
| FoodSafety | Full→**Partial** | tab Inspections (A/B/C/D grading), tab Statistics, samples-by-incident |
| Dashboard3Cap | Full→**Partial** | tab Branch-Tree (visual), date picker, duty month/year selector + calendar |
| FollowUp | Full→**Partial** | actions xác-nhận-đến(st2)/không-đến(st3), appointment-type filter, 4-tab date-scope, date-range picker |
| PaymentReports | Full→**Partial** | Excel export (→CSV only), per-tab Statistic cards — *minor; v2 +BC8 pharmacy* |
| Immunization | Full→**Stub** (→§2a) | 3/4 tab: Campaigns/AEFI/Statistics + lịch TCMR |

### 2b-3. Tier-2 verify (vòng-2, 2026-06-30) — 4 trang batch-Full HẠ Partial

> 16 trang Tier-2 (batch-Full, v2<v1) đã soi đối-chứng: **12 giữ Full** (vào §2c-A) · **4 HẠ Partial** dưới đây. (RadiologyOps ban đầu nghi-bug → verify ra FALSE ALARM, giữ Full — ghi-chú dưới.)

| Page | Verdict | v1 có, v2 THIẾU |
|---|---|---|
| HealthEducation | Full→Partial | tab Tài-liệu (HealthMaterial CRUD), date-range filter |
| SampleTracking | Full→Partial | tab Theo-đợt (batches), tab Thống-kê, barcode scanner, timeline modal, createRejection |
| StockReport | Full→Partial | cột reservedQuantity + importPrice (detail+summary) — *minor* |
| DispensingCounter | Full→Partial | mất `PharmacyExpiryBanner` (cảnh báo HSD thuốc) — *minor safety-notice* (cũng thiếu ở InpatientDispensing nhưng trang đó vẫn Full) |

> ✅ **RadiologyOps — VERIFY: FALSE ALARM, giữ Full (§2c-A):** verifier nghi "endpoint mismatch → dropdown rỗng". Đối chiếu BE: v2 gọi `/catalog/paraclinical-services?serviceType=3` + `/catalog/medical-supplies` — **cả hai TỒN TẠI** (`SystemCompleteController.Catalog.cs`); convention numeric **2=LIS, 3=Radiology** (seed `93_seed_lis_test_parameters.sql`: `Services.ServiceType=2`=LIS; `LisCatalogAdmin` dùng `serviceType=2`). v1's `/catalog/services` **KHÔNG còn ở BE** → v1 mới là bản endpoint-chết; v2 ĐÚNG (đang chạy prod). Chỉ còn UX-nit minor (re-pick request cần bấm "Bỏ chọn"). → **không phải bug, không cần fix-issue.**

### 2c. FULL (45) — v2 phủ đủ capability lớn → **DELETE-candidate** (đã verify đủ nhóm rủi-ro)

**A · DELETE-safe — adversarial-verified (14):** đọc đối-chứng xác nhận v2 phủ đủ:
`ClinicalGuidance`, `PharmacyApproval`*(thiếu Excel export), `ConsultationRegister`, `ServiceRequeue`, `ReceiptBookAdmin`, `PaymentTransactions`, `BhxhConfig`, `ObservationStay`, `DigitalSignature`, `VideoConsultation`, `InpatientDispensing`, `NonDicomCapture`, `EmployeeProfile`, `RadiologyOps`*(endpoint v2 đúng — verify §2b-3; còn UX-nit re-pick minor).

**B · DELETE-safe — v2-superset (30):** v2 ≥ v1 dòng (rewrite lớn hơn, rủi ro rớt feature thấp; **smoke trước khi xóa**, chưa đọc sâu từng trang):
FinanceCatalogs, ClinicalCatalogs, PharmacyCatalogs, ParaclinicalCatalogs, ReportCatalogs, CatalogsAdmin, SpecialtyEMR, RisAdmin, RisCatalogAdmin, LisCatalogAdmin, SampleReceive, SampleStorage, ReagentManagement, CultureCollection, CentralSigning, Dashboard, TraditionalMedicine, PopulationHealth, InterHospitalSharing, LinenManagement, DeAn06Liaison, TraumaRegistry, NationalGateways, PracticeLicense, RisDispatcher, ClinicalPharmacyCheck, QualityDashboardLive, FunctionalDiagnostics, ZaloNotifications, OfficeSupplyApproval.

**KEEP (1):** `DicomViewer` — Full nhưng v2 = wrap v1 19 dòng → **v1 LÀ DEPENDENCY, KHÔNG xóa**.

### 2d. Adversarial verification (7 verifier agent, refute-lens) — kết quả

Batch-agent (Sonnet) **gắn Full quá rộng** (Full cho mọi trang có list+vài action dù thiếu tab thứ cấp). Re-check refute-lens trên Full rủi-ro-cao (v2 nhỏ hơn v1 / phụ thuộc vệ tinh):
- **Vòng-1 — 17 Full rủi-ro-cao** (A: 7 low-ratio · C: 4 · B: 6 decomposed — B đọc **2 lần độc lập**, consensus FACTS, khác ngưỡng → chọn diễn giải bảo thủ): **15/17 bị HẠ** (§2b-2).
- **Vòng-2 — 16 Full shrunk-band** (v2<v1, verifier D2/E2 ngày 2026-06-30): **4/16 bị HẠ** (§2b-3), 12 confirmed (RadiologyOps nghi-bug → verify FALSE ALARM, giữ Full).
- **Tổng: 33 Full verified → 19 HẠ · 14 confirmed** (§2c-A) ⇒ line-count + batch-verdict KHÔNG đáng tin một mình; refute-lens là cần thiết (false-Full ~58%).
- **30 Full v2-superset (v2 ≥ v1)** chưa đọc sâu từng trang nhưng rủi ro thấp (rewrite lớn hơn) → §2c-B, smoke trước khi xóa.

> 🔴 **PATIENT-SAFETY REGRESSION — ĐÃ XÁC MINH bằng grep → đã mở issue fix #357 (P0):**
> `PatientFlagBanner` + `BusinessAlertPanel` **chỉ** được import ở **v1** (`pages/OPD,Prescription,EMR,Inpatient,Billing`) — **KHÔNG xuất hiện ở bất kỳ `pages-v2/*` NÀO, cũng KHÔNG ở `layouts/terminal/` shell**. Nghĩa là luồng **khám / kê-đơn / nội-trú / viện-phí v2 MẤT** banner cờ bệnh nhân (dị ứng/cảnh báo) + panel cảnh báo nghiệp vụ so với v1. Cộng thêm OpdEditor/PrescriptionEditor thiếu AI-CDS/NEWS2 · cảnh báo thuốc-đang-dùng · **liều theo cữ S/T/C/Tối** · in phiếu công khai thuốc MSS-01.
> → **REGRESSION an-toàn-bệnh-nhân v2 vs v1 (P0)** — PHẢI khôi phục TRƯỚC khi v2 thay v1 ở các luồng này. *(Phát hiện từ inventory #353; đề xuất tạo issue fix P0 liên kết — chờ user duyệt, chưa tự tạo.)*

## 3. v1-only (32) — phân loại + quyết định

### 3a. Top-level (7)

| Page | Route v1 | Nhóm | Quyết định |
|---|---|---|---|
| `Login.tsx` | `/login` | standalone-giữ | **KEEP** (màn login, không thuộc v1/v2 duality) |
| `PublicStudyViewer.tsx` | `/shared/:token` | standalone-giữ (public, không auth) | **KEEP** |
| `PublicEmrLookup.tsx` | `/tra-cuu-benh-an` | standalone-giữ (public) | **KEEP** |
| `QueueDisplay.tsx` | `/queue-display` | standalone-giữ (màn hình hàng đợi công khai) | **KEEP** |
| `AppointmentBooking.tsx` | `/dat-lich` | standalone-giữ (đặt lịch public) | **KEEP** (xác minh: có v2 `BookingManagement` khác mục đích — staff vs public) |
| `MobileHome.tsx` | `/mobile` (trong MainLayout) | standalone v1 | **KEEP / quyết-định-sản-phẩm** (grep: chỉ self-route ở App.tsx; route `/mobile` còn active; `pages-mobile/*` là app riêng khác mục đích) |
| `_CrudTab.tsx` | — (helper) | helper-not-page | **DROP cùng v1** (grep: vẫn được 5 v1 catalog page import — Clinical/Finance/Paraclinical/Pharmacy/ReportCatalogs) |

### 3b. Subdir (25) — tab/helper

| Nhóm | File | Số | Quyết định (đã grep xác nhận importer) |
|---|---|---|---|
| `opd/tabs/Tab*` | Allergies, Comorbidities, MedicalHistory, PhysicalExam, VitalSigns | 5 | **composed-in-v2 `OpdEditor`** (verify: OpdEditor có vital/history/exam/ICD) → **DROP** sau khi gỡ import v1 |
| `system-admin/*Tab` | AccessMatrix, Audit, Backup, Branches, Compliance, Configs, DataManagement, EmrAdmin, Health, Integration, ItTickets, LockedServices, Notifications, Roles, Sessions, Users | 16 | v2 `SystemAdmin` gộp **4** (users/roles/audit/config); tách standalone v2: Backup→`BackupManagement`, Integration→`HisConnections`; **còn ~10 tab (ITTickets/Sessions/AccessMatrix/Compliance/DataManagement/LockedServices/Notifications/Health/EmrAdmin/Branches) CHƯA có page v2 → PORT** (khớp SystemAdmin=Partial) |
| `reports/*Tab` | Nc10ReportTab, ReportBuilderTab | 2 | v2 `Reports`=Partial, **CHƯA** có ReportBuilder/NC10 → **PORT** (chưa DROP) |
| `*/statusTags` | inpatient, radiology | 2 | helper → grep: chỉ `pages/Inpatient`+`pages/Radiology` v1 import → **DROP cùng v1 parent** |

## 4. v2-only (39) — phân loại

| Nhóm | Page | Số | Ghi chú |
|---|---|---|---|
| **Module v2-native mới** (không có ở v1) | AdministrativeUnits, AdrReports, AnalyzerInbox, BackupManagement, BankPayments, BhytFullCoverage, BillingGuarantors, BiometricEnrollment, DicomAutoSend, DicomStudyAuditLog, EInvoices, EmrCloudSync, EmrHl7Export, FunctionalDiagnosticCatalog, HisConnections, Hl7MessageQueue, HrDecisions, KioskSelfService, ObstetricRegisters, OfficialDocuments, PayrollAdmin, PharmacyStockIn, PharmacyStockIssue, PharmacyStockTake, ProcurementRequests, ProvincialHealth, SpecialTestRuleAdmin, VppStockCard, WaitingTimeReport | 29 | một số là tách-ra từ tab admin v1 (BackupManagement←BackupTab, HisConnections←IntegrationTab) |
| **Satellite phân rã** (nửa-editor của page v1, KHÔNG phải module mới) | OpdEditor, PrescriptionEditor, EmrEditor, EmrExtract, EmrDataTags, BillingEditor | 6 | thuộc parity của OPD/Prescription/EMR/Billing |
| **Standalone portal** (route + login riêng) | InspectorPortal, PatientPortalStandalone | 2 | KEEP riêng |
| **Hạ tầng / cover** (không phải page) | `_v2kit` (design pack), `ModuleIndex` (cover 16-module) | 2 | không tính là module |

## 5. Bốn danh sách hành động (kết quả Phase 0)

- **PORT — 72 trang** (v2 CHƯA đủ parity → bổ sung TRƯỚC khi sunset v1): **14 Stub** (§2a) + **58 Partial** (§2b + §2b-2 + §2b-3). Thứ tự ưu tiên:
  1. ⚠ **Patient-safety / clinical** trước: OPD, Prescription, EMR (banner an-toàn đã có #357; còn liều-theo-cữ/AI-CDS/print), MedicalRecordPlanning (5 tab), HospitalPharmacy, Inpatient, Pharmacy, Insurance.
  2. **Stub lâm sàng no-CRUD**: HivManagement, TbHivManagement, ChronicDisease, MentalHealth, Screening, OccupationalHealth, SchoolHealth, MedicalForensics, CommunityHealth, Immunization…
  3. **Minor** sau cùng: WorkloadReport, PaymentReports (Excel), StockReport, DispensingCounter (PharmacyExpiryBanner), HealthEducation, SampleTracking, Help.
- **DELETE-candidate — feed #204** (44, chỉ sau khi smoke từng trang): **A · 14 adversarial-verified** + **B · 30 v2-superset** (smoke trước). ⛔ KHÔNG xóa `DicomViewer` (v1=dependency); KHÔNG xóa bất kỳ Partial/Stub.
- **KEEP-standalone**: v1 — Login, PublicStudyViewer, PublicEmrLookup, QueueDisplay, AppointmentBooking, **DicomViewer (dependency)**, **MobileHome** (route `/mobile` còn active — quyết-định-sản-phẩm); v2 — InspectorPortal, PatientPortalStandalone.
- **DROP — RỖNG lúc này:** mọi helper v1 (`_CrudTab`, `*/statusTags`, `opd/tabs/*`, `reports/*Tab`, `system-admin/*Tab`) **đều còn được v1-parent page import** (grep xác nhận) → chỉ DROP được KÈM khi sunset v1 parent. KHÔNG có file drop độc-lập-an-toàn-ngay.

---
**Kết luận #353:** v2 parity **rộng nhưng NÔNG** — chỉ **44/117** v1 page xóa-an-toàn (14 verified + 30 superset); **72** cần PORT (rớt tab thứ cấp / print / banner an-toàn); **DROP-list rỗng** (helper buộc vào v1 parent). **#204 KHÔNG thể xóa hàng loạt v1.** Patient-safety regression đã xử lý qua **#357** (khôi phục banner 5 editor v2); residual feature-PORT (liều-theo-cữ / AI-CDS / print MSS-01) track ở §2b-2 + PORT. RadiologyOps endpoint-mismatch đã **VERIFY = false-alarm** (v2 đúng convention 2=LIS/3=Radiology, §2b-3).
**Cross-ref:** epic #352 · sunset #204 · fix #357 · roadmap `docs/architecture/his-roadmap/`.
**Trạng thái:** Phase 0 **DONE** (117 cặp đọc thực tế + adversarial verify 33 Full / 2 vòng). Build: không cần (chỉ doc).

## 6. Audit vòng-2 (2026-07-10) — NGOÀI tầng trang (chiều mà cách theo-cặp-trang bỏ sót)

> Câu hỏi: "còn chức năng nào ở v1 chưa chuyển sang v2 mà §1-5 không thấy?" — rà 6 chiều A-F, read-only, bằng chứng grep/đếm. Trạng thái trang (§2) KHÔNG đổi: 0 commit vào `pages/` từ 2026-06-28.

| Chiều | Kết quả | Task |
|---|---|---|
| A. File trang | ✅ kín — 149/149 có disposition; 72 PORT = #407(8)+#408(13)+#409(43)+#410(3)+đã-xong(5: b075c03×4, #361) | #407-#410 |
| B. Route v1 | ✅ kín — ~120 route MainLayout đều vào §2/§3; standalone KEEP; `/m/*` app riêng | — |
| C1. **Menu v2 thiếu** | 🔴 route v2 **165** vs menu `HIS_GROUPS` **126** (menu v1 = 115); **23 trang v1-menu vắng menu v2**, trong đó **14 mất hẳn lối vào** (0 menu + 0 deep-link; palette Ctrl+K cũng đọc HIS_GROUPS): clinical-pharmacy-check · lis-catalog-admin · non-dicom-capture · observation-stay · office-supply-approval · payment-reports · payment-transactions · receipt-book-admin · ris-admin · ris-catalog-admin · service-requeue · stock-report · video-consultation · workload-report; 9 chỉ-deep-link: bhxh-config/catalogs-admin/consultation-register/dispensing-counter/employee-profile/inpatient-dispensing(4)/radiology-ops/ris-dispatcher/sample-receive | **#411** (phối hợp #375 registry) |
| C2. **Topbar** | 🔴 `AiQueueBadge` (poll AI-queue 30s + SignalR `ai-queue-updated` + navigate viewer) chỉ có ở MainLayout | **#412** (phối hợp #380) |
| C3. Đã track sẵn | bell fake → #380 · dark-mode → #381 · palette mở rộng → #382 | — |
| D. Component chỉ-v1 (21 file, v2=0 import) | 8 cụm DicomViewer → #413 · 4 đã trong #409 (ApplyDiscount/PartialRefund/ReassignObject/SurgeryDrawingPad) · **8 bổ sung scope**: #407 += ClinicalTermSelector·DoctorLicenseBanner·VoiceDictation·StockReservationModal (OPD) + PatientTimeline·VoiceDictation (EMR — EmrEditor mới có visit-history đơn giản) + BirthCertificatePrint (Inpatient prints) · #409 += WebcamCapture (Reception chụp ảnh BN) + SampleSequenceToolbar (Laboratory) · 1 không cần: LabCancelChainMenu (v2 có bản riêng) | comment #407/#409 |
| E. DicomViewer | 🔴 `pages-v2/DicomViewer.tsx` = wrap 19 dòng import v1 — **import v1 cuối cùng từ pages-v2**, chặn Phase 3 | **#413** |
| F. Drift | ✅ inventory còn giá trị (pages/ đóng băng) | — |

**Bản đồ nhóm port sau audit: #407 · #408 · #409 · #410 · #411 · #412 · #413** → xong + smoke 44 DELETE-safe → mở lại #204 → Phase 3 gỡ `layoutMode==='v1'`.
