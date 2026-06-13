#!/usr/bin/env bash
# UserPromptSubmit hook — nhac chay PIPELINE cho task khong trivial (bo tro SKILL-ROUTER).
# Giu NGAN de khong phinh context moi prompt. Chi tiet: .claude/workflow/workflow.md
echo "PIPELINE reminder: Task khong trivial (feature/bug/refactor/migration/da-file) PHAI di qua .claude/workflow/workflow.md theo flow 5 chang Router->Planner->Worker->Reviewer->Finalizer, trao doi qua STATE-STORE .claude/workflow/task.md (task_id/goal/scope/steps/results/decision); chi danh DONE khi qua .claude/workflow/checklist.md (moi muc P0 pass, khong con must_fix) va da sync GitHub Issue. Trivial/Q&A -> bo qua pipeline. KHONG tu commit/push khi user chua cho phep (dung o READY_FOR_PUSH, xin phep moi DONE)."
exit 0
