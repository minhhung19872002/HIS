# NangCap23 — QA Test Guide

Dùng cho: QA team kiểm thử end-to-end + regression trước mỗi release.

**Prerequisites:**
- Backend chạy `http://localhost:5106` (Dev = MockMode=true, Staging/Prod = MockMode=false)
- Frontend chạy `http://localhost:3001`
- Tài khoản test: `admin / Admin@123` (role `Admin`) + 1 tài khoản role `Nurse` để test permission denial

---

## 1. Tổng quan NangCap23

NangCap23 đóng 9 gap còn thiếu trong HSMT BV Đa khoa (39 phân hệ):

| Module | Loại logic | External gateway |
|---|---|---|
| Cổng Đơn thuốc QG | Submit qua mạng | donthuocquocgia.vn |
| Cổng Dược QG | Submit qua mạng | duocquocgia.com.vn |
| Đề án 06 (GCS/GBT/KSK lái xe) | Submit qua mạng | gdbhyt.baohiemxahoi.gov.vn |
| Đồ giặt + tiệt trùng phòng | Local DB only | — |
| Thăm dò chức năng | Local DB only | — |
| Quality Dashboard | Read-only aggregate | — |
| Zalo OA / ZNS | Submit qua mạng | business.openapi.zalo.me |

---

## 2. Danh sách phân hệ liên quan

| Phân hệ | Menu | Route v2 | Route v1 |
|---|---|---|---|
| National Gateways | Liên thông → "Cổng Đơn thuốc / Dược QG" | `/v2/national-gateways` | `/national-gateways` |
| Đề án 06 | Liên thông → "Đề án 06 (GCS/GBT/Lái xe)" | `/v2/de-an-06` | `/de-an-06` |
| Linen Management | Quản lý → "Đồ giặt & Tiệt trùng" | `/v2/linen-management` | `/linen-management` |
| Functional Diagnostics | Cận lâm sàng → "Thăm dò chức năng" | `/v2/functional-diagnostics` | `/functional-diagnostics` |
| Zalo Notifications | Liên thông → "Zalo OA / ZNS" | `/v2/zalo-notifications` | `/zalo-notifications` |
| Quality Dashboard | Quản lý → "DB Chất lượng (live)" | `/v2/quality-dashboard-live` | `/quality-dashboard-live` |

---

## 3. Danh sách màn hình cần test

### 3.1 National Gateways — 3 tab

**Module: HSMT Cổng QG**

Màn hình cần test:
- [ ] Tab "Đơn thuốc QG" — danh sách + KPI 4 ô (Tổng/Ack/Đang chờ/Lỗi)
- [ ] Tab "Dược QG" — danh sách báo cáo nhà thuốc
- [ ] Tab "Cấu hình" — form save config (chỉ Admin)
- [ ] Modal "Gửi lại" → POST `/retry`
- [ ] Modal "Hủy" → POST `/cancel`
- [ ] Click row → Drawer detail

Cần verify:
- [ ] **Validation:** thiếu DoctorIdNumber → toast lỗi, không POST
- [ ] **Loading state:** spinner khi load list 200 dòng
- [ ] **Empty state:** "Chưa có dữ liệu" khi DB rỗng
- [ ] **State machine:** retry trên submission đã ack → 400 + thông báo
- [ ] **Permission:** user Nurse mở tab Cấu hình → ẩn save button hoặc 403
- [ ] **Audit log:** lưu `CreatedBy=userId` khi submit
- [ ] **Retry flow:** retry lần 4 (vượt max 3) → 400
- [ ] **Timeout handling:** gateway 30s không trả → status giữ 1 (Submitted), retry 3 lần với backoff 1s/2s/4s
- [ ] **Mock vs Real:** Dev → MockMode=true → ack ngay; Prod → real HTTP → có thể fail

API liên quan:
- `GET /api/national-prescription-gateway?keyword=&status=&from=&to=&pageIndex=0&pageSize=50`
- `POST /api/national-prescription-gateway/submit`
- `POST /api/national-prescription-gateway/{id}/retry`
- `POST /api/national-prescription-gateway/{id}/cancel`
- `GET /api/national-prescription-gateway/config` ⚠️ `[Authorize(Roles="Admin")]`
- `POST /api/national-prescription-gateway/config` ⚠️ `[Authorize(Roles="Admin")]`
- `GET /api/national-pharmacy?reportType=&status=&from=&to=`
- `POST /api/national-pharmacy/generate`
- `POST /api/national-pharmacy/{id}/retry`

### 3.2 Đề án 06 — 3 tab cert

**Module: Đề án 06 — Birth/Death/Driving License**

Màn hình cần test:
- [ ] Tab "Chứng sinh" — list + create + submit
- [ ] Tab "Báo tử" — list + create + submit
- [ ] Tab "KSK lái xe" — form 48 trường (vision/hearing/neuro/psy/drug/alcohol)
- [ ] Submit cert chưa được duyệt → status=1 Submitted

Cần verify:
- [ ] **Eligibility auto-compute (TT 24/2023):** drug test positive HOẶC BAC ≥ 50mg% → `EligibleToDrive=false`
- [ ] **State machine:** Submit cert đã ack → 400
- [ ] **Validation:** birthDate > now → 400
- [ ] **Required field:** thiếu MotherIdNumber, CertifyingDoctorLicense → 400

API liên quan:
- `GET /api/de-an-06/{birth|death|driving-license}-certificates`
- `POST /api/de-an-06/{birth|death|driving-license}-certificates`
- `POST /api/de-an-06/{birth|death|driving-license}-certificates/{id}/submit`

### 3.3 Linen Management — 3 tab CRUD

**Module: Đồ giặt + Tiệt trùng (KSNK)**

Màn hình cần test:
- [ ] Tab "Danh mục đồ vải" — CRUD item (code/name/category/stock)
- [ ] Tab "Giao nhận" — Dispatch → Return → Reconcile
- [ ] Tab "Lịch tiệt trùng" — Schedule → InProgress → Completed (cultureResult)

Cần verify:
- [ ] **CRUD đầy đủ:** Create + Read + Update + Soft-Delete
- [ ] **State transition Sterilization:** 0→1→2 (Scheduled → InProgress → Completed); 1→3 Failed; 0→4 Cancelled
- [ ] **Transition không hợp lệ:** 0→2 (skip InProgress) → 400
- [ ] **Display details:** mỗi transaction lưu `DetailsJson` array → render trong drawer
- [ ] **Idempotency soft-delete:** delete 2 lần → idempotent

API liên quan:
- `GET POST DELETE /api/linen/items`
- `GET POST /api/linen/transactions`
- `POST /api/linen/transactions/{id}/status/{newStatus}`
- `GET POST /api/linen/sterilization-schedules`
- `POST /api/linen/sterilization-schedules/{id}/status/{newStatus}?cultureResult=Pass`

### 3.4 Functional Diagnostics — 8 test types

**Module: Thăm dò chức năng**

Màn hình cần test:
- [ ] Filter "Loại" — 8 option (ECG/ECGStress/Endoscopy/BoneDensity/EEG/EMG/Spirometry/Audiometry)
- [ ] Create test → status=0 Requested
- [ ] Complete (set Findings + Conclusion) → status=2 Completed
- [ ] Verify (BS xét duyệt) → status=3 Verified + VerifiedAt

Cần verify:
- [ ] **State machine:** Verify trước Complete → 400 "Phiếu đang thực hiện — vui lòng hoàn tất trước khi duyệt"
- [ ] **VerifiedById:** ghi nhận userId từ JWT
- [ ] **Test type dropdown:** load 8 option từ `GET /functional-diagnostics/test-types`
- [ ] **MeasurementsJson:** JSON object render đúng trong drawer

API liên quan:
- `GET /api/functional-diagnostics?testType=ECG&status=&from=&to=`
- `POST /api/functional-diagnostics`
- `POST /api/functional-diagnostics/{id}/complete`
- `POST /api/functional-diagnostics/{id}/verify`
- `DELETE /api/functional-diagnostics/{id}`
- `GET /api/functional-diagnostics/test-types` (anonymous OK)

### 3.5 Zalo Notifications — Send + Retry + Config

**Module: Zalo OA / ZNS**

Màn hình cần test:
- [ ] Tab "Logs" — danh sách tin đã gửi + KPI
- [ ] Modal "Gửi thử" — chọn template + nhập SDT + params
- [ ] Tab "Cấu hình" — Admin only
- [ ] Drawer detail → "Gửi lại" button

Cần verify:
- [ ] **Phone validation:** < 9 digits → 400; > 12 digits → 400
- [ ] **TemplateId validation:** không truyền → 400
- [ ] **4 template option:** appointment_reminder / lab_result_ready / prescription_dispense / medicine_reminder
- [ ] **MockMode (Dev):** status=2 Delivered ngay
- [ ] **Real Zalo (Prod):** thiếu access_token → status=3 Failed với ErrorCode="MISSING_ACCESS_TOKEN"
- [ ] **Cost VND:** mặc định 350, override qua `Zalo:CostPerMessageVnd`
- [ ] **Retry:** trên tin đã delivered → 400; trên tin failed → success
- [ ] **Permission GET config:** Nurse → 403

API liên quan:
- `GET /api/zalo-notification?keyword=&status=&from=&to=`
- `POST /api/zalo-notification/send`
- `POST /api/zalo-notification/{id}/retry` (mới thêm)
- `GET /api/zalo-notification/config` ⚠️ `[Authorize(Roles="Admin")]`
- `POST /api/zalo-notification/config` ⚠️ `[Authorize(Roles="Admin")]`
- `GET /api/zalo-notification/test-connection`
- `GET /api/zalo-notification/templates` (anonymous OK)

### 3.6 Quality Dashboard — 5 view

**Module: Quality Dashboard live**

Màn hình cần test:
- [ ] View "Phòng khám" — bảng clinic queue
- [ ] View "Nội trú theo khoa" — bar chart
- [ ] View "Cận lâm sàng" — radiology / FDT / pathology counts
- [ ] View "Xét nghiệm" — pending/completed
- [ ] View "Doanh thu" — by cashier + total
- [ ] Auto-refresh 60s

Cần verify:
- [ ] **5 endpoint trả 200 + đúng shape**
- [ ] **AsOfDate query param:** mặc định today, override `?asOfDate=2026-05-01`
- [ ] **Schema drift handling:** nếu LabRequestItems.Service drift → log error + trả empty list (không crash)
- [ ] **Auto-refresh không leak memory:** chạy 30 phút verify Chrome DevTools heap

API liên quan:
- `GET /api/quality-dashboard?asOfDate=`
- `GET /api/quality-dashboard/clinic-queues`
- `GET /api/quality-dashboard/inpatient-by-dept`
- `GET /api/quality-dashboard/paraclinical`
- `GET /api/quality-dashboard/lab`
- `GET /api/quality-dashboard/revenue`

---

## 4. Business flow cần verify

### 4.1 Flow: Đơn thuốc → submit cổng QG → ack/retry

1. Bác sĩ tạo Prescription → status `Draft`
2. POST `/national-prescription-gateway/submit` với `prescriptionId`
3. Backend build payload JSON theo QĐ 808/QĐ-BYT 2022
4. Gateway client gửi POST `/api/prescription/submit` (Production) hoặc trả "MOCK-RX-..." (Dev)
5. Phản hồi:
   - **2xx + transactionId** → entity.Status=2 (Acknowledged), Save `GatewayTransactionId`
   - **4xx** (gateway từ chối nội dung) → entity.Status=3 (Rejected), ErrorCode=`HTTP_4XX`
   - **5xx / timeout / network** → retry 3 lần backoff 1s/2s/4s; nếu vẫn fail → entity.Status=1 (Submitted), giữ retry-able
6. UI hiển thị status chip + nút "Gửi lại" nếu status ∈ {1, 3}

### 4.2 Flow: Đề án 06 GCS

1. Khoa Sản tạo BirthCertificateRecord (`POST /de-an-06/birth-certificates`)
2. Auto-gen `CertificateNumber` (GCS-{timestamp})
3. Submit → POST `/de-an-06/birth-certificates/{id}/submit`
4. Backend serialize JSON, gọi `IDeAn06GatewayClient.SubmitBirthCertificateAsync(payload)`
5. Real HTTP POST tới `https://gdbhyt.baohiemxahoi.gov.vn/api/v1/birth-certificates` với `Authorization: Bearer <DeAn06:AccessToken>`
6. Phản hồi → cập nhật `Da06Status` + `Da06SubmissionId` + `Da06AcknowledgedAt`

### 4.3 Flow: Functional Diagnostic Complete → Verify (4-eyes)

1. KTV tạo phiếu ECG → status=0 Requested
2. KTV nhập Findings → POST `/complete` → status=2 Completed
3. BS xét duyệt → POST `/verify` → status=3 Verified
4. **State guard:** không thể `verify` khi status≠2 → 400

### 4.4 Flow: Linen Sterilization (KSNK)

1. Quản lý KSNK tạo Schedule (areaType=OperatingRoom, method=UV, duration=60min) → status=0
2. Khi nhân viên bắt đầu → POST `/status/1` → status=1 InProgress + StartedAt
3. Khi hoàn tất + lấy mẫu nuôi cấy → POST `/status/2?cultureResult=Pass` → status=2 + CompletedAt
4. Nếu cultureResult=Fail → set status=3 Failed cần khử khuẩn lại

---

## 5. Các trường hợp validation

| Endpoint | Field | Rule | Expected |
|---|---|---|---|
| Submit prescription | `DoctorIdNumber` | Không rỗng | 400 + "Thiếu CCCD bác sĩ kê đơn" |
| Submit prescription | `DoctorLicenseNumber` | Không rỗng | 400 |
| Submit prescription | `PrescriptionType` | ∈ Outpatient/Narcotic/Psychotropic/Precursor | 400 |
| Submit prescription | `prescription.Details` | Có ít nhất 1 item | 400 + "Đơn thuốc trống" |
| Generate pharmacy report | `ReportType` | ∈ DailySale/MonthlyInventory/NarcoticReport/Recall | 400 |
| Generate pharmacy report | `PeriodFrom <= PeriodTo` | True | 400 + "PeriodFrom phải <= PeriodTo" |
| Generate pharmacy report | `PeriodTo` | ≤ today+1 | 400 |
| Send Zalo | `targetPhone` | 9-12 ký tự số | 400 + "Số điện thoại không hợp lệ" |
| Send Zalo | `templateId` | Không rỗng | 400 + "Thiếu TemplateId" |
| Submit DLHC | (auto-compute) | `EligibleToDrive` set theo TT 24/2023 | Backend tự set |

---

## 6. Permission cần test

| Endpoint | Role yêu cầu | Test case |
|---|---|---|
| `POST /national-prescription-gateway/config` | Admin | Nurse → 403; Admin → 200 |
| `GET /national-prescription-gateway/config` | Admin | Nurse → 403; anonymous → 401 |
| `POST /zalo-notification/config` | Admin | Nurse → 403 |
| `GET /zalo-notification/config` | Admin | Nurse → 403 |
| Tất cả endpoint khác | Authenticated | Anonymous → 401 |
| `GET /functional-diagnostics/test-types` | Anonymous OK | Test không kèm token → 200 |
| `GET /zalo-notification/templates` | Anonymous OK | Test không kèm token → 200 |

---

## 7. External gateway cần verify (Staging/Production)

| Gateway | URL | Auth | Test connection endpoint |
|---|---|---|---|
| Đơn thuốc QG | `https://donthuocquocgia.vn` | `X-API-Key: <NationalGateway:Prescription:ApiKey>` | `GET /national-prescription-gateway/test-connection` |
| Dược QG | `https://duocquocgia.com.vn` | `X-API-Key: <NationalGateway:Pharmacy:ApiKey>` | `GET /national-pharmacy/test-connection` |
| Đề án 06 | `https://gdbhyt.baohiemxahoi.gov.vn` | `Authorization: Bearer <DeAn06:AccessToken>` | (chưa có riêng — qua submit) |
| Zalo OA | `https://business.openapi.zalo.me` | `access_token: <Zalo:AccessToken>` | `GET /zalo-notification/test-connection` |

**Trước khi go-live:** chạy `test-connection` trên Staging với credential thật, verify `connected=true`.

---

## 8. Regression impact — module phụ thuộc

| NangCap23 module | Ảnh hưởng tới | Cần test regression |
|---|---|---|
| National Prescription Gateway | Module Prescription, Pharmacy | Đảm bảo create Prescription bình thường không bị block |
| Đề án 06 GBT (báo tử) | Module Inpatient, MedicalRecord | Bệnh nhân tử vong vẫn discharge bình thường |
| Đề án 06 GCS (chứng sinh) | Module OB/GYN, Patient | Bệnh nhân mẹ + bé vẫn lưu Patient hợp lệ |
| Linen Management | Không cross-module | — |
| Functional Diagnostics | ServiceRequest | FDT có thể link `ServiceRequestDetailId` nếu chỉ định từ phòng khám |
| Quality Dashboard | Read-only: QueueTickets, Admissions, RadiologyRequests, FDT, PathologyRequests, LabRequestItems, Receipts | Nếu thay đổi schema 7 table này → cần test QDashboard |
| Zalo OA | Notification module hiện có | Đảm bảo SMS module không bị ảnh hưởng |
| `[Authorize(Roles="Admin")]` mới | 4 config endpoint | User role thường KHÔNG được mở tab Cấu hình |

---

## 9. Màn hình có dependency

### NangCap23 phụ thuộc data từ module khác:

| Module phụ thuộc | NangCap23 module | Trường data |
|---|---|---|
| Prescription | National Prescription Gateway | `PrescriptionId`, `Details`, `Medicine` |
| Patient | Đề án 06 (GCS/GBT/DLHC) | `MotherPatientId`, `PatientId` |
| MedicalRecord | Đề án 06 GCS/GBT | `MedicalRecordId` |
| Examination | Đề án 06 DLHC | `ExaminationId` |
| Department + Room | Linen Sterilization | `DepartmentId`, `RoomId` |
| QueueTickets/Admissions | Quality Dashboard | aggregation source |
| RadiologyRequests + FDT + Pathology | Quality Dashboard (CLS view) | aggregation source |
| LabRequestItems | Quality Dashboard (Lab view) | aggregation source |
| Receipts | Quality Dashboard (Revenue view) | aggregation source |

### Module khác phụ thuộc NangCap23:

| Module gọi NangCap23 | Liên kết |
|---|---|
| (Hiện tại không có module nào gọi NangCap23 ngoài UI) | — |

---

## 10. Test commands

```bash
# Backend dev (MockMode=true)
cd backend/src/HIS.API
DOTNET_ROLL_FORWARD=LatestMajor ASPNETCORE_ENVIRONMENT=Development \
  dotnet run --launch-profile http

# Frontend dev
cd frontend && npm run dev

# Cypress UI (page-load smoke)
cd frontend
npx cypress run --spec "cypress/e2e/nangcap23-pages.cy.ts" --browser chrome

# Cypress flow + CRUD + state + permission + validation (file mới)
npx cypress run --spec "cypress/e2e/nangcap23-flow.cy.ts" --browser chrome

# Playwright smoke
npx playwright test e2e/nangcap23-pages.spec.ts

# Build verify
cd backend && dotnet build HIS.sln --nologo
cd frontend && npm run build
```

## 11. Production checklist (final go-live)

- [ ] Cloud Run env có `NationalGateway__MockMode=false`
- [ ] Cloud Run env có `NationalGateway__Prescription__ApiKey=<value>`
- [ ] Cloud Run env có `NationalGateway__Pharmacy__ApiKey=<value>`
- [ ] Cloud Run env có `NationalGateway__FacilityCode=<actual hospital code>`
- [ ] Cloud Run env có `DeAn06__AccessToken=<value>` (khi BHXH cấp)
- [ ] Cloud Run env có `Zalo__MockMode=false`
- [ ] Cloud Run env có `Zalo__AccessToken=<oa token>` + `Zalo__OaId=<id>`
- [ ] Run `GET /api/.../test-connection` cho cả 4 gateway — đều `connected=true`
- [ ] Run `nangcap23-flow.cy.ts` trên Staging → tất cả pass
- [ ] Admin role được gán cho ít nhất 1 user trong DB (để config endpoint accessible)
- [ ] Verify FE menu "Cấu hình" chỉ hiển thị với role Admin (hoặc hide button nếu Nurse)
- [ ] Audit log entry được lưu (`CreatedBy`/`UpdatedBy`) cho mỗi submission
