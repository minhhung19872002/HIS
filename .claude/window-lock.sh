#!/usr/bin/env bash
# .claude/window-lock.sh — KHOA DA-CUA same-machine bang mkdir ATOMIC (mutex THAT, khong advisory).
# Giai goc "2 cua CUNG MAY pick trung task": mkdir atomic o tang OS -> dung 1 cua thang lock; cua khac fail = da co nguoi giu.
# Vi sao can rieng cho same-machine: 4 cua tren 1 may = CUNG 1 tai khoan GitHub -> gh assignee/in-progress KHONG phan biet
#   duoc cua nao -> claim phia GitHub MU voi trung-cua-same-machine. Lock local + session_id lap dung lo do.
#
# ⚠️ CHAY DUNG SHELL (M2): chi chay qua **Bash tool** (Git-Bash) HOAC duong dan tuong minh
#   "C:\Program Files\Git\bin\bash.exe" .claude/window-lock.sh ...   (hoac .claude/window-lock.ps1 tu PowerShell).
#   TUYET DOI KHONG go `bash .claude/window-lock.sh` tu tool PowerShell — `bash` o do = WSL launcher rong -> exit 1,
#   KHONG tao lock CAM -> cua tuong trong roi sua de. (red-team M2.)
#
# Dung:
#   bash .claude/window-lock.sh claim   <key> [model] [note]
#   bash .claude/window-lock.sh release <key> [--force]    # --force = chi khi cua giu DA CHET that su
#   bash .claude/window-lock.sh list
#   bash .claude/window-lock.sh sweep                       # canh bao lock nghi-treo (session khong active / cu / issue CLOSED)
# <key> = so issue (TOAN CHU SO -> kem gh in-progress cross-machine) HOAC slug (governance, fe-inventory).
#
# Ma tran chong-trung (ca 2 truc, can CA HAI):
#   same-machine : LOCK mkdir + session_id (script nay) = nguon-su-that.
#   cross-machine: gh in-progress + verify-after-claim (assignee tai khoan KHAC = may khac).
# GIOI HAN: lock theo ISSUE. File-overlap cua 2 ISSUE KHAC nhau cung dung 1 file -> KHONG chan duoc -> can foreign-scan/
#   single-owner (parallel-windows.md §2) hoac git worktree cho cua edit-only = fix triet de phan do.
# Chu rule: .claude/workflow/project-rules.md §2 + .claude/workflow/parallel-windows.md §2. KHONG commit (.claude/locks/ gitignored).
set -u
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
LOCKDIR="$ROOT/.claude/locks"
SID="${CLAUDE_CODE_SESSION_ID:-unknown}"   # per-window identity (ben vung qua nhieu lan goi Bash; pid shell thi KHONG)
ACTIVE_TTL=14400                            # 4h: marker session cu hon coi nhu khong-active
AGE_STALE=43200                             # 12h: lock cu hon coi nhu nghi-treo
CMD="${1:-list}"

valid_key(){ case "${1:-}" in ''|*[!A-Za-z0-9_-]*) return 1;; *) return 0;; esac; }
mtime(){ stat -c %Y "$1" 2>/dev/null || echo 0; }
meta_get(){ sed -n "s/^$2=//p" "$1" 2>/dev/null | head -1; }
# Liet ke thu muc lock THAT (bo qua dotdir nhu .active). In tung dong path.
lock_dirs(){ for d in "$LOCKDIR"/*/; do [ -d "$d" ] || continue; echo "$d"; done; }

case "$CMD" in
  claim)
    KEY="${2:-}"; MODEL="${3:-?}"; NOTE="${4:-}"
    valid_key "$KEY" || { echo "[X] key chi gom [A-Za-z0-9_-]. Dung: window-lock.sh claim <issue|slug> [model] [note]"; exit 2; }
    mkdir -p "$LOCKDIR"
    behind=$(git -C "$ROOT" rev-list --count 'HEAD..@{u}' 2>/dev/null || echo '?')
    [ "$behind" != "0" ] && [ "$behind" != "?" ] && echo "[!] behind origin ${behind} commit -> git pull --ff-only + doi chieu CODE truoc khi lam."
    LOCK="$LOCKDIR/$KEY"
    # ★ ATOMIC: mkdir thanh cong = thang lock; that bai (da ton tai) = cua khac giu (khong race duoc).
    if mkdir "$LOCK" 2>/dev/null; then
      WIN="w$$-${RANDOM:-x}"; TS=$(date '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || echo '?')
      if ! { echo "key=$KEY"; echo "session=$SID"; echo "window=$WIN"; echo "model=$MODEL"; echo "pid=$$"; echo "claimed=$TS"; echo "note=$NOTE"; } > "$LOCK/meta" 2>/dev/null; then
        rmdir "$LOCK" 2>/dev/null   # partial-lock: go ngay, tranh orphan meta-less
        echo "[X] khong ghi duoc meta -> da go lock. Thu lai."; exit 1
      fi
      echo "[LOCK] CLAIMED '$KEY' (window=$WIN model=$MODEL session=${SID:0:8}). lock=.claude/locks/$KEY"
    else
      # BUSY — chiu duoc meta chua ghi xong (partial) + nhan ra lock cua CHINH session nay (idempotent).
      if [ ! -s "$LOCK/meta" ]; then echo "[BUSY] '$KEY' dang duoc claim (meta chua ghi xong) — doi 1s roi thu lai."; exit 1; fi
      holdsid=$(meta_get "$LOCK/meta" session)
      if [ "$holdsid" = "$SID" ] && [ "$SID" != "unknown" ]; then
        echo "[OK] '$KEY' da do CHINH cua nay giu tu truoc (idempotent, khong sao)."; exit 0
      fi
      echo "[BUSY] '$KEY' DA KHOA boi cua KHAC (same-machine) -> DOI task:"
      sed 's/^/    /' "$LOCK/meta" 2>/dev/null
      # Goi y stale neu session giu khong con active.
      am="$LOCKDIR/.active/$holdsid"
      if [ -n "$holdsid" ] && { [ ! -e "$am" ] || [ $(( $(date +%s 2>/dev/null||echo 0) - $(mtime "$am") )) -gt "$ACTIVE_TTL" ]; }; then
        echo "    [STALE?] session giu khong con active -> neu cua do DA CHET: bash .claude/window-lock.sh release $KEY --force"
      else
        echo "    cua do CHET that su? -> bash .claude/window-lock.sh release $KEY --force  roi claim lai."
      fi
      exit 1
    fi
    # Cross-machine signal (best-effort): CHI khi key TOAN chu so.
    case "$KEY" in
      *[!0-9]*) : ;;   # co ky tu khong-so -> slug -> bo qua gh
      *)
        if command -v gh >/dev/null 2>&1; then
          if gh issue edit "$KEY" --add-label in-progress --add-assignee @me >/dev/null 2>&1; then
            echo "    + gh #$KEY: in-progress + @me (tin hieu cross-machine)."
          else
            echo "    [!] gh #$KEY THAT BAI (offline / rate-limit-429 / khong quyen) -> KHONG co tin hieu cross-machine; may-2 co the trung. Khi mang on: gh issue edit $KEY --add-label in-progress --add-assignee @me + git fetch."
          fi
          # VERIFY-AFTER-CLAIM (cross-machine): chi canh bao khi co assignee KHAC tai khoan minh (loc @me — M4).
          me=$(gh api user -q .login 2>/dev/null || echo '')
          if [ -n "$me" ]; then
            others=$(gh issue view "$KEY" --json assignees -q "[.assignees[].login|select(. != \"$me\")]|join(\",\")" 2>/dev/null || echo '')
            [ -n "$others" ] && echo "    [!] verify-after-claim: co assignee KHAC ban=[$others] -> may-2 dang gianh #$KEY -> can nhac DOI task."
          fi
        else
          echo "    [!] gh KHONG co tren PATH -> KHONG co tin hieu cross-machine; may-2 co the trung #$KEY. Khi co gh/mang: gh issue edit $KEY --add-label in-progress --add-assignee @me + git fetch."
        fi;;
    esac
    ;;
  release)
    KEY="${2:-}"; FORCE="${3:-}"
    valid_key "$KEY" || { echo "[X] key khong hop le"; exit 2; }
    LOCK="$LOCKDIR/$KEY"
    if [ ! -d "$LOCK" ]; then echo "[i] '$KEY' khong co lock (da go?)."; exit 0; fi
    holdsid=$(meta_get "$LOCK/meta" session)
    # ★ OWNERSHIP (M1): cua KHAC session khong duoc release lock SONG cua minh (chong cuop). --force cho recovery khi cua giu da chet.
    if [ "$FORCE" != "--force" ] && [ -n "$holdsid" ] && [ "$holdsid" != "$SID" ]; then
      echo "[REFUSE] '$KEY' do cua KHAC giu (session=${holdsid:0:8} != cua nay) -> KHONG release (chong cuop lock song):"
      sed 's/^/    /' "$LOCK/meta" 2>/dev/null
      echo "    Neu cua do DA CHET that su: bash .claude/window-lock.sh release $KEY --force"
      exit 1
    fi
    rm -rf "$LOCK"; echo "[FREE] RELEASED '$KEY'${FORCE:+ (forced)}."
    case "$KEY" in
      *[!0-9]*) : ;;
      *) echo "    (gh label in-progress GIU toi khi push Closes #$KEY; blocked/doi-task -> go tay: gh issue edit $KEY --remove-label in-progress --remove-assignee @me)";;
    esac
    ;;
  list|"")
    found=0
    for d in $(lock_dirs); do found=1; echo "  - $(basename "$d")"; sed 's/^/      /' "$d/meta" 2>/dev/null; done
    [ "$found" = 0 ] && echo "(khong co khoa nao)" || true
    ;;
  sweep)
    [ -d "$LOCKDIR" ] || { echo "(khong co khoa nao)"; exit 0; }
    now=$(date +%s 2>/dev/null || echo 0); any=0
    for d in $(lock_dirs); do
      k=$(basename "$d"); sid=$(meta_get "$d/meta" session); age=$(( (now - $(mtime "$d")) / 3600 )); flags=""
      am="$LOCKDIR/.active/$sid"
      { [ -z "$sid" ] || [ ! -e "$am" ] || [ $(( now - $(mtime "$am") )) -gt "$ACTIVE_TTL" ]; } && flags="session khong active"
      [ $(( now - $(mtime "$d") )) -ge "$AGE_STALE" ] && flags="${flags:+$flags, }cu ${age}h"
      case "$k" in *[!0-9]*) : ;; *) command -v gh >/dev/null 2>&1 && [ "$(gh issue view "$k" --json state -q .state 2>/dev/null)" = "CLOSED" ] && flags="${flags:+$flags, }issue CLOSED";; esac
      [ -n "$flags" ] && { any=1; echo "[STALE?] '$k' ($flags) -> cua giu DA CHET? bash .claude/window-lock.sh release $k --force  (lock con song thi DE NGUYEN)."; }
    done
    [ "$any" = 0 ] && echo "(khong co lock nghi-treo)" || true
    ;;
  *) echo "Dung: window-lock.sh {claim <key> [model] [note] | release <key> [--force] | list | sweep}"; exit 2;;
esac
exit 0
