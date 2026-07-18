#!/usr/bin/env bash
# .claude/statusline.sh — per-window statusline: shows WHICH TASK this chat session is running.
#
# ROOT CAUSE it solves (#430): with N parallel Claude windows on 1 tree, the user cannot tell which
# window is on which task. The window-lock (.claude/locks/<key>/meta) already maps session->task; this
# surfaces it LIVE in the status bar. Auto-updates when you claim/release a lock (CLAIM-FIRST) — no /rename needed.
#
# Wired via settings.json "statusLine". Input = one JSON object on stdin (session_id, workspace, model...).
# Output = ONE line of text. MUST be fast (runs on every render) + never error → keep it to grep + 1 git call.
# jq is NOT available on this machine → parse with grep/sed only.
set -u
IN=$(cat 2>/dev/null)
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." 2>/dev/null && pwd)}"

# session_id from stdin JSON; fallback to the env var Claude Code sets for hooks.
SID=$(printf '%s' "$IN" | grep -oE '"session_id"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | grep -oE '[0-9a-fA-F]{8}-[0-9a-fA-F-]+' | head -1)
[ -n "$SID" ] || SID="${CLAUDE_CODE_SESSION_ID:-}"

branch=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')

# Find the lock whose meta.session == this session → that lock's key = the task this window is running.
task=""; note=""; model=""
if [ -n "$SID" ] && [ -d "$ROOT/.claude/locks" ]; then
  for m in "$ROOT"/.claude/locks/*/meta; do
    [ -f "$m" ] || continue
    if grep -qx "session=$SID" "$m" 2>/dev/null; then
      task=$(sed -n 's/^key=//p'  "$m" | head -1)
      note=$(sed -n 's/^note=//p' "$m" | head -1)
      model=$(sed -n 's/^model=//p' "$m" | head -1)
      break
    fi
  done
fi

# Render task: numeric key -> "task #N" (issue), slug -> "<slug>".
if [ -n "$task" ]; then
  case "$task" in
    ''|*[!0-9]*) label="🔖 $task" ;;   # slug
    *)           label="🔖 task #$task" ;;
  esac
  [ -n "$note" ] && label="$label · $note"
else
  label="🔖 (chưa claim task)"
fi

out="⎇ $branch · $label"
[ -n "$model" ] && out="$out · $model"
printf '%s' "$out"
