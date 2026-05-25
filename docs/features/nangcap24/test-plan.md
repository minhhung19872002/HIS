# NangCap24 — Test Plan tổng hợp

> **Mục đích:** Test plan chi tiết per-chức-năng cho gói nâng cấp 24. Mỗi chức
> năng gồm: mô tả nghiệp vụ, danh sách API, điều kiện test, dữ liệu test, các
> case + expected, edge case, regression impact.
> **Đối tượng dùng:** QA team + Dev review + Release manager.
> **Test runner:** Cypress (page-load + API), Playwright (functional + prod smoke), Manual (UI/E2E + WebAuthn).
> **Phạm vi:** 8 chức năng backend (gap 1–8) + 2 viewer frontend (gap 9–10).
> **Lưu ý quan trọng:** NangCap24 **không có exception filter** → lỗi
> validation/not-found trả **HTTP 500** (không 400/404). Test phải assert 500
> + message tiếng Việt, **khác** NangCap23 (assert 400/404/409).
> **Tham chiếu:** [analysis.md](./analysis.md), [test-guide.md](./test-guide.md), [README.md](./README.md).
> **Last updated:** 2026-05-25

---

## Mục lục

- [1. Bảng tổng hợp chức năng ↔ API ↔ Test](#1-bảng-tổng-hợp-chức-năng--api--test)
- [2. Test plan per-chức-năng](#2-test-plan-per-chức-năng)
  - [2.1 Biometric WebAuthn Signature](#21-biometric-webauthn-signature)
  - [2.2 BHXH Inspector Portal](#22-bhxh-inspector-portal)
  - [2.3 EMR HL7 Export](#23-emr-hl7-export)
  - [2.4 EMR Cloud Sync](#24-emr-cloud-sync)
  - [2.5 DICOM Auto-Send](#25-dicom-auto-send)
  - [2.6 HL7 Message Queue](#26-hl7-message-queue)
  - [2.7 DICOM Study Activity Log](#27-dicom-study-activity-log)
  - [2.8 Bank / VietQR Payment](#28-bank--vietqr-payment)
  - [2.9 MIP/MinIP + Cine + Mammography Viewer](#29-mipminip--cine--mammography-viewer)
- [3. Luồng test theo thứ tự thực tế](#3-luồng-test-theo-thứ-tự-thực-tế)
- [4. Checklist trước release](#4-checklist-trước-release)
- [5. Dữ liệu test cần chuẩn bị chung](#5-dữ-liệu-test-cần-chuẩn-bị-chung)

---

## 1. Bảng tổng hợp chức năng ↔ API ↔ Test

| # | Chức năng | Module | API endpoint chính | Test file |
|---|---|---|---|---|
| 1 | Đăng ký vân tay (WebAuthn register) | Biometric | `POST /api/biometric/register-{begin,finish}` | Manual (cần authenticator) |
| 2 | Ký HSBA bằng vân tay | Biometric | `POST /api/biometric/sign-{begin,finish}` | Manual (cần authenticator) |
| 3 | List/Revoke credential | Biometric | `GET/DELETE /api/biometric/credentials/{...}` | `nangcap24-pages` (page-load) |
| 4 | Inspector login | Inspector | `POST /api/inspector-portal/login` | `nangcap24-pages.cy.ts` + Playwright |
| 5 | Inspector search/view HSBA | Inspector | `GET /api/inspector-portal/records[/{id}]` | Playwright functional |
| 6 | Inspector download signed XML | Inspector | `GET /api/inspector-portal/records/{id}/signed-xml` | Manual |
| 7 | Inspector account CRUD (Admin) | Inspector | `GET/POST/PUT /api/inspector-portal/accounts` | `nangcap24-pages` (endpoint check) |
| 8 | EMR HL7 export | EMR HL7 | `POST /api/emr/hl7/export` + `GET /export/{id}` | Playwright functional |
| 9 | EMR cloud sync | EMR Cloud | `POST /api/emr/cloud-sync/sync` | `nangcap24-pages` (endpoint check) |
| 10 | EMR cloud sync status/logs | EMR Cloud | `GET /api/emr/cloud-sync/{status,logs}` | `nangcap24-pages` |
| 11 | EMR cloud retry-failed (Admin) | EMR Cloud | `POST /api/emr/cloud-sync/retry-failed` | Manual |
| 12 | DICOM auto-send rule CRUD | DICOM autosend | `GET/POST/PUT/DELETE /api/dicom-autosend/rules` | `nangcap24-pages` |
| 13 | DICOM manual send | DICOM autosend | `POST /api/dicom-autosend/send` | Manual + prod seed (C-STORE thật) |
| 14 | DICOM transmission log + stats | DICOM autosend | `GET /api/dicom-autosend/{transmissions,stats}` | `nangcap24-pages` |
| 15 | HL7 queue search | HL7 queue | `GET /api/hl7-queue` | `nangcap24-pages.cy.ts` + Playwright |
| 16 | HL7 enqueue (demo) | HL7 queue | `POST /api/hl7-queue/demo-enqueue` | Playwright functional |
| 17 | HL7 retry / retry-all-failed | HL7 queue | `POST /api/hl7-queue/{id}/retry` + `/retry-all-failed` | Manual |
| 18 | DICOM study activity log | DICOM log | `GET /api/dicom-study-log` + `POST /log` | `nangcap24-pages` + Playwright |
| 19 | Bank list (5 NH) | Payment | `GET /api/payment/bank/list` | `nangcap24-pages.cy.ts` |
| 20 | Create VietQR payment URL | Payment | `POST /api/payment/create-url` | Manual + prod seed |
| 21 | Bank confirm thủ công | Payment | `POST /api/payment/bank/confirm` | Manual + prod (regression FK fix) |
| 22 | MIP/MinIP/Cine/Mammo viewer | Viewer (FE) | (không API) | Manual (DICOM viewer) |

Tổng: **22 chức năng** mapped tới **~35 endpoint** (gồm 5 `[AllowAnonymous]`).
Test đã code: Cypress `nangcap24-pages.cy.ts` 13 case + Playwright
`nangcap24-pages.spec.ts` 15 case + prod `nangcap24-functional.spec.ts` 8 case.

---

## 2. Test plan per-chức-năng

### 2.1 Biometric WebAuthn Signature

**Module liên quan:** Patient, MedicalRecord, EMR (document ký), Audit.
**Mô tả nghiệp vụ:** BN/người nhà đăng ký vân tay (Touch ID/FaceID/FIDO2) một lần → sau đó ký các document HSBA (cam kết PT, đồng ý điều trị...) bằng sinh trắc thay chữ ký giấy.

**API liên quan (6):**
- `POST /api/biometric/register-begin` — sinh challenge + userHandle
- `POST /api/biometric/register-finish` — lưu credential (CredentialId + PublicKey COSE)
- `GET /api/biometric/credentials/{patientId}` — list credential của BN
- `DELETE /api/biometric/credentials/{id}` — revoke
- `POST /api/biometric/sign-begin` — sinh challenge + allowCredentials
- `POST /api/biometric/sign-finish` — ghi signature log

**Điều kiện test:**
- **Bắt buộc HTTPS** (prod Vercel/Cloud Run) hoặc `localhost` — WebAuthn không chạy `http://` IP.
- Thiết bị có authenticator: Touch ID (Mac/iPhone), Windows Hello, hoặc FIDO2 security key.
- Patient tồn tại trong DB.

**Test case:**

| # | Case | Body / Param | Expected |
|---|---|---|---|
| TC-BIO-001 | Register begin | `{patientId, ownerType:"patient", deviceName:"Touch ID"}` | 200, `{challenge, userHandle, rpId, rpName}` |
| TC-BIO-002 | Register begin patient không tồn tại | `patientId=<random guid>` | **500** "Bệnh nhân không tồn tại" (⚠️ không phải 404) |
| TC-BIO-003 | Register finish (cần browser) | `{patientId, credentialId, publicKey, clientDataJson, attestationObject}` | 200, `BiometricCredentialDto` status=`active` |
| TC-BIO-004 | Register finish trùng credential | (cùng credentialId 2 lần) | **500** "Credential đã đăng ký trước đó" |
| TC-BIO-005 | List credentials | `GET /credentials/{patientId}` | 200, `[{id, status, deviceName, usageCount}, ...]` |
| TC-BIO-006 | Sign begin BN chưa register | `{patientId:<chưa có credential>}` | **500** "Bệnh nhân chưa đăng ký vân tay" |
| TC-BIO-007 | Sign begin OK | `{patientId, documentType:"cam_ket_pt", documentRef}` | 200, `{challenge, allowCredentials:[{credentialId}]}` |
| TC-BIO-008 | Sign finish (cần browser) | `{patientId, credentialId, signature, authenticatorData, clientDataJson}` | 200, `{isVerified:true, signatureLogId, signerName}` ⚠️ MVP accept |
| TC-BIO-009 | Revoke credential | `DELETE /credentials/{id}` | 204, status → `revoked` |
| TC-BIO-010 | Sign với credential đã revoke | (dùng credential revoked) | 200 `{isVerified:false, error:"Credential không tồn tại hoặc đã thu hồi"}` |

**Edge case / Nguy cơ:**
- ⚠️ **`IsVerified=true` luôn khi credential active** — service comment "MVP: accept signature". Chưa verify chữ ký ECDSA/RSA thật → **không dùng làm chữ ký pháp lý cho tới khi wire Fido2NetLib** (xem analysis §17 R1).
- `SignatureCounter` không kiểm tra tăng đơn điệu → replay/clone risk (R4).
- WebAuthn không test được qua `cy.request`/curl (cần browser + authenticator) → chỉ Manual.

**Regression impact:**
- Không cross-module — credential lưu riêng. EMR document ký vẫn lưu bình thường.

---

### 2.2 BHXH Inspector Portal

**Module liên quan:** MedicalRecord, Patient, Department, InsuranceXml (signed XML), Audit.
**Mô tả nghiệp vụ:** Giám định viên BHXH đăng nhập cổng riêng (`/inspector-portal`, **không qua admin login**) → tra cứu HSBA bệnh nhân BHYT → xem chi tiết + tải XML đã ký để giám định.

**API liên quan (8):**
- `POST /api/inspector-portal/login` `[AllowAnonymous]` — trả JWT role `BhxhInspector`
- `GET /api/inspector-portal/records` `[BhxhInspector]` — search HSBA
- `GET /api/inspector-portal/records/{id}` `[BhxhInspector]` — detail
- `GET /api/inspector-portal/records/{id}/signed-xml` `[BhxhInspector]` — download XML
- `GET /api/inspector-portal/accounts` `[Admin]` — list account
- `POST /api/inspector-portal/accounts` `[Admin]` — create
- `PUT /api/inspector-portal/accounts/{id}/active` `[Admin]` — enable/disable
- `POST /api/inspector-portal/accounts/{id}/reset-password` `[Admin]` — reset

**Điều kiện test:** Tài khoản seed `inspector` / `Inspector@123` (migration 44). MedicalRecord BHYT có data.

**Test case:**

| # | Case | Body / Param | Expected |
|---|---|---|---|
| TC-INS-001 | Login đúng | `{username:"inspector", password:"Inspector@123"}` | 200, `{success:true, token, inspector:{...}}` |
| TC-INS-002 | Login sai password | `password:"wrong"` | 200, `{success:false, message}` + `LoginFailCount++` |
| TC-INS-003 | Login account bị khóa | (sau N lần sai → LockedUntil) | `{success:false}` (locked) |
| TC-INS-004 | Search records (inspector token) | `GET /records?keyword=&pageIndex=1&pageSize=20` | 200, `{items:[...], totalCount, pageIndex}` |
| TC-INS-005 | Search records (admin token, KHÔNG phải inspector) | (admin JWT) | 403 (role `BhxhInspector` only) |
| TC-INS-006 | Search records (no token) | (no auth) | 401 |
| TC-INS-007 | Get record detail | `GET /records/{id}` | 200, `{patientName, files[], services[], medicines[], bhytAmount, coPayAmount}` |
| TC-INS-008 | Get record không tồn tại | `GET /records/{random}` | 404 (controller trả `NotFound()`) |
| TC-INS-009 | Download signed XML | `GET /records/{id}/signed-xml` | 200, `application/xml`, file `HSBA_{id}.xml` ⚠️ chứa placeholder signature |
| TC-INS-010 | Create account (Admin) | `{username, password, fullName, bhxhCode, province}` | 200, `InspectorAccountDto` |
| TC-INS-011 | Create account trùng username | (username đã tồn tại) | **500** "Tên đăng nhập đã tồn tại" |
| TC-INS-012 | Create account (Nurse) | (Nurse JWT) | 403 (Admin only) |
| TC-INS-013 | Disable account | `PUT /accounts/{id}/active` body `false` | 204, sau đó login → fail |
| TC-INS-014 | Audit access log | (mỗi search/view/download) | `BhxhInspectorAccessLogs` có entry (Action + IpAddress) |

**Edge case:**
- ⚠️ Signed XML là **placeholder** (`<Signature>placeholder-pkcs7-detached-signature</Signature>`) — chưa ký thật.
- Inspector JWT khác user JWT — verify token không dùng chéo được (inspector token gọi endpoint thường → 403/401).
- Account lockout: verify `LockedUntil` chặn login dù password đúng.

**Regression impact:**
- Read-only trên MedicalRecord/Patient → không write effect. Không ảnh hưởng admin login chính.

---

### 2.3 EMR HL7 Export

**Module liên quan:** MedicalRecord, ServiceRequest, Prescription, LabResult, RadiologyReport.
**Mô tả nghiệp vụ:** Xuất toàn bộ HSBA ra HL7 v2 message (ADT/ORM/ORU/MDM) để liên thông với hệ thống ngoài.

**API liên quan (2):**
- `POST /api/emr/hl7/export` — trả `Hl7ExportResponseDto` (content + messageCount)
- `GET /api/emr/hl7/export/{medicalRecordId}` — download file `.hl7`

**Test case:**

| # | Case | Body | Expected |
|---|---|---|---|
| TC-HL7E-001 | Export đầy đủ | `{medicalRecordId, includeServices:true, includePrescriptions:true, includeLabResults:true, includeRadiologyReports:true}` | 200, `{hl7Content, fileName, messageCount>0, contentSizeBytes}` |
| TC-HL7E-002 | Export record không tồn tại | `medicalRecordId=<random>` | **500** "Hồ sơ không tồn tại" |
| TC-HL7E-003 | Export chỉ services | `{includeServices:true, others:false}` | 200, messageCount nhỏ hơn |
| TC-HL7E-004 | Download file | `GET /export/{id}` | 200, `text/plain`, MSH segment đầu (`MSH\|^~\&\|...`) |
| TC-HL7E-005 | HL7 content có MSH | (verify body) | Content bắt đầu bằng `MSH` segment, có `\r` delimiter |

**Edge case:**
- Record không có service/prescription → vẫn export ADT segment cơ bản, messageCount nhỏ.
- HL7 escape ký tự đặc biệt (`|^~\&`) trong tên/diagnosis.

**Regression impact:** Read-only — không write. Không ảnh hưởng EMR module.

---

### 2.4 EMR Cloud Sync

**Module liên quan:** MedicalRecord, Cloudflare R2, EMR signed XML/HL7/PDF.
**Mô tả nghiệp vụ:** Đồng bộ HSBA (signed_xml/hl7/pdf) lên Cloud R2 (primary + DR) để lưu trữ + sao lưu thảm hoạ.

**API liên quan (4):**
- `POST /api/emr/cloud-sync/sync` — đồng bộ 1 record
- `GET /api/emr/cloud-sync/logs` — list log (filter medicalRecordId/status + paging)
- `GET /api/emr/cloud-sync/status` — dashboard tổng (tracked/synced/partial/failed)
- `POST /api/emr/cloud-sync/retry-failed` `[Admin]` — retry tất cả failed

**Test case:**

| # | Case | Body | Expected |
|---|---|---|---|
| TC-SYNC-001 | Sync record | `{medicalRecordId, fileTypes:["signed_xml","hl7","pdf"], syncToDr:true}` | 200, `{totalFiles, successCount, failedCount, logs[]}` |
| TC-SYNC-002 | Sync record không tồn tại | `medicalRecordId=<random>` | **500** "Hồ sơ không tồn tại" |
| TC-SYNC-003 | Get status | `GET /status` | 200, `{totalRecordsTracked, fullySyncedCount, partialSyncedCount, failedSyncCount, lastSyncAt}` |
| TC-SYNC-004 | Get logs filter status | `GET /logs?status=failed&pageIndex=1&pageSize=30` | 200, `[{fileType, destination, status, retryCount}, ...]` |
| TC-SYNC-005 | Retry-failed (Admin) | `POST /retry-failed` | 200, `{retried:<n>}` |
| TC-SYNC-006 | Retry-failed (Nurse) | (Nurse JWT) | 403 |

**Edge case:**
- Chưa cấu hình R2 credential → log Status=`failed` với ErrorMessage, không crash (mock/log).
- Destination: `r2_primary` / `r2_dr` / `local_backup`.
- FileHash SHA-256 để verify integrity.

**Regression impact:** Read MedicalRecord → write `EmrCloudSyncLogs`. Không ảnh hưởng EMR clinical.

---

### 2.5 DICOM Auto-Send

**Module liên quan:** RadiologyRequest, DicomStudy, RemotePacsServer (NangCap15), Orthanc PACS.
**Mô tả nghiệp vụ:** Cấu hình rule tự động gửi study DICOM sang PACS đích (vd. "auto gửi mọi ca CT sang Cloud-PACS"), + gửi thủ công + thống kê truyền.

**API liên quan (8):**
- `GET /api/dicom-autosend/rules` — list rule
- `POST /api/dicom-autosend/rules` `[Admin,Radiologist,RadiologyManager]` — create
- `PUT /api/dicom-autosend/rules/{id}` `[same]` — update
- `DELETE /api/dicom-autosend/rules/{id}` `[same]` — delete
- `POST /api/dicom-autosend/send` — gửi 1 study thủ công
- `GET /api/dicom-autosend/transmissions` — log truyền (filter from/to/status)
- `GET /api/dicom-autosend/stats` — thống kê (ByDestination + ByDay)
- `POST /api/dicom-autosend/trigger-check` `[Admin]` — quét rule áp dụng

**Test case:**

| # | Case | Body | Expected |
|---|---|---|---|
| TC-AS-001 | List rules | `GET /rules` | 200, `[DicomAutoSendRuleDto, ...]` |
| TC-AS-002 | Create rule | `{ruleName, modality:"CT", destinationServerId, triggerType:"on_arrival", priority:5, isActive:true}` | 200, rule mới |
| TC-AS-003 | Create rule server không tồn tại | `destinationServerId=<random>` | **500** "Server đích không tồn tại" |
| TC-AS-004 | Create rule (Nurse) | (Nurse JWT) | 403 |
| TC-AS-005 | Update rule | `PUT /rules/{id}` body `{isActive:false}` | 200 |
| TC-AS-006 | Delete rule | `DELETE /rules/{id}` | 204 |
| TC-AS-007 | Send study (C-STORE) | `{studyInstanceUid, destinationServerId, encrypt:false}` | 200, `DicomTransmissionLogDto` status=`done` (cần Orthanc reachable) |
| TC-AS-008 | Send rule không tồn tại server | `destinationServerId=<random>` | **500** "Server đích không tồn tại" |
| TC-AS-009 | Search transmissions | `GET /transmissions?from=&to=&status=done` | 200, list |
| TC-AS-010 | Stats | `GET /stats?from=2026-05-01&to=2026-05-31` | 200, `{totalTransmissions, successCount, failedCount, byDestination[], byDay[]}` |
| TC-AS-011 | Trigger-check (Admin) | `POST /trigger-check` | 200, `{triggered:<n>}` |

**Edge case:**
- Orthanc VM (`168.110.52.7`) unreachable → status=`failed`, ErrorMessage, không crash.
- `EncryptBeforeSend=true` → `WasEncrypted=true`, `EncryptionAlgorithm="AES-256-GCM"`.
- 2 instance cùng trigger rule → chưa có lock → có thể gửi 2 lần (R6).

**Regression impact:** Read RadiologyRequest/DicomStudy + write transmission log. Không ảnh hưởng RIS/PACS viewer.

---

### 2.6 HL7 Message Queue

**Module liên quan:** RIS, LIS, HIS, ServiceRequest.
**Mô tả nghiệp vụ:** Hàng đợi HL7 message (inbound/outbound) giữa các hệ thống, retry khi gửi fail, theo dõi ACK/NACK.

**API liên quan (5):**
- `GET /api/hl7-queue` — search (filter status/direction/source/type + paging) → kèm `pendingCount/failedCount/ackedCount`
- `GET /api/hl7-queue/{id}` — detail (kèm Payload)
- `POST /api/hl7-queue/{id}/retry` `[Admin,Radiologist,LabManager]` — retry 1
- `POST /api/hl7-queue/retry-all-failed` `[same]` — retry batch
- `POST /api/hl7-queue/demo-enqueue` `[Admin]` — tạo message demo

**Test case:**

| # | Case | Body / Param | Expected |
|---|---|---|---|
| TC-HQ-001 | Search empty | `GET /hl7-queue?pageIndex=1&pageSize=10` | 200, `{items:[], totalCount, pendingCount, failedCount, ackedCount}` |
| TC-HQ-002 | Demo enqueue (Admin) | `{direction:"outbound", source:"HIS", target:"RIS", messageType:"ORM^O01"}` | 200, message status=`pending` |
| TC-HQ-003 | Demo enqueue (Nurse) | (Nurse JWT) | 403 |
| TC-HQ-004 | Get by id (kèm payload) | `GET /hl7-queue/{id}` | 200, `{..., payload:"MSH\|..."}` |
| TC-HQ-005 | Get by id không tồn tại | `GET /{random}` | 404 (controller `NotFound()`) |
| TC-HQ-006 | Retry message failed | `POST /{id}/retry` | 200, RetryCount++ |
| TC-HQ-007 | Retry message đã acked | (message status=`acked`) | **500** "Message đã ACK, không cần retry" |
| TC-HQ-008 | Retry-all-failed | `POST /retry-all-failed` | 200, `{retried, succeededImmediately, stillFailed}` |
| TC-HQ-009 | Search filter status | `GET /hl7-queue?status=failed` | 200, chỉ message failed |

**Edge case:**
- `MaxRetries` default 5 → vượt thì không retry nữa.
- `Direction`: `outbound`/`inbound`; `MessageType`: ADT^A04/ORM^O01/ORU^R01/MDM^T02.
- `ProcessPendingAsync` có sẵn nhưng chưa wire background worker.

**Regression impact:** Standalone — không thay đổi RIS/LIS HL7 flow hiện có (07-lis-hl7spy).

---

### 2.7 DICOM Study Activity Log

**Module liên quan:** RadiologyRequest, DicomStudy, RadiologyReport, Audit.
**Mô tả nghiệp vụ:** Log granular từng hoạt động trên 1 ca chụp DICOM (created_from_his, viewed, result_approved, sent_to_remote...) — chi tiết hơn AuditLog chung. Theo NangCap RIS 1.11.

**API liên quan (3):**
- `GET /api/dicom-study-log` — search (filter studyUid/action/userId/date + paging)
- `GET /api/dicom-study-log/study/{studyUid}` — timeline 1 study
- `POST /api/dicom-study-log/log` — ghi 1 activity

**Test case:**

| # | Case | Body / Param | Expected |
|---|---|---|---|
| TC-DSL-001 | Search empty | `GET /dicom-study-log` | 200, `{items:[], totalCount}` |
| TC-DSL-002 | Log activity | `{studyInstanceUid, action:"viewed", radiologyRequestId, actionDetails}` | 204 |
| TC-DSL-003 | Study timeline | `GET /study/{studyUid}` | 200, `[{action, actionLabel, performedByName, performedAt}, ...]` sorted |
| TC-DSL-004 | Search filter action | `GET /dicom-study-log?action=result_approved` | 200, chỉ action đó |
| TC-DSL-005 | ActionLabel mapping | (verify response) | `actionLabel` là nhãn tiếng Việt của `action` enum |

**17 action enum:** created_from_his, received_from_modality, viewed, result_drafted, result_modified, result_approved, result_rejected, result_printed, study_info_modified, matched_to_request, unmatched, cancelled, restored, shared, exported_zip, sent_to_remote.

**Edge case:**
- `PerformedByUserId` null → system action (PerformedByName null).
- High-volume study (nhiều activity) → paging.

**Regression impact:** Write-only log — không ảnh hưởng RIS viewer/report flow.

---

### 2.8 Bank / VietQR Payment

**Module liên quan:** PaymentTransaction (sẵn có), Receipt, Patient, Billing, Users (cashier).
**Mô tả nghiệp vụ:** Thanh toán viện phí qua QR ngân hàng VietQR (Napas247) — 5 NH (BIDV/VCB/Agribank/Vietinbank/MSB). BN scan QR bằng app NH bất kỳ → kế toán đối soát sao kê → confirm thủ công (BV chưa có merchant API).

**API liên quan (relevant):**
- `GET /api/payment/bank/list` — list 5 NH + BIN + màu
- `POST /api/payment/create-url` — tạo giao dịch + QR (VietQR khi provider ∈ 5 bank)
- `POST /api/payment/bank/confirm` `[Admin,Accountant,Cashier]` — xác nhận thủ công
- `GET /api/payment/transactions/{id}` / `/by-ref/{txnRef}` / search
- `POST /api/payment/refund` `[Admin,Accountant]`

**Test case:**

| # | Case | Body / Param | Expected |
|---|---|---|---|
| TC-PAY-001 | List banks | `GET /bank/list` | 200, 5 NH `[agribank, bidv, msb, vcb, vietinbank]` + BIN + color |
| TC-PAY-002 | Create VietQR (BIDV) | `{provider:"bidv", amount:500000, patientId, ...}` | 200, `{qrCodeData (EMVCo TLV), payUrl (img.vietqr.io)}` |
| TC-PAY-003 | QR data hợp lệ EMVCo | (verify qrCodeData) | Bắt đầu `00020101...`, kết thúc `6304<CRC4hex>`, có BIN `970418` |
| TC-PAY-004 | Bank confirm | `{transactionId, bankReference:"FT123", note}` | 200, status=1 (paid), tạo Receipt + HĐĐT |
| TC-PAY-005 | Bank confirm giao dịch không tồn tại | `transactionId=<random>` | **500** "Giao dịch không tồn tại" |
| TC-PAY-006 | Bank confirm non-bank provider | (txn provider=vnpay) | **500** "Chỉ có thể xác nhận thủ công cho giao dịch ngân hàng" |
| TC-PAY-007 | Bank confirm đã confirm | (txn status=1) | **500** "Giao dịch đã được xác nhận" |
| TC-PAY-008 | Bank confirm (Nurse) | (Nurse JWT) | 403 |
| TC-PAY-009 | **Regression FK fix** — confirm tạo Receipt | (commit b523579) | Receipt.CashierId = user confirm (KHÔNG Guid.Empty) → không 500 FK |
| TC-PAY-010 | Refund | `POST /refund` (Admin/Accountant) | 200, status refunded |

**Edge case:**
- `CashierId` resolve về user xác nhận; fallback admin/system nếu IPN online (bug FK đã fix).
- VietQR static (amount=0) vs dynamic (amount>0) → ID 01 = `11` vs `12`.
- Merchant name > 25 chars → truncate; bỏ dấu tiếng Việt (NormalizeAscii).

**Regression impact:**
- ⚠️ `LinkReceiptAsync` **dùng chung** cho VNPay/MoMo/ZaloPay IPN → fix FK ảnh hưởng cả 4 → **regression test cả VNPay/MoMo/ZaloPay confirm** sau khi sửa.
- Billing module: Receipt + HĐĐT auto-issue sau payment → verify.

---

### 2.9 MIP/MinIP + Cine + Mammography Viewer

**Module liên quan:** RIS/PACS, DICOM Viewer (Cornerstone3D), Orthanc.
**Mô tả nghiệp vụ:** Nâng cấp DICOM viewer: MIP/MinIP projection (CT/MRI volume), cine loop playback, mammography CC/MLO + magnify + inversion.

**API liên quan:** Không có API mới — component frontend dùng `RISComplete/pacs/*` sẵn có.

**Test case (Manual — cần DICOM viewer + study volume):**

| # | Case | Action | Expected |
|---|---|---|---|
| TC-VW-001 | MIP/MinIP toggle | Mở study CT 135-slice → bật MIP | Render maximum intensity projection |
| TC-VW-002 | MinIP mode | Switch MIP → MinIP | Render minimum intensity (mạch máu/khí) |
| TC-VW-003 | Cine playback | Click play trên multi-frame study | Loop tự động qua các slice, control speed |
| TC-VW-004 | Cine pause/frame | Pause + step frame | Dừng đúng frame |
| TC-VW-005 | Mammo CC/MLO | Mở study MG | 2-up/4-up layout CC + MLO |
| TC-VW-006 | Mammo magnify | Bật magnify glass | Zoom vùng nghi ngờ |
| TC-VW-007 | Mammo invert | Bật inversion | Đảo màu grayscale |

**Test data:** ACRIN chest CT 135 slice (study UID `1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463` trên R2 PACS).

**Edge case:**
- Study < 10 slice → MIP/MinIP/Cine fallback message.
- Browser không hỗ trợ WebGL → Cornerstone3D fallback.

**Regression impact:** Frontend-only — không ảnh hưởng backend. Verify viewer cũ (StackViewport/MPR) vẫn hoạt động.

---

## 3. Luồng test theo thứ tự thực tế

### 3.1 Smoke test (5 phút)

```bash
# Backend + Frontend up
cd backend/src/HIS.API && DOTNET_ROLL_FORWARD=LatestMajor ASPNETCORE_ENVIRONMENT=Development dotnet run --launch-profile http &
cd frontend && npm run dev &

# Page-load Cypress
cd frontend && npx cypress run --spec "cypress/e2e/nangcap24-pages.cy.ts" --browser chrome

# Hoặc Playwright (nhanh hơn)
cd frontend && npx playwright test e2e/nangcap24-pages.spec.ts
```

Expected: 13 (Cypress) + 15 (Playwright) case pass — 7 page load không console error + bank list 5 NH + inspector login + HL7 queue API + 9 endpoint respond.

### 3.2 Regression test (15–20 phút)

**Thứ tự chạy:**
1. NangCap24 page-load + API (Cypress + Playwright).
2. Module liên quan trực tiếp:
   - **Payment**: `payment-*` test (verify VNPay/MoMo/ZaloPay confirm vẫn OK sau fix FK — **quan trọng**, vì `LinkReceiptAsync` dùng chung).
   - **Billing**: Receipt + HĐĐT auto-issue.
   - **RIS/PACS**: viewer cũ (StackViewport/MPR) không bị MIP/MinIP/Cine phá.
   - **RIS HL7**: `07-lis-hl7spy` — HL7 queue mới không phá HL7 flow cũ.
3. Cross-cut:
   - Audit log: verify access log inspector + study activity + biometric sign log.

### 3.3 Integration test (30–45 phút, cần hạ tầng thật)

**Pre-condition:** HTTPS (prod), Orthanc VM reachable, (tuỳ chọn) R2 credential.

**Thứ tự:**
1. **Biometric** (cần thiết bị authenticator): register vân tay BN → sign 1 document → verify `BiometricSignatureLog` (⚠️ IsVerified MVP).
2. **Inspector**: login `inspector/Inspector@123` trên `/inspector-portal` → search HSBA thật → view detail → download XML.
3. **DICOM auto-send**: tạo remote PACS server + rule → send study 135-slice CT → verify C-STORE landed trên Orthanc (DicomTransmissionLog status=`done`).
4. **HL7 queue**: demo-enqueue → retry → verify ack.
5. **DICOM study log**: log vài activity → timeline.
6. **EMR HL7**: export 1 HSBA → verify HL7 content.
7. **EMR cloud sync**: sync 1 HSBA → verify R2 upload (hoặc log nếu chưa cấu hình).
8. **Bank/VietQR**: create-url BIDV → scan QR (app NH thật/giả lập) → confirm thủ công → verify Receipt + paid.

### 3.4 End-to-end (E2E) full workflow (1–2 giờ)

**Sáng:**
1. Admin login → tạo MR + Patient BHYT.
2. BN ký cam kết PT bằng **vân tay** (biometric sign).
3. Chụp CĐHA → study DICOM về PACS → **auto-send** rule gửi sang Cloud-PACS → log transmission.
4. BS đọc kết quả → **DICOM study log** ghi `result_approved`.
5. Thu ngân: BN scan **VietQR BIDV** thanh toán → kế toán confirm → Receipt.

**Chiều:**
6. Xuất **HL7 v2** HSBA → liên thông RIS.
7. **Cloud sync** HSBA lên R2 (primary + DR).
8. **HL7 queue** message ORM/ORU giữa HIS↔RIS↔LIS — retry nếu fail.

**Cuối ngày (giám định):**
9. Giám định viên BHXH login `/inspector-portal` → tra cứu HSBA ngày → tải XML giám định.
10. Verify audit: access log + study activity + biometric sign log đầy đủ.

---

## 4. Checklist trước release

### 4.1 Build + Test pass

- [ ] `dotnet build HIS.sln` → 0 error (lưu ý: HISDbContext + DependencyInjection đã merge NangCap23 + 24, verify không khai báo trùng)
- [ ] `cd frontend && npm run build` → success (tsc -b + vite)
- [ ] `cypress run --spec "cypress/e2e/nangcap24-pages.cy.ts"` → 13 case pass
- [ ] `playwright test e2e/nangcap24-pages.spec.ts` → 15 case pass
- [ ] Smoke 7 v2 page: bank-payments, biometric-enrollment, emr-hl7-export, emr-cloud-sync, dicom-autosend, hl7-message-queue, dicom-study-audit-log
- [ ] Smoke standalone `/inspector-portal` login

### 4.2 Migration apply

- [ ] Script 44 `nangcap24.sql` đã apply → 9 table tồn tại
- [ ] Verify seed `inspector` account (`Inspector@123`)
- [ ] Verify `ProductionSchemaRepairRunner` log "0 missing tables" + `GET /health/schema-drift` → `missingCount: 0`

### 4.3 Env-var production

- [ ] `PaymentGateway__Bank__bidv__AccountNumber=<số TK thật>` (+ vcb/agribank/vietinbank/msb)
- [ ] `Jwt__Key` set (cho inspector JWT)
- [ ] (tuỳ chọn) R2 credential cho EMR cloud sync thật
- [ ] Orthanc remote PACS server config cho DICOM auto-send
- [ ] HTTPS bắt buộc cho biometric WebAuthn (prod Vercel/Cloud Run đã có)

### 4.4 Security

- [ ] ⚠️ **Biometric**: confirm với stakeholder rằng MVP accept signature **chưa dùng làm chữ ký pháp lý** (hoặc wire Fido2NetLib trước go-live)
- [ ] Inspector JWT không dùng chéo được với user JWT (role `BhxhInspector` riêng)
- [ ] Inspector account lockout hoạt động (sai N lần → LockedUntil)
- [ ] BCrypt password cho inspector (không plaintext)
- [ ] ⚠️ Inspector signed-XML: xác nhận placeholder hay đã ký thật

### 4.5 Permission

- [ ] `POST /inspector-portal/accounts` chỉ Admin (Nurse → 403)
- [ ] `GET /inspector-portal/records` chỉ `BhxhInspector` (admin user → 403)
- [ ] `POST /dicom-autosend/rules` chỉ Admin/Radiologist/RadiologyManager
- [ ] `POST /hl7-queue/{id}/retry` chỉ Admin/Radiologist/LabManager
- [ ] `POST /payment/bank/confirm` chỉ Admin/Accountant/Cashier
- [ ] Anonymous → 401 (trừ inspector login + payment IPN/return)

### 4.6 Performance

- [ ] HL7 queue search 1000 row → < 500ms
- [ ] DICOM transmission stats → < 2s
- [ ] DICOM C-STORE 135 slice → trong tolerance (phụ thuộc Orthanc VM)
- [ ] Inspector search HSBA 1000 row → < 1s

### 4.7 Monitoring

- [ ] Verify log sau bank confirm: Receipt + HĐĐT tạo OK
- [ ] Verify access log inspector ghi đầy đủ (view/download/search)
- [ ] Verify DICOM transmission log status transition (pending→sending→done/failed)
- [ ] ⚠️ Verify lỗi validation hiện trả **500** (do thiếu exception filter) — log đủ để debug

### 4.8 Rollback plan

- [ ] Backup env vars Cloud Run
- [ ] Rollback revision: `gcloud run services update-traffic his-api --to-revisions=<prev>=100`
- [ ] DB script idempotent → không cần undo schema

---

## 5. Dữ liệu test cần chuẩn bị chung

### 5.1 Tài khoản

| Loại | Username | Password | Mục đích |
|---|---|---|---|
| Admin | `admin` | `Admin@123` | Tất cả endpoint + inspector account mgmt |
| Inspector | `inspector` | `Inspector@123` | (seed migration 44) Cổng thanh tra |
| Radiologist | `radiologist.test` | — | DICOM auto-send rule CRUD |
| Accountant/Cashier | `cashier.test` | — | Bank confirm |
| Nurse | `nurse.test` | — | Test permission denial (403) |

### 5.2 Master data

- ≥ 1 `RemotePacsServer` (cho DICOM auto-send destination)
- ≥ 1 study DICOM trên Orthanc (135-slice CT có sẵn trên R2)
- ≥ 5 `Patient` (cho biometric + inspector records)
- ≥ 3 `MedicalRecord` BHYT có signed XML / services / medicines (cho inspector + EMR HL7/cloud)

### 5.3 Transactional data

- 1 `PaymentTransaction` provider bank (cho bank confirm)
- (Tự tạo trong test) BiometricCredential, Hl7MessageQueue (demo-enqueue), DicomAutoSendRule, DicomStudyActivityLog (log)

### 5.4 Hạ tầng / External

- **HTTPS** + thiết bị authenticator (Touch ID/Windows Hello/FIDO2) — cho biometric
- Orthanc VM `168.110.52.7` reachable — cho DICOM auto-send C-STORE
- (tuỳ chọn) Cloudflare R2 credential — cho EMR cloud sync thật
- App ngân hàng VN (hoặc giả lập) scan VietQR — cho integration payment

---

## Tài liệu liên quan

- [README.md](./README.md) — Tổng quan + architecture + known risks
- [analysis.md](./analysis.md) — Phân tích source code per-layer
- [test-guide.md](./test-guide.md) — QA checklist UI/manual
- [workflow-test.md](./workflow-test.md) — Workflow + UI matrix + role
- [summary.md](./summary.md) — Index + module impact
