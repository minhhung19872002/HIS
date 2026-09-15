---
name: migration-runner-pitfalls
description: Review traps for HIS Data/Scripts data-fix migrations - ordinal order, shared connection SET leakage, DATEDIFF overflow, local 0-row runs proving nothing
metadata:
  type: project
---

Found in the QA round-3 pre-push review (2026-09-16) of migrations 200-207:

- ProductionSchemaRepairRunner sorts scripts with StringComparer.Ordinal, so `200_..207_` run BEFORE `21_..99_`. It runs every script on ONE SqlConnection, so a `SET XACT_ABORT ON` (or any SET) left in a script carries into every script after it.
- `DATEDIFF(SECOND, a, b)` returns an int and overflows (Msg 535) when a date is `0001-01-01` or `1900-01-01`. Under XACT_ABORT the whole one-shot fix rolls back on every startup. Data-fix predicates should use DATEDIFF_BIG or a DATEADD range.
- A DataFixMarkers note showing `=0` rows on the local DB means the shift path was never exercised (the local API runs in VN time). Do not treat a green local run as proof; ask for a prod row count.

**Why:** errors in this runner are swallowed and only show in /health/migrations. CI checks that endpoint only after the container has already been replaced, so a broken data fix fails silently on every restart.
**How to apply:** check all three points for any new Data/Scripts file that has DML or SET statements. Related: [[review-prod-access-hygiene]]
