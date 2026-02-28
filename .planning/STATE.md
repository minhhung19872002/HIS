# Project State

**Updated:** 2026-02-28
**Current phase:** Not started (roadmap created, planning next)

## Active Phase

None yet. Phases 1 and 2 are ready to begin planning.

## Phase Status

| Phase | Name | Status | Requirements | Completed |
|-------|------|--------|-------------|-----------|
| 1 | BHXH Gateway + XML 4210 Export | Not started | 9 (BHXH-01..05, XML-01..04) | 0/9 |
| 2 | Digital Signature Expansion | Not started | 6 (SIGN-01..06) | 0/6 |
| 3 | Security Hardening + CCCD | Not started | 5 (SEC-01..05) | 0/5 |
| 4 | SMS Gateway + Online Booking | Not started | 8 (SMS-01..04, BOOK-01..04) | 0/8 |
| 5 | Oracle DB Dual-Provider | Not started | 5 (ORA-01..05) | 0/5 |
| 6 | DQGVN + SNOMED CT + HL7 CDA | Not started | 11 (HIE-01..03, INTOP-01..04, ARCH-01..04) | 0/11 |
| 7 | AI/CDSS + Biometric + Smart Card | Not started | 10 (AI-01..04, BIO-01..03, CARD-01..03) | 0/10 |

**Overall:** 0/52 requirements completed

## Existing System Baseline

The system is mature with 17 development sessions complete:
- 803+ E2E tests passing (Cypress 634, Playwright 255, API 41)
- 350+ backend methods implemented (0 NotImplementedException)
- 38 EMR print templates (17 BS + 21 DD)
- 34 frontend routes, 0 TypeScript errors
- Infrastructure: SignalR, Redis, Orthanc PACS, HL7Spy, iText7, recharts

## Blockers

- **BHXH gateway API specification**: Must be obtained from provincial BHXH office before Phase 1 implementation
- **Vietnamese CA test tokens**: Hospital must provide USB tokens from each CA vendor for Phase 2 testing
- **DQGVN/MOH API credentials**: Must be obtained from Bo Y Te before Phase 6
- **SMS brand name registration**: 5-15 business day administrative lead time; should start immediately

## Recent Changes

- 2026-02-28: GSD initialized -- PROJECT.md, REQUIREMENTS.md, config.json, research completed
- 2026-02-28: ROADMAP.md created with 7 phases covering all 52 requirements
- 2026-02-27: Session 17 completed (SignalR notifications, patient timeline, dashboard charts, 34 new Cypress tests)

---
*State file created: 2026-02-28*
