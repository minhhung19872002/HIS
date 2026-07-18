#!/usr/bin/env bash
# scripts/lint-fe-folders.sh — FE folder-convention lint (#431 Phase 4).
# Enforces his-fe-convention §4 (chống tái phạm loại lỗi opd/pages/hooks):
#   [1] LAYOUT = tầng CAO HƠN module → chỉ định nghĩa ở components/layout/, KHÔNG trong pages/ hay modules/*.
#   [2] HOOK của module ở modules/<m>/hooks/ (hoặc inline trong page), KHÔNG có tầng pages/**/hooks/.
# Chạy: bash scripts/lint-fe-folders.sh   (exit 1 nếu có vi phạm). Wire vào CI sau khi Phase 4.1 dọn opd.
set -u
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
SRC="$ROOT/frontend/src"
ERRF=$(mktemp)
rel(){ sed "s|$ROOT/||g"; }
err(){ printf '  ❌ %s\n' "$1"; echo x >>"$ERRF"; }

echo "== [1] hook đặt SAI trong pages/ (phải ở modules/<m>/hooks/ hoặc inline trong page) =="
find "$SRC/modules" -type d -path '*/pages/*' -name 'hooks' 2>/dev/null | while read -r d; do
  err "hooks trong pages: $(echo "$d" | rel) → chuyển sang modules/<m>/hooks/ (hook = business logic của module, không thuộc tầng page)"
done

echo "== [2] layout/shell định nghĩa NGOÀI components/layout/ (layout = tầng > module) =="
grep -rlE 'export (const|default|function) [A-Za-z]*(Layout|Shell)\b' "$SRC/pages" "$SRC/modules" 2>/dev/null \
  | grep -E '\.tsx$' | grep -viE '\.(test|spec|stories)\.' | while read -r f; do
  err "layout/shell định nghĩa ngoài components/layout/: $(echo "$f" | rel) → chuyển vào components/layout/ (module chỉ DÙNG layout, không SỞ HỮU)"
done

E=$(wc -l <"$ERRF" 2>/dev/null | tr -d ' '); rm -f "$ERRF"
echo
if [ "${E:-0}" -gt 0 ]; then echo "FE-FOLDER-LINT FAIL: $E vi phạm."; exit 1; else echo "FE-FOLDER-LINT OK ✅"; exit 0; fi
