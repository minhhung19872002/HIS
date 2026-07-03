---
name: core-localization-pattern
description: Use this skill (portable, tech-agnostic) whenever adding user-facing text, to never hardcode strings and instead use translation keys with namespaces and fallback. Triggers include adding labels/messages/buttons, supporting multiple languages, or finding hardcoded text. Reusable across any web project. Do NOT use for a specific i18n library's API (his-* skills implement that).
metadata:
  type: project
---

# Core — Localization Pattern (portable)

> TIER: **A · CORE** (shared, tech-agnostic).

## Purpose
Don't hardcode user-facing text: use a **translation key + namespace + fallback** to support
multiple languages and centralize text edits.

## When to use
- Adding a label/message/button/placeholder shown to the user.
- Supporting multiple languages.
- Finding hardcoded text.

## When NOT to use
- A specific i18n library's API → the `his-*` skill implements it.
- A non-displayed constant (a code, a technical enum) — no need to localize.

## Principles
1. **Don't hardcode** displayed strings in logic/JSX/template.
2. **Key + namespace**: put text into a translation file/dictionary, call via the key; namespace by module/feature.
3. **Fallback**: missing key/language → have a fallback (e.g. the default language), don't show a raw key/blank.
4. **Reuse common keys** (Save/Cancel/Delete buttons…) instead of creating synonym-duplicate keys.
5. **Displayed config values** (organization name, address…) go into a constant/config, not scattered hardcoded.

## Steps
1. Identify the displayed text.
2. Create/reuse a key in the appropriate namespace.
3. Call via the project's translation mechanism; ensure a fallback exists.

## Anti-patterns to avoid
- Hardcoding displayed strings.
- Synonym-duplicate keys scattered around.
- Showing a raw key when a translation is missing.
- Hardcoding the organization name/URL in the UI instead of a constant/config.

## Dependency
- Goes with `core-error-loading-state` (error/empty messages must also be localized). The `his-*` UI skills depend on it.

## When to update
- When adding a general localization principle.
