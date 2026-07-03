---
name: core-architecture-consistency
description: Use this skill (portable, tech-agnostic) to keep new/changed code consistent with the project's EXISTING structure, naming and conventions instead of inventing new ones. Triggers include adding a feature, reviewing a diff for consistency, or noticing two parts of the codebase do the same thing differently. Reusable across any web project. Do NOT use for mechanics tied to a specific stack (his-* skills).
metadata:
  type: project
---

# Core — Architecture Consistency (portable)

> TIER: **A · CORE** (shared). Combines: consistency + scalability awareness.

## Purpose
Keep new code **consistent** with the project's **existing** structure/naming/convention/pattern — so the system stays uniform and maintainable as it grows.

## When to use
- Adding a feature → follow exactly how similar features are already done.
- Reviewing a diff for convention/pattern deviations.
- Spotting 2 places that do the same thing differently → standardize.

## When NOT to use
- Stack-specific mechanics → `his-*`.

## Principles
1. **Follow the existing pattern**: find the 1-2 nearest similar features/screens, do it the SAME way (folder structure,
   naming, file splitting, how layers are called).
2. **One way to do one thing**: don't create a 2nd way for the same purpose.
3. **Consistent naming**: follow the current convention, don't mix multiple styles.
4. **Scalability**: pick an approach that scales as the number of modules/features grows (no hard-coded limits,
   no pattern that only works for one case).
5. Do NOT invent a new convention when one already exists.

## Steps
1. Find the nearest precedent in the codebase.
2. Compare naming/structure/pattern.
3. Follow it; if you must deviate → state the reason clearly.

## Anti-patterns to avoid
- "A different style in each place" for the same thing.
- A new convention parallel to the old one.
- A non-scaling pattern (correct for only 1 case).

## Dependency
- Goes with `core-architecture-follow`, `core-refactor`. The `his-*` quality skills (e.g. anti-pattern) depend on this skill.

## When to update
- When adding a general consistency/scalability principle.
