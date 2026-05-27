# NangCap24 — Phân tích Source Code

> **Mục đích:** Phân tích chi tiết source code per-layer cho gói nâng cấp 24.
> Dùng cho Dev review + Audit + QA hiểu cấu trúc trước khi viết test.
> **Nguồn:** Đọc trực tiếp `NangCap24Entities.cs`, `NangCap24DTOs.cs`,
> `INangCap24Services.cs`, `NangCap24Services.cs`, `NangCap24Controllers.cs`,
> `PaymentGatewayService.VietQR.cs`, `44_nangcap24.sql`, `App.tsx`,
> `TerminalLayout.tsx`. **Không suy đoán.**
> **Tài liệu liên quan:** [README.md](./README.md) · [test-plan.md](./test-plan.md)
> · [test-guide.md](./test-guide.md) · [workflow-test.md](./workflow-test.md) · [summary.md](./summary.md).
> **Last updated:** 2026-05-25

---

## Mục lục

- [1. Phạm vi nâng cấp](#1-phạm-vi-nâng-cấp)
- [2. Thay đổi theo lớp kiến trúc](#2-thay-đổi-theo-lớp-kiến-trúc)
- [3. Entity / Schema](#3-entity--schema)
- [4. DTO / Request / Response](#4-dto--request--response)
- [5. Service Interface + Implementation](#5-service-interface--implementation)
- [6. Controller / API](#6-controller--api)
- [7. Business Logic mới](#7-business-logic-mới)
- [8. Validation Rule](#8-validation-rule)
- [9. External Integration](#9-external-integration)
- [10. VietQR EMVCo TLV](#10-vietqr-emvco-tlv)
- [11. Frontend — Route + UI](#11-frontend--route--ui)
- [12. Chức năng đã triển khai vs chưa](#12-chức-năng-đã-triển-khai-vs-chưa)
- [17. TODO / FIXME / Nguy cơ tiềm ẩn](#17-todo--fixme--nguy-cơ-tiềm-ẩn)
- [18. Tham chiếu commit](#18-tham-chiếu-commit)

---

## 1. Phạm vi nâng cấp

NangCap24 đóng 10 gap HSMT BV Đa khoa, chia 3 nhóm:

| Nhóm | Gap | Đặc điểm kỹ thuật |
|---|---|---|
| **Backend full-stack** (gap 1–7) | Biometric, Inspector, EMR HL7, EMR Cloud sync, DICOM auto-send, HL7 queue, DICOM study log | 9 entity mới + 7 service + 7 controller + 9 bảng |
| **Mở rộng module sẵn có** (gap 8) | Bank/VietQR payment | `partial class PaymentGatewayService` — không tạo service mới, tái dùng `PaymentTransaction` entity + IPN infrastructure |
| **Frontend-only** (gap 9–10) | MIP/MinIP viewer, Cine + Mammography | Component Cornerstone3D, **không có API/entity mới** |

**Khác biệt với NangCap23:**
- NangCap24 **chỉ có UI v2** (TerminalLayout) — không có page v1 (MainLayout). Riêng Inspector Portal là **standalone** ngoài cả 2 layout.
- Status field dùng **string** (`"active"`, `"done"`, `"acked"`...) thay vì int 0–4 như NangCap23.
- **Không có** `ExceptionFilter` riêng, **không có** `RetryWorker` background, **không có** `ConfigStore` encryption, **không có** SSRF validator. → đơn giản hơn nhưng cũng ít hardening hơn.

---

## 2. Thay đổi theo lớp kiến trúc

| Lớp | File | Thay đổi |
|---|---|---|
| `HIS.Core` | `Entities/NangCap24Entities.cs` | NEW — 9 entity |
| `HIS.Application` | `DTOs/NangCap24/NangCap24DTOs.cs` | NEW — ~30 DTO |
| `HIS.Application` | `DTOs/Payment/PaymentGatewayDTOs.cs` | MODIFIED — +`BankConfirmDto` |
| `HIS.Application` | `Services/INangCap24Services.cs` | NEW — 7 interface |
| `HIS.Application` | `Services/IPaymentGatewayService.cs` | MODIFIED — +`ConfirmBankTransferAsync` |
| `HIS.Infrastructure` | `Services/NangCap24Services.cs` | NEW — 7 impl (~1547 LOC) |
| `HIS.Infrastructure` | `Services/PaymentGatewayService.VietQR.cs` | NEW — partial class (~217 LOC) |
| `HIS.Infrastructure` | `Data/HISDbContext.cs` | MODIFIED — +9 DbSet + Fluent API |
| `HIS.Infrastructure` | `DependencyInjection.cs` | MODIFIED — +7 service registration |
| `HIS.Infrastructure` | `Data/Scripts/44_nangcap24.sql` | NEW — 9 bảng + seed inspector |
| `HIS.API` | `Controllers/NangCap24Controllers.cs` | NEW — 7 controller |
| `HIS.API` | `Controllers/PaymentGatewayController.cs` | MODIFIED — +`bank/list`, `bank/confirm` |

---

## 3. Entity / Schema

### 3.1 Entity mới (9) — file `NangCap24Entities.cs`

| # | Entity | Bảng | Mục đích | Status field |
|---|---|---|---|---|
| 1 | `BiometricCredential` | `BiometricCredentials` | FIDO2 credential (CredentialId + PublicKey COSE) cho BN ký sinh trắc | `Status`: `active` / `revoked` |
| 2 | `BiometricSignatureLog` | `BiometricSignatureLogs` | Log mỗi lần ký vân tay (audit + pháp lý) | `IsVerified` (bool) |
| 3 | `BhxhInspectorAccount` | `BhxhInspectorAccounts` | Tài khoản giám định viên BHXH (tách khỏi `Users`) | `IsActive` + `LockedUntil` |
| 4 | `BhxhInspectorAccessLog` | `BhxhInspectorAccessLogs` | Phiên truy cập HSBA của giám định viên | `Action`: login/view_record/download_xml/search |
| 5 | `EmrCloudSyncLog` | `EmrCloudSyncLogs` | Log đồng bộ HSBA lên Cloud R2 + DR | `Status`: pending/uploading/done/failed |
| 6 | `DicomAutoSendRule` | `DicomAutoSendRules` | Rule tự động gửi DICOM sang PACS đích | `IsActive` + `TriggerType`: on_arrival/scheduled/manual |
| 7 | `DicomTransmissionLog` | `DicomTransmissionLogs` | Log mỗi lần truyền DICOM (manual + auto) | `Status`: pending/sending/done/failed |
| 8 | `Hl7MessageQueue` | `Hl7MessageQueues` | Queue HL7 message giữa RIS/LIS/HIS để retry | `Status`: pending/sending/sent/failed/acked/retrying |
| 9 | `DicomStudyActivityLog` | `DicomStudyActivityLogs` | Audit per-DICOM-study (granular hơn AuditLog chung) | `Action`: 17 loại (created_from_his, viewed, result_approved, sent_to_remote...) |

Tất cả kế thừa `BaseEntity` (Id, CreatedAt, CreatedBy, UpdatedAt, UpdatedBy, IsDeleted).

### 3.2 Trạng thái — KHÁC NangCap23 (string thay vì int)

NangCap24 dùng status **chuỗi** (string enum) thay vì int `0..4`:

```
BiometricCredential.Status:  "active" | "revoked"
EmrCloudSyncLog.Status:      "pending" | "uploading" | "done" | "failed"
DicomTransmissionLog.Status: "pending" | "sending" | "done" | "failed"
Hl7MessageQueue.Status:      "pending" | "sending" | "sent" | "failed" | "acked" | "retrying"
```

→ Test phải assert string status, không phải số. Frontend filter/chip cũng key theo string.

### 3.3 Migration script

- `44_nangcap24.sql` — 9 `CREATE TABLE IF NOT EXISTS` + index + **seed tài khoản inspector** (`inspector` / `Inspector@123`, BCrypt `$2a$11$Lp3w...`).
- Idempotent: `IF NOT EXISTS (SELECT 1 FROM sys.tables ...)` cho table, `IF NOT EXISTS (SELECT 1 FROM BhxhInspectorAccounts WHERE Username='inspector')` cho seed.
- Auto-apply qua `ProductionSchemaRepairRunner` lúc Cloud Run cold start.
- Unique index: `UX_BhxhInspectorAccounts_Username`.

### 3.4 Quan hệ navigation

- `BiometricSignatureLog.CredentialId` → `BiometricCredential` (FK logic, không cascade).
- `DicomAutoSendRule.DestinationServerId` → `RemotePacsServer` (entity sẵn có từ NangCap15).
- `DicomTransmissionLog.AutoSendRuleId` nullable (null = manual send).
- HISDbContext Fluent API cấu hình FK cho các entity có navigation không theo convention (tránh shadow FK → 500).

---

## 4. DTO / Request / Response

~30 DTO trong `NangCap24DTOs.cs`, nhóm theo gap:

| Gap | DTO chính |
|---|---|
| Biometric | `BiometricRegisterBeginDto` → `BiometricRegisterBeginResponseDto` (Challenge + RpId + UserHandle); `BiometricRegisterFinishDto` → `BiometricCredentialDto`; `BiometricSignBeginDto` → `BiometricSignBeginResponseDto` (Challenge + AllowCredentials[]); `BiometricSignFinishDto` → `BiometricSignFinishResponseDto` (SignatureLogId + IsVerified + SignerName) |
| Inspector | `InspectorLoginDto` → `InspectorLoginResponseDto` (Success + Token + Inspector); `InspectorCreateDto`; `InspectorSearchRecordDto` (Keyword/FromDate/ToDate/DepartmentCode/InsuranceNumber/TreatmentType + paging) → `InspectorRecordSearchResultDto`; `InspectorRecordDetailDto` (Files[] + Services[] + Medicines[] + BhytAmount/CoPayAmount) |
| EMR HL7 | `Hl7ExportRequestDto` (MedicalRecordId + IncludeServices/Prescriptions/LabResults/RadiologyReports) → `Hl7ExportResponseDto` (Hl7Content + FileName + MessageCount) |
| EMR Cloud | `EmrCloudSyncRequestDto` (FileTypes[] = signed_xml/hl7/pdf + SyncToDr) → `EmrCloudSyncResponseDto` (TotalFiles + SuccessCount + FailedCount + Logs[]); `EmrCloudSyncStatusDto` (TotalRecordsTracked + FullySynced + Partial + Failed) |
| DICOM auto-send | `DicomAutoSendRuleCreateDto` → `DicomAutoSendRuleDto`; `DicomSendRequestDto` (StudyInstanceUid + DestinationServerId + Encrypt); `DicomTransmissionLogDto`; `DicomTransmissionStatsDto` (ByDestination[] + ByDay[]) |
| HL7 queue | `Hl7QueueSearchDto` → `Hl7QueueSearchResultDto` (Items[] + TotalCount + **PendingCount + FailedCount + AckedCount**); `Hl7MessageQueueDto` (Payload null trừ khi xem detail); `Hl7RetryResultDto` (Retried + SucceededImmediately + StillFailed) |
| DICOM study log | `DicomStudyActivityLogSearchDto` → `DicomStudyActivityLogSearchResultDto`; `DicomStudyActivityLogDto` (Action + **ActionLabel** + PerformedByName) |
| Payment (mở rộng) | `BankConfirmDto` (TransactionId + BankReference + PaidAt + Note) → `PaymentTransactionDto` |

---

## 5. Service Interface + Implementation

### 5.1 7 Service Interface (`INangCap24Services.cs`)

| Interface | Method chính |
|---|---|
| `IBiometricSignatureService` | `BeginRegisterAsync`, `FinishRegisterAsync`, `ListCredentialsAsync`, `RevokeCredentialAsync`, `BeginSignAsync`, `FinishSignAsync` |
| `IBhxhInspectorService` | `LoginAsync`, `ListAccountsAsync`, `CreateAccountAsync`, `UpdateAccountActiveAsync`, `ResetPasswordAsync`, `SearchRecordsAsync`, `GetRecordDetailAsync`, `DownloadSignedXmlAsync` |
| `IEmrHl7ArchiveService` | `GenerateAsync` |
| `IEmrCloudSyncService` | `SyncRecordAsync`, `GetLogsAsync`, `GetStatusAsync`, `RetryFailedAsync` |
| `IDicomAutoSendService` | `ListRulesAsync`, `CreateRuleAsync`, `UpdateRuleAsync`, `DeleteRuleAsync`, `SendStudyAsync`, `SearchTransmissionsAsync`, `GetStatsAsync`, `TriggerAutoSendCheckAsync` |
| `IHl7QueueService` | `EnqueueAsync`, `SearchAsync`, `GetByIdAsync`, `RetryAsync`, `RetryAllFailedAsync`, `ProcessPendingAsync` |
| `IDicomStudyActivityService` | `LogAsync`, `SearchAsync`, `GetStudyTimelineAsync` |

### 5.2 Implementation (`NangCap24Services.cs`, ~1547 LOC)

- 7 service class trong 1 file.
- DI registration: `DependencyInjection.cs:332-338` — tất cả `AddScoped`.
- **Validation tối thiểu**: 10 chỗ `throw new Exception("...")` (Vietnamese message) — chủ yếu check null entity hoặc trạng thái không hợp lệ. **Không** dùng `ArgumentException`/`InvalidOperationException` đặc thù → **không** map về 400/404 (vì không có exception filter) → trả **500**.

Các `throw` quan trọng:
| Service | Dòng | Điều kiện | Message |
|---|---|---|---|
| Biometric | 37 | Patient null | "Bệnh nhân không tồn tại" |
| Biometric | 69 | Credential trùng | "Credential đã đăng ký trước đó" |
| Biometric | 122 | BN chưa có credential | "Bệnh nhân chưa đăng ký vân tay" |
| Inspector | 334 | Username trùng | "Tên đăng nhập đã tồn tại" |
| EMR HL7/Cloud | 595, 792 | Record null | "Hồ sơ không tồn tại" |
| DICOM autosend | 1034, 1066 | Rule/Server null | "Rule không tồn tại" / "Server đích không tồn tại" |
| HL7 queue | 1320, 1321 | Msg null / đã ACK | "Message không tồn tại" / "Message đã ACK, không cần retry" |

---

## 6. Controller / API

### 6.1 Bảng tổng hợp endpoint

| Controller | Route | Endpoint | Auth |
|---|---|---|---|
| `BiometricSignatureController` | `/api/biometric` | register-begin, register-finish, credentials/{patientId}, DELETE credentials/{id}, sign-begin, sign-finish | `[Authorize]` |
| `BhxhInspectorPortalController` | `/api/inspector-portal` | login `[AllowAnonymous]`; records, records/{id}, records/{id}/signed-xml `[Authorize(BhxhInspector)]`; accounts CRUD + reset-password `[Authorize(Admin)]` | mixed |
| `EmrHl7ArchiveController` | `/api/emr/hl7` | export (POST), export/{medicalRecordId} (GET file) | `[Authorize]` |
| `EmrCloudSyncController` | `/api/emr/cloud-sync` | sync, logs, status, retry-failed `[Authorize(Admin)]` | `[Authorize]` |
| `DicomAutoSendController` | `/api/dicom-autosend` | rules (GET/POST/PUT/DELETE — POST/PUT/DELETE `[Authorize(Admin,Radiologist,RadiologyManager)]`), send, transmissions, stats, trigger-check `[Authorize(Admin)]` | `[Authorize]` |
| `Hl7QueueController` | `/api/hl7-queue` | GET search, GET {id}, {id}/retry + retry-all-failed `[Authorize(Admin,Radiologist,LabManager)]`, demo-enqueue `[Authorize(Admin)]` | `[Authorize]` |
| `DicomStudyActivityController` | `/api/dicom-study-log` | GET search, study/{studyUid}, log (POST) | `[Authorize]` |
| `PaymentGatewayController` (mở rộng) | `/api/payment` | bank/list `[Authorize]`, bank/confirm `[Authorize(Admin,Accountant,Cashier)]`, create-url, refund `[Authorize(Admin,Accountant)]`, IPN/return `[AllowAnonymous]` | mixed |

### 6.2 Endpoint `[AllowAnonymous]`

- `POST /api/inspector-portal/login` — cổng thanh tra login (trả JWT riêng).
- `GET /api/payment/vnpay/return`, `GET /api/payment/vnpay/ipn`, `POST /api/payment/momo/ipn`, `POST /api/payment/zalopay/callback` — gateway gọi từ server họ.

### 6.3 KHÔNG có exception filter

Khác NangCap23 (`Nangcap23ExceptionFilter` map 6 loại exception), NangCap24
controllers **không** có `[TypeFilter]`/`[ServiceFilter]`. Service throw
`Exception` → ASP.NET default → **500 Internal Server Error**. Đây là nguy cơ
tiềm ẩn (xem §17).

---

## 7. Business Logic mới

### 7.1 WebAuthn 2-phase (register + sign)

- **Register**: `BeginRegisterAsync` sinh `Challenge` (random base64url) + `UserHandle` → FE gọi `navigator.credentials.create()` → `FinishRegisterAsync` lưu `CredentialId` + `PublicKey` (COSE).
- **Sign**: `BeginSignAsync` trả `Challenge` + `AllowCredentials[]` (credential của BN) → FE gọi `navigator.credentials.get()` → `FinishSignAsync` ghi `BiometricSignatureLog`.
- ⚠️ **MVP**: `FinishSignAsync` (dòng ~175) hiện comment *"MVP: accept signature — production verify ECDSA/RSA với PublicKey (COSE)"* → `IsVerified=true` khi credential tồn tại, **chưa verify chữ ký thật**.

### 7.2 Inspector login + account lockout

- `LoginAsync`: BCrypt verify (`BCrypt.Net.BCrypt.Verify`). Sai → `LoginFailCount++`; quá ngưỡng → set `LockedUntil`. Đúng → sinh JWT role `BhxhInspector`, reset fail count, ghi `LastLoginAt` + `LastLoginIp`.
- Mọi truy cập HSBA ghi `BhxhInspectorAccessLog` (Action = view_record/download_xml/search) → audit cho BHXH.

### 7.3 HL7 queue retry + ack

- `EnqueueAsync` tạo message Status=`pending`.
- `RetryAsync`: reject nếu Status=`acked` ("đã ACK, không cần retry") → tăng `RetryCount`, set `LastTryAt`/`NextRetryAt`.
- `RetryAllFailedAsync`: quét tất cả Status=`failed`, retry batch, trả `Hl7RetryResultDto` (Retried/SucceededImmediately/StillFailed).
- `MaxRetries` default 5. `ProcessPendingAsync` cho background worker (nếu wire sau).

### 7.4 DICOM auto-send + transmission

- `SendStudyAsync`: gửi study tới `RemotePacsServer` qua Orthanc REST C-STORE, ghi `DicomTransmissionLog` (Status pending→sending→done/failed, InstanceCount, TotalBytes, DurationMs).
- `TriggerAutoSendCheckAsync`: quét rule active, áp dụng (manual trigger qua endpoint `/trigger-check` Admin).
- `GetStatsAsync`: thống kê theo `ByDestination[]` + `ByDay[]`.

### 7.5 Bank confirm (đối soát thủ công)

- `ConfirmBankTransferAsync` (VietQR partial): khi BV chưa có merchant API, kế toán đối soát sao kê → confirm → set Status=1 (paid) + `PayDate` + `GatewayTxnRef` + `LinkReceiptAsync`.
- **Bug đã fix** (commit `b523579`): `LinkReceiptAsync` set `Receipt.CashierId = Guid.Empty` vi phạm `FK_Receipts_Users_Cashier` (FK non-null) → INSERT fail 500. Fix: resolve `cashierId` về user xác nhận, fallback admin nếu IPN online. Bug dùng chung cho VNPay/MoMo/ZaloPay IPN.

---

## 8. Validation Rule

| Endpoint | Field | Rule hiện có | Gap |
|---|---|---|---|
| Biometric register | PatientId | Patient tồn tại (null → 500) | Không check CredentialId format |
| Biometric register | CredentialId | Không trùng (trùng → 500) | — |
| Biometric sign | PatientId | Có ≥1 credential (không → 500) | **Không verify chữ ký thật** |
| Inspector create | Username | Không trùng (trùng → 500) | Không check password strength |
| Inspector login | Username/Password | BCrypt verify + lockout | — |
| HL7 retry | Status | Reject nếu `acked` (→ 500) | — |
| Bank confirm | TransactionId | Txn tồn tại + là bank provider + chưa confirm | — |
| DICOM send | DestinationServerId | Server tồn tại (null → 500) | — |

→ **Tất cả lỗi validation hiện trả 500** (không 400) do thiếu exception filter.

---

## 9. External Integration

| Gap | External | Cơ chế |
|---|---|---|
| Biometric | Browser WebAuthn API (`navigator.credentials`) | Cần HTTPS + authenticator. RpId = domain. |
| EMR Cloud sync | Cloudflare R2 (S3-compatible) | Upload signed_xml/hl7/pdf. Destination: r2_primary / r2_dr / local_backup. |
| DICOM auto-send | Orthanc PACS (VM `168.110.52.7`) | C-STORE qua Orthanc REST modalities API + RemotePacsServer config. |
| Bank/VietQR | Napas247 / banking apps VN | QR EMVCo TLV — không gọi API gateway, app NH scan QR. Confirm thủ công qua đối soát. |
| HL7 queue | RIS/LIS/HIS endpoint (TCP/HTTP) | `Endpoint` field; gửi message + nhận ACK/NACK. |

---

## 10. VietQR EMVCo TLV

File `PaymentGatewayService.VietQR.cs` — generator QR thống nhất Napas:

- `BuildVietQrEmvcoString(bin, accountNumber, amount, refContent, merchantName, merchantCity)`:
  - ID 00 Payload Format `01`; ID 01 Point of Initiation `12` (dynamic, có amount) hoặc `11` (static).
  - ID 38 Merchant Account: GUID Napas `A000000727` + beneficiary (BIN + account) + service code `QRIBFTTA`.
  - ID 53 Currency `704` (VND); ID 54 Amount (chỉ dynamic); ID 58 Country `VN`.
  - ID 59 Merchant Name (≤25 ASCII), ID 60 City (≤15), ID 62/08 Reference (≤25).
  - ID 63 CRC-16/CCITT-FALSE (poly `0x1021`, init `0xFFFF`).
- `NormalizeAscii`: bỏ dấu tiếng Việt (NFD + strip NonSpacingMark) + đ→d cho EMV compatibility.
- Render URL: `https://img.vietqr.io/image/{provider}-{account}-{template}.png?amount=...&addInfo=...` (preview).
- Reference content nhúng `TxnRef[^10..]` để hospital matcher đối soát.

5 ngân hàng + BIN: BIDV `970418`, VCB `970436`, Agribank `970405`, Vietinbank
`970415`, MSB `970426`.

---

## 11. Frontend — Route + UI

### 11.1 Route (`App.tsx`)

Tất cả dưới prefix `/v2/` (TerminalLayout), trừ Inspector standalone:

```
/v2/bank-payments         → BankPaymentsV2
/v2/biometric-enrollment  → BiometricEnrollmentV2
/v2/emr-hl7-export        → EmrHl7ExportV2
/v2/emr-cloud-sync        → EmrCloudSyncV2
/v2/dicom-autosend        → DicomAutoSendV2
/v2/hl7-message-queue     → Hl7MessageQueueV2
/v2/dicom-study-audit-log → DicomStudyAuditLogV2
/inspector-portal         → InspectorPortalStandalone  (NGOÀI layout, không qua admin login)
```

### 11.2 Menu wiring (`TerminalLayout.tsx`)

7 menu item gắn nhãn `[24]`, phân bổ theo nhóm:
| Nhóm | Menu |
|---|---|
| Cận lâm sàng | `[24] DICOM tự động gửi`, `[24] Log ca chụp DICOM` |
| Tài chính | `[24] TT Ngân hàng (BIDV/VCB/...)` |
| Hồ sơ & Ký số | `[24] Vân tay BN (WebAuthn)` |
| Liên thông | `[24] Hàng đợi HL7 (retry)`, `[24] Đồng bộ EMR lên Cloud`, `[24] Xuất HL7 v2 HSBA` |

→ Inspector Portal **không** có trong menu (standalone, thanh tra truy cập trực tiếp `/inspector-portal`).

### 11.3 API client (`nangcap24.ts`, ~480 LOC)

Export object cho từng gap: `biometric`, `inspectorPortal`, `emrHl7`,
`emrCloudSync`, `dicomAutoSend`, `hl7Queue`, `dicomStudyLog`, `bankPayment`.

### 11.4 Viewer components (gap 9–10)

- `MipMinIpViewer.tsx` (~447 LOC): MIP/MinIP projection trên volume Cornerstone3D.
- `CineControls.tsx` (~163 LOC): cine loop playback (play/pause/speed/frame).
- `MammoViewer.tsx` (nâng cấp +153 LOC): mammography CC/MLO + magnify + inversion.
- Tích hợp vào `pages/DicomViewer.tsx` (radiology viewer), **không có route v2 riêng**:
  - 3 nút toolbar loại trừ lẫn nhau: `MPR / 3D Native` (MprViewer), `Mammography 2x2`
    (MammoViewer), `MIP / MinIP` (MipMinIpViewer) — mỗi nút mở 1 Card fullscreen.
  - `CineControls` render dưới `CornerstoneViewer` (stack viewport), seek frame qua handle
    `CornerstoneViewerHandle.getFrameCount/getCurrentIndex/setIndex` (mở rộng để khớp
    `CineViewportHandle`). Tự ẩn khi stack < 2 frame.
  - ⚠️ **Lịch sử**: MipMinIpViewer + CineControls ban đầu bị **mồ côi** (định nghĩa nhưng
    chưa import/render). Đã wire vào DicomViewer (toolbar MIP + Cine bar) để khớp HSMT.

---

## 12. Chức năng đã triển khai vs chưa

### 12.1 Triển khai đầy đủ (BE + FE + Test)

- Biometric register/sign 2-phase (⚠️ verify MVP)
- Inspector portal login + search/view records + account CRUD
- EMR HL7 export (file download)
- EMR cloud sync + logs + status + retry-failed
- DICOM auto-send rule CRUD + manual send + transmission log + stats
- HL7 queue search + retry + retry-all-failed + demo-enqueue
- DICOM study activity log + timeline
- Bank/VietQR QR generate + bank confirm + 5 bank list
- MIP/MinIP + Cine + Mammo viewer

### 12.2 Chưa triển khai (nice-to-have)

| Item | Lý do hoãn |
|---|---|
| Biometric verify chữ ký ECDSA/RSA thật | Cần thư viện FIDO2 (Fido2NetLib) — MVP accept để demo flow |
| Inspector signed-XML ký số thật | Hiện placeholder `<Signature>placeholder-pkcs7-detached-signature</Signature>` |
| Exception filter NangCap24 | Lỗi hiện trả 500 — chưa map 400/404/409 |
| HL7 queue background auto-process | `ProcessPendingAsync` có nhưng chưa wire vào hosted service |
| DICOM auto-send scheduled (cron) trigger | `TriggerType=scheduled` có field nhưng chưa có worker chạy theo cron |
| EMR cloud sync R2 thật | Cần R2 credential — mock/log nếu chưa cấu hình |

---

## 17. TODO / FIXME / Nguy cơ tiềm ẩn

### 17.1 Nguy cơ tiềm ẩn (đã xác định)

| # | Nguy cơ | Mức | Khuyến nghị |
|---|---|---|---|
| R1 | **Biometric không verify chữ ký** — `IsVerified=true` luôn khi credential tồn tại | High | Wire `Fido2NetLib` verify `AuthenticatorData` + `Signature` + `SignatureCounter` trước khi dùng làm chữ ký pháp lý |
| R2 | **Không có exception filter** — mọi validation/not-found trả 500 thay vì 400/404 | Med | Thêm `Nangcap24ExceptionFilter` tương tự NangCap23, hoặc đổi `throw new Exception` thành `ArgumentException`/`KeyNotFoundException` + filter |
| R3 | **Inspector signed-XML placeholder** | Med | Wire ký số thật (iText/PKCS#7) khi xuất XML cho giám định |
| R4 | **SignatureCounter không kiểm tra** — replay attack risk | Med | Verify counter tăng đơn điệu mỗi lần sign (chống clone authenticator) |
| R5 | **Race duplicate credential** — không UNIQUE index trên CredentialId | Low | Thêm filtered unique index `UX_BiometricCredentials_CredentialId` |
| R6 | **DICOM auto-send 2 instance cùng trigger** — chưa có lock | Low | Idempotency hoặc distributed lock khi nhiều Cloud Run instance |
| R7 | **EMR cloud sync R2 credential trong env** — leak risk | Low | Dùng Secret Manager (giống PACS R2 token rotation) |

### 17.2 Phụ thuộc bên ngoài

| Item | Ai cấp | Trạng thái |
|---|---|---|
| Số TK ngân hàng thật (BIDV/VCB/...) | BV | Hiện dùng số TK demo trong `appsettings` |
| Thiết bị authenticator (Touch ID/FIDO2) | BN/máy trạm | Cần để test biometric end-to-end |
| Cloudflare R2 access key | DevOps | Cho EMR cloud sync thật |
| Orthanc VM remote PACS | DevOps | Đã có (`168.110.52.7`) — cho DICOM auto-send |

### 17.3 Pattern phòng thủ ĐÃ có

- Inspector account lockout (`LoginFailCount` + `LockedUntil`).
- BCrypt password hash (inspector).
- Audit log: `BhxhInspectorAccessLog` + `DicomStudyActivityLog` + `BiometricSignatureLog`.
- Bank confirm idempotent (reject nếu `Status==1`).
- HL7 retry reject `acked`.

---

## 18. Tham chiếu commit

- `2998527` — feat(nangcap24): HSMT BV Đa khoa — close 10 gap (BE + FE + tests)
- `185ccd5` — feat(nangcap24-v2): port 9 pages từ Claude Design bundle `7U9Opm5HscHHysP6aaHH_A`
- `2f89d61` — docs(CLAUDE.md): deploy NangCap24 backend (rev `00028-gm6`)
- `b523579` — fix(payment): resolve FK_Receipts_Users_Cashier 500 on payment confirmation (rev `00029-khb`)
- `0eb70c1` — feat(v2-menu): đánh dấu [24] cho 7 menu NangCap24 + prod functional test

## Tài liệu liên quan

- [README.md](./README.md) — Tổng quan + architecture + known risks
- [test-plan.md](./test-plan.md) — Test plan per-chức-năng
- [test-guide.md](./test-guide.md) — QA checklist
- [workflow-test.md](./workflow-test.md) — Workflow + UI matrix + role
- [summary.md](./summary.md) — Index + module impact
