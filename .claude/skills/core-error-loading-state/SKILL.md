---
name: core-error-loading-state
description: Use this skill (portable, tech-agnostic) when building any data-driven UI, to always handle loading, empty, error and success states plus user feedback. Triggers include adding a page/list/form/dialog that fetches or submits data, or fixing a screen that shows blank/spinner-forever/silent failure. Reusable across any web project. Do NOT use for stack-specific UI components (his-* skills implement them).
metadata:
  type: project
---

# Core — Error / Loading / Empty State (portable)

> TIER: **A · CORE** (shared, tech-agnostic).

## Purpose
Every UI that fetches/sends data MUST handle all **4 states**: loading · empty · error · success, with clear feedback
to the user. Never leave a blank screen / forever-spinner / silent failure.

## When to use
- Adding a page/list/form/dialog with a fetch or submit.
- Fixing a screen that's blank / endless loading / fails without notice.

## When NOT to use
- A lib-specific UI component → the `his-*` skill (page/component) implements it.

## Principles — 4 states
1. **Loading**: show a spinner/skeleton while loading; don't leave a meaningless blank screen.
2. **Empty**: empty data → show a clear "no data yet" message, do NOT leave it blank like an error.
3. **Error**: fetch/submit fails → notify the user (toast/message) + do NOT show mock/fake data;
   log at the appropriate level (warn for an expected error), do NOT swallow errors silently.
4. **Success**: render the data; for an action (submit) → success feedback.
5. **Consistent feedback**: use the project's shared notification/confirm mechanism, don't invent a different one per place.

## Steps
1. Identify the data source + the possible states.
2. Render the correct loading/empty/error/success branch.
3. A destructive/sensitive action → confirm first.
4. Error → notify + fallback handling (empty state), no crash, no mock.

## Anti-patterns to avoid
- A blank screen on loading/empty (indistinguishable from an error).
- A forever-spinner from not handling the error branch.
- Silent failure / swallowed error.
- Showing mock data when the API fails (misleading).

## Dependency
- Goes with `core-localization-pattern` (messages not hardcoded). The `his-*` skills (page/form) depend on this skill.

## When to update
- When adding a general state/feedback principle.
