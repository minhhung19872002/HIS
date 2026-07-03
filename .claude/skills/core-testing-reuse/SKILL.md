---
name: core-testing-reuse
description: Use this skill (portable, tech-agnostic) when writing tests, to reuse test helpers/fixtures/builders/mocks instead of copy-pasting setup, and to think about regression coverage. Triggers include adding tests, noticing duplicated test setup/mock/fake-data, or planning regression after a fix. Reusable across any web project. Do NOT use for a specific runner's mocking API (his-testing-* skills implement that).
metadata:
  type: project
---

# Core — Testing Reuse (portable)

> TIER: **A · CORE / A3 core-testing** (shared). Combines: test-reuse + mock-data-builder + regression.

## Purpose
Reuse test setup (helper/fixture/builder/mock/seed) instead of copy-paste; think about **regression** after every
fix. A portable principle.

## When to use
- Writing a new test (reuse existing setup).
- Seeing duplicated setup/mock/fake-data.
- After a bug fix → add a regression test to prevent recurrence.

## When NOT to use
- A specific runner's mock/fixture API → the `his-testing-*` skill implements it.

## Principles
1. **Reuse setup**: use existing helper/fixture/builder/seed/mock; if none exists and it'll be reused → create it in a shared test util.
2. **Builder/fixture for data**: create test data via a builder/factory (parameterized) instead of repeated hardcode.
3. **Shared mocks**: API mock / auth mock in one place, reused — not redefined per test.
4. **Regression-first after a bug**: every bug fix carries a test reproducing the bug (red before fix, green after fix).
5. **No copy-paste** of setup/mock/fake-data between tests.

## Steps
1. Before writing a test → find an existing helper/fixture/builder/mock.
2. Reuse / extend; create in shared if missing.
3. Bug fix → add a regression test.

## Anti-patterns to avoid
- Copy-pasting a setup/mock block across many tests.
- Hardcoding repeated fake-data instead of a builder.
- Fixing a bug without adding a recurrence-blocking test.

## Dependency
- Goes with `core-testing-architecture`. The `his-testing-*` skills **depend** on this skill.

## When to update
- When adding a general test-reuse/regression principle.
