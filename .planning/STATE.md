# Project State

**Updated:** 2026-02-28
**Current phase:** 01-bhxh-gateway-xml4210
**Current Plan:** 4 of 4 in Phase

## Active Phase

Phase 1: BHXH Gateway + XML 4210 Export (Plan 3 of 4 complete)

## Phase Status

| Phase | Name | Status | Requirements | Completed |
|-------|------|--------|-------------|-----------|
| 1 | BHXH Gateway + XML 4210 Export | In Progress (Plan 3/4) | 9 (BHXH-01..05, XML-01..04) | 8/9 |
| 2 | Digital Signature Expansion | Not started | 6 (SIGN-01..06) | 0/6 |
| 3 | Security Hardening + CCCD | Not started | 5 (SEC-01..05) | 0/5 |
| 4 | SMS Gateway + Online Booking | Not started | 8 (SMS-01..04, BOOK-01..04) | 0/8 |
| 5 | Oracle DB Dual-Provider | Not started | 5 (ORA-01..05) | 0/5 |
| 6 | DQGVN + SNOMED CT + HL7 CDA | Not started | 11 (HIE-01..03, INTOP-01..04, ARCH-01..04) | 0/11 |
| 7 | AI/CDSS + Biometric + Smart Card | Not started | 10 (AI-01..04, BIO-01..03, CARD-01..03) | 0/10 |

**Overall:** 8/52 requirements completed

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

## Decisions

- UseMock=true by default for BHXH gateway -- real client activated only when credentials configured
- Polly retry (3x exponential backoff) + circuit breaker (5 failures, 30s) for BHXH HTTP client
- Graceful degradation: gateway failure returns fallback response, never blocks patient workflow
- Thread-safe token refresh with SemaphoreSlim double-check pattern
- Mock client recognizes special insurance numbers (INVALID, EXPIRED) for edge case testing
- Use ClaimDetails grouped by ItemType for XML2/XML3 instead of separate entity queries
- XML6 uses BloodRequest (not BloodTransfusion) for MedicalRecordId/BloodType access
- All XML money fields use Math.Round(value, 2) per BHXH spec
- XmlExportService and XmlSchemaValidator registered as Singletons (stateless services)
- XSD validation gracefully skipped when no schema files present (hospital adds later)
- Export pipeline: validate -> generate -> XSD check -> write files (blocking on errors)
- Preview-then-generate workflow: PreviewExportAsync returns counts/costs before committing to file generation

## Performance Metrics

| Phase-Plan | Duration | Tasks | Files |
|------------|----------|-------|-------|
| 01-01 | 7min | 2 | 10 |
| 01-02 | 7min | 3 | 4 |
| 01-03 | 6min | 2 | 8 |

## Recent Changes

- 2026-02-28: Plan 01-03 completed -- XML export pipeline with XmlExportService, XmlSchemaValidator, preview workflow
- 2026-02-28: Plan 01-02 completed -- 14 XML table generators with real EF Core queries
- 2026-02-28: Plan 01-01 completed -- BHXH gateway client abstraction + InsuranceXmlService rewired
- 2026-02-28: GSD initialized -- PROJECT.md, REQUIREMENTS.md, config.json, research completed
- 2026-02-28: ROADMAP.md created with 7 phases covering all 52 requirements
- 2026-02-27: Session 17 completed (SignalR notifications, patient timeline, dashboard charts, 34 new Cypress tests)

## Last Session

- **Stopped at:** Completed 01-03-PLAN.md
- **Timestamp:** 2026-02-28T06:42:03Z

---
*State file created: 2026-02-28*
