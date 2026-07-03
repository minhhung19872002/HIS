---
name: core-minimal-change
description: Use this skill (portable, tech-agnostic) while implementing, to make the smallest correct change that satisfies the request — no over-engineering, no speculative abstraction, no touching files/code outside scope, no opportunistic refactor mixed into a feature. Triggers include any code-gen/edit task, being tempted to "also refactor/rename/restructure while here", or adding a layer/option "for the future". Do NOT use when the user explicitly asked for a refactor/redesign (use core-refactor) or when a broader change is genuinely required and confirmed.
metadata:
  type: project
---

# Core — Minimal Change (portable)

> TIER: **A · CORE** (discipline, tech-agnostic). A guardrail **at implement time** — scope/YAGNI discipline.

## (2) The problem this skill solves
AI tends to overdo it: add "just-in-case" abstraction, sprawling refactor, touch files outside the request, change unrelated
style → the diff bloats, hard to review, easy to break, off-target. This skill forces the **correct-and-smallest** change that satisfies the request.

## (3) Why AI fails here
- Wants "perfect" → premature generalization (YAGNI violated).
- "While-I'm-here" refactor/rename/format during a feature edit → mixes 2 kinds of change.
- Adds an option/config/abstraction nobody asked for.
- Edits whole unrelated files/areas → blast radius for no reason.

## (4) When to use (triggers)
- EVERY code-gen/edit task (a guardrail while writing).
- When tempted to "refactor/rename/restructure while at it".
- When about to add a layer/abstraction/parameter "for the future".
- When about to touch a file/area outside the request.

## (5) When NOT to use
- The user **explicitly asked** for a refactor/redesign → `core-refactor` (change structure preserving behavior).
- A broad change is **genuinely needed** and has been confirmed (via `core-requirement-clarify` / `core-impact-analysis`).
- A fix that legitimately needs changes in many places (not "overdoing it").

## (6) Workflow
1. **State the minimal scope:** the smallest change that gets the request to "done".
2. **List the files you MUST touch**; every other file = out of scope (don't touch).
3. **Drop** abstractions/options/parameters nobody needs yet (YAGNI). Follow existing precedent instead of inventing.
4. **Separate the changes:** feature ≠ refactor ≠ format. If you see tech debt worth cleaning → **note it as a separate proposal**, don't mix.
5. **Inspect the final diff:** does each changed line directly serve the request? No → drop it.

## (7) Safety rules & limits
- By default do **NOT** edit out-of-scope files; to touch one → state the reason.
- Don't add abstraction for a "hypothetical future".
- No opportunistic refactor/rename/format mixed into a feature.
- Do NOT trade off correctness/safety for "smallness" — be correct first, then minimal (prefer practical maintainability over theoretical perfection).
- Tech debt you find → propose it, let the user decide.

## (8) Expected input
A well-understood request (via `core-requirement-clarify`) + an impact map (via `core-impact-analysis`).

## (9) Expected output
The smallest diff that satisfies the request, following codebase precedent, no surplus files, no surplus abstraction; tech debt (if any) raised separately as a proposal.

## (10) Examples (HIS)
- "Add 1 column to a v2 list table" → edit exactly that page + (if needed) the api client; do NOT change `_v2kit`/other pages.
- "Fix a field-map bug" → edit the mapping; do NOT reorganize the whole file/change import style while at it.
- See another v2 page is also off → **note a proposal**, don't fix it inside the current task.
- Need a new helper → prefer an existing `_v2kit`/util (`core-reusable-code`), don't create a parallel abstraction.

## (11) Anti-pattern / typical mistakes
- A 600-line diff for a 20-line request.
- Mixing refactor + feature → hard to review, easy to regress.
- Adding `options`/generic/flag "for later" that nobody uses.
- Mass format/rename outside the request.

## (12) Integration + file structure
- Sits at the **end of the pre-flight pipeline**: clarify (#1) → verify (#2) → impact (#3) → **minimal-change (while writing)**.
- Complements `core-reusable-code` (reuse instead of create) + `core-refactor` (when the user PROACTIVELY wants cleanup) + `his-qa-anti-pattern` (no over-engineering: no CQRS/MediatR/Next.js).
- `references/scope-checklist.md` — a minimal-scope checklist + "you're overdoing it" signals.

## When to update
- When a new common "overdoing it" pattern appears that should be added to the warning signals.
