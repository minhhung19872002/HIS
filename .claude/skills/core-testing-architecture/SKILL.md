---
name: core-testing-architecture
description: Use this skill (portable, tech-agnostic) when deciding what kind of test to write and how to structure tests — choosing unit vs integration vs e2e vs contract, and keeping tests testable/deterministic/isolated. Triggers include "write a test for X", planning test coverage, or a flaky/slow test that needs the right level. Reusable across any web project. Do NOT use for a specific test runner's syntax (his-testing-* skills implement that).
metadata:
  type: project
---

# Core — Testing Architecture (portable)

> TIER: **A · CORE / A3 core-testing** (shared, NOT bound to a specific runner).

## Purpose
Choose the **right kind of test** + structure tests to be **testable / deterministic / isolated**. Testing principles
usable in any project (with any runner).

## When to use
- Deciding to write unit / integration / e2e / contract for a requirement.
- Planning coverage.
- A slow/flaky test that needs the right level.

## When NOT to use
- A specific runner's syntax (assertion API, run command) → the `his-testing-*` skill implements it.

## Test levels (pick the right level)
| Kind | Tests what | When |
|---|---|---|
| **Unit** | 1 unit of pure logic (function/rule), no I/O | many branches, easy to isolate |
| **Integration** | several components combined (e.g. service + data-access) | an internal flow across layers |
| **E2E** | end-to-end behavior through real UI/API | a critical user flow |
| **Contract** | the shape/contract between two sides matches | an FE/BE boundary or service ↔ service |

→ Prefer unit for logic; integration for flows; e2e for critical paths (few but high-value); contract at boundaries.

## Principles
1. **Deterministic**: no dependence on real time/randomness/run order → stable results.
2. **Isolated**: each test self-setups/teardowns, doesn't depend on another test or shared state.
3. **Test behavior, not implementation detail** (so a refactor doesn't wrongly break tests).
4. **Right level**: don't e2e what can be unit; don't unit what needs integration.
5. **Test name describes behavior** (given/when/then).

## Steps
1. Identify what to guarantee → pick the level.
2. Write an isolated, deterministic test with a clear name.
3. Critical paths (safety/financial/legal) → prioritize coverage.

## Anti-patterns to avoid
- A test depending on date/time/order (flaky).
- Testing implementation detail (breaks on refactor).
- Cramming everything into e2e (slow, hard to debug).

## Dependency
- Goes with `core-testing-reuse`. The system-tier testing skills (`his-testing-*`) **depend** on this skill (implemented with the project's real test runner).

## When to update
- When adding a general test-architecture principle.
