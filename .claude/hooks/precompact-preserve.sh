#!/usr/bin/env bash
# PreCompact hook — giữ lại kỷ luật quan trọng qua mỗi lần nén context (session dài).
repo="${CLAUDE_PROJECT_DIR:-.}"
dirty=$(git -C "$repo" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
msg="[Giữ sau compaction] (1) KHÔNG commit/push khi user chưa cho phép rõ (workspace-docs nay push BÌNH THƯỜNG — never-push đã GỠ 2026-06-13). (2) Task board = GitHub Issues; STATUS.md = session-state. (3) Trạng thái + việc kế tiếp: đọc docs/workspace-docs/STATUS.md (hiện ${dirty} file dirty). (4) Task code: route SKILL-MAP trước, minimal-change."
printf '{"hookSpecificOutput":{"hookEventName":"PreCompact","additionalContext":"%s"}}\n' "$msg"
exit 0