#!/usr/bin/env bash
# PreCompact hook — giữ lại kỷ luật quan trọng qua mỗi lần nén context (session dài).
dirty=$(git status --porcelain 2>/dev/null | grep -c . || echo 0)
msg="[Giữ sau compaction] (1) KHÔNG commit/push khi user chưa cho phép rõ. (2) workspace-docs local-only, KHÔNG push. (3) Trạng thái + việc kế tiếp: đọc docs/workspace-docs/STATUS.md (hiện ${dirty} file dirty). (4) Task code: route SKILL-MAP trước, minimal-change."
printf '{"hookSpecificOutput":{"hookEventName":"PreCompact","additionalContext":"%s"}}\n' "$msg"
exit 0