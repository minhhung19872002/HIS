#!/usr/bin/env bash
# Stop hook — kiem Definition of Done (DoD) theo .claude/workflow/checklist.md.
#  (1) BLOCK neu con conflict marker (<<<<<<< / >>>>>>>) trong file da sua — vi pham "code o trang thai sach".
#  (2) Khi co thay doi code (backend/frontend) chua xong -> NHAC DoD gate (build-gate, self-review 9,
#      checklist P0, status READY_FOR_PUSH != DONE). Khong block (tranh false-positive vi build khong
#      kiem duoc tu git), de Claude tu xac nhan truoc khi bao xong.
# Anti-loop: ton trong stop_hook_active (giong notify-stop.sh).

input=$(cat 2>/dev/null)
case "$input" in *'"stop_hook_active":true'*) exit 0 ;; esac

repo="${CLAUDE_PROJECT_DIR:-.}"

# Co thay doi code o backend/ hoac frontend/ trong phien? (dirty chua commit, hoac ahead origin/main)
code_dirty=$(git -C "$repo" status --porcelain -- backend frontend 2>/dev/null | grep -v '^??' | grep -c .)
code_ahead=$(git -C "$repo" diff --name-only origin/main...HEAD -- backend frontend 2>/dev/null | grep -c .)

if [ "${code_dirty:-0}" -eq 0 ] && [ "${code_ahead:-0}" -eq 0 ]; then
  exit 0
fi

# (1) Hard violation: conflict marker trong file tracked da sua (working + staged)
changed=$(git -C "$repo" diff --name-only 2>/dev/null; git -C "$repo" diff --name-only --cached 2>/dev/null)
conflict=0
if [ -n "$changed" ]; then
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    [ -f "$repo/$f" ] || continue
    if grep -qE '^(<<<<<<<|>>>>>>>)' "$repo/$f" 2>/dev/null; then conflict=1; break; fi
  done <<EOF
$changed
EOF
fi

if [ "$conflict" -eq 1 ]; then
  reason="DoD FAIL: con conflict marker (<<<<<<< / >>>>>>>) trong file da sua. Giai quyet merge-conflict roi moi ket thuc luot."
  printf '{"decision":"block","reason":"%s"}\n' "$reason"
  exit 0
fi

# (2) Nhac DoD gate (non-blocking)
msg="DoD gate (.claude/workflow/checklist.md): truoc khi coi la xong, tu xac nhan -- [ ] build-gate xanh tang da dung (FE: npm run build EXIT 0 / BE: dotnet build 0 loi) [ ] self-review 9 diem (his-qa #30) [ ] het muc P0 pass, khong con must_fix [ ] state-store sync ve GitHub Issue [ ] status dung o READY_FOR_PUSH, KHONG tu push. Con dang do -> giu IN_PROGRESS, dung bao DONE."
printf '{"systemMessage":"%s"}\n' "$msg"
exit 0
