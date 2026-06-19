# NangCap24 — HSMT gói thầu BV Đa khoa (10 gap mới)

## Tổng quan

NangCap24 là gói nâng cấp tiếp theo của HSMT BV Đa khoa, đóng **10 gap** còn
thiếu so với yêu cầu thầu — tập trung vào **ký số sinh trắc, cổng giám định
BHXH, liên thông EMR/HL7, tự động hoá DICOM, thanh toán ngân hàng VietQR và
nâng cấp DICOM viewer**. Khác với NangCap23 (6 phân hệ có cả page v1 + v2),
NangCap24 **chỉ có UI v2** (TerminalLayout) cộng 1 cổng standalone cho thanh
tra BHXH.

| # | Gap HSMT | Route / Component | Backend |
|---|---|---|---|
| 1 | Biometric / WebAuthn — ký HSBA bằng sinh trắc (vân tay/FaceID) | `/v2/biometric-enrollment` | `BiometricSignatureService` · `/api/biometric` |
| 2 | Cổng thanh tra BHXH (Inspector Portal) — login riêng, xem HSBA + signed XML | `/inspector-portal` (standalone) | `BhxhInspectorService` · `/api/inspector-portal` |
| 3 | EMR HL7 export — xuất HSBA ra HL7 v2 message | `/v2/emr-hl7-export` | `EmrHl7ArchiveService` · `/api/emr/hl7` |
| 4 | EMR cloud sync — đồng bộ HSBA lên Cloud (R2) + retry-failed | `/v2/emr-cloud-sync` | `EmrCloudSyncService` · `/api/emr/cloud-sync` |
| 5 | DICOM auto-send — rule-based tự gửi study tới PACS đích | `/v2/dicom-autosend` | `DicomAutoSendService` · `/api/dicom-autosend` |
| 6 | HL7 message queue — hàng đợi + retry-all-failed | `/v2/hl7-message-queue` | `Hl7QueueService` · `/api/hl7-queue` |
| 7 | DICOM study activity audit log — log từng hoạt động/ca chụp | `/v2/dicom-study-audit-log` | `DicomStudyActivityService` · `/api/dicom-study-log` |
| 8 | Bank / VietQR Napas247 payment (BIDV/VCB/Agribank/Vietinbank/MSB) | `/v2/bank-payments` | `PaymentGatewayService.VietQR` (partial) · `/api/payment/bank/*` |
| 9 | MIP / MinIP viewer (maximum/minimum intensity projection) | `MipMinIpViewer.tsx` (FE-only) | — (Cornerstone3D, không API) |
| 10 | Cine playback controls + Mammography viewer nâng cấp | `CineControls.tsx` + `MammoViewer.tsx` (FE-only) | — (FE-only) |

> **7 service backend** (gap 1–7) + **gap 8 mở rộng PaymentGatewayService sẵn có**
> (partial class) + **gap 9–10 thuần frontend** (component viewer Cornerstone3D,
> không có API mới).

## Production-readiness

| Cấu phần | Trạng thái |
|---|---|
| Backend layer: Entity/DTO/Service/Controller/DI/Migration | ✅ Hoàn thiện |
| Biometric WebAuthn challenge/credential persist (FIDO2) | ✅ `BiometricCredential` + `BiometricSignatureLog` |
| Biometric **xác minh chữ ký ECDSA/RSA** | ⚠️ **MVP** — hiện accept signature, chưa verify COSE key thật (xem [§Known risks](#known-risks)) |
| Inspector Portal JWT auth riêng (role `BhxhInspector`) | ✅ BCrypt password + account lockout |
| VietQR EMVCo TLV generator (static + dynamic QR, CRC-16) | ✅ `PaymentGatewayService.VietQR.cs` |
| Bank confirm thủ công (đối soát kế toán) | ✅ `ConfirmBankTransferAsync` (FK_Receipts_Cashier đã fix — commit `b523579`) |
| HL7 queue + retry + ack tracking | ✅ string-status state (`pending/sending/sent/failed/acked/retrying`) |
| DICOM auto-send rule + transmission log + stats | ✅ tích hợp Orthanc remote-server (C-STORE) |
| Exception filter mapping (400/404/409) | ⚠️ **KHÔNG có** filter riêng — service throw `Exception` → generic 500 (khác NangCap23) |
| Role-based authorization | ✅ Per-action (xem [test-guide §6](./test-guide.md)) |
| Test coverage | ✅ 13 Cypress page-load + 15 Playwright + 8 prod-functional |
| QA guide | ✅ `docs/features/nangcap24/test-guide.md` |

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│ HIS.API Controllers (NangCap24Controllers.cs + PaymentGateway)  │
│   /api/biometric/{register,sign}-{begin,finish}     [Authorize] │
│   /api/inspector-portal/login   [AllowAnonymous]                │
│   /api/inspector-portal/records [Authorize(BhxhInspector)]      │
│   /api/inspector-portal/accounts [Authorize(Admin)]             │
│   /api/emr/hl7/export                               [Authorize] │
│   /api/emr/cloud-sync/{sync,logs,status,retry-failed}           │
│   /api/dicom-autosend/{rules,send,transmissions,stats}          │
│   /api/hl7-queue/{search,retry,retry-all-failed,demo-enqueue}   │
│   /api/dicom-study-log/{search,study/{uid},log}                 │
│   /api/payment/bank/{list,confirm}  + create-url + IPN/return   │
└─────────────────────────────┬──────────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────────┐
│ HIS.Application Services (INangCap24Services.cs)               │
│   IBiometricSignatureService   ◄── DI: HISDbContext +          │
│   IBhxhInspectorService            IConfiguration +            │
│   IEmrHl7ArchiveService            JWT token gen (inspector) + │
│   IEmrCloudSyncService             Orthanc REST (autosend) +   │
│   IDicomAutoSendService            ILogger                     │
│   IHl7QueueService                                            │
│   IDicomStudyActivityService                                  │
│                                                                │
│ IPaymentGatewayService (sẵn có) ← VietQR partial class mở rộng │
└─────────────────────────────┬──────────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────────┐
│ HIS.Infrastructure                                             │
│   NangCap24Services.cs (~1547 LOC, 7 impl)                     │
│   PaymentGatewayService.VietQR.cs (EMVCo TLV + bank confirm)   │
│   9 DbSet + Fluent API (HISDbContext)                          │
│   Orthanc REST client (DICOM C-STORE qua RemotePacsServer)     │
│   Cloudflare R2 (EMR cloud sync destination)                   │
└────────────────────────────────────────────────────────────────┘

Frontend (v2-only, TerminalLayout):
  pages-v2/{BankPayments, BiometricEnrollment, EmrHl7Export, EmrCloudSync,
            DicomAutoSend, Hl7MessageQueue, DicomStudyAuditLog}.tsx (7 page)
  pages-v2/InspectorPortal.tsx (standalone /inspector-portal)
  components/{MipMinIpViewer, CineControls, MammoViewer}.tsx (DICOM viewer)
```

## Cấu hình môi trường

### Bank / VietQR (`appsettings.json` → `PaymentGateway:Bank`)

```json
{
  "PaymentGateway": {
    "Bank": {
      "QrImageBase": "https://img.vietqr.io/image",
      "bidv":       { "AccountNumber": "31410000123456", "MerchantName": "BENH VIEN HIS - BIDV",  "QrTemplate": "compact2" },
      "vcb":        { "AccountNumber": "0011004567890",  "MerchantName": "BENH VIEN HIS - VCB" },
      "agribank":   { "AccountNumber": "1500201234567",  "MerchantName": "BENH VIEN HIS - AGRIBANK" },
      "vietinbank": { "AccountNumber": "108001234567",   "MerchantName": "BENH VIEN HIS - VIETINBANK" },
      "msb":        { "AccountNumber": "0301012345678",  "MerchantName": "BENH VIEN HIS - MSB" }
    }
  }
}
```

BIN code Napas cố định (không đổi): BIDV `970418`, VCB `970436`, Agribank
`970405`, Vietinbank `970415`, MSB `970426`. QR sinh ra mọi banking app VN
scan được, **không cần merchant contract**. Production: BV cấu hình số tài
khoản thật + (tuỳ chọn) proxy nội bộ render QR thay `img.vietqr.io`.

### WebAuthn / Biometric

- `RpId` (Relying Party ID) = domain (vd. `his-psi.vercel.app`). **Bắt buộc
  HTTPS** — WebAuthn không chạy trên `http://` (trừ `localhost`).
- Cần thiết bị có authenticator (Touch ID, Windows Hello, FIDO2 key) để test
  register/sign end-to-end.

### Inspector Portal

- Tài khoản seed sẵn: `inspector` / `Inspector@123` (BCrypt hash trong migration
  44). Production seed thêm qua `POST /api/inspector-portal/accounts` (Admin).
- JWT inspector tách biệt khỏi JWT user thường, role = `BhxhInspector`.

### Cloud Run prod env-var

```bash
gcloud run services update his-api --update-env-vars="
  PaymentGateway__Bank__bidv__AccountNumber=<số TK thật>,
  PaymentGateway__Bank__vcb__AccountNumber=<số TK thật>,
  Jwt__Key=<key>
" --region=asia-southeast1 --project=project-4d4a3f8e-d582-4536-97f
```

## Files

### Backend (9 file)
- `backend/src/HIS.Core/Entities/NangCap24Entities.cs` — 9 entities
- `backend/src/HIS.Application/DTOs/NangCap24/NangCap24DTOs.cs` — ~30 DTO
- `backend/src/HIS.Application/DTOs/Payment/PaymentGatewayDTOs.cs` — +`BankConfirmDto` (mở rộng)
- `backend/src/HIS.Application/Services/INangCap24Services.cs` — 7 service interface
- `backend/src/HIS.Application/Services/IPaymentGatewayService.cs` — +`ConfirmBankTransferAsync`
- `backend/src/HIS.Infrastructure/Services/NangCap24Services.cs` — 7 service impl (~1547 LOC)
- `backend/src/HIS.Infrastructure/Services/PaymentGatewayService.VietQR.cs` — VietQR + confirm (~217 LOC)
- `backend/src/HIS.API/Controllers/NangCap24Controllers.cs` — 7 controller (~344 LOC)
- `backend/src/HIS.API/Controllers/PaymentGatewayController.cs` — +`bank/list`, `bank/confirm`
- `backend/src/HIS.Infrastructure/Data/Scripts/140_nangcap24.sql` — 9 table + seed inspector

### Frontend (v2-only)
- `frontend/src/api/nangcap24.ts` — API client (~480 LOC)
- `frontend/src/pages-v2/{BankPayments, BiometricEnrollment, EmrHl7Export, EmrCloudSync, DicomAutoSend, Hl7MessageQueue, DicomStudyAuditLog}.tsx` — 7 v2 page
- `frontend/src/pages-v2/InspectorPortal.tsx` — standalone cổng thanh tra
- `frontend/src/components/{MipMinIpViewer, CineControls}.tsx` + `MammoViewer.tsx` (nâng cấp)
- `frontend/src/App.tsx` (+8 route), `layouts/terminal/TerminalLayout.tsx` (+7 menu), `Icon.tsx` (+8 icon)

### Tests
- `frontend/cypress/e2e/nangcap24-pages.cy.ts` — page-load + API + inspector login
- `frontend/e2e/nangcap24-pages.spec.ts` — Playwright page-load + functional
- `frontend/e2e-prod/nangcap24-functional.spec.ts` — prod functional smoke

### Docs
- `docs/features/nangcap24/README.md` — file này
- `docs/features/nangcap24/analysis.md` — phân tích source code per-layer
- `docs/features/nangcap24/test-plan.md` — test plan per-chức-năng
- `docs/features/nangcap24/test-guide.md` — QA checklist
- `docs/features/nangcap24/workflow-test.md` — workflow + UI matrix + dependency + role
- `docs/features/nangcap24/summary.md` — index + module impact

## Known risks

Khác với NangCap23 (đã qua hardening adversarial), NangCap24 còn một số điểm
cần lưu ý khi go-live (chi tiết [analysis.md §17](./analysis.md)):

| Điểm | Mức | Ghi chú |
|---|---|---|
| Biometric chưa verify chữ ký thật | High | `BiometricSignatureService.FinishSignAsync` comment "MVP: accept signature — production verify ECDSA/RSA với PublicKey (COSE)". Hiện `IsVerified=true` khi credential tồn tại. Cần wire thư viện FIDO2 (vd. `Fido2NetLib`) verify `AuthenticatorData` + `Signature` trước go-live ký pháp lý. |
| Không có exception filter | Med | NangCap24 controllers **không** dùng `Nangcap23ExceptionFilter`. Service throw `throw new Exception("...")` → trả **500** (không map về 400/404/409). Test phải assert 500 + message, hoặc bổ sung filter. |
| Validation tối thiểu | Med | Hầu hết chỉ check null (`if (x == null) throw`). Chưa có DTO validator phong phú như NangCap23. |
| Inspector signed-XML là placeholder | Med | `DownloadSignedXmlAsync` trả XML có `<Signature>placeholder-pkcs7-detached-signature</Signature>` — chưa ký số thật. |
| EMR cloud sync R2 cần credential | Low | Đồng bộ thật cần R2 access key (xem PACS deploy log). Mock/log nếu chưa cấu hình. |

## Trạng thái deploy prod

| Layer | Trạng thái |
|---|---|
| Cloud Run | `his-api-00029-khb` (image `his-api:20260525-...`, đã fix FK payment confirm) |
| Vercel | NangCap24 FE live (push `185ccd5` → `0eb70c1`) |
| DB migration `140_nangcap24.sql` | ✅ 9 bảng, `schema-drift` = `missingCount: 0` |

## Commit / Release reference

- `2998527` — feat(nangcap24): HSMT BV Đa khoa — close 10 gap (BE + FE + tests)
- `185ccd5` — feat(nangcap24-v2): port 9 pages từ Claude Design bundle `7U9Opm5HscHHysP6aaHH_A`
- `2f89d61` — docs(CLAUDE.md): deploy NangCap24 backend (rev `00028-gm6`)
- `b523579` — fix(payment): resolve FK_Receipts_Users_Cashier 500 on payment confirmation (rev `00029-khb`)
- `0eb5f4d` — docs(CLAUDE.md): NangCap24 seed data + payment confirm fix
- `0eb70c1` — feat(v2-menu): đánh dấu [24] cho 7 menu NangCap24 + prod functional test
