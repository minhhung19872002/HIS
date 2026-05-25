# NangCap24 — QA Test Guide

Dùng cho: QA team kiểm thử end-to-end + regression trước mỗi release.

**Prerequisites:**
- Backend chạy `http://localhost:5106`
- Frontend chạy `http://localhost:3001`
- Tài khoản: `admin / Admin@123` + `inspector / Inspector@123` (cổng thanh tra) + 1 tài khoản role `Nurse` để test permission denial
- **HTTPS + thiết bị sinh trắc** cho phần Biometric (không test được trên http IP)

> ⚠️ **Khác NangCap23:** NangCap24 KHÔNG có exception filter → lỗi validation /
> not-found trả **HTTP 500** (không 400/404). Khi test assert lỗi, kỳ vọng 500
> + message tiếng Việt.

---

## 1. Tổng quan NangCap24

NangCap24 đóng 10 gap HSMT BV Đa khoa:

| Module | Loại logic | External |
|---|---|---|
| Biometric / WebAuthn | Ký sinh trắc 2-phase (register + sign) | Browser WebAuthn API + authenticator |
| Cổng thanh tra BHXH | Login riêng + tra cứu HSBA | — (standalone JWT) |
| EMR HL7 export | Xuất HSBA → HL7 v2 | — |
| EMR cloud sync | Đồng bộ HSBA lên Cloud | Cloudflare R2 |
| DICOM auto-send | Rule-based gửi study | Orthanc PACS (C-STORE) |
| HL7 message queue | Hàng đợi + retry | RIS/LIS endpoint |
| DICOM study activity log | Audit per-study | — |
| Bank / VietQR payment | QR Napas247 + confirm thủ công | Banking apps VN |
| MIP/MinIP + Cine + Mammo | DICOM viewer nâng cấp (FE) | — |

---

## 2. Danh sách phân hệ liên quan

| Phân hệ | Menu | Route |
|---|---|---|
| Bank Payments | Tài chính → "[24] TT Ngân hàng (BIDV/VCB/...)" | `/v2/bank-payments` |
| Biometric Enrollment | Hồ sơ & Ký số → "[24] Vân tay BN (WebAuthn)" | `/v2/biometric-enrollment` |
| EMR HL7 Export | Liên thông → "[24] Xuất HL7 v2 HSBA" | `/v2/emr-hl7-export` |
| EMR Cloud Sync | Liên thông → "[24] Đồng bộ EMR lên Cloud" | `/v2/emr-cloud-sync` |
| DICOM Auto-Send | Cận lâm sàng → "[24] DICOM tự động gửi" | `/v2/dicom-autosend` |
| HL7 Message Queue | Liên thông → "[24] Hàng đợi HL7 (retry)" | `/v2/hl7-message-queue` |
| DICOM Study Audit Log | Cận lâm sàng → "[24] Log ca chụp DICOM" | `/v2/dicom-study-audit-log` |
| **Cổng thanh tra BHXH** | (KHÔNG có trong menu — standalone) | `/inspector-portal` |

---

## 3. Danh sách màn hình cần test

### 3.1 Bank Payments — VietQR 5 ngân hàng

Màn hình cần test:
- [ ] Danh sách giao dịch + KPI (Tổng/Đã thanh toán/Chờ/Hoàn)
- [ ] Modal tạo giao dịch → chọn 1 trong 5 NH → hiển thị QR (img.vietqr.io)
- [ ] Modal "Xác nhận chuyển khoản" (kế toán đối soát) → nhập bankReference + note
- [ ] Click row → drawer detail giao dịch

Cần verify:
- [ ] **5 NH** từ `GET /payment/bank/list`: bidv, vcb, agribank, vietinbank, msb + BIN + màu
- [ ] **QR EMVCo hợp lệ**: qrCodeData bắt đầu `00020101`, kết thúc `6304<CRC>`, chứa BIN
- [ ] **Confirm**: status → 1 (paid), tạo Receipt + HĐĐT
- [ ] **Confirm idempotent**: confirm 2 lần → 500 "Giao dịch đã được xác nhận"
- [ ] **Permission**: confirm chỉ Admin/Accountant/Cashier (Nurse → 403)
- [ ] **Regression FK**: Receipt.CashierId = user confirm (KHÔNG Guid.Empty)

API:
- `GET /api/payment/bank/list`
- `POST /api/payment/create-url` (provider ∈ 5 bank → VietQR)
- `POST /api/payment/bank/confirm` ⚠️ `[Authorize(Roles="Admin,Accountant,Cashier")]`

### 3.2 Biometric Enrollment — vân tay BN (WebAuthn)

> ⚠️ **Cần HTTPS + thiết bị authenticator.** Không test được qua curl/headless.

Màn hình cần test:
- [ ] Chọn BN → "Đăng ký vân tay" → browser popup WebAuthn (Touch ID/Hello/FIDO2)
- [ ] List credential đã đăng ký của BN (device name, status, usage count)
- [ ] "Thu hồi" credential → status `revoked`
- [ ] Ký document → "Ký bằng vân tay" → browser popup → log signature

Cần verify:
- [ ] **Register flow**: begin (challenge) → browser create → finish (lưu credential)
- [ ] **Sign flow**: begin (allowCredentials) → browser get → finish (signature log)
- [ ] ⚠️ **IsVerified MVP**: hiện accept signature (true) khi credential active — **CHƯA verify ECDSA/RSA thật**. Xác nhận với stakeholder không dùng làm chữ ký pháp lý.
- [ ] **BN chưa đăng ký** → sign-begin → 500 "Bệnh nhân chưa đăng ký vân tay"
- [ ] **Credential revoked** → sign-finish → `isVerified:false`

API:
- `POST /api/biometric/register-begin` + `/register-finish`
- `GET/DELETE /api/biometric/credentials/{...}`
- `POST /api/biometric/sign-begin` + `/sign-finish`

### 3.3 Cổng thanh tra BHXH — Inspector Portal (standalone)

Màn hình cần test:
- [ ] Truy cập `/inspector-portal` (KHÔNG qua admin login) → form login riêng
- [ ] Login `inspector / Inspector@123` → vào cổng "CỔNG GIÁM ĐỊNH BHXH"
- [ ] Tra cứu HSBA (keyword, ngày, khoa, số thẻ BHYT, loại điều trị)
- [ ] Click HSBA → detail (files, dịch vụ, thuốc, BHYT amount, đồng chi trả)
- [ ] Tải XML đã ký (download HSBA_{id}.xml)
- [ ] (Admin) Quản lý tài khoản inspector: tạo / khóa / reset password

Cần verify:
- [ ] **Login**: đúng → JWT role `BhxhInspector`; sai → fail count++; quá ngưỡng → lockout
- [ ] **Role guard**: admin token gọi `/records` → 403 (chỉ `BhxhInspector`); no token → 401
- [ ] **Access log**: mỗi search/view/download ghi `BhxhInspectorAccessLogs`
- [ ] ⚠️ **Signed XML**: hiện placeholder `<Signature>placeholder-pkcs7-detached-signature</Signature>`
- [ ] **Account CRUD**: chỉ Admin (Nurse → 403); username trùng → 500

API:
- `POST /api/inspector-portal/login` (anonymous)
- `GET /api/inspector-portal/records[/{id}][/signed-xml]` ⚠️ `[BhxhInspector]`
- `GET/POST /api/inspector-portal/accounts`, `PUT /{id}/active`, `POST /{id}/reset-password` ⚠️ `[Admin]`

### 3.4 EMR HL7 Export

Màn hình cần test:
- [ ] Chọn HSBA → cấu hình include (services/prescriptions/lab/radiology) → "Xuất HL7"
- [ ] Hiển thị nội dung HL7 + nút "Tải file" (.hl7) sau khi export

Cần verify:
- [ ] **HL7 content** bắt đầu `MSH|^~\&|...`, có `messageCount > 0`
- [ ] **Download file** trả `text/plain`
- [ ] **HSBA không tồn tại** → 500 "Hồ sơ không tồn tại"

API: `POST /api/emr/hl7/export`, `GET /api/emr/hl7/export/{medicalRecordId}`

### 3.5 EMR Cloud Sync

Màn hình cần test:
- [ ] Dashboard status (tracked/synced/partial/failed + lastSyncAt)
- [ ] Đồng bộ HSBA → chọn fileTypes (signed_xml/hl7/pdf) + syncToDr → kết quả
- [ ] Logs đồng bộ (filter status: pending/uploading/done/failed)
- [ ] (Admin) "Thử lại lỗi" → retry-failed

Cần verify:
- [ ] **Sync** trả `{totalFiles, successCount, failedCount, logs[]}`
- [ ] **Destination**: r2_primary / r2_dr / local_backup
- [ ] **R2 chưa cấu hình** → log status `failed` + ErrorMessage, không crash
- [ ] **Retry-failed** chỉ Admin (Nurse → 403)

API: `POST /api/emr/cloud-sync/sync`, `GET /logs`, `GET /status`, `POST /retry-failed` ⚠️ `[Admin]`

### 3.6 DICOM Auto-Send

Màn hình cần test:
- [ ] Danh sách rule (tên, modality, server đích, trigger, priority, active)
- [ ] CRUD rule: tạo / sửa / xóa (chọn RemotePacsServer đích)
- [ ] Gửi study thủ công (studyUid + server) → log truyền
- [ ] Log truyền (filter from/to/status) + thống kê (theo server + theo ngày)

Cần verify:
- [ ] **Rule CRUD** chỉ Admin/Radiologist/RadiologyManager (Nurse → 403)
- [ ] **Send C-STORE**: status pending→sending→done (cần Orthanc reachable); fail → `failed` + ErrorMessage
- [ ] **Server không tồn tại** → 500 "Server đích không tồn tại"
- [ ] **Stats** trả `{totalTransmissions, byDestination[], byDay[]}`
- [ ] **Encrypt**: nếu bật → `wasEncrypted:true, encryptionAlgorithm:"AES-256-GCM"`

API: `GET/POST/PUT/DELETE /api/dicom-autosend/rules`, `POST /send`, `GET /transmissions`, `GET /stats`, `POST /trigger-check` ⚠️ `[Admin]`

### 3.7 HL7 Message Queue

Màn hình cần test:
- [ ] Danh sách message + KPI (pending/failed/acked count)
- [ ] Filter: status / direction / source / messageType
- [ ] Click message → detail (kèm payload HL7)
- [ ] "Gửi lại" (retry) + "Gửi lại tất cả lỗi" (retry-all-failed)
- [ ] (Admin) "Tạo demo" → demo-enqueue

Cần verify:
- [ ] **Search** trả `{items[], totalCount, pendingCount, failedCount, ackedCount}`
- [ ] **Retry message acked** → 500 "Message đã ACK, không cần retry"
- [ ] **Retry-all-failed** trả `{retried, succeededImmediately, stillFailed}`
- [ ] **Permission retry** chỉ Admin/Radiologist/LabManager
- [ ] **Demo-enqueue** chỉ Admin
- [ ] **Status string**: pending/sending/sent/failed/acked/retrying (KHÔNG phải int)

API: `GET /api/hl7-queue`, `GET /{id}`, `POST /{id}/retry` ⚠️ `[Admin,Radiologist,LabManager]`, `POST /retry-all-failed`, `POST /demo-enqueue` ⚠️ `[Admin]`

### 3.8 DICOM Study Activity Log

Màn hình cần test:
- [ ] Danh sách activity (filter studyUid/action/user/date)
- [ ] Timeline 1 study (theo thứ tự thời gian)
- [ ] Action label tiếng Việt (created_from_his, viewed, result_approved, ...)

Cần verify:
- [ ] **17 action enum** render đúng `actionLabel`
- [ ] **Timeline** sorted theo `performedAt`
- [ ] **Log** ghi đủ: action + performedByName + machineName + ipAddress

API: `GET /api/dicom-study-log`, `GET /study/{studyUid}`, `POST /log`

### 3.9 Viewer (MIP/MinIP + Cine + Mammography)

> Test trong DICOM Viewer (`/v2/radiology/viewer`), KHÔNG có route v2 riêng.

Màn hình cần test:
- [ ] MIP/MinIP toggle trên study CT/MRI volume (≥10 slice)
- [ ] Cine playback (play/pause/speed/frame) trên multi-frame
- [ ] Mammography: CC/MLO layout + magnify + inversion

Cần verify:
- [ ] MIP render maximum intensity; MinIP minimum
- [ ] Cine loop mượt; control speed/frame
- [ ] Viewer cũ (StackViewport/MPR) **không bị phá** (regression)

---

## 4. Business flow cần verify

### 4.1 Flow: Bank/VietQR payment → confirm

1. Thu ngân tạo giao dịch (provider = bidv/vcb/...) → `POST /payment/create-url`
2. Backend build QR EMVCo TLV (BIN + account + amount + ref `HIS <txnRef>`)
3. BN scan QR bằng app NH → chuyển khoản
4. Kế toán đối soát sao kê → `POST /payment/bank/confirm` với bankReference
5. Backend: status=1 (paid) + PayDate + GatewayTxnRef + **LinkReceiptAsync(txn, cashierId)** → Receipt + HĐĐT
6. ⚠️ **FK fix** (b523579): CashierId = user confirm, KHÔNG Guid.Empty

### 4.2 Flow: Inspector tra cứu HSBA

1. Giám định viên mở `/inspector-portal` (ngoài admin login)
2. Login `inspector/Inspector@123` → JWT role `BhxhInspector`
3. Search HSBA (keyword/khoa/thẻ BHYT) → ghi access log "search"
4. View detail → ghi access log "view_record"
5. Download signed XML → ghi access log "download_xml" ⚠️ placeholder signature

### 4.3 Flow: Biometric ký document

1. (Một lần) BN đăng ký vân tay: register-begin → browser `credentials.create()` → register-finish (lưu COSE key)
2. Khi ký: sign-begin (challenge + allowCredentials) → browser `credentials.get()` → sign-finish
3. ⚠️ Backend accept (MVP) → ghi `BiometricSignatureLog`, IsVerified=true
4. Production: cần verify `Signature` + `AuthenticatorData` bằng PublicKey COSE

### 4.4 Flow: DICOM auto-send

1. Admin/Radiologist tạo rule (modality=CT, server đích, trigger=on_arrival)
2. Study DICOM về PACS → (auto hoặc manual `POST /send`)
3. Backend C-STORE qua Orthanc REST tới RemotePacsServer
4. Ghi `DicomTransmissionLog` (pending→sending→done/failed)
5. Stats tổng hợp theo server + ngày

---

## 5. Các trường hợp validation

> ⚠️ Tất cả trả **HTTP 500** (không 400/404) do thiếu exception filter.

| Endpoint | Field | Rule | Expected |
|---|---|---|---|
| Biometric register-begin | PatientId | Patient tồn tại | 500 "Bệnh nhân không tồn tại" |
| Biometric register-finish | CredentialId | Không trùng | 500 "Credential đã đăng ký trước đó" |
| Biometric sign-begin | PatientId | Có ≥1 credential | 500 "Bệnh nhân chưa đăng ký vân tay" |
| Inspector create | Username | Không trùng | 500 "Tên đăng nhập đã tồn tại" |
| EMR HL7/Cloud | MedicalRecordId | Record tồn tại | 500 "Hồ sơ không tồn tại" |
| DICOM autosend | DestinationServerId | Server tồn tại | 500 "Server đích không tồn tại" |
| HL7 retry | Status | Không phải `acked` | 500 "Message đã ACK, không cần retry" |
| Bank confirm | TransactionId | Tồn tại + bank provider + chưa confirm | 500 (3 message khác nhau) |

---

## 6. Permission cần test

| Endpoint | Role yêu cầu | Test case |
|---|---|---|
| `GET /inspector-portal/records` | `BhxhInspector` | admin → 403; inspector → 200; anonymous → 401 |
| `POST /inspector-portal/accounts` | `Admin` | Nurse → 403; Admin → 200 |
| `POST /dicom-autosend/rules` (+PUT/DELETE) | `Admin,Radiologist,RadiologyManager` | Nurse → 403 |
| `POST /dicom-autosend/trigger-check` | `Admin` | non-admin → 403 |
| `POST /hl7-queue/{id}/retry` (+retry-all-failed) | `Admin,Radiologist,LabManager` | Nurse → 403 |
| `POST /hl7-queue/demo-enqueue` | `Admin` | non-admin → 403 |
| `POST /emr/cloud-sync/retry-failed` | `Admin` | Nurse → 403 |
| `POST /payment/bank/confirm` | `Admin,Accountant,Cashier` | Nurse → 403 |
| `POST /payment/refund` | `Admin,Accountant` | Cashier → 403 |
| `POST /inspector-portal/login` | Anonymous OK | no token → 200 (login form) |
| Payment IPN/return (vnpay/momo/zalopay) | Anonymous OK | gateway callback → 200 |

---

## 7. External gateway / hạ tầng cần verify

| Hệ thống | Endpoint / Host | Dùng cho | Verify |
|---|---|---|---|
| Browser WebAuthn | (client API) | Biometric register/sign | HTTPS + authenticator |
| Orthanc PACS | `168.110.52.7` (C-STORE) | DICOM auto-send | server reachable, study landed |
| Cloudflare R2 | (S3 API) | EMR cloud sync | access key, upload OK |
| Banking apps VN | (scan QR) | Bank payment | QR scan + confirm |
| VietQR render | `img.vietqr.io` | QR preview | image URL load |

---

## 8. Regression impact — module phụ thuộc

| NangCap24 module | Ảnh hưởng tới | Cần test regression |
|---|---|---|
| **Bank/VietQR** (`LinkReceiptAsync`) | ⚠️ **VNPay/MoMo/ZaloPay IPN** (dùng chung hàm) + Billing Receipt/HĐĐT | **Bắt buộc** test cả 4 cổng confirm sau fix FK |
| MIP/MinIP/Cine/Mammo viewer | DICOM Viewer (StackViewport/MPR cũ) | Verify viewer cũ không bị phá |
| HL7 message queue | RIS/LIS HL7 flow (07-lis-hl7spy) | HL7 mới không phá flow cũ |
| DICOM auto-send | RIS/PACS, RemotePacsServer (NangCap15) | Verify remote-server config cũ vẫn OK |
| EMR HL7/Cloud sync | MedicalRecord (read-only) | Không write clinical data |
| Inspector portal | MedicalRecord/Patient (read-only) + admin login | Không ảnh hưởng login chính |
| Biometric | EMR document, Patient | Credential lưu riêng, không phá EMR |
| DICOM study log | RIS report flow (write-only log) | Không phá đọc/duyệt kết quả |

---

## 9. Màn hình có dependency

### NangCap24 phụ thuộc data từ module khác:

| Module phụ thuộc | NangCap24 module | Trường data |
|---|---|---|
| Patient | Biometric, Inspector | PatientId |
| MedicalRecord | Inspector, EMR HL7, EMR Cloud | MedicalRecordId |
| RemotePacsServer (NangCap15) | DICOM auto-send | DestinationServerId |
| DicomStudy / RadiologyRequest | DICOM auto-send, DICOM study log | StudyInstanceUid |
| PaymentTransaction (sẵn có) | Bank/VietQR | confirm + Receipt link |
| Users | Bank confirm (CashierId), audit | UserId |
| InsuranceXml (signed XML) | Inspector download | signed XML file |

### Module khác phụ thuộc NangCap24:

| Module | Liên kết |
|---|---|
| Billing | Bank confirm → tạo Receipt + HĐĐT |
| (Còn lại) | Không có module nào gọi NangCap24 ngoài UI |

---

## 10. Test commands

```bash
# Backend dev
cd backend/src/HIS.API
DOTNET_ROLL_FORWARD=LatestMajor ASPNETCORE_ENVIRONMENT=Development \
  dotnet run --launch-profile http

# Frontend dev
cd frontend && npm run dev

# Cypress page-load + API
cd frontend
npx cypress run --spec "cypress/e2e/nangcap24-pages.cy.ts" --browser chrome

# Playwright page-load + functional
npx playwright test e2e/nangcap24-pages.spec.ts

# Prod functional smoke
npx playwright test e2e-prod/nangcap24-functional.spec.ts --config=playwright.prod.config.ts

# Build verify
cd backend && dotnet build HIS.sln --nologo
cd frontend && npm run build
```

## 11. Production checklist (final go-live)

- [ ] Cloud Run env `PaymentGateway__Bank__<bank>__AccountNumber=<số TK thật>` cho 5 NH
- [ ] Cloud Run env `Jwt__Key` set (inspector JWT)
- [ ] (tuỳ chọn) R2 credential cho EMR cloud sync
- [ ] RemotePacsServer config cho DICOM auto-send (Orthanc reachable)
- [ ] HTTPS bắt buộc (biometric) — Vercel + Cloud Run đã có
- [ ] Migration 44 apply → 9 table + seed inspector
- [ ] `GET /health/schema-drift` → `missingCount: 0`
- [ ] ⚠️ Xác nhận stakeholder: biometric MVP chưa dùng làm chữ ký pháp lý (hoặc wire Fido2NetLib)
- [ ] ⚠️ Xác nhận inspector signed-XML placeholder hay đã ký thật
- [ ] Regression test VNPay/MoMo/ZaloPay confirm (FK fix dùng chung)
- [ ] Inspector account `inspector` đổi password mặc định trước prod
- [ ] Run `nangcap24-pages.cy.ts` + Playwright trên Staging → pass
