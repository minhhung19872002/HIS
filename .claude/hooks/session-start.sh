#!/usr/bin/env bash
# SessionStart hook — inject trạng thái repo + nhắc đọc STATUS.md để mở phiên là nắm ngay.
repo="${CLAUDE_PROJECT_DIR:-.}"
branch=$(git -C "$repo" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')
# wc -l (KHÔNG `grep -c . || echo 0` — cây sạch in '0\n0' gây newline thô vỡ JSON)
dirty=$(git -C "$repo" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
ahead=$(git -C "$repo" rev-list --count '@{u}..HEAD' 2>/dev/null || echo '?')
msg="[HIS session] branch=${branch} · dirty=${dirty} file · unpushed=${ahead} commit. Đọc docs/workspace-docs/STATUS.md để nắm trạng thái + việc kế tiếp trước khi bắt đầu."
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$msg"
exit 0