# SOFTWARE DELIVERY WORKFLOW — Pipeline & Hợp đồng I/O giữa agent

> **Đây là bản đồ end-to-end** cho mọi task code trong HIS. Nó **không thay** SKILL-MAP (skill routing)
> mà **bổ sung lớp điều phối**: task chạy qua **pipeline 5 chặng**, mỗi chặng do **agent thật** đảm nhận,
> các chặng trao đổi qua **state-store** ([`task.md`](task.md)) theo **hợp đồng I/O cố định**.
>
> Nguồn-sự-thật của *cách làm chi tiết* là **skill** (`.claude/skills/*`) + **agent prompt**
> (`.claude/agents/*.md`). File này chỉ **nối chúng thành luồng** + định nghĩa **contract handoff**.

---

## 0. Khi nào áp pipeline đầy đủ vs rút gọn

| Loại task | Pipeline |
|---|---|
| Q&A · giải thích · tra cứu · sửa 1-2 dòng trivial | **Bỏ qua state-store.** Vẫn theo gate tối thiểu: verify-before-assert → build-gate nếu chạm code ([`checklist.md`](checklist.md) phần Completion). |
| Feature · bug_fix · refactor · technical_debt · migration · đa-file | **Pipeline đầy đủ** 5 chặng + state-store ([`task.md`](task.md)). |
| Đa-domain / mixed (vừa feature vừa refactor vừa doc) | Router **tách** thành nhiều workflow con, mỗi cái chạy pipeline riêng. |

Quy tắc vàng: **không bắt đầu IMPLEMENT trước khi xong UNDERSTAND + PLAN.** Không đánh dấu DONE trước VERIFY + REVIEW.

---

## 1. Pipeline 5 chặng ↔ Agent thật ↔ Skill

```
 Input
   │
   ▼
[1] ROUTER/TRIAGE ─────────► phân loại · scope · risk · chọn luồng agent
   │                          agent: ai-project-orchestrator
   ▼
[2] PLANNER ───────────────► chia bước · done-criteria · impact map
   │                          agent: his-architecture-planner
   ▼
[3] WORKER(S) ─────────────► thực thi (code / doc / data / research)
   │                          agents: code-change-controller · his-docs-manager
   │                          skill research: core-codebase-map-tooling
   ▼
[4] REVIEWER/CRITIC ───────► tìm lỗi · edge case · regression · security · test
   │                          agents: his-quality-reviewer · his-test-engineer
   ▼
[5] FINALIZER ─────────────► gom kết quả · rollback · next action · sync Issue
   │                          agent: ai-project-orchestrator (post-execution)
   ▼
 Output

         ┌──────────────── STATE STORE = workflow/task.md ────────────────┐
 mỗi chặng│ task_id · goal · context · assumptions · steps · results       │
 đọc/ghi  │ errors · final_decision · status                                │
         └─────────────────────────────────────────────────────────────────┘
```

| Chặng | Agent (file) | Tương ứng "5 agent lõi" | Skill chính áp dụng |
|---|---|---|---|
| [1] Router/Triage | [`agents/ai-project-orchestrator.md`](../agents/ai-project-orchestrator.md) | Router/Triage | `core-requirement-clarify`, `core-prod-change-discipline` |
| [2] Planner | [`agents/his-architecture-planner.md`](../agents/his-architecture-planner.md) | Planner | `core-impact-analysis`, `core-architecture-follow`, `core-types-contract` |
| [3] Worker — Code | [`agents/code-change-controller.md`](../agents/code-change-controller.md) | Worker/Code | `core-code-change-workflow`, `core-minimal-change`, `core-reusable-code`, `his-*` theo tầng |
| [3] Worker — Doc | [`agents/his-docs-manager.md`](../agents/his-docs-manager.md) | Worker/Doc | `his-doc-feature` |
| [3] Worker — Research/Data | inline `Explore` / `core-codebase-map-tooling` | Worker/Research+Data | `core-codebase-map-tooling` |
| [4] Reviewer | [`agents/his-quality-reviewer.md`](../agents/his-quality-reviewer.md) + [`agents/his-test-engineer.md`](../agents/his-test-engineer.md) | Reviewer/Critic | `core-testing-architecture`, `his-qa-anti-pattern` |
| [+] Tech-debt | [`agents/tech-debt-manager.md`](../agents/tech-debt-manager.md) | (Worker chuyên debt) | `his-tech-debt-workflow`, `core-refactor` |
| [5] Finalizer | `ai-project-orchestrator` (POST-EXECUTION) | Orchestrator/Finalizer | — |

> **Lưu ý điều phối (CLAUDE.md):** mặc định **trả lời inline** (rẻ nhất); chỉ spawn agent khi việc
> độc lập/nặng đáng đổi token; việc nhẹ/lặp → `agy`. Pipeline này là **mô hình logic** — Claude có thể
> tự đóng nhiều chặng inline cho task vừa, hoặc spawn agent thật cho task lớn. **Luôn báo đầu reply
> đang inline hay dùng agent nào.**

---

## 2. Hợp đồng I/O giữa các agent (state-store contract)

> Đây là phần **trước đây thiếu**: handoff không còn là văn xuôi tự do mà là **input/output contract**.
> Mỗi chặng **chỉ được đọc** field do chặng trước ghi, **chỉ được ghi** field của mình.

### [1] Router/Triage
- **INPUT:** yêu cầu thô của user + trạng thái repo (`git log origin/main`, `gh issue list`).
- **OUTPUT (ghi state §1-3, §Risks):**
  - `classification` (1 trong 10: feature/bug_fix/refactor/technical_debt/architecture/testing/documentation/release/investigation/mixed)
  - `goal`, `scope.in`, `scope.non_goals`
  - `priority`, `risk_level`
  - `agent_sequence` (luồng agent đã chọn — luồng nhỏ-nhất-an-toàn)
  - `verification_required` (lint/typecheck/build/test nào bắt buộc)
  - `completion_criteria` (đo được)
- **GATE:** mơ hồ → STOP hỏi (`core-requirement-clarify`); KHÔNG đoán.

### [2] Planner
- **INPUT (đọc state):** `classification`, `scope`, `constraints`.
- **OUTPUT (ghi state §3 Plan + §Impact):**
  - `steps[]` (bước nhỏ có thứ tự) + `done_criteria` từng bước
  - `impact`: affected files / modules / APIs / DB objects / auth flows / UI flows / integrations
  - `phases` (nếu blast-radius lớn → chia batch)
  - `file_allow_list` (chỉ những file được phép đụng)
- **GATE:** không xác định được impact → route `investigation` trước.

### [3] Worker — Code (`code-change-controller`)
- **INPUT (đọc state):** 1 `step` + `file_allow_list` + convention ([`project-rules.md`](project-rules.md)) + giới hạn thay đổi.
- **OUTPUT (ghi state §4 Execute):**
  - `diff` / changed files (chỉ trong allow-list; vượt → STOP, re-plan)
  - `change_summary` ngắn (WHAT + WHY)
  - `suggested_tests`
  - `build_result` (FE `npm run build` EXIT 0 / BE `dotnet build` 0 errors — **BUILD-GATE bắt buộc**)
- **GATE:** vượt allow-list / đổi contract-DB-API ngoài kế hoạch → STOP, báo Router re-plan (SKILL-MAP P0).

### [3] Worker — Doc (`his-docs-manager`)
- **INPUT:** code change đã merge + `final_decision`.
- **OUTPUT:** docs/ADR (ghi quyết định kiến trúc vào [`ai-memory.md`](ai-memory.md) nếu là quyết định lâu dài).

### [4] Reviewer/Critic (`his-quality-reviewer` + `his-test-engineer`)
- **INPUT (đọc state):** `diff` + `goal`/`scope` gốc + `build_result` + test result.
- **OUTPUT (ghi state §5 Verify/Review):**
  - `verdict`: PASS / FAIL
  - `issues[]` (lỗi logic · thiếu edge case · vi phạm yêu cầu · regression · security)
  - `must_fix[]` (việc phải sửa trước khi DONE)
  - `residual_risk`
- **GATE:** FAIL → quay lại [3] Worker với `must_fix`; KHÔNG cho qua khi còn `must_fix`.

### [5] Finalizer (`ai-project-orchestrator` post-execution)
- **INPUT (đọc state toàn bộ).**
- **OUTPUT (ghi state §6 Close + báo cáo):**
  - `completed_work`, `deferred_work` (+ lý do)
  - `remaining_risks` (+ owner)
  - `rollback_notes`
  - `next_actions` (ưu tiên)
  - `status` → `READY_FOR_PUSH` (KHÔNG tự push — SKILL-MAP §0c) → sau khi user push: `DONE` + `gh issue close`.

---

## 3. 7 bước WORKFLOW (chuẩn hoá — trỏ về skill, KHÔNG lặp nội dung)

7 bước này là **khung tư duy trong mỗi chặng**. Chi tiết cách làm nằm ở skill được trỏ — đây là index.

| Bước | Mục tiêu | Nguồn-sự-thật (skill) | Map vào chặng |
|---|---|---|---|
| **1 · UNDERSTAND** | Hiểu đúng yêu cầu nghiệp vụ; restate; nêu giả định/risk/câu hỏi mở | `core-requirement-clarify` | Router |
| **2 · ANALYZE** | Bản đồ tác động: file/module/DB/API/contract/dependency | `core-impact-analysis`, `core-verify-before-assert` | Router→Planner |
| **3 · PLAN** | Chia bước nhỏ · done-criteria · ≥3 phương án cho thay đổi prod | `core-prod-change-discipline`, `core-minimal-change` | Planner |
| **4 · IMPLEMENT** | Sửa đúng file cần thiết · reuse-first · giữ convention · không over-refactor | `core-code-change-workflow`, `core-reusable-code`, `core-clean-code`, `his-fe-convention` | Worker |
| **5 · VERIFY** | Build/lint/typecheck/test · edge case · error handling | `his-qa-anti-pattern` #27, `core-testing-architecture` | Worker→Reviewer |
| **6 · REVIEW** | Tự rà như senior: chất lượng · kiến trúc · performance · security · maintainability (self-review 9 điểm) | `his-qa-anti-pattern` #30, `core-prod-change-discipline` | Reviewer |
| **7 · COMPLETE** | Chỉ DONE khi đủ Done-criteria + verify + review + báo cáo; ngược lại giữ IN_PROGRESS | [`checklist.md`](checklist.md) Completion | Finalizer |

**Định nghĩa DONE (Definition of Done)** — task chỉ chuyển `DONE` khi **tất cả**:
1. Yêu cầu thoả mãn (khớp `goal` + `completion_criteria`).
2. Không còn lỗi logic / runtime đã biết.
3. Build-gate xanh tầng đã đụng (FE và/hoặc BE).
4. VERIFY + REVIEW hoàn tất, không còn `must_fix`.
5. Báo cáo cuối (7-part) viết xong; state-store sync về GitHub Issue.
6. **Đã push** (nếu user cho phép) — nếu chưa push thì dừng ở `READY_FOR_PUSH`, KHÔNG đánh `DONE`.

(Đồng bộ với memory `feedback_task-lifecycle-dod-remote` + SKILL-MAP §0c.)

---

## 4. Chống scope-creep (bắt buộc mọi chặng)

Phát hiện mở rộng phạm vi (refactor ngoài kế hoạch · đổi architecture/contract/DB ngoài plan · "tiện tay
sửa thêm") → **STOP ngay**, tạo task/Issue mới cho phần mở rộng, re-plan, **xin phép user** rồi mới làm.
KHÔNG nhét scope mới vào task đang chạy. (SKILL-MAP P0 + agent `ai-project-orchestrator` SCOPE CONTROL.)

---

## 5. Liên kết
- Routing skill: [`../SKILL-MAP.md`](../SKILL-MAP.md) — **đọc đầu tiên** cho mọi task code.
- State-store template: [`task.md`](task.md)
- Checklist giao hàng: [`checklist.md`](checklist.md)
- Convention & git rules: [`project-rules.md`](project-rules.md)
- Sổ quyết định kiến trúc: [`ai-memory.md`](ai-memory.md)
