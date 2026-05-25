# NangCap24 — HIS Workflow Test, UI Matrix & Dependency

> **Mục đích:** Phân tích đầy đủ **UI flow + nghiệp vụ y tế + dependency** giữa
> các module HIS đối với gói nâng cấp 24 (10 gap).
> **Phạm vi:** 8 module backend NangCap24 (gap 1–8) + 2 viewer frontend (gap 9–10)
> + workflow HIS hiện có mà NangCap24 chạm vào.
> **Nguồn dữ liệu:** Đọc trực tiếp source BE/FE/SQL: `NangCap24Controllers.cs`,
> `NangCap24Services.cs`, `PaymentGatewayService.VietQR.cs`, `App.tsx`,
> `TerminalLayout.tsx`, `44_nangcap24.sql`. **Không suy đoán nghiệp vụ.**
> **Tài liệu liên quan:** [README.md](./README.md) · [analysis.md](./analysis.md)
> · [test-plan.md](./test-plan.md) · [test-guide.md](./test-guide.md) · [summary.md](./summary.md).
> **Last updated:** 2026-05-25

---

## Mục lục

- [1. Phân hệ + URL thực tế](#1-phân-hệ--url-thực-tế)
- [2. NangCap24 Workflow Test](#2-nangcap24-workflow-test)
  - [2.1 Biometric WebAuthn Flow](#21-biometric-webauthn-flow)
  - [2.2 BHXH Inspector Portal Flow](#22-bhxh-inspector-portal-flow)
  - [2.3 EMR HL7 Export Flow](#23-emr-hl7-export-flow)
  - [2.4 EMR Cloud Sync Flow](#24-emr-cloud-sync-flow)
  - [2.5 DICOM Auto-Send Flow](#25-dicom-auto-send-flow)
  - [2.6 HL7 Message Queue Flow](#26-hl7-message-queue-flow)
  - [2.7 DICOM Study Activity Log Flow](#27-dicom-study-activity-log-flow)
  - [2.8 Bank / VietQR Payment Flow](#28-bank--vietqr-payment-flow)
  - [2.9 DICOM Viewer (MIP/MinIP/Cine/Mammo) Flow](#29-dicom-viewer-mipminipcinemammo-flow)
- [3. Module Dependency Map](#3-module-dependency-map)
- [4. UI Test Matrix](#4-ui-test-matrix)
- [5. Critical Medical/Financial/Legal Risk Test](#5-critical-medicalfinanciallegal-risk-test)
- [6. Integration Test](#6-integration-test)
- [7. Concurrent / Multi-user / Transaction Test](#7-concurrent--multi-user--transaction-test)
- [8. Mapping UI → Component → API → Service → DB → Integration](#8-mapping-ui--component--api--service--db--integration)
- [9. Role-based Access Test](#9-role-based-access-test)
- [10. Regression Priority](#10-regression-priority)

---

## 1. Phân hệ + URL thực tế

Tổng hợp từ `App.tsx` (line 147–154 lazy + 614–625 route) + `TerminalLayout.tsx`
menu. NangCap24 thêm **7 route v2** (TerminalLayout) + **1 standalone** (inspector).

### 1.1 Module mới NangCap24 (8 route)

| Module | URL | Menu group | Backend |
|---|---|---|---|
| Bank Payments (VietQR) | `/v2/bank-payments` | Tài chính (`[24]`) | `/api/payment/bank/*` |
| Biometric Enrollment | `/v2/biometric-enrollment` | Hồ sơ & Ký số (`[24]`) | `/api/biometric` |
| EMR HL7 Export | `/v2/emr-hl7-export` | Liên thông (`[24]`) | `/api/emr/hl7` |
| EMR Cloud Sync | `/v2/emr-cloud-sync` | Liên thông (`[24]`) | `/api/emr/cloud-sync` |
| DICOM Auto-Send | `/v2/dicom-autosend` | Cận lâm sàng (`[24]`) | `/api/dicom-autosend` |
| HL7 Message Queue | `/v2/hl7-message-queue` | Liên thông (`[24]`) | `/api/hl7-queue` |
| DICOM Study Audit Log | `/v2/dicom-study-audit-log` | Cận lâm sàng (`[24]`) | `/api/dicom-study-log` |
| **Cổng thanh tra BHXH** | `/inspector-portal` | **NGOÀI layout (standalone)** | `/api/inspector-portal` |

### 1.2 Viewer component (FE-only, không route riêng)

| Component | Tích hợp vào | Backend |
|---|---|---|
| `MipMinIpViewer.tsx` | DICOM Viewer (`/v2/radiology/viewer`) | `RISComplete/pacs/*` (sẵn có) |
| `CineControls.tsx` | (same) | (same) |
| `MammoViewer.tsx` (nâng cấp) | (same) | (same) |

### 1.3 Module HIS hiện có mà NangCap24 chạm vào

| Module | URL | NangCap24 touchpoint |
|---|---|---|
| Viện phí / Billing | `/v2/billing` | Bank/VietQR confirm → tạo Receipt + HĐĐT |
| CĐHA / RIS | `/v2/radiology` | DICOM auto-send + study log + viewer nâng cấp |
| DICOM Viewer | `/v2/radiology/viewer` | MIP/MinIP/Cine/Mammo |
| EMR | `/v2/emr` | HL7 export + cloud sync + biometric ký document |
| BHYT / Insurance | `/v2/insurance` | Inspector đọc signed XML (giám định) |
| Tiếp đón / Patient | `/v2/reception` | Cung cấp Patient cho biometric + inspector |

---

## 2. NangCap24 Workflow Test

Mỗi workflow trình bày: **Flow detail** (bước, role, trạng thái trước/sau, API,
service) + **Upstream/Downstream** + **Edge case**.

### 2.1 Biometric WebAuthn Flow

| Trường | Giá trị |
|---|---|
| **URL** | `/v2/biometric-enrollment` |
| **Menu** | Hồ sơ & Ký số → "[24] Vân tay BN (WebAuthn)" |
| **Page** | `pages-v2/BiometricEnrollment.tsx` |
| **API client** | `api/nangcap24.ts` export `biometric` |
| **Service BE** | `BiometricSignatureService` (`NangCap24Services.cs:17+`) |
| **Controller BE** | `BiometricSignatureController` (`/api/biometric`) |
| **DB table** | `BiometricCredentials`, `BiometricSignatureLogs` |

**Flow detail (register một lần, sign nhiều lần):**

| Bước | Action | Role | Trạng thái trước | Trạng thái sau | API |
|---|---|---|---|---|---|
| 1 | Chọn BN → "Đăng ký vân tay" (begin) | Authenticated | (chưa có credential) | challenge sinh ra | `POST /api/biometric/register-begin` |
| 2 | Browser `navigator.credentials.create()` | (BN chạm vân tay) | — | credential local | (client WebAuthn) |
| 3 | Lưu credential | Authenticated | — | `BiometricCredential` status=`active` | `POST /api/biometric/register-finish` |
| 4 | Ký document (begin) | Authenticated | có credential | challenge + allowCredentials | `POST /api/biometric/sign-begin` |
| 5 | Browser `navigator.credentials.get()` | (BN chạm vân tay) | — | assertion | (client) |
| 6 | Ghi signature log | Authenticated | — | `BiometricSignatureLog` IsVerified=true ⚠️ | `POST /api/biometric/sign-finish` |
| 7 | Thu hồi | Authenticated | active | status=`revoked` | `DELETE /api/biometric/credentials/{id}` |

**Upstream:** Patient (PatientId). EMR document (DocumentType + DocumentRef).
**Downstream:** EMR document được "ký" (audit pháp lý). Audit `BiometricSignatureLog`.
**Điều kiện bắt buộc:** HTTPS + thiết bị authenticator (Touch ID/Hello/FIDO2).

**⚠️ Nguy cơ (analysis §17 R1, R4):**
- `FinishSignAsync` comment "MVP: accept signature — production verify ECDSA/RSA với PublicKey (COSE)" → IsVerified=true luôn khi credential active, **chưa verify chữ ký thật**.
- `SignatureCounter` không kiểm tra → replay/clone risk.

**Edge case:**
- BN chưa register → sign-begin → 500 "Bệnh nhân chưa đăng ký vân tay".
- Credential revoked → sign-finish → `isVerified:false, error="Credential không tồn tại hoặc đã thu hồi"`.
- Register credential trùng → 500 "Credential đã đăng ký trước đó".

---

### 2.2 BHXH Inspector Portal Flow

| Trường | Giá trị |
|---|---|
| **URL** | `/inspector-portal` (**standalone**, ngoài admin login) |
| **Page** | `pages-v2/InspectorPortal.tsx` (route ngoài TerminalLayout) |
| **API client** | `api/nangcap24.ts` export `inspectorPortal` |
| **Service BE** | `BhxhInspectorService` (`NangCap24Services.cs:258+`) |
| **Controller BE** | `BhxhInspectorPortalController` (`/api/inspector-portal`) |
| **DB table** | `BhxhInspectorAccounts`, `BhxhInspectorAccessLogs` |
| **Tài khoản seed** | `inspector` / `Inspector@123` (migration 44, BCrypt) |

**Flow detail:**

| Bước | Action | Role | Trạng thái | API | Audit |
|---|---|---|---|---|---|
| 1 | Mở `/inspector-portal` (không qua admin) | — | form login riêng | (FE) | — |
| 2 | Login | (anonymous) | đúng → JWT `BhxhInspector`; sai → fail++ | `POST /api/inspector-portal/login` | `LastLoginAt`, lockout |
| 3 | Tra cứu HSBA | BhxhInspector | list paginated | `GET /api/inspector-portal/records` | access log "search" |
| 4 | Xem chi tiết HSBA | BhxhInspector | detail (files/services/medicines) | `GET /records/{id}` | access log "view_record" |
| 5 | Tải XML đã ký | BhxhInspector | download HSBA_{id}.xml ⚠️ placeholder | `GET /records/{id}/signed-xml` | access log "download_xml" |
| — | (Admin) tạo/khóa/reset account | Admin | — | `POST/PUT /accounts/*` | — |

**Upstream:** MedicalRecord, Patient, Department, InsuranceXml (signed XML).
**Downstream:** Giám định BHXH (đối chiếu HSBA). Audit trail cho BHXH.
**Auth model:** JWT inspector **tách biệt** khỏi JWT user thường (role `BhxhInspector`). Admin user **không** truy cập được `/records` (403).

**Edge case:**
- Account lockout: sai N lần → `LockedUntil` chặn login dù password đúng.
- Admin token gọi `/records` → 403 (chỉ `BhxhInspector`).
- ⚠️ Signed XML là placeholder (`<Signature>placeholder-pkcs7-detached-signature</Signature>`).

---

### 2.3 EMR HL7 Export Flow

| Trường | Giá trị |
|---|---|
| **URL** | `/v2/emr-hl7-export` |
| **Menu** | Liên thông → "[24] Xuất HL7 v2 HSBA" |
| **Service BE** | `EmrHl7ArchiveService` (`NangCap24Services.cs:595+`) |
| **DB table** | (read-only — không bảng riêng) |

**Flow detail:**

| Bước | Action | Trạng thái sau | API |
|---|---|---|---|
| 1 | Chọn HSBA + cấu hình include | — | (FE) |
| 2 | Xuất HL7 | `{hl7Content, fileName, messageCount}` | `POST /api/emr/hl7/export` |
| 3 | Tải file `.hl7` | download text/plain | `GET /api/emr/hl7/export/{medicalRecordId}` |

**Upstream:** MedicalRecord + ServiceRequest + Prescription + LabResult + RadiologyReport (đọc để build segment).
**Downstream:** Liên thông HL7 với hệ thống ngoài. Read-only — không write.
**Edge case:** Record không tồn tại → 500. HL7 content bắt đầu `MSH|^~\&|`.

---

### 2.4 EMR Cloud Sync Flow

| Trường | Giá trị |
|---|---|
| **URL** | `/v2/emr-cloud-sync` |
| **Menu** | Liên thông → "[24] Đồng bộ EMR lên Cloud" |
| **Service BE** | `EmrCloudSyncService` (`NangCap24Services.cs:792+`) |
| **External** | Cloudflare R2 (r2_primary / r2_dr / local_backup) |
| **DB table** | `EmrCloudSyncLogs` |

**Flow detail:**

| Bước | Action | Role | Status sau | API |
|---|---|---|---|---|
| 1 | Đồng bộ HSBA (chọn fileTypes + syncToDr) | Authenticated | log pending→uploading→done/failed | `POST /api/emr/cloud-sync/sync` |
| 2 | Xem dashboard status | Authenticated | tracked/synced/partial/failed | `GET /api/emr/cloud-sync/status` |
| 3 | Xem logs (filter status) | Authenticated | list log | `GET /api/emr/cloud-sync/logs` |
| 4 | Thử lại lỗi | **Admin** | retry batch failed | `POST /api/emr/cloud-sync/retry-failed` |

**Upstream:** MedicalRecord (signed_xml/hl7/pdf).
**Downstream:** Lưu trữ Cloud + sao lưu DR.
**Edge case:** R2 chưa cấu hình → status `failed` + ErrorMessage, không crash. FileHash SHA-256 verify integrity.

---

### 2.5 DICOM Auto-Send Flow

| Trường | Giá trị |
|---|---|
| **URL** | `/v2/dicom-autosend` |
| **Menu** | Cận lâm sàng → "[24] DICOM tự động gửi" |
| **Service BE** | `DicomAutoSendService` (`NangCap24Services.cs:1034+`) |
| **External** | Orthanc PACS `168.110.52.7` (C-STORE) |
| **DB table** | `DicomAutoSendRules`, `DicomTransmissionLogs` |

**Flow detail:**

| Bước | Action | Role | Status | API | State |
|---|---|---|---|---|---|
| 1 | Tạo rule (modality + server đích + trigger) | Admin/Radiologist/RadiologyManager | rule `IsActive=true` | `POST /api/dicom-autosend/rules` | — |
| 2 | Gửi study thủ công | Authenticated | log pending→sending→done | `POST /api/dicom-autosend/send` | C-STORE qua Orthanc |
| 3 | (Auto) trigger-check quét rule | Admin | áp dụng rule | `POST /api/dicom-autosend/trigger-check` | — |
| 4 | Xem log truyền + stats | Authenticated | list + ByDestination/ByDay | `GET /transmissions`, `/stats` | — |

**Upstream:** RadiologyRequest, DicomStudy, RemotePacsServer (NangCap15).
**Downstream:** PACS đích (Cloud-PACS). Thống kê truyền.
**Edge case:** Orthanc unreachable → status `failed`. Server không tồn tại → 500. Encrypt → AES-256-GCM. 2 instance cùng trigger → có thể gửi 2 lần (chưa lock).

---

### 2.6 HL7 Message Queue Flow

| Trường | Giá trị |
|---|---|
| **URL** | `/v2/hl7-message-queue` |
| **Menu** | Liên thông → "[24] Hàng đợi HL7 (retry)" |
| **Service BE** | `Hl7QueueService` (`NangCap24Services.cs:1320+`) |
| **DB table** | `Hl7MessageQueues` |

**Flow detail (string status: pending/sending/sent/failed/acked/retrying):**

| Bước | Action | Role | Status trước | Status sau | API |
|---|---|---|---|---|---|
| 1 | Message vào queue (enqueue) | (system/demo) | — | `pending` | `POST /api/hl7-queue/demo-enqueue` (Admin, demo) |
| 2 | Gửi → nhận ACK | (system) | `pending`/`sending` | `sent`/`acked`/`failed` | (worker `ProcessPendingAsync` — chưa wire) |
| 3 | Retry message failed | Admin/Radiologist/LabManager | `failed` | `retrying`, RetryCount++ | `POST /api/hl7-queue/{id}/retry` |
| 4 | Retry tất cả failed | (same) | `failed` | batch retry | `POST /api/hl7-queue/retry-all-failed` |

**Upstream:** RIS/LIS/HIS (source message). ServiceRequest (RelatedRecordId).
**Downstream:** Target system (RIS/LIS) nhận message.
**Edge case:** Retry message `acked` → 500 "Message đã ACK, không cần retry". MaxRetries=5. Search trả kèm pendingCount/failedCount/ackedCount.

---

### 2.7 DICOM Study Activity Log Flow

| Trường | Giá trị |
|---|---|
| **URL** | `/v2/dicom-study-audit-log` |
| **Menu** | Cận lâm sàng → "[24] Log ca chụp DICOM" |
| **Service BE** | `DicomStudyActivityService` (`NangCap24Services.cs`) |
| **DB table** | `DicomStudyActivityLogs` |

**Flow detail (17 action enum):**

| Bước | Action | API |
|---|---|---|
| 1 | Ghi activity (created_from_his/viewed/result_approved/sent_to_remote...) | `POST /api/dicom-study-log/log` |
| 2 | Tra cứu (filter studyUid/action/user/date) | `GET /api/dicom-study-log` |
| 3 | Timeline 1 study | `GET /api/dicom-study-log/study/{studyUid}` |

**Upstream:** RadiologyRequest, DicomStudy, RadiologyReport.
**Downstream:** Audit RIS (chi tiết hơn AuditLog chung). NangCap RIS 1.11.
**Edge case:** PerformedByUserId null = system action. ActionLabel = nhãn tiếng Việt.

---

### 2.8 Bank / VietQR Payment Flow

| Trường | Giá trị |
|---|---|
| **URL** | `/v2/bank-payments` |
| **Menu** | Tài chính → "[24] TT Ngân hàng (BIDV/VCB/...)" |
| **Service BE** | `PaymentGatewayService.VietQR` (partial, `PaymentGatewayService.VietQR.cs`) |
| **External** | Banking apps VN (scan QR Napas247) |
| **DB table** | `PaymentTransactions` (sẵn có) + `Receipts` |

**Flow detail:**

| Bước | Action | Role | Status trước | Status sau | API |
|---|---|---|---|---|---|
| 1 | Tạo giao dịch (chọn 1/5 NH) | Authenticated | — | txn `pending`, QR EMVCo sinh ra | `POST /api/payment/create-url` |
| 2 | BN scan QR app NH → chuyển khoản | (BN) | — | (ngoài hệ thống) | — |
| 3 | Kế toán đối soát sao kê → confirm | **Admin/Accountant/Cashier** | `pending` | `Status=1` (paid), Receipt + HĐĐT | `POST /api/payment/bank/confirm` |

**5 NH + BIN:** BIDV `970418`, VCB `970436`, Agribank `970405`, Vietinbank `970415`, MSB `970426`.

**Upstream:** PaymentTransaction (sẵn có), Patient, Billing (invoice).
**Downstream:** ⚠️ `LinkReceiptAsync` tạo **Receipt + HĐĐT** — **dùng chung** với VNPay/MoMo/ZaloPay IPN.

**⚠️ Regression bug đã fix (commit `b523579`):** `LinkReceiptAsync` set
`Receipt.CashierId = Guid.Empty` vi phạm FK `FK_Receipts_Users_Cashier` (non-null)
→ INSERT fail 500. Fix: resolve `cashierId` về user confirm, fallback admin nếu
IPN online. **Bắt buộc regression cả 4 cổng** sau fix.

**Edge case:**
- Confirm idempotent: 2 lần → 500 "Giao dịch đã được xác nhận".
- Non-bank provider confirm → 500 "Chỉ có thể xác nhận thủ công cho giao dịch ngân hàng".
- VietQR static (amount=0) vs dynamic (amount>0).
- Merchant name >25 chars truncate + bỏ dấu tiếng Việt.

---

### 2.9 DICOM Viewer (MIP/MinIP/Cine/Mammo) Flow

| Trường | Giá trị |
|---|---|
| **URL** | `/v2/radiology/viewer` (KHÔNG route riêng) |
| **Component** | `MipMinIpViewer.tsx`, `CineControls.tsx`, `MammoViewer.tsx` |
| **Engine** | Cornerstone3D |
| **Backend** | `RISComplete/pacs/*` (sẵn có — không API mới) |

**Flow detail (Manual — cần study volume):**

| Tính năng | Action | Điều kiện |
|---|---|---|
| MIP/MinIP | Toggle projection trên volume CT/MRI | ≥10 slice |
| Cine | Play/pause/speed/frame multi-frame | multi-frame study |
| Mammography | CC/MLO layout + magnify + invert | study MG |

**Upstream:** Orthanc PACS (study DICOM).
**Downstream:** BS đọc kết quả (CĐHA workflow).
**Edge case:** Study <10 slice → fallback message. Verify viewer cũ (StackViewport/MPR) không bị phá.

---

## 3. Module Dependency Map

### 3.1 Sơ đồ dependency NangCap24 → module hiện có (READ)

```
NangCap24 module          →  READ từ module hiện có
─────────────────────────────────────────────────────
Biometric                 →  Patient
Inspector Portal          →  MedicalRecord, Patient, Department, InsuranceXml(signed XML)
EMR HL7 Export            →  MedicalRecord, ServiceRequest, Prescription, LabResult, RadiologyReport
EMR Cloud Sync            →  MedicalRecord (signed_xml/hl7/pdf)
DICOM Auto-Send           →  RadiologyRequest, DicomStudy, RemotePacsServer(NangCap15)
HL7 Queue                 →  ServiceRequest (RelatedRecordId)
DICOM Study Log           →  RadiologyRequest, DicomStudy, RadiologyReport
Bank/VietQR               →  PaymentTransaction(sẵn có), Patient, Billing, Users(cashier)
```

### 3.2 NangCap24 → external (WRITE / SEND)

| NangCap24 module | External | Hành động |
|---|---|---|
| Biometric | Browser WebAuthn API | register/sign (client-side) |
| EMR Cloud Sync | Cloudflare R2 | upload signed_xml/hl7/pdf |
| DICOM Auto-Send | Orthanc PACS `168.110.52.7` | C-STORE study |
| Bank/VietQR | Banking apps VN | QR scan (không API gateway) |
| HL7 Queue | RIS/LIS endpoint (TCP/HTTP) | gửi HL7 message + nhận ACK |

### 3.3 Module hiện có → NangCap24 (CALL / TRIGGER)

| Module gọi NangCap24 | Liên kết |
|---|---|
| Billing | Bank confirm → tạo Receipt + HĐĐT (`LinkReceiptAsync` dùng chung) |
| RIS/PACS | DICOM auto-send trigger on study arrival (manual hiện tại) |
| EMR | Biometric ký document; HL7 export; cloud sync |
| (Còn lại) | Không gọi tự động — qua UI |

### 3.4 Nếu module X thay đổi → regression area

| Module thay đổi | Regression NangCap24 |
|---|---|
| `PaymentTransaction` / `Receipt` schema | Bank confirm + **cả VNPay/MoMo/ZaloPay** (LinkReceiptAsync) |
| `RemotePacsServer` (NangCap15) | DICOM auto-send rule destination |
| `MedicalRecord` schema | Inspector, EMR HL7, EMR cloud sync |
| `DicomStudy` / `RadiologyRequest` | DICOM auto-send + study log |
| Cornerstone3D viewer | MIP/MinIP/Cine/Mammo |

---

## 4. UI Test Matrix

### 4.1 Quy tắc test mỗi page/modal NangCap24

Mỗi trong 7 page v2 + 1 standalone cần verify:
- [ ] **Load**: page render không console error (trừ SignalR/HMR/WebSocket pattern)
- [ ] **Empty state**: "Chưa có dữ liệu" khi DB rỗng
- [ ] **Loading**: spinner khi load list
- [ ] **KPI strip**: số liệu tổng hợp đúng (theo string status)
- [ ] **Filter/Search**: thu hẹp danh sách
- [ ] **Row click → drawer**: detail mở đúng
- [ ] **Action button**: theo role (ẩn/disable nếu không quyền)
- [ ] **Toast lỗi**: hiển thị message tiếng Việt khi API 500
- [ ] **Status chip**: màu theo string status (active/done/failed/acked...)

### 4.2 Đặc thù từng page

| Page | Đặc thù cần test |
|---|---|
| Bank Payments | QR image render (img.vietqr.io); confirm modal; 5 bank dropdown |
| Biometric Enrollment | ⚠️ Browser WebAuthn popup (HTTPS + authenticator); credential list |
| Inspector Portal | Standalone login (không sidebar); JWT riêng; download XML |
| EMR HL7 Export | Textarea HL7 content; download .hl7 |
| EMR Cloud Sync | Dashboard status cards; fileTypes checkbox; retry-failed (Admin) |
| DICOM Auto-Send | Rule CRUD modal (chọn RemotePacsServer); send modal; stats chart |
| HL7 Queue | KPI pending/failed/acked; retry button; demo-enqueue (Admin) |
| DICOM Study Log | Timeline component; action label tiếng Việt |

---

## 5. Critical Medical/Financial/Legal Risk Test

### 5.1 Sai chữ ký pháp lý (Biometric)

⚠️ **Critical** — Biometric MVP `IsVerified=true` không verify chữ ký thật. Nếu
dùng làm chữ ký cam kết PT/đồng ý điều trị → **rủi ro pháp lý** (chữ ký không
xác thực được). Test: confirm stakeholder KHÔNG dùng cho chữ ký pháp lý, hoặc
wire Fido2NetLib verify trước go-live.

### 5.2 Sai thanh toán / Receipt (Bank)

- Bank confirm tạo Receipt sai CashierId → 500 FK (đã fix). Test regression.
- Confirm 2 lần → tránh double-charge (idempotent reject).
- QR EMVCo sai CRC → app NH không scan được → BN chuyển nhầm.

### 5.3 Rò rỉ HSBA (Inspector)

- Inspector token dùng chéo user → leak HSBA. Test 403 strict.
- Access log thiếu → mất audit giám định. Test ghi đủ access log.
- Signed XML placeholder → giám định nhận XML không ký thật.

### 5.4 Mất/sai dữ liệu CĐHA (DICOM auto-send)

- C-STORE fail im lặng → study không tới PACS đích → mất ảnh. Test log `failed`.
- 2 instance gửi 2 lần → duplicate study trên đích.

### 5.5 Race condition

- Bank confirm song song 2 user cùng txn → double Receipt. Test idempotent.
- Biometric register credential trùng → reject.
- DICOM auto-send rule trigger đồng thời → duplicate transmission.

### 5.6 Mất dữ liệu transaction

- Bank confirm: nếu SaveChanges fail sau set Status=1 nhưng trước Receipt → inconsistent. Test rollback.

### 5.7 Sync failure (EMR Cloud / HL7 Queue)

- R2 down → cloud sync `failed` → retry-failed phục hồi.
- HL7 endpoint down → message `failed` → retry-all-failed.

---

## 6. Integration Test

### 6.1 NangCap24 external integrations

```bash
# Pre-condition: prod/staging HTTPS + Orthanc VM + (tuỳ chọn) R2

# 1. Bank list
GET /api/payment/bank/list → 5 NH

# 2. Create VietQR + verify EMVCo
POST /api/payment/create-url {provider:"bidv", amount:500000, ...}
# Expected: qrCodeData khớp regex ^00020101...6304[0-9A-F]{4}$

# 3. Bank confirm → Receipt
POST /api/payment/bank/confirm {transactionId, bankReference}
# Expected: status=1, Receipt tạo, KHÔNG 500 FK

# 4. DICOM C-STORE thật (135-slice CT → Orthanc VM)
POST /api/dicom-autosend/send {studyInstanceUid, destinationServerId}
# Expected: DicomTransmissionLog status=done, study landed trên Orthanc

# 5. Inspector login + records
POST /api/inspector-portal/login {inspector/Inspector@123} → token
GET /api/inspector-portal/records (Bearer inspector token) → HSBA list

# 6. HL7 enqueue + retry
POST /api/hl7-queue/demo-enqueue → pending
POST /api/hl7-queue/{id}/retry → retrying

# 7. EMR HL7 export
POST /api/emr/hl7/export {medicalRecordId} → MSH segment
```

### 6.2 Integration với HIS infra (đã có sẵn)

| Infra | NangCap24 dùng | Verify |
|---|---|---|
| Orthanc PACS (NangCap15 RemotePacsServer) | DICOM auto-send C-STORE | server reachable |
| PaymentTransaction + Receipt + HĐĐT | Bank confirm | LinkReceiptAsync OK |
| Cornerstone3D | MIP/MinIP/Cine/Mammo | viewer cũ không phá |
| Audit log | Inspector access + study activity + biometric sign | log đầy đủ |

### 6.3 Integration test ưu tiên

1. **Bank confirm regression** (4 cổng VNPay/MoMo/ZaloPay/VietQR — FK dùng chung).
2. **DICOM C-STORE** thật tới Orthanc.
3. **Inspector** login + audit log.
4. **Biometric** end-to-end (cần authenticator) — verify MVP behavior.

---

## 7. Concurrent / Multi-user / Transaction Test

### 7.1 Concurrent access

| Scenario | Expected |
|---|---|
| 2 kế toán confirm cùng txn bank | 1 thành công, 1 = 500 "đã được xác nhận" (idempotent) |
| 2 user register cùng credentialId | 1 thành công, 1 = 500 "đã đăng ký trước đó" |
| 2 instance DICOM auto-send cùng rule | ⚠️ chưa lock → có thể 2 transmission (R6) |
| 2 inspector login fail liên tục | lockout sau ngưỡng |

### 7.2 Transaction rollback

- Bank confirm: Status=1 + Receipt trong cùng SaveChanges → fail thì rollback cả 2.
- DICOM transmission: log pending trước, update done/failed sau (không rollback ảnh đã gửi).

### 7.3 Session / Token

- Inspector JWT hết hạn → 401 → re-login.
- Inspector token KHÔNG dùng được cho endpoint user thường.

### 7.4 Audit log consistency

- Mỗi inspector action ghi `BhxhInspectorAccessLog`.
- Mỗi biometric sign ghi `BiometricSignatureLog`.
- Mỗi DICOM activity ghi `DicomStudyActivityLog`.
- AuditLogMiddleware chung vẫn ghi POST/PUT/DELETE NangCap24.

### 7.5 Financial consistency

- Bank confirm → Receipt amount = txn amount. Verify khớp.
- Refund → status refunded, không double.

---

## 8. Mapping UI → Component → API → Service → DB → Integration

### 8.1 Page `/v2/bank-payments`

| UI element | API | Service | Method | DB | External |
|---|---|---|---|---|---|
| Dropdown 5 NH | `GET /api/payment/bank/list` | (controller hardcoded) | — | — | — |
| Tạo QR | `POST /api/payment/create-url` | `IPaymentGatewayService` | `CreatePaymentUrlAsync` → `BuildBankVietQrUrl` | INSERT `PaymentTransactions` | `img.vietqr.io` (render) |
| Xác nhận CK | `POST /api/payment/bank/confirm` | (same) | `ConfirmBankTransferAsync` + `LinkReceiptAsync` | UPDATE txn + INSERT `Receipts` | — |
| List/search | `GET /api/payment/transactions` | (same) | `SearchAsync` | `PaymentTransactions` | — |

### 8.2 Page `/inspector-portal` (standalone)

| UI element | API | Service | Method | DB |
|---|---|---|---|---|
| Login form | `POST /api/inspector-portal/login` | `IBhxhInspectorService` | `LoginAsync` (BCrypt + lockout + JWT) | `BhxhInspectorAccounts` |
| Search HSBA | `GET /api/inspector-portal/records` | (same) | `SearchRecordsAsync` | `MedicalRecords` JOIN `Patients` + write `BhxhInspectorAccessLogs` |
| Detail | `GET /records/{id}` | (same) | `GetRecordDetailAsync` | (same) + access log |
| Download XML | `GET /records/{id}/signed-xml` | (same) | `DownloadSignedXmlAsync` ⚠️ placeholder | + access log |
| Account CRUD (Admin) | `GET/POST/PUT /accounts/*` | (same) | `*AccountAsync` | UPSERT `BhxhInspectorAccounts` |

### 8.3 Page `/v2/biometric-enrollment`

| UI element | API | Service | Method | DB |
|---|---|---|---|---|
| Đăng ký (begin) | `POST /api/biometric/register-begin` | `IBiometricSignatureService` | `BeginRegisterAsync` | (challenge in-memory) |
| Đăng ký (finish) | `POST /api/biometric/register-finish` | (same) | `FinishRegisterAsync` | INSERT `BiometricCredentials` |
| List credential | `GET /api/biometric/credentials/{patientId}` | (same) | `ListCredentialsAsync` | `BiometricCredentials` |
| Thu hồi | `DELETE /api/biometric/credentials/{id}` | (same) | `RevokeCredentialAsync` | UPDATE status=revoked |
| Ký (begin/finish) | `POST /api/biometric/sign-{begin,finish}` | (same) | `BeginSignAsync`/`FinishSignAsync` ⚠️ MVP | INSERT `BiometricSignatureLogs` |

### 8.4 Page `/v2/emr-hl7-export`

| UI element | API | Service | Method | DB |
|---|---|---|---|---|
| Xuất HL7 | `POST /api/emr/hl7/export` | `IEmrHl7ArchiveService` | `GenerateAsync` | READ MedicalRecord+Service+Rx+Lab+Radiology |
| Tải file | `GET /api/emr/hl7/export/{id}` | (same) | (same → file) | (same) |

### 8.5 Page `/v2/emr-cloud-sync`

| UI element | API | Service | Method | DB | External |
|---|---|---|---|---|---|
| Đồng bộ | `POST /api/emr/cloud-sync/sync` | `IEmrCloudSyncService` | `SyncRecordAsync` | INSERT `EmrCloudSyncLogs` | R2 |
| Status | `GET /api/emr/cloud-sync/status` | (same) | `GetStatusAsync` | aggregate | — |
| Logs | `GET /api/emr/cloud-sync/logs` | (same) | `GetLogsAsync` | `EmrCloudSyncLogs` | — |
| Retry-failed (Admin) | `POST /api/emr/cloud-sync/retry-failed` | (same) | `RetryFailedAsync` | UPDATE | R2 |

### 8.6 Page `/v2/dicom-autosend`

| UI element | API | Service | Method | DB | External |
|---|---|---|---|---|---|
| List rule | `GET /api/dicom-autosend/rules` | `IDicomAutoSendService` | `ListRulesAsync` | `DicomAutoSendRules` | — |
| CRUD rule | `POST/PUT/DELETE /rules[/{id}]` | (same) | `*RuleAsync` | UPSERT/UPDATE | — |
| Gửi study | `POST /api/dicom-autosend/send` | (same) | `SendStudyAsync` | INSERT `DicomTransmissionLogs` | Orthanc C-STORE |
| Log truyền | `GET /transmissions` | (same) | `SearchTransmissionsAsync` | `DicomTransmissionLogs` | — |
| Stats | `GET /stats` | (same) | `GetStatsAsync` | aggregate | — |

### 8.7 Page `/v2/hl7-message-queue`

| UI element | API | Service | Method | DB |
|---|---|---|---|---|
| Search + KPI | `GET /api/hl7-queue` | `IHl7QueueService` | `SearchAsync` | `Hl7MessageQueues` |
| Detail | `GET /{id}` | (same) | `GetByIdAsync` | (same, +Payload) |
| Retry | `POST /{id}/retry` | (same) | `RetryAsync` (reject acked) | UPDATE |
| Retry-all-failed | `POST /retry-all-failed` | (same) | `RetryAllFailedAsync` | UPDATE batch |
| Demo-enqueue (Admin) | `POST /demo-enqueue` | (same) | `EnqueueAsync` | INSERT |

### 8.8 Page `/v2/dicom-study-audit-log`

| UI element | API | Service | Method | DB |
|---|---|---|---|---|
| Search | `GET /api/dicom-study-log` | `IDicomStudyActivityService` | `SearchAsync` | `DicomStudyActivityLogs` |
| Timeline | `GET /study/{studyUid}` | (same) | `GetStudyTimelineAsync` | (same) |
| Ghi log | `POST /log` | (same) | `LogAsync` | INSERT |

---

## 9. Role-based Access Test

Tham chiếu `NangCap24Controllers.cs` + `PaymentGatewayController.cs`
`[Authorize(Roles=...)]` decorators.

### 9.1 Role mới NangCap24

| Role | Endpoint áp dụng | Source |
|---|---|---|
| `BhxhInspector` | `GET /inspector-portal/records[/{id}][/signed-xml]` | login trả JWT role này (tách user thường) |

### 9.2 Role test matrix per endpoint

| Endpoint | Admin | Doctor | Nurse | Radiologist | RadiologyManager | LabManager | Accountant | Cashier | BhxhInspector | Anonymous |
|---|---|---|---|---|---|---|---|---|---|---|
| `POST /biometric/*` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 401 |
| `POST /inspector-portal/login` | — | — | — | — | — | — | — | — | — | ✅ (AllowAnonymous) |
| `GET /inspector-portal/records` | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | ✅ | 401 |
| `GET/POST/PUT /inspector-portal/accounts` | ✅ | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| `POST /emr/hl7/export` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 401 |
| `POST /emr/cloud-sync/sync` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 401 |
| `POST /emr/cloud-sync/retry-failed` | ✅ | 403 | 403 | 403 | 403 | 403 | 403 | 403 | — | 401 |
| `GET /dicom-autosend/rules` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 401 |
| `POST/PUT/DELETE /dicom-autosend/rules` | ✅ | 403 | 403 | ✅ | ✅ | 403 | 403 | 403 | — | 401 |
| `POST /dicom-autosend/send` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 401 |
| `POST /dicom-autosend/trigger-check` | ✅ | 403 | 403 | 403 | 403 | 403 | 403 | 403 | — | 401 |
| `GET /hl7-queue` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 401 |
| `POST /hl7-queue/{id}/retry` + `/retry-all-failed` | ✅ | 403 | 403 | ✅ | 403 | ✅ | 403 | 403 | — | 401 |
| `POST /hl7-queue/demo-enqueue` | ✅ | 403 | 403 | 403 | 403 | 403 | 403 | 403 | — | 401 |
| `GET/POST /dicom-study-log` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 401 |
| `GET /payment/bank/list` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 401 |
| `POST /payment/bank/confirm` | ✅ | 403 | 403 | 403 | 403 | 403 | ✅ | ✅ | — | 401 |
| `POST /payment/refund` | ✅ | 403 | 403 | 403 | 403 | 403 | ✅ | 403 | — | 401 |
| `GET /payment/vnpay/return`, IPN | — | — | — | — | — | — | — | — | — | ✅ (AllowAnonymous) |

### 9.3 Test script template (Cypress)

```typescript
const ROLES = [
  { name: 'admin',         password: 'Admin@123' },
  { name: 'nurse.test',    password: 'Nurse@123' },
  { name: 'cashier.test',  password: 'Cashier@123' },
];

ROLES.forEach((role) => {
  it(`Role ${role.name} POST /payment/bank/confirm`, () => {
    cy.request({ method: 'POST', url: `${API}/auth/login`,
      body: { username: role.name, password: role.password } }).then((auth) => {
      const token = auth.body.data.token;
      cy.request({ method: 'POST', url: `${API}/payment/bank/confirm`,
        headers: { Authorization: `Bearer ${token}` },
        body: { transactionId: '...', bankReference: 'FT123' },
        failOnStatusCode: false }).then((r) => {
        const allowed = ['admin', 'accountant.test', 'cashier.test'];
        // Lưu ý: txn hợp lệ → 200; txn không tồn tại → 500 (không 404)
        if (allowed.includes(role.name)) expect([200, 500]).to.include(r.status);
        else expect(r.status).to.eq(403);
      });
    });
  });
});
```

> Inspector test riêng: login `/inspector-portal/login` lấy JWT `BhxhInspector`,
> rồi gọi `/records` → 200. Admin JWT gọi `/records` → 403.

---

## 10. Regression Priority

### 10.1 Critical (patient safety + financial + legal)

| # | Module / Test | Lý do Critical | Tần suất |
|---|---|---|---|
| C1 | **Bank confirm FK fix** (`LinkReceiptAsync` CashierId) | 500 toàn bộ payment confirm (4 cổng) → không thu được tiền | Mỗi commit Payment |
| C2 | **VNPay/MoMo/ZaloPay confirm** (dùng chung LinkReceiptAsync) | Regression từ fix bank confirm | Mỗi commit Payment |
| C3 | **Biometric chữ ký pháp lý** (MVP IsVerified) | Chữ ký không xác thực được → rủi ro pháp lý | Trước go-live (manual + stakeholder) |
| C4 | **Inspector role guard** (`BhxhInspector` only) | Leak HSBA cho user không phận sự | Mỗi commit Inspector |
| C5 | **Bank confirm idempotent** (reject Status==1) | Double Receipt / double charge | Mỗi commit Payment |
| C6 | **DICOM C-STORE** không mất ảnh | Study không tới PACS đích → mất dữ liệu chẩn đoán | Pre-release + integration |
| C7 | **Audit log** (inspector access + biometric sign + study activity) | Mất audit giám định/pháp lý | Mỗi release (manual) |
| C8 | **QR EMVCo CRC** đúng | App NH không scan / BN chuyển nhầm | Mỗi commit VietQR |

### 10.2 High (workflow disruption)

| # | Module / Test | Lý do High |
|---|---|---|
| H1 | Inspector login + lockout | Giám định không vào được / brute-force |
| H2 | HL7 queue retry / retry-all-failed | Message tồn đọng → liên thông RIS/LIS fail |
| H3 | DICOM auto-send rule + transmission log | Study không gửi tự động |
| H4 | EMR cloud sync + retry-failed | HSBA không backup → mất khi thảm hoạ |
| H5 | EMR HL7 export | Liên thông HL7 ngoài fail |
| H6 | DICOM viewer cũ (StackViewport/MPR) | MIP/MinIP/Cine/Mammo phá viewer cũ |
| H7 | DICOM study activity log | Mất audit per-study (NangCap RIS 1.11) |

### 10.3 Medium

| # | Module / Test | Lý do |
|---|---|---|
| M1 | 7 v2 page load không console error | UX |
| M2 | Inspector standalone route ngoài layout | Routing |
| M3 | String status chip render đúng | UI |
| M4 | MIP/MinIP/Cine/Mammo render | Tính năng viewer |
| M5 | DICOM auto-send stats | Báo cáo |

### 10.4 Low

| # | Module / Test |
|---|---|
| L1 | Bank list 5 NH + màu |
| L2 | HL7 demo-enqueue |
| L3 | DICOM study log action label tiếng Việt |
| L4 | VietQR static vs dynamic |

### 10.5 Priority test execution order

1. **Bank confirm + 4 cổng payment** (C1, C2, C5) — regression FK fix.
2. **Inspector role guard + audit** (C4, C7).
3. **Biometric MVP confirm** (C3) — manual + stakeholder.
4. **DICOM C-STORE + auto-send** (C6, H3).
5. **HL7 queue + EMR cloud/HL7** (H2, H4, H5).
6. **Viewer regression** (H6).
7. **Page-load smoke** (M1).

### 10.6 Module ưu tiên (patient safety / financial / legal)

1. **Bank/VietQR** (financial — thu viện phí).
2. **Biometric** (legal — chữ ký).
3. **Inspector** (legal — giám định BHXH + privacy HSBA).
4. **DICOM auto-send** (clinical — không mất ảnh).
5. **HL7/Cloud sync** (liên thông + backup).

---

## Tài liệu liên quan

- [README.md](./README.md) — Tổng quan + architecture + known risks
- [analysis.md](./analysis.md) — Phân tích source code per-layer
- [test-plan.md](./test-plan.md) — Test plan per-chức-năng + test case
- [test-guide.md](./test-guide.md) — QA checklist UI/manual
- [summary.md](./summary.md) — Index + module impact

## Commit reference

- `2998527` — feat(nangcap24): close 10 gap (BE + FE + tests)
- `185ccd5` — feat(nangcap24-v2): port 9 pages
- `b523579` — fix(payment): FK_Receipts_Users_Cashier confirm
- `0eb70c1` — feat(v2-menu): [24] 7 menu + prod functional test
