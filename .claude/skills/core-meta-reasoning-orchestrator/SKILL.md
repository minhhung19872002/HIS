---
name: core-meta-reasoning-orchestrator
description: Use this skill (portable, tech-agnostic) as the META-REASONING ORCHESTRATOR — the reasoning preamble that, for a NON-TRIVIAL problem, (1) classifies the problem type (information-retrieval / explanation / design / architecture / planning / decision-making / risk-assessment / troubleshooting / research / security-review / optimization), (2) gauges impact LOW/MEDIUM/HIGH, (3) dispatches to the right thinking skills + techniques, (4) names load-bearing assumptions (which-if-wrong-collapses), (5) produces ≥1 alternative explanation/model, (6) states confidence. Triggers include a design/architecture/decision/planning/security/optimization/troubleshooting/research problem, "how should I design/approach this", "which option to pick", "what are the risks", "analyze this for me", or any reasoning-heavy question where the approach is not obvious. Do NOT use for trivial/execution tasks (LOW impact → answer directly) or for which-skill-for-a-CODE-task routing (SKILL-MAP.md); for the ORDER of the four thinking modes see core-synthesis-decision §Orchestration.
metadata:
  type: project
---

# Core — Meta-Reasoning Orchestrator (classify the problem → activate the right way to think)

> TIER: **A · CORE** (portable, tech-agnostic). The **reasoning layer ABOVE** the 4 thinking modes
> (`core-open-thinking` · `core-inversion-thinking` · `core-critic` · `core-synthesis-decision`).
> **Composes, does NOT replace** `SKILL-MAP.md` (the skill-for-code-task router) or `workflow/workflow.md` (the pipeline).
> The 4-mode order = **owned by `core-synthesis-decision` §Orchestration** (here it only links).

## Purpose
For a **reasoning-heavy** problem, automatically: **classify → gauge impact → pick the right thinking set → extract assumptions
→ produce ≥1 alternative model → rate confidence**. Counters 2 symmetric errors: *using a sledgehammer for a trivial thing* (over-think) and
*answering shallowly for a HIGH problem* (under-think). The regulating valve = **impact level**.

## When to use
- A Design · Architecture · Decision · Planning · Risk · Security · Optimization · Troubleshooting · Research problem **where the approach isn't obvious**.
- A question like "how should I design/pick/do", "what are the risks", "analyze/assess this for me".

## When NOT to use
- A **LOW/trivial/clear-execution** task (UI/format fix/small bug, an execution command) → answer directly, skip the ritual.
- Picking **which skill for a code task** → `SKILL-MAP.md` (a different-layer router). Running the **pipeline** → `workflow/workflow.md`.
- Just need the **call order of the 4 thinking modes** → `core-synthesis-decision` §Orchestration.

## 6-step process (calibrated by impact)
1. **Classify the problem** (may be multi-type) — per the Dispatch table below. State the type(s) clearly.
2. **Gauge impact:** **LOW** (small bug/UI/format) · **MEDIUM** (feature/module/workflow) · **HIGH** (architecture/security/data/cost/scalability). → decide the **depth** (Calibration table).
3. **Dispatch** to the matching skill + technique (Dispatch table). Call the right skill, don't call extras.
4. **Extract assumptions:** list the assumptions in use; mark **which assumption, if WRONG, would COLLAPSE the conclusion** (load-bearing). *(= the core of `core-critic`.)*
5. **≥1 alternative explanation/solution model** — don't lock onto one direction. *(= the core of `core-open-thinking`.)*
6. **Confidence:** the conclusion + **confidence %** + classify the arguments `Fact / Assumption / Speculation`.

## Calibration — impact decides depth
| Impact | What step 3 runs | Steps 4-6 |
|---|---|---|
| **LOW** | skip the ritual; at most state 1 main assumption + confidence | reduced |
| **MEDIUM** | 1-2 relevant thinking skills (per Dispatch) | full steps 4-6 |
| **HIGH** | full chain **Open→Inversion→Critic→Synthesis**; a Production change → wrap with `core-prod-change-discipline` | full + clear alt-model + decision-reversal trigger |

## Dispatch — 11 problem types → skill (home) + technique (inline → `references/technique-catalog.md`)
| Type | Default impact | Home skill | Technique (catalog) |
|---|---|---|---|
| Information Retrieval | LOW | `core-verify-before-assert` | — (answer directly, verify the source) |
| Explanation | LOW | — | analogy · first-principles (light Open) |
| Design | MEDIUM | `core-open-thinking` → `core-synthesis-decision` | Alternative Designs |
| Architecture | **HIGH** | `core-inversion-thinking` + `core-critic` → `core-synthesis-decision` | Failure-Mode · Second-order Effects · Scalability Review (`his-be-scalability`) |
| Planning | MED-HIGH | `core-impact-analysis` + `core-inversion-thinking` | Dependency · Risk · Bottleneck Detection |
| Decision Making | MED-HIGH | `core-critic` + `core-synthesis-decision` (+ `core-sparring-partner` if it's the USER's decision) | Counterargument · Tradeoff Analysis · Base-Rate Thinking |
| Risk Assessment | **HIGH** | `core-inversion-thinking` + `core-critic` | Failure-Mode · Risk Analysis |
| Troubleshooting | MEDIUM | `core-inversion-thinking` (invert symptom→cause) + `core-verify-before-assert` | hypothesis-elimination · Failure-Mode |
| Research | MEDIUM | `core-open-thinking` + `core-critic` | source-triangulation · (built-in `deep-research`) |
| Security Review | **HIGH** | `core-inversion-thinking` + `core-critic` + `his-qa-anti-pattern` | Red-Team · Attack-Surface · Threat-Modeling · (built-in `security-review`) |
| Optimization | MED-HIGH | `core-critic` (measure-first) + `his-fe-performance` / `his-be-scalability` | Bottleneck Detection · Base-Rate (typical wins) |

## Required output (every reasoning-heavy answer MUST have — use as a review checklist)
```
[Classification] <type> · Impact: LOW/MEDIUM/HIGH
[Skills activated] <skill/technique> + why
[Analysis] <results from the skills run>
[Assumptions] load-bearing: <…> | if-wrong-collapses: <…>
[Alternative model] ≥1: <…>
[Confidence] <conclusion> — confidence X% (Fact/Assumption/Speculation)
```
LOW impact is reduced to 3 lines (Classification · Conclusion · Confidence).

## Pitfalls (anti-patterns)
- **Over-think LOW:** running the full chain for a format task → kills velocity. (The impact valve exists to block this.)
- **Phantom dispatch:** calling a "skill" that doesn't exist (Threat-Modeling…) → these are **techniques**, not skills; use them inline.
- **A 2nd router:** encroaching on `SKILL-MAP`/`workflow.md`. This skill picks the **way to think**, not the code-skill/flow.
- **Empty confidence:** writing "confidence 90%" without Fact/Assumption/Speculation → meaningless.
- **Forgetting Step 5:** giving a single conclusion, no alternative model → anchoring.

## Example (HIGH — Architecture + Optimization)
> "The revenue report runs 40s — should we switch to a materialized view?"
> **[Classification]** Optimization + Architecture · **Impact HIGH** (data/scalability).
> **[Dispatch]** Critic (measure-first: is the 40s from the query or the render? is there an index?) → Inversion (what breaks the MV: **report data diverges from reality when the MV refreshes late** → wrong financial figures) → Scalability (`his-be-scalability`) → Synthesis.
> **[Assumptions]** load-bearing: "the user accepts data stale until the next refresh"; if WRONG (needs realtime) → MV **collapses** the choice.
> **[Alternative model]** ① index + query rewrite (keep realtime) · ② read-replica · ③ 5' cache with invalidation · ④ nightly MV refresh.
> **[Confidence]** Try ① (index) first, re-measure; MV only if ① isn't enough and the business accepts lag — confidence 70% (Assumption: haven't seen the real query plan).

## Coordination (LINK — no copy)
- The call order of the 4 modes + how-many-skills → `core-synthesis-decision` §Orchestration.
- Challenging the USER's idea/decision (calibrated) → `core-sparring-partner`. Anti-hallucination when asserting → `core-verify-before-assert`.
- A Production change → `core-prod-change-discipline` (≥3 options · self-critique · gate · 7-part report).

## Reference
- `references/technique-catalog.md` — a short definition of each technique + its skill-home (Base-Rate, Tradeoff, Threat-Modeling, Bottleneck…).

## When to update
- When adding/removing a problem type, changing the type→skill map, or changing the calibration threshold. If the 4-mode order changes → edit it in `core-synthesis-decision` (do NOT edit here).
