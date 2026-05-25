# Prompt Templates — HIS

Câu lệnh mẫu cho developer. Điền `[...]` rồi prompt — Claude tự kích hoạt skill phù hợp theo `SKILL-MAP.md`
(luôn áp nguyên tắc tầng **CORE** trước, rồi hiện thực bằng skill **HIS**). Càng nêu rõ route/field/role
→ match càng chuẩn.

## Backend feature (service + controller + bảng)
```
Thêm phân hệ [tên VN] (NangCap[NN]): service I[Xxx]Service + [Xxx]Service,
controller route /api/[xxx], entity [Xxx] field [a:type, b:type], migration bảng + DI.
Role: [Admin/Doctor/...] cho [action].
```
→ core: architecture-follow, types-contract, reusable-code · his: backend-module-scaffold, sql-table-migration, anti-pattern

## Frontend v2 page
```
Tạo page v2 [tên] tại /v2/[route] (menu nhóm [clinical/finance/...]):
gọi api [getXList], KPI [...], status tabs [...], cột [...], drawer chi tiết [...].
```
→ core: reusable-code, error-loading-state · his: api-client, frontend-page-v2, antd-v6

## API client
```
Thêm api client frontend/src/api/[module].ts cho [GET/POST /xxx] với DTO [XxxDto: field...].
Response [paged {items,totalCount} | mảng].
```
→ core: types-contract · his: api-client

## Migration / bảng
```
Tạo bảng [Xxx] idempotent (audit columns uniqueidentifier), FK tới [Patients/MedicalRecords/Users],
script Data/Scripts/[NN]_[ten].sql.
```
→ core: types-contract · his: sql-table-migration

## Test
```
Viết Cypress smoke page-load cho [routes /v2/...] + API check [endpoints].   (UI/E2E)
Viết test-[module].ps1 gọi [POST /api/...] assert [field].                    (API backend)
```
→ core: testing-architecture, testing-reuse · his: e2e-testing / api-test-powershell

## Form / validate
```
Thêm form [mục đích] field [...] + validate [required/range/format] (FE+BE khớp).
```
→ core: validation-pattern, types-contract · his: frontend-page-v2 / backend-module-scaffold

## Fix UI Antd v6
```
Fix deprecated antd props trong [page/component] → API v6, console-errors.cy.ts 0 lỗi.
```
→ core: error-loading-state, localization-pattern · his: antd-v6

## Deploy
```
Deploy backend [NangCapNN] lên Cloud Run + verify schema-drift = 0 + smoke [endpoint].
```
→ his: deploy

## Tài liệu feature
```
Viết bộ tài liệu docs/features/[feature]/ (6 file) cho phân hệ [tên], dựa source thật.
```
→ his: feature-docs

## Refactor
```
Refactor [module] theo [pattern] — giữ behavior + test xanh, KHÔNG đổi architecture.
```
→ core: refactor, architecture-consistency · his: anti-pattern

## Ký sinh trắc (WebAuthn)
```
Làm chức năng ký [document] bằng vân tay/FaceID cho BN: register + sign 2 pha qua /api/biometric.
```
→ core: types-contract, error-loading-state · his: api-client, webauthn-biometric, anti-pattern

## Cổng standalone (user ngoài)
```
Tạo cổng [tên] cho [user ngoài] đăng nhập riêng tại /[route] (ngoài layout, JWT/role riêng [Role]).
```
→ core: validation-pattern · his: api-client, standalone-portal

## DICOM viewer
```
Thêm/sửa viewer DICOM [MPR/MIP/MinIP/cine/mammo] trong DicomViewer (Cornerstone3D).
```
→ core: reusable-code, error-loading-state · his: dicom-viewer

## Thanh toán / VietQR
```
Làm thanh toán [VietQR/VNPay/MoMo/ZaloPay] cho [BN/viện phí]: tạo QR + confirm + link Receipt.
```
→ core: types-contract, validation-pattern · his: payment-gateway (+ frontend-page-v2 cho UI), anti-pattern

---
**Mẹo:** prompt cụ thể (route/field/role/status) → match chuẩn, ít hỏi lại. Mọi code-gen được
`core-reusable-code` (reuse trước) + `his-qa-anti-pattern` (guardrail) "gác".
**Không có skill phù hợp?** Xem `SKILL-MAP.md` mục (6) — Claude sẽ đề xuất tạo skill mới đúng tầng
(core nếu portable / his nếu riêng HIS) rồi bổ sung vào map để tái dùng.
