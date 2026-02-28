# Requirements: HIS Level 6 Upgrade

**Defined:** 2026-02-28
**Core Value:** Every clinical workflow digitized end-to-end with digital signatures, eliminating paper and meeting Level 6 certification.

## v1 Requirements

Requirements for Level 6 certification + competitive features. Each maps to roadmap phases.

### Digital Signature (SIGN)

- [ ] **SIGN-01**: All 38 EMR forms can be digitally signed via USB Token (Pkcs11Interop PKCS#11)
- [ ] **SIGN-02**: Prescriptions and lab results can be digitally signed by authorized doctors
- [ ] **SIGN-03**: Discharge papers and referral letters can be digitally signed
- [ ] **SIGN-04**: PDF exports include embedded digital signature with timestamp (TSA) and revocation check (OCSP/CRL)
- [ ] **SIGN-05**: System supports multiple Vietnamese CA providers (VNPT-CA, Viettel-CA, BKAV-CA, FPT-CA)
- [ ] **SIGN-06**: Batch signing workflow for doctors signing multiple documents at once

### BHXH Gateway (BHXH)

- [x] **BHXH-01**: Real-time insurance card verification via BHXH gateway API (replace mock)
- [x] **BHXH-02**: Patient treatment history lookup from BHXH portal
- [x] **BHXH-03**: Insurance cost submission to BHXH gateway
- [x] **BHXH-04**: Assessment results retrieval from BHXH portal
- [x] **BHXH-05**: Error handling for BHXH gateway rate limits, timeouts, schema changes

### XML 4210 Export (XML)

- [x] **XML-01**: Generate all 12 XML 4210 tables per QD 130/4750/3176 (check-in, summary, medicines, materials, services, subclinical, blood, transport, referral, sick leave, assessment, TB)
- [x] **XML-02**: XML export validation against current BHXH XSD schema
- [x] **XML-03**: Batch XML export for period settlement (monthly/quarterly)
- [x] **XML-04**: XML signing with digital signature before submission

### Security Hardening (SEC)

- [ ] **SEC-01**: Access control matrix documentation per Decree 85/2016
- [ ] **SEC-02**: Data encryption at rest for sensitive patient data
- [ ] **SEC-03**: Backup and recovery procedures documented and tested
- [ ] **SEC-04**: Security incident response plan
- [ ] **SEC-05**: CCCD/National ID validation on patient registration

### SMS Gateway (SMS)

- [ ] **SMS-01**: SMS notification when lab/radiology results are ready
- [ ] **SMS-02**: SMS appointment reminders (1 day before, morning of)
- [ ] **SMS-03**: SMS queue ticket notification when turn is approaching
- [ ] **SMS-04**: Integration with Vietnamese SMS provider (eSMS.vn or SpeedSMS.vn)

### Online Booking (BOOK)

- [ ] **BOOK-01**: Public-facing appointment booking page (no auth required)
- [ ] **BOOK-02**: Time slot management per doctor/department/service
- [ ] **BOOK-03**: Booking confirmation via email and SMS
- [ ] **BOOK-04**: Integration with reception queue system

### Oracle DB Support (ORA)

- [ ] **ORA-01**: EF Core dual-provider configuration (SQL Server + Oracle)
- [ ] **ORA-02**: All 350+ LINQ queries work on both providers
- [ ] **ORA-03**: Raw SQL queries abstracted for provider compatibility
- [ ] **ORA-04**: GUID handling compatible with Oracle RAW(16)
- [ ] **ORA-05**: Migration scripts for both SQL Server and Oracle

### AI Clinical Decision Support (AI)

- [ ] **AI-01**: ICD-10 code suggestion from symptom keywords
- [ ] **AI-02**: Dosage alert based on patient weight, age, renal function
- [ ] **AI-03**: Allergy cross-check against prescribed medications
- [ ] **AI-04**: Drug interaction warnings enhanced with severity levels

### HL7 CDA + SNOMED CT (INTOP)

- [ ] **INTOP-01**: Generate HL7 CDA documents from EMR data (discharge summary, referral)
- [ ] **INTOP-02**: SNOMED CT code field on ClinicalTerm entity
- [ ] **INTOP-03**: ICD-10 to SNOMED CT mapping table for common diagnoses
- [ ] **INTOP-04**: CDA document signing with digital signature

### Biometric Authentication (BIO)

- [ ] **BIO-01**: WebAuthn/FIDO2 fingerprint authentication for staff login
- [ ] **BIO-02**: Face recognition via webcam as alternative 2FA method
- [ ] **BIO-03**: Biometric signature per TT 13/2025 Art.3

### Smart Card (CARD)

- [ ] **CARD-01**: Read BHYT insurance card data via PC/SC smart card reader
- [ ] **CARD-02**: Auto-fill patient insurance info from card read
- [ ] **CARD-03**: CCCD chip reading for patient identity verification

### Medical Record Archive (ARCH)

- [ ] **ARCH-01**: Digital archive management for completed medical records (PDF)
- [ ] **ARCH-02**: Loan/return tracking for physical medical records
- [ ] **ARCH-03**: Search and retrieval of archived records by patient, date, department
- [ ] **ARCH-04**: Archive retention policy enforcement per Vietnamese medical law

### DQGVN Health Exchange (HIE)

- [ ] **HIE-01**: Submit patient data to DQGVN national health portal
- [ ] **HIE-02**: Receive referral data from other facilities via DQGVN
- [ ] **HIE-03**: FHIR Bundle format for DQGVN data exchange

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: Patient mobile app (React Native/Flutter)
- **ADV-02**: Full ICD-11 support with Vietnamese translation
- **ADV-03**: Multi-tenant architecture for hospital chain
- **ADV-04**: WebRTC telemedicine video consultation
- **ADV-05**: Speech-to-text for clinical notes (Vietnamese medical vocabulary)
- **ADV-06**: Real-time XML signing for BHXH (CV 4040 pilot)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Winform desktop client | Web-only agreed with hospital; PWA + keyboard shortcuts sufficient |
| Full Oracle migration (replace SQL Server) | Support as alternative, not replace existing working system |
| Build own SMS gateway | Use managed service (eSMS.vn/SpeedSMS.vn); regulatory burden too high |
| Build own video platform | Integrate existing (Jitsi/Zalo); WebRTC at scale is excessive scope |
| Custom AI/ML model training | Rule-based CDSS first; ML requires massive dataset and GPU infra |
| Full SNOMED CT license | Vietnam has no national license; map common terms only |
| Blockchain for records | Digital signatures + audit log already provide tamper evidence |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BHXH-01 | Phase 1: BHXH Gateway + XML 4210 | Complete |
| BHXH-02 | Phase 1: BHXH Gateway + XML 4210 | Complete |
| BHXH-03 | Phase 1: BHXH Gateway + XML 4210 | Complete |
| BHXH-04 | Phase 1: BHXH Gateway + XML 4210 | Complete |
| BHXH-05 | Phase 1: BHXH Gateway + XML 4210 | Complete |
| XML-01 | Phase 1: BHXH Gateway + XML 4210 | Complete |
| XML-02 | Phase 1: BHXH Gateway + XML 4210 | Complete |
| XML-03 | Phase 1: BHXH Gateway + XML 4210 | Complete |
| XML-04 | Phase 1: BHXH Gateway + XML 4210 | Complete |
| SIGN-01 | Phase 2: Digital Signature Expansion | Pending |
| SIGN-02 | Phase 2: Digital Signature Expansion | Pending |
| SIGN-03 | Phase 2: Digital Signature Expansion | Pending |
| SIGN-04 | Phase 2: Digital Signature Expansion | Pending |
| SIGN-05 | Phase 2: Digital Signature Expansion | Pending |
| SIGN-06 | Phase 2: Digital Signature Expansion | Pending |
| SEC-01 | Phase 3: Security Hardening + CCCD | Pending |
| SEC-02 | Phase 3: Security Hardening + CCCD | Pending |
| SEC-03 | Phase 3: Security Hardening + CCCD | Pending |
| SEC-04 | Phase 3: Security Hardening + CCCD | Pending |
| SEC-05 | Phase 3: Security Hardening + CCCD | Pending |
| SMS-01 | Phase 4: SMS Gateway + Online Booking | Pending |
| SMS-02 | Phase 4: SMS Gateway + Online Booking | Pending |
| SMS-03 | Phase 4: SMS Gateway + Online Booking | Pending |
| SMS-04 | Phase 4: SMS Gateway + Online Booking | Pending |
| BOOK-01 | Phase 4: SMS Gateway + Online Booking | Pending |
| BOOK-02 | Phase 4: SMS Gateway + Online Booking | Pending |
| BOOK-03 | Phase 4: SMS Gateway + Online Booking | Pending |
| BOOK-04 | Phase 4: SMS Gateway + Online Booking | Pending |
| ORA-01 | Phase 5: Oracle DB Dual-Provider | Pending |
| ORA-02 | Phase 5: Oracle DB Dual-Provider | Pending |
| ORA-03 | Phase 5: Oracle DB Dual-Provider | Pending |
| ORA-04 | Phase 5: Oracle DB Dual-Provider | Pending |
| ORA-05 | Phase 5: Oracle DB Dual-Provider | Pending |
| HIE-01 | Phase 6: DQGVN + SNOMED CT + HL7 CDA | Pending |
| HIE-02 | Phase 6: DQGVN + SNOMED CT + HL7 CDA | Pending |
| HIE-03 | Phase 6: DQGVN + SNOMED CT + HL7 CDA | Pending |
| INTOP-01 | Phase 6: DQGVN + SNOMED CT + HL7 CDA | Pending |
| INTOP-02 | Phase 6: DQGVN + SNOMED CT + HL7 CDA | Pending |
| INTOP-03 | Phase 6: DQGVN + SNOMED CT + HL7 CDA | Pending |
| INTOP-04 | Phase 6: DQGVN + SNOMED CT + HL7 CDA | Pending |
| ARCH-01 | Phase 6: DQGVN + SNOMED CT + HL7 CDA | Pending |
| ARCH-02 | Phase 6: DQGVN + SNOMED CT + HL7 CDA | Pending |
| ARCH-03 | Phase 6: DQGVN + SNOMED CT + HL7 CDA | Pending |
| ARCH-04 | Phase 6: DQGVN + SNOMED CT + HL7 CDA | Pending |
| AI-01 | Phase 7: AI/CDSS + Biometric + Smart Card | Pending |
| AI-02 | Phase 7: AI/CDSS + Biometric + Smart Card | Pending |
| AI-03 | Phase 7: AI/CDSS + Biometric + Smart Card | Pending |
| AI-04 | Phase 7: AI/CDSS + Biometric + Smart Card | Pending |
| BIO-01 | Phase 7: AI/CDSS + Biometric + Smart Card | Pending |
| BIO-02 | Phase 7: AI/CDSS + Biometric + Smart Card | Pending |
| BIO-03 | Phase 7: AI/CDSS + Biometric + Smart Card | Pending |
| CARD-01 | Phase 7: AI/CDSS + Biometric + Smart Card | Pending |
| CARD-02 | Phase 7: AI/CDSS + Biometric + Smart Card | Pending |
| CARD-03 | Phase 7: AI/CDSS + Biometric + Smart Card | Pending |

**Coverage:**
- v1 requirements: 52 total
- Mapped to phases: 52
- Unmapped: 0

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 -- all 52 requirements mapped to roadmap phases*
