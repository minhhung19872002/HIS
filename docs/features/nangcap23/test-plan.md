# NangCap23 — Test Plan tổng hợp

> **Mục đích:** Test plan chi tiết per-chức-năng cho gói nâng cấp 23. Mỗi chức
> năng gồm: mô tả nghiệp vụ, danh sách API, điều kiện test, dữ liệu test, các
> case + expected, edge case, regression impact.
> **Đối tượng dùng:** QA team + Dev review + Release manager.
> **Test runner:** Cypress (CRUD + flow + permission), Playwright (page-load smoke), Manual (UI/E2E).
> **Phạm vi:** 9 chức năng mới + 1 background job + 1 exception filter.
> **Tham chiếu:** [analysis.md](./analysis.md), [test-guide.md](./test-guide.md), [README.md](./README.md).
> **Last updated:** 2026-05-24

---

## Mục lục

- [1. Bảng tổng hợp chức năng ↔ API ↔ Test](#1-bảng-tổng-hợp-chức-năng--api--test)
- [2. Test plan per-chức-năng](#2-test-plan-per-chức-năng)
  - [2.1 National Prescription Gateway](#21-national-prescription-gateway-cổng-đơn-thuốc-qg)
  - [2.2 National Pharmacy Gateway](#22-national-pharmacy-gateway-cổng-dược-qg)
  - [2.3 Đề án 06 — Birth Certificate (GCS)](#23-đề-án-06--birth-certificate-gcs)
  - [2.4 Đề án 06 — Death Certificate (GBT)](#24-đề-án-06--death-certificate-gbt)
  - [2.5 Đề án 06 — Driving License Health Check (DLHC)](#25-đề-án-06--driving-license-health-check-dlhc)
  - [2.6 Linen Management](#26-linen-management)
  - [2.7 Sterilization Schedule](#27-sterilization-schedule)
  - [2.8 Functional Diagnostics](#28-functional-diagnostics)
  - [2.9 Zalo OA / ZNS Notification](#29-zalo-oa--zns-notification)
  - [2.10 Quality Dashboard](#210-quality-dashboard)
  - [2.11 Retry Background Worker](#211-retry-background-worker)
  - [2.12 Exception Filter + ConfigStore](#212-exception-filter--configstore)
- [3. Luồng test theo thứ tự thực tế](#3-luồng-test-theo-thứ-tự-thực-tế)
- [4. Checklist trước release](#4-checklist-trước-release)
- [5. Dữ liệu test cần chuẩn bị chung](#5-dữ-liệu-test-cần-chuẩn-bị-chung)

---

## 1. Bảng tổng hợp chức năng ↔ API ↔ Test

| # | Chức năng | Module | API endpoint chính | Test file |
|---|---|---|---|---|
| 1 | Submit đơn thuốc cổng QG | National Prescription Gateway | `POST /api/national-prescription-gateway/submit` | `nangcap23-flow.cy.ts` §3, §5; `nangcap23-pages.cy.ts` |
| 2 | Retry đơn thuốc | | `POST /api/national-prescription-gateway/{id}/retry` | `nangcap23-flow.cy.ts` §5 |
| 3 | Cancel đơn thuốc | | `POST /api/national-prescription-gateway/{id}/cancel` | Manual |
| 4 | Config gateway QG (Admin) | | `GET/POST /api/national-prescription-gateway/config` | `nangcap23-flow.cy.ts` §1, §2 |
| 5 | Test connection QG | | `GET /api/national-prescription-gateway/test-connection` | Manual / Staging |
| 6 | Generate báo cáo Dược QG | National Pharmacy Gateway | `POST /api/national-pharmacy/generate` | `nangcap23-flow.cy.ts` §3 |
| 7 | Retry báo cáo Dược QG | | `POST /api/national-pharmacy/{id}/retry` | Manual |
| 8 | Save / Submit Birth Cert (GCS) | Đề án 06 | `POST /api/de-an-06/birth-certificates` + `.../{id}/submit` | `nangcap23-pages.cy.ts` |
| 9 | Save / Submit Death Cert (GBT) | Đề án 06 | `POST /api/de-an-06/death-certificates` + `.../{id}/submit` | `nangcap23-pages.cy.ts` |
| 10 | Save / Submit DLHC + auto-compute | Đề án 06 | `POST /api/de-an-06/driving-license-checks` + `.../{id}/submit` | Manual + Cypress (TBD) |
| 11 | CRUD Linen Item | Linen Management | `GET/POST/DELETE /api/linen/items` | `nangcap23-flow.cy.ts` §7 |
| 12 | Linen Transaction state machine | Linen Management | `POST /api/linen/transactions/{id}/status/{newStatus}` | `nangcap23-flow.cy.ts` §7 |
| 13 | Sterilization Schedule state machine | Linen Management | `POST /api/linen/sterilization-schedules/{id}/status/{newStatus}` | Manual + Cypress page-load |
| 14 | CRUD Functional Diagnostic Test | Functional Diagnostics | `GET/POST/DELETE /api/functional-diagnostics` | `nangcap23-pages.cy.ts` |
| 15 | FDT Complete → Verify (4-eyes) | Functional Diagnostics | `POST /api/functional-diagnostics/{id}/complete` + `.../verify` | Manual |
| 16 | Send Zalo ZNS | Zalo OA | `POST /api/zalo-notification/send` | `nangcap23-flow.cy.ts` §5, §8 |
| 17 | Retry Zalo | Zalo OA | `POST /api/zalo-notification/{id}/retry` | `nangcap23-flow.cy.ts` §5, §8 |
| 18 | Zalo Config (Admin, sensitive mask) | Zalo OA | `GET/POST /api/zalo-notification/config` | `nangcap23-flow.cy.ts` §1, §7 |
| 19 | Quality Dashboard 5 view | Quality Dashboard | `GET /api/quality-dashboard/{clinic-queues, inpatient-by-dept, paraclinical, lab, revenue}` | `nangcap23-flow.cy.ts` §6 |
| 20 | Quality Dashboard full | Quality Dashboard | `GET /api/quality-dashboard?asOfDate=` | Manual |
| 21 | Retry Background Worker | Cross-cut | (không có endpoint — chạy auto) | Manual log inspection |
| 22 | Exception filter mapping | Cross-cut | (chạy ngầm qua mọi controller) | `nangcap23-flow.cy.ts` §8 |
| 23 | SSRF protection | Cross-cut | `POST /api/national-prescription-gateway/config` với badUrl | `nangcap23-flow.cy.ts` §2 |
| 24 | Race-safe config save | Cross-cut | 3× sequential `POST /config` | `nangcap23-flow.cy.ts` §7 |

Tổng: **24 chức năng** mapped tới **~55 endpoint** với **86 test case** đã được mã hóa
(Cypress `nangcap23-flow.cy.ts` 30+ case + `nangcap23-pages.cy.ts` 13 case +
`nangcap23-v1-pages.cy.ts` 14 case + Playwright 12+13 case).

---

## 2. Test plan per-chức-năng

### 2.1 National Prescription Gateway (Cổng Đơn thuốc QG)

**Module liên quan:** Prescription, Pharmacy, Audit Log, Notification (qua middleware), Patient, MedicalRecord, Medicine.
**Mô tả nghiệp vụ:** BS kê đơn thuốc → click "Gửi cổng QG" → backend serialize payload JSON theo QĐ 808/QĐ-BYT 2022, POST tới `donthuocquocgia.vn`, lưu kết quả + status.

**API liên quan (8):**
- `GET /api/national-prescription-gateway` — Search list (paginated)
- `GET /api/national-prescription-gateway/{id}` — Detail (kèm Payload/Response JSON)
- `POST /api/national-prescription-gateway/submit` — Submit
- `POST /api/national-prescription-gateway/{id}/retry` — Retry
- `POST /api/national-prescription-gateway/{id}/cancel` — Cancel
- `GET /api/national-prescription-gateway/config` — Get config (Admin)
- `POST /api/national-prescription-gateway/config` — Save config (Admin)
- `GET /api/national-prescription-gateway/test-connection` — Ping

**Điều kiện test:**
- BE chạy `http://localhost:5106` với `ASPNETCORE_ENVIRONMENT=Development` → `MockMode=true`
- Tài khoản test:
  - `admin / Admin@123` (role `Admin`)
  - 1 user role `Doctor` (cần seed thêm)
  - 1 user role `Nurse` (cần seed thêm)
  - 1 user role `Pharmacist` (cần seed thêm)

**Dữ liệu test cần chuẩn bị:**
- 1 `Prescription` đã có ≥1 `PrescriptionDetail` + `Medicine` link
- 1 `Prescription` rỗng (không có Detail) — để test "Đơn thuốc trống"
- `Patient` có `IdentityNumber`, `FullName`, `DateOfBirth`

**Test case (11):**

| # | Case | Body / Param | Expected status | Expected body |
|---|---|---|---|---|
| TC-NP-001 | Submit hợp lệ | `{prescriptionId, prescriptionType:"Outpatient", doctorIdNumber, doctorLicenseNumber}` | 200 | `status=2, gatewayTransactionId="MOCK-RX-..."` |
| TC-NP-002 | Submit thiếu PrescriptionId | `prescriptionId=00000000-0000-0000-0000-000000000000` | 400 | `error="VALIDATION_FAILED", message match /PrescriptionId/` |
| TC-NP-003 | Submit thiếu CCCD BS | `doctorIdNumber=""` | 400 | `error="VALIDATION_FAILED", message match /CCCD bác sĩ/` |
| TC-NP-004 | Submit thiếu license | `doctorLicenseNumber=""` | 400 | `error="VALIDATION_FAILED"` |
| TC-NP-005 | Submit invalid PrescriptionType | `prescriptionType="Unknown"` | 400 | `error="VALIDATION_FAILED", message match /PrescriptionType phải thuộc/` |
| TC-NP-006 | Submit đơn rỗng | (link tới `Prescription` không có Detail) | 400 | `error="INVALID_STATE", message="Đơn thuốc trống — không thể gửi cổng QG."` |
| TC-NP-007 | Submit prescription không tồn tại | `prescriptionId=<random guid>` | 404 | `error="NOT_FOUND"` |
| TC-NP-008 | Submit 2 lần cùng prescriptionId (sequential) | (chạy TC-NP-001 2 lần) | Lần 2 = 400 | `error="INVALID_STATE", message match /Đơn thuốc đã.../` |
| TC-NP-009 | Submit 2 lần cùng prescriptionId (race < 100ms) | (parallel via Cypress) | 1 lần 200, 1 lần 409 | 409 = `error="DUPLICATE"` |
| TC-NP-010 | Retry trên submission Status=2 | `POST /{id}/retry` | 400 | `error="INVALID_STATE", message match /đã được cổng xác nhận/` |
| TC-NP-011 | Retry vượt max | (gọi retry 4 lần liên tiếp) | Lần 4 = 400 | `error="INVALID_STATE", message match /vượt quá giới hạn/` |

**Edge case / Error case:**
- Gateway timeout 30s → Status=1, retry worker pick up sau StuckMinutes=5
- Gateway 5xx 3 lần liên tiếp → ErrorCode="NETWORK_ERROR", Status=1
- Gateway 4xx → ErrorCode="HTTP_4XX", Status=3 Rejected
- Circuit breaker mở sau 5 lỗi liên tiếp 30s → ErrorCode="CIRCUIT_OPEN"
- User cancel browser giữa submit (CancellationToken) → row giữ Status=1, response 499
- Phase 2 SaveChanges fail sau gateway ACK → log `[NANGCAP23-ALERT]` CRITICAL

**Regression impact:**
- Tạo Prescription bình thường (không submit cổng QG) → **không bị block**
- Module Pharmacy dispense từ Prescription đã submit → **không thay đổi behavior**
- Audit log middleware tự lưu UserId/Timestamp → verify trong `AuditLogs` table

---

### 2.2 National Pharmacy Gateway (Cổng Dược QG)

**Module liên quan:** Pharmacy / Warehouse, MedicineStock, Suppliers.
**Mô tả nghiệp vụ:** Dược sĩ generate báo cáo theo kỳ (DailySale/MonthlyInventory/NarcoticReport/Recall) → backend build XML theo CV 2406/QLD-Ttra 2018, POST tới `duocquocgia.com.vn`.

**API liên quan (5):**
- `GET /api/national-pharmacy` — Search list
- `GET /api/national-pharmacy/{id}` — Detail (kèm Payload/Response XML)
- `POST /api/national-pharmacy/generate` — Generate + Submit
- `POST /api/national-pharmacy/{id}/retry` — Retry
- `GET /api/national-pharmacy/test-connection` — Ping

**Điều kiện test:** BE Dev, user `Pharmacist` hoặc `Admin`.

**Dữ liệu test:**
- ≥1 `Pharmacy` (Warehouse) ID
- Stock data trong period để có items count > 0

**Test case (6):**

| # | Case | Body | Expected |
|---|---|---|---|
| TC-PH-001 | Generate hợp lệ | `{reportType:"DailySale", periodFrom:"2026-05-01", periodTo:"2026-05-02"}` | 200, `status=2, gatewayTicketNumber="MOCK-PH-..."` |
| TC-PH-002 | ReportType invalid | `reportType:"INVALID_X"` | 400 `VALIDATION_FAILED` |
| TC-PH-003 | PeriodFrom > PeriodTo | `from:2026-12-31, to:2026-01-01` | 400 `VALIDATION_FAILED, /PeriodFrom phải <= PeriodTo/` |
| TC-PH-004 | PeriodTo > today | `to:2099-01-01` | 400 `VALIDATION_FAILED, /vượt quá hôm nay/` |
| TC-PH-005 | Duplicate active report cùng (type, period) | (gen 2 lần với cùng key sau khi Status=2) | Lần 2 = 409 `DUPLICATE` (DB unique chặn) |
| TC-PH-006 | Retry report Status=2 | `POST /{id}/retry` | 400 `INVALID_STATE` |

**Edge case:**
- 0 items trong period → vẫn cho phép generate (ItemCount=0)
- XML escape special chars `&<>` trong tên thuốc → verify không break parse
- Permission Nurse → 403 (không cho `Roles=Admin,Pharmacist,PharmacyHead`)

**Regression impact:**
- Pharmacy module daily workflow (nhập xuất, kiểm kê) → **không bị ảnh hưởng**

---

### 2.3 Đề án 06 — Birth Certificate (GCS)

**Module liên quan:** OB/GYN, Patient (mẹ + bé), MedicalRecord, Department, User (BS/Hộ sinh).
**Mô tả nghiệp vụ:** Sau khi đẻ, khoa Sản tạo Giấy Chứng Sinh → save → submit Đề án 06 → cổng `gdbhyt.baohiemxahoi.gov.vn` ack.

**API liên quan (4):**
- `GET /api/de-an-06/birth-certificates` — Search (paginated, filter `da06Status`, date range)
- `GET /api/de-an-06/birth-certificates/{id}` — Detail
- `POST /api/de-an-06/birth-certificates` — Save (create / update)
- `POST /api/de-an-06/birth-certificates/{id}/submit` — Submit (Role: Admin, Doctor, Midwife)

**Điều kiện test:** Patient mẹ tồn tại trong DB.

**Test case (8):**

| # | Case | Field test | Expected |
|---|---|---|---|
| TC-GCS-001 | Save GCS mới đầy đủ | `{motherPatientId, birthDateTime, childGender:"Male", birthWeight:3.5, gestationalAgeWeeks:38, birthMethod:"Vaginal"}` | 200, `certificateNumber=GCS-{timestamp}`, `da06Status=0` |
| TC-GCS-002 | Save thiếu motherPatientId | (`motherPatientId=Guid.Empty`) | 400 `VALIDATION_FAILED` (qua DTO required) |
| TC-GCS-003 | Update GCS đã save | `{id:<existing>, childName:"Nguyễn Bé"}` | 200, giữ certificateNumber cũ |
| TC-GCS-004 | Submit GCS Status=0 | `POST /.../{id}/submit` | 200, `da06Status=2, da06SubmissionId="MOCK-GCS-..."` |
| TC-GCS-005 | Submit GCS đã Acked | (chạy TC-GCS-004 2 lần) | Lần 2 = 400 `INVALID_STATE` |
| TC-GCS-006 | Submit Nurse role | (Nurse JWT) | 403 |
| TC-GCS-007 | Submit Doctor role | (Doctor JWT) | 200 |
| TC-GCS-008 | Submit Midwife role | (Midwife JWT) | 200 |

**Edge case:**
- `BirthDateTime > now` → DTO không có validator riêng → backend không reject. **Nguy cơ tiềm ẩn**: nên thêm rule "BirthDateTime ≤ now + 1h".
- Twin/Triplet: `singletonOrMultiple=2/3` → cần tạo 2/3 record GCS riêng (UI/logic chưa enforce).

**Regression impact:**
- Module OB/GYN flow đẻ + hậu sản → **không bị block**
- Patient mẹ + Patient bé (Patient mới tạo) → vẫn lưu hợp lệ

---

### 2.4 Đề án 06 — Death Certificate (GBT)

**Module liên quan:** Inpatient, Discharge, Patient, MedicalRecord, ICD-10.

**Mô tả nghiệp vụ:** Khi BN tử vong, BS tạo Giấy Báo Tử → save → submit Đề án 06.

**API liên quan (4):** (tương tự GCS, thay `/birth-certificates` bằng `/death-certificates`)

**Test case (6):**

| # | Case | Field test | Expected |
|---|---|---|---|
| TC-GBT-001 | Save GBT mới | `{patientId, deathDateTime, mannerOfDeath:"Natural", primaryCauseIcd:"I50.0", certifyingDate}` | 200 |
| TC-GBT-002 | Save thiếu PatientId | | 400 |
| TC-GBT-003 | Submit GBT Status=0 | | 200, `da06Status=2, da06SubmissionId="MOCK-GBT-..."` |
| TC-GBT-004 | Submit Role Doctor | | 200 |
| TC-GBT-005 | Submit Role Midwife (không có quyền) | | 403 |
| TC-GBT-006 | Submit GBT đã Acked | (chạy TC-GBT-003 2 lần) | 400 `INVALID_STATE` |

**Edge case:**
- `MannerOfDeath="Suicide"/"Homicide"` → cần báo cáo cảnh sát (out of scope NangCap23, chỉ lưu metadata)
- `DeathDateTime` > `CertifyingDate` → không validate → cần thêm rule

**Regression impact:**
- Inpatient module discharge flow → **không bị block khi không submit GBT**

---

### 2.5 Đề án 06 — Driving License Health Check (DLHC)

**Module liên quan:** Examination (OPD), Patient.

**Mô tả nghiệp vụ:** BN khám sức khỏe lái xe → BS điền 48 trường (vision/hearing/neuro/psy/drug/alcohol) → backend auto-compute `EligibleToDrive` theo TT 24/2023 → submit Đề án 06.

**API liên quan (4):** (tương tự, `/driving-license-checks`)

**Dữ liệu test:** Patient đăng ký khám SK lái xe.

**Test case (12):**

| # | Case | LicenseClass | DrugPositive | AlcoholLevel | Vision/Hearing | Expected `EligibleToDrive` server compute |
|---|---|---|---|---|---|---|
| TC-DLHC-001 | A1, không test, khỏe | A1 | (chưa test) | (chưa test) | OK | **true** (hạng cá nhân permissive) |
| TC-DLHC-002 | B1, không test ma túy + cồn | B1 | (chưa test) | (chưa test) | OK | **false** (default-deny commercial) |
| TC-DLHC-003 | B1, test ma túy negative + cồn 30 mg | B1 | false | 30 | OK | **true** |
| TC-DLHC-004 | B1, ma túy positive | B1 | **true** | 30 | OK | **false** |
| TC-DLHC-005 | B1, cồn 50 mg (ngưỡng pháp lý) | B1 | false | **50** | OK | **false** (< 50 mới pass) |
| TC-DLHC-006 | B1, cồn 49.9 mg | B1 | false | 49.9 | OK | **true** |
| TC-DLHC-007 | C, color blind | C | false | 0 | ColorBlindNormal=false | **false** |
| TC-DLHC-008 | C, hearing fail | C | false | 0 | HearingNormal=false | **false** |
| TC-DLHC-009 | D, psy fail | D | false | 0 | PsychiatricNormal=false | **false** |
| TC-DLHC-010 | Save với client gửi `eligibleToDrive=true` (forged) cho B1 chưa test | B1 | (chưa test) | (chưa test) | OK | Server override → **false** (log INFO) |
| TC-DLHC-011 | Submit DLHC Status=0 → da06Status=2 | B1 | false | 0 | OK | 200, `da06SubmissionId="MOCK-DLHC-..."` |
| TC-DLHC-012 | Re-compute tại Submit (defense-in-depth) | B1 client gửi true nhưng DB record bị thay đổi sau Save | | | | Re-compute log "DLHC eligibility re-corrected at Submit" |

**Edge case:**
- F-class (F, FB, FC, FD, FE): coi là commercial (StartsWith "F")
- LicenseClass null/rỗng → `IsCommercialClass` trả false → behavior permissive (cần verify đây có phải intent không)
- AlcoholLevelMgPercent NULL + AlcoholTestPerformed=true → coi như 0 (chấp nhận)

**Regression impact:**
- Module Examination flow OPD bình thường → **không bị ảnh hưởng**

---

### 2.6 Linen Management

**Module liên quan:** KSNK (Infection Control), Department.

**Mô tả nghiệp vụ:** Quản lý danh mục đồ vải + giao/nhận với nhà giặt.

**API liên quan (8):**

LinenItem (4):
- `GET /api/linen/items` — list
- `GET /api/linen/items/{id}` — detail
- `POST /api/linen/items` — save (create / update)
- `DELETE /api/linen/items/{id}` — soft-delete

LinenTransaction (4):
- `GET /api/linen/transactions` — search
- `GET /api/linen/transactions/{id}` — detail
- `POST /api/linen/transactions` — save
- `POST /api/linen/transactions/{id}/status/{newStatus}` — change status

**Test case (10):**

| # | Case | Action | Expected |
|---|---|---|---|
| TC-LIN-001 | Save LinenItem mới | `{itemCode:"LIT-001", itemName:"Drap giường", category:"Bedding", currentStock:50}` | 200, `id` mới |
| TC-LIN-002 | Update LinenItem | `{id, itemName:"Drap mới"}` | 200, item updated |
| TC-LIN-003 | Soft-delete LinenItem | `DELETE /items/{id}` | 200, `{success:true}` |
| TC-LIN-004 | Soft-delete idempotent | (delete 2 lần) | Cả 2 lần `{success:true}` |
| TC-LIN-005 | Save LinenTransaction Dispatch | `{transactionType:"Dispatch", detailsJson:JSON.stringify([{linenItemId, quantity:10}])}` | 200, `status=0` (Draft), code `LTX-...` |
| TC-LIN-006 | Status 0→1 (Dispatched) | `POST /transactions/{id}/status/1` | 200, `status=1` |
| TC-LIN-007 | Status 1→2 (Received) | `POST /transactions/{id}/status/2` | 200, `status=2` |
| TC-LIN-008 | Status 2→3 (Reconciled) | `POST /transactions/{id}/status/3` | 200, `status=3` |
| TC-LIN-009 | Skip status 0→3 | `POST /transactions/{id}/status/3` (vừa save Draft) | 400 `INVALID_STATE`, message match `/không hợp lệ/` |
| TC-LIN-010 | Cancel 2→4 | `POST /transactions/{id}/status/4` (sau khi Received) | 200, `status=4` |

**Edge case:**
- `from==to` (cùng status) → idempotent, không lỗi
- `DetailsJson` malformed → JsonException → 400 `INVALID_JSON`
- Số lượng âm trong `detailsJson` → backend không validate (chấp nhận, có thể fix sau)

**Regression impact:**
- Không cross-module — Linen là standalone

---

### 2.7 Sterilization Schedule

**Module liên quan:** KSNK, Room (phòng mổ), Department.

**Mô tả nghiệp vụ:** Lên lịch tiệt trùng phòng mổ/ICU → bắt đầu → hoàn tất với culture sample result.

**API liên quan (4):**
- `GET /api/linen/sterilization-schedules` — search
- `GET /api/linen/sterilization-schedules/{id}` — detail
- `POST /api/linen/sterilization-schedules` — save
- `POST /api/linen/sterilization-schedules/{id}/status/{newStatus}?cultureResult=` — change status

**Test case (6):**

| # | Case | Action | Expected |
|---|---|---|---|
| TC-STR-001 | Save schedule mới | `{scheduledAt, areaType:"OperatingRoom", roomId, durationMinutes:60, sterilizationMethod:"UV"}` | 200, `status=0`, code `STR-...` |
| TC-STR-002 | Status 0→1 (InProgress) | `POST .../status/1` | 200, `status=1, startedAt=now` |
| TC-STR-003 | Status 1→2 với culture Pass | `POST .../status/2?cultureResult=Pass` | 200, `status=2, completedAt, cultureResult="Pass"` |
| TC-STR-004 | Status 1→3 Failed | `POST .../status/3` | 200, `status=3` |
| TC-STR-005 | Status 0→2 (skip InProgress) | `POST .../status/2` (vừa Schedule) | 400 `INVALID_STATE` |
| TC-STR-006 | Status 0→4 (Cancel sớm) | `POST .../status/4` | 200, `status=4` |

**Edge case:**
- `cultureResult` rỗng khi status=2 → chấp nhận (nullable)
- Status 2→1 (rollback) → 400 (state machine reject)

---

### 2.8 Functional Diagnostics

**Module liên quan:** ServiceRequest (link từ phòng khám), Patient, MedicalRecord, Examination.

**Mô tả nghiệp vụ:** KTV thực hiện thăm dò chức năng (ECG/EEG/Endoscopy/...) → nhập kết quả → BS xét duyệt (4-eyes).

**API liên quan (7):**
- `GET /api/functional-diagnostics` — search
- `GET /api/functional-diagnostics/{id}` — detail
- `POST /api/functional-diagnostics` — save (KTV)
- `POST /api/functional-diagnostics/{id}/complete` — KTV mark completed
- `POST /api/functional-diagnostics/{id}/verify` — BS verify (Role: Admin, Doctor)
- `DELETE /api/functional-diagnostics/{id}` — soft-delete
- `GET /api/functional-diagnostics/test-types` — list 8 type (anonymous OK)

**Test case (8):**

| # | Case | Action | Expected |
|---|---|---|---|
| TC-FDT-001 | List 8 test type (no auth) | `GET /test-types` (no token) | 200, `[{code:"ECG", name:"Điện tim..."}, ...]` 8 items |
| TC-FDT-002 | Save FDT mới | `{patientId, testType:"ECG", clinicalIndication}` | 200, `status=0` (Requested) |
| TC-FDT-003 | Complete FDT | `POST .../complete` | 200, `status=2`, `findings+conclusion` (user fill trước) |
| TC-FDT-004 | Verify FDT Role Doctor | `POST .../verify` | 200, `status=3, verifiedById=<user>, verifiedAt=now` |
| TC-FDT-005 | Verify Role Nurse | (Nurse JWT) | 403 |
| TC-FDT-006 | Verify trước Complete (status=0) | `POST .../verify` ngay sau Save | 400 `INVALID_STATE`, match `/chưa thực hiện/` |
| TC-FDT-007 | Verify khi InProgress (status=1) | | 400 `INVALID_STATE`, match `/đang thực hiện/` |
| TC-FDT-008 | Delete FDT | | 200, `{success:true}` |

**Edge case:**
- `MeasurementsJson` invalid JSON khi GET → trả về string raw (FE phải defensive parse)
- 2 KTV cùng Complete song song cùng record → cuối ghi đè (last-write-win, không có UNIQUE index)
- TestType ngoài 8 enum hợp lệ → backend không validate (chấp nhận) — **đề xuất add validator**

**Regression impact:**
- Module ServiceRequest (nếu FDT được order từ phòng khám): `ServiceRequestDetailId` link tới Detail → cần test detach
- Module Patient: search patient từ FDT module → không ảnh hưởng

---

### 2.9 Zalo OA / ZNS Notification

**Module liên quan:** Patient, Appointment, Prescription, LabResult, Notification (parallel với SMS).

**Mô tả nghiệp vụ:** Gửi tin nhắn template qua Zalo OA tới SDT BN (nhắc tái khám, KQ XN sẵn sàng, đơn thuốc đã có, nhắc uống thuốc).

**API liên quan (8):**
- `GET /api/zalo-notification` — search logs
- `GET /api/zalo-notification/{id}` — detail
- `POST /api/zalo-notification/send` — send (any auth user)
- `POST /api/zalo-notification/{id}/retry` — retry
- `GET /api/zalo-notification/config` — get config (Admin)
- `POST /api/zalo-notification/config` — save config (Admin)
- `GET /api/zalo-notification/test-connection` — ping
- `GET /api/zalo-notification/templates` — list 4 template (anonymous OK)

**Test case (12):**

| # | Case | Body | Expected |
|---|---|---|---|
| TC-ZL-001 | List 4 template (no auth) | `GET /templates` | 200, 4 items `[{id:"appointment_reminder",...}, ...]` |
| TC-ZL-002 | Send valid (MockMode) | `{templateId:"appointment_reminder", targetPhone:"0987654321", templateParams:{patient_name, appointment_date, doctor_name}}` | 200, `status=2 (Delivered), messageId="MOCK-ZL-..."` |
| TC-ZL-003 | Send phone 8 ký tự | `targetPhone:"12345678"` | 400 `VALIDATION_FAILED`, match `/Số điện thoại/` |
| TC-ZL-004 | Send phone 13 ký tự | `targetPhone:"12345678901234"` | 400 `VALIDATION_FAILED` |
| TC-ZL-005 | Send empty templateId | `templateId:""` | 400 `VALIDATION_FAILED, /Thiếu TemplateId/` |
| TC-ZL-006 | Retry Delivered message | `POST /{id}/retry` | 400 `INVALID_STATE, /đã giao thành công/` |
| TC-ZL-007 | Retry Failed message | (cần seed log Status=3) | 200, gửi lại |
| TC-ZL-008 | Save config token "REAL_TOKEN_123" | `{accessToken:"REAL_TOKEN_123", oaId, ...}` | 200, `{success:true}` |
| TC-ZL-009 | GET config sau save | `GET /config` | 200, `accessToken="***"` (mask, không leak) |
| TC-ZL-010 | Re-save với token "***" | `{accessToken:"***", oaId:..., ...}` | 200, token DB giữ nguyên (verify qua re-GET) |
| TC-ZL-011 | Save token "" (empty) | `{accessToken:"", ...}` | 200, token DB cleared (verify GET trả "") |
| TC-ZL-012 | Get config Nurse | (Nurse JWT) | 403 |

**Edge case:**
- AccessToken rỗng trong production (`MockMode=false`) → service trả `MISSING_ACCESS_TOKEN`, status=3, không gọi gateway
- Template parameter thiếu key bắt buộc → Zalo OA reject → ErrorCode `HTTP_4xx` từ gateway
- `CostVnd` default 350 (override qua `Zalo:CostPerMessageVnd`)
- Số điện thoại có ký tự non-digit ("09-87654321") → DTO không strip → cần verify backend pre-process

**Regression impact:**
- SMS module hiện hữu (eSMS/SpeedSMS) → **chạy song song, không thay thế**
- Notification module SignalR realtime → không thay đổi

---

### 2.10 Quality Dashboard

**Module liên quan:** QueueTickets, Admissions, Discharges, RadiologyRequests, FunctionalDiagnosticTests, PathologyRequests, LabRequestItems, Services, Receipts, Departments, Users.

**Mô tả nghiệp vụ:** Dashboard real-time hiển thị 5 view: phòng khám / nội trú / CLS / XN / doanh thu. Auto-refresh 60s.

**API liên quan (6):**
- `GET /api/quality-dashboard?asOfDate=` — full dashboard
- `GET /api/quality-dashboard/clinic-queues` — chỉ phòng khám
- `GET /api/quality-dashboard/inpatient-by-dept` — chỉ nội trú
- `GET /api/quality-dashboard/paraclinical` — chỉ CLS
- `GET /api/quality-dashboard/lab` — chỉ XN
- `GET /api/quality-dashboard/revenue` — chỉ doanh thu

**Test case (8):**

| # | Case | Action | Expected |
|---|---|---|---|
| TC-QD-001 | Get full không param | `GET /quality-dashboard` | 200, `asOfDate=now`, 5 nested view |
| TC-QD-002 | Get full với asOfDate | `?asOfDate=2026-05-01` | 200, snapshot ngày đó |
| TC-QD-003 | Get clinic-queues | `GET /quality-dashboard/clinic-queues` | 200, `[{roomId, roomName, waiting, inProgress, completed}, ...]` |
| TC-QD-004 | Get inpatient-by-dept | | 200, `[{departmentId, present, admitted, discharged, totalCost, totalDeposit, receivable}, ...]` |
| TC-QD-005 | Get paraclinical | | 200, `{items:[{typeName, pending, completed}, ...]}` |
| TC-QD-006 | Get lab | | 200, `{categories:[{categoryName:"Huyết học/Sinh hóa/Vi sinh/Miễn dịch", pending, completed}, ...]}` |
| TC-QD-007 | Get revenue | | 200, `{outpatientTotal, inpatientTotal, grandTotal, byCashier:[{cashierId, total, receiptCount}, ...]}` |
| TC-QD-008 | Schema drift handling (LabRequestItems.Service NULL) | (drift DB), gọi GET /lab | 200, trả empty list, không 500 |

**Edge case:**
- Date trong tương lai (`asOfDate=2099-01-01`) → empty data, không crash
- DB rỗng → tất cả zero count, vẫn 200
- 60s auto-refresh dài hạn → memory leak? (manual test 30 phút verify Chrome heap)

**Regression impact:**
- **Read-only** — không write DB, không cross-module write effect
- Nếu thay đổi schema 7 bảng nguồn (QueueTickets, Admissions, ...) → cần test QD

---

### 2.11 Retry Background Worker

**Module liên quan:** Nangcap23RetryWorker (BackgroundService).

**Mô tả nghiệp vụ:** Worker quét row NationalPrescriptionSubmissions + NationalPharmacyOutboundReports stuck Status=1 > 5 phút, gọi lại gateway.

**Điều kiện test:**
- `NangCap23:RetryWorker:Enabled=true` (mặc định prod)
- `IntervalSeconds=60` (chỉnh xuống 10s khi test cho nhanh)
- `StuckMinutes=5` (chỉnh xuống 1 phút khi test)

**Test case (6):**

| # | Case | Setup | Expected |
|---|---|---|---|
| TC-RW-001 | Worker chạy mỗi 60s | (chạy app, đợi 90s) | Log "Nangcap23RetryWorker started" + iteration log mỗi tick |
| TC-RW-002 | Worker tắt | `Enabled=false` | Log "Nangcap23RetryWorker disabled" + không loop |
| TC-RW-003 | Pick up stuck row | Tạo prescription submission Status=1, UpdatedAt = UTC - 10 min | Sau 1 tick: row có RetryCount++, Status=2 (mock ack) |
| TC-RW-004 | Bỏ qua row chưa stuck | UpdatedAt = UTC - 1 min (chưa > StuckMinutes) | Row không change |
| TC-RW-005 | Bỏ qua row đã max retry | RetryCount=3, maxRetries=3 | Row không change |
| TC-RW-006 | Worker không crash khi exception | Force gateway throw exception | Log error + continue next iteration |

**Edge case:**
- 2 Cloud Run instance cùng pick row → cả 2 gọi gateway → idempotency-key giúp cổng dedupe (nếu hỗ trợ); nếu không, có thể duplicate submission. Log + manual reconcile.
- MaxBatchSize=20 → 100 row stuck cùng lúc → 5 batch sequential

**Regression impact:**
- App start delay 15s ban đầu (`Task.Delay(15s)`) → có thể delay API ready cho liveness probe nhưng worker không block HTTP pipeline

---

### 2.12 Exception Filter + ConfigStore

**Module liên quan:** Cross-cut — apply mọi NangCap23 controller qua `[TypeFilter]`.

**Test case (6):**

| # | Case | Trigger | Expected status + body |
|---|---|---|---|
| TC-EX-001 | ArgumentException | DTO invalid (đã verified ở TC-NP-002, TC-ZL-003, ...) | 400 `{error:"VALIDATION_FAILED", message, field}` |
| TC-EX-002 | InvalidOperationException | State machine reject (TC-LIN-009, TC-FDT-006) | 400 `{error:"INVALID_STATE", message}` |
| TC-EX-003 | KeyNotFoundException | Get/Submit ID không tồn tại | 404 `{error:"NOT_FOUND", message}` |
| TC-EX-004 | JsonException | Send malformed JSON body | 400 `{error:"INVALID_JSON", message}` |
| TC-EX-005 | DbUpdateException UNIQUE | Race-condition (TC-NP-009) | 409 `{error:"DUPLICATE", message:"Bản ghi này đã tồn tại..."}` |
| TC-EX-006 | OperationCanceledException | User cancel request giữa chừng | 499 (no body) |

**ConfigStore-specific (3):**

| # | Case | Setup | Expected |
|---|---|---|---|
| TC-CS-001 | SaveConfig race-safe | 3 POST sequential khác value | Cuối cùng = last write, exact 1 active row |
| TC-CS-002 | Decrypt fail | Manually corrupt `ENC:...` value trong DB | Log error + fallback appsettings, không crash |
| TC-CS-003 | Type validation | POST `retryCount:999` (out of 1..10) | 400 `VALIDATION_FAILED` |

---

## 3. Luồng test theo thứ tự thực tế

### 3.1 Smoke test (5 phút)

Mục đích: confirm app khởi động + 6 page render.

```bash
# Backend + Frontend up
cd backend/src/HIS.API && DOTNET_ROLL_FORWARD=LatestMajor ASPNETCORE_ENVIRONMENT=Development dotnet run --launch-profile http &
cd frontend && npm run dev &

# Page-load Cypress (5 phút)
cd frontend && npx cypress run --spec "cypress/e2e/nangcap23-pages.cy.ts,cypress/e2e/nangcap23-v1-pages.cy.ts" --browser chrome

# Hoặc Playwright (nhanh hơn ~3 phút)
cd frontend && npx playwright test e2e/nangcap23-pages.spec.ts e2e/nangcap23-v1-pages.spec.ts
```

Expected: 12 + 13 + 13 + 14 = 52 test pass.

### 3.2 Regression test (15–20 phút)

Mục đích: confirm thay đổi NangCap23 không phá module hiện có.

**Thứ tự chạy:**
1. NangCap23 flow test (30+ case) — `cypress/e2e/nangcap23-flow.cy.ts`
2. Module liên quan trực tiếp:
   - Prescription: `prescription.cy.ts` (verify create đơn không bị block)
   - Pharmacy: `pharmacy-deep.cy.ts` (verify dispense + warehouse)
   - Inpatient: `click-through-workflow.cy.ts` (verify discharge)
   - Examination/OPD: `user-workflow.cy.ts`
3. Cross-cut module:
   - Audit log: `fhir-health-pdf.cy.ts` (verify audit entry sau submit NangCap23)
   - Notification: `new-features.cy.ts` (verify SMS module song song với Zalo)

### 3.3 Integration test (30–45 phút, cần Staging gateway)

Mục đích: verify với gateway thật (Staging credential cấp bởi BHXH/Cục QLD).

**Pre-condition:** Cloud Run / Staging có env-var thật:
```
NationalGateway__MockMode=false
NationalGateway__Prescription__ApiKey=<sandbox-key>
NationalGateway__Pharmacy__ApiKey=<sandbox-key>
DeAn06__AccessToken=<sandbox-token>
Zalo__MockMode=false
Zalo__AccessToken=<oa-token>
Zalo__OaId=<oa-id>
Zalo__IsEnabled=true
```

**Thứ tự:**
1. Health check 4 gateway:
   - `GET /api/national-prescription-gateway/test-connection` → `connected=true`
   - `GET /api/national-pharmacy/test-connection` → `connected=true`
   - (Đề án 06 không có test-connection riêng — verify qua submit dummy)
   - `GET /api/zalo-notification/test-connection` → `connected=true`
2. Submit 1 prescription thật → verify lưu được `gatewayTransactionId` thật (không phải `MOCK-*`)
3. Submit 1 báo cáo Dược thật → verify `gatewayTicketNumber`
4. Submit 1 GCS thử nghiệm → verify `da06SubmissionId`
5. Submit 1 GBT thử nghiệm
6. Submit 1 DLHC thử nghiệm với BAC > 50 → verify `eligibleToDrive=false`
7. Gửi Zalo ZNS thật tới SDT test → verify nhận tin trên Zalo OA app
8. Quality Dashboard render với data thật

### 3.4 End-to-end (E2E) full workflow (1–2 giờ)

Mục đích: simulate user thật làm việc 1 ngày.

**Sáng:**
1. Admin login → `/v2/quality-dashboard-live` xem dashboard sáng
2. Tiếp đón → tạo MR + Patient mới
3. Phòng khám:
   - BS khám → kê đơn thuốc → save Prescription
   - **Click "Gửi cổng QG"** → verify `Status=2` trong UI
   - Verify trong DB `NationalPrescriptionSubmissions.GatewayTransactionId` != null
   - BN có SDT → **send Zalo "prescription_dispense"** → verify message log
4. CLS:
   - Order ECG → KTV tạo FDT → input findings → Complete → BS Verify
5. Khoa Sản:
   - BN sinh → tạo GCS → submit → verify ack
6. KSNK:
   - 1 phòng mổ vừa xong ca → lên Sterilization Schedule → start → complete với culture Pass

**Chiều:**
7. Nội trú:
   - BN tử vong → tạo GBT → submit
8. Phòng khám SK lái xe:
   - 3 BN thử nghiệm với 3 case: A1 ok, B2 cồn cao, C ma túy → verify EligibleToDrive đúng
9. Dược:
   - Generate báo cáo DailySale cuối ngày
10. Quản lý KSNK:
    - Tạo Linen Dispatch transaction → status 0→1→2→3 (Reconciled)

**Cuối ngày:**
11. Admin xem Quality Dashboard tổng kết ngày
12. Verify audit log: tất cả mutation đều có `CreatedBy/UpdatedBy` đúng user

### 3.5 Flow phụ thuộc giữa các module

**Phải test trước (prerequisite):**
- Auth + Login (user `admin`, `Doctor`, `Pharmacist`, `Nurse`, `Midwife`)
- Patient module (có Patient với `IdentityNumber`)
- Department/Room module (cho Sterilization Schedule)
- Prescription module (cho National Prescription Gateway)
- Pharmacy/Warehouse (cho National Pharmacy Gateway)
- MedicalRecord (cho GCS, GBT)
- Examination (cho DLHC)

**Có thể test sau (NangCap23 không ảnh hưởng):**
- Bất kỳ module không liên quan trên (Lab, RIS/PACS, Billing, Reports, Quality, ...)

**Phải test song song:**
- Audit log middleware: verify đầy đủ entries cho mỗi mutation
- Authorization middleware: verify Role-guard hoạt động chính xác

---

## 4. Checklist trước release

### 4.1 Build + Test pass

- [ ] `dotnet build HIS.sln` → 0 error, 0 warning mới
- [ ] `cd frontend && npm run build` → success (tsc + vite)
- [ ] `cypress run --spec "cypress/e2e/nangcap23-*.cy.ts"` → ALL PASS (52 + 30+ = 80+ case)
- [ ] `playwright test e2e/nangcap23-*.spec.ts` → ALL PASS (25 case)
- [ ] Smoke check 6 page load: `/national-gateways`, `/de-an-06`, `/linen-management`, `/functional-diagnostics`, `/zalo-notifications`, `/quality-dashboard-live`
- [ ] Smoke check 6 v2 page tương ứng `/v2/*`

### 4.2 Migration apply

- [ ] Script 43 `nangcap23_gateways.sql` đã apply → 10 table tồn tại
- [ ] Script 44 `nangcap23_dedupe_idx.sql` đã apply → 3 index UNIQUE filtered
- [ ] Script 45 `systemconfig_unique.sql` đã apply → `ConfigKey` UNIQUE active
- [ ] Verify `ProductionSchemaRepairRunner` log "0 missing tables" lúc start

### 4.3 Env-var production

- [ ] `NationalGateway__MockMode=false` (nếu đã có credential thật) hoặc giữ `true` (chấp nhận mock)
- [ ] `NationalGateway__FacilityCode=<mã CSKB thật>`
- [ ] `NationalGateway__Prescription__ApiKey=<key>` (nếu MockMode=false)
- [ ] `NationalGateway__Pharmacy__ApiKey=<key>` (nếu MockMode=false)
- [ ] `DeAn06__AccessToken=<token>` (nếu MockMode=false)
- [ ] `Zalo__MockMode=false` + `Zalo__AccessToken` + `Zalo__OaId` + `Zalo__IsEnabled=true`
- [ ] `NangCap23__RetryWorker__Enabled=true` (mặc định ok)

### 4.4 Security

- [ ] Test SSRF: POST config với `http://169.254.169.254` → 400
- [ ] Test SSRF: POST config với `http://10.0.0.1` → 400 trên Prod (cho phép trên Dev)
- [ ] Test sensitive mask: GET `/zalo-notification/config` → token = `"***"`, không leak
- [ ] Test re-save với `"***"` → token gốc giữ nguyên (không bị xóa)
- [ ] Test data protection: restart Cloud Run, verify decrypt vẫn OK (PersistKeysToDbContext)

### 4.5 Permission

- [ ] Verify role `Nurse` không truy cập `/config` của Prescription/Pharmacy/Zalo (403)
- [ ] Verify role `Doctor` submit được GBT/DLHC
- [ ] Verify role `Midwife` submit được GCS
- [ ] Verify role `Pharmacist/PharmacyHead` generate được Pharmacy report
- [ ] Verify anonymous → 401 ở mọi endpoint (trừ `test-types` và `templates`)

### 4.6 Performance

- [ ] Search list NangCap23 với 1000 row → < 500ms
- [ ] Quality Dashboard full → < 2s
- [ ] Submit Prescription (Phase 1 + Phase 2) MockMode → < 200ms
- [ ] Submit Prescription real gateway với timeout 30s → trong tolerance

### 4.7 Monitoring

- [ ] Verify log entry sau Submit: `_logger.LogInformation("Prescription QG ack: code=... txn=...")`
- [ ] Verify circuit breaker trigger sau 5 lỗi liên tiếp 30s (manual stress)
- [ ] Verify worker log sau 1 phút: "RetryWorker found 0 stuck..." (nếu chưa có row stuck)
- [ ] Verify audit middleware lưu UserId/RequestPath cho mỗi POST/PUT/DELETE

### 4.8 Rollback plan

- [ ] Backup `appsettings.json` production (env vars Cloud Run)
- [ ] Nếu phát hiện bug sau deploy → rollback Cloud Run revision (`gcloud run services update-traffic his-api --to-revisions=<prev>=100`)
- [ ] DB script idempotent → rollback không cần undo schema (giữ table, không xóa)

---

## 5. Dữ liệu test cần chuẩn bị chung

### 5.1 Tài khoản user

| Role | Username (suggest) | Password | Mục đích test |
|---|---|---|---|
| Admin | `admin` | `Admin@123` | (đã có default) Test config + tất cả endpoint |
| Doctor | `doctor.test` | `Doctor@123` | Test Submit GBT/DLHC, Verify FDT |
| Midwife | `midwife.test` | `Midwife@123` | Test Submit GCS |
| Pharmacist | `pharmacist.test` | `Pharma@123` | Test Pharmacy Generate |
| PharmacyHead | `pharmahead.test` | `PharmaH@123` | Test Pharmacy Generate (role mới) |
| Nurse | `nurse.test` | `Nurse@123` | Test permission denial (403) |

### 5.2 Master data

- ≥ 1 `Department` (cho FromDepartmentId/ToDepartmentId Linen)
- ≥ 1 `Room` (cho Sterilization Schedule)
- ≥ 1 `Pharmacy` Warehouse (cho Pharmacy report)
- ≥ 10 `Patient` với `IdentityNumber` thật + `DateOfBirth` (cho GCS/GBT/DLHC)
- ≥ 1 `Patient` nữ (mẹ) + có MedicalRecord khoa Sản (cho GCS)
- ≥ 5 `Medicine` với MedicineCode/Name/Unit (cho Prescription detail)
- ≥ 3 `ICD-10` code (cho GBT primary/secondary cause)

### 5.3 Transactional data

- ≥ 3 `Prescription` có ≥ 1 PrescriptionDetail (cho TC-NP-001..009)
- 1 `Prescription` rỗng (cho TC-NP-006)
- 1 `Examination` linked `Patient` (cho TC-DLHC)
- (Tự tạo trong test) LinenItem, LinenTransaction, SterilizationSchedule, FDT

### 5.4 External

- 1 SDT Zalo test (real) — cho integration test gửi ZNS thật
- Sandbox URL + credential cấp bởi BHXH/Cục QLD (khi sẵn có) — cho Staging

---

## Tài liệu liên quan

- [README.md](./README.md) — Tổng quan + architecture
- [analysis.md](./analysis.md) — Phân tích source code
- [test-guide.md](./test-guide.md) — QA checklist gốc 11 section
- [summary.md](./summary.md) — Index + module impact
