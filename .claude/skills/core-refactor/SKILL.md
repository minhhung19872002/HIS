---
name: core-refactor
description: Use this skill (portable, tech-agnostic) when refactoring, cleaning up, extracting shared code, improving naming/readability, or reducing tech debt — without changing behavior. Triggers include "refactor X", "clean up X", "extract shared", "split a function/file", removing dead code, or reducing duplication. Reusable across any web project. Do NOT use to change architecture or add features.
metadata:
  type: project
---

# Core — Refactor (portable)

> TIER: **A · CORE** (shared). Combines: clean-code, maintainability, extract-shared, dependency-cleanup, performance-awareness.

## Purpose
Safe refactor: **preserve behavior**, improve readability/maintainability, extract shared, pay down debt.

## When to use
- "refactor / clean up / split / consolidate" code.
- Extracting repeated logic into shared.
- Renaming for clarity, splitting a too-large function/file, removing dead code/unused dependencies.

## When NOT to use
- Adding a new feature (that's code-gen).
- Changing architecture/structure (forbidden — see `core-architecture-follow`).

## Principles
1. **Behavior-preserving**: before/after the refactor, behavior + tests must be identical. With tests, keep them GREEN.
2. **Reuse first** (see `core-reusable-code`): extract shared instead of copying.
3. **Clean code**: clear names, single-responsibility functions, files not too large, separate concerns.
4. **Maintainability > performance** (unless there's a clear requirement/measurement). Performance-awareness: avoid
   obvious O(n²), N+1, but do NOT micro-optimize at the cost of readability.
5. **Dependency cleanup**: remove unused imports/dependencies; don't add surplus dependencies.
6. **Narrow scope**: refactor only what was requested; no "while-I'm-here" sprawling edits.

## Steps
1. Understand the current behavior (read + tests if any).
2. Identify what to improve (duplication / names / size / coupling).
3. Refactor in small steps; run tests after each step.
4. Verify behavior is unchanged.

## Anti-patterns to avoid
- Refactoring that changes behavior without saying so.
- Refactoring sprawling beyond the requested scope.
- Changing the architecture in the name of "refactor".
- Micro-optimization that hurts readability.

## Dependency
- Goes with `core-reusable-code`, `core-architecture-consistency`. The `his-*` quality skills depend on this skill.

## When to update
- When adding a general clean-code/refactor principle.
