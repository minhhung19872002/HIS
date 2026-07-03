---
name: core-accessibility-pattern
description: Use this skill (portable, tech-agnostic) when building or auditing any UI for accessibility — keyboard navigation, focus management, ARIA roles/labels, color contrast, form-field labels, screen-reader text, and reduced-motion. Triggers include adding a page/form/modal/table/chart, "make the UI accessible / a11y / WCAG", contrast/keyboard/focus issues, or a clinical screen used by staff with varied abilities. Reusable across any web project. Do NOT use for bundle/render performance (his-fe-performance) or stack-specific component mechanics (his-fe-page-v2 implements the concrete components).
metadata:
  type: project
---

# Core — Accessibility Pattern (portable, WCAG)

> TIER: **A · CORE** (portable, tech-agnostic). An a11y checklist applied to every UI. The HIS system is used all day
> by medical staff (nurses, doctors, cashiers, inspectors) → keyboard + contrast + clear labels are a practical requirement, not just compliance.

## When to use
- Adding/editing a page, form, modal/drawer, table, chart, or a clinical data-entry flow.
- There's feedback: hard to use by keyboard, faint text/poor contrast, screen reader reads wrong/missing.

## When NOT to use
- Bundle/re-render optimization → `his-fe-performance`.
- Concrete component mechanics (KpiStrip/DataTable/Drawer) → `his-fe-page-v2` (this skill only sets the a11y REQUIREMENT, it doesn't build the component).

## a11y checklist (apply when building/reviewing UI)

**Keyboard & focus**
- Everything doable with the mouse is doable by keyboard (Tab/Shift-Tab/Enter/Esc).
- A clickable element is a real `<button>`/`<a>` (or `role` + `tabIndex={0}` + an `onKeyDown` Enter/Space handler) — NOT an inert `div onClick`.
- Modal/Drawer: focus moves inside on open, Esc closes, focus returns to the trigger button on close, focus doesn't escape to the background (focus trap).
- Tab order follows reading order; no unintended focus trap.

**Semantics & screen reader**
- Semantic HTML: headings by level (`h1>h2>h3`), `<table>` for tabular data, a `<label>` with `htmlFor` for every input.
- An icon-only button must have an `aria-label`/`title` (e.g. Print/Delete/Edit in a row action).
- Dynamic state announced via `aria-live` (error/success toast, loading) so a screen reader hears it.
- An informative image has `alt`; a decorative image `alt=""`.

**Visual**
- Text/background contrast ≥ 4.5:1 (normal text), ≥ 3:1 (large text/icon) — check the design system's color tokens.
- Do NOT use COLOR as the only signal (e.g. a red warning must add text/icon — important for abnormal lab values).
- Respect `prefers-reduced-motion`: disable strong animation (blink, auto-scroll) when the user requests it.

**Form & errors**
- A validation error is attached to its field (`aria-invalid` + a message next to the field), not just a generic toast.
- A required field is clearly marked (text + `aria-required`), not just a colored asterisk.

## How to apply
1. Build the UI/route per `his-fe-page-v2` as usual.
2. Review against the checklist above (priority: keyboard + label + contrast).
3. Quick check: Tab through the screen by keyboard; 200% zoom doesn't break it; (optional) run axe DevTools.

## Pitfalls
- **Unlabeled icon-button** → the screen reader reads an empty "button"; HIS row actions often hit this.
- **Modal doesn't return focus** → a keyboard user is "lost" after closing.
- **Dark-theme contrast** — gray text on a dark background is often < 4.5:1; check the token, don't guess.
- **Over-ARIA** — adding redundant `role`/`aria-*` onto already-semantic HTML hurts more than it helps; prefer correct HTML first.

## When to update
- When raising the target WCAG level, changing color design tokens, or adding a new UI pattern (e.g. calendar, interactive chart).
