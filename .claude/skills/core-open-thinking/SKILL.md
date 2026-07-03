---
name: core-open-thinking
description: Use this skill (portable, tech-agnostic) for DIVERGENT thinking — widen the solution space by generating multiple FUNDAMENTALLY DIFFERENT (orthogonal) solution models through distinct lenses (first-principles, cross-domain analogy, constraint-relax, constraint-tighten, opposite, hybrid, do-nothing/minimal), to break anchoring on the first idea; it explicitly does NOT pick a winner — it hands off the option set + trade-off axes + decision-driver questions to convergence. Triggers include "how should I approach this", "what are the options", architecture/strategy choices, brainstorming, a novel/ill-defined problem, or only ONE option on the table (premature convergence / anchoring). Do NOT use to audit an existing artifact (core-critic), to reverse the framing (core-inversion-thinking), to choose/merge among options (core-synthesis-decision), or when the answer is genuinely constrained to one correct path.
metadata:
  type: project
---

# Core — Open Thinking (divergent thinking)

> TIER: **A · CORE** (portable, tech-agnostic). One of the 4 systematic thinking modes — orchestration is
> **owned by `core-synthesis-decision` §Orchestration**; here it only links.

## Purpose
Widen the **solution space:** generate multiple models that are **fundamentally different** (not variants), counter
**anchoring** on the first direction, keep the problem open long enough for a genuinely valuable choice. Goal = **breadth +
orthogonality**, NOT picking a winner (that's `core-synthesis-decision`'s job).

## When to use
- A **new / vague / many-soft-constraint** problem with no obvious solution.
- **Only ONE option** on the table for a problem that should have several → premature convergence.
- Detecting **anchoring** (latching onto the first/loudest idea); before a long-term **architecture/strategy** decision.

## When NOT to use
- The solution is **constrained to one correct path** (a mandatory security/legal requirement) → widening = waste.
- A good-enough option set exists, need to **decide** → `core-synthesis-decision`.
- Need to **audit** an artifact → `core-critic`; need **pre-mortem/reframe** → `core-inversion-thinking`.
- Clear, reversible execution → just do it.

## Required input
- **Mandatory:** the problem stated as a question.
- **Should have:** **hard vs soft** constraints (separated); the anchored option (to deliberately break away from); a divergence budget (need ≥ N models).

## Internal process
1. **Reframe** the problem as an open question; **remove the default solution** that's anchoring.
2. Generate options through **multiple orthogonal lenses** (force diversity, don't self-clone one idea):
   first-principles · cross-domain analogy · relax constraints · tighten constraints · do the opposite · hybrid · do-nothing/minimal.
3. Each model: **1 core sentence** + **win-condition** ("in what world does it win").
4. **Dedup/merge** near-duplicate models; **flag "fake breadth"** (N ideas that are just 1 idea in new clothes).
5. **Cluster** by underlying strategy; ensure ≥ N genuinely different **families**.
6. **Do NOT pick a winner** — state the **decision-driver questions** + the shared **trade-off axes**.

## Required output
- **≥ N orthogonal models:** name · 1-line core · **win-condition** · rough cost/complexity.
- **Trade-off axes** (e.g. speed↔durability, simple↔flexible).
- **Decision-driver questions** (answering them eliminates options).
- **Fake-breadth flag** if any model was merged.
- ⚠️ State clearly: *"not chosen yet — handed to the convergence tier (`core-critic` / `core-synthesis-decision`)"*.

## Failure modes (anti-patterns — don't do)
- **Divergence without convergence** (spawning endless options, no handoff → analysis paralysis).
- **Fake breadth** (junk options to hit a count; N of the same idea with tweaked params).
- **Dropping hard constraints** → a pretty but infeasible option.
- **Using it when the answer is forced-to-1** → burns time.

## Workflow positioning
| Attribute | Value |
|---|---|
| Tier | **Diverge** — start of the cycle, at framing & option-generation, before commit |
| Priority | **MED-HIGH** when new/open; **LOW** when the right direction is settled |
| Fits problems | ill-defined/new problem, architecture choice, brainstorm, breaking anchoring, innovation |
| Trigger signal | only **one** solution on the table for a problem that should have several |

## Example
> "Sync LIS results into HIS" (anchored: "write 1 service polling the LIS machine's DB"). Open → 5 orthogonal models:
> ① **HL7 listener** (wins when the machine supports HL7) · ② **DB polling** (old machine has only a DB, accepts lag) · ③ **File-drop watcher**
> (machine exports files, poor infra) · ④ **Vendor REST webhook** (modern machine, stable network) · ⑤ **Off-the-shelf middleware (Mirth)**
> (many machine types). Axes: standardization↔integration-cost, realtime↔simplicity. Decision-driver: "How many machine models? HL7 or not?" → **not chosen, handed to convergence.**

## Counter-example (anti-pattern)
> ❌ "5 options": ① poll 5s · ② poll 10s · ③ poll with cache · ④ multi-threaded poll · ⑤ poll + log → **fake breadth**:
> all 5 are *one* model (polling) with tweaked params, no orthogonal lens → Open drifts, still stuck in the anchored frame.

## Coordination (LINK — no copy)
- Using 1/several modes + the order → `core-synthesis-decision` §Orchestration.
- After widening: stress with `core-inversion-thinking`, audit with `core-critic`, decide with `core-synthesis-decision`.

## When to update
- When adding/removing a divergence lens or changing the definition of "orthogonal". If the boundary with other modes changes → update "When NOT to use".
