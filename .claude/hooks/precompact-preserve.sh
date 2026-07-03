#!/usr/bin/env bash
# PreCompact hook — preserve the important discipline across each context compaction (long session).
repo="${CLAUDE_PROJECT_DIR:-.}"
dirty=$(git -C "$repo" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
msg="[Keep after compaction] (1) Do NOT commit/push until the user explicitly permits (workspace-docs now pushes NORMALLY — never-push was REMOVED 2026-06-13). (2) Task board = GitHub Issues; STATUS.md = session-state. (3) State + next steps: read docs/workspace-docs/STATUS.md (currently ${dirty} dirty files). (4) Code task: route via SKILL-MAP first, minimal-change."
printf '{"hookSpecificOutput":{"hookEventName":"PreCompact","additionalContext":"%s"}}\n' "$msg"
exit 0
