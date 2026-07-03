---
name: core-execution-output
description: Use this skill (portable, tech-agnostic) whenever running commands/tools and reporting execution output to the user — keep output CONCISE by default (summarize grouped actions, high-level progress only; no raw log streaming, temp paths, probe dumps, per-command traces, or background-poll noise), AUTO-EXPAND to verbose root-cause only on failure (build/test fail, exit ≠ 0, migration fail, git conflict, timeout, runtime error, security-sensitive op) or when the user asks, and full DEBUG trace only when explicitly enabled. Safety always overrides: never hide critical errors, never fake progress, never claim success unverified, always surface destructive ops. Do NOT use for deciding WHAT to do (other discipline skills handle that).
metadata:
  type: project
---

# Core — Execution Output Discipline (portable)

> TIER: **A · CORE** (discipline, tech-agnostic). Guardrail **always on** when reporting command/tool output.
> Behave like a senior engineer: short status updates by default, expand detail only when needed.

## (2) The problem this skill solves
Dumping raw logs, streaming every bash command, reprinting repeated probe output, leaking temp paths / background-poll →
noise, hard to read, buries the signal. This skill standardizes: **concise by default, auto-expand on failure, safety never hidden.**

## (3) Why AI fails here
- Pastes raw tool/log output to the user.
- Narrates every internal step (grep/glob/background-task poll/temp path).
- Reprints the same probe multiple times.
- Worse: a "green" summary hiding a failed test/step (faking progress).

## (4) When to use (triggers)
- EVERY task that runs commands/tools and reports back (always applied).

## (5) When NOT to use
- Q&A/pure design, no commands run.
- When the user **enables debug/verbose** or **asks for raw logs** → switch to detailed mode (section 6).
- Deciding WHAT to do → the other discipline skills (clarify/verify/impact/minimal).

## (6) Workflow — 3 modes
**CONCISE (default):** summarize by action group, high-signal lines. Preferred template:
`Installed deps · resolved the merge conflict · FE build OK · updated 6 files · 473/473 tests pass.`
NOT: raw logs, temp paths, probe dumps, per-command traces, background-task poll.

**Reporting CODE CHANGES (collapse the diff by default):** do NOT print the full patch/diff preview per file.
Just summarize: **(1) which files changed · (2) what changed at a high level · (3) why**. Template:
`Updated Reception.tsx · added an API-error extraction helper · shows the real server error to the user.`
Only **expand the full diff** when: the user asks · a large/risky refactor · security/auth logic · migration/schema ·
a destructive op · debug/review mode · build/test fail. (Still ALWAYS surface dangerous ops — section 7.)

**AUTO-EXPAND (auto on failure):** triggered when — build fail · test fail · exit ≠ 0 · migration fail ·
git conflict · timeout · runtime error · security-sensitive op · user asks. Then:
- show the **exact failing command** + the stderr/stdout **relevant to the root cause** (no irrelevant log);
- **an actionable error summary** (cause → fix).

**DEBUG (only when the user explicitly enables):** full command trace, full shell output, background-task log, probe log.

## (7) Safety rules & limits (override every mode — even CONCISE)
- Do NOT hide critical errors; do NOT fake progress; do NOT declare "success" when **not verified** (pair with `core-verify-before-assert`).
- ALWAYS surface a **dangerous/destructive op** even when concise: `rm`/delete files, `git reset --hard`/force-push/rebase, migration/drop/seed DB, install/uninstall a package, change env/secret, permission/security.
- "Concise" ≠ "hide errors". If a step failed → expand that part, don't wrap it under a green summary.

## (8) Expected input
The command/tool execution result (stdout/stderr/exit code) + task context.

## (9) Expected output
- Normal: 1–few high-signal status lines + (if any) a list of dangerous ops.
- On error: the failing command + root-cause log + an action summary.
- Debug: the full trace.

## (10) Examples (HIS)
- **Concise OK:** "Rebased on origin (kept the stash) · FE build OK (2m) · pushed 2 commits · main in sync."
- **Expand on error:** instead of pasting the whole build log → "`dotnet build` FAIL: `SpecialtyEmrService.cs:74` CS0117 — `IcdCode` doesn't exist. Fix: use `IcdName`." + the exact error line.
- **Surface a destructive op (even concise):** "⚠️ `git reset --hard HEAD` (stash kept) · deleted `HIS.bak` · drop+import DB `HIS` on Cloud SQL."
- **Avoid:** don't print 30 lines of `LF→CRLF` warnings, don't list every `Grep`/temp path/background-task poll.

## (11) Anti-pattern / typical mistakes
- Streaming every bash command + pasting the whole stdout for each step.
- Reprinting the same grep/glob probe result multiple times.
- Leaking temp paths, narrating background-task polls.
- A "done/green" summary while a test/step has failed → a **safety violation**.
- Saying "ran successfully" without checking the exit code.

## (12) Integration + file structure
- **Always on** with every task; pair with `core-verify-before-assert` (no claiming success unverified) + `his-qa-anti-pattern` (surface destructive ops, security warnings).
- `references/output-modes.md` — the 3-mode table + the auto-expand trigger list + the destructive-op checklist.

## When to update
- When adding a new "must-always-surface destructive op" kind, or changing the debug/verbose enabling convention.
