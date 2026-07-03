---
name: core-ui-aesthetics
description: Use this portable, tech-agnostic skill when generating, refactoring, or reviewing any UI to give it deliberate aesthetic taste and visual polish — above generic "AI-slop" output — WITHOUT sacrificing usability, accessibility, or performance. Triggers include building/editing a page, screen, component, form, table, dashboard, modal, or landing page; a "make it look better / more tasteful / less generic / more polished / more pro" request; or reviewing a UI diff for visual quality. Encodes craft principles (spacing scale & rhythm, typographic hierarchy, restrained color palette & contrast, alignment/grid, clear visual hierarchy with one focal action, consistency via design tokens, restraint/anti-clutter, domain-appropriate density, polished interaction states & subtle motion, microcopy tidiness) plus a UX guardrail (aesthetics never override legibility, contrast/WCAG, touch targets, focus/keyboard, affordance, or speed) and a pre-build + self-review "taste" checklist to avoid settling for the first generic layout. Tech-agnostic — bind to the project's design system (token CSS + component kit) when one exists. Do NOT use for accessibility mechanics alone (core-accessibility-pattern), bundle/render performance (his-fe-performance), or library selection (his-fe-library-policy); pair with the stack's UI skill (e.g. his-fe-page-v2 / his-fe-convention).
metadata:
  type: core
---

# Core — UI Aesthetics & Visual Taste (portable)

> TIER: **A · CORE** (portable, tech-agnostic, NO tier token). Raise UI from **"generic / AI-slop"**
> to **tasteful** — WITHOUT harming the experience (usability/a11y/perf). Applies to any project/stack.

## Spirit (anti "AI-slop")
AI defaults to **mass-produced** UI: many boxes/borders, arbitrary spacing, faint hierarchy, garish colors.
"Taste" = **intent + restraint + consistency**, NOT accepting the first generic layout. Beauty serves **clarity**,
not decoration. Golden rule: **"remove until it breaks"**.

## When to use
- Creating/editing/reviewing any UI: page, screen, component, form, table, dashboard, modal, landing.
- A "make it nicer / tasteful / less generic / more pro" request.

## When NOT to use
- A11y mechanics only → `core-accessibility-pattern`. Render/bundle performance → `his-fe-performance`.
- Library selection → `his-fe-library-policy`. BE code → `his-be-*`.

## 10 craft principles (apply when building UI)
1. **Spacing on a scale** — use a scale (4/8px…), NOT arbitrary odd numbers. Generous whitespace; **proximity**: close = related, far = grouped apart. Keep vertical rhythm.
2. **Typographic hierarchy** — a limited size scale (e.g. 12/14/16/20/28), hierarchy via **size/weight/color** not many fonts; line-height 1.4–1.6; line-length 45–80 chars.
3. **Restrained color** — 1 primary + neutral + semantic (ok/warn/crit/info); ratio ~**60/30/10**; color **carries meaning**, not decoration; avoid garish gradients/shadows.
4. **Alignment & grid** — everything snaps to the grid, edges aligned, optical alignment when needed.
5. **Visual hierarchy** — each view has **one focal action** (primary) standing out; secondary dimmed (ghost/link); use size/contrast/position to guide the eye.
6. **Consistency = design tokens** — reuse tokens/variables (radius, shadow, border, color, spacing) + existing components; NO one-off styles.
7. **Restraint (anti-clutter)** — fewer borders/boxes (use spacing + a faint background to group), **subtle** shadows/dividers; remove surplus icons/emoji/rules.
8. **Domain-appropriate density** — a business/clinical app = **dense, efficient** (like the `ab-*` terminal); landing/consumer = airy. Match the product, don't import an off-domain style.
9. **States & motion** — clear hover/focus/active/disabled; loading = skeleton/spinner; empty has guidance; transitions **150–250ms ease**, purposeful (no animation that delays an action).
10. **Microcopy & pixels** — short clear labels, consistent casing, icons baseline-aligned with text, tidy to the pixel.

## UX guardrail — aesthetics must NOT be traded off (MANDATORY)
- **Contrast/legibility** (WCAG AA: text ≥ 4.5:1) — NO faint-gray-on-light text "for looks".
- **Touch targets** ≥ 40px, **focus/keyboard** clearly visible, **affordance** (a button looks clickable).
- **Performance** (no heavy animation/shadow causing jank), **don't break familiar patterns** (button positions, flows) just to be different.
- Torn between "trendy pretty" and "clear & usable" → **choose clarity** (pair `core-accessibility-pattern`, `core-error-loading-state`).

## "Taste" checklist (before building + self-review before reporting done)
- [ ] Clear hierarchy? Exactly **1 focal action**? Secondary dimmed?
- [ ] Spacing on a scale? Enough whitespace? Grouped by proximity (fewer borders)?
- [ ] Restrained palette (≤1 primary + neutral + semantic)? Contrast meets AA?
- [ ] Every edge aligned to the grid? Typography ≤ 4–5 levels?
- [ ] Reuse tokens/components (consistent radius/shadow/border)? No one-off styles?
- [ ] Anything that **can be removed** (remove until it breaks)?
- [ ] States (loading/empty/error/hover/focus) complete + motion subtle?

## Bind to the project's design system (portable → specific)
When the project has a design system: **take tokens/primitives from it**, don't roll your own.
- E.g. **HIS**: `ab-*` tokens in `frontend/src/layouts/terminal/ab-module.css` (`--t-0/--t-2`, `--line`, `--a-cy`, `--s-ok/warn/crit`, `--font-mono`…) + `_v2kit` primitives (`KpiStrip/StatusTabs/DataTable/DrawerShell/ModalShell/Btn/StatusBadge`). Apply the 10 principles **within** this system (the "terminal" density, the built-in semantic colors) — do NOT bring a consumer/landing style into a business screen. See `his-fe-page-v2`, `his-fe-convention`.
- Other projects: find their CSS tokens + component kit, apply the same 10 principles + guardrail.

## Related
`core-accessibility-pattern` (a11y) · `core-error-loading-state` (states) · `core-architecture-consistency` (follow precedent) · `core-minimal-change` (don't over-style) · `his-fe-page-v2` / `his-fe-convention` (apply to HIS) · `his-fe-performance` (if polish causes slowness).
