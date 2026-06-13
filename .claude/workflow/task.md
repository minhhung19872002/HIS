# TASK STATE-STORE — Template (scratchpad đồng bộ về GitHub Issue)

> **State-store** = cấu trúc chung mà 5 chặng pipeline đọc/ghi để **không trao đổi mù** ([`workflow.md`](workflow.md) §2).
> Đây là **scratchpad bổ trợ** trong lúc làm 1 task — **KHÔNG phải board thứ hai**. Task board chính vẫn là
> **GitHub Issues** (`minhhung19872002/HIS`). Cuối task: **sync kết quả về Issue** (`gh issue ...`).

## Cách dùng
- Task **không trivial** → copy khối "STATE" dưới đây ra nơi làm việc (scratchpad/Issue body), điền dần qua các chặng.
- Field nào chặng nào ghi → xem hợp đồng I/O ở [`workflow.md`](workflow.md) §2.
- KHÔNG commit/push file đã điền vào repo trừ khi user yêu cầu (state là ephemeral; nguồn lưu lâu dài = Issue).
- Task trivial (Q&A, sửa 1 dòng) → bỏ qua, chỉ theo gate [`checklist.md`](checklist.md).

## Status lifecycle (đồng bộ memory `feedback_task-lifecycle-dod-remote` + SKILL-MAP §0c)

```
BACKLOG → TODO → IN_PROGRESS → BLOCKED ⤺ → REVIEW → READY_FOR_PUSH → DONE
```

| Status | Ý nghĩa | Cổng chuyển tiếp |
|---|---|---|
| `BACKLOG` | Đã ghi nhận, chưa lên lịch | — |
| `TODO` | Đã chọn làm, chưa bắt đầu | Router phân loại xong |
| `IN_PROGRESS` | Đang làm | Plan xong, đang IMPLEMENT |
| `BLOCKED` | Kẹt (thiếu info/quyết định/deps) | ghi `errors` + lý do; mở khoá → IN_PROGRESS |
| `REVIEW` | Đang VERIFY + REVIEW | còn `must_fix` → quay lại IN_PROGRESS |
| `READY_FOR_PUSH` | Code xong + build xanh + review pass, **chờ user cho push** | **DỪNG ở đây — KHÔNG tự push** |
| `DONE` | Đã push + đóng Issue | chỉ sau khi user explicit "push" và push OK |

---

## STATE (copy khối này cho mỗi task)

```yaml
# ── META ──────────────────────────────────────────────
task_id:            # GitHub Issue # (vd #42) — nguồn lưu lâu dài
title:
status:             # BACKLOG|TODO|IN_PROGRESS|BLOCKED|REVIEW|READY_FOR_PUSH|DONE
priority:           # Critical|High|Medium|Low
created:            # YYYY-MM-DD (ngày tuyệt đối, không "hôm nay")

# ── [1] ROUTER — UNDERSTAND ───────────────────────────
classification:     # feature|bug_fix|refactor|technical_debt|architecture|testing|documentation|release|investigation|mixed
goal:               # 1 câu: kết quả cần đạt
requirement_restated:   # diễn đạt lại yêu cầu bằng lời đơn giản
scope_in:           # - những gì TRONG phạm vi
scope_non_goals:    # - những gì RÕ RÀNG ngoài phạm vi
open_questions:     # - câu hỏi còn mở (nếu có → có thể phải STOP hỏi)
assumptions:        # - giả định đang dựa vào
risks:              # - rủi ro + mức
risk_level:         # Critical|High|Medium|Low
agent_sequence:     # luồng agent đã chọn (luồng nhỏ-nhất-an-toàn)
verification_required:  # lint? typecheck? build? unit? integration? e2e?
completion_criteria:    # đo được — khi nào coi là xong

# ── [2] PLANNER — ANALYZE + PLAN ──────────────────────
impact:
  files:            # - file ảnh hưởng
  modules:          # - module
  apis:             # - endpoint/contract
  db_objects:       # - bảng/view/proc
  auth_flows:       # - luồng auth/role
  ui_flows:         # - luồng UI
  integrations:     # - hệ ngoài
file_allow_list:    # - CHỈ những file được phép đụng
steps:              # bước nhỏ có thứ tự + done-criteria từng bước
  - step: 
    done_when: 
phases:             # (nếu blast-radius lớn) batch

# ── [3] WORKER — IMPLEMENT ────────────────────────────
changed_files:      # - file đã sửa (phải nằm trong allow_list)
change_summary:     # WHAT + WHY ngắn gọn
suggested_tests:    # - test đề xuất
build_result:       # FE: npm run build EXIT? | BE: dotnet build errors?

# ── [4] REVIEWER — VERIFY + REVIEW ────────────────────
verdict:            # PASS|FAIL
review_dims:        # 4 chiều — mỗi chiều OK|issue:
  code_quality:     #   duplicate/dead-code/naming/hàm-quá-dài (self-review 9 điểm)
  performance:      #   query đắt/N+1/payload lớn (chỉ khi đo được)
  security:         #   validate BE/auth/role/secret/audit-HSBA
  maintainability:  #   tách layer/SRP/coupling
verification:       # build:EXIT? | lint:? | test:? | manual:?
issues:             # - lỗi logic / edge case thiếu / vi phạm yêu cầu / regression / security
must_fix:           # - phải sửa trước DONE (còn item → KHÔNG được DONE)
residual_risk:      # - rủi ro còn lại

# ── [5] FINALIZER — COMPLETE ──────────────────────────
completed_work:     # đã giao gì
deferred_work:      # hoãn gì + vì sao
remaining_risks:    # rủi ro mở + owner
rollback_notes:     # cách revert nếu cần
next_actions:       # việc tiếp theo (ưu tiên)
errors:             # nhật ký lỗi/kẹt gặp trong task
final_decision:     # quyết định cuối + (nếu là quyết định kiến trúc lâu dài → ghi ai-memory.md)
```

---

## Sync về GitHub Issue (cuối task)
```bash
# Tạo task mới (đầu pipeline)
gh issue create --title "<title>" --body "<goal + scope>"     # → lấy task_id

# Cập nhật tiến độ
gh issue comment <task_id> --body "<change_summary + verdict>"

# Đóng khi DONE (CHỈ sau khi user cho push + push OK)
gh issue close <task_id> --comment "Done in <commit-sha>"
```
> Body Issue dùng UTF-8 no-BOM (memory `project_github-issues-task-board`). KHÔNG tự `gh issue close`
> trước khi push OK.
