#!/usr/bin/env bash
# .claude/lint.sh — HỆ MIỄN DỊCH chống drift governance .claude.
# Phát hiện TỰ ĐỘNG các lớp lỗi từng xảy ra (root-cause: thiếu máy-kiểm → drift tích luỹ qua phiên).
# Chạy: bash .claude/lint.sh  (exit 1 nếu có lỗi). Nên chạy SAU mọi sửa .claude + TRƯỚC commit.
# Nguyên tắc CHỐNG-NÓI-QUÁ (chính lint phải tuân): loại trừ chính nó · loại comment · low false-positive.
set -u
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
CL="$ROOT/.claude"
ERRF=$(mktemp); WRNF=$(mktemp)   # đếm qua FILE (tránh bug subshell `| while` không cộng biến cha)
rel(){ sed "s|$ROOT/||g"; }
err(){ printf '  ❌ %s\n' "$1"; echo x >>"$ERRF"; }
wrn(){ printf '  ⚠️  %s\n' "$1"; echo x >>"$WRNF"; }
# grep loại trừ chính lint.sh (nếu không, nó match pattern của chính mình → false-positive).
# + loại .claude/worktrees/ (sandbox git-worktree transient của agent nền — quét vào là nhân đôi
#   mọi lỗi + báo lỗi giả trên bản sao docs nằm ngoài scope lint).
GEX="--exclude=lint.sh --exclude-dir=worktrees"

echo "== [1] Dead memory refs (chỉ flag slug trích-dẫn backtick, missing khỏi MỌI project memory) =="
ALLMEM=$(ls "$HOME"/.claude/projects/*/memory/*.md 2>/dev/null | xargs -n1 basename 2>/dev/null | sed 's/\.md$//' | sort -u)
SKIP='user_role feedback_testing feedback_my_preferences project_x reference_x'
if [ -n "$ALLMEM" ]; then
  grep -rhoE $GEX '`(feedback|project|reference)_[a-z0-9-]+`' "$CL" 2>/dev/null | tr -d '`' | sort -u | while read -r r; do
    case " $SKIP " in *" $r "*) continue;; esac
    echo "$ALLMEM" | grep -qx "$r" || grep -rln $GEX "\`$r\`" "$CL" 2>/dev/null | grep -v '/agent-memory/' | rel | while read -r f; do err "memory '$r' không tồn tại (mọi project) — ref ở $f"; done
  done
else wrn "không liệt kê được memory dir để đối chiếu"; fi

echo "== [2] Hard-code số migration (trạng-thái-biến-động) =="
grep -rniE $GEX 'last was [0-9]+|next.{0,6}= ?[0-9]{1,3}|latest committed = [0-9]+|approaching [0-9]+\+?' "$CL" "$ROOT/CLAUDE.md" 2>/dev/null \
  | grep -iE 'migration|script|Data/Scripts|NN_' | grep -vE '^\s*#|^[^:]+:[0-9]+:\s*#' | rel | while read -r l; do err "số migration hard-code: $l"; done

echo "== [3] workspace-docs 'never-push / local-only' (rule đã GỠ 2026-06-13) =="
grep -rniE $GEX 'never push|local-only|local only' "$CL" "$ROOT/CLAUDE.md" 2>/dev/null \
  | grep -iE 'workspace' | grep -viE 'GỠ|REMOVED|bình thường|normally|đã xoá|đã gỡ' | rel | while read -r l; do err "workspace-docs never-push tồn dư: $l"; done

echo "== [4] Heading-number trùng trong cùng file (## N. lặp; bỏ references/) =="
find "$CL" -name '*.md' -not -path '*/references/*' -not -path '*/worktrees/*' 2>/dev/null | while read -r f; do
  dups=$(grep -oE '^## [0-9]+\.' "$f" 2>/dev/null | sort | uniq -d)
  [ -n "$dups" ] && err "trùng heading số trong $(echo "$f"|rel): $(echo $dups|tr '\n' ' ')"
done

echo "== [5] Hook sinh JSON hợp lệ =="
for h in session-start precompact-preserve; do
  hs="$CL/hooks/$h.sh"; [ -f "$hs" ] || continue
  bash "$hs" 2>/dev/null | python -c 'import json,sys; json.loads(sys.stdin.read())' 2>/dev/null || err "hook $h.sh → JSON KHÔNG hợp lệ"
done

echo "== [6] Anti-pattern 'grep -c . || echo 0' (CHỈ dòng code, bỏ comment) =="
grep -rn $GEX 'grep -c \. || echo 0' "$CL/hooks/" 2>/dev/null | grep -vE ':[0-9]+:\s*#' | rel | while read -r l; do err "anti-pattern đếm dòng (vỡ JSON): $l"; done

echo "== [7] Broken internal link (workflow/*.md trỏ file không tồn tại) =="
find "$CL/workflow" -name '*.md' 2>/dev/null | while read -r f; do d=$(dirname "$f")
  grep -oE '\]\(([a-zA-Z0-9_./-]+\.md)\)' "$f" 2>/dev/null | sed -E 's/\]\((.*)\)/\1/' | while read -r link; do
    case "$link" in /*|http*) continue;; esac
    [ -f "$d/$link" ] || wrn "link gãy trong $(echo "$f"|rel): $link"
  done
done

echo "== [8] Ref backtick \`his-/core-X\` tới skill HOẶC agent KHÔNG tồn tại (drift tên) =="
# Valid set = skills + agents (cả hai dùng prefix his-/core-). Loại tài liệu ngoài .claude/skills (vd his-pacs-* = host/path, không phải skill).
VALID=$( { ls -d "$CL"/skills/*/ "$CL"/agents/*.md 2>/dev/null | xargs -n1 basename 2>/dev/null | sed 's/\.md$//'; } | sort -u)
if [ -n "$VALID" ]; then
  grep -rhoE $GEX '`(his-(fe|be|db|fs|ops|test|qa|doc|flow|architecture|quality|docs|test)|core)-[a-z0-9]+(-[a-z0-9]+)*`' "$CL" "$ROOT/CLAUDE.md" 2>/dev/null | tr -d '`' | sort -u | while read -r s; do
    echo "$VALID" | grep -qx "$s" || grep -rln $GEX "\`$s\`" "$CL" "$ROOT/CLAUDE.md" 2>/dev/null | grep -vE 'REGISTRY|skill-routes/_reference|lint.sh' | rel | while read -r f; do err "skill/agent '$s' không tồn tại — ref ở $f"; done
  done
fi

echo "== [9] 7 agent memory-spec block ĐỒNG NHẤT (boilerplate trùng — chống drift giữa các bản) =="
# Không dedup (subagent cần block inline để biết cách dùng memory); thay vào đó ENFORCE 7 bản giống nhau.
ref=""; refn=""
for f in "$CL"/agents/*.md; do
  b=$(basename "$f" .md)
  h=$(awk '/^# Persistent Agent Memory/{p=1} p' "$f" 2>/dev/null | sed -E "s/$b//g; s|agent-memory/[a-z-]+|agent-memory/AGENT|g" | md5sum | cut -c1-12)
  case "$h" in d41d8cd98f00) continue;; esac   # block rỗng (agent không có) → skip
  if [ -z "$ref" ]; then ref="$h"; refn="$b"
  elif [ "$h" != "$ref" ]; then err "memory-spec block agent '$b' LỆCH so với '$refn' — sửa cho đồng bộ (boilerplate phải giống 100%)"; fi
done

echo "== [10] Script .claude chưa track (referenced mechanism untracked → dangling ref khi commit) =="
find "$CL" -type f \( -name '*.sh' -o -name '*.ps1' \) -not -path '*/worktrees/*' 2>/dev/null | while read -r f; do
  rp=$(echo "$f" | rel)
  git -C "$ROOT" ls-files --error-unmatch "$rp" >/dev/null 2>&1 && continue   # đã track
  git -C "$ROOT" check-ignore "$rp" >/dev/null 2>&1 && continue               # cố ý ignore
  wrn "script chưa track: $rp (nhớ git add khi commit, kẻo lệnh tham chiếu thành command-not-found)"
done

E=$(wc -l <"$ERRF" 2>/dev/null | tr -d ' '); W=$(wc -l <"$WRNF" 2>/dev/null | tr -d ' '); rm -f "$ERRF" "$WRNF"
echo
if [ "${E:-0}" -gt 0 ]; then echo "LINT FAIL: $E lỗi, $W cảnh báo."; exit 1; else echo "LINT OK ✅ ($W cảnh báo)."; exit 0; fi
