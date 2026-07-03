# SKILL.md — copy-paste frame

Copy the block below into `.claude/skills/<name>/SKILL.md`, replace `<...>` and delete the notes.

```markdown
---
name: <name-kebab-case>          # MUST match the folder name
description: Use this skill when <WHAT + context>. Triggers include <concrete triggers: path, function name, VI/EN keyword>. Do NOT use for <situation> (<other-skill>).
metadata:
  type: project
# allowed-tools: Read, Grep, Edit   # (optional) uncomment to limit the tools
---

# <Short title>

<1–2 sentences of purpose: what this skill standardizes, which pattern/file it follows.>

## When to use
- <concrete situation 1>
- <concrete situation 2>

## When NOT to use
- <situation> → `<sibling-skill>` (<short reason>)

## Sample code location (read before writing)
- `<path/to/reference-file>` — <role>

## Standard process
1. <step 1, real path>
2. <step 2>
3. <build/verify>

## Pitfalls
- <a real mistake hit → how to avoid it>

## Reference
- `references/<file>` — <description> (if a template/script is split out)

## When to update
- <when to revise this skill>
```

## Tips for a strong `description`
- Open with: `Use this skill when …` (third person).
- Pack in triggers Claude can match easily: file names, routes, class/function names, Vietnamese + English keywords.
- End with `Do NOT use for … (other-skill)` to avoid overlap.
- ≤ 1024 chars; specific always beats generic.
