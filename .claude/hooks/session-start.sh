#!/usr/bin/env bash
# SessionStart hook — inject trạng thái repo + nhắc đọc STATUS.md để mở phiên là nắm ngay.
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')
dirty=$(git status --porcelain 2>/dev/null | grep -c . || echo 0)
ahead=$(git rev-list --count '@{u}..HEAD' 2>/dev/null || echo '?')
msg="[HIS session] branch=${branch} · dirty=${dirty} file · unpushed=${ahead} commit. Đọc docs/workspace-docs/STATUS.md để nắm trạng thái + việc kế tiếp trước khi bắt đầu."
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$msg"
exit 0