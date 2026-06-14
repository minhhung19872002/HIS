#!/usr/bin/env bash
# UserPromptSubmit hook — nhac chay PIPELINE cho task khong trivial (bo tro SKILL-ROUTER).
# Giu NGAN de khong phinh context moi prompt. Chi tiet: .claude/workflow/workflow.md
echo "PIPELINE: Trivial (≤5 dong·1 file·khong cham shared/contract/DB/auth/tien/patient-safety) hoac Q&A -> tra loi thang, BO pipeline+state-store+note-skill. Nguoc lai -> .claude/workflow/workflow.md (Router->Planner->Worker->Reviewer->Finalizer; state-store=GitHub Issue body; DONE chi sau khi user push). Git-ops chi tiet: project-rules.md §2-4 (KHONG nhac lai o day)."
exit 0
