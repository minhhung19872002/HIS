# `.claude/workflow/` — Quy trình phát triển phần mềm (Software Delivery Workflow)

> **Mục đích:** đặt 1 lớp **điều phối nhìn-thấy-được** lên trên hệ agent + skill đã có, để mọi task
> code đi qua một **pipeline cố định** với **hợp đồng I/O rõ ràng giữa các agent** (không để agent
> "nói chuyện mù"). Đây là thứ trước đây thiếu — các mảnh đã có nhưng nằm rải rác.

## ⚠️ Nguyên tắc nền: KHÔNG tạo tầng quản trị song song

Bộ file này **KHÔNG copy lại** nội dung đã có ở nơi khác (sẽ trôi-lệch / drift). Nó là **index +
consolidation**: mỗi mục trỏ về **nguồn-sự-thật (source of truth)** đang chạy, chỉ **thêm phần thật sự
thiếu**. Khi 2 nơi mâu thuẫn → theo nguồn-sự-thật được nêu trong từng file.

| File | Vai trò | Nguồn-sự-thật nó index về |
|---|---|---|
| [`workflow.md`](workflow.md) | **★ Bản đồ pipeline end-to-end** (Input→Router→Planner→Worker→Reviewer→Finalizer) + 7 bước + **hợp đồng I/O giữa agent** | `agents/*.md`, `skills/core-prod-change-discipline`, `skills/core-code-change-workflow`, `SKILL-MAP.md` |
| [`task.md`](task.md) | **★ State-store** mỗi task (scratchpad sync về GitHub Issue) + status lifecycle | GitHub Issues (`minhhung19872002/HIS`), memory `feedback_task-lifecycle-dod-remote` |
| [`checklist.md`](checklist.md) | Checklist giao hàng — gom theo nhóm Requirement/Design/Impl/Quality/Security/Perf/Test/Done | `skills/his-qa-anti-pattern` #1-30, `SKILL-MAP.md` P0/P1/P2, self-review 9 điểm |
| [`project-rules.md`](project-rules.md) | Convention · kiến trúc · branch/commit/PR/review | `CLAUDE.md`, `SKILL-MAP.md`, `skills/his-fe-convention`, git-ops rules |
| [`ai-memory.md`](ai-memory.md) | **Sổ quyết định kiến trúc (ADR-lite)** + index 2 tầng memory | `memory/` (global), `agent-memory/<agent>/`, `his-docs-manager` (ADR) |
| [`requirement-coverage.md`](requirement-coverage.md) | **Giao thức phủ yêu cầu** (chống sót khi rà tài liệu): source manifest · đọc PDF gốc · enumerate đủ · parity-đối-thủ · completeness gate | `docs/requirements/**`, `checklist.md` mục I |
| [`audit-protocol.md`](audit-protocol.md) | **Chống audit/agent "nói quá"**: no-quota · evidence-command bắt buộc · confidence · Fact/Inference/Assumption | `core-verify-before-assert`, `../REGISTRY.md` |

> ★ **Chống drift toàn hệ:** [`../REGISTRY.md`](../REGISTRY.md) = sổ NGUỒN-SỰ-THẬT (rule nào ở file nào — link-không-copy) · [`../lint.sh`](../lint.sh) = hệ miễn dịch tự phát hiện drift (auto chạy qua `stop-checks.sh` Stop hook khi `.claude` đổi).
>
> ⚙️ **Yêu cầu môi trường (prerequisite):** hook (`hooks/*.sh`) + `lint.sh` là script **POSIX bash** → cần **Git Bash hoặc WSL2** (đã có sẵn trên máy dev này). Windows thuần (CMD/PowerShell, không có bash) sẽ **không chạy được hook** — Claude Code vẫn hoạt động nhưng mất lớp gate DoD + drift-lint. Khuyến nghị dài hạn: **WSL2** (POSIX đầy đủ, Docker backend) ≥ **Git Bash** (đủ cho git + hook).

## Pipeline 1 dòng

```
Input → [1] Router/Triage → [2] Planner → [3] Worker(s) → [4] Reviewer/Critic → [5] Finalizer → Output
                    ↕               ↕              ↕                 ↕                  ↕
                 ┌──────────────────────────── STATE STORE (task.md) ──────────────────────────┐
                 │ task_id · goal · context · assumptions · steps · results · errors · decision │
                 └──────────────────────────────────────────────────────────────────────────────┘
```

Mỗi agent **chỉ đọc/ghi vào state-store theo hợp đồng I/O** — không truyền văn xuôi tự do. Chi tiết +
ánh xạ agent thật → xem [`workflow.md`](workflow.md).

## Cách dùng (cho người + cho Claude)

1. **Mọi task code** vẫn bắt đầu bằng `SKILL-MAP.md` (skill routing) — KHÔNG thay đổi.
2. SKILL-MAP nay trỏ tới [`workflow.md`](workflow.md) để biết **task chạy qua pipeline nào + agent nào
   ghi gì vào state-store**.
3. Task **không trivial** (feature/bug/refactor/migration đa-file) → mở [`task.md`](task.md) làm
   scratchpad, điền dần, cuối cùng sync kết quả về **GitHub Issue** tương ứng.
4. Task trivial (Q&A, sửa 1 dòng) → KHÔNG cần state-store; vẫn theo gate ở [`checklist.md`](checklist.md).

## Quan hệ với các quyết định đã chốt (KHÔNG đảo ngược)

- **Task board chính = GitHub Issues** (từ 2026-06-13). `task.md` là **scratchpad bổ trợ**, KHÔNG phải
  board thứ hai. Cuối task → sync về Issue (`gh issue ...`).
- **Git-ops**: KHÔNG tự `commit`/`push` khi user chưa explicit (SKILL-MAP §0c). Pipeline dừng ở
  `READY_FOR_PUSH`, xin phép, mới `DONE`.
- **File báo cáo/plan** vẫn vào `docs/workspace-docs/` (SKILL-MAP §0a). Bộ `.claude/workflow/` là
  **governance/process**, không phải report — nên nằm trong `.claude/`.
