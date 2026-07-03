---
name: core-critic
description: Use this skill (portable, tech-agnostic) to run a STRUCTURED ADVERSARIAL AUDIT of ONE concrete EXISTING artifact — a plan, design, decision, answer, claim, or code diff — surfacing logic errors, weak points, wrong/hidden assumptions, risks & failure-surface, missing evidence, inconsistencies, and unhandled edge cases, then emitting severity-ranked findings + a SHIP / FIX-THEN-SHIP / BLOCK verdict with confidence. Triggers include "review this", "is this right / OK / any risks", "before we ship/merge/deploy", a conclusion presented as settled, a PR/design to audit, or any irreversible change about to commit. Do NOT use to challenge the USER's live in-conversation idea (core-sparring-partner), to reverse the problem framing (core-inversion-thinking), to generate new alternatives (core-open-thinking), or to pick/merge a winner (core-synthesis-decision).
metadata:
  type: project
---

# Core — Critic (artifact auditor / adversarial auditor)

> TIER: **A · CORE** (portable, tech-agnostic). One of the 4 systematic thinking modes — orchestration
> (using 1/2/3/4 + order) is **owned by `core-synthesis-decision` §Orchestration**; here it only links.

## Purpose
For an **existing** artifact, lower **miscalibrated confidence** to the right level: find logic errors, weak points, wrong/hidden
assumptions, risks & failure-surface, **missing evidence**, inconsistencies, dropped edge-cases. Do NOT invent
new options (that's `core-open-thinking`); only **assess what exists** and rule ship/fix/block.

## When to use
- There's a **concrete artifact** (plan/design/diff/claim/answer) **AND** an action is about to follow it.
- Before ship/merge/deploy/commit; PR review; risk assessment; verifying "the code does X" / "this is the best way".
- **Mandatory as a gate** for a hard-to-reverse change / touching money · patient-safety · schema · security.

## When NOT to use
- No artifact yet, just an embryonic idea → `core-open-thinking` (critique would kill an immature idea).
- Need to challenge the **USER's decision/idea in conversation** (calibrated, anti-sycophancy) → `core-sparring-partner`.
- Need to **reframe** the problem ("what would break it") → `core-inversion-thinking`.
- Need to **create new options** or **pick a winner** → `core-open-thinking` / `core-synthesis-decision`.
- Trivial / reversible work → just do it.

## Required input
- **Mandatory:** a concrete artifact + the goal it serves.
- **Should have:** success criteria / DoD, hard-soft constraints, the evidence/assumptions the author relied on.
- Missing "goal + success criteria" → ask 1 question before critiquing (else it slides into bikeshedding).

## Internal process
1. **1-line summary** of what the artifact claims/proposes (force a correct understanding before criticizing).
2. **Extract assumptions** (explicit + implicit); label `Fact / Assumption / Speculation`.
3. For **load-bearing** assumptions: what evidence? if WRONG, how far does it collapse?
4. **Scan 7 axes:** correctness · completeness (what's missing) · consistency · evidence quality · risk/failure · edge-cases · second-order effects.
5. **Attack your own findings** (anti-nitpick): does this finding survive the author's rebuttal? → drop fake weaknesses.
6. **Rank:** `Blocker / Major / Minor` × likelihood × impact.
7. Each remaining finding: note the **evidence that would resolve it** + the **minimal fix direction** (don't redesign).

## Required output
- **Findings table:** location · issue · `Fact/Assumption/Speculation` · severity · missing-evidence · minimal-fix-direction.
- **Overall verdict:** `SHIP` / `FIX-THEN-SHIP` / `BLOCK` + **confidence %**.
- **The single most dangerous assumption** (if wrong, the whole thing flips).
- If **no significant error** → say plainly "the artifact is solid on axis X, the remaining risk is Y" (ABSOLUTELY no fabricating errors to fill a quota).

## Failure modes (anti-patterns — don't do)
- **Destructive nihilism:** criticize everything, no ranking, no fix direction → blocks progress.
- **Criticism with no evidence / by taste** (bikeshedding); **strawman attacks** (criticize a distorted version of the artifact).
- **Infinite doubt** (demanding proof of axioms); **flat severity** (mixing a blocker with a typo).
- **Used too early** → kills an idea before it forms. **Role drift:** jumping to propose new options (Open's job) instead of auditing.

## Workflow positioning
| Attribute | Value |
|---|---|
| Tier | **Converge / Gate** — after there's a candidate, before commit |
| Priority | **HIGH & BLOCKING** when hard-to-reverse / money · patient-safety · schema · security |
| Fits problems | review a proposal/PR, risk assessment, verify a claim, design review |
| Trigger signal | a conclusion presented **as settled** + an action about to happen |

## Example
> Plan: "Cache the entire patient list in Redis for 24h to reduce DB load."
> Critic: ① implicit assumption "patients change little in 24h" (`Assumption`, load-bearing) — in reality admissions/discharges change constantly →
> **Blocker (stale → clinical error)**; ② missing evidence "the DB is the bottleneck" (`Speculation`) — resolve with p95 + slow-log;
> ③ edge: invalidation on update? (Major). **Verdict BLOCK (conf 80%)**. The most dangerous assumption = "24h is safe".

## Counter-example (anti-pattern)
> ❌ "The plan's OK-ish but variable names are bad, Redis sounds over-engineering, why not just Postgres…" → no ranking,
> no evidence, mixing taste (variable names = Minor) with real risk (stale = Blocker), and **jumping to propose new options** → the Critic drifts out of role.

## Coordination (LINK — no copy)
- Using 1/several modes + the order Open→Inversion→Critic→Synthesis → `core-synthesis-decision` §Orchestration.
- Challenging the USER's idea/decision in conversation (calibrated, no-quota) → `core-sparring-partner` (the anti-sycophancy critique owner).
- No fabricating file/symbol/field when auditing code → `core-verify-before-assert`.

## When to update
- When changing the scan-axis set, the severity scale, or the verdict definition. If the boundary with `core-sparring-partner`/`core-open-thinking` changes → update the "When NOT to use" section too.
