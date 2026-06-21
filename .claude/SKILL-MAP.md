# Skill Map — HIS (router mỏng)

Bản đồ ROUTER: chọn skill nào cho yêu cầu. **Mô tả đầy đủ từng skill đã được Claude tự nạp qua
`description`** (danh sách available skills) → map này KHÔNG lặp lại mô tả, chỉ giữ **routing + governance**.

**★ CỬA VÀO DUY NHẤT (mọi input bắt đầu từ đây → đi hết 1 quy trình):**
```
Input ─► [MAP] SKILL-MAP.md (chọn skill) ─► workflow/workflow.md (chọn flow/pipeline + state-store)
        ─► chạy pipeline 5 chặng (Router→Planner→Worker→Reviewer→Finalizer) ─► Output/DONE
```
- **SKILL-MAP** = *làm bằng skill nào* (routing). **`workflow/workflow.md`** = *chạy theo flow/pipeline nào
  + agent ghi gì vào state-store*. Hai cái bổ trợ, KHÔNG thay nhau.
- Task **không trivial** PHẢI đi hết pipeline ([`workflow/workflow.md`](workflow/workflow.md)) + dùng
  state-store ([`workflow/task.md`](workflow/task.md)); chỉ `DONE` khi qua [`workflow/checklist.md`](workflow/checklist.md).
- Quy ước branch/commit/PR/review: [`workflow/project-rules.md`](workflow/project-rules.md) · Quyết định
  kiến trúc: [`workflow/ai-memory.md`](workflow/ai-memory.md).
- **Vận hành phiên** (đọc gì đầu phiên · chọn model · khi-nào plan-mode · dọn context `/compact`·`/clear`·`/rewind`·`/context` ·
  handoff giữ STATUS ngắn): [`workflow/session-ops.md`](workflow/session-ops.md).
- **Task "rà soát / đối chiếu tài liệu / gap analysis / đã-đủ-chưa / backlog từ `docs/requirements/**`"**
  → BẮT BUỘC theo [`workflow/requirement-coverage.md`](workflow/requirement-coverage.md): source-manifest
  trước · đọc PDF gốc nếu `.md` hụt · enumerate đủ (không tóm tắt) · phương châm **parity-đối-thủ**
  (đối thủ-có→bắt buộc; không-có-không-cần→KHÔNG tạo) · dedup · **completeness-gate** (KHÔNG nói "đủ" khi
  chưa phủ 100% nguồn). Chống over-confidence/sót.

**Cách dùng (2 bước, tiết kiệm token):**
1. Đọc file này (governance + index + dispatch).
2. Theo dispatch (2) → đọc **đúng 1 map con** trong `.claude/skill-routes/` cho tầng của task. Chỉ mở
   `skill-routes/_reference.md` khi cần playbook end-to-end / dependency map đầy đủ.

Cấu trúc **2 cấp**: **A · CORE** (`core-*`, portable, tech-agnostic) và **B · PROJECT/HIS** (`his-*`, bám stack).
Skill nằm ở `.claude/skills/` (**chỉ `SKILL.md` cấp 1 auto-nạp qua description**; nội dung `references/` + `scripts/` KHÔNG tự nạp — phải Read khi skill chỉ định, progressive disclosure). Tài liệu ở `docs/` (KHÔNG phải skill).

> **Mục lục mục** (đọc theo logic, không theo thứ tự dòng): **(0)** đặt-tên-skill · **(0a)** vị-trí-file · **(0b)** P0/P1/P2 (rule lõi nhất) · **(0c)** git-ops · **(1)** index skill · **(2)** dispatch · **(5)** conflict-resolution+tiebreaker · **(6)** fallback · **(7)** split. **Mục (3) playbook + (4) dependency-map** nằm ở `skill-routes/_reference.md`.

---

## (0a) ★ VỊ TRÍ FILE BÁO CÁO / KẾ HOẠCH / HANDOFF (BẮT BUỘC)

**Mọi file báo cáo, plan, handoff, audit, roadmap** trong dự án PHẢI lưu tại **`docs/workspace-docs/`** — KHÔNG đặt ở root, KHÔNG đặt rải rác trong `frontend/` hay `backend/`.

| Loại file | Convention naming | Skill liên quan |
|---|---|---|
| Lịch tech-debt evergreen | `docs/workspace-docs/20-backlog/tech-debt-roadmap.md` | `his-tech-debt-workflow` Rule 2 |
| Audit số liệu rule compliance | `docs/workspace-docs/10-assessment/rule-compliance-audit.md` | `his-tech-debt-workflow` Rule 3 |
| Session handoff cuối phiên dài | `docs/workspace-docs/90-archive/handoffs/session-YYYY-MM-DD-handoff.md` (suffix `-AM`/`-PM` nếu 2 phiên/ngày) | `his-tech-debt-workflow` Rule 10 |
| Đánh giá module/feature | `docs/workspace-docs/10-assessment/danh-gia-<topic>.md` | `his-doc-feature` (nếu là feature doc set chính thức → đặt `docs/features/<feature>/`) |
| Phân tích NangCapNN | `docs/workspace-docs/NangCap_<NN>_PhanTich.md` HOẶC `docs/requirements/` | `his-flow-nangcap-package` |

**KHÔNG được:**
- Tạo `*.md` plan/report ở root project (`/PLAN.md`, `/REPORT.md`)
- Tạo trong `frontend/` hay `backend/` (đó là code dir)
- Tạo dạng `.txt` hay `.docx` — luôn dùng `.md` markdown
- Bỏ qua cross-ref (mọi handoff phải link đến `20-backlog/tech-debt-roadmap.md` + `10-assessment/rule-compliance-audit.md` + skill liên quan)

**Khi nào tạo file mới vs update file cũ:**
- Lịch evergreen (roadmap/audit) → UPDATE file cũ (không tạo bản v2)
- Snapshot phiên cụ thể (handoff/work-log) → TẠO file mới với date suffix
- Đánh giá 1 lần (feature gap analysis) → TẠO file mới, đặt tên rõ ràng

**Subfolder khi nhóm file dài/nhiều:**
- `docs/workspace-docs/20-backlog/items/plan-<ID>-<topic>.md` cho plan chi tiết từng task tech-debt (T1/T4/T5/T6/K1-K5) — mỗi plan có pre-requisite + verify command + steps + rollback + estimate
- `docs/workspace-docs/90-archive/handoffs/session-YYYY-MM-DD.md` nếu có nhiều handoff (>5 file)
- KHÔNG tạo subfolder cho file đơn lẻ — chỉ khi >3 file cùng loại

User explicit 2026-05-30: "mỗi lần viết báo cáo hoặc lập kế hoạch cần phải viết vào đây ghi nhớ".

---

## (0c) ★ GIT OPS — TUYỆT ĐỐI KHÔNG TỰ commit/push (BẮT BUỘC)

User explicit 2026-05-30 (đã reprimanded 3+ lần):
> "sao tự đẩy code lên suốt thế. cập nhật trong skill-skillmap hay đâu đó để biết
> khi continue thì làm theo lịch đã lên sẵn mà không push code"

> "tuyệt đối không đẩy code và đặc biệt là không đẩy code trong thư mục worspace-doc"

**Nguyên-tắc-lõi** (★ **bảng đầy đủ + edge-case + ngưỡng = nguồn chân lý** [`workflow/project-rules.md`](workflow/project-rules.md) §2-4 — KHÔNG lặp ở đây, chống drift):
- "continue / tiếp tục / làm tiếp" / "mọi việc còn lại giao cho bạn" = **CHỈ** code-change + build-verify + report → **KHÔNG** `git add`/`commit`/`push`.
- Chỉ keyword explicit **lượt-hiện-tại** mới mở khoá: "commit" → commit LOCAL (KHÔNG push); "push / đẩy code" → mới `git push`. Lượt-trước-cho-phép KHÔNG nới sang lượt-sau.
- workspace-docs commit + push **bình thường** (quy tắc never-push đã **GỠ** 2026-06-13).

Cross-ref memory: `feedback_no-commit-push-without-permission.md` · `feedback_continue-no-git-ops.md`
*(đã gỡ `feedback_workspace-docs-never-push.md` — memory này đã xoá + rule đã đảo ngược 2026-06-13.)*

---

## (0) Quy tắc đặt tên skill (BẮT BUỘC — không hỏi, không tự bịa)

Mọi skill `his-*` phải có **token tầng** ngay sau `his-`: `his-<token>-<tên-mô-tả>` (lowercase-kebab).
Tạo skill mới **chọn token theo bảng — KHÔNG hỏi lại, KHÔNG đặt tên tự do**.

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
- **Frontmatter chuẩn (Agent Skills spec):** chỉ `name` + `description` (bắt buộc) + tùy chọn
  `metadata` / `allowed-tools`. Field tự định nghĩa (vd `type: project`) PHẢI nằm trong `metadata:`,
  KHÔNG đặt ở cấp cao nhất. `description` ≤ 1024 ký tự, ngôi thứ 3, giàu trigger + `Do NOT use`.
  Chi tiết cách viết frontmatter/description/body + template → skill **`core-skill-authoring`**.

---

## (0b) ★ PHÂN TẦNG ƯU TIÊN RULE — P0 / P1 / P2 (mọi session PHẢI theo)

Khi generate/refactor code, áp rule theo mức. **P0 = tuyệt đối không vi phạm · P1 = bắt buộc · P2 = khuyến nghị (đừng biến thành cớ over-engineer).**

### 🔴 P0 — TUYỆT ĐỐI (vi phạm = mất an toàn BN / hỏng runtime / lộ bảo mật / báo sai sự thật)
1. **Patient safety**: giữ check tương tác thuốc/dị ứng/chống chỉ định; mapping Patient↔MedicalRecord↔Order đúng (`his-qa` #20-22).
2. **🔝 KHÔNG ẢO TƯỞNG / BỊA ĐẶT (P0 cao nhất)**: TUYỆT ĐỐI không suy diễn/giả định/giả tạo/tự nghĩ ra; KHÔNG phát minh file/hàm/endpoint/field/cột DB/prop/config/cấu-trúc-logic/luồng-dữ-liệu **không tồn tại**. Phải Read/Grep verify trong code thật mới khẳng định; chưa chắc → ghi "giả định" hoặc DỪNG hỏi, không trình bày phỏng đoán như sự thật (`core-verify-before-assert`, `his-qa` P0 đầu file).
3. **BUILD-GATE**: thêm/sửa/xoá code → build sạch tầng đã đụng (FE `npm run build` EXIT 0 · BE `dotnet build` 0 errors) MỚI báo xong (`his-qa` #27). Không claim success khi chưa verify.
4. **Đăng ký DI** service/controller mới (quên = 500) (`his-qa` #1).
5. **KHÔNG hardcode** credentials/secret/connection string/token (`his-qa` #18); tên BV/URL → constants/env (#16-17).
6. **Audit & privacy HSBA**: giữ audit log mutation; `CreatedBy` user thật (≠ `Guid.Empty`); role-guard hồ sơ (`his-qa` #23-26).
7. **Validate ở BE** (không tin client) (`core-validation-pattern`).
8. **ĐẶT FILE đúng thư mục — KHÔNG ở root**; thiếu thư mục → đề xuất user tạo (`his-qa` #28-29).

### 🟠 P1 — BẮT BUỘC (kiến trúc & chất lượng cốt lõi — giữ codebase maintainable/scalable)
9. **REUSE-FIRST** (FE+BE): tìm code/thư mục đã có → dùng lại/mở rộng, không tạo trùng (`core-reusable-code`).
10. **SELF-REVIEW 9 điểm** (BE+FE) trước khi báo (`his-qa` #30).
11. **Tách layer / separation of concerns**: UI · service(`api/*`) · state · validation · mapper · constants; KHÔNG trộn business/axios vào component render (`his-fe-convention` §2, §8).
12. **FE ANTD-FIRST + config-driven**: ưu tiên Antd v6/`_v2kit`, options dạng JSON; KHÔNG HTML/CSS thuần khi không cần (`his-fe-convention` §5).
13. **Naming convention** đúng + theo domain (`his-fe-convention` §1).
14. **Refactor an toàn**: backward-compat · preserve behavior · migrate dần · KHÔNG replace cơ học/mass-migrate mù · impact-analysis trước khi sửa code dùng chung (`core-refactor`, `core-impact-analysis`, `his-fe-convention` §6).
15. **Giữ stack — KHÔNG redesign/rewrite**: cấm CQRS/MediatR/Minimal-API/Next.js/Tailwind-first; SQL script tay idempotent (KHÔNG `ef migrations` auto) (`his-qa` #2-4).
16. **Security/permission render** + route guard + không hardcode role (`his-fe-convention` §9).
17. **Error/loading/empty** đầy đủ + chuẩn hoá lỗi API (`core-error-loading-state`, `his-fe-convention` §10).

### 🟡 P2 — KHUYẾN NGHỊ (clean-code & tinh chỉnh — áp khi hợp lý, KHÔNG over-engineer)
18. Clean-code mức hàm: SRP, guard clause, ít tham số, magic-value→const, immutability (`core-clean-code`).
19. Performance: lazy/code-split, `useMemo`/memo **đúng chỗ** (đo trước), debounce/throttle, virtualize bảng lớn (`his-fe-performance`) — KHÔNG tối ưu non.
20. a11y/WCAG cho màn hình lâm sàng (`core-accessibility-pattern`).
21. DRY theo **rule-of-three** — tránh abstraction non; YAGNI (`core-minimal-change`).

> ⚠️ **Chống over-engineering (HIS enterprise thực tế):** P2 KHÔNG được dùng làm cớ để thêm layer/abstraction
> không cần. Dự án dùng **Controller+Service / React+Antd+`_v2kit` / context+local+refetch** — KHÔNG Redux/
> normalized-store, KHÔNG DDD nặng (aggregate/value-object/repo-per-aggregate), KHÔNG CQRS. Khi phân vân giữa
> "đúng pattern lý thuyết" và "khớp codebase hiện tại" → **theo codebase hiện tại** (`core-architecture-consistency`).

---

## (1) Index skill (tên + tầng) — "chọn khi" của HIS xem map con

### NHÓM A · CORE (`core-*`) — áp đầu mọi chuỗi, KHÔNG token tầng

| Sub-tier | Skill | Chọn khi yêu cầu liên quan |
|---|---|---|
| A0 governance | `core-skill-authoring` | tạo/sửa/review skill `.claude/skills/*/SKILL.md` |
| A-discipline (pre-flight) | `core-prod-change-discipline` | ★ **umbrella Tech-Lead** cho thay đổi hệ Production — bọc vòng đời (clarify→analyze→root-cause→blast-radius→minimal→**≥3 phương án**→scope→tech-debt→**self-critique**→**gate lint+test**→**báo cáo 7 phần**→thứ tự ưu tiên); LINK các skill dưới |
| | `core-requirement-clarify` | hiểu đúng yêu cầu; STOP-and-ask vs proceed (đầu MỌI task) |
| | `core-verify-before-assert` | chống ảo tưởng; verify file/symbol/endpoint/field trước khi khẳng định |
| | `core-impact-analysis` | bản đồ tác động (callers/contract/test/migration) trước khi sửa code dùng chung |
| | `core-minimal-change` | YAGNI; thay đổi nhỏ nhất đúng, không over-engineer, không sửa ngoài scope |
| | `core-code-change-workflow` | **workflow tổng cho MỌI thay đổi code** (add/modify/delete) — pre-flight + file-allow-list + fail criteria + rollback; thực chiến cho FE/BE/DB/API/test/doc |
| | `core-execution-output` | báo cáo kết quả chạy lệnh: ngắn gọn mặc định, tự bung khi lỗi, luôn nêu thao tác phá huỷ |
| A1 arch/reuse | `core-architecture-follow` | code chạm nhiều layer |
| | `core-reusable-code` | **mọi** lần tạo file/abstraction (reuse trước khi tạo) |
| | `core-clean-code` | **mọi** code-gen/refactor — clean code mức hàm/câu lệnh (SRP, guard clause, magic value, immutability, async hygiene, dễ bảo trì/nâng cấp) |
| | `core-architecture-consistency` | thêm feature theo tiền lệ |
| | `core-refactor` | "refactor / clean up / tách" giữ behavior |
| | `core-codebase-map-tooling` | điều hướng codebase nhanh (tìm hàm/lớp/symbol "ở đâu / ai gọi") bằng index **ctags** (`tags`) / LSP-MCP — ít token; onboard repo lạ |
| A2 cross-cutting | `core-types-contract` | định nghĩa API contract / signature |
| | `core-validation-pattern` | validate form/payload (FE+BE consistency) |
| | `core-error-loading-state` | UI có fetch/submit (loading/empty/error/success) |
| | `core-accessibility-pattern` | UI cần a11y/WCAG (keyboard, focus, ARIA, tương phản, nhãn) |
| | `core-ui-aesthetics` | UI cần **có gu thẩm mỹ / bớt generic / pro hơn** (spacing/typo/màu/phân cấp/tiết chế) — KHÔNG hại UX; portable mọi dự án |
| | `core-ui-ux-audit` | **AUDIT UX/UI toàn hệ thống** (light↔dark, đồng bộ, lạc-hệ, hardcode-vs-token, reuse/scale) → **plan + task TRƯỚC**, fix root-first SAU; audit-first, KHÔNG sửa khi chưa audit xong. Scope-able (1 module/full), token-heavy |
| | `core-localization-pattern` | thêm text hiển thị / đa ngôn ngữ |
| A3 testing | `core-testing-architecture` | chọn level unit/integration/e2e/contract |
| | `core-testing-reuse` | reuse helper/fixture/mock + regression |

### NHÓM B · HIS (`his-*`) — index theo tầng, chi tiết "chọn khi" + chuỗi prompt ở map con

| Tầng | Skill | Map con (đọc khi task thuộc tầng) |
|---|---|---|
| FE | `his-fe-convention` (★ guardrail convention/kiến trúc — kèm MỌI code-gen/refactor FE), `his-fe-library-policy` (★ chọn/tích hợp thư viện đúng lúc — kèm MỌI code-gen FE), `his-fe-page-v2`, `his-fe-api-client`, `his-fe-antd-v6`, `his-fe-webauthn-biometric`, `his-fe-standalone-portal`, `his-fe-dicom-viewer`, `his-fe-emr-print-form`, `his-fe-performance`, `his-fs-realtime-signalr` | `skill-routes/fe.md` |
| BE/DB | `his-be-module-scaffold`, `his-db-migration`, `his-be-payment-gateway`, `his-be-external-gateway`, `his-be-background-worker`, `his-be-scalability` | `skill-routes/be.md` |
| TEST | `his-test-api-powershell`, `his-test-e2e` | `skill-routes/test.md` |
| OPS/DOC | `his-ops-deploy`, `his-doc-feature` | `skill-routes/ops-doc.md` |
| Điều phối / Guardrail | `his-flow-nangcap-package` (gói NangCapNN), `his-qa-anti-pattern` (kèm **mọi** code-gen) | xem (2) dưới |

---

## (2) Dispatch — task thuộc tầng nào → đọc map con đó

| Loại task (prompt) | Đọc thêm map con | Ghi chú |
|---|---|---|
| page v2 · api client · antd v1 · vân tay/WebAuthn · cổng login riêng · DICOM viewer · biểu mẫu in · realtime/SignalR · **tối ưu hiệu năng/bundle FE** · **a11y/WCAG** | `skill-routes/fe.md` | chuỗi skill + path nằm trong file |
| phân hệ backend · tạo/sửa/seed bảng · thanh toán/QR · cổng QG/BHXH/Zalo/SMS/FHIR · worker nền · **chịu tải/nhiều user đồng thời** | `skill-routes/be.md` | |
| test UI/E2E · test API backend | `skill-routes/test.md` | |
| deploy prod · viết tài liệu phân hệ | `skill-routes/ops-doc.md` | |
| làm **cả gói** NangCapNN / đối chiếu PDF gói thầu | (không cần map con) `his-flow-nangcap-package` điều phối → chain theo gap (đọc `_reference.md` cho playbook) | PDF `docs/requirements/`, `NangCap_PhanTich.md` |
| **điều hướng codebase nhanh / tìm "hàm·lớp·symbol ở đâu / ai gọi" / onboard repo** | (không cần map con) `core-codebase-map-tooling` — grep index `tags` (ctags) hoặc LSP-MCP | cài: `winget install UniversalCtags.Ctags` · regen `scripts/gen-tags.ps1` · `tags` đã gitignore |

**Chuỗi cross-cutting (giữ tại đây — không thuộc 1 tầng):**

| Khi developer prompt | Skills (đúng thứ tự) |
|---|---|
| "thêm validate / form [X]" | `core-validation-pattern` → `core-types-contract` → (`his-fe-page-v2`/`his-be-module-scaffold`) |
| "refactor [X]" | `core-refactor` → `core-architecture-consistency` → `his-qa-anti-pattern` |
| "**xóa nợ kỹ thuật / tech-debt / tách god-file / siết any / dễ → khó**" (bất kỳ task chạy theo `docs/workspace-docs/20-backlog/tech-debt-roadmap.md`) | `his-tech-debt-workflow` (6 rule: progress markers · schedule discipline · report sync · no-commit-without-permission · side-effect audit · defer-on-logic-change) → `core-refactor` → `core-architecture-consistency` → `his-qa-anti-pattern` |
| "tạo / sửa / chuẩn hoá / review skill [X]" | `core-reusable-code` (mở rộng trước khi tạo) → `core-skill-authoring` |
| **PRE-FLIGHT — MỌI task code (chạy TRƯỚC khi viết)** | `core-requirement-clarify` (mơ hồ → hỏi gộp; rõ → ghi giả định) → `core-verify-before-assert` (verify, KHÔNG bịa file/symbol/field) → `core-impact-analysis` (bản đồ tác động nếu sửa code dùng chung) → viết theo `core-minimal-change`. **Khi user nói "thêm/sửa/xóa code", "fix bug", "refactor", "delete file/function", hoặc bất kỳ task code-gen scope cụ thể** → bổ sung `core-code-change-workflow` (workflow tổng add/modify/delete với pre-flight, file-allow-list, fail criteria, rollback). **Thay đổi hệ Production (rủi ro/khó rollback/auth·tiền·schema·contract) hoặc "fix lỗi prod"** → bọc cả vòng đời bằng `core-prod-change-discipline` (root-cause+bằng chứng · **≥3 phương án** ưu/nhược/phức-tạp/rủi-ro/chi-phí · self-critique · **gate lint+typecheck+build+test** · **báo cáo 7 phần** · thứ tự ưu tiên) |
| **BẤT KỲ code-gen / refactor** | luôn kèm `core-reusable-code` + `core-clean-code` + `his-qa-anti-pattern`; **code FE** kèm thêm `his-fe-convention` + `his-fe-library-policy` (cân nhắc + giải thích chọn thư viện cho từng nhóm form/data/state/test… — default stack HIS, lib mới chỉ khi tối ưu rõ + user duyệt); **dựng/sửa UI** kèm `core-ui-aesthetics` (gu thẩm mỹ + tiết chế, chống "AI-slop", KHÔNG hại UX). **(1) REUSE-FIRST (FE+BE):** trước khi tạo file/hàm/component/thư mục → **tìm xem code/thư mục liên quan đã tồn tại chưa** (grep `_v2kit`/`components`/`hooks`/`utils`/`api`/`constants` ở FE; `Services`/`Controllers`/`Entities`/`DTOs` ở BE) → đã có thì **dùng lại / mở rộng**, KHÔNG tạo trùng. **(2) FE ANTD-FIRST:** ưu tiên Antd v6 / `_v2kit`, **KHÔNG viết HTML/CSS thuần khi không cần**. **(3) ĐẶT FILE ĐÚNG THƯ MỤC:** file mới TUYỆT ĐỐI KHÔNG ở root → vào thư mục đúng loại (FE `frontend/src/...`, BE `backend/src/...`, test/docs/script tương ứng); thiếu thư mục phù hợp → **đề xuất user tạo thư mục rồi mới tạo file** (xem `his-qa-anti-pattern` #28-29). **(4)** Skill quy tắc (convention/guardrail) PHẢI áp NGAY trong lúc viết/sửa code — không đứng riêng, không "đọc rồi bỏ qua". Thứ tự: **core-* trước → his-* sau** |
| **BÁO CÁO kết quả chạy lệnh (mọi task)** | `core-execution-output`: ngắn gọn mặc định · tự bung root-cause khi lỗi · luôn nêu thao tác phá huỷ/bảo mật · không claim success khi chưa verify |
| **BUILD-GATE trước khi báo xong** (thêm/sửa/XOÁ code) | Build sạch tầng đã đụng rồi mới báo "xong" (FE `npm run build` EXIT 0 · BE `dotnet build` 0 err · đụng cả 2 → build cả 2 · chỉ `.claude`/docs → khỏi build). Còn lỗi = chưa xong. **Chi tiết (nguồn chân lý):** `his-qa-anti-pattern` #27 |
| **SELF-REVIEW 9 điểm trước khi báo (BE+FE)** | AI tự rà 9 điểm (duplicate · dead-code · hard-code · anti-pattern · god-unit · hàm-dài · import-cycle · naming · state) rồi mới báo, không chờ nhắc. **Chi tiết (nguồn chân lý):** `his-qa-anti-pattern` #30 (FE view: `his-fe-convention` §7) |

---

## (5) Conflict resolution

| Tình huống | Quy tắc |
|---|---|
| Page v1 (Antd) vs v2 (`_v2kit`) | v1 → `his-fe-antd-v6`; v2 → `his-fe-page-v2`. Mặc định feature mới = v2. KHÔNG trộn. |
| Test BE vs E2E | API BE → `his-test-api-powershell`; UI/route/flow → `his-test-e2e`. |
| Migration EF vs SQL script | Luôn SQL script tay (`his-db-migration`) — dự án IGNORE pending model changes. |
| core (portable) vs his (cụ thể) | Nguyên tắc chung ở `core-*`; `his-*` chỉ thêm phần stack-specific + nhắc lại phần liên quan. |
| Trùng "không hardcode / không quên DI" | Nguồn chân lý chung: `his-qa-anti-pattern` (+ `core-*`). |
| **Self-review / build-gate trùng nhiều nơi** | **Nguồn chân lý = `his-qa-anti-pattern` #27 (build) + #30 (9 điểm canonical).** `his-fe-convention` §7 = view FE = "9 điểm + 2 lát-cắt (API/Data, Security)", KHÔNG đánh số lại; `core-clean-code` §9 = view mức hàm. Build-gate = `npm run build` (KHÔNG `tsc --noEmit`). |
| **git-ops / commit / push / workspace-docs** | **Nguồn chân lý = [`workflow/project-rules.md`](workflow/project-rules.md) §2-4.** workspace-docs commit+push **bình thường** (never-push GỠ 2026-06-13). Nơi khác chỉ giữ "không tự commit/push khi chưa cho phép" + LINK, KHÔNG lặp bảng. |
| **trivial vs pipeline** | Định nghĩa **số hoá DUY NHẤT** ở [`workflow/workflow.md`](workflow/workflow.md) §0 (≤5 dòng·1 file·không chạm shared/contract/DB/auth/tiền/patient-safety). Nơi khác trỏ tới, KHÔNG tự phát biểu khác. |
| **DONE vs READY_FOR_PUSH** | Theo `workflow/workflow.md` DoD: READY_FOR_PUSH = xong-chờ-giao (trạng-thái-cuối AI tự đạt); DONE chỉ sau user push OK → mới `gh issue close`. AI KHÔNG close ở READY_FOR_PUSH. |
| **Số migration / trạng-thái-biến-động** | **KHÔNG hard-code số** trong governance. Luôn `ls Data/Scripts/` lấy max(NN)+1. Cấm ghi con số cụ thể (luôn drift). |
| **Ai sở hữu diff refactor/god-file-split** | `tech-debt-manager` = plan+điều phối (không tự sửa lớn); `code-change-controller` = THỰC THI mọi diff; `his-architecture-planner` = chỉ design. 1 god-file-split chỉ 1 owner thực thi. |

### (5b) ★ Tiebreaker khi 2 rule CĂNG NHAU (rule-tension — tránh AI over-engineer / lệch)

| Căng giữa | Quyết (theo thứ tự) |
|---|---|
| **Reuse-first ↔ SRP/no-god-service** | Dùng lại khi **cùng trách nhiệm**. Nếu mở rộng làm service/component "ôm" thêm trách nhiệm KHÁC → **tạo mới**, KHÔNG nhồi để "reuse". *Reuse ≠ nhồi nhét.* |
| **DRY/extract ↔ rule-of-three/YAGNI** | **Dùng lại** thứ ĐÃ CÓ thì luôn ưu tiên. Nhưng **TRÍCH XUẤT abstraction MỚI** chỉ khi lặp **≥3** + **cùng lý do thay đổi**. Trùng code "ngẫu nhiên" khác ngữ cảnh → KHÔNG gộp (gộp non = coupling sai). |
| **Tách nhỏ (SRP) ↔ over-split / wrapper vô nghĩa** | Tách khi có **>1 trách nhiệm/lý-do-đổi rõ rệt** HOẶC quá dài/khó test/khó đọc. KHÔNG tách chỉ vì đếm dòng; KHÔNG tạo wrapper 1-lớp không thêm giá trị. Phân vân → giữ gộp (dễ đọc hơn). |
| **Clean-up/refactor ↔ minimal-change/backward-compat** | Trong **scope đang sửa** được dọn dead-code/naming của chính phần đó (boy-scout nhẹ). KHÔNG mở rộng refactor ra file/module **ngoài scope** khi chưa được yêu cầu; KHÔNG đổi behavior/public API (tránh over-refactor + diff lớn khó review + vỡ hệ đang chạy). |
| **Performance ↔ readability/maintainability** | Mặc định **readability**. Chỉ tối ưu (memo/lazy/virtualize/cache) khi **ĐO được** lag/bundle/chậm thật (`his-fe-performance`/`his-be-scalability`) — KHÔNG memo-hoá/abstract mọi thứ "phòng xa". |

### (5c) ★ Thứ tự ưu tiên THUỘC TÍNH chất lượng (HIS đang vận hành — khi phải đánh đổi)

**An toàn BN + Correctness + Security (P0)** → **Backward-compat / Refactor-safety** (KHÔNG vỡ hệ đang chạy) →
**Readability + Maintainability** → **Scalability** (theo `his-be-scalability`, khi có nhu cầu tải) →
**Performance** (tối ưu khi ĐO được điểm nóng) → **Delivery-speed** (nhanh nhưng KHÔNG đánh đổi các mục trên).

> Lý do (HIS thực tế nhiều năm): **không vỡ cái đang chạy > đẹp lý thuyết**. Scalability/Performance chỉ
> tối ưu khi đo được (tránh over-engineer non). Khi prompt user đòi "nhanh" mà xung đột P0/P1 → ưu tiên P0/P1, nói rõ đánh đổi.

---

## (6) ★ FALLBACK — khi KHÔNG có skill phù hợp

Nếu yêu cầu **không khớp** skill nào ở (1)/(2): **KHÔNG vội tạo skill mới.** Skill chỉ đáng tạo khi
**tái sử dụng được nhiều lần** — nếu không sẽ phình "skill rác". Chỉ được đề xuất skill và cách xử lý dựa trên tech stack, thư viện, framework, naming convention, và workflow đã có trong hệ thống. Chỉ tạo skill mới khi bài toán thực sự khác biệt, không thể gộp hợp lý vào skill hiện có, có khả năng tái sử dụng cho nhiều task trong tương lai.
Khi đánh giá, cần cân nhắc: mục đích sử dụng, workflow, input/output, domain, pattern xử lý, mức độ trùng lặp logic với skill cũ. Chạy quyết định theo thứ tự:

**Bước 1 — Mở rộng skill cũ được không?**
Có skill đã *gần đúng* → **cập nhật/mở rộng skill đó** (thêm case vào SKILL.md / reference) thay vì tạo mới.
Ưu tiên reuse (đúng `core-reusable-code`). Cập nhật xong → chỉnh lại index (1) / dispatch (2) / map con / `_reference.md` nếu cần.

**Bước 2 — Yêu cầu có TÁI SỬ DỤNG NHIỀU LẦN không?** (cổng quyết định)
Tự hỏi: pattern/loại task này còn lặp lại ở các lần sau không?
- **CÓ (đáng đóng gói)** → đề xuất **tạo skill mới**: tên **theo (0) Quy tắc đặt tên** (token tầng đúng,
  KHÔNG hỏi/bịa) · **tầng** (`core-*` nếu portable cho dự án khác / `his-<token>-*` nếu riêng HIS) ·
  mục đích · trigger · dependency (`his→core`).
  **Hỏi user duyệt** → tạo theo skill **`core-skill-authoring`** (frontmatter chuẩn `name`+`description`+
  `metadata.type`, progressive disclosure) → **bổ sung vào index (1) + dispatch (2) + map con + `_reference.md`** → tái dùng lần sau.
- **KHÔNG (one-off, không lặp lại)** → **ĐỪNG tạo skill.** Làm trực tiếp task đó bằng các `core-*` +
  cách chung, và **nói rõ**: "task một lần, không cần skill mới".

**Luôn ưu tiên:** reuse > expand > merge > create new.
KHÔNG tự "làm bừa" sai convention; KHÔNG nhét đại vào skill sai mục đích.

> Skill chỉ sinh ra khi **đáng tái dùng nhiều lần** (hoặc mở rộng skill cũ) → SKILL-MAP lớn dần đúng,
> không phình skill dùng-một-lần.

---

## (7) Split plan — chống phình token (đã áp dụng + cách mở rộng tiếp)

**Đã tách (progressive disclosure cho chính map):** file này chỉ giữ governance + index + dispatch.
Chi tiết "chọn khi" + chuỗi prompt + path đã chuyển sang map con theo tầng; playbook + dependency map ở `_reference.md`.
- `skill-routes/fe.md` · `be.md` · `test.md` · `ops-doc.md` — chuỗi prompt + path theo tầng.
- `skill-routes/_reference.md` — (3) playbook end-to-end + (4) dependency map đầy đủ + ghi chú vị trí.

**Ngưỡng tách tiếp:** khi 1 map con vượt **~250 dòng** → tách map con đó theo nhóm hẹp hơn
(vd `be.md` → `be-core.md` + `be-gateway.md`), thêm 1 dòng dispatch ở (2). KHÔNG để 1 file routing > ~300 dòng.
**Quy tắc vàng khi tách:** chỉ *di chuyển* nội dung (không xoá yêu cầu), mỗi file mới có header
`> đọc CÙNG SKILL-MAP.md`, và (2) phải trỏ tới file mới. File này luôn là điểm vào duy nhất phải đọc đầu tiên.
