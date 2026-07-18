#!/usr/bin/env bash
# SessionStart hook — inject repo state + remind to read STATUS.md so the session starts informed.
repo="${CLAUDE_PROJECT_DIR:-.}"
branch=$(git -C "$repo" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')
# wc -l (NOT `grep -c . || echo 0` — a clean tree prints '0\n0', a raw newline that breaks JSON)
dirty=$(git -C "$repo" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
# Sync-gate (root-cause fix for DUPLICATE CODE across 2 machines): fetch + behind/ahead vs upstream.
# behind>0 means local is working on an OLD tree → force a pull + code check before pick/code.
timeout 15 git -C "$repo" fetch -q 2>/dev/null
ahead=$(git -C "$repo" rev-list --count '@{u}..HEAD' 2>/dev/null || echo '?')
behind=$(git -C "$repo" rev-list --count 'HEAD..@{u}' 2>/dev/null || echo '?')
sync=""
if [ "$behind" != "0" ] && [ "$behind" != "?" ]; then
  sync=" >> LOCAL IS BEHIND origin by ${behind} commit. MANDATORY: run git pull --ff-only + grep the synced CODE to check (does the feature/route/issue already exist) BEFORE picking a task/writing code. Do NOT dive into coding on an old tree — this is the source of DUPLICATE CODE when 2 machines work in parallel."
fi
# ★ User HARD SDLC rule (every session/machine): TEST always goes LAST.
rule=" ★ MANDATORY PROCESS (every request/session/machine): TEST is MANDATORY but ALWAYS goes LAST — finish ALL fix/feature/tech-debt FIRST; ABSOLUTELY do NOT start ANY test task (including harness/CI-gate) while ANY fix task is OPEN. No exceptions."
# ★ Model-tier routing (save the Opus budget) — HARD reminder at the start of EACH new chat window. No double-quote/backtick/$ (breaks JSON).
model=" ★ MODEL TIER (every session/new chat window/machine): assess the session nature RIGHT AT the first request → if the current model is in the wrong tier, NUDGE the user to /model the right tier BEFORE working. Q&A/boilerplate/isolated-bulk → Sonnet (verifiable-mechanical work/pure Q&A → Haiku). Refactor/migration/DI/contract/DB/patient-safety/money → Opus. Light/isolated-bulk work NOT touching the guardrail can go to a Haiku/Sonnet subagent or agy. Soft nudge, no auto-switch."
# ★ Cross-identify parallel windows (avoid mislabeling 'Antigravity'): a parallel local agent may be ANOTHER CLAUDE WINDOW. No double-quote/backtick/$ (breaks JSON).
par=" ★ PARALLEL MULTI-WINDOW (every session/machine): if you see a dirty file OUTSIDE your own work → it may be ANOTHER CLAUDE CHAT WINDOW running in parallel, do NOT default to Antigravity/agy. Do not touch/stage files outside your scope; only git add your own files explicitly. The 4-window coordination model: .claude/workflow/parallel-windows.md."
# ★ Same-machine multi-window lock (mkdir-atomic mutex .claude/locks/*). Write an active-marker (so the PreToolUse gate can count windows) + remind to claim. No double-quote/backtick/$ (breaks JSON).
lockdir="${repo}/.claude/locks"
sid="${CLAUDE_CODE_SESSION_ID:-}"
mkdir -p "$lockdir/.active" 2>/dev/null
[ -n "$sid" ] && touch "$lockdir/.active/$sid" 2>/dev/null
locks=" ★ SAME-MACHINE MULTI-WINDOW LOCK: if there COULD be another window running, claim BEFORE editing code to prevent duplicate tasks -> bash .claude/window-lock.sh claim <issue|slug> [model] (mkdir-atomic mutex; PreToolUse gate AUTO-ENFORCES when >=2 windows active; a 1-window session is NOT blocked). From a PowerShell window: powershell -File .claude/window-lock.ps1 claim ... (do NOT type bash directly -> empty WSL, silent lock)."
if [ -d "$lockdir" ]; then
  ln=$(for d in "$lockdir"/*/; do [ -d "$d" ] && echo x; done 2>/dev/null | wc -l | tr -d ' ')
  if [ "$ln" != "0" ]; then
    names=$(for d in "$lockdir"/*/; do [ -d "$d" ] && basename "$d"; done 2>/dev/null | tr '\n' ' ' | tr -cd 'A-Za-z0-9 _-')
    locks="$locks  Locks held: ${ln} [ ${names}] (DEAD window -> release --force; alive -> LEAVE IT; see window-lock.sh list/sweep)."
  fi
fi
msg="[HIS session] branch=${branch} · dirty=${dirty} file · unpushed=${ahead} · behind=${behind} commit.${sync}${rule}${model}${par}${locks} Read docs/workspace-docs/STATUS.md before starting."
# ★ Session↔task naming (#430): if THIS session ALREADY holds a window-lock (typical on RESUME of a task),
# set the chat tab title to that task so parallel windows are distinguishable. Only emit sessionTitle when a
# lock exists (else keep Claude's auto-title). Strip "/\ to keep JSON valid. Owner rule: workflow/session-ops.md.
title=""
if [ -n "$sid" ] && [ -d "$lockdir" ]; then
  for m in "$lockdir"/*/meta; do
    [ -f "$m" ] || continue
    if grep -qx "session=$sid" "$m" 2>/dev/null; then
      k=$(sed -n 's/^key=//p' "$m" | head -1)
      case "$k" in ''|*[!0-9]*) title="HIS: $k";; *) title="HIS: task #$k";; esac
      break
    fi
  done
fi
if [ -n "$title" ]; then
  title=$(printf '%s' "$title" | tr -d '"\\')
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","sessionTitle":"%s","additionalContext":"%s"}}\n' "$title" "$msg"
else
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$msg"
fi
exit 0
