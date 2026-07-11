# Audit taxonomy API → modules (wave-2 STRICT-relocate, 2026-07-11)

> Kết quả audit 29 nhóm feature (workflow 29 agent, mỗi nhóm phân tích nghiệp vụ đầy đủ theo quy trình
> user chốt: business capability · workflow · menu · permission · API · DB table · đối chiếu roadmap
> `docs/architecture/his-roadmap/assets/data.js` (485 bảng/38 module) · tối đa 2 phương án · chỉ chọn khi đủ
> bằng chứng). Áp dụng cho `his-fe-convention §4a` — di dời **107 file** `frontend/src/api/*.ts` →
> `frontend/src/modules/<module>/api/`, viết lại **536 import specifier / 287 file**, xóa file gốc, KHÔNG barrel.

## 1. Phương pháp & nguồn bằng chứng

- **Roadmap `data.js`** = nguồn chuẩn bảng→module (hard-rule 3: bảng thuộc module roadmap nào thì file api đi theo module đó).
- **Backend**: controller/service/DTO namespace — xác nhận ranh giới domain.
- **FE**: route group (`router/routeConfigs/*.routes.ts`), menu group (`services/menu.service.ts`), consumer pages.
- **Đặt tên module**: ưu tiên **từ domain trong codebase** (tiền lệ `radiology` ≠ roadmap-id `ris`); chỉ dùng
  roadmap-id khi codebase đã dùng (vd `blood` → codebase quen `blood-bank`, `pubhealth` → `public-health`,
  `rehab` → `rehabilitation`, `tele` → `telemedicine`, `ipd` → `inpatient`, `immun` → `immunization`).
- Full recommendation từng nhóm: journal workflow `wf_1d744447-b46` (transcript phiên 1e53ef8d).

## 2. Bản đồ di dời cuối (107 file → 32 module)

| Module | File api (số lượng) |
|---|---|
| laboratory (12) | laboratory, lis, lisConfig, labQC, labCancelChain, sampleBatch, sampleStorage, sampleTracking, microbiology, cultureStock, reagent, screening |
| public-health (13) | communityHealth, schoolHealth, occupationalHealth, environmentalHealth, epidemiology, foodSafety, populationHealth, hivManagement, tbHivManagement, methadone, mentalHealth, chronicDisease, healthEducation |
| inpatient (9) | inpatient + inpatient/{_shared, admission, discharge-report, orders, prescription-nutrition, treatment, ward-bed}, observation |
| emr (8) | emrManagement, emrAdmin, specialtyEmr, publicEmr, cda, digitalSignature, centralSigning, signingWorkflow |
| administration (8) | hisConnector, dataExport, multiFacility, endpointSecurity, masterCatalog, functionalDiagnosticCatalog, provincialHealth, obstetricRegister |
| patient (8) | businessAlerts, dataInheritance, clinicalDecisionSupport, clinicalGuidance, clinicalNarratives, clinicalRecords, treatmentProtocol, clinicalTemplate |
| system (6) | healthExchange, interHospitalSharing, sms, audit, security, itTicket |
| reception (4) | reception, kiosk, appointmentBooking, bookingManagement |
| reports (4) | reconciliation, reporting, hospitalReport, workloadReport |
| asset (3) | equipment, assetManagement, procurement |
| insurance (3) | insurance, bhxhAudit, bhytFullCoverage |
| specialty (3) | ivfLab, reproductiveHealth, forensic |
| opd (2) | examination, multiSpecialtyExam |
| medical-record (2) | medicalRecordArchive, medicalRecordPlanning |
| telemedicine (2) | telemedicine, videoConsultation |
| quality (2) | quality, adrReport |
| mci (2) | traumaRegistry, massCasualty |
| hr (2) | medicalHR, practiceLicense |
| 1-file modules (14) | pathology · checkup (healthCheckup) · nutrition · rehabilitation · traditional-medicine (traditionalMedicine) · infection-control (infectionControl) · survey (satisfactionSurvey) · surgery · blood-bank (bloodBank) · training (trainingResearch) · immunization · portal (patientPortal) · pharmacy (warehouse) · billing (nangcap25) |

## 3. Nhóm hypothesis SAI (audit bác bỏ gộp)

Nhiều nhóm giả thuyết ban đầu bị audit chứng minh là **gộp sai domain** — đã tách theo bằng chứng:

- **system-infra (10 file)** → 3 nhà: sms/audit/security/itTicket → `system`; masterCatalog/functionalDiagnosticCatalog → `administration`; reporting/hospitalReport/workloadReport → `reports`.
- **surgery-cluster (4 file)** → 3 nhà: surgery → `surgery`; ivfLab → `specialty`; traumaRegistry+massCasualty → `mci`.
- **quality-safety (4 file)** → quality+adrReport → `quality`; infectionControl → `infection-control`; satisfactionSurvey → `survey`.
- **equipment-asset (4 file)** → equipment/assetManagement/procurement → `asset`; warehouse → `pharmacy` (kho dược).
- **integration-exchange (5 file)** → healthExchange/interHospitalSharing → `system`; hisConnector/dataExport/multiFacility → `administration`.
- **hr-training (3 file)** → medicalHR+practiceLicense → `hr`; trainingResearch → `training`.
- **patient-adjacent (3 file)** → patientPortal → `portal` (module riêng, roadmap id:'portal'); businessAlerts+dataInheritance → `patient`.
- **insurance-bhyt (5 file)** → 3 file vào `insurance` (KHÔNG gộp billing — rule không gộp để giảm số file); bhytReports+dqgvn DEFER.
- **publichealth-programs (10)** → 6 core+healthEducation → `public-health`; immunization → `immunization` (roadmap module riêng); còn lại theo map.
- **rehab-traditional** → 2 module riêng `rehabilitation` + `traditional-medicine` (user pre-decision, audit optB cho phép).

## 4. User overrides (ghi nhận quyết định)

- `traditionalMedicine` → **traditional-medicine** (user: module riêng).
- `forensic` → **specialty** (user: phân tích rồi quyết; roadmap đặt ForensicCases trong specialty, hội tụ cùng ivfLab+reproductiveHealth).

## 5. Ở lại `api/` root (6 file — shared infra)

`auth.ts` · `types.ts` · `health.ts` · `publicClient.ts` · `pdf.ts` · `abbreviation.ts` (6+ consumer xuyên module, chờ team ruling).

## 6. DEFER (7 file — cần quyết định riêng, KHÔNG di dời đợt này)

| File | Lý do |
|---|---|
| specimenImage.ts | dual-domain lab/patho, 0 live consumer |
| fhir.ts | interop util, không sở hữu bảng nào trong roadmap |
| bhytReports.ts | dead wiring — không có BE controller tương ứng |
| dqgvn.ts | 0 FE consumer (roadmap national) |
| nationalPrescription.ts | chưa được nhóm audit nào phủ — cần audit riêng |
| nangcap23.ts, nangcap24.ts | god-file đa module — cần SPLIT per-module trước khi dời |

## 7. Cấu trúc module chuẩn (template user — `modules/patient`)

Mỗi module theo đúng mẫu user tạo (bằng chứng transcript 2026-07-10):

```
modules/<module>/
  api/          # api client (đợt này)
  components/   # component domain
  hooks/  pages/  permissions/  services/  types/  validators/   # scaffold (.gitkeep khi rỗng)
  index.ts
```

33/33 module đã đủ cấu trúc (2026-07-11). Thư mục rỗng giữ `.gitkeep` để git track (nguyên bản là thư mục
trần untracked → từng bị mất không vết; .gitkeep chống tái diễn).

## 8. Gates đã qua (2026-07-11)

- Mover/rewriter idempotent (re-run = 0). `tsc -b --noEmit` **EXIT 0** · `vite build` **EXIT 0**.
- Content-equivalence 107/107 vs git HEAD (chỉ dòng import khác). Resolve-check 2580 specifier **PASS**.
- Sweep ngoài `frontend/src` (cypress/playwright/scripts/config/vi.mock) = **0 stale ref**.
- Workflow verify đối kháng 4 lens (dynamic-refs · importer-spotcheck · moved-integrity · scaffold-inertness) — kết quả ghi ở STATUS.md phiên 2026-07-11.
