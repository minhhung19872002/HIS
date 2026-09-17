# Memory Index — his-quality-reviewer

- [Migration runner pitfalls](project_migration-runner-pitfalls.md) — ordinal order, SET leakage across scripts, DATEDIFF overflow, local 0-row data fixes prove nothing
- [AuthZ role-alias pitfalls](authz-role-alias-pitfalls.md) — role-gated actions bypass WritePermissionMap; "Technician" = RIS only since QA-R6 (lab gates use LabTech); no filtered indexes on Receipts
- [Money-path review traps](project_money-path-review-traps.md) — admin always holds Billing.Approve; surgery-request billing has no cancel reversal; emergency registration skips patient dedupe
