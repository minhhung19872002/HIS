---
name: core-inversion-thinking
description: Use this skill (portable, tech-agnostic) to apply INVERSION — instead of asking how to make a goal SUCCEED, ask what would GUARANTEE its failure / what would break the result, enumerate those failure-modes exhaustively, then map each back to a forward "avoid / ensure / test" directive and surface the non-obvious insight that only the reversed view reveals. Three modes: failure-inversion (pre-mortem), goal-inversion (backward-chaining from the desired end-state), assumption-inversion (assume the opposite of a load-bearing assumption). Triggers include "how do I make X definitely work", "what could break", "pre-mortem", a high failure-cost decision, a single dominant frame / success-only thinking, being stuck, or debugging "what causes this symptom". Do NOT use to audit a concrete artifact (core-critic), to generate many diverse options (core-open-thinking), or to choose/merge a final answer (core-synthesis-decision).
metadata:
  type: project
---

# Core — Inversion Thinking (inversion / pre-mortem engine)

> TIER: **A · CORE** (portable, tech-agnostic). One of the 4 systematic thinking modes — orchestration is
> **owned by `core-synthesis-decision` §Orchestration**; here it only links.

## Purpose
Instead of asking "how to make G **succeed**", invert the question: "what **guarantees ¬G** (failure / breaks the result)?"
then **design to avoid exactly those**. Mine the insight that only shows when viewed in reverse — catch failure-modes &
**non-obvious** paths that forward thinking misses. This is **1 transformation** (reframe), not breadth.

## When to use
- The goal is clear but the **path is non-obvious** OR the **failure cost is high**.
- **Consensus too fast** on one direction — no one has listed how it fails (success-only thinking).
- **Stuck** (forward thinking is exhausted); or **debugging** (invert from symptom to plausible cause).

## When NOT to use
- A simple, reversible, low-risk problem → inversion just adds noise.
- A complete failure-list already exists → switch to `core-critic` / act.
- Need to **assess the correctness of a concrete artifact** → `core-critic`.
- Need **many diverse new options** → `core-open-thinking` (inversion is just one reframe, not breadth).

## Required input
- **Mandatory:** the goal G **or** a plan/candidate P.
- **Should have:** stakes / failure-cost; the main load-bearing assumption; the desired end-state (for the backward mode).

## Internal process
1. State **G** (or P) clearly and "what success means".
2. **Pick the inversion mode:**
   - **A — Failure-inversion (pre-mortem):** "Assume it failed completely. What caused it?" → enumerate exhaustively.
   - **B — Goal-inversion (backward):** start from the end-state, ask backward "right before that, what MUST be true?" recursively to the present.
   - **C — Assumption-inversion:** take the load-bearing assumption, **assume the opposite is true**, see the consequences.
3. **Generate the inversion set exhaustively** (don't stop at 2–3 obvious ones).
4. **Map each inverted item back → 1 forward directive:** *avoid X* / *ensure Y* / *verify assumption Z*.
5. Filter the **non-obvious insight** — the thing that only appears from the reversed view.
6. Rank directives **by leverage** (which one prevents the most failures).

## Required output
- **Inversion list** (failure-modes / end-state-conditions / inverted-assumptions) — exhaustively enumerated.
- **Mapping table:** each inverted item → a forward directive (avoid/ensure/test).
- **Assumptions to break** (mode C).
- **Top non-obvious insight** that forward thinking missed.
- ⚠️ State clearly: *"this is a failure-map, NOT a judgment of a concrete artifact"* (boundary with `core-critic`).

## Failure modes (anti-patterns — don't do)
- **Mechanical/tautological inversion** ("don't do it wrong") → 0 insight.
- **Mistaking it for Critic:** starting to criticize a concrete artifact instead of reframing.
- **A scary failure list with no directive** → seeds fear, can't act.
- **Fake symmetry** (thinking "the opposite" is automatically true/useful); **perfectionism** (treating "avoid ALL failures" as feasible → paralysis); **over-apply** to a trivial problem.

## Workflow positioning
| Attribute | Value |
|---|---|
| Tier | **Reframe / Stress** — between diverge & converge; or when stuck |
| Priority | **MED-HIGH**, rises with failure-cost + single-frame level |
| Fits problems | high-risk decision, "how not to break it", debug, backward planning, breaking a fixed frame |
| Trigger signal | a **single dominant** thinking frame / success-only thinking, no one has listed the failure paths |

## Example
> G = "Roll out to 1000 users with **no downtime during peak hours**." Mode A — "what would CERTAINLY crash it at peak?":
> ① deploy at 8am; ② no rollback; ③ migration locks a hot table; ④ min-instances=0 (cold start); ⑤ no load-test; ⑥ small pool.
> Forward mapping: ①→deploy at 2am; ②→blue-green + 1-click rollback; ③→online/idempotent migration; ④→min-instances≥2; ⑤→load-test first; ⑥→increase pool + measure.
> **Hidden insight:** the biggest risk is the **deploy window + cold start**, which the forward plan never mentioned.

## Counter-example (anti-pattern)
> ❌ G="increase revenue" → "so don't decrease revenue, don't lose customers" → **mechanical, tautological** inversion, yields no
> concrete failure-mode, no leverage directive. Real inversion must produce **concrete, non-obvious** failure paths (e.g. "churn spikes in month 13 due to annual contracts").

## Coordination (LINK — no copy)
- Using 1/several modes + the order → `core-synthesis-decision` §Orchestration.
- After producing mitigation directives → audit with `core-critic`; need more new options → `core-open-thinking`.

## When to update
- When adding/removing an inversion mode or changing the back-mapping approach. If the boundary with `core-critic`/`core-open-thinking` changes → update "When NOT to use".
