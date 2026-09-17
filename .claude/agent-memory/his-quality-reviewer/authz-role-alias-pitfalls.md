---
name: authz-role-alias-pitfalls
description: HIS authz review pitfalls — role-gated actions bypass WritePermissionMap, shared "Technician" alias spans RIS + lab, /admin/users is Admin-only
metadata:
  type: project
---

Facts verified 2026-09-17 (QA round 6 pre-push review):

- `WritePermissionConvention` (backend/src/HIS.API/Authorization) SKIPS any action that already has `[Authorize(Roles=…)]`
  or a Policy. So widening `AuthService.RoleCodeToEnglishRoles` aliases opens those role-gated endpoints with NO
  permission backstop — enumerate every `RoleNames.<alias>` usage before approving an alias change.
- `RoleNames.Technician` is used with two meanings: ~31 RIS gates (imaging tech) and 3 SampleReceive gates
  (accept/reject/technician-run = lab). Giving "Technician" to both LAB_TECH and IMAGING_TECH cross-grants.
  Resolved in QA-R6: SampleReceive gates now use `RoleNames.LabTech`; only IMAGING_TECH carries "Technician".
- `RoleNames.Radiologist` (DOCTOR alias since QA-R6) is on SampleReceive `review` and RisCatalog templates; DicomAutoSend rules CRUD and Hl7Queue retry were narrowed to Admin + manager in QA-R6.
- `GET /api/admin/users` is `[Authorize(Roles=Admin)]` and ignores `role` — ApplyDiscountModal's approver dropdown is empty for cashiers.
- Migration 204 deliberately removed FILTERED indexes on Receipts (QUOTED_IDENTIFIER OFF sessions such as sqlcmd fail
  every INSERT/UPDATE with error 1934). Flag any new filtered/unique-filtered index on Receipts/Deposits.
- `ProductionSchemaRepairRunner` runs each GO batch in its own try/catch (a failing batch logs and continues).

- (QA-R8, 2026-09-17) `RoleNames.WarehouseManager` and `RadiologistManager` are ORPHAN (no prod RoleCode emits them). So
  `warehouse/issues|stock-takes/{id}/cancel` and `RISComplete/results/{id}/cancel-approval` are Admin-only on prod.
  FE `can('Pharmacy.Approve'|'Pharmacy.StockOut'|'Radiology.Approve')` shows those buttons to pharmacists/doctors → 403.
  Prod FE gating is ON (GitHub repo var `VITE_ACCESS_GATING=true`), so `can()` really filters there.

**Why:** these are the non-obvious blast-radius paths that a diff-only review misses.
**How to apply:** on any change to AuthService aliases, RoleNames gates, or Data/Scripts indexes, grep usages first.
