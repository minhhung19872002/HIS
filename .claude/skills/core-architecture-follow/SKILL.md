---
name: core-architecture-follow
description: Use this skill (portable, tech-agnostic) when adding or changing code that crosses architectural layers, to respect layer boundaries, dependency direction and module boundaries of whatever architecture the project uses. Triggers include adding a feature touching multiple layers, deciding where a piece of logic belongs, or keeping dependencies pointing the correct way. Reusable across any web project. Do NOT use for project-specific stack mechanics (those live in his-* skills).
metadata:
  type: project
---

# Core — Architecture Follow (portable)

> TIER: **A · CORE** (shared, tech-agnostic). Does NOT name a specific framework/DB/lib.

## Purpose
Keep code in the right layer + dependencies pointing the right direction + respect the module boundary of **whatever
architecture the project uses** (regardless of what it is). Principles, not technology-bound.

## When to use
- Adding/editing code that touches **multiple layers**.
- Unsure "which layer/module this logic belongs to".
- Reviewing whether a dependency points the wrong way.

## When NOT to use
- Stack-specific mechanics (framework scaffold, ORM, routes…) → use the matching `his-*` skill.

## Principles (apply to any architecture)
1. **Identify the project's actual layers first** (read the structure), do NOT impose a pre-made template.
2. **One-way dependency**: the inner layer (domain/core) does NOT depend on the outer layer (UI/infra). Outer depends
   on inner, not the reverse.
3. **Logic in the right place**: business rules in the domain/service tier, not crammed into UI/controller; data
   access in the data-access tier, not scattered everywhere.
4. **Module boundary**: don't let module A reach straight into module B's internals; go through a public contract/interface.
5. **Respect what exists**: do NOT change the architecture/structure "to make it nicer".

## Steps
1. Read the structure + identify the current layers/modules.
2. Map the requirement → which layer is responsible for what.
3. Put the code in the right layer; only add dependencies in the correct direction.
4. If you must cross a boundary → go through an interface/contract (see `core-types-contract`).

## Anti-patterns to avoid
- Business logic in UI/controller.
- An inner layer importing an outer layer.
- A module reaching into another module's internals.
- Refactoring the architecture when the requirement doesn't ask for it.

## Dependency
- Usually goes with `core-reusable-code`, `core-architecture-consistency`.
- The `his-*` skills (backend/frontend scaffold) **depend** on this skill to know where to place code.

## When to update
- When the project's architecture changes (adding/removing a layer) — but since this is portable core, only update the
  principle wording, don't add stack detail here.
