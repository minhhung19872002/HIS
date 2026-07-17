#!/usr/bin/env bash
# .claude/safe-commit.sh — RACE-PROOF commit for the SHARED-TREE multi-window model (4 cửa / 1 cây).
#
# ROOT CAUSE it fixes (đo được phiên 2026-07-18): N cửa Claude chia SẺ 1 `.git/index`.
#   → `git add <file mình>` là CHƯA ĐỦ: một `git commit` (whole-index) sẽ VƠ luôn thứ cửa
#     khác vừa `git add` vào index chung → COMMIT TRỘN (nuốt WIP của cửa khác).
#   → Script này commit theo PATH TƯỜNG MINH (`git commit -- <paths>`): chỉ commit ĐÚNG các path
#     bạn nêu, bỏ qua mọi thứ khác trong index. Sau đó fetch + push (behind → rebase nếu cây sạch).
#
# Usage:
#   bash .claude/safe-commit.sh "<commit message>" <path1> [path2 ...]
#   bash .claude/safe-commit.sh --no-push "<msg>" <paths...>    # commit local, KHÔNG push
#
# ★ QUY TẮC (parallel-windows.md R4): trong phiên nhiều cửa, TUYỆT ĐỐI không `git commit` / `git commit -a`
#   trần — luôn qua script này (hoặc `git commit -- <paths>` tường minh). PowerShell: dùng
#   `& "C:\Program Files\Git\bin\bash.exe" .claude/safe-commit.sh ...` (bash trần trên PATH PowerShell = WSL rỗng).
set -u

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT" || { echo "[X] không cd được repo: $ROOT"; exit 2; }

PUSH=1
case "${1:-}" in --no-push) PUSH=0; shift ;; esac
MSG="${1:-}"; shift 2>/dev/null || true
[ -n "$MSG" ]  || { echo "[X] usage: safe-commit.sh [--no-push] \"<msg>\" <path...>"; exit 2; }
[ "$#" -gt 0 ] || { echo "[X] KHÔNG có path — safe-commit BẮT BUỘC path tường minh (không bao giờ whole-index)"; exit 2; }

# Guard typo: mọi path phải tồn tại.
for p in "$@"; do
  [ -e "$p" ] || { echo "[X] path không tồn tại: $p"; exit 2; }
done

echo "[safe-commit] add + commit CHỈ:"; for p in "$@"; do echo "   - $p"; done
git add -- "$@" || { echo "[X] git add lỗi"; exit 1; }

# PARTIAL commit — chỉ các path nêu tên (bỏ qua mọi thứ cửa khác đã stage vào index chung).
git commit -m "$MSG" -- "$@" || { echo "[X] git commit lỗi (không có gì để commit? hoặc hook chặn)"; exit 1; }
NEWSHA=$(git rev-parse --short HEAD)
echo "[safe-commit] committed $NEWSHA"

[ "$PUSH" = "1" ] || { echo "[safe-commit] --no-push: chỉ commit local."; exit 0; }

# Push race: fetch → nếu behind, rebase (chỉ chạy được khi cây sạch) → push.
git fetch origin --quiet 2>/dev/null || echo "[safe-commit] (cảnh báo) fetch lỗi — thử push luôn"
BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)
if [ "${BEHIND:-0}" -gt 0 ]; then
  echo "[safe-commit] behind origin $BEHIND commit — rebase $NEWSHA lên origin/main"
  if git rebase origin/main; then
    :
  else
    git rebase --abort 2>/dev/null
    echo "[!] KHÔNG rebase được (cây chung đang dirty bởi cửa khác, hoặc đụng cùng dòng)."
    echo "    Commit $NEWSHA AN TOÀN ở local. Push sau bằng 1 trong 2 cách:"
    echo "      • đợi lúc cây sạch rồi: git rebase origin/main && git push origin HEAD:main"
    echo "      • hoặc worktree cô lập (memory: parallel-window-push-worktree)."
    exit 1
  fi
fi

if git push origin HEAD:main 2>&1; then
  echo "[safe-commit] ✅ pushed $(git rev-parse --short HEAD) → origin/main"
else
  echo "[!] push bị từ chối (cửa khác push chen vào khe). Re-run: git fetch && git rebase origin/main && git push origin HEAD:main"
  exit 1
fi
