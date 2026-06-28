#!/usr/bin/env bash
# PreToolUse gate (red-team M3) — bien "claim truoc khi Edit" tu NHAC thanh EP, NHUNG:
#   - CHI gate file code that (backend/ frontend/) — bo qua .claude/docs/...
#   - CHI ep khi >=2 CUA active (session marker tuoi < 4h) -> phien 1-CUA binh thuong 0 MA SAT.
#   - Session-aware: cua DA giu 1 lock bat ky -> cho qua; CHUA giu + dang sua code + da-cua -> DENY.
#   - FAIL-OPEN: moi loi/parse-fail -> cho phep (khong bao gio brick viec sua file).
# Input: JSON PreToolUse tren stdin (tool_name, tool_input.file_path|notebook_path, session_id).
# Output: im lang = allow; hoac JSON permissionDecision=deny.
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
# Chuan hoa backslash -> slash roi chi gate code that.
FN="${FILE//\\//}"
case "$FN" in
  */backend/*|*/frontend/*) : ;;
  *) allow;;
esac
# Refresh marker session nay; dem cua active (marker tuoi <= TTL).
mkdir -p "$ACTIVE" 2>/dev/null || allow
[ -n "$SID" ] && touch "$ACTIVE/$SID" 2>/dev/null
now=$(date +%s 2>/dev/null || echo 0); active=0
for m in "$ACTIVE"/*; do [ -e "$m" ] || continue
  [ $(( now - $(stat -c %Y "$m" 2>/dev/null || echo 0) )) -le "$TTL" ] && active=$((active+1))
done
[ "$active" -le 1 ] && allow   # SOLO -> khong gate (0 ma sat)
# >=2 cua active: cua nay co giu lock nao khong?
for d in "$LOCKDIR"/*/; do [ -d "$d" ] || continue
  [ "$(sed -n 's/^session=//p' "$d/meta" 2>/dev/null | head -1)" = "$SID" ] && allow
done
# Da-cua + CHUA giu lock + dang sua code -> DENY (day la ca "ai cung lao vao sua khong claim" = loi goc).
reason="DA-CUA: $active cua dang active va cua NAY chua giu lock nao. Chong 2 cua trung task -> chay TRUOC khi sua file code:  bash .claude/window-lock.sh claim <issue|slug> [model]  (hoac powershell .claude/window-lock.ps1 ... neu o cua PowerShell). Phien 1-cua KHONG bi chan. Gioi han: chi bat khi chua-claim-gi; file-overlap 2 issue khac nhau van can foreign-scan/worktree."
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$reason"
exit 0
