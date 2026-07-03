---
name: core-types-contract
description: Use this skill (portable, tech-agnostic) when defining the data contract between layers/boundaries — request/response shapes, DTOs, interfaces, the type a function accepts and returns. Triggers include adding an API endpoint contract, a service signature, a typed payload, or aligning frontend/backend shapes. Reusable across any web project. Do NOT use for stack-specific type mechanics (his-* skills handle the concrete language/lib).
metadata:
  type: project
---

# Core — Types & Contracts (portable)

> TIER: **A · CORE** (shared, tech-agnostic — not bound to a language/lib).

## Purpose
Define a **clear contract** between layers/boundaries: a function's input/output, request/response shape, DTO,
interface. So both sides (caller/callee, FE/BE) understand each other, and changing one side reveals what the other must change.

## When to use
- Defining an API contract (request/response).
- Setting a service/function signature (what it takes, what it returns).
- Aligning the shape between a producer and consumer.

## When NOT to use
- The language/lib's specific type syntax (C#/TS/Zod…) → the `his-*` skill (api-client, scaffold) implements it.

## Principles
1. **Explicit contract**: each boundary has a clear shape; avoid "any"/a vague object.
2. **One source of truth**: the contract is defined in one place, both sides reference it — don't invent a separate shape per place.
3. **Separate input vs output**: the shape sent and the shape received are usually different → define them separately (Create vs Read…).
4. **Distinguish data states**: pagination (list + total) vs single object vs array — name them clearly.
5. **Change the contract = change both sides**: when editing a shape, review every consumer.

## Steps
1. Identify the boundary + who is the producer/consumer.
2. Define the input + output shapes separately, name them clearly.
3. Reference a shared definition, don't duplicate the shape.
4. When changing → update every consumer.

## Anti-patterns to avoid
- A vague shape / "any" / a free-form object.
- Each place redefining the same shape (drifting apart).
- Changing one side and forgetting the other → runtime mismatch.

## Dependency
- Goes with `core-validation-pattern` (contract + validate go together). The `his-*` skills (api-client, backend scaffold) depend on it.

## When to update
- When adding a general contract principle.
