---
name: core-ui-ux-audit
description: Use this portable, tech-agnostic skill to run a SYSTEM-WIDE UX/UI + theming + reusability AUDIT FIRST, then a prioritized plan + concrete tasks, BEFORE any fix — never edit code before the audit+plan are done. Triggers include "review/audit the system-wide UX-UI", "check light/dark mode parity", "is the UI consistent", "make a plan to fix the UI/interface", or reviewing the whole app's design consistency / theming / component-reuse across pages. Sweeps light↔dark parity & contrast, color/typography/spacing/layout/alignment/iconography, button/form/card/table/modal-drawer styles, empty/loading/error/success states, navigation/responsive/basic-a11y, plus code-design health (reusability/maintainability/scalability/refactorability) — flags hardcoded-style-vs-token, "off-system" components, uneven copy-paste, missing shared abstractions; diagnoses ROOT CAUSE (local vs systemic) and returns Executive-Summary → Findings(severity) → Root-Cause → Task-Plan, implementing root-first ONLY after the plan. Bind to the project's design system at runtime. Do NOT use for polishing one new screen (core-ui-aesthetics), accessibility mechanics alone (core-accessibility-pattern), bundle/render perf (his-fe-performance), or a single-component edit — this is the whole-system audit→plan→fix orchestration.
metadata:
  type: core
---

# Core — UI/UX System Audit → Plan → Fix (portable)

> **AUDIT-FIRST. NEVER edit code before the audit + plan are complete.** Bind to the project's design
> system at runtime (read the token/theme CSS + component kit + theme setup BEFORE auditing). Pair with the
> stack skill — HIS: `his-fe-page-v2`/`his-fe-convention`; design = `pages-v2/_v2kit.tsx` + `layouts/terminal/ab-module.css`
> (`:root` light + dark vars) + `TerminalLayout`.

## Scope (token-heavy — always scope)
A whole-system audit is EXPENSIVE. Take a scope arg: a module (`reception`), a layer (`all v2 inpatient`), or `full`.
If unscoped AND the target > a few pages → **ask which scope first** (cost warning). Use the `requirement-coverage.md`
completeness-gate: enumerate ALL pages in scope; do NOT say "done" until 100% swept (no "1 page → conclude the whole system").

## Hard rules (constraints — do NOT violate)
1. No fix before the audit+plan is done. 2. Don't judge the whole system from 1 screen. 3. Fix at the ROOT (shared token/component/pattern),
not surface-patch per screen. 4. Don't skip light↔dark differences. 5. Don't skip reuse/scale debt. 6. No vague
tasks. 7. **Audit · Plan · Implement are 3 SEPARATE STEPS** (3 distinct outputs).

## Phase 0 — Ground: read the design system first
Read the theme/tokens (light+dark vars), shared UI kit, layout shells, form/table/modal primitives → build the "EXPECTED system"
to measure deviation. No token system → flag that as a systemic root finding.

## Phase 1 — Audit dimensions (sweep all)
- **Theming:** light↔dark parity + contrast (WCAG) in **BOTH** themes · hardcoded color/px vs token.
- **Visual:** color · typography (scale/weight) · spacing/rhythm · layout · alignment/grid · iconography · density.
- **Components:** button · form · card · table · modal/drawer/popup — does the same kind render consistently?
- **States:** empty · loading · error · success — complete + consistent?
- **Flow:** navigation · responsive · basic a11y (focus/keyboard/label/contrast).
- **Cross-page:** is the same UI kind built the same way?
Flag clearly: light/dark divergence · lost contrast in one theme · hardcode vs token · "off-system" parts · uneven copy-paste edits ·
visually noisy/hard-to-read/hard-to-operate/unstable.

## Phase 2 — Code-design health (reuse/scale)
Repeated style/logic · hardcode blocking extension · UI-logic scattered everywhere · missing shared abstraction · over-specific component
hard to reuse · naming/structure drift · different patterns for the same UI kind · things that make later theming/redesign/refactor hard.
Score: Reusability · Maintainability · Scalability · Readability · Refactorability.

## Phase 3 — Root cause (each finding)
The ROOT cause (not just the symptom) · why it appeared · **LOCAL vs SYSTEMIC** · is a single-place fix enough? · need a new
rule/abstraction/shared-component/design-token? Use `core-impact-analysis` (blast radius) +
`audit-protocol.md` (no-overstate: evidence + confidence, no overstatement).

## Phase 4 — PLAN (before fixing) — separate output
(1) Audit summary (2) Findings list + severity **Critical/High/Medium/Low** + impact + location (file:line)
(3) Root-cause for each important finding (4) Blast radius (5) Proposed fix architecture (shared token/component/pattern)
(6) Task breakdown (7) Execution order + dependencies.

## Phase 5 — Tasks (concrete, on the project's task board — HIS: GitHub Issues)
Each task: **Name · Goal · Scope · Input · Output · Acceptance criteria · Risk · Dependency · Priority ·
Refactor-first?** — split small, 1 concern/task, NO vagueness.

## Phase 6 — Fix (root-first, only after the plan is approved)
Prefer a shared component/pattern/token over patching each screen · don't break existing behavior · small but systemic ·
if a refactor-first is needed → state why · build-gate after (`his-qa-anti-pattern` #27).

## Phase 7 — Self-review
Is the UI more consistent? light/dark consistent? reuse better? code more extensible? any off-system points left? blind-spots? → spawn
sub-tasks if needed.

## Output format (return in this exact order)
1. **Executive Summary** (status · biggest problem · biggest root-cause · priority fix direction)
2. **UX/UI Audit Findings** (finding · severity · impact · location)
3. **Code Design Findings** (reuse · maintainability · scale · structure)
4. **Root Cause Analysis** (each important issue)
5. **Task Plan** (tasks · order · dependencies)
6. **Implementation** (ONLY after the audit+plan is done)
7. **Final Review** (consistent yet · what's left · need sub-tasks?)

## Dependency
`core-ui-aesthetics` (per-component taste) · `core-accessibility-pattern` (a11y mechanics) · `core-impact-analysis`
(blast radius) · `.claude/workflow/audit-protocol.md` (no-overstate) · `.claude/workflow/requirement-coverage.md`
(completeness-gate) · bind to stack: `his-fe-page-v2` / `his-fe-convention`.

## When to update
When the design system / token / component kit changes structure, or a new audit dimension is added.
