---
name: permission-ui-hiding-traps
description: HIS review traps from QA-R14 pre-push (2026-10-03) — "hide on 403" FE changes can hide actions other roles may do; CCHN own-licence preference can newly block; ledger now prices every BHYT load
metadata:
  type: project
---

- v2 `BloodBank.tsx`: the "Xuất máu" toolbar button opens `BloodIssueModal` = `createIssueRequest` (POST
  /BloodBankComplete/issue-requests, roles incl. Doctor). It is the ONLY FE path to create a blood issue request.
  GET /stock is BloodBank staff/Admin only, so any "hide buttons when stock 403" logic removes the doctor's request path.
- Pattern to check on every "403 → hide write buttons" FE change: compare the READ endpoint's roles with EACH hidden
  WRITE endpoint's roles (`[Authorize(Roles=...)]` on the method + `WritePermissionMap`). Button labels lie.
- CCHN (`CheckDoctorCertificationAsync`) is a hard start-exam gate. Any change to how the licence row is picked
  (ordering, own-code preference) can turn a previously "valid" doctor invalid even with a "legacy fallback",
  because the fallback only runs when the new query finds nothing — not when it finds an expired/suspended row.
- From QA-R14, `InvoiceLedger.LoadAsync` runs `BhytVisitPricing.PriceAsync` (TRACKED loads) on every BHYT record load,
  even with `Billing.LedgerUsesVisitPricing` Off. Cashier unpaid lists loop up to 50 records → watch perf/exceptions.
- ICD catalog (mig 191) stores 892 dagger/asterisk codes WITH the symbol ("A17.0†"); catalog-only ICD guards are safe
  only where the input is the picker (v2 OPD), not free-typed codes.

**Why:** these break legit users without any test failing — the deciding fact is in the controller roles or catalog data.
**How to apply:** for FE permission-UX diffs, map hidden buttons → endpoint roles; for gate changes, enumerate "was valid,
now invalid" paths, not only "was missing". Related: [[authz-role-alias-pitfalls]], [[money-path-review-traps]]
