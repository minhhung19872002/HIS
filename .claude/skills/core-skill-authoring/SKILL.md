---
name: core-skill-authoring
description: Use this skill (portable, tech-agnostic) when creating, editing, reviewing, or auditing a Claude Code skill (a `.claude/skills/<name>/SKILL.md`). Triggers include "create a new skill", "edit/standardize a skill", "review whether a skill is up to standard", deciding a skill's frontmatter/description/body, or applying progressive disclosure. Enforces the official Agent Skills spec (frontmatter `name` + `description` + optional `metadata`/`allowed-tools`), trigger-rich descriptions, concise bodies, and the project naming-token rules. Do NOT use for ordinary feature/code tasks (route via SKILL-MAP), nor for prose docs (his-doc-feature).
metadata:
  type: project
---

# Core — Skill Authoring (portable)

> TIER: **A · CORE** (governance, tech-agnostic). The skill for writing/standardizing other skills.

## Purpose
Standardize how to write a skill so Claude **activates it at the right time** and **uses it effectively**. The source of truth
for the official frontmatter format + how to write `description` + body structure + progressive disclosure +
naming rules. Applies to any project using Claude Code skills.

## When to use
- Creating a new skill (after passing the "worth reusing" decision gate in SKILL-MAP section (6)).
- Editing/standardizing/reviewing an existing skill for compliance.
- Auditing the whole skill set (frontmatter, description, body, references).

## When NOT to use
- A normal feature/code task → route via `SKILL-MAP.md` to the right `core-*`/`his-*`.
- Writing module documentation (prose) → `his-doc-feature`.

## Standard frontmatter (Agent Skills spec — MANDATORY)
Only the keys below are spec-recognized. Any custom field must live under `metadata:`.

```yaml
---
name: <kebab-case>          # MANDATORY. MUST match the folder name. lowercase + digits + hyphens. ≤ 64 chars.
description: <1 paragraph>   # MANDATORY. ≤ 1024 chars. Third person. WHAT + WHEN + Do NOT.
metadata:                   # OPTIONAL. The only place for a custom field (e.g. type).
  type: project
allowed-tools: Read, Grep   # OPTIONAL. Limit the tools the skill may use (usually omitted for a guidance skill).
---
```
Do NOT put a stray key (e.g. `type:`) at the top level — the loader ignores it but it's NON-spec.

## Writing the `description` (the MOST important element — decides activation)
`description` is the ONLY thing loaded until the skill is chosen → it must carry enough signal for Claude to match.
Formula: **WHAT it does · WHEN to use (concrete triggers) · WHEN NOT to use (route to another skill).**
- Third person ("Use this skill when…"), not "I/you".
- Pack in **concrete triggers**: file names/paths, function/class names, the Vietnamese + English keywords users actually type.
- Always have a `Do NOT use for … (other-skill)` clause to prevent overlap.
- Specific > generic. ❌ "Helps with backend." ✅ "Use when adding a service/controller… register DI…".

## Standard body template (SKILL.md — keep it CONCISE, < ~150 lines)
The body is the "HOW", loaded when the skill activates. Follow a consistent frame:

```markdown
# <Short title>

<1–2 sentences of purpose.>

## When to use
- <short bullets, concrete situations>

## When NOT to use
- <route to a sibling skill + reason>

## <Core part: Standard process / Architecture / Sample code location / Pattern>
<numbered steps, real paths, short snippets. Long template/snippet → references/.>

## Pitfalls
- <a real mistake hit, how to avoid it>

## Reference
- `references/<file>` — <description>   (if there's a template/script)

## When to update
- <when to revise this skill>
```

## Progressive disclosure (keep SKILL.md light)
- Long code templates, scripts, cheat-sheets → split into `references/*.ext` or `scripts/*.ext`, **link** with a
  relative path; Claude reads them when needed.
- SKILL.md keeps only the guidance + pointers to references. Do NOT paste a whole 200-line file into the body.

## Naming rules (per SKILL-MAP section (0))
- `core-*`: portable/tech-agnostic, **NO** tier token → `core-<name>`.
- `his-*`: project-specific, **a tier token is mandatory** right after `his-`: `his-<fe|be|db|fs|ops|test|qa|doc|flow>-<name>`.
- A new token (outside the (0) table) is added only when there's a genuinely new task group, with a table update.

## Create or extend? (decision gate — SKILL-MAP section (6))
1. There's an almost-right skill → **extend** it (per `core-reusable-code`), don't create new.
2. The task is **reused many times** → only then is a skill worth creating (ask the user to approve) → create from this template → update
   SKILL-MAP (1a)/(1b) + (2) + (4).
3. A one-off task → do NOT create a skill; do it directly.

## Checklist before committing a skill
- [ ] `name` matches the folder name, kebab-case, ≤ 64 chars.
- [ ] `description` ≤ 1024 chars, third person, has concrete triggers + `Do NOT use`.
- [ ] Custom fields live under `metadata:` (no stray top-level keys).
- [ ] The body has `When to use` + `When NOT to use` + ends with `When to update`.
- [ ] Long template/snippet split into `references/`, linked by a relative path.
- [ ] Updated `SKILL-MAP.md` (1a/1b + 2 + 4) if it's a new skill.

## Reference
- `references/skill-template.md` — a copy-paste-ready SKILL.md frame.

## When to update
- When the Agent Skills spec changes (a new frontmatter key), or the project's body/naming convention changes.
