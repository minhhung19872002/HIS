# verify-before-assert checklist

## Symbol kinds you MUST verify before using/asserting
- File / folder path → `Glob`.
- Function / class / component / hook / interface name → `Grep` the definition (`function X`, `class X`, `const X =`, `interface X`).
- API endpoint / route → `Grep` the real controller/route.
- DTO field / DB column / component prop / config key / env var → `Read` the real definition.
- Behavior ("the code does X") → `Read` the actual function, don't infer from the name.

## ERROR-PRONE sources — always re-verify against the current code
- Memory (recalled) — reflects when it was written, not now.
- CLAUDE.md / work-log / docs — may be stale (URL, ID, flag, path).
- A "plausible-sounding" name inferred from convention.
- A result from 1 file → does NOT generalize to the whole repo.

## How to attach evidence when stating something
- ✅ "The DTO uses `icdCode` (verified `…/SpecialtyEmrDTOs.cs`)."
- ✅ "Assumption (NOT verified): there may be a format helper — will Grep before using."
- ❌ "There's probably a `formatX()` function." (a bare unsourced claim)

## Reasonable verify effort
1–3 `Grep`/`Glob`/`Read` commands is enough for one fact. Can't determine it → say "not found/unsure",
propose a direction or ask — do NOT fabricate.
