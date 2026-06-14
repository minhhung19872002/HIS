#!/usr/bin/env bash
# Stop hook GỘP (thay notify-stop.sh + check-dod.sh) — 1 quyết định/lượt, thứ tự rõ, anti-loop chung.
# Thứ tự: (A) drift-lint .claude → (B) conflict-marker → (C) STATUS.md → (D) DoD reminder.
printf '\a' >&2   # bell (rời máy / build lâu) — ra stderr, không lẫn JSON stdout
input=$(cat 2>/dev/null)
case "$input" in *'"stop_hook_active":true'*) exit 0 ;; esac   # anti-loop
repo="${CLAUDE_PROJECT_DIR:-.}"
status="$repo/docs/workspace-docs/STATUS.md"
block(){ printf '{"decision":"block","reason":"%s"}\n' "$1"; exit 0; }

# (A) DRIFT-LINT GATE: .claude/ đổi trong phiên → chạy lint → BLOCK nếu drift governance
cl_dirty=$(git -C "$repo" status --porcelain -- .claude 2>/dev/null | grep -c .)
cl_ahead=$(git -C "$repo" diff --name-only origin/main...HEAD -- .claude 2>/dev/null | grep -c .)
if { [ "${cl_dirty:-0}" -gt 0 ] || [ "${cl_ahead:-0}" -gt 0 ]; } && [ -f "$repo/.claude/lint.sh" ]; then
  if ! bash "$repo/.claude/lint.sh" >/dev/null 2>&1; then
    block "DRIFT-LINT FAIL: .claude/ co loi drift governance. Chay 'bash .claude/lint.sh' sua het roi moi ket thuc (REGISTRY: .claude/REGISTRY.md)."
  fi
fi

# Code backend/frontend đổi trong phiên? (dirty chưa commit hoặc ahead origin/main — 3 chấm tránh false-pos khi behind)
code_dirty=$(git -C "$repo" status --porcelain -- backend frontend 2>/dev/null | grep -v '^??' | grep -c .)
code_ahead=$(git -C "$repo" diff --name-only origin/main...HEAD -- backend frontend 2>/dev/null | grep -c .)
[ "${code_dirty:-0}" -eq 0 ] && [ "${code_ahead:-0}" -eq 0 ] && exit 0

# (B) Conflict-marker trong file tracked đã sửa → BLOCK
changed=$(git -C "$repo" diff --name-only 2>/dev/null; git -C "$repo" diff --name-only --cached 2>/dev/null)
if [ -n "$changed" ]; then
  while IFS= read -r f; do
    [ -z "$f" ] && continue; [ -f "$repo/$f" ] || continue
    grep -qE '^(<<<<<<<|>>>>>>>)' "$repo/$f" 2>/dev/null && \
      block "DoD FAIL: con conflict marker trong file da sua. Giai quyet merge-conflict roi moi ket thuc luot."
  done <<EOF
$changed
EOF
fi

# (C) STATUS.md chưa cập nhật hôm nay → BLOCK (precision: match dòng 'Cap nhat cuoi'/'updated' chứa ISO date, KHÔNG grep cả file)
if [ -f "$status" ]; then
  today=$(date +%Y-%m-%d)
  grep -qiE "(cập nhật cuối|cap nhat cuoi|updated|last updated)[^0-9]*$today" "$status" 2>/dev/null || \
    block "Co thay doi code chua phan anh: STATUS.md khong co dong 'Cap nhat cuoi: $today'. Cap nhat STATUS.md (Cap nhat cuoi + viec vua lam + viec ke tiep) roi moi ket thuc luot."
fi

# (D) DoD reminder (non-blocking — build/test khong kiem duoc tu git nen chi nhac)
msg="DoD gate (.claude/workflow/checklist.md): tu xac nhan -- [ ] build-gate xanh (FE npm run build EXIT0 / BE dotnet build 0 loi) [ ] self-review 9 diem (his-qa #30) [ ] het P0/must_fix [ ] logic tien/thuoc/schema co >=1 test pass [ ] state-store sync Issue [ ] status READY_FOR_PUSH (KHONG tu push)."
printf '{"systemMessage":"%s"}\n' "$msg"
exit 0
