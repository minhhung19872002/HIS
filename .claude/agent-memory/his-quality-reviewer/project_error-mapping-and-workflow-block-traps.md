---
name: error-mapping-and-workflow-block-traps
description: HIS review traps found in QA-R13 pre-push (2026-10-03) — SqlTypeException umbrella masks NULL-read drift, FE/BE disagree on post-completion prescribing, audit body-read catch scope
metadata:
  type: project
---

- `backend/src/HIS.API/Filters/SqlConstraintError.cs`: mapping `SqlTypeException` (base type) to 242/400 also catches
  `SqlNullValueException` ("Data is Null", EF reading NULL into a non-nullable prop = schema drift) and `SqlTruncateException`.
  Any widening of that filter must be checked against the read path, not only writes.
- OPD v2 `OpdEditor.goPrescribe` allows exam status 4 (comment: "ordering after completion is NOT blocked"), while the BE
  blocks service orders (QA-R4) and, from QA-R13, prescription create/issue on Completed exams. Reopen (revert-completion)
  is ADMIN-only in practice, so a doctor who concludes first is stuck. Check FE/BE agreement on any new "after completion" guard.
- `AuditLogMiddleware.ReadBodyEntityIdAsync` catches only JsonException; any other exception escapes to the outer catch and
  the whole audit row is dropped (not just the entity id).
- Pre-flight trick that worked: for every new enum range guard, grep the FE option arrays (`DISCHARGE_TYPES`, `VISIT_TYPES`,
  `orderPaymentType`, Reception `ensureTicket`) and internal BE callers (`new IssueQueueTicketDto`, `new FeeRegistrationDto`).

**Why:** these were the non-obvious "breaks legit use" paths in an 85-file validation-heavy diff.
**How to apply:** on validation/filter sweeps, check base-type catches, FE entry points that still allow the blocked state, and catch scope in fire-and-forget audit code. Related: [[authz-role-alias-pitfalls]], [[money-path-review-traps]]
