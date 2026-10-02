# Memory Index — his-quality-reviewer

- [Migration runner pitfalls](project_migration-runner-pitfalls.md) — ordinal order, SET leakage across scripts, DATEDIFF overflow, local 0-row data fixes prove nothing
- [AuthZ role-alias pitfalls](authz-role-alias-pitfalls.md) — role-gated actions bypass WritePermissionMap; LabTech vs Technician; orphan WarehouseManager/RadiologistManager = Admin-only; prod FE gating ON
- [Worker/audit review traps](project_worker-audit-review-traps.md) — 'Read' audit rows = EMR access trail; Code Blue location always ''; auto-send backlog; RDS no BACKUP TO DISK; R10 VN-clock workers, BHXH audit import dedup
- [Money-path review traps](project_money-path-review-traps.md) — admin always holds Billing.Approve; ward surgery billing has no dup guard; OPD/IPD share PrescriptionTemplates (qty = whole course)
- [Permission-UI hiding traps](project_permission-ui-hiding-traps.md) — 403→hide can hide doctor's blood request; CCHN pick-order blocks; ledger prices every BHYT load
- [Auth multi-tab & ledger-reuse traps](project_auth-multitab-and-ledger-reuse-traps.md) — storage listener amplifies initAuth wipe on 5xx; ledger skips QR-paid lines
- [Error-mapping & workflow-block traps](project_error-mapping-and-workflow-block-traps.md) — SqlTypeException umbrella hides NULL-read drift; FE allows Rx after exam completion; audit body-read catch scope
