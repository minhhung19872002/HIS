---
name: core-clean-code
description: Use this skill (portable, tech-agnostic) on EVERY code-gen/edit (FE + BE) to write clean, maintainable, change-friendly code at the function/statement level — beyond just "works/correct flow". Triggers include writing or refactoring any function/class/component/service, reviewing a diff, or when code is getting long/nested/duplicated. Enforces small single-responsibility functions, guard clauses/early-return to cut nesting, few parameters (object param, no boolean-flag args), intention-revealing names, no magic numbers/strings (named constants/enums), comment WHY not WHAT, no dead/commented-out code or leftover debug, immutability & single-source-of-truth state, DRY without premature abstraction (rule of three), low coupling / high cohesion / depend on abstractions, open-for-change (config/strategy over long if-else chains), async & side-effect hygiene (no floating promises, effect cleanup, idempotency), null-safety, and a clean-code self-review. Do NOT duplicate: reuse=core-reusable-code, layer boundaries=core-architecture-follow, YAGNI scope=core-minimal-change, behavior-preserving cleanup=core-refactor, validation=core-validation-pattern, error/loading UI=core-error-loading-state, FE naming/folder=his-fe-convention, footguns/safety=his-qa-anti-pattern.
metadata:
  type: project
---

# Clean Code — writing maintainable / upgradable / fixable code

Apply on **EVERY** code write/edit (FE + BE). Goal: not just a correct flow + business logic, but also
**clean code · reuse · maintainable · easy to extend / change / fix**. These are **function / statement**-level
rules — complementary to the existing structural skills (see "Don't duplicate" at the end).

## When to use
- When writing or refactoring any function/class/component/service (FE+BE).
- When reviewing a diff before reporting done / committing.
- When code is getting long, deeply nested, duplicated, or hard to understand.

## When NOT to use
- Don't create a file — this is a rule skill, applied **right while writing code** alongside the code-gen skill.

## 1. Function design
- **Single Responsibility** — 1 function does 1 thing; the name describes exactly that. An "and/or" function → split.
- **Short** — a too-long function (> ~50–60 lines / many abstraction levels) → extract a helper/usecase.
- **Guard clause / early-return** — check wrong/edge conditions then `return` early; avoid deep `if` nesting (> 2–3 levels).
- **Few parameters** — > 3–4 params → bundle into an object/options. Do **NOT** use a boolean-flag arg (`doX(true)`) → split into 2 functions or an enum.
- **Pure when possible** — input → output, no hidden side-effect; separate the pure part from I/O to ease testing.
- **Command–Query separation** — a function either *does* (mutates) or *returns* (queries), not both, which is hard to predict.

## 2. Naming & constants (self-documenting)
- **Intention-revealing** names; reading the name tells you what it does, without reading the body. (FE convention detail: `his-fe-convention` §1.)
- **NO magic number / magic string** scattered in code → move into a **named constant / enum** placed centrally
  (FE: `constants/`, `STATUS_TABS`…; BE: const/enum in Core). A 0/1/2 status must have a label.
- No vague standalone names `data/info/temp/handle/process/manager` — attach the domain.

## 3. Comment & cleanup
- A comment explains **WHY** (reason/business/edge-case), NOT restate WHAT the code already says.
- Short docs for a **shared / public API** (shared component, service, complex function).
- **Do NOT keep dead code / commented-out code** ("for later") — delete it, git keeps history.
- **Do NOT leave debug junk**: `console.log`, `print`, unused vars/imports, orphan TODOs with no date/no owner.

## 4. Immutability & state
- Prefer `const`; update **immutably** (spread/clone) instead of mutating props/state/input args directly.
- **Single source of truth** — don't store derivable state twice; compute **derived state** with `useMemo`/selector, don't copy it into separate state that can drift.
- Avoid shared mutable globals; put state at the right level (local vs context — see `his-fe-convention` §3).

## 5. Measured DRY + coupling/cohesion
- **DRY** but by the **rule-of-three**: abstract on the 3rd repetition — avoid premature abstraction (over-engineering; see `core-minimal-change`).
- **High cohesion** (group related things), **low coupling** (reduce cross-dependency); a module/function should know as little about the outside as possible.
- **Depend on abstraction** (interface/contract) instead of a concrete implementation, so changes don't spread (see `core-types-contract`, `core-architecture-follow`).

## 6. Open for change (open-for-change → easy to upgrade)
- **Config / data-driven** instead of long `if/else`/`switch` chains: map/lookup table, strategy, registry (FE: option/field config; BE: dictionary/strategy).
- Adding a new case = **adding data/a small branch**, not editing the core (Open–Closed spirit).
- Isolate change-prone points (price, business code, threshold, gateway URL) into config/constant — change in one place.

## 7. Async & side-effect hygiene
- **No floating promise** — always `await` or `.catch`; don't leave a possibly-failing promise dangling.
- `useEffect`/listener/timer/subscription → **cleanup** (return unsubscribe) to avoid leaks + updates after unmount.
- Avoid **race conditions** (keep the latest request / AbortController); a write op should be **idempotent** when possible (see `his-db-migration`, `his-be-background-worker`).
- **No side-effect in render**; put API calls/log/timer in an effect/handler.

## 8. Safety & defense
- **Null/undefined safety**: optional chaining `?.` + nullish `??`; bounds-check arrays/objects before access.
- Don't trust external input — validate at the boundary (FE+BE), BE is authoritative (see `core-validation-pattern`).
- Don't log secret/PII; don't silently swallow exceptions (see `his-qa-anti-pattern`).

## 9. Clean-code self-review (self-check every diff)
- [ ] Function has **SRP** + short enough? Nesting ≤ 2–3 levels (used guard clauses)?
- [ ] Parameters ≤ ~4, no boolean-flag arg?
- [ ] No magic number/string? Constants placed centrally?
- [ ] Names intention-revealing, follow the convention?
- [ ] No dead code / commented-out / debug junk / unused imports?
- [ ] State: single source of truth, derived via memo, immutable updates?
- [ ] Duplication: reused/abstracted at the right level (rule-of-three, not premature)?
- [ ] Async: no floating promise, effects have cleanup, no race?
- [ ] Null-safe at boundaries? No swallowed errors?
- [ ] Change-prone points isolated into config/constant (easy to upgrade later)?
- [ ] **Build/typecheck clean** (FE+BE touched tier) BEFORE reporting done — don't claim success without verifying (HIS: see `his-qa-anti-pattern` #27).

## Don't duplicate (use alongside, no overlap)
`core-reusable-code` (find-and-reuse before creating) · `core-architecture-follow`/`-consistency` (layer
boundaries + follow precedent) · `core-minimal-change` (YAGNI, no over-engineering) · `core-refactor` (cleanup preserving
behavior) · `core-types-contract` (contract) · `core-validation-pattern` (validate) · `core-error-loading-state`
(loading/empty/error UI) · `his-fe-convention` (FE naming/folder/component, Antd-first) · `his-qa-anti-pattern`
(footgun/safety/patient-safety). This skill only adds the **function/statement-level clean-code** part for both FE+BE.
