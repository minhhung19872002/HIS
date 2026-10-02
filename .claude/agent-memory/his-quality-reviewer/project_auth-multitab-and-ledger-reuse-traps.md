---
name: auth-multitab-and-ledger-reuse-traps
description: QA-R15 review traps (2026-10-03) - cross-tab storage listener amplifies every localStorage wipe; InvoiceLedger skips QR/kiosk-paid lines so it is wrong as a source for cost statements
metadata:
  type: project
---

Found in the QA round-15 pre-push review (2026-10-03):

- AuthContext gained a `storage` listener: removing `user` in ANY tab sends every other tab to /login. initAuth's catch path (AuthContext ~line 89) removes token+user on ANY /auth/me failure, including network/5xx/502 during an EC2 deploy restart, and it leaves refreshToken in place. One F5 or new tab during a deploy now logs out all tabs and loses unsaved forms. Before this change those tabs recovered through the refresh token.
- Refresh server semantics (RefreshTokenService.RotateAsync): a token revoked by policy (new_login/logout/password_changed/admin_terminate) gives a soft "session_ended" with no family revoke. Only "rotated" outside the 60s leeway counts as reuse. That is why FE "try refresh on SESSION_INVALIDATED" is safe: admin terminate revokes the session's current RT (UserSession.SessionToken follows rotation).
- InvoiceLedger.LoadAsync skips lines paid outside the ledger (`r.IsPaid && !paidHere` = QR/kiosk/prescription-QR) and prescriptions sold through RetailSales. It is the cashier's "what to collect" view. Reusing it for a full cost statement (6556) drops real costs.
- PdfTemplateHelper hospital identity reads SystemConfigs "Hospital.HospitalName/Address/Phone" (saved by /admin/hospital-config). If they are missing, every backend print header shows dotted lines.

**Why:** both regressions sit in code the diff did not touch (initAuth catch, ledger skip rules). The new code made their side effects worse.
**How to apply:** when a change adds a cross-tab listener, list every writer/remover of that key. When a print starts using a ledger, check what the ledger excludes on purpose. Related: [[money-path-review-traps]], [[permission-ui-hiding-traps]]
