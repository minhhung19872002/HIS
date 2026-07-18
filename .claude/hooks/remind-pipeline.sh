#!/usr/bin/env bash
# UserPromptSubmit hook — remind to run the PIPELINE for a non-trivial task (complements SKILL-ROUTER).
# + nudge SPARRING when the prompt shows signs of a decision/strategic question (calibrated, not always-on).
# Keep it SHORT so it doesn't bloat context every prompt. Detail: .claude/workflow/workflow.md + skills/core-sparring-partner
# NOTE: the case patterns below KEEP Vietnamese keywords on purpose — they detect a Vietnamese prompt (the user types Vietnamese).
IN=$(cat 2>/dev/null)   # read the prompt (JSON) to probe keywords; substring-match so it doesn't depend on the format
echo "PIPELINE: Trivial (≤5 lines·1 file·doesn't touch shared/contract/DB/auth/money/patient-safety) or Q&A -> answer directly, SKIP pipeline+state-store+skill-note. Otherwise -> .claude/workflow/workflow.md (Router->Planner->Worker->Reviewer->Finalizer; state-store=GitHub Issue body; DONE only after the user pushes). Git-ops detail: project-rules.md §2-4 (NOT repeated here)."
echo "SDLC PROCESS (every request/session/machine): TEST is MANDATORY but ALWAYS goes LAST. Finish ALL fix/feature/tech-debt FIRST; ABSOLUTELY do NOT start a test task (including harness/CI-gate #191/#212/#213) while ANY fix task is OPEN. No exceptions. Detail: CLAUDE.md §Plan/task management."
case "$IN" in
  *làm*|*lam*|*task*|*"tính năng"*|*"tinh nang"*|*feature*|*thêm*|*them*|*sửa*|*sua*|*fix*|*pick*|*issue*|*code*|*refactor*|*implement*|*migration*)
    echo "SYNC-GATE (anti DUPLICATE CODE across 2 machines): if you have NOT pulled this session -> clean tree + git pull --ff-only (NOT just fetch) + grep the synced CODE to verify the feature/route/issue does NOT exist yet, THEN write (an OPEN issue is a LAGGING indicator, new code is the verdict). Done -> close the issue ATOMICALLY on push (Closes #N), NOT in a batch. Detail: project-rules.md §2."
    echo "DoD-CHECKLIST (non-trivial task): when you settle on the task, materialize a '## ✅ DoD checklist' (- [ ] items) in the Issue body (completion_criteria + applicable 🔴 checklist.md items + non-goals); TICK - [x] as each item is actually verified (mirror the list into TodoWrite so it is visible); before READY_FOR_PUSH run a SELF-VERIFY pass = re-check every item with evidence (file:line / fresh command output), any 🔴 unchecked = NOT done. Detail: .claude/workflow/dod-checklist.md." ;;
esac
case "$IN" in
  */spar*|*"phản biện"*|*"phan bien"*|*"có ổn không"*|*"co on khong"*|*"ổn không"*|*"khả thi"*|*"kha thi"*|*"quyết định"*|*"quyet dinh"*|*"đánh giá"*|*"danh gia"*|*"chốt hướng"*|*"chot huong"*|*"nên chọn"*|*"nen chon"*)
    echo "SPARRING: the prompt shows signs of a decision/strategic question -> apply skills/core-sparring-partner: critique FIRST (hidden assumptions · blind-spots · risks · alternatives — MINIMAL, NO quota; if there's no significant blind-spot, say so), then propose. If it's actually a clear/trivial execution command -> skip, just do it." ;;
esac
exit 0
