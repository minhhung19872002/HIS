---
name: core-reusable-code
description: Use this skill (portable, tech-agnostic) before creating ANY new file, function, component, hook, service, type or test setup, to reuse what already exists instead of duplicating. Triggers include any code-gen task, "add X", refactor, or when you might be about to recreate something that already exists. Enforces inspect-existing → extend/compose → extract-shared. Reusable across any web project.
metadata:
  type: project
---

# Core — Reusable Code (portable)

> TIER: **A · CORE** (shared, tech-agnostic).

## Purpose
Force **reuse before creating new**: reuse/extend existing code instead of duplicating. Prevents logic and
abstraction duplication. A principle for every project.

## When to use
- **Every** code-gen task (always applied first).
- Before creating a new file/function/component/hook/service/type/test setup.
- When you suspect "this already exists somewhere".

## When NOT to use
- Not a stand-alone file-creating skill — it's a guardrail alongside other skills.

## MANDATORY workflow (in order)
```
1. inspect a similar existing feature/screen
2. find an existing abstraction/base (shared layer)
3. check shared components/hooks
4. check service / API client / util
5. check store/state, types, validation schema
6. check localization keys
7. check test helper/fixture/builder
→ PREFER: extend / compose / extract-shared
→ Create new ONLY when nothing suitable exists
→ Create new with reuse potential → put it in shared
```

## Anti-patterns to avoid
- Duplicate logic / hook / API layer / validation / localization / test setup.
- Creating an abstraction that duplicates an existing one.
- Copy-paste then tweak instead of parameterizing / composing.

## Dependency
- The foundation for every code-gen skill. Anti-duplication is **folded into this skill** + `core-refactor` when you need to
  extract-shared.

## When to update
- When the inspect/shared-layer convention changes.
