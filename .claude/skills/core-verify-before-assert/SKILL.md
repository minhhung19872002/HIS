---
name: core-verify-before-assert
description: Use this skill (portable, tech-agnostic) to prevent hallucination — never claim a file, function, API endpoint, field, column, prop, config key, or symbol exists (or behaves a certain way) without verifying it in the codebase first via Read/Grep/Glob. Triggers include about to reference a path/symbol/endpoint, relying on a recalled memory or old doc/work-log, or stating "the code does X". Separate "verified" from "assumed". Do NOT use for asking the user about intent/scope (use core-requirement-clarify), nor for pure design discussion with no factual claim about the code.
metadata:
  type: project
---

# Core — Verify Before Assert (portable)

> TIER: **A · CORE** (discipline, tech-agnostic). Guardrail **pre-flight #2** — anti hallucination/wrong assumption.

## (2) The problem this skill solves
AI fabricates a file/function/endpoint/field/column/prop name or asserts wrong code behavior → edits the wrong place,
breaks the build, runtime error. This skill forces **every claim about the codebase to have evidence** (Read/Grep/Glob)
and **clearly separates "verified" vs "assumed"**.

## (3) Why AI fails here
- Infers a "plausible-sounding" symbol name from a pattern instead of reading the real thing.
- Trusts **memory / old docs / work-log** as current truth (CLAUDE.md notes: "a recalled memory reflects when it was written — re-verify it").
- Generalizes from 1 file to the whole codebase.
- Claims "the code does X" without opening that function.

## (4) When to use (triggers)
- About to **reference** a path/symbol/endpoint/field/column/config key.
- About to **rely on a symbol to code** (call a function, import, map a DTO).
- Relying on **recalled memory / docs / CLAUDE.md / work-log** → must re-verify against the current code.
- About to state "this system/snippet works like …".

## (5) When NOT to use
- Asking the user about **intent/scope** (that's `core-requirement-clarify`, not verifying code).
- Pure design discussion, no claim about real code yet.
- Universal, stable language/library knowledge not dependent on the repo.

## (6) Workflow
1. Before writing a fact about the code → **identify the source**: have I Read/Grep'd it this session?
2. Not yet → **verify**: `Grep` the symbol / `Glob` the path / `Read` the exact region. Prefer reading the *real definition*, not just a call site.
3. Match → use it. No match → fix your understanding, do NOT force code to fit the assumption.
4. When stating a fact, **attach short evidence** (`path:line`) or clearly say **"assumed, not verified"**.
5. Memory/doc/work-log is only a **hint** → always re-verify the file/function/flag still exists exactly as described.

## (7) Safety rules & limits
- Do NOT assert the existence/behavior of an unverified symbol.
- Do NOT rename to "match an assumption" — verify, then change.
- Verify enough: 1–3 find/read commands is plenty; no endless digging (if truly indeterminable → say so + ask/propose).
- Evidence > memory; the real definition > guessing by name.

## (8) Expected input
A fact/assumption about to be used about the codebase + Read/Grep/Glob access.

## (9) Expected output
A verified fact (with `path`/evidence), OR a clear "assumed, not verified" label + a plan to verify/ask. No bare unsourced claim.

## (10) Examples (HIS)
- Before mapping a DTO on the FE: Grep the real backend DTO (`SpecialtyEmrDto` uses `icdCode`/`fieldData`, NOT `diagnosisIcd`) instead of guessing by an old name.
- Before calling `client.post('/specialty-emr')`: verify the controller route exists (`SpecialtyEmrController`).
- CLAUDE.md says the Cloud Run URL is `…rm6c6yvoja…` → re-verify: the real URL is in `frontend/.env.production` (the old one doesn't resolve).
- "Does PatientId have an FK?" → Read the `SpecialtyEmr` entity (just a Guid, no navigation) instead of assuming an FK.

## (11) Anti-pattern / typical mistakes
- Import from a "guessed" path → module not found.
- Map a field by an old name in memory → empty/wrong data.
- Quote a URL/ID/flag from an old work-log without checking.
- "Surely there's a helper X" then call it → undefined.

## (12) Integration + file structure
- **Pre-flight pipeline:** after `core-requirement-clarify` (#1) → this skill (#2) → `core-impact-analysis` (#3).
- Resonates with `core-reusable-code` (verify what exists before creating) + `his-qa-anti-pattern` (no hardcoded URL/ID).
- `references/verify-checklist.md` — an evidence-source checklist + the symbol kinds to verify.

## When to update
- When there's a new "error-prone source" kind (e.g. a new doc/spec) to add to the verify checklist.
