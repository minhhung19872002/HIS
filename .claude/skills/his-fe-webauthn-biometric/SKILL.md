---
name: his-fe-webauthn-biometric
description: Use this skill when building or editing the HIS biometric/WebAuthn signature feature — patients signing EMR documents by fingerprint/FaceID via the browser WebAuthn API. Triggers include register/sign credential flows, `navigator.credentials.create/get`, the `/api/biometric` endpoints, BiometricEnrollment page, or RpId/HTTPS issues. Do NOT use for ordinary REST list/detail pages (his-fe-page-v2) or central digital-signature (Pkcs11/USB token).
type: project
---

# HIS WebAuthn Biometric Signature

> TẦNG: **B · PROJECT/HIS** (system). Depend: `core-types-contract`, `core-error-loading-state`, `his-fe-api-client`.

Skill cho chức năng **ký HSBA bằng sinh trắc (WebAuthn FIDO2)** — BN đăng ký vân tay/FaceID rồi ký document. Luồng 2 pha (begin → browser → finish), khác hẳn page REST thường nên cần skill riêng.

## Khi nào dùng
- Thêm/sửa luồng đăng ký credential (register) hoặc ký (sign) sinh trắc.
- Đụng `navigator.credentials.create()/get()`, endpoint `/api/biometric/*`, page `BiometricEnrollment`.
- Fix lỗi WebAuthn (RpId, HTTPS, allowCredentials).

## Khi nào KHÔNG dùng
- Page list/detail thường → `his-fe-page-v2`.
- Ký số tập trung CKS/USB token (Pkcs11) → đó là module khác (digital-signature/central-signing).
- Gọi REST đơn thuần → `his-fe-api-client`.

## Kiến trúc (NangCap24)
- BE: `BiometricSignatureService` · controller `/api/biometric` · entity `BiometricCredential` + `BiometricSignatureLog`.
- FE: `pages-v2/BiometricEnrollment.tsx` + `api/nangcap24.ts` (object `biometric`).
- Luồng **2 pha**:
  - **Register**: `POST /register-begin` (trả `challenge`,`userHandle`,`rpId`,`rpName`) → browser `navigator.credentials.create()` → `POST /register-finish` (gửi `credentialId`,`publicKey`,`clientDataJson`,`attestationObject`).
  - **Sign**: `POST /sign-begin` (trả `challenge`,`allowCredentials[]`) → browser `navigator.credentials.get()` → `POST /sign-finish` (gửi `signature`,`authenticatorData`,`clientDataJson`).
  - List/revoke: `GET /credentials/{patientId}`, `DELETE /credentials/{id}`.

## Quy trình chuẩn
1. **API client**: thêm/sửa hàm trong `api/nangcap24.ts` object `biometric` (begin/finish, list, revoke) — theo `his-fe-api-client`.
2. **Browser flow**: convert base64url ↔ ArrayBuffer cho `challenge`/`credentialId`/`publicKey`/`signature` (WebAuthn dùng BufferSource). Xem `references/webauthn-flow.ts`.
3. **UI**: trong `BiometricEnrollment.tsx` — chọn BN → register → list credential (status active/revoked, usageCount) → sign document → revoke. State/empty/error theo `core-error-loading-state`.
4. **Verify**: cần **HTTPS** (prod Vercel/Cloud Run) + thiết bị authenticator. KHÔNG test được qua curl/headless → manual.

## Điều kiện BẮT BUỘC
- **HTTPS** (hoặc `localhost`) — WebAuthn không chạy trên `http://<ip>`.
- **RpId** = domain (vd `his-psi.vercel.app`); không khớp domain → browser từ chối.
- Cần thiết bị có authenticator (Touch ID / Windows Hello / FIDO2 key).

## ⚠️ Known risk (đã ghi trong docs/features/nangcap24)
- `FinishSignAsync` hiện **MVP: accept signature** — `IsVerified=true` khi credential active, **CHƯA verify chữ ký ECDSA/RSA thật** (COSE key). KHÔNG dùng làm chữ ký pháp lý cho tới khi wire `Fido2NetLib`. Khi sửa luồng phải giữ/đánh dấu rõ điểm này.
- `SignatureCounter` chưa kiểm tra (replay/clone risk).

## Pitfalls
- Quên convert base64url ↔ ArrayBuffer → browser API throw.
- Test E2E: WebAuthn KHÔNG chạy headless → đánh dấu `skip` hoặc test bằng virtual authenticator (CDP). Xem `his-test-e2e`.
- Credential revoke rồi vẫn gửi sign → `isVerified:false, error="...thu hồi"` (xử lý UI).

## Reference
- `references/webauthn-flow.ts` — mẫu register/sign 2 pha + base64url↔buffer helper

## When to update
- Khi wire verify chữ ký thật (Fido2NetLib) → bỏ cảnh báo MVP.
- Khi đổi endpoint/DTO `/api/biometric`.
