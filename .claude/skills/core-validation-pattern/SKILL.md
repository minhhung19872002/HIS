---
name: core-validation-pattern
description: Use this skill (portable, tech-agnostic) when adding input validation, to keep frontend and backend validation consistent and to never trust client input. Triggers include validating a form/payload, defining required fields/ranges/formats, or aligning client-side and server-side rules. Reusable across any web project. Do NOT use for stack-specific validation libraries (his-* skills implement them).
metadata:
  type: project
---

# Core — Validation Pattern (portable)

> TIER: **A · CORE** (shared, tech-agnostic).

## Purpose
Validate input the right way: **don't trust the client**, FE and BE **consistent rules**, clear errors for the user.

## When to use
- Adding validation for a form/payload/request.
- Defining required / range / format / business rules on input.
- Aligning FE ↔ BE rules.

## When NOT to use
- A specific validation lib's syntax → the `his-*` skill (form/backend) implements it.

## Principles
1. **Server is the last gate**: the BE MUST validate even if the FE already did. FE validates for UX, BE validates for safety.
2. **Same rule on both sides**: required/range/format match (avoid FE letting it through while BE blocks, or vice versa).
3. **One rule source if possible**: share/sync the rule definition instead of hand-writing two divergent copies.
4. **Clear errors**: return the message + the failing field, easy for the user/QA.
5. **Validate at the boundary**: check right when receiving input, before business processing.
6. **Business rules** (e.g. business-level validity conditions) separated from format validation, placed in the right domain tier.

## Steps
1. List the fields + rules (required/range/format/business).
2. Implement on the BE (the gate) + FE (UX), matching.
3. Return an error with field + message.

## Anti-patterns to avoid
- Validating only on the FE, trusting the client → the BE receives garbage.
- FE/BE rules diverge → confusing UX.
- Swallowing a validation error / a vague message.
- Mixing format-validation with business-rule in one place.

## Dependency
- Goes with `core-types-contract` (contract + validate go together). The `his-*` skills (form, backend) depend on it.

## When to update
- When adding a general validation principle.
