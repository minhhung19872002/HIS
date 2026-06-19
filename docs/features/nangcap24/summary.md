# NangCap24 — Tóm tắt tài liệu + Module Impact

> **Mục đích:** Index cross-doc + bảng tổng hợp + ranking module ảnh hưởng +
> danh sách file source + outstanding items.
> **Đối tượng:** Tech lead, Release manager, QA lead, PO.
> **Last updated:** 2026-05-25

---

## Mục lục

- [1. Bộ tài liệu NangCap24](#1-bộ-tài-liệu-nangcap24)
- [2. Mapping chức năng ↔ API ↔ Test ↔ File source](#2-mapping-chức-năng--api--test--file-source)
- [3. Module impact ranking](#3-module-impact-ranking)
- [4. Source file đã thay đổi/thêm mới](#4-source-file-đã-thay-đổisthêm-mới)
- [5. So sánh NangCap24 vs NangCap23](#5-so-sánh-nangcap24-vs-nangcap23)
- [6. Checklist quick-reference cho QA](#6-checklist-quick-reference-cho-qa)
- [7. Outstanding items](#7-outstanding-items)

---

## 1. Bộ tài liệu NangCap24

Toàn bộ nằm dưới `docs/features/nangcap24/` (đúng convention
`docs/features/<feature>/`), cùng cấu trúc 6 file như NangCap23.

| File | Vai trò | Đối tượng đọc |
|---|---|---|
| [`README.md`](./README.md) | Overview + architecture + config + known risks | Tech lead, Dev |
| [`analysis.md`](./analysis.md) | Phân tích source code per-layer + TODO/nguy cơ | Dev review, Audit |
| [`test-plan.md`](./test-plan.md) | Test plan per-chức-năng + test case + flow test | QA lead, QA team |
| [`test-guide.md`](./test-guide.md) | QA checklist UI/manual 11 section | QA team |
| [`workflow-test.md`](./workflow-test.md) | Workflow + UI matrix + dependency + role | QA + Dev |
| [`summary.md`](./summary.md) | (File này) Index + module impact | Tech lead, PO |

---

## 2. Mapping chức năng ↔ API ↔ Test ↔ File source

| Chức năng | API endpoint | Service | Entity | Test | Page (FE) |
|---|---|---|---|---|---|
| Biometric register | `POST /biometric/register-{begin,finish}` | `BiometricSignatureService` | `BiometricCredential` | Manual | `pages-v2/BiometricEnrollment.tsx` |
| Biometric sign | `POST /biometric/sign-{begin,finish}` | (same) | `BiometricSignatureLog` | Manual | (same) |
| List/revoke credential | `GET/DELETE /biometric/credentials/*` | (same) | (same) | page-load | (same) |
| Inspector login | `POST /inspector-portal/login` | `BhxhInspectorService` | `BhxhInspectorAccount` | cy + pw | `pages-v2/InspectorPortal.tsx` (standalone) |
| Inspector search/detail | `GET /inspector-portal/records[/{id}]` | (same) | (read MedicalRecord) + `BhxhInspectorAccessLog` | pw functional | (same) |
| Inspector download XML | `GET /inspector-portal/records/{id}/signed-xml` | (same) | — | Manual | (same) |
| Inspector account CRUD | `GET/POST/PUT /inspector-portal/accounts` | (same) | `BhxhInspectorAccount` | endpoint check | (same) |
| EMR HL7 export | `POST /emr/hl7/export` + `GET /export/{id}` | `EmrHl7ArchiveService` | (read-only) | pw functional | `pages-v2/EmrHl7Export.tsx` |
| EMR cloud sync | `POST /emr/cloud-sync/sync` | `EmrCloudSyncService` | `EmrCloudSyncLog` | endpoint check | `pages-v2/EmrCloudSync.tsx` |
| EMR cloud status/logs | `GET /emr/cloud-sync/{status,logs}` | (same) | (same) | page-load | (same) |
| EMR cloud retry-failed | `POST /emr/cloud-sync/retry-failed` (Admin) | (same) | (same) | Manual | (same) |
| DICOM rule CRUD | `GET/POST/PUT/DELETE /dicom-autosend/rules` | `DicomAutoSendService` | `DicomAutoSendRule` | page-load | `pages-v2/DicomAutoSend.tsx` |
| DICOM manual send | `POST /dicom-autosend/send` | (same) | `DicomTransmissionLog` | Manual + prod | (same) |
| DICOM transmission/stats | `GET /dicom-autosend/{transmissions,stats}` | (same) | (same) | page-load | (same) |
| HL7 queue search | `GET /hl7-queue` | `Hl7QueueService` | `Hl7MessageQueue` | cy + pw | `pages-v2/Hl7MessageQueue.tsx` |
| HL7 enqueue | `POST /hl7-queue/demo-enqueue` (Admin) | (same) | (same) | pw functional | (same) |
| HL7 retry / retry-all | `POST /hl7-queue/{id}/retry` + `/retry-all-failed` | (same) | (same) | Manual | (same) |
| DICOM study log | `GET /dicom-study-log` + `POST /log` | `DicomStudyActivityService` | `DicomStudyActivityLog` | page-load + pw | `pages-v2/DicomStudyAuditLog.tsx` |
| Bank list 5 NH | `GET /payment/bank/list` | (controller hardcoded) | — | cy | `pages-v2/BankPayments.tsx` |
| VietQR create | `POST /payment/create-url` | `PaymentGatewayService.VietQR` | `PaymentTransaction` | Manual + prod | (same) |
| Bank confirm | `POST /payment/bank/confirm` | (same) `ConfirmBankTransferAsync` | `PaymentTransaction` + `Receipt` | Manual + prod | (same) |
| MIP/MinIP/Cine/Mammo | (không API) | — (Cornerstone3D FE) | — | Manual | `components/{MipMinIpViewer,CineControls,MammoViewer}.tsx` |

**Tổng:**
- Chức năng: **22**
- Endpoint: **~35** (gồm 5 `[AllowAnonymous]`: inspector login + 4 payment IPN/return)
- Service interface: **7** (+ mở rộng `IPaymentGatewayService`)
- Entity: **9** (+ tái dùng `PaymentTransaction`)
- DTO: **~30** (+ `BankConfirmDto`)
- Page FE: **7 v2 + 1 standalone = 8** (KHÔNG có v1)
- Viewer component: **3** (MIP/MinIP, Cine, Mammo — FE-only)
- Test file: **3** (1 cypress + 2 playwright)

---

## 3. Module impact ranking

### 3.1 Module mới (high impact — code mới)

| Rank | Module | Mô tả | Lý do high |
|---|---|---|---|
| 1 | **Bank / VietQR Payment** | Thanh toán QR Napas247 + confirm | ⚠️ `LinkReceiptAsync` dùng chung VNPay/MoMo/ZaloPay → fix FK ảnh hưởng 4 cổng; tài chính trực tiếp |
| 2 | **Biometric WebAuthn** | Ký HSBA sinh trắc | Pháp lý (chữ ký); MVP chưa verify thật — cần Fido2NetLib |
| 3 | **BHXH Inspector Portal** | Cổng giám định standalone | JWT riêng + privacy HSBA + audit; signed XML placeholder |
| 4 | **DICOM Auto-Send** | Rule-based C-STORE | Tích hợp Orthanc; mất ảnh nếu fail; chưa lock concurrent |
| 5 | **HL7 Message Queue** | Hàng đợi + retry | Liên thông RIS/LIS; string status |
| 6 | **EMR Cloud Sync** | Đồng bộ R2 + DR | Backup HSBA; cần R2 credential |
| 7 | **EMR HL7 Export** | Xuất HL7 v2 | Read-only liên thông |
| 8 | **DICOM Study Activity Log** | Audit per-study | Write-only log (NangCap RIS 1.11) |
| 9 | **MIP/MinIP/Cine/Mammo viewer** | DICOM viewer nâng cấp | FE-only Cornerstone3D |

### 3.2 Module hiện có bị ảnh hưởng

| Module | Bị ảnh hưởng bởi | Hành động |
|---|---|---|
| `PaymentTransaction` + `Receipt` + HĐĐT | Bank/VietQR (mở rộng) | ⚠️ Test cả VNPay/MoMo/ZaloPay confirm (LinkReceiptAsync chung) |
| `MedicalRecord` | Inspector, EMR HL7, EMR cloud sync | Read-only — verify không drift |
| `Patient` | Biometric, Inspector | Read-only |
| `RemotePacsServer` (NangCap15) | DICOM auto-send destination | Verify config cũ vẫn OK |
| `DicomStudy` / `RadiologyRequest` | DICOM auto-send + study log | Read-only |
| Cornerstone3D DICOM Viewer | MIP/MinIP/Cine/Mammo component | ⚠️ Verify viewer cũ (StackViewport/MPR) không phá |
| `Users` (CashierId, audit) | Bank confirm, audit | Verify FK + audit |
| RIS/LIS HL7 flow | HL7 message queue | Verify HL7 cũ (07-lis-hl7spy) không phá |

### 3.3 Module cross-cut bị mở rộng

| Cross-cut | Thay đổi | File |
|---|---|---|
| `PaymentGatewayService` | Partial class +VietQR + ConfirmBankTransfer | `PaymentGatewayService.VietQR.cs` |
| `HISDbContext` | +9 DbSet + Fluent API | `HISDbContext.cs` |
| `DependencyInjection` | +7 service | `DependencyInjection.cs` |
| JWT auth | +role `BhxhInspector` (inspector login) | `BhxhInspectorService` |
| Audit | +3 bảng log (access/sign/study activity) | NangCap24 entities |

### 3.4 Module KHÔNG bị ảnh hưởng

- NangCap23 (cổng QG, Đề án 06, Linen, FDT, Zalo, Quality Dashboard) — độc lập
- LIS / Lab / Pathology
- AI Labeling
- Telemedicine / Jitsi
- HL7 FHIR R4
- Digital Signature / Pkcs11Interop (khác biometric)
- Reports
- Master Data

---

## 4. Source file đã thay đổi/thêm mới

### 4.1 Backend

```
HIS.Core/Entities/
  └─ NangCap24Entities.cs                   (NEW, ~198 LOC, 9 entity)

HIS.Application/DTOs/NangCap24/
  └─ NangCap24DTOs.cs                       (NEW, ~470 LOC, ~30 DTO)
HIS.Application/DTOs/Payment/
  └─ PaymentGatewayDTOs.cs                  (MODIFIED, +BankConfirmDto)

HIS.Application/Services/
  ├─ INangCap24Services.cs                  (NEW, ~90 LOC, 7 interface)
  └─ IPaymentGatewayService.cs              (MODIFIED, +ConfirmBankTransferAsync)

HIS.Infrastructure/Services/
  ├─ NangCap24Services.cs                   (NEW, ~1547 LOC, 7 impl)
  ├─ PaymentGatewayService.VietQR.cs        (NEW, ~217 LOC, partial)
  └─ PaymentGatewayService.cs               (MODIFIED, +24 LOC, LinkReceiptAsync fix)

HIS.Infrastructure/Data/
  ├─ HISDbContext.cs                        (MODIFIED, +9 DbSet + Fluent API)
  └─ Scripts/140_nangcap24.sql               (NEW, ~281 LOC, 9 table + seed inspector)

HIS.Infrastructure/
  └─ DependencyInjection.cs                 (MODIFIED, +7 service)

HIS.API/Controllers/
  ├─ NangCap24Controllers.cs                (NEW, ~344 LOC, 7 controller)
  └─ PaymentGatewayController.cs            (MODIFIED, +bank/list +bank/confirm)
```

### 4.2 Frontend (v2-only)

```
src/api/
  └─ nangcap24.ts                           (NEW, ~480 LOC)

src/pages-v2/                               (v2 — TerminalLayout)
  ├─ BankPayments.tsx                       (NEW, ~376 LOC)
  ├─ BiometricEnrollment.tsx                (NEW, ~420 LOC)
  ├─ EmrHl7Export.tsx                       (NEW, ~210 LOC)
  ├─ EmrCloudSync.tsx                       (NEW, ~295 LOC)
  ├─ DicomAutoSend.tsx                      (NEW, ~355 LOC)
  ├─ Hl7MessageQueue.tsx                    (NEW, ~314 LOC)
  ├─ DicomStudyAuditLog.tsx                 (NEW, ~243 LOC)
  └─ InspectorPortal.tsx                    (NEW, ~426 LOC, standalone)

src/components/
  ├─ MipMinIpViewer.tsx                     (NEW, ~447 LOC)
  ├─ CineControls.tsx                       (NEW, ~163 LOC)
  └─ MammoViewer.tsx                        (MODIFIED, +153 LOC nâng cấp)

src/
  ├─ App.tsx                                (MODIFIED, +8 lazy + 8 route)
  ├─ layouts/terminal/TerminalLayout.tsx    (MODIFIED, +7 menu)
  ├─ layouts/terminal/Icon.tsx              (MODIFIED, +8 icon)
  └─ api/client.ts                          (MODIFIED, +5 LOC)
```

### 4.3 Test

```
frontend/cypress/e2e/
  └─ nangcap24-pages.cy.ts                  (NEW, ~155 LOC, page-load + API + inspector login)

frontend/e2e/
  └─ nangcap24-pages.spec.ts                (NEW, ~175 LOC, Playwright page-load + functional)

frontend/e2e-prod/
  └─ nangcap24-functional.spec.ts           (NEW, ~129 LOC, prod functional smoke)
```

### 4.4 Tổng kết

- **~35 file** thay đổi/thêm mới
- **~7700 LOC** thêm mới (commit `2998527` + `185ccd5`)
- **v2-only** (không có page v1 MainLayout)
- Deploy prod: Cloud Run `his-api-00029-khb` + Vercel

---

## 5. So sánh NangCap24 vs NangCap23

| Tiêu chí | NangCap23 | NangCap24 |
|---|---|---|
| Số gap | 9 | 10 |
| Entity mới | 10 | 9 |
| Service | 7 + 4 gateway client + config store | 7 (+ mở rộng PaymentGatewayService) |
| Page FE | 6 v1 + 6 v2 | **7 v2 + 1 standalone** (không v1) |
| Status field | int 0–4 | **string** (active/done/acked...) |
| Exception filter | ✅ `Nangcap23ExceptionFilter` (400/404/409) | ❌ **KHÔNG** → lỗi trả 500 |
| Retry background worker | ✅ `Nangcap23RetryWorker` | ❌ (có `ProcessPendingAsync` chưa wire) |
| Config encryption / SSRF | ✅ `ConfigStore` + `ConfigValidator` | ❌ |
| State machine guard | ✅ `Nangcap23StateMachine` | ❌ (chỉ check null/status inline) |
| Hardening adversarial | ✅ đã qua audit | ⚠️ chưa (xem known risks) |
| Auth đặc thù | role Midwife/PharmacyHead | role `BhxhInspector` (JWT riêng) |
| External | 4 cổng QG (HTTP) | WebAuthn + R2 + Orthanc + Banking QR |

→ **Hệ quả test:** NangCap24 assert lỗi = **500** (không 400/404/409). Biometric +
inspector signed-XML là **MVP/placeholder** — cần lưu ý khi nghiệm thu pháp lý.

---

## 6. Checklist quick-reference cho QA

### 6.1 Lúc bắt đầu sprint test

- [ ] Đọc [README.md](./README.md) (15 phút) — 10 gap + known risks
- [ ] Đọc [test-guide.md](./test-guide.md) (20 phút) — 11 section kịch bản UI
- [ ] Đọc [test-plan.md](./test-plan.md) §1+§3 — mapping + thứ tự test
- [ ] Chuẩn bị: HTTPS + thiết bị authenticator (biometric), Orthanc VM, inspector account
- [ ] Seed user role: Radiologist, Accountant/Cashier, Nurse (test 403)

### 6.2 Mỗi ngày sprint

- [ ] Smoke test page-load (Cypress + Playwright) trước feature mới
- [ ] Test 1–2 module/ngày theo [test-plan.md](./test-plan.md) §2
- [ ] Nhớ: lỗi validation = **500** (không 400)

### 6.3 Trước release

- [ ] Hoàn tất [test-plan.md](./test-plan.md) §4 "Checklist trước release"
- [ ] ⚠️ **Regression 4 cổng payment confirm** (FK fix dùng chung)
- [ ] ⚠️ Xác nhận stakeholder: biometric MVP + inspector XML placeholder
- [ ] Verify [analysis.md §17](./analysis.md) nguy cơ không có item mới

---

## 7. Outstanding items

### 7.1 Block release

Không có blocker cứng cho deploy demo (đã live prod `his-api-00029-khb`).
**Nhưng** trước nghiệm thu **pháp lý** cần làm rõ 2 điểm MVP:

| Item | Mức | Hành động |
|---|---|---|
| Biometric verify chữ ký ECDSA/RSA thật | High | Wire `Fido2NetLib` verify Signature + AuthenticatorData + counter trước khi dùng làm chữ ký pháp lý |
| Inspector signed-XML ký số thật | Med | Thay placeholder bằng ký PKCS#7 thật |

### 7.2 Nice-to-have (không block)

| Item | Ưu tiên | Lý do hoãn |
|---|---|---|
| Exception filter NangCap24 (map 400/404/409) | Med | Lỗi hiện trả 500 — chưa map; thêm `Nangcap24ExceptionFilter` |
| HL7 queue background auto-process | Med | `ProcessPendingAsync` chưa wire hosted service |
| DICOM auto-send scheduled (cron) trigger | Med | TriggerType=scheduled có field, chưa có worker |
| Distributed lock DICOM auto-send (chống 2 instance) | Low | Idempotency hoặc lock |
| UNIQUE index BiometricCredentials.CredentialId | Low | Chống race duplicate |
| SignatureCounter verify (anti-replay) | Med | Chống clone authenticator |

### 7.3 Phụ thuộc bên ngoài

| Item | Ai cấp | Hành động |
|---|---|---|
| Số TK ngân hàng thật (5 NH) | BV | Set `PaymentGateway:Bank:*:AccountNumber` |
| Thiết bị authenticator | BN/máy trạm | Test biometric end-to-end |
| Cloudflare R2 access key | DevOps | EMR cloud sync thật (Secret Manager) |
| Orthanc VM remote PACS | DevOps | Đã có `168.110.52.7` |

### 7.4 Nguy cơ tiềm ẩn (đã document — analysis §17)

- Biometric IsVerified MVP (R1) + SignatureCounter không check (R4)
- Không exception filter → 500 thay 400/404 (R2)
- Inspector signed-XML placeholder (R3)
- DICOM auto-send 2 instance duplicate (R6)
- R2 credential trong env (R7)

---

## Liên kết external

- **HSMT root:** [`../../requirements.md`](../../requirements.md)
- **NangCap roadmap:** [`../../roadmap/nangcap-phan-tich.md`](../../roadmap/nangcap-phan-tich.md)
- **Project structure:** [`../../architecture/PROJECT_STRUCTURE.md`](../../architecture/PROJECT_STRUCTURE.md)
- **NangCap23 (gói trước):** [`../nangcap23/README.md`](../nangcap23/README.md)

## Commit / Release reference

- `2998527` — feat(nangcap24): HSMT BV Đa khoa — close 10 gap (BE + FE + tests)
- `185ccd5` — feat(nangcap24-v2): port 9 pages từ Claude Design bundle `7U9Opm5HscHHysP6aaHH_A`
- `2f89d61` — docs(CLAUDE.md): deploy NangCap24 backend (rev `00028-gm6`)
- `b523579` — fix(payment): resolve FK_Receipts_Users_Cashier 500 on payment confirmation (rev `00029-khb`)
- `0eb5f4d` — docs(CLAUDE.md): NangCap24 seed data + payment confirm fix
- `0eb70c1` — feat(v2-menu): đánh dấu [24] cho 7 menu NangCap24 + prod functional test

Diff `2998527..0eb70c1` = toàn bộ phạm vi gói NangCap24.
