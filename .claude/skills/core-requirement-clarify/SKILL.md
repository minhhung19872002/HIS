---
name: core-requirement-clarify
description: Use this skill (portable, tech-agnostic) at the START of any feature/edit/migration/test task to understand the requirement correctly before coding — detect ambiguity/missing info, decide proceed-with-stated-assumption vs STOP-and-ask, and ask good batched clarifying questions. Triggers include a vague/underspecified request, ≥2 reasonable interpretations leading to different results, or a change that is hard to reverse / touches patient-safety / money / schema. Do NOT use for facts you can verify yourself in the codebase (use core-verify-before-assert), nor for clearly-specified tasks with an obvious verifiable default.
metadata:
  type: project
---

# Core — Requirement Clarify (portable)

> TIER: **A · CORE** (discipline, tech-agnostic). Guardrail **pre-flight #1** — runs before any code-gen.

## (2) The problem this skill solves
A vague/under-specified request → AI guesses → builds the wrong thing → wasted rework. This skill standardizes: **detect
unknowns that affect the result** and **decide ASK vs decide-and-record-an-assumption**, to understand correctly before coding.

## (3) Why AI fails here
- Biases toward "fast/helpful answer" → silently picks an implicit default.
- Reluctant to ask → guesses the scope, guesses where data is stored, guesses v1/v2.
- Merges different interpretations into one and goes off-target.
- Or the opposite extreme: asks too many trivial questions → annoying, slow.

## (4) When to use (triggers)
- At the START of EVERY feature/edit/migration/test task (understanding step).
- The prompt is missing one of: target, scope, I/O format, constraints, "done" criteria.
- There are **≥2 reasonable interpretations** leading to DIFFERENT results.
- A **hard-to-reverse** change / touching **patient-safety, legal, money, schema, data deletion**.

## (5) When NOT to use
- The request is clear + has an obvious default **verifiable in the code** (→ decide, record a 1-line assumption).
- An unknown you can answer yourself via Read/Grep → that's the job of **`core-verify-before-assert`**, don't ask the user.
- A pure info question / chitchat.

## (6) Workflow
1. **Separate** "known for sure" vs "guessing" from the prompt + repo context.
2. **List the unknowns** only at the level that **affects the result** (skip trivial detail).
3. **Classify each unknown** through the decision gate (7).
4. If you must ask → **batch them all into at most 1–2 questions**, each with 2–4 options + 1 recommendation (use the `AskUserQuestion` tool). Do NOT ask one at a time.
5. If deciding → record **"Assumption: …"** up front before coding; the user can override later.

## (7) Safety rules & limits (DECISION GATE)
**ASK when** ≥1 holds: (a) changes important behavior/result · (b) hard to reverse · (c) ≥2 interpretations give different results · (d) touches patient-safety/legal/money/data deletion-overwrite.
**Otherwise → proceed-with-stated-assumption.**
- At most ~1–2 question rounds; don't turn asking into a way to avoid doing.
- Do NOT ask what you can verify yourself in the code.

## (8) Expected input
The user's prompt + repo context (CLAUDE.md, related code).

## (9) Expected output
One of: **(A)** 1–2 batched questions with options (via `AskUserQuestion`); or **(B)** a "Settled assumptions: …" block then proceed.

## (10) Examples (HIS)
- "Add field Z to the prescription screen": v1 or v2? → a new feature defaults to **v2** (verifiable via the SKILL-MAP conflict rule) → decide. "Where to store Z" → changes schema/touches a backend DTO → **ASK**.
- "Make the medical-record button work": ≥2 meanings (open a create form? print? export?) → ASK in one multi-option question.
- "Fix it to be correct": too vague ("correct" by what criterion) → ASK.

## (11) Anti-pattern / typical mistakes
- Asking 5 trivial separate questions instead of batching.
- Asking what reading the code would tell you (e.g. an existing endpoint name) → must verify yourself.
- Silently guessing then building the wrong thing all day.
- Over-asking for a small, clear task.

## (12) Integration + file structure
- **Pre-flight pipeline:** this skill (#1) → `core-verify-before-assert` (#2) → `core-impact-analysis` (#3) → code per `core-minimal-change`.
- Uses the `AskUserQuestion` tool for output (A).
- `references/clarify-gate.md` — the decision gate + a batched-question template.

## When to update
- When the ASK/decide decision gate or the batching approach changes.
