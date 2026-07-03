---
name: his-fe-webauthn-biometric
description: Use this skill when building or editing the HIS biometric/WebAuthn signature feature — patients signing EMR documents by fingerprint/FaceID via the browser WebAuthn API. Triggers include register/sign credential flows, `navigator.credentials.create/get`, the `/api/biometric` endpoints, BiometricEnrollment page, or RpId/HTTPS issues. Do NOT use for ordinary REST list/detail pages (his-fe-page-v2) or central digital-signature (Pkcs11/USB token).
metadata:
  type: project
---

# HIS WebAuthn Biometric Signature

> TIER: **B · PROJECT/HIS** (system). Depends: `core-types-contract`, `core-error-loading-state`, `his-fe-api-client`.

A skill for **signing medical records by biometrics (WebAuthn FIDO2)** — a patient registers a fingerprint/FaceID then signs a document. A 2-phase flow (begin → browser → finish), quite different from a normal REST page so it needs its own skill.

## When to use
- Adding/editing the credential register flow or the biometric sign flow.
- Touching `navigator.credentials.create()/get()`, the `/api/biometric/*` endpoints, the `BiometricEnrollment` page.
- Fixing a WebAuthn error (RpId, HTTPS, allowCredentials).

## When NOT to use
- A normal list/detail page → `his-fe-page-v2`.
- Central digital signing CKS/USB token (Pkcs11) → that's a different module (digital-signature/central-signing).
- Plain REST calls → `his-fe-api-client`.

## Architecture (NangCap24)
- BE: `BiometricSignatureService` · controller `/api/biometric` · entity `BiometricCredential` + `BiometricSignatureLog`.
- FE: `pages-v2/BiometricEnrollment.tsx` + `api/nangcap24.ts` (object `biometric`).
- The **2-phase** flow:
  - **Register**: `POST /register-begin` (returns `challenge`,`userHandle`,`rpId`,`rpName`) → browser `navigator.credentials.create()` → `POST /register-finish` (sends `credentialId`,`publicKey`,`clientDataJson`,`attestationObject`).
  - **Sign**: `POST /sign-begin` (returns `challenge`,`allowCredentials[]`) → browser `navigator.credentials.get()` → `POST /sign-finish` (sends `signature`,`authenticatorData`,`clientDataJson`).
  - List/revoke: `GET /credentials/{patientId}`, `DELETE /credentials/{id}`.

## Standard process
1. **API client**: add/edit functions in `api/nangcap24.ts` object `biometric` (begin/finish, list, revoke) — per `his-fe-api-client`.
2. **Browser flow**: convert base64url ↔ ArrayBuffer for `challenge`/`credentialId`/`publicKey`/`signature` (WebAuthn uses BufferSource). See `references/webauthn-flow.ts`.
3. **UI**: in `BiometricEnrollment.tsx` — select a patient → register → list credentials (status active/revoked, usageCount) → sign a document → revoke. State/empty/error per `core-error-loading-state`.
4. **Verify**: needs **HTTPS** (prod Vercel/Cloud Run) + an authenticator device. Cannot test via curl/headless → manual.

## MANDATORY conditions
- **HTTPS** (or `localhost`) — WebAuthn doesn't run over `http://<ip>`.
- **RpId** = the domain (e.g. `his-psi.vercel.app`); a domain mismatch → the browser refuses.
- Needs a device with an authenticator (Touch ID / Windows Hello / FIDO2 key).

## ⚠️ Known risk (noted in docs/features/nangcap24)
- `FinishSignAsync` is currently an **MVP: accept signature** — `IsVerified=true` when the credential is active, **NOT yet verifying the real ECDSA/RSA signature** (COSE key). Do NOT use it as a legal signature until `Fido2NetLib` is wired. When editing the flow, keep/clearly mark this point.
- `SignatureCounter` is not checked yet (replay/clone risk).

## Pitfalls
- Forgetting to convert base64url ↔ ArrayBuffer → the browser API throws.
- E2E test: WebAuthn does NOT run headless → mark it `skip` or test with a virtual authenticator (CDP). See `his-test-e2e`.
- Sending a sign after the credential is revoked → `isVerified:false, error="...revoked"` (handle in the UI).

## Reference
- `references/webauthn-flow.ts` — a 2-phase register/sign sample + base64url↔buffer helper

## When to update
- When wiring real signature verification (Fido2NetLib) → drop the MVP warning.
- When changing the `/api/biometric` endpoint/DTO.
