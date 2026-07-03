---
name: core-synthesis-decision
description: Use this skill (portable, tech-agnostic) for the CONVERGENCE / closing step — synthesize divergent options (open-thinking) + audit findings (critic) + failure-maps (inversion) into ONE defensible decision: define decision criteria, score candidates by win-condition, graft the best ideas from runners-up, then state the chosen option + rationale + residual risks + confidence. It is ALSO the canonical OWNER of how the four thinking modes orchestrate (when to use 1/2/3/4 skills, and the order Open→Inversion→Critic→Synthesis). Triggers include "settle the approach", "which one to pick", closing a design/architecture decision after exploration, or needing to combine multiple analyses into a single action. Do NOT use to generate options (core-open-thinking), to audit one artifact (core-critic), or to pre-mortem / reverse the framing (core-inversion-thinking).
metadata:
  type: project
---

# Core — Synthesis & Decision (convergence / decision-closing + orchestration)

> TIER: **A · CORE** (portable, tech-agnostic). The **SINGLE OWNER** of §Orchestration for the 4 thinking modes
> (`core-open-thinking` · `core-inversion-thinking` · `core-critic` · this skill) — elsewhere only **LINKS** (`../../REGISTRY.md`).

## Purpose
Close the diverge-evaluate phase: merge **options** (Open) + **findings** (Critic) + **failure-map** (Inversion) into
**1 defensible decision** — with criteria, rationale, residual risk, confidence. Don't generate more options,
don't re-audit from scratch; **choose + graft + close**.

## When to use
- There are **≥2 options** (or 1 option + findings/failure-map) and you need to **decide/act**.
- The end of a design/architecture round after widening + stressing + auditing.
- Need to **merge multiple analyses** (many agents/many lenses) into one unified conclusion.

## When NOT to use
- No option yet → `core-open-thinking` first.
- Need to find errors in a concrete artifact → `core-critic`; need a pre-mortem → `core-inversion-thinking`.
- A trivial/reversible decision → just decide, no skill needed.

## Required input
- **Mandatory:** an option set **or** (option + findings/failure-map); the goal + hard constraints.
- **Should have:** decision criteria (if none → derive from constraints + win-condition); stakes/reversibility.

## Internal process
1. **Normalize input:** list the options + attach the relevant findings (Critic) & failure-modes (Inversion) per option.
2. **Derive decision criteria** (from hard constraints + win-condition + risk) — 3–6 criteria, rough weights.
3. **Score** each option by the criteria; eliminate options violating a hard constraint / with an unresolved Blocker.
4. **Graft:** take the best ideas from the runner-up into the leading option (if compatible).
5. **Decide:** state the chosen option + **why it wins** + **why** the others were eliminated.
6. **Residual risk + decision-reversal conditions** ("if X happens, reselect Y") + **confidence**.

## Required output
- **Decision table:** option × criteria (scores) + elimination reasons.
- **Chosen option** + the grafted version (if any) + rationale.
- **Residual risk** + **decision-reversal trigger** + **confidence %**.
- Classify `Fact / Assumption / Speculation` for the key arguments.

## Failure modes (anti-patterns — don't do)
- **Fake convergence:** choosing by gut, no criteria, no elimination reason.
- **Averaging** (merging all options into a bland hybrid that loses the win-condition).
- **Ignoring a Critic Blocker** to pick a pretty option; **deciding before there are enough options** (Open first).
- **Hanging decision** (listing forever without deciding) — violates the skill's very purpose.

## Workflow positioning
| Attribute | Value |
|---|---|
| Tier | **Final-converge / Close** — after Open(+Inversion+Critic) |
| Priority | **HIGH** when there's enough input to decide; **0** with no option yet |
| Fits problems | settling architecture/strategy, merging multiple analyses, producing action |
| Trigger signal | ≥2 options (or options + findings) + pressure to decide |

## §Orchestration — coordinating the 4 thinking modes (OWNER; elsewhere only links)

### Comparison table
| Criterion | 🟢 open-thinking | 🟡 inversion-thinking | 🔴 critic | 🔵 synthesis-decision |
|---|---|---|---|---|
| Goal | widen the orthogonal option set | reframe → find what FAILS | audit one existing artifact | merge + close one decision |
| Target | the solution space | goal / problem frame | one existing artifact | option set + findings |
| Direction | diverge-create | turn 180° (one transform) | converge-break | converge-close |
| Timing | start (framing) | middle (stress / when stuck) | end-before-commit (gate) | end (close) |
| Output | ≥N models + trade-off + decision-driver questions | failure-map + forward directive | severity-ranked findings + verdict | decision table + chosen option |
| Misuse risk | diverge without closing, fake breadth | mechanical inversion, paralysis | nihilism, bikeshedding | fake convergence, averaging |
| Priority | MED-HIGH when new; LOW when settled | MED-HIGH by failure-cost | HIGH/BLOCKING when hard-to-reverse | HIGH when there's enough input |

### How many skills?
- **1 skill:** Critic only (have an artifact, about to commit) · Inversion only (clear goal, high risk, pre-mortem / when stuck) · Open only (new problem, generating ideas) · Synthesis only (options already exist, just need to close).
- **2 skills:** Open→Critic (generate then prune — most common) · Open→Inversion (generate then stress/break the frame) · Inversion→Critic (pre-mortem → audit the mitigation) · {any}→Synthesis (close the decision).
- **3–4 skills (high-stakes / new / hard-to-reverse):** the full chain.

### Optimal order: **Open → Inversion → Critic → Synthesis**
1. **Open** widens (adding options early is cheapest). 2. **Inversion** stresses + breaks frame-assumptions (catch frame-level errors before expensive evaluation). 3. **Critic** audits the best-framed candidate (expensive evaluation → save it for last). 4. **Synthesis** closes.
> Critic goes **last-before-closing** because critiquing an option that'll be eliminated is wasteful, and critiquing *before* inversion misses frame-level errors.

### Loop & coordination anti-patterns
- Critic yields **BLOCK + a frame-level error** → go back to **Open** (regenerate), don't patch in place. There's already an artifact (don't generate new) → skip Open: **Inversion→Critic→Synthesis**.
- ❌ Critic **first** on an anchored idea (locally optimizing a wrong frame) · ❌ Open **after** deep resource commitment (churn) · ❌ running Critic & Open **in parallel** on the same artifact (one kills, one multiplies → conflict; must be sequential) · ❌ all 4 for a **trivial** decision.
- Dynamic priority: ↑hard-to-reverse→raise Critic (blocking) · ↑new/vague→raise Open · ↑failure-cost+single-frame→raise Inversion.

## Example
> After Open (5 ways to sync LIS) + Inversion (failure: depends on 1 vendor, loses records when the network drops) + Critic (HL7 listener: Major — needs a buffer/ack):
> Synthesis derives criteria {machine-type-count, has-HL7, reliability, maintenance-cost}; scores → chooses **HL7 listener + a buffer queue** (grafts the "file-drop fallback" idea from the runner-up for old machines).
> Residual risk: a vendor isn't HL7-compliant → reversal trigger: if >30% of machines lack HL7 → switch to Middleware (Mirth). Confidence 75%.

## Counter-example (anti-pattern)
> ❌ "All 5 ways are good, let's build a hybrid of all of them to be safe." → **averaging**: the merge loses the win-condition, the system carries 5 mechanisms,
> no criteria, no elimination reason, no residual risk → an indefensible decision.

## When to update
- When changing the criteria/scoring, OR adding/removing a thinking mode / changing the orchestration order (edit **HERE**; elsewhere only update the link).
