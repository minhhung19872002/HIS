# Skill Map — HIS (Hospital Information System)

Bản đồ giúp AI **dựa vào map biết chọn skill nào đáp ứng yêu cầu**. Cấu trúc **2 cấp**:
- **CẤP 1** — 2 nhóm gốc: **A · CORE** (dùng chung, portable, tech-agnostic, `core-*`) và
  **B · PROJECT/HIS** (dành riêng dự án này, bám stack thật, `his-*`).
- **CẤP 2** — sub-tier bên trong mỗi nhóm.

Skill nằm tại `.claude/skills/` (nạp phẳng; tier thể hiện qua **tiền tố tên** + map này).
Tài liệu nằm `docs/` (KHÔNG phải skill).

---

## (0) Quy tắc đặt tên skill (BẮT BUỘC — không hỏi, không tự bịa)

Mọi skill `his-*` phải có **token tầng** ngay sau `his-`: dạng `his-<token>-<tên-mô-tả>` (lowercase-kebab).
Khi tạo skill mới **chọn token theo bảng dưới — KHÔNG hỏi lại, KHÔNG đặt tên tự do**.

| Token | Tầng | Dùng cho |
|---|---|---|
| `fe` | Frontend | page/component React, api client, UI Antd, viewer, biểu mẫu in, portal |
| `be` | Backend | service/controller/entity, cổng ngoài, payment, logic trigger worker |
| `db` | Database | bảng SQL Server, migration, seed |
| `fs` | Fullstack (FE+BE) | tính năng xuyên 2 tầng không tách được (vd SignalR realtime) |
| `ops` | DevOps | deploy, CI/CD, hạ tầng prod |
| `test` | Testing | test runner cụ thể (Cypress/Playwright/PowerShell API) |
| `qa` | Quality/guardrail | anti-pattern, convention, an toàn, patient-safety |
| `doc` | Tài liệu | bộ tài liệu feature |
| `flow` | Điều phối | playbook chuỗi nhiều skill (vd gói NangCapNN) |

Quy tắc:
- `core-*` (portable, tech-agnostic) **KHÔNG** mang token tầng — giữ nguyên `core-<tên>`.
- Skill xuyên tầng → `fs`; nếu phần lớn thuộc 1 tầng thì gán theo tầng trội (vd payment chủ yếu BE → `be`).
- Token mới (ngoài bảng) **chỉ** thêm khi xuất hiện nhóm task thật sự mới, kèm cập nhật bảng này.
- Tên lowercase-kebab; **`name:` frontmatter PHẢI trùng tên thư mục** (xác minh khớp sau khi tạo/đổi tên).

---

## (1) Bảng skill theo TẦNG — tra đúng nhóm rồi chọn

### (1a) ███ NHÓM A · CORE — `core-*` (dùng chung, chọn khi cần nguyên tắc/pattern portable) ███

| Sub-tier | Skill | Mục đích | Chọn khi yêu cầu liên quan |
|---|---|---|---|
| A1 arch/reuse/quality | `core-architecture-follow` | layer boundary + dependency direction + module | thêm/sửa code chạm nhiều layer |
| | `core-reusable-code` | reuse trước khi tạo mới, chống trùng | **mọi** lần tạo file/abstraction |
| | `core-architecture-consistency` | nhất quán structure/naming + scalability | thêm feature theo tiền lệ |
| | `core-refactor` | refactor giữ behavior + clean-code + extract-shared | "refactor / clean up / tách" |
| A2 cross-cutting | `core-types-contract` | contract/type giữa layer (in/out, request/response) | định nghĩa API contract / signature |
| | `core-validation-pattern` | validate FE+BE consistency, không tin client | thêm validate form/payload |
| | `core-error-loading-state` | loading/empty/error/success + feedback | UI có fetch/submit |
| | `core-localization-pattern` | không hardcode text, key/namespace/fallback | thêm text hiển thị / đa ngôn ngữ |
| A3 core-testing | `core-testing-architecture` | chọn level unit/integration/e2e/contract; deterministic/isolated | mọi việc viết test (lấy nguyên tắc) |
| | `core-testing-reuse` | reuse helper/fixture/builder/mock + regression | viết test, sau bug fix |

### (1b) ███ NHÓM B · PROJECT/HIS — `his-*` (dành riêng dự án này, chọn khi đụng stack/nghiệp vụ thật) ███

| Sub-tier | Skill | Mục đích | Chọn khi yêu cầu liên quan |
|---|---|---|---|
| B1 frontend | `his-fe-page-v2` | page v2 (`_v2kit` + `ab-*`, route `/v2/*`, menu) | tạo/sửa màn hình v2 |
| | `his-fe-api-client` | axios `api/*.ts` + DTO interface | gọi backend từ FE |
| | `his-fe-antd-v6` | UI Antd v6 page v1 + tránh deprecated | sửa page v1 / lỗi antd |
| | `his-fe-webauthn-biometric` | ký sinh trắc WebAuthn (register/sign 2 pha) | vân tay/FaceID, `/api/biometric`, navigator.credentials |
| | `his-fe-standalone-portal` | cổng standalone ngoài layout (login + JWT riêng) | cổng thanh tra BHXH, login riêng cho user ngoài |
| | `his-fe-dicom-viewer` | viewer Cornerstone3D (MPR/MIP/MinIP/Cine/Mammo) | sửa DicomViewer/CornerstoneViewer, projection, cine |
| | `his-fe-emr-print-form` | biểu mẫu in y tế VN (MS xx/BV, DD xx, CLS, BA chuyên khoa) | thêm phiếu/biểu mẫu in, *Print component, PrintTemplateRenderer |
| | `his-fs-realtime-signalr` | SignalR hub + client (reconnect + polling fallback) | realtime/đẩy thông báo, chat, hàng đợi live |
| B2 backend | `his-be-module-scaffold` | Entity/DTO/Service/Controller + DI | thêm phân hệ/service/controller |
| | `his-db-migration` | bảng SQL Server, script `NN_*.sql` idempotent | tạo/sửa/seed bảng |
| | `his-be-payment-gateway` | VietQR/VNPay/MoMo/ZaloPay + bank confirm + Receipt | thanh toán, QR EMVCo, IPN, `/api/payment/*` |
| | `his-be-external-gateway` | cổng ngoài HttpClient + MockMode + retry + config store | tích hợp cổng QG/BHXH/Zalo/DQGVN/FHIR/SMS |
| | `his-be-background-worker` | BackgroundService + scope + interval + idempotent | worker/job nền, retry worker, worklist scanner |
| B0 điều phối | `his-flow-nangcap-package` | playbook gói NangCapNN end-to-end (chain các his-*) | làm cả gói thầu/NangCapNN, đối chiếu PDF→gap→deploy |
| B3 devops | `his-ops-deploy` | Cloud Run (thủ công) + Vercel (auto) + verify | deploy prod |
| B4 system-testing | `his-test-api-powershell` | test API PowerShell `localhost:5106` | test API backend |
| | `his-test-e2e` | Cypress + Playwright (convention HIS) | test UI/E2E |
| B6 quality | `his-qa-anti-pattern` | guardrail HIS (DI→500, intercept, hardcode, patient-safety, audit) | **mọi** code-gen (kèm) |
| | `his-doc-feature` | bộ tài liệu `docs/features/<feature>/` | viết tài liệu phân hệ |

> B5 domain: biểu mẫu in (`his-fe-emr-print-form`) đã tách riêng. Tạo thêm skill domain khi 1 module HIS có nghiệp vụ đặc thù lặp lại (xem (6) Fallback).

---

## (2) Bảng tra: prompt → skills (CORE trước → HIS sau, kèm THỨ TỰ + PATH)

| Khi developer prompt | Skills (core → his, đúng thứ tự) | File/đường dẫn chạm tới |
|---|---|---|
| "thêm phân hệ backend [X]" | `core-architecture-follow` → `core-types-contract` → `core-reusable-code` → `his-be-module-scaffold` → `his-db-migration` → `his-qa-anti-pattern` | `HIS.Core/Entities`, `HIS.Application`, `HIS.Infrastructure/Services` + `DependencyInjection.cs`, `Data/Scripts/NN_*.sql`, `HIS.API/Controllers` |
| "tạo page v2 [X]" | `core-reusable-code` → `core-error-loading-state` → `his-fe-api-client` → `his-fe-page-v2` → `his-fe-antd-v6`(nếu cần) → `his-qa-anti-pattern` | `frontend/src/api/*.ts`, `frontend/src/pages-v2/*.tsx`, `App.tsx`, `TerminalLayout.tsx` |
| "thêm api client [X]" | `core-types-contract` → `his-fe-api-client` | `frontend/src/api/*.ts` |
| "viết test UI/E2E [X]" | `core-testing-architecture` → `core-testing-reuse` → `his-test-e2e` | `frontend/cypress/e2e/`, `frontend/e2e/` |
| "viết test API backend [X]" | `core-testing-architecture` → `core-testing-reuse` → `his-test-api-powershell` | `test-*.ps1` |
| "thêm validate / form [X]" | `core-validation-pattern` → `core-types-contract` → (`his-fe-page-v2`/`his-be-module-scaffold`) | FE form / BE service |
| "tạo/sửa bảng [X]" | `core-types-contract` → `his-db-migration` | `Data/Scripts/NN_*.sql` |
| "deploy [X]" | `his-ops-deploy` | `cloudbuild.yaml`, `gcloud`, `/health/schema-drift` |
| "viết tài liệu [feature]" | `his-doc-feature` | `docs/features/<feature>/` |
| "refactor [X]" | `core-refactor` → `core-architecture-consistency` → `his-qa-anti-pattern` | (module liên quan) |
| "ký sinh trắc / vân tay BN [X]" | `core-types-contract` → `core-error-loading-state` → `his-fe-api-client` → `his-fe-webauthn-biometric` → `his-qa-anti-pattern` | `api/nangcap24.ts`, `pages-v2/BiometricEnrollment.tsx`, `/api/biometric` |
| "cổng đăng nhập riêng cho [user ngoài]" | `core-validation-pattern` → `his-fe-api-client` → `his-fe-standalone-portal` | route ngoài layout `App.tsx`, `pages-v2/*Portal.tsx` |
| "viewer DICOM / MPR / MIP / cine [X]" | `core-reusable-code` → `core-error-loading-state` → `his-fe-dicom-viewer` | `components/*Viewer.tsx`, `pages/DicomViewer.tsx` |
| "thanh toán / QR VietQR / confirm bank [X]" | `core-types-contract` → `core-validation-pattern` → `his-be-payment-gateway` (+ `his-fe-page-v2` cho UI) | `PaymentGatewayService*.cs`, `/api/payment/*`, `pages-v2/BankPayments.tsx` |
| "tích hợp cổng QG/BHXH/Zalo/SMS/FHIR [X]" | `core-types-contract` → `his-be-external-gateway` (+ `his-be-background-worker` cho retry) → `his-qa-anti-pattern` | `HIS.Infrastructure/Services/External/*`, `DependencyInjection.cs`, appsettings (MockMode + env) |
| "worker/job nền / tự động quét-gửi lại [X]" | `core-architecture-follow` → `his-be-background-worker` → `his-qa-anti-pattern` | `HIS.Infrastructure/Services/Workers/*`, `AddHostedService` trong `DependencyInjection.cs` |
| "realtime / đẩy thông báo / chat / hàng đợi live [X]" | `core-error-loading-state` → `his-fe-api-client` → `his-fs-realtime-signalr` | `HIS.API/Hubs/*`, `Program.cs`, `contexts/NotificationContext.tsx`, `vite.config.ts` |
| "thêm biểu mẫu / phiếu in [X]" | `core-reusable-code` → `his-fe-emr-print-form` → `his-qa-anti-pattern` | `components/*PrintTemplates.tsx`, `PrintTemplateRenderer.tsx`, `constants/hospital.ts` |
| "làm cả gói NangCapNN / đối chiếu PDF gói thầu [X]" | `his-flow-nangcap-package` (điều phối → chain tất cả his-* theo gap) | PDF `docs/requirements/`, `NangCap_PhanTich.md`, `docs/features/nangcapNN/` |
| BẤT KỲ code-gen | luôn kèm `core-reusable-code` + `his-qa-anti-pattern` | — |

---

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

---

## (4) Dependency map (his → core)

```
his-fe-page-v2      → core-reusable-code, core-error-loading-state, core-architecture-follow
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
his-flow-nangcap-package       → (điều phối) chains: his-be-module-scaffold, his-db-migration, his-fe-api-client, his-fe-page-v2, his-be-external-gateway, his-be-background-worker, his-fs-realtime-signalr, his-fe-emr-print-form, his-doc-feature, his-test-e2e, his-ops-deploy
his-be-module-scaffold → core-architecture-follow, core-types-contract, core-validation-pattern, core-reusable-code
his-db-migration   → core-types-contract
his-test-e2e           → core-testing-architecture, core-testing-reuse
his-test-api-powershell   → core-testing-architecture, core-testing-reuse
his-qa-anti-pattern          → core-refactor, core-architecture-consistency, core-reusable-code
his-doc-feature          → (độc lập)
his-ops-deploy                → (độc lập)
```
Nguyên tắc: `his-*` **kế thừa** nguyên tắc từ `core-*` rồi **hiện thực hoá** theo stack HIS.

---

## (5) Conflict resolution

| Tình huống | Quy tắc |
|---|---|
| Page v1 (Antd) vs v2 (`_v2kit`) | v1 → `his-fe-antd-v6`; v2 → `his-fe-page-v2`. Mặc định feature mới = v2. KHÔNG trộn. |
| Test BE vs E2E | API BE → `his-test-api-powershell`; UI/route/flow → `his-test-e2e`. |
| Migration EF vs SQL script | Luôn SQL script tay (`his-db-migration`) — dự án IGNORE pending model changes. |
| core (portable) vs his (cụ thể) | Nguyên tắc chung ở `core-*`; `his-*` chỉ thêm phần stack-specific + nhắc lại phần liên quan. |
| Trùng "không hardcode / không quên DI" | Nguồn chân lý chung: `his-qa-anti-pattern` (+ `core-*`). |

---

## (6) ★ FALLBACK — khi KHÔNG có skill phù hợp

Nếu yêu cầu **không khớp** skill nào ở (1)/(2): **KHÔNG vội tạo skill mới.** Skill chỉ đáng tạo khi
**tái sử dụng được nhiều lần** — nếu không sẽ phình "skill rác". Chạy quyết định theo thứ tự:

**Bước 1 — Mở rộng skill cũ được không?**
Có skill đã *gần đúng* → **cập nhật/mở rộng skill đó** (thêm case vào SKILL.md / reference) thay vì tạo mới.
Ưu tiên reuse (đúng `core-reusable-code`). Cập nhật xong → chỉnh lại mô tả trong (1a)/(1b)/(2)/(4) nếu cần.

**Bước 2 — Yêu cầu có TÁI SỬ DỤNG NHIỀU LẦN không?** (cổng quyết định)
Tự hỏi: pattern/loại task này còn lặp lại ở các lần sau không?
- **CÓ (đáng đóng gói)** → đề xuất **tạo skill mới**: tên **theo (0) Quy tắc đặt tên** (token tầng đúng,
  KHÔNG hỏi/bịa) · **tầng** (`core-*` nếu portable cho dự án khác / `his-<token>-*` nếu riêng HIS) ·
  mục đích · trigger · dependency (`his→core`).
  **Hỏi user duyệt** → tạo theo SKILL FORMAT (`type: project`, progressive disclosure) → **bổ sung vào
  (1a)/(1b) + (2) + (4)** của map này → tái dùng lần sau.
- **KHÔNG (one-off, không lặp lại)** → **ĐỪNG tạo skill.** Làm trực tiếp task đó bằng các `core-*` +
  cách chung, và **nói rõ**: "task một lần, không cần skill mới".

**Luôn:** KHÔNG tự "làm bừa" sai convention; KHÔNG nhét đại vào skill sai mục đích.

> Skill chỉ sinh ra khi **đáng tái dùng nhiều lần** (hoặc mở rộng skill cũ) → SKILL-MAP lớn dần đúng,
> không phình skill dùng-một-lần.

---

## Ghi chú vị trí
- Skill: `.claude/skills/<core-* | his-*>/SKILL.md` (+ `references/`, `scripts/`).
- Tài liệu feature: `docs/features/<feature>/` (KHÔNG phải skill).
- Skill CHỈ sống trong `.claude/skills/` — không bao giờ trong `docs/` hay `.ai/`.
