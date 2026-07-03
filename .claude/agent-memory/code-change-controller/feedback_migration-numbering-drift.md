---
name: migration-numbering-drift
description: Migration script numbering has drift — max(NN) in Data/Scripts/ is NOT always predictable from CLAUDE.md; always ls the dir to find true max
metadata:
  type: feedback
---

Always run `Get-ChildItem Data/Scripts/*.sql | Sort-Object Name` before assigning a migration number. The directory has had numbers jump non-sequentially (44 used twice, gap between 62 and 65, gap between 92 and 94, etc.). As of 2026-06-16 the actual max was 122 (not 119 as the listing in CLAUDE.md implied — 120, 121, 122 existed but were not in the displayed list). Assigning 120 caused a collision with `120_functional_diagnostic_catalog.sql`.

**Why:** Multiple branches/authors add migrations without coordinating, and the CLAUDE.md example listing was truncated. The only reliable source is the actual directory.

**How to apply:** Before creating any migration script: list the directory, sort, take the last numeric prefix, add 1. Never trust documentation or CLAUDE.md for the current max number.
