# Memory Index — his-quality-reviewer

- [Migration runner pitfalls](project_migration-runner-pitfalls.md) — ordinal order, SET leakage across scripts, DATEDIFF overflow, local 0-row data fixes prove nothing
- [AuthZ role-alias pitfalls](authz-role-alias-pitfalls.md) — role-gated actions bypass WritePermissionMap; LabTech vs Technician; orphan WarehouseManager/RadiologistManager = Admin-only; prod FE gating ON
- [Worker/audit review traps](project_worker-audit-review-traps.md) — 'Read' audit rows = EMR access trail; Code Blue location always ''; auto-send backlog; RDS no BACKUP TO DISK
- [Money-path review traps](project_money-path-review-traps.md) — admin always holds Billing.Approve; ward surgery billing has no dup guard; OPD/IPD share PrescriptionTemplates (qty = whole course)
