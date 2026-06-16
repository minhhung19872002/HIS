---
name: core-ui-ux-audit
description: Use this portable, tech-agnostic skill to run a SYSTEM-WIDE UX/UI + theming + reusability AUDIT FIRST, then a prioritized plan + concrete tasks, BEFORE any fix — never edit code before the audit+plan are done. Triggers include "rà soát/audit UX-UI toàn hệ thống", "kiểm tra đồng bộ light/dark mode", "UI có nhất quán không", "lập plan sửa UI/giao diện", or reviewing the whole app's design consistency / theming / component-reuse across pages. Sweeps light↔dark parity & contrast, color/typography/spacing/layout/alignment/iconography, button/form/card/table/modal-drawer styles, empty/loading/error/success states, navigation/responsive/basic-a11y, plus code-design health (reusability/maintainability/scalability/refactorability) — flags hardcoded-style-vs-token, "off-system" components, uneven copy-paste, missing shared abstractions; diagnoses ROOT CAUSE (local vs systemic) and returns Executive-Summary → Findings(severity) → Root-Cause → Task-Plan, implementing root-first ONLY after the plan. Bind to the project's design system at runtime. Do NOT use for polishing one new screen (core-ui-aesthetics), accessibility mechanics alone (core-accessibility-pattern), bundle/render perf (his-fe-performance), or a single-component edit — this is the whole-system audit→plan→fix orchestration.
metadata:
  type: core
---

# Core — UI/UX System Audit → Plan → Fix (portable)

> **AUDIT-FIRST. NEVER edit code before the audit + plan are complete.** Bind to the project's design
> system at runtime (read the token/theme CSS + component kit + theme setup BEFORE auditing). Pair with the
> stack skill — HIS: `his-fe-page-v2`/`his-fe-convention`; design = `pages-v2/_v2kit.tsx` + `layouts/terminal/ab-module.css`
> (`:root` light + dark vars) + `TerminalLayout`.

## Scope (token-heavy — always scope)
Whole-system audit is EXPENSIVE. Take a scope arg: a module (`reception`), a layer (`all v2 inpatient`), or `full`.
If unscoped AND target > a few pages → **ask which scope first** (cost warning). Use `requirement-coverage.md`
completeness-gate: enumerate ALL pages in scope; do NOT say "done" until 100% swept (no "1 page → kết luận cả hệ").

## Hard rules (ràng buộc — KHÔNG vi phạm)
1. Không fix trước khi audit+plan xong. 2. Không phán cả hệ từ 1 màn hình. 3. Fix tại GỐC (token/component/pattern
chung), không vá bề mặt từng màn. 4. Không bỏ qua khác biệt light↔dark. 5. Không bỏ qua nợ reuse/scale. 6. Không
task mơ hồ. 7. **Audit · Plan · Implement là 3 BƯỚC RIÊNG** (3 output tách bạch).

## Phase 0 — Ground: đọc design system trước
Đọc theme/token (light+dark vars), shared UI kit, layout shells, form/table/modal primitives → lập "hệ EXPECTED"
để đo độ lệch. Không có token system → flag đó là finding systemic gốc.

## Phase 1 — Audit dimensions (quét đủ)
- **Theming:** light↔dark parity + contrast (WCAG) ở **CẢ HAI** theme · hardcode màu/px vs token.
- **Visual:** color · typography (scale/weight) · spacing/rhythm · layout · alignment/grid · iconography · density.
- **Components:** button · form · card · table · modal/drawer/popup — cùng loại render có nhất quán?
- **States:** empty · loading · error · success — đủ + đồng bộ?
- **Flow:** navigation · responsive · a11y cơ bản (focus/keyboard/label/contrast).
- **Cross-page:** cùng 1 loại UI có dựng cùng cách?
Flag rõ: lệch light/dark · mất tương phản 1 theme · hardcode vs token · phần "lạc hệ" · copy-paste sửa không đều ·
rối mắt/khó đọc/khó thao tác/thiếu ổn định.

## Phase 2 — Code-design health (reuse/scale)
Lặp style/logic · hardcode chặn mở rộng · UI-logic rải nhiều nơi · thiếu shared abstraction · component quá đặc thù
khó reuse · naming/structure drift · pattern khác nhau cho cùng loại UI · thứ làm theme/redesign/refactor sau khó.
Chấm: Reusability · Maintainability · Scalability · Readability · Refactorability.

## Phase 3 — Root cause (mỗi finding)
Nguyên nhân GỐC (không chỉ triệu chứng) · vì sao xuất hiện · **LOCAL vs SYSTEMIC** · sửa 1 chỗ có đủ? · cần tạo
rule/abstraction/shared-component/design-token mới không? Dùng `core-impact-analysis` (blast radius) +
`audit-protocol.md` (no-overstate: evidence + confidence, không nói-quá).

## Phase 4 — PLAN (trước khi sửa) — output riêng
(1) Audit summary (2) Danh sách lỗi + severity **Critical/High/Medium/Low** + ảnh hưởng + vị trí (file:line)
(3) Root-cause mỗi lỗi quan trọng (4) Phạm vi ảnh hưởng (5) Kiến trúc sửa đề xuất (token/component/pattern chung)
(6) Task breakdown (7) Thứ tự thực hiện + dependency.

## Phase 5 — Tasks (cụ thể, trên task board dự án — HIS: GitHub Issues)
Mỗi task: **Tên · Mục tiêu · Phạm vi · Input · Output · Acceptance criteria · Rủi ro · Dependency · Mức ưu tiên ·
Refactor-trước?** — chia nhỏ, 1 concern/ task, KHÔNG mơ hồ.

## Phase 6 — Fix (root-first, chỉ sau khi plan duyệt)
Ưu tiên shared component/pattern/token hơn vá từng màn · không phá behavior hiện có · nhỏ nhưng có hệ thống ·
nếu phải refactor trước → nói rõ vì sao · build-gate sau (`his-qa-anti-pattern` #27).

## Phase 7 — Self-review
UI đồng bộ hơn? light/dark nhất quán? reuse tốt hơn? code dễ mở rộng hơn? còn điểm lạc-hệ? blind-spot? → sinh
task phụ nếu cần.

## Output format (trả theo đúng thứ tự)
1. **Executive Summary** (tình trạng · vấn đề lớn nhất · root-cause lớn nhất · hướng sửa ưu tiên)
2. **UX/UI Audit Findings** (lỗi · severity · ảnh hưởng · vị trí)
3. **Code Design Findings** (reuse · maintainability · scale · structure)
4. **Root Cause Analysis** (mỗi vấn đề quan trọng)
5. **Task Plan** (tasks · thứ tự · dependency)
6. **Implementation** (CHỈ sau khi audit+plan xong)
7. **Final Review** (đồng bộ chưa · còn gì · cần task phụ không)

## Dependency
`core-ui-aesthetics` (gu per-component) · `core-accessibility-pattern` (a11y mechanics) · `core-impact-analysis`
(blast radius) · `.claude/workflow/audit-protocol.md` (no-overstate) · `.claude/workflow/requirement-coverage.md`
(completeness-gate) · bind stack: `his-fe-page-v2` / `his-fe-convention`.

## When to update
Khi design system / token / component kit đổi cấu trúc, hoặc thêm chiều audit mới.
