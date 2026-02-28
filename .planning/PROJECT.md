# HIS - Hospital Information System Upgrade

## What This Is

Hospital Information System (HIS) for Benh vien Truong Dai hoc Y - Duoc Hue, being upgraded to Level 6 compliance (TT 54/2017, TT 32/2023, TT 13/2025) with full Electronic Medical Records (EMR). The system serves clinical staff (doctors, nurses, pharmacists), administrative staff (billing, reception), and patients across 20+ modules. Built with React 19 + Ant Design v6 frontend and ASP.NET Core Clean Architecture backend on SQL Server.

## Core Value

Every clinical and administrative workflow must be digitized end-to-end with full data inheritance between modules, so that patient data flows seamlessly from reception through examination, prescription, billing, pharmacy, and inpatient care — eliminating paper-based processes and meeting Level 6 certification requirements.

## Requirements

### Validated

<!-- Shipped and confirmed valuable across 17 development sessions. -->

- ✓ 14/14 HIS modules with real API integration (Reception, OPD, IPD, Pharmacy, Billing, Lab, Radiology, Insurance, Surgery, Equipment, HR, Quality, etc.) — Session 1-14
- ✓ EMR module with 38 print templates (17 BS + 21 DD per TT 32/2023) — Session 10-12
- ✓ 2FA authentication (Email OTP) — Session 9
- ✓ Queue Display System (LCD, TTS, fullscreen) — Session 9
- ✓ HL7 FHIR R4 (8 resources, 22+ endpoints) — Session 15
- ✓ Clinical terminology & symptom checklist — Session 11
- ✓ Data inheritance between modules (Reception→OPD→Rx→Billing→Pharmacy→IPD) — Session 14
- ✓ Level 6 audit logging (middleware + UI) — Session 15
- ✓ 8 reconciliation reports — Session 14
- ✓ Dashboard with recharts (trends, department, distribution) — Session 17
- ✓ Real-time notifications (SignalR WebSocket) — Session 17
- ✓ Patient timeline view in EMR — Session 17
- ✓ Barcode/QR scanning (Reception, OPD, Pharmacy) — Session 16
- ✓ Responsive design (mobile/tablet) — Session 16
- ✓ Patient photo capture (webcam) — Session 16
- ✓ Keyboard shortcuts (OPD, Reception) — Session 16
- ✓ Email notification for lab/radiology results — Session 10
- ✓ Follow-up tracking — Session 16
- ✓ Medical supply management — Session 16
- ✓ PDF generation with iText7 digital signature — Session 16
- ✓ Health monitoring endpoints — Session 15
- ✓ 350+ backend methods implemented (0 NotImplementedException) — Session 4-5
- ✓ 803+ E2E tests (Cypress + Playwright + API) — Session 17
- ✓ 16 business logic bugs fixed — Latest commit

### Active

<!-- Current scope — remaining work for Level 6 + EMR certification. -->

- [ ] BHXH gateway real integration (currently mock in ReceptionCompleteService)
- [ ] SMS gateway for result notifications (Email done, SMS pending)
- [ ] USB Token/CKS digital signature expansion to all EMR forms (currently Radiology only, needs Pkcs11Interop)
- [ ] Lien thong BHXH (Social Insurance interoperability)
- [ ] Lien thong DQGVN (National Health Data Exchange)
- [ ] Dat kham online (Online appointment booking for patients)
- [ ] Oracle DB support (required by TT, currently SQL Server only)
- [ ] AI integration (diagnosis suggestion, drug interaction enhancement)
- [ ] Face authentication (biometric login)
- [ ] Smart card read/write for BHYT insurance cards
- [ ] HL7 CDA document architecture
- [ ] SNOMED CT terminology mapping (partial — clinical terms exist but not SNOMED coded)

### Out of Scope

<!-- Explicit boundaries. -->

- Winform desktop client — Web-only is sufficient for all use cases per hospital agreement
- Migration to a different frontend framework — React 19 + Antd v6 is stable and adequate
- Multi-tenant architecture — Single hospital deployment
- Full Oracle migration — Will support Oracle as alternative, not replace SQL Server

## Context

- **Existing codebase**: 17 sessions of development, mature and stable
- **Certification target**: Level 6 per TT 54/2017, TT 32/2023, TT 13/2025, HD 365/TTYQG, QD 1898/QD-BYT
- **Contract**: Benh vien Truong Dai hoc Y - Duoc Hue, 998,000,000 VND
- **Analysis document**: `NangCap_PhanTich.md` contains detailed gap analysis (14 modules, 12 Level 6 requirements, 38 EMR forms)
- **Test coverage**: 803+ tests all passing (Cypress 634, Playwright 255, API 41)
- **Infrastructure**: Docker (SQL Server, Orthanc PACS, Redis), HL7Spy on port 2576
- **USB Token**: WINCA certificate (BLUESTAR), thumbprint 46F732584971C00EDB8FBEDABB2D68133960B322, RSACng doesn't support CSP PIN → needs Pkcs11Interop
- **Backend**: 350+ methods fully implemented across 19 service files
- **Frontend**: 32 routes, 0 TypeScript errors, 0 console.error remaining

## Constraints

- **Tech Stack**: React 19 + ASP.NET Core + SQL Server (must also support Oracle per TT requirements)
- **Compatibility**: Must maintain all 803+ existing tests passing
- **Security**: All EMR forms must support CKS/USB Token digital signatures per Vietnamese medical law
- **Standards**: HL7 FHIR R4, HL7 CDA, SNOMED CT, ICD-10 per TT 13/2025
- **Integration**: BHXH gateway (cong BHXH), DQGVN portal, SMS gateway (Vietnamese carriers)
- **Performance**: Queue display polling 4s, dashboard auto-refresh 60s, SignalR real-time
- **Language**: Vietnamese UI, Vietnamese medical terminology

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React 19 + Ant Design v6 | Already migrated, stable, large component library | ✓ Good |
| ASP.NET Core Clean Architecture | Existing architecture, well-structured DI | ✓ Good |
| SQL Server primary + Oracle support | Contract requires Oracle, but SQL Server is current | — Pending |
| Email OTP for 2FA (not SMS) | SMS gateway not yet available, email works now | ✓ Good, SMS planned |
| SignalR for real-time | Built-in ASP.NET Core support, JWT auth compatible | ✓ Good |
| iText7 for PDF generation | Supports digital signatures, Vietnamese fonts | ✓ Good |
| Pkcs11Interop for USB Token | RSACng can't do programmatic PIN, need PKCS#11 | — Pending |
| Priority order per NangCap | Follow contract requirements priority ranking | — Pending |

---
*Last updated: 2026-02-28 after GSD initialization*
