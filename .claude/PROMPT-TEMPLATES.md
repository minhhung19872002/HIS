# Prompt Templates — HIS

Sample commands for developers. Fill in `[...]` then prompt — Claude auto-activates the right skill per `SKILL-MAP.md` (always apply the **CORE** tier principles first, then implement with the **HIS** skills). The more you specify route/field/role → the better the match. *(The footer uses REAL SKILL NAMES per `SKILL-MAP §0` — greppable.)*

## Backend feature (service + controller + table)
```
Add module [VN name] (NangCap[NN]): service I[Xxx]Service + [Xxx]Service, controller route /api/[xxx], entity [Xxx] fields [a:type, b:type], migration table + DI. Role: [Admin/Doctor/...] for [action].
```
→ `core-architecture-follow` · `core-types-contract` · `core-reusable-code` · `his-be-module-scaffold` · `his-db-migration` · `his-qa-anti-pattern`

## Frontend v2 page
```
Create v2 page [name] at /v2/[route] (menu group [clinical/finance/...]): call api [getXList], KPI [...], status tabs [...], columns [...], detail drawer [...].
```
→ `core-reusable-code` · `core-error-loading-state` · `his-fe-api-client` · `his-fe-page-v2` · `his-fe-antd-v6` · `his-fe-convention`

## API client
```
Add api client frontend/src/api/[module].ts for [GET/POST /xxx] with DTO [XxxDto: field...]. Response [paged {items,totalCount} | array].
```
→ `core-types-contract` · `his-fe-api-client`

## Migration / table
```
Create table [Xxx] idempotent (audit columns uniqueidentifier), FK to [Patients/MedicalRecords/Users], script Data/Scripts/[NN]_[name].sql.   (NN = ls Data/Scripts/ max+1, do NOT hard-code)
```
→ `core-types-contract` · `his-db-migration`

## Test
```
Write a Cypress page-load smoke test for [routes /v2/...] + API check [endpoints].   (UI/E2E)
Write test-[module].ps1 calling [POST /api/...] asserting [field].                     (backend API)
```
→ `core-testing-architecture` · `core-testing-reuse` · `his-test-e2e` / `his-test-api-powershell`

## Form / validate
```
Add a form [purpose] with fields [...] + validate [required/range/format] (FE+BE matching).
```
→ `core-validation-pattern` · `core-types-contract` · `his-fe-page-v2` / `his-be-module-scaffold`

## Fix Antd v6 UI
```
Fix deprecated antd props in [page/component] → v6 API, console-errors.cy.ts 0 errors.
```
→ `core-error-loading-state` · `core-localization-pattern` · `his-fe-antd-v6`

## Deploy
```
Deploy backend [NangCapNN] to Cloud Run + verify schema-drift = 0 + smoke [endpoint].
```
→ `his-ops-deploy`

## Feature documentation
```
Write the docs/features/[feature]/ doc set (6 files) for module [name], based on the real source.
```
→ `his-doc-feature`

## Refactor
```
Refactor [module] per [pattern] — preserve behavior + green tests, do NOT change architecture.
```
→ `core-refactor` · `core-architecture-consistency` · `his-qa-anti-pattern`

## Biometric signing (WebAuthn)
```
Build a sign-[document] feature with fingerprint/FaceID for patients: register + 2-phase sign via /api/biometric.
```
→ `core-types-contract` · `core-error-loading-state` · `his-fe-api-client` · `his-fe-webauthn-biometric` · `his-qa-anti-pattern`

## Standalone portal (external users)
```
Create a [name] portal for [external users] with their own login at /[route] (outside the layout, separate JWT/role [Role]).
```
→ `core-validation-pattern` · `his-fe-api-client` · `his-fe-standalone-portal`

## DICOM viewer
```
Add/edit a DICOM viewer [MPR/MIP/MinIP/cine/mammo] in DicomViewer (Cornerstone3D).
```
→ `core-reusable-code` · `core-error-loading-state` · `his-fe-dicom-viewer`

## Payment / VietQR
```
Build [VietQR/VNPay/MoMo/ZaloPay] payment for [patient/hospital fee]: create QR + confirm + link Receipt.
```
→ `core-types-contract` · `core-validation-pattern` · `his-be-payment-gateway` (+ `his-fe-page-v2` for UI) · `his-qa-anti-pattern`

---
**Tip:** a specific prompt (route/field/role/status) → a precise match, fewer follow-up questions. Every code-gen is "guarded" by `core-reusable-code` (reuse first) + `his-qa-anti-pattern` (guardrail).
**No suitable skill?** See `SKILL-MAP.md` section (6) — Claude will propose creating a new skill in the right tier (core if portable / his if HIS-specific) then add it to the map for reuse.
