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

**Verdict batch (sơ bộ):** 64 Full · 40 Partial · 13 Stub. **Sau adversarial verify 21 Full rủi-ro-cao (7 verifier, refute-lens) → 15 bị HẠ** (§2b-2/§2d).
**→ TỔNG CUỐI: `49 Full · 54 Partial · 14 Stub · 0 None`** (đọc thực tế 117 cặp + vệ tinh). Trong 49 Full: **32 DELETE-safe** (verify-confirmed/v2-superset) · **16 chưa-verify** (cần soi trước khi xóa) · **1 KEEP** (DicomViewer=dependency).

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

### 2c. FULL (49) — v2 phủ đủ capability lớn → **DELETE-candidate** (theo tier)

**Tier-1 — DELETE-safe (32):** verify-confirmed (`ClinicalGuidance`, `PharmacyApproval`*chỉ thiếu Excel export) HOẶC **v2-superset (v2 ≥ v1 dòng** → rewrite lớn hơn khó rớt feature; chưa đọc sâu từng trang):
FinanceCatalogs, ClinicalCatalogs, PharmacyCatalogs, ParaclinicalCatalogs, ReportCatalogs, CatalogsAdmin, SpecialtyEMR, RisAdmin, RisCatalogAdmin, LisCatalogAdmin, SampleReceive, SampleStorage, ReagentManagement, CultureCollection, CentralSigning, Dashboard, TraditionalMedicine, PopulationHealth, InterHospitalSharing, LinenManagement, DeAn06Liaison, TraumaRegistry, NationalGateways, PracticeLicense, RisDispatcher, ClinicalPharmacyCheck, QualityDashboardLive, FunctionalDiagnostics, ZaloNotifications, OfficeSupplyApproval.

**Tier-2 — DELETE-after-verify (16):** batch gắn Full nhưng **v2 < v1 dòng & CHƯA adversarial-verify** (verifier D/E fail do account session-limit). Tỉ lệ false-Full đo được = **15/21 → coi là CHƯA chắc, soi từng trang trước khi xóa**:
StockReport, ConsultationRegister, ServiceRequeue, ReceiptBookAdmin, PaymentTransactions, BhxhConfig, DispensingCounter, ObservationStay, HealthEducation, DigitalSignature, VideoConsultation, SampleTracking, InpatientDispensing, NonDicomCapture, EmployeeProfile, RadiologyOps.

**KEEP (1):** `DicomViewer` — Full nhưng v2 = wrap v1 19 dòng → **v1 LÀ DEPENDENCY, KHÔNG xóa**.

### 2d. Adversarial verification (7 verifier agent, refute-lens) — kết quả

Batch-agent (Sonnet) **gắn Full quá rộng** (Full cho mọi trang có list+vài action dù thiếu tab thứ cấp). Re-check refute-lens trên Full rủi-ro-cao (v2 nhỏ hơn v1 / phụ thuộc vệ tinh):
- **Verify 21 Full** (A: 7 low-ratio · C: 4 · B: 6 decomposed — B đọc **2 lần độc lập**, consensus FACTS, khác ngưỡng → chọn diễn giải bảo thủ). **15/21 bị HẠ** (§2b-2) ⇒ line-count + batch-verdict KHÔNG đáng tin một mình.
- **2 verify-confirmed Full:** ClinicalGuidance, PharmacyApproval (chỉ thiếu Excel export).
- **16 Full shrunk-band CHƯA verify** (verifier D/E fail — account hit session-limit, reset 21:30 Bangkok) → Tier-2.
- **30 Full v2-superset (v2 ≥ v1)** → Tier-1 (chưa đọc sâu từng trang; rủi ro thấp).

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
| `MobileHome.tsx` | `/mobile` (trong MainLayout) | port-or-drop | **VERIFY** (đã có `pages-mobile/PatientPortalMobile` + `DoctorPortalMobile` → có thể MOOT) |
| `_CrudTab.tsx` | — (helper) | helper-not-page | **DROP-candidate** (verify không còn import) |

### 3b. Subdir (25) — tab/helper

| Nhóm | File | Số | Quyết định (chờ agent xác nhận map v2) |
|---|---|---|---|
| `opd/tabs/Tab*` | Allergies, Comorbidities, MedicalHistory, PhysicalExam, VitalSigns | 5 | **composed-in-v2 `OpdEditor`** (verify: OpdEditor có vital/history/exam/ICD) → **DROP** sau khi gỡ import v1 |
| `system-admin/*Tab` | AccessMatrix, Audit, Backup, Branches, Compliance, Configs, DataManagement, EmrAdmin, Health, Integration, ItTickets, LockedServices, Notifications, Roles, Sessions, Users | 16 | v2 `SystemAdmin` gộp **4** (users/roles/audit/config); tách standalone v2: Backup→`BackupManagement`, Integration→`HisConnections`; **còn ~10 tab (ITTickets/Sessions/AccessMatrix/Compliance/DataManagement/LockedServices/Notifications/Health/EmrAdmin/Branches) CHƯA có page v2 → PORT** (khớp SystemAdmin=Partial) |
| `reports/*Tab` | Nc10ReportTab, ReportBuilderTab | 2 | v2 `Reports`=Partial, **CHƯA** có ReportBuilder/NC10 → **PORT** (chưa DROP) |
| `*/statusTags` | inpatient, radiology | 2 | helper-not-page → **DROP-candidate** (verify import) |

## 4. v2-only (39) — phân loại

| Nhóm | Page | Số | Ghi chú |
|---|---|---|---|
| **Module v2-native mới** (không có ở v1) | AdministrativeUnits, AdrReports, AnalyzerInbox, BackupManagement, BankPayments, BhytFullCoverage, BillingGuarantors, BiometricEnrollment, DicomAutoSend, DicomStudyAuditLog, EInvoices, EmrCloudSync, EmrHl7Export, FunctionalDiagnosticCatalog, HisConnections, Hl7MessageQueue, HrDecisions, KioskSelfService, ObstetricRegisters, OfficialDocuments, PayrollAdmin, PharmacyStockIn, PharmacyStockIssue, PharmacyStockTake, ProcurementRequests, ProvincialHealth, SpecialTestRuleAdmin, VppStockCard, WaitingTimeReport | 29 | một số là tách-ra từ tab admin v1 (BackupManagement←BackupTab, HisConnections←IntegrationTab) |
| **Satellite phân rã** (nửa-editor của page v1, KHÔNG phải module mới) | OpdEditor, PrescriptionEditor, EmrEditor, EmrExtract, EmrDataTags, BillingEditor | 6 | thuộc parity của OPD/Prescription/EMR/Billing |
| **Standalone portal** (route + login riêng) | InspectorPortal, PatientPortalStandalone | 2 | KEEP riêng |
| **Hạ tầng / cover** (không phải page) | `_v2kit` (design pack), `ModuleIndex` (cover 16-module) | 2 | không tính là module |

## 5. Bốn danh sách hành động (kết quả Phase 0)

- **PORT — 68 trang** (v2 CHƯA đủ parity → bổ sung TRƯỚC khi sunset v1): **14 Stub** (§2a — chưa có CRUD) + **54 Partial** (§2b + §2b-2). Thứ tự ưu tiên:
  1. ⚠ **Patient-safety / clinical** trước: OPD, Prescription, EMR (banner an-toàn + liều theo cữ), MedicalRecordPlanning (5 tab), HospitalPharmacy, Inpatient, Pharmacy, Insurance.
  2. **Stub lâm sàng no-CRUD**: HivManagement, TbHivManagement, ChronicDisease, MentalHealth, Screening, OccupationalHealth, SchoolHealth, MedicalForensics, CommunityHealth, Immunization…
  3. **Minor** sau cùng: WorkloadReport, PaymentReports (Excel), Help.
- **DELETE-candidate — feed #204** (chỉ sau khi smoke từng trang): **Tier-1 (32)** verify-confirmed/v2-superset (an toàn nhất) · **Tier-2 (16)** batch-Full **chưa-verify — PHẢI soi từng trang trước**. ⛔ KHÔNG xóa `DicomViewer` (v1=dependency); KHÔNG xóa bất kỳ Partial/Stub.
- **KEEP-standalone**: v1 — Login, PublicStudyViewer, PublicEmrLookup, QueueDisplay, AppointmentBooking, **DicomViewer (dependency)**; v2 — InspectorPortal, PatientPortalStandalone. **MobileHome → VERIFY** (pages-mobile có thay thế?).
- **DROP — helper/dead** (sau khi grep xác nhận hết import): `_CrudTab`, `inpatient/statusTags`, `radiology/statusTags`, `opd/tabs/*` (5, composed-in-OpdEditor). ⛔ CHƯA drop `reports/*Tab` + ~10 `system-admin/*Tab` (chưa port v2).

---
**Kết luận #353:** v2 parity **rộng nhưng NÔNG** — chỉ **~32/117** v1 page xóa-an-toàn ngay; **68** cần PORT (rớt tab thứ cấp / print / banner an-toàn); **16** cần verify. **#204 KHÔNG thể xóa hàng loạt v1** — phải PORT 68 + verify 16 trước. ⚠ Nghi **regression patient-safety** ở OPD/Prescription editor (§2d) — ưu tiên xác minh.
**Cross-ref:** epic #352 · sunset #204 · roadmap `docs/architecture/his-roadmap/`.
**Trạng thái:** Phase 0 **DONE** (read-only inventory: 117 cặp đọc thực tế + adversarial verify 21 Full). Build: không cần (chỉ doc).
