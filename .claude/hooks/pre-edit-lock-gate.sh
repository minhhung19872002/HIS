#!/usr/bin/env bash
# PreToolUse gate (red-team M3) — turns "claim before Edit" from a REMINDER into ENFORCEMENT, BUT:
#   - ONLY gates real code files (backend/ frontend/) — skips .claude/docs/...
#   - ONLY enforces when >=2 windows are active (session marker age < 4h) -> a 1-window session has 0 FRICTION.
#   - Session-aware: a window that ALREADY holds any lock -> pass; not-holding + editing code + multi-window -> DENY.
#   - FAIL-OPEN: any error/parse-fail -> allow (never brick file editing).
# Input: PreToolUse JSON on stdin (tool_name, tool_input.file_path|notebook_path, session_id).
# Output: silence = allow; or JSON permissionDecision=deny.
set -u
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
LOCKDIR="$ROOT/.claude/locks"; ACTIVE="$LOCKDIR/.active"; TTL=14400
allow(){ exit 0; }

payload=$(cat 2>/dev/null) || allow
parsed=$(printf '%s' "$payload" | python -c 'import json,sys
try: d=json.load(sys.stdin)
except Exception: sys.exit(0)
ti=d.get("tool_input") or {}
fp=ti.get("file_path") or ti.get("notebook_path") or ""
print(fp); print(d.get("session_id",""))' 2>/dev/null) || allow
FILE=$(printf '%s' "$parsed" | sed -n 1p)
SID=$(printf '%s' "$parsed" | sed -n 2p)
[ -n "$FILE" ] || allow
# Normalize backslash -> slash then only gate real code.
FN="${FILE//\\//}"
case "$FN" in
  */backend/*|*/frontend/*) : ;;
  *) allow;;
esac
# Refresh this session's marker; count active windows (marker age <= TTL).
mkdir -p "$ACTIVE" 2>/dev/null || allow
[ -n "$SID" ] && touch "$ACTIVE/$SID" 2>/dev/null
now=$(date +%s 2>/dev/null || echo 0); active=0
for m in "$ACTIVE"/*; do [ -e "$m" ] || continue
  [ $(( now - $(stat -c %Y "$m" 2>/dev/null || echo 0) )) -le "$TTL" ] && active=$((active+1))
done
[ "$active" -le 1 ] && allow   # SOLO -> no gate (0 friction)
# >=2 active windows: does THIS window hold any lock?
for d in "$LOCKDIR"/*/; do [ -d "$d" ] || continue
  [ "$(sed -n 's/^session=//p' "$d/meta" 2>/dev/null | head -1)" = "$SID" ] && allow
done
# Multi-window + NOT holding a lock + editing code -> DENY (this is the "everyone dives in without claiming" root cause).
reason="MULTI-WINDOW: $active windows active and THIS window holds no lock. To stop 2 windows duplicating a task -> run BEFORE editing code files:  bash .claude/window-lock.sh claim <issue|slug> [model]  (or powershell .claude/window-lock.ps1 ... in a PowerShell window). A 1-window session is NOT blocked. Limit: only triggers when nothing is claimed yet; a file-overlap of 2 different issues still needs foreign-scan/worktree."
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$reason"
exit 0
