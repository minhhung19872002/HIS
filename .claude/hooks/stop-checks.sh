#!/usr/bin/env bash
# MERGED Stop hook (replaces notify-stop.sh + check-dod.sh) — 1 decision/turn, clear order, shared anti-loop.
# Order: (A) drift-lint .claude → (B) conflict-marker → (C) STATUS.md → (D) DoD reminder.
printf '\a' >&2   # bell (stepped away / long build) — to stderr, not mixed into the JSON stdout
input=$(cat 2>/dev/null)
case "$input" in *'"stop_hook_active":true'*) exit 0 ;; esac   # anti-loop
repo="${CLAUDE_PROJECT_DIR:-.}"
status="$repo/docs/workspace-docs/STATUS.md"
block(){ printf '{"decision":"block","reason":"%s"}\n' "$1"; exit 0; }

# (A) DRIFT-LINT GATE: .claude/ changed this session → run lint → BLOCK on governance drift
cl_dirty=$(git -C "$repo" status --porcelain -- .claude 2>/dev/null | grep -c .)
cl_ahead=$(git -C "$repo" diff --name-only origin/main...HEAD -- .claude 2>/dev/null | grep -c .)
if { [ "${cl_dirty:-0}" -gt 0 ] || [ "${cl_ahead:-0}" -gt 0 ]; } && [ -f "$repo/.claude/lint.sh" ]; then
  if ! bash "$repo/.claude/lint.sh" >/dev/null 2>&1; then
    block "DRIFT-LINT FAIL: .claude/ has governance drift errors. Run 'bash .claude/lint.sh' and fix them all before ending (REGISTRY: .claude/REGISTRY.md)."
  fi
fi

# Backend/frontend code changed this session? (uncommitted dirty or ahead of origin/main — 3 dots avoids a false-pos when behind)
code_dirty=$(git -C "$repo" status --porcelain -- backend frontend 2>/dev/null | grep -v '^??' | grep -c .)
code_ahead=$(git -C "$repo" diff --name-only origin/main...HEAD -- backend frontend 2>/dev/null | grep -c .)
[ "${code_dirty:-0}" -eq 0 ] && [ "${code_ahead:-0}" -eq 0 ] && exit 0

# (B) Conflict-marker in an edited tracked file → BLOCK
changed=$(git -C "$repo" diff --name-only 2>/dev/null; git -C "$repo" diff --name-only --cached 2>/dev/null)
if [ -n "$changed" ]; then
  while IFS= read -r f; do
    [ -z "$f" ] && continue; [ -f "$repo/$f" ] || continue
    grep -qE '^(<<<<<<<|>>>>>>>)' "$repo/$f" 2>/dev/null && \
      block "DoD FAIL: a conflict marker remains in an edited file. Resolve the merge-conflict before ending the turn."
  done <<EOF
$changed
EOF
fi

# (C) STATUS.md not updated today → BLOCK (precise: match a 'last-updated' line with the ISO date, NOT a whole-file grep)
# NOTE: the grep alternation keeps the Vietnamese marker because STATUS.md (docs/workspace-docs, out of scope) uses "Cập nhật cuối".
if [ -f "$status" ]; then
  today=$(date +%Y-%m-%d)
  grep -qiE "(cập nhật cuối|cap nhat cuoi|updated|last updated)[^0-9]*$today" "$status" 2>/dev/null || \
    block "Code changed but not reflected: STATUS.md has no last-updated line for $today. Update the last-updated line in STATUS.md (date + what you just did + next) before ending the turn."
fi

# (D) DoD reminder (non-blocking — build/test can't be checked from git, so this only reminds)
msg="DoD gate (.claude/workflow/checklist.md): self-confirm -- [ ] build-gate green (FE npm run build EXIT0 / BE dotnet build 0 errors) [ ] 9-point self-review (his-qa #30) [ ] no P0/must_fix left [ ] money/drug/schema logic has >=1 passing test [ ] state-store synced to the Issue [ ] status READY_FOR_PUSH (do NOT push on your own)."
printf '{"systemMessage":"%s"}\n' "$msg"
exit 0
