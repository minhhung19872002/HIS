# Roadmap: HIS Level 6 Upgrade

**Created:** 2026-02-28
**Total requirements:** 52
**Phases:** 7
**Mode:** yolo | **Depth:** standard | **Parallelization:** enabled

---

## Phase 1: BHXH Gateway + XML 4210 Export

**Why:** Every patient registration currently uses mock insurance data. BHXH integration directly affects hospital revenue collection and is a prerequisite for DQGVN submission (Phase 6). XML 4210 is the mandatory cost reporting format since Jan 2025.

**Goal:** Replace all mock BHXH gateway responses with real abstracted client and implement complete XML 4210 export pipeline with validation, batch export, and digital signing.

**Requirements:**
- BHXH-01: Real-time insurance card verification via BHXH gateway API
- BHXH-02: Patient treatment history lookup from BHXH portal
- BHXH-03: Insurance cost submission to BHXH gateway
- BHXH-04: Assessment results retrieval from BHXH portal
- BHXH-05: Error handling for BHXH gateway rate limits, timeouts, schema changes
- XML-01: Generate all 12 XML 4210 tables per QD 130/4750/3176
- XML-02: XML export validation against current BHXH XSD schema
- XML-03: Batch XML export for period settlement
- XML-04: XML signing with digital signature before submission

**Plans:** 4 plans

Plans:
- [ ] 01-01-PLAN.md — BHXH Gateway client abstraction + mock/real implementations + InsuranceXmlService rewiring
- [ ] 01-02-PLAN.md — XML 4210 table data generators (all 15 tables with real EF Core queries)
- [ ] 01-03-PLAN.md — XML file generation pipeline (XmlExportService + XSD validation + batch export workflow)
- [ ] 01-04-PLAN.md — Frontend Insurance page batch export UI + Reception verification + Cypress tests

**Success criteria:**
1. A receptionist can verify a patient's BHXH insurance card in real-time during registration and see coverage details without manual lookup
2. Insurance staff can generate a complete XML 4210 export for a billing period and the output passes XSD schema validation with zero errors
3. The system gracefully handles BHXH gateway downtime by showing a clear error message and allowing manual override with cached data
4. Batch XML export for monthly settlement produces all 12 required tables and can be submitted to the provincial BHXH portal

**Est. effort:** 15-20 days
**Depends on:** None
**Parallel with:** SMS brand name registration (administrative, not technical)

---

## Phase 2: Digital Signature Expansion (PKCS#11 + TSA)

**Why:** Level 6 requires "paperless with digital signatures." Without programmatic USB Token signing via PKCS#11, doctors cannot sign EMR forms during clinical workflow -- the current Windows PIN popup blocks automation. XML 4210 from Phase 1 also requires digital signatures.

**Goal:** Replace Windows CryptoAPI signing with programmatic PKCS#11 via Pkcs11Interop, add TSA timestamps and OCSP/CRL revocation to signed PDFs, support multiple Vietnamese CA providers, and enable batch signing for clinical workflows.

**Requirements:**
- SIGN-01: All 38 EMR forms can be digitally signed via USB Token (Pkcs11Interop)
- SIGN-02: Prescriptions and lab results can be digitally signed by authorized doctors
- SIGN-03: Discharge papers and referral letters can be digitally signed
- SIGN-04: PDF exports include embedded digital signature with timestamp (TSA) and revocation check (OCSP/CRL)
- SIGN-05: System supports multiple Vietnamese CA providers (VNPT-CA, Viettel-CA, BKAV-CA, FPT-CA)
- SIGN-06: Batch signing workflow for doctors signing multiple documents at once

**Plans:** 4 plans

Plans:
- [ ] 02-01-PLAN.md — Core PKCS#11 infrastructure: entities, config, session manager, IExternalSignature adapter, token registry, controller
- [ ] 02-02-PLAN.md — PDF signing pipeline with TSA + OCSP + CRL, HTML-to-PDF conversion for EMR forms
- [ ] 02-03-PLAN.md — Frontend signing UI: PIN modal, signature status icon, verification panel, batch modal, SigningContext
- [ ] 02-04-PLAN.md — Batch signing endpoint with SignalR progress, integration into EMR/Prescription/Lab pages, Cypress tests

**Success criteria:**
1. A doctor can sign an EMR form by entering their USB Token PIN once in the browser and the signed PDF is generated server-side without a Windows dialog popup
2. A doctor can select 10+ unsigned documents and batch-sign them all in a single PIN entry session
3. A signed PDF opened in Adobe Reader shows a valid digital signature with TSA timestamp and no revocation warnings
4. The system works with at least 3 different Vietnamese CA provider tokens (configurable DLL path per provider)

**Est. effort:** 7-10 days
**Depends on:** None (can start in parallel with Phase 1; XML-04 signing uses this but is not blocking)

---

## Phase 3: Security Hardening + CCCD Validation

**Why:** Level 6 certification audit requires security documentation per Decree 85/2016 and CCCD national ID validation per TT 13/2025. Lower technical complexity but mandatory for compliance paperwork.

**Requirements:**
- SEC-01: Access control matrix documentation per Decree 85/2016
- SEC-02: Data encryption at rest for sensitive patient data
- SEC-03: Backup and recovery procedures documented and tested
- SEC-04: Security incident response plan
- SEC-05: CCCD/National ID validation on patient registration

**Success criteria:**
1. A receptionist entering a patient's CCCD number sees immediate validation feedback (format check, checksum verification) and the system rejects obviously invalid numbers
2. The audit log captures all access to sensitive patient data fields, and an administrator can generate a compliance report showing who accessed what and when
3. Security documentation package (access control matrix, backup procedures, incident response plan) is complete and can be presented to the Level 6 certification auditor

**Est. effort:** 5-7 days
**Depends on:** Phase 1 (audit log enrichment benefits from real BHXH data flow)

---

## Phase 4: SMS Gateway + Online Booking

**Why:** Competitive differentiators that match FPT eHospital and VNPT HIS offerings. SMS reduces patient no-shows. The backend for appointments already exists; this polishes the public-facing experience. SMS brand name registration should have started at project kickoff (5-15 business days lead time).

**Requirements:**
- SMS-01: SMS notification when lab/radiology results are ready
- SMS-02: SMS appointment reminders (1 day before, morning of)
- SMS-03: SMS queue ticket notification when turn is approaching
- SMS-04: Integration with Vietnamese SMS provider (eSMS.vn or SpeedSMS.vn)
- BOOK-01: Public-facing appointment booking page (no auth required)
- BOOK-02: Time slot management per doctor/department/service
- BOOK-03: Booking confirmation via email and SMS
- BOOK-04: Integration with reception queue system

**Success criteria:**
1. A patient receives an SMS on their phone when their lab results are ready, containing their name and a brief instruction to visit the hospital or check the portal
2. A patient can book an appointment on a public webpage (no login required), select a department and time slot, and receive confirmation via both email and SMS
3. A patient waiting in the queue receives an SMS notification when their turn is 2 positions away, reducing crowding in the waiting area
4. An administrator can view SMS delivery reports and see success/failure rates per message type

**Est. effort:** 5-8 days
**Depends on:** None
**Parallel with:** Phase 5 (Oracle) -- different codepaths, no overlap

---

## Phase 5: Oracle DB Dual-Provider Support

**Why:** Contractual requirement per TT specifications. High effort due to 131 raw SQL queries using SQL Server-specific syntax. Can run in parallel with Phase 4 since it touches database infrastructure, not notification services.

**Requirements:**
- ORA-01: EF Core dual-provider configuration (SQL Server + Oracle)
- ORA-02: All 350+ LINQ queries work on both providers
- ORA-03: Raw SQL queries abstracted for provider compatibility
- ORA-04: GUID handling compatible with Oracle RAW(16)
- ORA-05: Migration scripts for both SQL Server and Oracle

**Success criteria:**
1. The application can start and serve requests against an Oracle database by changing only the connection string and provider setting in appsettings.json
2. The complete E2E test suite (803+ tests) passes against an Oracle database with zero test-specific workarounds
3. All 131 raw SQL queries produce identical results on both SQL Server and Oracle through the ISqlDialect abstraction
4. GUID values stored in Oracle RAW(16) columns round-trip correctly through EF Core without byte-order corruption

**Est. effort:** 10-15 days
**Depends on:** None
**Parallel with:** Phase 4 (SMS/Booking) -- different codepaths

---

## Phase 6: DQGVN + SNOMED CT + HL7 CDA (Interoperability)

**Why:** National health data exchange and interoperability standards. Requires real patient data from Phase 1 (BHXH) and signed documents from Phase 2 (digital signatures) to produce meaningful submissions. Lower priority than direct patient care workflows.

**Requirements:**
- HIE-01: Submit patient data to DQGVN national health portal
- HIE-02: Receive referral data from other facilities via DQGVN
- HIE-03: FHIR Bundle format for DQGVN data exchange
- INTOP-01: Generate HL7 CDA documents from EMR data (discharge summary, referral)
- INTOP-02: SNOMED CT code field on ClinicalTerm entity
- INTOP-03: ICD-10 to SNOMED CT mapping table for common diagnoses
- INTOP-04: CDA document signing with digital signature
- ARCH-01: Digital archive management for completed medical records (PDF)
- ARCH-02: Loan/return tracking for physical medical records
- ARCH-03: Search and retrieval of archived records by patient, date, department
- ARCH-04: Archive retention policy enforcement per Vietnamese medical law

**Success criteria:**
1. A discharge summary can be exported as a signed HL7 CDA document and submitted to the DQGVN national health portal via FHIR Bundle
2. ClinicalTerm entities in the system have SNOMED CT codes mapped for at least the 200 most common diagnoses, and the mapping is searchable
3. A medical records clerk can search archived records by patient name, date range, or department, and retrieve the signed PDF with loan/return tracking
4. Referral data received from another facility via DQGVN is parsed and displayed in the patient's timeline

**Est. effort:** 8-12 days
**Depends on:** Phase 1 (real BHXH data), Phase 2 (digital signatures for CDA signing)

---

## Phase 7: AI/CDSS + Biometric Auth + Smart Card (Enhancements)

**Why:** Competitive differentiators, not certification requirements. Depend on external services and hardware availability. Should only proceed after core Level 6 certification is secured.

**Requirements:**
- AI-01: ICD-10 code suggestion from symptom keywords
- AI-02: Dosage alert based on patient weight, age, renal function
- AI-03: Allergy cross-check against prescribed medications
- AI-04: Drug interaction warnings enhanced with severity levels
- BIO-01: WebAuthn/FIDO2 fingerprint authentication for staff login
- BIO-02: Face recognition via webcam as alternative 2FA method
- BIO-03: Biometric signature per TT 13/2025 Art.3
- CARD-01: Read BHYT insurance card data via PC/SC smart card reader
- CARD-02: Auto-fill patient insurance info from card read
- CARD-03: CCCD chip reading for patient identity verification

**Success criteria:**
1. When a doctor types symptoms in the OPD exam form, the system suggests the top 5 most likely ICD-10 codes ranked by relevance, and the doctor can click to auto-fill
2. A staff member can log in using a fingerprint sensor or face recognition via their browser instead of typing a password
3. A receptionist can insert a patient's BHYT insurance card into a smart card reader and the system auto-fills all insurance fields (card number, valid dates, coverage type) without manual entry
4. When prescribing medication, the system alerts the doctor to dosage concerns based on the patient's weight, age, and renal function with severity-colored warnings

**Est. effort:** 15-20 days
**Depends on:** Phase 2 (biometric signature uses signing infrastructure)

---

## Phase Dependency Graph

```
Phase 1 (BHXH+XML) ──────────────────────┐
                                          ├──→ Phase 6 (DQGVN+CDA+Archive)
Phase 2 (Digital Signatures) ─────────────┘
                              │
Phase 3 (Security+CCCD) ◄────┘

Phase 4 (SMS+Booking) ←→ Phase 5 (Oracle)    [parallel, independent]

Phase 7 (AI+Bio+Card) ◄── Phase 2
```

**Critical path:** Phase 1 → Phase 3 → Phase 6
**Parallel tracks:** Phase 1 + Phase 2 (both start immediately), Phase 4 + Phase 5 (both start after Phase 3)

## Coverage Verification

| Category | Requirements | Phase | Count |
|----------|-------------|-------|-------|
| SIGN | SIGN-01..06 | Phase 2 | 6 |
| BHXH | BHXH-01..05 | Phase 1 | 5 |
| XML | XML-01..04 | Phase 1 | 4 |
| SEC | SEC-01..05 | Phase 3 | 5 |
| SMS | SMS-01..04 | Phase 4 | 4 |
| BOOK | BOOK-01..04 | Phase 4 | 4 |
| ORA | ORA-01..05 | Phase 5 | 5 |
| AI | AI-01..04 | Phase 7 | 4 |
| INTOP | INTOP-01..04 | Phase 6 | 4 |
| BIO | BIO-01..03 | Phase 7 | 3 |
| CARD | CARD-01..03 | Phase 7 | 3 |
| ARCH | ARCH-01..04 | Phase 6 | 4 |
| HIE | HIE-01..03 | Phase 6 | 3 |
| **Total** | | | **52/52** |

All 52 v1 requirements are mapped. Zero unmapped.

---
*Roadmap created: 2026-02-28*
*Phase 1 planned: 2026-02-28 (4 plans, 2 waves)*
*Phase 2 planned: 2026-02-28 (4 plans, 2 waves)*
