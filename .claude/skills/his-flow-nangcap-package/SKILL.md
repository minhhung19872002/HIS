---
name: his-flow-nangcap-package
description: Use this skill when implementing a whole HIS upgrade package / tender gap-closing (NangCapNN) end-to-end — read the requirement PDF, diff against the codebase, list gaps, implement full-stack, mark the [NN] menu, write the docs set, and deploy. Triggers include "làm gói NangCapNN", "đối chiếu NangCapNN.pdf", "đóng gap gói thầu [BV X]", closing a tender's feature list. This is an ORCHESTRATION playbook that chains the other his-* skills. Do NOT use for a single isolated feature (route directly to the specific his-* skill).
metadata:
  type: project
---

# HIS NangCap Package (gói nâng cấp / gói thầu)

Playbook **điều phối** 1 gói NangCapNN từ đầu đến cuối. Đã lặp 6+ lần (NangCap15/16/19/22/23/24) với
cùng quy trình. Skill này KHÔNG tự làm code — nó **chuỗi các skill khác** đúng thứ tự + giữ convention gói.

## Khi nào dùng
- "Làm gói NangCapNN", đối chiếu PDF gói thầu, đóng toàn bộ gap của 1 bệnh viện/gói.

## Khi nào KHÔNG dùng
- 1 tính năng lẻ → route thẳng skill cụ thể (`his-be-module-scaffold`, `his-fe-page-v2`…).

## Quy trình 7 bước (bám NangCap22/23/24)
1. **Đọc PDF** `docs/requirements/tai-lieu-nang-cap/NangCapNN.pdf` → extract text (script tạm, không commit).
2. **Đối chiếu codebase** → liệt kê GAP (cái đã có vs cần bổ sung). Cập nhật `NangCap_PhanTich.md` (mục PHẦN NN).
3. **Implement từng gap full-stack**, chain skill theo loại:
   - Backend CRUD/nghiệp vụ → `his-be-module-scaffold` + `his-db-migration`
   - Cổng ngoài → `his-be-external-gateway` (+ `his-be-background-worker` cho retry)
   - Realtime → `his-fs-realtime-signalr`
   - Biểu mẫu in → `his-fe-emr-print-form`
   - Cổng login riêng → `his-fe-standalone-portal`; thanh toán → `his-be-payment-gateway`; ký sinh trắc → `his-fe-webauthn-biometric`
   - FE: `his-fe-api-client` (`api/nangcapNN.ts`) → `his-fe-page-v2` (pages-v2) → route `App.tsx` + menu `TerminalLayout`
4. **Đánh dấu menu `[NN]`** trong `TerminalLayout.tsx` (+ `MainLayout.tsx` nếu có bản v1) cho mọi mục thuộc gói.
5. **Bộ tài liệu** `docs/features/nangcapNN/` qua `his-doc-feature` (README + analysis + test-plan + test-guide + workflow-test + summary).
6. **Test**: `frontend/cypress/e2e/nangcapNN-flow.cy.ts` + `frontend/e2e-prod/nangcapNN-functional.spec.ts` (xem `his-test-e2e`).
7. **Deploy** `his-ops-deploy`: Cloud Run thủ công + Vercel auto; verify `/health/schema-drift` = 0.

## Convention đặt tên gói (đồng bộ với các gói cũ)
- Entity: `HIS.Core/Entities/NangCapNNEntities.cs` · DTO: `HIS.Application/DTOs/NangCapNN/` · Service:
  `INangCapNNServices.cs` + `NangCapNNServices.cs` · Controller: `NangCapNNControllers.cs`
- SQL: `HIS.Infrastructure/Data/Scripts/NN_nangcapNN_*.sql` (idempotent). ⚠️ **Kiểm tra trùng số script** —
  đã từng có `44_nangcap23_*` trùng `44_nangcap24` (xem `his-db-migration`).
- FE: `frontend/src/api/nangcapNN.ts` + `frontend/src/pages-v2/*.tsx`
- ⚠️ **Tránh route trùng** controller cũ (vd dùng `national-prescription-gateway` thay vì `national-prescription`).

## Pitfalls (đã dính)
- **Vercel auto FE, Cloud Run KHÔNG auto BE** → push xong nhớ deploy BE thủ công, nếu không endpoint mới 404
  (đây là lý do từng có "FE live, ghi work-log nhưng API 404"). Xem `his-ops-deploy`.
- **EF shadow FK / Guid↔String** khi thêm entity mới → Fluent API + whitelist (xem `his-db-migration`).
- **MockMode cổng**: prod để `false`, key/token điền qua env, **không commit secret** (`his-qa-anti-pattern`).

## Checklist gói
- [ ] PDF đọc + GAP liệt kê trong `NangCap_PhanTich.md`
- [ ] Mỗi gap full-stack xong, `dotnet build` + `npm run build` 0 error
- [ ] Menu `[NN]` đánh dấu đủ
- [ ] Bộ docs `docs/features/nangcapNN/` + test cypress/playwright pass
- [ ] Commit message ghi rõ các gap; deploy BE Cloud Run + verify schema-drift=0

## Dependency
Điều phối: `his-be-module-scaffold`, `his-db-migration`, `his-fe-api-client`, `his-fe-page-v2`,
`his-be-external-gateway`, `his-be-background-worker`, `his-fs-realtime-signalr`, `his-fe-emr-print-form`, `his-doc-feature`,
`his-test-e2e`, `his-ops-deploy`, `his-qa-anti-pattern` (xuyên suốt).

## When to update
- Khi quy trình 7 bước hoặc convention đặt tên gói thay đổi.
