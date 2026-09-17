---
name: worker-audit-review-traps
description: HIS review traps from QA round 9 (2026-09-17) - audit Action names, retention deleting EMR access logs, Code Blue location always empty, auto-send backlog, RDS cannot BACKUP TO DISK
metadata:
  type: project
---

Found in the QA round-9 pre-push review (2026-09-17):

- AuditLogMiddleware writes `Action='Auth'` for any path containing /login or /verify, and `Action='Read'` for sensitive GET detail paths (patients, EMR). The legacy names 'Login'/'View' are never written. So 'Read' rows ARE the EMR access trail. Retention deleting them is a compliance decision, not cleanup. On 2026-09-17 the oldest Read row was 2026-03-01, so a 548-day window deletes nothing before about 2027-09.
- AuditArchiveWorker is Enabled=false by default (no R2 config on prod), so any row type the retention worker deletes is gone for good.
- trg_AuditLogs_NoDelete (migration 150) is live. A delete only passes when SET CONTEXT_INFO 'RETE' runs on the same explicitly opened connection.
- FE `activateCodeBlue()` (mci/api/massCasualty.ts) always sends `location: ''`, so the backend location is always "Toàn bệnh viện". Any dedup keyed on location is really hospital-wide.
- DicomAutoSendService: taking "unsent studies" with no date bound means every historical matching study is sent after deploy (10 per cycle per rule).
- Prod DB is RDS SQL Server Express: `BACKUP DATABASE ... TO DISK` and `COMPRESSION` are not allowed, so DataManagementService backups can only fail there.
- HL7 port 2576 and the MPPS port are not published on EC2 (Caddy exposes only 80/443). HL7/MPPS changes have almost no effect on prod.
- CI deploy gate = `dotnet test` only. ESLint and `npm run build` are NOT gates; the FE is built inside the Dockerfile.

**Why:** diff-only review misses these because the deciding fact lives in the middleware, the FE caller, or the prod infra.
**How to apply:** for audit-retention changes, map Action names to the middleware first. For dedup/idempotency, check what the real caller sends. For worker "catch-up" fixes, check for a lookback bound. Related: [[migration-runner-pitfalls]], [[money-path-review-traps]]
