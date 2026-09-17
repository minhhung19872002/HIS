---
name: money-path-review-traps
description: HIS review traps found in QA round 7 (2026-09-17) - admin always counts as a Billing.Approve holder, new billable orders need a cancel reversal, emergency registration skips patient dedupe
metadata:
  type: project
---

Found in the QA round-7 pre-push review (2026-09-17):

- PermissionCatalogSeeder gives the ADMIN role the full permission catalog as real RolePermissions rows. Any "is there another approver?" query therefore always finds the admin account. On prod (1 cashier + 1 admin) a "no self-approval" rule means the admin has to approve every refund.
- SurgerySchedulingServiceImpl.CreateSurgeryRequestAsync now bills through ExaminationCompleteService.CreateServiceOrdersAsync. The only link to the order is the text in ServiceRequest.Notes ("Phieu PTTT {code}"), so Reject/CancelSurgeryAsync do not cancel the order. When a change adds a money side effect, check the reverse path too.
- POST reception/register/emergency (RegisterEmergencyPatientCoreAsync) always creates a new Patient unless PatientId is sent. It never looks the patient up by CCCD or phone, unlike the fee and BHYT registration paths.
- PatientTimeline.tsx (v2) treats conclusionType === 2 as "Nhập viện". The real enum is 2 = Kê đơn and 3 = Nhập viện.

- (QA-R8) Surgery request now also bills via the ward path (InpatientCompleteService.CreateServiceOrderAsync), which has NO duplicate guard (only the OPD path does). Cancel now matches the detail Note "Phieu PTTT <code>".
- PrescriptionTemplates is ONE table for OPD and inpatient. OPD saves never set PrescriptionType (stays 0) and store Quantity = whole course (Days > 1). Any inpatient "apply template" that copies Quantity as-is over-dispenses/over-bills. The dose guard reads per-dose notes only, so it does not catch this.

**Why:** diff-only review misses these because the broken part sits in code that was not changed.
**How to apply:** when an approval rule changes, check who actually holds the permission on prod. When a new charge is created, grep the cancel/reject paths. When a registration path changes, check how it finds an existing patient. Related: [[authz-role-alias-pitfalls]], [[migration-runner-pitfalls]]
