---
name: biosafety-dto-type-mismatch
description: BiosafetyStatus FE type in modules/public-health/api/environmentalHealth.ts does not match backend BiosafetyStatusDto shape — pre-existing bug in both v1 and v2
metadata:
  type: project
---

`getBiosafetyStatus()` in `frontend/src/modules/public-health/api/environmentalHealth.ts` is typed to return
`BiosafetyStatus { level, isCompliant, lastAuditDate?, findings? }`, but the real backend DTO
(`backend/src/HIS.Application/DTOs/Medinet/EnvironmentalHealthDTOs.cs` → `BiosafetyStatusDto`) actually returns
`{ wasteComplianceRate, environmentalComplianceRate, pendingWasteDisposal, nonCompliantMonitoring, overallStatus }`.
None of the FE-declared fields exist on the real payload — the "An toàn sinh học" KPI tile in both
`frontend/src/pages/EnvironmentalHealth.tsx` (v1) and `frontend/src/modules/public-health/pages/EnvironmentalHealth.tsx`
(v2) has silently always shown "Chưa đạt" / level 0 since `isCompliant`/`level` are always `undefined` at runtime.

**Why noted:** discovered 2026-07-16 while porting the v1→v2 "biosafety tab" gap (issue #409 batch). Did NOT fix the
shared type in the api file — `BiosafetyStatus` is imported by both v1 and v2, and v1 is being phased out
(do not touch v1 in place, decision #204). Fixing the shared type would break v1's compile (accesses `.isCompliant`/`.level`).
Instead, added a local (non-exported) `BiosafetyDetail` interface inside the v2 page matching the REAL backend shape,
and cast `getBiosafetyStatus()`'s result to it for the new "An toàn sinh học" tab. The old (broken) KPI tile line was
left untouched — same pre-existing bug, out of declared scope.

**How to apply:** if a future task touches this file/module (or does a v1 retirement pass), this is the correct fix:
change `BiosafetyStatus` interface fields to match `BiosafetyStatusDto` and update both call sites' render logic
(`biosafetyStatus.isCompliant ? ... : ...` etc.) in the same change, since v1 will be deleted anyway at that point.
See also [[project_fe-folder-restructure-2026-07]] for the broader v1-retirement context.

**2026-07-17 addendum — same DTO-mismatch family, now fixed:** `CreateWasteRecordDto`/`CreateEnvironmentalMonitoringDto`
(same backend file) have NO `RecordCode`/`IsCompliant` properties — backend auto-generates the record code and computes
compliance from `Status`. The v2 port's `WASTE_FIELDS`/`MONITORING_FIELDS` (`CrudFieldCfg[]`) had wrongly declared both
as form fields (recordCode even `required: true`, blocking submit). Removed both fields from both configs in
`frontend/src/modules/public-health/pages/EnvironmentalHealth.tsx` — v1's `wasteForm`/`monitoringForm` never had them either.
Also fixed: `loadMonitorings()` was missing `keyword: search` in its `searchMonitoring()` call, and the drawer's
`monitorings.map(...)` rendered unfiltered — added a `filteredMonitorings` useMemo (mirrors the existing `filtered`
useMemo pattern for `items`) instead of wiring a new reactive-reload effect, since `_v2kit`'s `CrudModal.submit()`
(`frontend/src/components/overlay/CrudModal/CrudModal.tsx`) only returns `form.validateFields()` — keys present in
`initial`/default state but NOT in the `fields` config (e.g. leftover `isCompliant: true` defaults in `openCreate`/
`monitorCrudOpen`) are silently dropped from submission, never sent to backend. **Generalizable insight:** for any
`_v2kit` `CrudModal` page, a stray default in `initial` that has no matching `CrudFieldCfg` entry is harmless dead data,
not a bug — safe to leave when out of scope.
