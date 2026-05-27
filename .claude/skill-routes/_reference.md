# Skill-routes · Tham chiếu sâu (đọc khi cần)

> Phần tra-cứu nặng, tách khỏi SKILL-MAP mỏng để tiết kiệm token. Chỉ đọc khi cần playbook
> end-to-end hoặc dependency map đầy đủ. Routing thường ngày dùng SKILL-MAP + map con theo tầng.

## (3) Sơ đồ "đường đi" step-by-step (mẫu — áp cho task tương tự)

**Task: thêm 1 phân hệ (backend + page v2 + test)**
1. **Trước khi code** — inspect: phân hệ/`*CompleteService` tương tự (`core-reusable-code`); layer + DI hiện có
   (`core-architecture-follow`); page v2 mẫu trong `pages-v2/` + `_v2kit`.
2. **Backend** — `his-be-module-scaffold`: Entity → DTO (`core-types-contract`) → `IXxxService`/`XxxService`
   (validate theo `core-validation-pattern`) → **đăng ký DI** → Controller. Bảng mới → `his-db-migration`
   (script `NN_*.sql` idempotent). Build: `dotnet build`.
3. **Frontend** — `his-fe-api-client` (`api/x.ts` + DTO) → `his-fe-page-v2` (page dùng `_v2kit`, state theo
   `core-error-loading-state`, text theo `core-localization-pattern`) → route `App.tsx` + menu `TerminalLayout`.
   Build: `npm run build`.
4. **Test** — `core-testing-architecture` chọn level → `his-test-e2e` (smoke page-load + flow) /
   `his-test-api-powershell` (API). Reuse fixture theo `core-testing-reuse`.
5. **Guardrail xuyên suốt** — `his-qa-anti-pattern` (không quên DI, không hardcode, giữ audit/patient-safety).
6. **Deploy** — `his-ops-deploy` (Cloud Run thủ công + verify schema-drift; nhớ Vercel auto FE).

## (4) Dependency map (his → core)

```
his-fe-convention            → core-reusable-code, core-architecture-follow, core-architecture-consistency, core-refactor, his-qa-anti-pattern (★ kèm MỌI code-gen/refactor FE)
his-fe-page-v2               → core-reusable-code, core-error-loading-state, core-architecture-follow, his-fe-convention
his-fe-api-client            → core-types-contract
his-fe-antd-v6               → core-error-loading-state, core-localization-pattern
his-fe-webauthn-biometric    → core-types-contract, core-error-loading-state, his-fe-api-client
his-fe-standalone-portal     → core-error-loading-state, core-validation-pattern, his-fe-api-client
his-fe-dicom-viewer          → core-reusable-code, core-error-loading-state
his-be-payment-gateway       → core-types-contract, core-validation-pattern, his-be-module-scaffold, his-qa-anti-pattern
his-be-external-gateway      → core-types-contract, his-be-module-scaffold, his-be-background-worker, his-qa-anti-pattern
his-be-background-worker     → core-architecture-follow, his-qa-anti-pattern
his-fs-realtime-signalr      → core-reusable-code, core-error-loading-state, his-fe-api-client, his-qa-anti-pattern
his-fe-emr-print-form        → core-reusable-code, his-qa-anti-pattern
his-flow-nangcap-package     → (điều phối) chains: his-be-module-scaffold, his-db-migration, his-fe-api-client, his-fe-page-v2, his-be-external-gateway, his-be-background-worker, his-fs-realtime-signalr, his-fe-emr-print-form, his-doc-feature, his-test-e2e, his-ops-deploy
his-be-module-scaffold       → core-architecture-follow, core-types-contract, core-validation-pattern, core-reusable-code
his-db-migration             → core-types-contract
his-test-e2e                 → core-testing-architecture, core-testing-reuse
his-test-api-powershell      → core-testing-architecture, core-testing-reuse
his-qa-anti-pattern          → core-refactor, core-architecture-consistency, core-reusable-code
his-doc-feature              → (độc lập)
his-ops-deploy               → (độc lập)
core-skill-authoring         → (governance, độc lập) — chi phối cách viết MỌI skill (core + his)
core-requirement-clarify     → (discipline pre-flight #1, độc lập) — dùng tool AskUserQuestion
core-verify-before-assert    → (discipline pre-flight #2, độc lập)
core-impact-analysis         → core-verify-before-assert, core-architecture-follow (pre-flight #3)
core-minimal-change          → core-reusable-code, core-refactor (lúc implement)
core-clean-code              → core-reusable-code, core-minimal-change, core-refactor, core-types-contract (★ kèm MỌI code-gen FE+BE — clean code mức hàm/câu lệnh)
core-execution-output        → core-verify-before-assert, his-qa-anti-pattern (luôn bật khi báo cáo kết quả)
```
Nguyên tắc: `his-*` **kế thừa** nguyên tắc từ `core-*` rồi **hiện thực hoá** theo stack HIS.

**Pipeline PRE-FLIGHT (mọi task code, chạy trước khi viết):**
`core-requirement-clarify` → `core-verify-before-assert` → `core-impact-analysis` → viết theo `core-minimal-change`
(luôn kèm `core-reusable-code` + `core-clean-code` + `his-qa-anti-pattern`).

## Ghi chú vị trí
- Skill: `.claude/skills/<core-* | his-*>/SKILL.md` (+ `references/`, `scripts/`).
- Map con routing theo tầng: `.claude/skill-routes/{fe,be,test,ops-doc}.md` + `_reference.md` (file này).
- Tài liệu feature: `docs/features/<feature>/` (KHÔNG phải skill).
- Skill CHỈ sống trong `.claude/skills/` — không bao giờ trong `docs/` hay `.ai/`.
