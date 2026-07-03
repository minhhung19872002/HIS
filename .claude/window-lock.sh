#!/usr/bin/env bash
# .claude/window-lock.sh — SAME-MACHINE MULTI-WINDOW LOCK via atomic mkdir (a REAL mutex, not advisory).
# Solves the root "2 SAME-MACHINE windows pick the same task": atomic mkdir at the OS level -> exactly 1 window wins; the other fails = already held.
# Why this is needed for same-machine: 4 windows on 1 machine = the SAME GitHub account -> gh assignee/in-progress CANNOT tell
#   which window is which -> GitHub-side claim is BLIND to same-machine duplication. A local lock + session_id fills that gap.
#
# ⚠️ RUN THE RIGHT SHELL (M2): only run via the **Bash tool** (Git-Bash) OR an explicit path
#   "C:\Program Files\Git\bin\bash.exe" .claude/window-lock.sh ...   (or .claude/window-lock.ps1 from PowerShell).
#   ABSOLUTELY do NOT type `bash .claude/window-lock.sh` from the PowerShell tool — `bash` there = an empty WSL launcher -> exit 1,
#   creating NO lock SILENTLY -> the window thinks it's safe and edits freely. (red-team M2.)
#
# Usage:
#   bash .claude/window-lock.sh claim   <key> [model] [note]
#   bash .claude/window-lock.sh release <key> [--force]    # --force = only when the holding window is REALLY dead
#   bash .claude/window-lock.sh list
#   bash .claude/window-lock.sh sweep                       # warn about suspected-hung locks (session not active / old / issue CLOSED)
# <key> = the issue number (ALL DIGITS -> also does cross-machine gh in-progress) OR a slug (governance, fe-inventory).
#
# Anti-duplication matrix (both axes, you need BOTH):
#   same-machine : the mkdir LOCK + session_id (this script) = source of truth.
#   cross-machine: gh in-progress + verify-after-claim (a DIFFERENT-account assignee = another machine).
# LIMIT: the lock is per ISSUE. A file-overlap of 2 DIFFERENT ISSUES touching the same file -> NOT blocked -> needs foreign-scan/
#   single-owner (parallel-windows.md §2) or a git worktree for an edit-only window = the radical fix for that part.
# Rule owner: .claude/workflow/project-rules.md §2 + .claude/workflow/parallel-windows.md §2. Do NOT commit (.claude/locks/ is gitignored).
set -u
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
LOCKDIR="$ROOT/.claude/locks"
SID="${CLAUDE_CODE_SESSION_ID:-unknown}"   # per-window identity (stable across many Bash calls; a shell pid is NOT)
ACTIVE_TTL=14400                            # 4h: a session marker older than this counts as not-active
AGE_STALE=43200                             # 12h: a lock older than this counts as suspected-hung
CMD="${1:-list}"

valid_key(){ case "${1:-}" in ''|*[!A-Za-z0-9_-]*) return 1;; *) return 0;; esac; }
mtime(){ stat -c %Y "$1" 2>/dev/null || echo 0; }
meta_get(){ sed -n "s/^$2=//p" "$1" 2>/dev/null | head -1; }
# List REAL lock dirs (skip dotdirs like .active). Print each path on its own line.
lock_dirs(){ for d in "$LOCKDIR"/*/; do [ -d "$d" ] || continue; echo "$d"; done; }

case "$CMD" in
  claim)
    KEY="${2:-}"; MODEL="${3:-?}"; NOTE="${4:-}"
    valid_key "$KEY" || { echo "[X] key must be [A-Za-z0-9_-] only. Usage: window-lock.sh claim <issue|slug> [model] [note]"; exit 2; }
    mkdir -p "$LOCKDIR"
    behind=$(git -C "$ROOT" rev-list --count 'HEAD..@{u}' 2>/dev/null || echo '?')
    [ "$behind" != "0" ] && [ "$behind" != "?" ] && echo "[!] behind origin by ${behind} commit -> git pull --ff-only + check the CODE before working."
    LOCK="$LOCKDIR/$KEY"
    # ★ ATOMIC: mkdir success = won the lock; failure (already exists) = another window holds it (no race possible).
    if mkdir "$LOCK" 2>/dev/null; then
      WIN="w$$-${RANDOM:-x}"; TS=$(date '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || echo '?')
      if ! { echo "key=$KEY"; echo "session=$SID"; echo "window=$WIN"; echo "model=$MODEL"; echo "pid=$$"; echo "claimed=$TS"; echo "note=$NOTE"; } > "$LOCK/meta" 2>/dev/null; then
        rmdir "$LOCK" 2>/dev/null   # partial-lock: remove immediately, avoid a meta-less orphan
        echo "[X] could not write meta -> removed the lock. Try again."; exit 1
      fi
      echo "[LOCK] CLAIMED '$KEY' (window=$WIN model=$MODEL session=${SID:0:8}). lock=.claude/locks/$KEY"
    else
      # BUSY — tolerate not-yet-written meta (partial) + recognize this session's own lock (idempotent).
      if [ ! -s "$LOCK/meta" ]; then echo "[BUSY] '$KEY' is being claimed (meta not written yet) — wait 1s then retry."; exit 1; fi
      holdsid=$(meta_get "$LOCK/meta" session)
      if [ "$holdsid" = "$SID" ] && [ "$SID" != "unknown" ]; then
        echo "[OK] '$KEY' is already held by THIS window (idempotent, fine)."; exit 0
      fi
      echo "[BUSY] '$KEY' is LOCKED by ANOTHER window (same-machine) -> SWITCH task:"
      sed 's/^/    /' "$LOCK/meta" 2>/dev/null
      # Hint stale if the holding session is no longer active.
      am="$LOCKDIR/.active/$holdsid"
      if [ -n "$holdsid" ] && { [ ! -e "$am" ] || [ $(( $(date +%s 2>/dev/null||echo 0) - $(mtime "$am") )) -gt "$ACTIVE_TTL" ]; }; then
        echo "    [STALE?] the holding session is no longer active -> if that window IS DEAD: bash .claude/window-lock.sh release $KEY --force"
      else
        echo "    is that window REALLY dead? -> bash .claude/window-lock.sh release $KEY --force  then claim again."
      fi
      exit 1
    fi
    # Cross-machine signal (best-effort): ONLY when the key is all-digits.
    case "$KEY" in
      *[!0-9]*) : ;;   # has a non-digit char -> slug -> skip gh
      *)
        if command -v gh >/dev/null 2>&1; then
          if gh issue edit "$KEY" --add-label in-progress --add-assignee @me >/dev/null 2>&1; then
            echo "    + gh #$KEY: in-progress + @me (cross-machine signal)."
          else
            echo "    [!] gh #$KEY FAILED (offline / rate-limit-429 / no permission) -> NO cross-machine signal; machine-2 may duplicate. When the network is back: gh issue edit $KEY --add-label in-progress --add-assignee @me + git fetch."
          fi
          # VERIFY-AFTER-CLAIM (cross-machine): only warn when there is an assignee OTHER than yourself (filter @me — M4).
          me=$(gh api user -q .login 2>/dev/null || echo '')
          if [ -n "$me" ]; then
            others=$(gh issue view "$KEY" --json assignees -q "[.assignees[].login|select(. != \"$me\")]|join(\",\")" 2>/dev/null || echo '')
            [ -n "$others" ] && echo "    [!] verify-after-claim: there is an assignee OTHER than you=[$others] -> machine-2 is grabbing #$KEY -> consider SWITCHing task."
          fi
        else
          echo "    [!] gh NOT on PATH -> NO cross-machine signal; machine-2 may duplicate #$KEY. When gh/network is available: gh issue edit $KEY --add-label in-progress --add-assignee @me + git fetch."
        fi;;
    esac
    ;;
  release)
    KEY="${2:-}"; FORCE="${3:-}"
    valid_key "$KEY" || { echo "[X] invalid key"; exit 2; }
    LOCK="$LOCKDIR/$KEY"
    if [ ! -d "$LOCK" ]; then echo "[i] '$KEY' has no lock (already released?)."; exit 0; fi
    holdsid=$(meta_get "$LOCK/meta" session)
    # ★ OWNERSHIP (M1): a window from ANOTHER session may not release your LIVE lock (anti-steal). --force is for recovery when the holder is dead.
    if [ "$FORCE" != "--force" ] && [ -n "$holdsid" ] && [ "$holdsid" != "$SID" ]; then
      echo "[REFUSE] '$KEY' is held by ANOTHER window (session=${holdsid:0:8} != this window) -> do NOT release (anti live-lock steal):"
      sed 's/^/    /' "$LOCK/meta" 2>/dev/null
      echo "    If that window IS REALLY dead: bash .claude/window-lock.sh release $KEY --force"
      exit 1
    fi
    rm -rf "$LOCK"; echo "[FREE] RELEASED '$KEY'${FORCE:+ (forced)}."
    case "$KEY" in
      *[!0-9]*) : ;;
      *) echo "    (the gh in-progress label STAYS until you push Closes #$KEY; blocked/switching-task -> remove by hand: gh issue edit $KEY --remove-label in-progress --remove-assignee @me)";;
    esac
    ;;
  list|"")
    found=0
    for d in $(lock_dirs); do found=1; echo "  - $(basename "$d")"; sed 's/^/      /' "$d/meta" 2>/dev/null; done
    [ "$found" = 0 ] && echo "(no locks)" || true
    ;;
  sweep)
    [ -d "$LOCKDIR" ] || { echo "(no locks)"; exit 0; }
    now=$(date +%s 2>/dev/null || echo 0); any=0
    for d in $(lock_dirs); do
      k=$(basename "$d"); sid=$(meta_get "$d/meta" session); age=$(( (now - $(mtime "$d")) / 3600 )); flags=""
      am="$LOCKDIR/.active/$sid"
      { [ -z "$sid" ] || [ ! -e "$am" ] || [ $(( now - $(mtime "$am") )) -gt "$ACTIVE_TTL" ]; } && flags="session not active"
      [ $(( now - $(mtime "$d") )) -ge "$AGE_STALE" ] && flags="${flags:+$flags, }${age}h old"
      case "$k" in *[!0-9]*) : ;; *) command -v gh >/dev/null 2>&1 && [ "$(gh issue view "$k" --json state -q .state 2>/dev/null)" = "CLOSED" ] && flags="${flags:+$flags, }issue CLOSED";; esac
      [ -n "$flags" ] && { any=1; echo "[STALE?] '$k' ($flags) -> is the holding window DEAD? bash .claude/window-lock.sh release $k --force  (if the lock is alive, LEAVE IT)."; }
    done
    [ "$any" = 0 ] && echo "(no suspected-hung locks)" || true
    ;;
  *) echo "Usage: window-lock.sh {claim <key> [model] [note] | release <key> [--force] | list | sweep}"; exit 2;;
esac
exit 0
